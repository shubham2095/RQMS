const dayjs = require('dayjs');
const { Op } = require('sequelize');
const {
  sequelize,
  VacationRequest,
  VacationClearance,
  Allotment,
  Quarter,
  EmployeeProfile,
  Occupancy,
  Certificate,
  User,
} = require('../models');
const certificateService = require('./certificateService');
const retirementService = require('./retirementService');
const auditService = require('./auditService');
const notificationService = require('./notificationService');
const { hasAnyPermission } = require('./userAccessService');
const {
  vacationClearanceSteps,
  vacationStepPermissions,
  vacationStepTitles,
  vacationStepCertificates,
} = require('../config/rqms');
const { parseStepData } = require('../validators/vacationValidator');
const httpError = require('../utils/httpError');
const { nextDailyNumber, retryOnUnique } = require('../utils/referenceNumber');

const FIRST_STEP = vacationClearanceSteps[0];
const OPEN_STATUSES = ['submitted', 'in_clearance'];
const ALL_STEP_PERMISSIONS = Object.values(vacationStepPermissions);

const NAME_ONLY = { model: User, as: 'user', attributes: ['name'] };

const listInclude = [
  {
    model: EmployeeProfile,
    as: 'employee',
    attributes: ['id', 'employee_id', 'designation'],
    include: [NAME_ONLY],
  },
  {
    model: Quarter,
    as: 'quarter',
    attributes: ['id', 'quarter_number', 'quarter_type', 'colony_name', 'station'],
  },
];

const detailInclude = [
  ...listInclude,
  { model: Allotment, as: 'allotment', attributes: ['id', 'allotment_order_no', 'possession_date', 'vacated_on'] },
  {
    model: VacationClearance,
    as: 'clearances',
    include: [{ model: User, as: 'handler', attributes: ['id', 'name'] }],
  },
  { model: Certificate, as: 'certificates', attributes: ['id', 'type', 'number', 'issued_at', 'is_signed'] },
];
const detailOrder = [
  [{ model: VacationClearance, as: 'clearances' }, 'sequence', 'ASC'],
  [{ model: Certificate, as: 'certificates' }, 'id', 'ASC'],
];

function lock(transaction) {
  return { transaction, lock: transaction.LOCK.UPDATE };
}

// Koi bhi vacation.* permission wala (ya super_admin) staff hai.
function isStaff(actor) {
  return hasAnyPermission(actor, ...ALL_STEP_PERMISSIONS);
}

// Jin steps par yeh actor act kar sakta hai (super_admin ke liye saare).
function stepsFor(actor) {
  return vacationClearanceSteps.filter((step) => hasAnyPermission(actor, vacationStepPermissions[step]));
}

async function findOwnProfile(actor) {
  return EmployeeProfile.findOne({ where: { user_id: actor.id }, attributes: ['id'] });
}

// ---------- reading ----------

async function list(actor, filters = {}) {
  const where = {};
  if (filters.status) where.status = filters.status;
  if (filters.step) where.current_step = filters.step;

  if (isStaff(actor)) {
    if (filters.waiting_for_me) {
      // Sirf wo jo ABHI mere step par atki hain
      where.status = 'in_clearance';
      where.current_step = { [Op.in]: stepsFor(actor).filter((step) => !filters.step || step === filters.step) };
    }
  } else {
    const profile = await findOwnProfile(actor);
    if (!profile) return [];
    where.employee_profile_id = profile.id;
  }

  return VacationRequest.findAll({ where, include: listInclude, order: [['id', 'DESC']] });
}

// Owner ya staff ke alawa koi na dekh sake — 404. can_act: kya yeh actor ABHI current step par act kar sakta hai.
async function get(id, actor) {
  const request = await VacationRequest.findByPk(id, { include: detailInclude, order: detailOrder });
  if (!request) throw httpError(404, 'Vacation request not found');

  if (!isStaff(actor)) {
    const profile = await findOwnProfile(actor);
    if (!profile || profile.id !== request.employee_profile_id) throw httpError(404, 'Vacation request not found');
  }

  const result = request.toJSON();
  result.can_act =
    request.status === 'in_clearance' && hasAnyPermission(actor, vacationStepPermissions[request.current_step]);
  return result;
}

