const dayjs = require('dayjs');
const { Op } = require('sequelize');
const { RetirementRecord, EmployeeProfile, Allotment, Quarter, User } = require('../models');
const auditService = require('./auditService');
const notificationService = require('./notificationService');
const { retention } = require('../config/rqms');

const DATE_FORMAT = 'YYYY-MM-DD';
const NAME_ONLY = { model: User, as: 'user', attributes: ['name'] };

function day(value) {
  return dayjs(value).startOf('day');
}

function expiryFor(retirementDate) {
  return day(retirementDate).add(retention.periodDays, 'day').format(DATE_FORMAT);
}

// PURE (DB nahi): record + aaj ki date -> { status, overstay_days, penalty_amount }.
// Sab kuch absolute dates se nikalta hai, isliye cycle dobara chalane par same result (idempotent).
//   aaj < retirement date          -> notice
//   aaj > expiry                   -> overstaying (din * penalty per day)
//   expiry - aaj <= alert window   -> expiring
//   baaki                          -> retained
function evaluate(record, asOf = new Date()) {
  const today = day(asOf);
  const retirement = day(record.retirement_date);
  const expiry = day(record.retention_expiry_date || record.retirement_date);

  if (today.isBefore(retirement)) return { status: 'notice', overstay_days: 0, penalty_amount: 0 };

  if (today.isAfter(expiry)) {
    const days = today.diff(expiry, 'day');
    return { status: 'overstaying', overstay_days: days, penalty_amount: days * retention.penaltyPerDay };
  }
  if (expiry.diff(today, 'day') <= retention.alertBeforeDays) {
    return { status: 'expiring', overstay_days: 0, penalty_amount: 0 };
  }
  return { status: 'retained', overstay_days: 0, penalty_amount: 0 };
}

// Retirement record banao (vacation trigger='retirement' par). Transaction ke andar chalao.
// Idempotent: usi profile + allotment ka koi non-cleared record ho to wahi lautata hai (duplicate nahi).
// Retention abhi automatic grant hota hai (approval flow baad mein). Returns { record, created }.
async function recordRetirement(profile, allotment, { retirementDate, transaction, asOf = new Date() }) {
  const existing = await RetirementRecord.findOne({
    where: {
      employee_profile_id: profile.id,
      allotment_id: allotment ? allotment.id : null,
      status: { [Op.ne]: 'cleared' },
    },
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });
  if (existing) return { record: existing, created: false };

  const data = {
    employee_profile_id: profile.id,
    allotment_id: allotment ? allotment.id : null,
    retirement_date: retirementDate,
    retention_granted: true,
    retention_period_days: retention.periodDays,
    retention_expiry_date: expiryFor(retirementDate),
  };
  const result = evaluate(data, asOf);
  const record = await RetirementRecord.create(
    { ...data, ...result, last_evaluated_at: new Date() },
    { transaction }
  );
  return { record, created: true };
}

