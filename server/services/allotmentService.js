const dayjs = require('dayjs');
const {
  sequelize,
  Quarter,
  WaitingListEntry,
  QuarterApplication,
  EmployeeProfile,
  User,
  Allotment,
  Occupancy,
  Certificate,
} = require('../models');
const waitingListService = require('./waitingListService');
const certificateService = require('./certificateService');
const { hasAnyPermission } = require('./userAccessService');
const httpError = require('../utils/httpError');
const { nextDailyNumber, retryOnUnique } = require('../utils/referenceNumber');

const QUARTER_FIELDS = ['id', 'quarter_number', 'quarter_type', 'colony_name', 'address', 'division', 'station', 'block', 'floor', 'status'];

const allotmentInclude = [
  { model: Quarter, as: 'quarter', attributes: QUARTER_FIELDS },
  {
    model: EmployeeProfile,
    as: 'employee',
    attributes: ['id', 'employee_id', 'designation'],
    include: [{ model: User, as: 'user', attributes: ['name'] }],
  },
  { model: QuarterApplication, as: 'application', attributes: ['id', 'reference_no'] },
  { model: Certificate, as: 'certificates', attributes: ['id', 'type', 'number', 'issued_at', 'is_signed'] },
];
const allotmentOrder = [[{ model: Certificate, as: 'certificates' }, 'id', 'ASC']];

function lock(transaction) {
  return { transaction, lock: transaction.LOCK.UPDATE };
}

// ---------- reading ----------

// Staff (allotment.approve / possession) sab dekhte hain; employee sirf apne allotments.
async function visibilityFilter(actor) {
  if (hasAnyPermission(actor, 'allotment.approve', 'allotment.possession')) return {};
  const profile = await EmployeeProfile.findOne({ where: { user_id: actor.id }, attributes: ['id'] });
  return { employee_profile_id: profile ? profile.id : 0 };
}

async function list(actor, filters = {}) {
  const where = await visibilityFilter(actor);
  if (filters.status) where.status = filters.status;
  return Allotment.findAll({ where, include: allotmentInclude, order: [['id', 'DESC'], ...allotmentOrder] });
}

async function get(id, actor) {
  const where = { ...(await visibilityFilter(actor)), id };
  const allotment = await Allotment.findOne({ where, include: allotmentInclude, order: allotmentOrder });
  if (!allotment) throw httpError(404, 'Allotment not found');
  return allotment;
}

// ---------- offer ----------

// Queue ka sabse upar wala active entry (rank 1). Order wahi jo reRank mein hai.
function findTopEntry(quarter, transaction) {
  return WaitingListEntry.findOne({
    where: { quarter_type: quarter.quarter_type, station: quarter.station, is_active: true },
    order: waitingListService.RANK_ORDER,
    ...(transaction ? lock(transaction) : {}),
  });
}

// Offer na ho sake to wajah (string), warna null.
function offerProblem(quarter, entry, application) {
  if (quarter.status !== 'vacant') return `Quarter is not vacant (status: ${quarter.status})`;
  if (!entry) return `No one is waiting for Type ${quarter.quarter_type} quarters at ${quarter.station}`;
  if (application.status !== 'approved') {
    return `Rank 1 applicant (${application.reference_no}) is "${application.status}". The Estate Officer must approve (or reject) them before this quarter can be offered.`;
  }
  return null;
}

// Vacant quarter ke liye queue ka top entry + kya offer ho sakta hai (UI ka "Offer" button isi se).
async function suggestFor(quarterId) {
  const quarter = await Quarter.findByPk(quarterId);
  if (!quarter) throw httpError(404, 'Quarter not found');

  const entry = quarter.status === 'vacant' ? await findTopEntry(quarter) : null;
  const application = entry ? await QuarterApplication.findByPk(entry.quarter_application_id) : null;
  const problem = offerProblem(quarter, entry, application);

  let applicant = null;
  if (entry) {
    const profile = await EmployeeProfile.findByPk(application.employee_profile_id, {
      attributes: ['id', 'employee_id', 'designation'],
      include: [{ model: User, as: 'user', attributes: ['name'] }],
    });
    applicant = {
      rank: entry.rank,
      priority_score: entry.priority_score,
      application_id: application.id,
      reference_no: application.reference_no,
      application_status: application.status,
      employee_id: profile.employee_id,
      name: profile.user.name,
    };
  }
  return { quarter_id: quarter.id, can_offer: problem === null, reason: problem, applicant };
}

async function loadProfileWithName(profileId, transaction) {
  return EmployeeProfile.findByPk(profileId, {
    include: [{ model: User, as: 'user', attributes: ['name'] }],
    transaction,
  });
}

function basePayload(allotment, quarter, profile) {
  return {
    allotment_order_no: allotment.allotment_order_no,
    employee_name: profile.user.name,
    employee_id: profile.employee_id,
    designation: profile.designation,
    quarter_number: quarter.quarter_number,
    quarter_type: quarter.quarter_type,
    colony_name: quarter.colony_name,
    station: quarter.station,
    division: quarter.division,
    block: quarter.block,
    floor: quarter.floor,
    address: quarter.address,
  };
}