// ---------- initiate ----------

// Employee apne possession_taken allotment ke liye vacation request shuru karta hai.
async function initiate(actor, data) {
  const profile = await findOwnProfile(actor);
  if (!profile) throw httpError(400, 'You do not have an active allotment');

  const initiated = await retryOnUnique(() =>
    sequelize.transaction(async (transaction) => {
      // Allotment row lock: ek saath do request aayein to serialize ho jayein
      const allotment = await Allotment.findOne({
        where: { employee_profile_id: profile.id, status: 'possession_taken' },
        order: [['id', 'DESC']],
        ...lock(transaction),
      });
      if (!allotment) throw httpError(400, 'You do not have an active allotment (possession must be recorded first)');

      const open = await VacationRequest.findOne({
        where: { allotment_id: allotment.id, status: { [Op.in]: OPEN_STATUSES } },
        transaction,
      });
      if (open) throw httpError(409, `A vacation request is already in progress (${open.reference_no})`);

      if (data.requested_vacation_date < allotment.possession_date) {
        throw httpError(400, 'Vacation date cannot be before your possession date');
      }
      if (data.requested_vacation_date > dayjs().add(1, 'year').format('YYYY-MM-DD')) {
        throw httpError(400, 'Vacation date cannot be more than one year ahead');
      }

      const quarter = await Quarter.findByPk(allotment.quarter_id, lock(transaction));
      if (quarter.status !== 'occupied') throw httpError(409, `Quarter is not in an occupied state (${quarter.status})`);

      const request = await VacationRequest.create(
        {
          reference_no: await nextDailyNumber('VAC', VacationRequest, 'reference_no', transaction),
          allotment_id: allotment.id,
          quarter_id: quarter.id,
          employee_profile_id: profile.id,
          trigger: data.trigger,
          requested_vacation_date: data.requested_vacation_date,
          reason: data.reason,
          status: 'in_clearance',
          current_step: FIRST_STEP,
        },
        { transaction }
      );

      await VacationClearance.bulkCreate(
        vacationClearanceSteps.map((step, index) => ({
          vacation_request_id: request.id,
          step,
          sequence: index + 1,
          status: 'pending',
        })),
        { transaction }
      );
      await quarter.update({ status: 'vacation_pending' }, { transaction });

      // trigger 'retirement' par retirement record (retention window) — usi transaction mein, duplicate nahi banta.
      let retirement = null;
      if (data.trigger === 'retirement') {
        const full = await EmployeeProfile.findByPk(profile.id, { attributes: ['id', 'retirement_date'], transaction });
        retirement = await retirementService.recordRetirement(full, allotment, {
          retirementDate: full.retirement_date || data.requested_vacation_date,
          transaction,
        });
      }
      return { request, retirement };
    })
  );

  // Commit ke baad: audit + notifications
  const { request, retirement } = initiated;
  await auditService.log(actor, 'vacation.initiate', request, `Vacation request ${request.reference_no} started (${request.trigger})`, {
    reference_no: request.reference_no,
    trigger: request.trigger,
    requested_vacation_date: request.requested_vacation_date,
  });
  if (retirement && retirement.created) {
    await auditService.log(
      actor,
      'retirement.record',
      retirement.record,
      `Retirement record created: retention until ${formatDate(retirement.record.retention_expiry_date)}`,
      { retirement_date: retirement.record.retirement_date, retention_expiry_date: retirement.record.retention_expiry_date }
    );
  }
  await notificationService.notifyPermission(
    vacationStepPermissions[FIRST_STEP],
    'vacation.initiated',
    `${actor.name} started vacation request ${request.reference_no}. It is waiting for your inspection.`,
    'New vacation request'
  );

  return get(request.id, actor);
}

// ---------- act ----------

function formatDate(value) {
  return dayjs(value).format('DD MMM YYYY');
}