// Quarter khali hone par (vacation complete) us allotment ka open record 'cleared': overstay/penalty handover
// date tak freeze. Transaction ke andar chalao. Record na ho to null.
async function markCleared(allotmentId, asOf, transaction) {
  const record = await RetirementRecord.findOne({
    where: { allotment_id: allotmentId, status: { [Op.ne]: 'cleared' } },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!record) return null;

  const result = evaluate(record, asOf);
  await record.update(
    { status: 'cleared', overstay_days: result.overstay_days, penalty_amount: result.penalty_amount, last_evaluated_at: new Date() },
    { transaction }
  );
  return record;
}

function fmt(value) {
  return dayjs(value).format('DD MMM YYYY');
}

// Status badalne par employee + estate officers ko alert (sirf expiring / overstaying mein ghusne par).
async function alertTransition(record, result) {
  const who = record.employee.user.name;
  const empId = record.employee.employee_id;

  if (result.status === 'expiring') {
    const daysLeft = day(record.retention_expiry_date).diff(day(new Date()), 'day');
    await notificationService.notify(
      record.employee.user_id,
      'retirement.expiring',
      `Your quarter retention period ends on ${fmt(record.retention_expiry_date)}. Please vacate before then to avoid a penalty of ₹${retention.penaltyPerDay} per day.`,
      'Retention expiring'
    );
    await notificationService.notifyRole(
      'estate_officer',
      'retirement.expiring',
      `${who} (${empId}): retention ends on ${fmt(record.retention_expiry_date)} (${Math.max(daysLeft, 0)} days left).`,
      'Retention expiring'
    );
    return 2;
  }

  await notificationService.notify(
    record.employee.user_id,
    'retirement.overstaying',
    `Your retention period ended on ${fmt(record.retention_expiry_date)}. You are overstaying by ${result.overstay_days} day(s); penalty so far ₹${result.penalty_amount}.`,
    'Overstaying'
  );
  await notificationService.notifyRole(
    'estate_officer',
    'retirement.overstaying',
    `${who} (${empId}) is overstaying by ${result.overstay_days} day(s); penalty so far ₹${result.penalty_amount}.`,
    'Overstaying'
  );
  return 2;
}

// Daily cycle: jo records 'cleared' nahi unhe aaj ki date se dobara evaluate karo, status/overstay/penalty update,
// aur expiring / overstaying mein ghusne par alert. Idempotent (dobara chalane par kuch naya nahi).
// Abhi manual trigger (POST /api/retirements/run-cycle); deploy par daily cron (Phase 6) isi ko call karega.
// asOf sirf tests ke liye — API se kabhi nahi aata.
async function processDailyRetentionCycle(asOf = new Date(), actor = null) {
  const records = await RetirementRecord.findAll({
    where: { status: { [Op.ne]: 'cleared' } },
    include: [{ model: EmployeeProfile, as: 'employee', attributes: ['id', 'employee_id', 'user_id'], include: [NAME_ONLY] }],
    order: [['id', 'ASC']],
  });

  const summary = { evaluated: records.length, changed: 0, expiring: 0, overstaying: 0, notifications: 0 };

  for (const record of records) {
    const result = evaluate(record, asOf);
    const unchanged =
      result.status === record.status &&
      result.overstay_days === record.overstay_days &&
      result.penalty_amount === record.penalty_amount;
    if (unchanged) continue;

    // Conditional update: do cycles ek saath chalein to bhi ek hi transition par ek hi alert jaye.
    const [updated] = await RetirementRecord.update(
      { ...result, last_evaluated_at: new Date() },
      { where: { id: record.id, status: record.status } }
    );
    if (updated === 0) continue;

    summary.changed += 1;
    if (result.status !== record.status && (result.status === 'expiring' || result.status === 'overstaying')) {
      summary[result.status] += 1;
      summary.notifications += await alertTransition(record, result);
    }
  }

  await auditService.log(
    actor,
    'retirement.run_cycle',
    null,
    `Retention cycle: ${summary.evaluated} evaluated, ${summary.changed} changed`,
    summary
  );
  return summary;
}

// ---------- reading ----------

async function list(filters = {}) {
  const where = {};
  if (filters.status) where.status = filters.status;

  return RetirementRecord.findAll({
    where,
    include: [
      { model: EmployeeProfile, as: 'employee', attributes: ['id', 'employee_id', 'designation'], include: [NAME_ONLY] },
      {
        model: Allotment,
        as: 'allotment',
        attributes: ['id', 'allotment_order_no'],
        include: [{ model: Quarter, as: 'quarter', attributes: ['id', 'quarter_number', 'quarter_type', 'colony_name', 'station'] }],
      },
    ],
    order: [['retention_expiry_date', 'ASC'], ['id', 'ASC']],
  });
}

module.exports = { evaluate, expiryFor, recordRetirement, markCleared, processDailyRetentionCycle, list };