// Vacant quarter ko queue ke rank-1 (approved) applicant ko offer karo. Sab ek transaction mein.
async function offer(quarterId, approver) {
  const allotmentId = await retryOnUnique(() =>
    sequelize.transaction(async (transaction) => {
      const quarter = await Quarter.findByPk(quarterId, lock(transaction));
      if (!quarter) throw httpError(404, 'Quarter not found');

      const entry = quarter.status === 'vacant' ? await findTopEntry(quarter, transaction) : null;
      const application = entry
        ? await QuarterApplication.findByPk(entry.quarter_application_id, lock(transaction))
        : null;
      const problem = offerProblem(quarter, entry, application);
      if (problem) throw httpError(400, problem);

      const now = new Date();
      const allotment = await Allotment.create(
        {
          allotment_order_no: await nextDailyNumber('AO', Allotment, 'allotment_order_no', transaction, now),
          quarter_id: quarter.id,
          quarter_application_id: application.id,
          employee_profile_id: application.employee_profile_id,
          status: 'offered',
          offered_at: now,
          approved_by: approver.id,
        },
        { transaction }
      );

      await quarter.update({ status: 'allotted' }, { transaction });
      await application.update({ status: 'allotted' }, { transaction });
      await waitingListService.remove(application, transaction);

      // TODO(Phase 5): audit log (offer) + notify employee
      const profile = await loadProfileWithName(application.employee_profile_id, transaction);
      await certificateService.generate(
        allotment,
        'ALLOTMENT_ORDER',
        {
          ...basePayload(allotment, quarter, profile),
          application_reference: application.reference_no,
          offered_on: dayjs(now).format('DD MMM YYYY'),
          approved_by: approver.name,
        },
        approver.id,
        transaction
      );
      return allotment.id;
    })
  );

  return get(allotmentId, approver);
}

// ---------- respond ----------

// Employee apne offer ko accept ya reject karta hai. Reject par quarter wapas vacant, application rejected.
async function respond(allotmentId, actor, { decision, remarks }) {
  const profile = await EmployeeProfile.findOne({ where: { user_id: actor.id }, attributes: ['id'] });

  await sequelize.transaction(async (transaction) => {
    const allotment = profile
      ? await Allotment.findOne({ where: { id: allotmentId, employee_profile_id: profile.id }, ...lock(transaction) })
      : null;
    if (!allotment) throw httpError(404, 'Allotment not found');
    if (allotment.status !== 'offered') throw httpError(400, `This offer is already ${allotment.status}`);

    const now = new Date();
    if (decision === 'accept') {
      await allotment.update({ status: 'accepted', responded_at: now, remarks: remarks || allotment.remarks }, { transaction });
      // TODO(Phase 5): audit log + notify clerk
      return;
    }

    await allotment.update({ status: 'rejected', responded_at: now, remarks: remarks || allotment.remarks }, { transaction });

    const quarter = await Quarter.findByPk(allotment.quarter_id, lock(transaction));
    if (quarter.status === 'allotted') await quarter.update({ status: 'vacant' }, { transaction });

    const application = await QuarterApplication.findByPk(allotment.quarter_application_id, lock(transaction));
    if (application) {
      await application.update(
        { status: 'rejected', remarks: `Offer declined by employee${remarks ? `: ${remarks}` : ''}` },
        { transaction }
      );
    }
    // TODO(Phase 5): audit log + notify estate officer
  });

  return get(allotmentId, actor);
}

// ---------- possession ----------

// Clerk possession record karta hai: quarter occupied, occupancy start, profile flag, 2 certificates.
async function takePossession(allotmentId, actor, possessionDate) {
  await sequelize.transaction(async (transaction) => {
    const allotment = await Allotment.findByPk(allotmentId, lock(transaction));
    if (!allotment) throw httpError(404, 'Allotment not found');
    if (allotment.status === 'offered') throw httpError(400, 'The employee has not accepted this offer yet');
    if (allotment.status !== 'accepted') throw httpError(400, `Possession cannot be recorded for an allotment that is ${allotment.status}`);

    const today = dayjs().format('YYYY-MM-DD');
    const date = possessionDate || today;
    if (date > today) throw httpError(400, 'Possession date cannot be in the future');
    if (date < dayjs(allotment.offered_at).format('YYYY-MM-DD')) {
      throw httpError(400, 'Possession date cannot be before the offer date');
    }

    const quarter = await Quarter.findByPk(allotment.quarter_id, lock(transaction));
    const profile = await EmployeeProfile.findByPk(allotment.employee_profile_id, lock(transaction));

    await allotment.update({ status: 'possession_taken', possession_date: date }, { transaction });
    await quarter.update({ status: 'occupied', current_occupant_id: profile.id }, { transaction });
    await Occupancy.create(
      {
        quarter_id: quarter.id,
        allotment_id: allotment.id,
        employee_profile_id: profile.id,
        start_date: date,
        is_current: true,
      },
      { transaction }
    );
    await profile.update({ has_active_allotment: true }, { transaction });

    // TODO(Phase 5): audit log + notify employee
    const withName = await loadProfileWithName(profile.id, transaction);
    const payload = basePayload(allotment, quarter, withName);
    await certificateService.generate(
      allotment,
      'POSSESSION_LETTER',
      { ...payload, possession_date: dayjs(date).format('DD MMM YYYY'), recorded_by: actor.name },
      actor.id,
      transaction
    );
    await certificateService.generate(
      allotment,
      'OCCUPANCY_CERTIFICATE',
      { ...payload, occupancy_start_date: dayjs(date).format('DD MMM YYYY') },
      actor.id,
      transaction
    );
  });

  return get(allotmentId, actor);
}

module.exports = { list, get, suggestFor, offer, respond, takePossession };
