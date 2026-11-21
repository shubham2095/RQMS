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
const { getEntitlement } = require('./entitlementService');
const waitingListService = require('./waitingListService');
const auditService = require('./auditService');
const notificationService = require('./notificationService');
const { hasAnyPermission } = require('./userAccessService');
const { openApplicationStatuses, liveAllotmentStatuses } = require('../config/rqms');
const httpError = require('../utils/httpError');
const { sha256File } = require('../utils/fileHash');
const { removeFiles } = require('../utils/files');
const { nextDailyNumber, retryOnUnique } = require('../utils/referenceNumber');

const ATTACHMENT_CATEGORY = 'application_attachment';

const listInclude = [
  {
    model: EmployeeProfile,
    as: 'employee',
    attributes: ['id', 'employee_id', 'designation', 'station', 'grade_pay', 'is_gazetted'],
    include: [{ model: User, as: 'user', attributes: ['name'] }],
  },
  // Rank registration date (waiting_since) se aata hai — score se nahi
  { model: WaitingListEntry, as: 'waiting_entry', attributes: ['id', 'rank', 'waiting_since', 'is_active'] },
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

  // Employee ke grade pay se abhi ka entitled type (engine chalne se pehle bhi dikhe)
  const result = application.toJSON();
  result.entitlement = getEntitlement(application.employee);
  return result;
}

// ---------- apply ----------

// Har file ka sha256. Ek hi submission mein same content wali file dobara aaye to usse store nahi karte
// (dedupe: file disk se hata do, naam duplicates mein) — application fail nahi hoti.
async function hashUploads(files) {
  const unique = [];
  const duplicates = [];
  const seen = new Set();
  for (const file of files) {
    const hash = await sha256File(file.path);
    if (seen.has(hash)) {
      duplicates.push(file.originalname);
      removeFiles([file]);
    } else {
      seen.add(hash);
      unique.push({ file, hash });
    }
  }
  return { unique, duplicates };
}

// data: validated body. files: multer files (already saved on disk).
async function apply(actor, data, files = []) {
  const profile = await findOwnProfile(actor);
  if (!profile) throw httpError(400, 'Save your profile before applying for a quarter');

  const { unique, duplicates } = await hashUploads(files);

  const created = await retryOnUnique(() =>
    sequelize.transaction(async (transaction) => {
      // Profile row lock: ek hi employee ke do saath-saath apply serialize ho jayein
      await EmployeeProfile.findByPk(profile.id, lock(transaction));

      // 'allotted' application tab tak open hai jab tak uski allotment live hai (offer se possession tak).
      // Quarter khali karne (allotment vacated) ke baad naya apply kar sakte hain.
      const candidates = await QuarterApplication.findAll({
        where: { employee_profile_id: profile.id, status: { [Op.in]: openApplicationStatuses } },
        include: [{ model: Allotment, as: 'allotments', attributes: ['id', 'status'] }],
        transaction,
      });
      const open = candidates.find(
        (item) =>
          item.status !== 'allotted' || item.allotments.some((allotment) => liveAllotmentStatuses.includes(allotment.status))
      );
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

      if (unique.length > 0) {
        await Document.bulkCreate(
          unique.map(({ file, hash }) => ({
            documentable_type: 'QuarterApplication',
            documentable_id: application.id,
            category: ATTACHMENT_CATEGORY,
            original_name: file.originalname.slice(0, 255),
            path: file.filename,
            disk: 'local',
            mime: file.mimetype,
            size: file.size,
            version: 1,
            hash,
            uploaded_by: actor.id,
          })),
          { transaction }
        );
      }

      return application;
    })
  );

  // Commit ke baad: audit + notifications (fail hone par bhi main action nahi rukta)
  await auditService.log(
    actor,
    'application.submit',
    created,
    `Application ${created.reference_no} submitted for Type ${created.preferred_quarter_type} at ${created.station}`,
    {
      reference_no: created.reference_no,
      quarter_type: created.preferred_quarter_type,
      station: created.station,
      documents: unique.length,
      duplicate_files_skipped: duplicates,
    }
  );
  await notificationService.notify(
    actor,
    'application.submitted',
    `Your application ${created.reference_no} has been received. The quarter clerk will verify it.`,
    'Application submitted'
  );
  await notificationService.notifyPermission(
    'application.verify',
    'application.submitted',
    `New application ${created.reference_no} from ${actor.name} is waiting for verification.`,
    'New application'
  );

  const result = await get(created.id, actor);
  result.duplicate_files = duplicates; // same content dobara upload hua to skip kiya (naam yahan)
  return result;
}

