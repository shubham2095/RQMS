const { WaitingListEntry, QuarterApplication, EmployeeProfile, User } = require('../models');

// Queue key = (quarter_type, station). Order: priority_score DESC, waiting_since ASC (jo pehle apply kiya), id ASC.
const RANK_ORDER = [
  ['priority_score', 'DESC'],
  ['waiting_since', 'ASC'],
  ['id', 'ASC'],
];

function lockOption(transaction) {
  return transaction ? { transaction, lock: transaction.LOCK.UPDATE } : {};
}

// Us queue ki saari active entries ko dobara rank 1..n do. Koi bhi change ke baad call karo.
async function reRank(quarterType, station, transaction) {
  const entries = await WaitingListEntry.findAll({
    where: { quarter_type: quarterType, station, is_active: true },
    order: RANK_ORDER,
    ...lockOption(transaction),
  });

  for (let index = 0; index < entries.length; index += 1) {
    const rank = index + 1;
    if (entries[index].rank !== rank) await entries[index].update({ rank }, { transaction });
  }
  return entries;
}

// Application ko uski queue mein daalo (ya score update karo) aur re-rank karo.
async function place(application, transaction) {
  const values = {
    quarter_type: application.preferred_quarter_type,
    station: application.station,
    priority_score: application.priority_score || 0,
    waiting_since: application.applied_at,
    is_active: true,
  };

  let entry = await WaitingListEntry.findOne({
    where: { quarter_application_id: application.id },
    ...lockOption(transaction),
  });
  if (entry) {
    await entry.update(values, { transaction });
  } else {
    entry = await WaitingListEntry.create({ ...values, quarter_application_id: application.id }, { transaction });
  }

  await reRank(values.quarter_type, values.station, transaction);
  return entry.reload({ transaction });
}

// Queue se hatao (history rehti hai: is_active=false, rank=null) aur baaki ko re-rank karo.
async function remove(application, transaction) {
  const entry = await WaitingListEntry.findOne({
    where: { quarter_application_id: application.id, is_active: true },
    ...lockOption(transaction),
  });
  if (!entry) return;

  await entry.update({ is_active: false, rank: null }, { transaction });
  await reRank(entry.quarter_type, entry.station, transaction);
}

// Display ke liye queue: filters { type, station } optional. Rank order mein.
async function queue(filters = {}) {
  const where = { is_active: true };
  if (filters.type) where.quarter_type = filters.type;
  if (filters.station) where.station = filters.station;

  return WaitingListEntry.findAll({
    where,
    order: [['quarter_type', 'ASC'], ['station', 'ASC'], ...RANK_ORDER],
    include: [
      {
        model: QuarterApplication,
        as: 'application',
        attributes: ['id', 'reference_no', 'status', 'category', 'service_type', 'medical_ground', 'applied_at'],
        include: [
          {
            model: EmployeeProfile,
            as: 'employee',
            attributes: ['id', 'employee_id', 'designation'],
            include: [{ model: User, as: 'user', attributes: ['name'] }],
          },
        ],
      },
    ],
  });
}

module.exports = { place, reRank, remove, queue, RANK_ORDER };
