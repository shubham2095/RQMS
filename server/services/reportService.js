// Dashboard / reports. Sab counts GROUP BY queries se (rows JS mein load nahi hote).
// TODO(reservation): reserved-quota (SC/ST) metrics abhi report nahi hote — reservation pending (config.reservation).
const { fn, col, Op } = require('sequelize');
const {
  Quarter,
  QuarterApplication,
  WaitingListEntry,
  Allotment,
  VacationRequest,
  RetirementRecord,
  EmployeeProfile,
  User,
} = require('../models');
const { enums, liveAllotmentStatuses, vacationClearanceSteps } = require('../config/rqms');
const { hasAnyPermission } = require('./userAccessService');
const { stepsFor } = require('./vacationWorkflowService');

const DRILL_DOWN_LIMIT = 200;
const COUNT = [fn('COUNT', col('id')), 'count'];

// {key: n} har key ke liye, jo data mein nahi use 0 — UI mein har status hamesha dikhe.
function zeroFilled(keys) {
  const counts = {};
  keys.forEach((key) => {
    counts[key] = 0;
  });
  return counts;
}

// GROUP BY rows [{ <column>: value, count }] -> { value: count } (zero-filled)
function countsBy(rows, column, keys) {
  const counts = zeroFilled(keys);
  rows.forEach((row) => {
    counts[row[column]] = (counts[row[column]] || 0) + Number(row.count);
  });
  return counts;
}

function sum(object) {
  return Object.values(object).reduce((total, value) => total + value, 0);
}

// Ek hi grouped query (type, station, status) se quarters ke chaaro rollup.
function quarterRollups(rows) {
  const byType = zeroFilled(enums.quarterTypes);
  const byStatus = zeroFilled(enums.quarterStatuses);
  const byStation = {};
  const byTypeStatus = {};
  enums.quarterTypes.forEach((type) => {
    byTypeStatus[type] = zeroFilled(enums.quarterStatuses);
  });

  rows.forEach((row) => {
    const n = Number(row.count);
    byType[row.quarter_type] += n;
    byStatus[row.status] += n;
    byTypeStatus[row.quarter_type][row.status] += n;
    if (!byStation[row.station]) byStation[row.station] = { total: 0, ...zeroFilled(enums.quarterStatuses) };
    byStation[row.station].total += n;
    byStation[row.station][row.status] += n;
  });

  return { total: sum(byType), by_type: byType, by_status: byStatus, by_station: byStation, by_type_status: byTypeStatus };
}

async function grouped(Model, columns, options = {}) {
  return Model.findAll({ attributes: [...columns, COUNT], group: columns, raw: true, ...options });
}

// Dashboard summary: kuch fixed grouped queries (data kitna bhi ho), parallel.
async function summary() {
  const [quarterRows, applicationRows, waitingRows, allotmentRows, vacationRows, stepRows, retirementRows, penaltyRows] =
    await Promise.all([
      grouped(Quarter, ['quarter_type', 'station', 'status']),
      grouped(QuarterApplication, ['status']),
      WaitingListEntry.findAll({
        attributes: ['quarter_type', 'station', COUNT, [fn('MIN', col('waiting_since')), 'oldest_waiting_since']],
        where: { is_active: true },
        group: ['quarter_type', 'station'],
        order: [['quarter_type', 'ASC'], ['station', 'ASC']],
        raw: true,
      }),
      grouped(Allotment, ['status']),
      grouped(VacationRequest, ['status']),
      grouped(VacationRequest, ['current_step'], { where: { status: 'in_clearance' } }),
      grouped(RetirementRecord, ['status']),
      RetirementRecord.findAll({
        attributes: [[fn('COALESCE', fn('SUM', col('penalty_amount')), 0), 'total']],
        where: { status: 'overstaying' },
        raw: true,
      }),
    ]);

  const allotmentCounts = countsBy(allotmentRows, 'status', enums.allotmentStatuses);
  const waitingList = waitingRows.map((row) => ({
    quarter_type: row.quarter_type,
    station: row.station,
    count: Number(row.count),
    oldest_waiting_since: row.oldest_waiting_since,
  }));

  return {
    generated_at: new Date(),
    quarters: quarterRollups(quarterRows),
    applications: { total: sum(countsBy(applicationRows, 'status', enums.applicationStatuses)), by_status: countsBy(applicationRows, 'status', enums.applicationStatuses) },
    waiting_list: { total: waitingList.reduce((total, row) => total + row.count, 0), by_queue: waitingList },
    allotments: {
      by_status: allotmentCounts,
      active: liveAllotmentStatuses.reduce((total, status) => total + allotmentCounts[status], 0),
      possession: allotmentCounts.possession_taken,
    },
    vacations: {
      by_status: countsBy(vacationRows, 'status', enums.vacationStatuses),
      in_clearance_by_step: countsBy(stepRows, 'current_step', vacationClearanceSteps),
    },
    retirements: {
      by_status: countsBy(retirementRows, 'status', enums.retirementStatuses),
      open_penalty_total: Number(penaltyRows[0].total),
    },
  };
}