// ---------- clerk: verify ----------

async function verify(id, actor) {
  const application = await sequelize.transaction(async (transaction) => {
    const found = await QuarterApplication.findByPk(id, lock(transaction));
    if (!found) throw httpError(404, 'Application not found');
    if (found.status !== 'submitted') {
      throw httpError(400, `Only a submitted application can be verified (this one is ${found.status})`);
    }

    await found.update({ status: 'verified', verified_by: actor.id, verified_at: new Date() }, { transaction });
    return found;
  });

  await auditService.log(actor, 'application.verify', application, `Application ${application.reference_no} verified`, {
    reference_no: application.reference_no,
  });
  return get(id, actor);
}

// ---------- clerk: eligibility check -> waiting list ----------

const ENGINE_STATUSES = ['verified', 'ineligible', 'waitlisted'];

// Sirf eligibility (grade pay -> quarter type + baaki checks). Eligible ho to waiting list mein
// (rank = registration date order), warna ineligible. Koi points / score nahi.
async function runEngine(id, actor) {
  const outcome = await sequelize.transaction(async (transaction) => {
    const application = await QuarterApplication.findByPk(id, lock(transaction));
    if (!application) throw httpError(404, 'Application not found');
    if (!ENGINE_STATUSES.includes(application.status)) {
      throw httpError(400, `The engine can run on a verified, ineligible or waitlisted application (this one is ${application.status})`);
    }

    const profile = await EmployeeProfile.findByPk(application.employee_profile_id, { transaction });
    const eligibilityResult = eligibilityService.evaluate(application, profile);

    await application.update(
      {
        eligibility_result: eligibilityResult,
        // Purane points ke columns ab use nahi hote; re-run par purani values saaf kar do
        priority_score: null,
        priority_breakdown: null,
        status: eligibilityResult.eligible ? 'waitlisted' : 'ineligible',
      },
      { transaction }
    );

    // TODO(reservation): yahan SC/ST special list (reserved quota) ka decision aayega — abhi sab ek general list mein.
    if (eligibilityResult.eligible) {
      await waitingListService.place(application, transaction);
    } else {
      await waitingListService.remove(application, transaction);
    }
    return { application, eligibilityResult };
  });

  const { application, eligibilityResult } = outcome;
  await auditService.log(
    actor,
    'application.run_engine',
    application,
    `Eligibility check for ${application.reference_no}: ${eligibilityResult.eligible ? 'eligible, waitlisted' : 'ineligible'}`,
    { reference_no: application.reference_no, eligible: eligibilityResult.eligible, reasons: eligibilityResult.reasons }
  );
  return get(id, actor);
}

// ---------- estate officer: decide ----------

const REJECTABLE_STATUSES = ['submitted', 'verified', 'ineligible', 'waitlisted', 'approved'];

// decision: 'approve' | 'reject'. Approve sirf waitlisted se; reject kisi bhi pre-allotment stage se.
async function decide(id, actor, { decision, remarks }) {
  const application = await sequelize.transaction(async (transaction) => {
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
    return application;
  });

  const approved = decision === 'approve';
  await auditService.log(
    actor,
    approved ? 'application.approve' : 'application.reject',
    application,
    `Application ${application.reference_no} ${approved ? 'approved' : 'rejected'}`,
    { reference_no: application.reference_no, remarks: remarks || null }
  );
  await notificationService.notifyProfile(
    application.employee_profile_id,
    approved ? 'application.approved' : 'application.rejected',
    approved
      ? `Your application ${application.reference_no} has been approved. You will be offered a quarter when one is available for your turn.`
      : `Your application ${application.reference_no} was rejected${remarks ? `: ${remarks}` : '.'}`,
    approved ? 'Application approved' : 'Application rejected'
  );
  return get(id, actor);
}

module.exports = { list, get, apply, verify, runEngine, decide };