// "Name on 20 Nov 2026 (damage: no, meter reading: 1200, dues: 0)" — certificates mein flat text ke liye
function describeClearance(clearance, handlerName) {
  const parts = [];
  if (clearance.has_damage !== null) parts.push(`damage: ${clearance.has_damage ? 'yes' : 'no'}`);
  if (clearance.meter_reading !== null) parts.push(`meter reading: ${clearance.meter_reading}`);
  if (clearance.dues_amount !== null) parts.push(`dues recorded: ${clearance.dues_amount}`);
  if (clearance.remarks) parts.push(`remarks: ${clearance.remarks}`);
  const extra = parts.length > 0 ? ` (${parts.join(', ')})` : '';
  return `${clearance.status} by ${handlerName} on ${formatDate(clearance.acted_at)}${extra}`;
}

async function commonPayload(request, transaction) {
  const [allotment, quarter, profile] = await Promise.all([
    Allotment.findByPk(request.allotment_id, { transaction }),
    Quarter.findByPk(request.quarter_id, { transaction }),
    EmployeeProfile.findByPk(request.employee_profile_id, { include: [NAME_ONLY], transaction }),
  ]);
  return {
    vacation_reference: request.reference_no,
    allotment_order_no: allotment.allotment_order_no,
    employee_name: profile.user.name,
    employee_id: profile.employee_id,
    designation: profile.designation,
    quarter_number: quarter.quarter_number,
    quarter_type: quarter.quarter_type,
    colony_name: quarter.colony_name,
    station: quarter.station,
    reason_for_vacating: request.trigger,
    requested_vacation_date: formatDate(request.requested_vacation_date),
  };
}

// Vacation poori hui: quarter vacant, allotment vacated, occupancy band, profile flag clear, 3 certificates.
// act() ke transaction ke andar chalta hai (last step approve hone par).
async function complete(request, actor, transaction) {
  const now = new Date();
  const today = dayjs(now).format('YYYY-MM-DD');

  const allotment = await Allotment.findByPk(request.allotment_id, lock(transaction));
  const quarter = await Quarter.findByPk(request.quarter_id, lock(transaction));
  const profile = await EmployeeProfile.findByPk(request.employee_profile_id, lock(transaction));

  await request.update({ status: 'completed', current_step: null, completed_at: now }, { transaction });
  await allotment.update({ status: 'vacated', vacated_on: today }, { transaction });
  await quarter.update({ status: 'vacant', current_occupant_id: null }, { transaction });
  await profile.update({ has_active_allotment: false }, { transaction });
  await Occupancy.update(
    { is_current: false, end_date: today },
    { where: { allotment_id: allotment.id, is_current: true }, transaction }
  );

  // Retirement wala record ho to 'cleared': overstay/penalty handover date tak freeze
  const clearedRetirement = await retirementService.markCleared(allotment.id, now, transaction);

  const clearances = await VacationClearance.findAll({
    where: { vacation_request_id: request.id },
    include: [{ model: User, as: 'handler', attributes: ['name'] }],
    order: [['sequence', 'ASC']],
    transaction,
  });
  const payload = {
    ...(await commonPayload(request, transaction)),
    handover_date: formatDate(now),
    completed_by: actor.name,
  };
  clearances.forEach((clearance) => {
    payload[clearance.step] = describeClearance(clearance, clearance.handler ? clearance.handler.name : '-');
  });

  await certificateService.generate(request, 'VACATION_NOC', payload, actor.id, transaction);
  await certificateService.generate(request, 'NO_DUE_CERTIFICATE', payload, actor.id, transaction);
  await certificateService.generate(request, 'HANDOVER_CERTIFICATE', payload, actor.id, transaction);
  return { retirement: clearedRetirement };
}