// Drill-down: vacant quarters (filters { type, station }), max 200 rows.
async function vacantQuarters(filters) {
  const where = { status: 'vacant' };
  if (filters.type) where.quarter_type = filters.type;
  if (filters.station) where.station = filters.station;

  const { rows, count } = await Quarter.findAndCountAll({
    where,
    attributes: ['id', 'quarter_number', 'quarter_type', 'colony_name', 'station', 'division', 'block', 'floor'],
    order: [['station', 'ASC'], ['quarter_type', 'ASC'], ['quarter_number', 'ASC']],
    limit: DRILL_DOWN_LIMIT,
  });
  return { items: rows, total: count, limit: DRILL_DOWN_LIMIT };
}

// Drill-down: overstaying retirees, sabse zyada overstay pehle, max 200 rows.
async function overstaying() {
  const { rows, count } = await RetirementRecord.findAndCountAll({
    where: { status: 'overstaying' },
    attributes: ['id', 'retirement_date', 'retention_expiry_date', 'overstay_days', 'penalty_amount'],
    include: [
      {
        model: EmployeeProfile,
        as: 'employee',
        attributes: ['id', 'employee_id', 'designation'],
        include: [{ model: User, as: 'user', attributes: ['name'] }],
      },
    ],
    order: [['overstay_days', 'DESC'], ['id', 'ASC']],
    limit: DRILL_DOWN_LIMIT,
  });
  return { items: rows, total: count, limit: DRILL_DOWN_LIMIT };
}

// Har logged-in user ke liye uski apni permissions ke hisaab se "mera kaam" counts. Employee ko {} (simple dashboard).
// Sirf wahi keys aati hain jinki permission user ke paas hai.
async function workQueue(actor) {
  const queue = {};

  if (hasAnyPermission(actor, 'application.verify')) {
    queue.applications_to_verify = await QuarterApplication.count({ where: { status: 'submitted' } });
    queue.applications_to_check = await QuarterApplication.count({ where: { status: 'verified' } });
  }
  if (hasAnyPermission(actor, 'application.decide')) {
    queue.applications_to_decide = await QuarterApplication.count({ where: { status: 'waitlisted' } });
  }
  if (hasAnyPermission(actor, 'allotment.possession')) {
    queue.offers_awaiting_possession = await Allotment.count({ where: { status: 'accepted' } });
  }
  const steps = stepsFor(actor);
  if (steps.length > 0) {
    queue.vacations_at_my_step = await VacationRequest.count({
      where: { status: 'in_clearance', current_step: { [Op.in]: steps } },
    });
  }
  return queue;
}

module.exports = { summary, vacantQuarters, overstaying, workQueue, zeroFilled };
