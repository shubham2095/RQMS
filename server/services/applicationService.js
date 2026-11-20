const { Op } = require('sequelize');
const {
  sequelize,
  QuarterApplication,
  EmployeeProfile,
  User,
  WaitingListEntry,
  Document,
  Allotment,
  Quarter,
} = require('../models');
const eligibilityService = require('./eligibilityService');
const priorityService = require('./priorityService');
const waitingListService = require('./waitingListService');
const { hasAnyPermission } = require('./userAccessService');
const { openApplicationStatuses } = require('../config/rqms');
const httpError = require('../utils/httpError');
const { nextDailyNumber, retryOnUnique } = require('../utils/referenceNumber');

const ATTACHMENT_CATEGORY = 'application_attachment';

const listInclude = [
  {
    model: EmployeeProfile,
    as: 'employee',
    attributes: ['id', 'employee_id', 'designation', 'station'],
    include: [{ model: User, as: 'user', attributes: ['name'] }],
  },
  { model: WaitingListEntry, as: 'waiting_entry', attributes: ['id', 'rank', 'priority_score', 'is_active'] },
];

const detailInclude = [
  ...listInclude,
  { model: User, as: 'verifier', attributes: ['id', 'name'] },
  { model: User, as: 'decider', attributes: ['id', 'name'] },
  {
    model: Document,
    as: 'documents',
    attributes: ['id', 'category', 'title', 'original_name', 'mime', 'size', 'createdAt'],
  },
  {
    model: Allotment,
    as: 'allotments',
    attributes: ['id', 'allotment_order_no', 'status', 'quarter_id'],
    include: [{ model: Quarter, as: 'quarter', attributes: ['id', 'quarter_number', 'quarter_type', 'colony_name', 'station'] }],
  },
];

function lock(transaction) {
  return { transaction, lock: transaction.LOCK.UPDATE };
}

// Clerk / estate officer sab applications dekhte hain; employee sirf apni.
function canSeeAll(actor) {
  return hasAnyPermission(actor, 'application.verify', 'application.decide');
}

async function findOwnProfile(actor) {
  return EmployeeProfile.findOne({ where: { user_id: actor.id } });
}

// ---------- reading ----------

async function list(actor, filters = {}) {
  const where = {};
  if (filters.status) where.status = filters.status;

  if (!canSeeAll(actor)) {
    const profile = await findOwnProfile(actor);
    if (!profile) return [];
    where.employee_profile_id = profile.id;
  }

  return QuarterApplication.findAll({ where, include: listInclude, order: [['applied_at', 'DESC'], ['id', 'DESC']] });
}

// Owner ya staff ke alawa koi na dekh sake — 404 (id guess karne wale ko pata na chale).
async function get(id, actor) {
  const application = await QuarterApplication.findByPk(id, {
    include: detailInclude,
    order: [[{ model: Document, as: 'documents' }, 'id', 'ASC']],
  });
  if (!application) throw httpError(404, 'Application not found');

  if (!canSeeAll(actor)) {
    const profile = await findOwnProfile(actor);
    if (!profile || profile.id !== application.employee_profile_id) throw httpError(404, 'Application not found');
  }
  return application;
}

// ---------- apply ----------

// data: validated body. files: multer files (already saved on disk).
async function apply(actor, data, files = []) {
  const profile = await findOwnProfile(actor);
  if (!profile) throw httpError(400, 'Save your profile before applying for a quarter');

  const applicationId = await retryOnUnique(() =>
    sequelize.transaction(async (transaction) => {
      // Profile row lock: ek hi employee ke do saath-saath apply serialize ho jayein
      await EmployeeProfile.findByPk(profile.id, lock(transaction));

      const open = await QuarterApplication.findOne({
        where: { employee_profile_id: profile.id, status: { [Op.in]: openApplicationStatuses } },
        transaction,
      });
      if (open) throw httpError(409, `You already have an open application (${open.reference_no}, ${open.status})`);

      const now = new Date();
      const application = await QuarterApplication.create(
        {
          reference_no: await nextDailyNumber('QA', QuarterApplication, 'reference_no', transaction, now),
          employee_profile_id: profile.id,
          preferred_quarter_type: data.preferred_quarter_type,
          preferred_colony: data.preferred_colony,
          station: data.station,
          division: profile.division,
          // Snapshot: baad mein profile badle to rank na bigde
          service_type: profile.service_type,
          category: profile.category,
          family_size: data.family_size,
          medical_ground: data.medical_ground,
          special_grounds: data.special_grounds,
          status: 'submitted',
          applied_at: now,
        },
        { transaction }
      );

      if (files.length > 0) {
        await Document.bulkCreate(
          files.map((file) => ({
            documentable_type: 'QuarterApplication',
            documentable_id: application.id,
            category: ATTACHMENT_CATEGORY,
            original_name: file.originalname.slice(0, 255),
            path: file.filename,
            disk: 'local',
            mime: file.mimetype,
            size: file.size,
            version: 1,
            uploaded_by: actor.id,
          })),
          { transaction }
        );
      }

      // TODO(Phase 5): audit log + notify clerks
      return application.id;
    })
  );

  return get(applicationId, actor);
}