// Current step par approve / reject. step = jis step par client act kar raha hai (stale click pakadne ke liye).
async function act(requestId, actor, step, body) {
  const result = await sequelize.transaction(async (transaction) => {
    const request = await VacationRequest.findByPk(requestId, lock(transaction));
    if (!request) throw httpError(404, 'Vacation request not found');
    if (request.status !== 'in_clearance') {
      throw httpError(400, `This request is ${request.status}; no further action is possible`);
    }
    if (step !== request.current_step) {
      throw httpError(
        400,
        `This request is now at "${vacationStepTitles[request.current_step]}", not "${vacationStepTitles[step]}". Please refresh.`
      );
    }
    if (!hasAnyPermission(actor, vacationStepPermissions[step])) {
      throw httpError(403, `You are not authorised to act on the "${vacationStepTitles[step]}" step`);
    }

    const data = parseStepData(step, body);
    const approve = data.decision === 'approve';

    const clearance = await VacationClearance.findOne({
      where: { vacation_request_id: request.id, step },
      ...lock(transaction),
    });
    if (clearance.status !== 'pending') throw httpError(400, 'This step has already been handled');

    const changes = {
      status: approve ? 'approved' : 'rejected',
      handled_by: actor.id,
      remarks: data.remarks,
      acted_at: new Date(),
    };
    ['has_damage', 'meter_reading', 'dues_amount'].forEach((field) => {
      if (field in data) changes[field] = data[field]; // sirf is step ke optional fields aate hain
    });
    await clearance.update(changes, { transaction });

    if (!approve) {
      // Request yahin ruk gayi; employee abhi bhi quarter mein hai -> quarter wapas occupied
      await request.update({ status: 'rejected', current_step: null }, { transaction });
      const quarter = await Quarter.findByPk(request.quarter_id, lock(transaction));
      await quarter.update({ status: 'occupied' }, { transaction });
      return { request, clearance, outcome: 'rejected' };
    }

    // Step certificate (electrical / water)
    const certificateType = vacationStepCertificates[step];
    if (certificateType) {
      await certificateService.generate(
        request,
        certificateType,
        {
          ...(await commonPayload(request, transaction)),
          step: vacationStepTitles[step],
          approved_by: actor.name,
          approved_on: formatDate(clearance.acted_at),
          meter_reading: clearance.meter_reading,
          dues_recorded: clearance.dues_amount,
          remarks: clearance.remarks,
        },
        actor.id,
        transaction
      );
    }

    const next = await VacationClearance.findOne({
      where: { vacation_request_id: request.id, status: 'pending' },
      order: [['sequence', 'ASC']],
      transaction,
    });
    if (next) {
      await request.update({ current_step: next.step }, { transaction });
      return { request, clearance, outcome: 'advanced', nextStep: next.step };
    }

    const { retirement } = await complete(request, actor, transaction);
    return { request, clearance, outcome: 'completed', retirement };
  });

  await logAct(actor, step, result);
  return get(requestId, actor);
}

// Commit ke baad: audit + notifications (act ke teen anjaam: rejected / advanced / completed)
async function logAct(actor, step, { request, clearance, outcome, nextStep, retirement }) {
  const title = vacationStepTitles[step];
  const base = { reference_no: request.reference_no, step, remarks: clearance.remarks };

  if (outcome === 'rejected') {
    await auditService.log(actor, 'vacation.reject_step', request, `${title} rejected on ${request.reference_no}`, base);
    await notificationService.notifyProfile(
      request.employee_profile_id,
      'vacation.rejected',
      `Your vacation request ${request.reference_no} was rejected at "${title}"${clearance.remarks ? `: ${clearance.remarks}` : '.'} You can submit a new request.`,
      'Vacation request rejected'
    );
    return;
  }

  await auditService.log(actor, 'vacation.approve_step', request, `${title} approved on ${request.reference_no}`, base);

  if (outcome === 'advanced') {
    await notificationService.notifyPermission(
      vacationStepPermissions[nextStep],
      'vacation.step_ready',
      `Vacation request ${request.reference_no} is waiting for "${vacationStepTitles[nextStep]}".`,
      'Clearance pending'
    );
    return;
  }

  await auditService.log(actor, 'vacation.complete', request, `Vacation ${request.reference_no} completed; quarter is vacant`, {
    reference_no: request.reference_no,
    retirement_cleared: Boolean(retirement),
  });
  await notificationService.notifyProfile(
    request.employee_profile_id,
    'vacation.completed',
    `Your vacation request ${request.reference_no} is complete. Your NOC, No-Due and Handover certificates are available.`,
    'Vacation completed'
  );
}

module.exports = { initiate, act, complete, list, get };