// ---------- clerk: verify ----------

async function verify(id, actor) {
  await sequelize.transaction(async (transaction) => {
    const application = await QuarterApplication.findByPk(id, lock(transaction));
    if (!application) throw httpError(404, 'Application not found');
    if (application.status !== 'submitted') {
      throw httpError(400, `Only a submitted application can be verified (this one is ${application.status})`);
    }

    await application.update({ status: 'verified', verified_by: actor.id, verified_at: new Date() }, { transaction });
    // TODO(Phase 5): audit log
  });
  return get(id, actor);
}

// ---------- clerk: eligibility + priority engine ----------

const ENGINE_STATUSES = ['verified', 'ineligible', 'waitlisted'];

async function runEngine(id, actor) {
  await sequelize.transaction(async (transaction) => {
    const application = await QuarterApplication.findByPk(id, lock(transaction));
    if (!application) throw httpError(404, 'Application not found');
    if (!ENGINE_STATUSES.includes(application.status)) {
      throw httpError(400, `The engine can run on a verified, ineligible or waitlisted application (this one is ${application.status})`);
    }

    const profile = await EmployeeProfile.findByPk(application.employee_profile_id, { transaction });
    const now = new Date();

    const eligibilityResult = eligibilityService.evaluate(application, profile, now);
    const { score, breakdown } = priorityService.calculate(
      {
        service_type: application.service_type, // snapshot
        category: application.category, // snapshot
        medical_ground: application.medical_ground,
        date_of_joining: profile.date_of_joining,
        waiting_since: application.applied_at,
      },
      now
    );

    await application.update(
      {
        eligibility_result: eligibilityResult,
        priority_breakdown: breakdown,
        priority_score: score,
        status: eligibilityResult.eligible ? 'waitlisted' : 'ineligible',
      },
      { transaction }
    );

    if (eligibilityResult.eligible) {
      await waitingListService.place(application, transaction);
    } else {
      await waitingListService.remove(application, transaction);
    }
    // TODO(Phase 5): audit log
  });
  return get(id, actor);
}

// ---------- estate officer: decide ----------

const REJECTABLE_STATUSES = ['submitted', 'verified', 'ineligible', 'waitlisted', 'approved'];

// decision: 'approve' | 'reject'. Approve sirf waitlisted se; reject kisi bhi pre-allotment stage se.
async function decide(id, actor, { decision, remarks }) {
  await sequelize.transaction(async (transaction) => {
    const application = await QuarterApplication.findByPk(id, lock(transaction));
    if (!application) throw httpError(404, 'Application not found');

    const stamp = { decided_by: actor.id, decided_at: new Date(), remarks: remarks || null };

    if (decision === 'approve') {
      if (application.status !== 'waitlisted') {
        throw httpError(400, `Only a waitlisted application can be approved (this one is ${application.status})`);
      }
      await application.update({ ...stamp, status: 'approved' }, { transaction });
    } else {
      if (!REJECTABLE_STATUSES.includes(application.status)) {
        throw httpError(400, `An application that is ${application.status} cannot be rejected`);
      }
      await application.update({ ...stamp, status: 'rejected' }, { transaction });
      await waitingListService.remove(application, transaction);
    }
    // TODO(Phase 5): audit log + notify employee
  });
  return get(id, actor);
}

module.exports = { list, get, apply, verify, runEngine, decide };
