const { Quarter, EmployeeProfile } = require('../models');
const { manualQuarterStatuses } = require('../config/rqms');
const httpError = require('../utils/httpError');
const { isUniqueError } = require('../utils/dbErrors');

const withOccupant = [
  { model: EmployeeProfile, as: 'current_occupant', attributes: ['id', 'employee_id', 'designation'] },
];

// filters: { type, station, status } — jo diya wahi filter hoga.
async function listQuarters(filters) {
  const where = {};
  if (filters.type) where.quarter_type = filters.type;
  if (filters.station) where.station = filters.station;
  if (filters.status) where.status = filters.status;

  return Quarter.findAll({
    where,
    include: withOccupant,
    order: [
      ['station', 'ASC'],
      ['colony_name', 'ASC'],
      ['quarter_number', 'ASC'],
    ],
  });
}

async function getQuarter(id) {
  const quarter = await Quarter.findByPk(id, { include: withOccupant });
  if (!quarter) throw httpError(404, 'Quarter not found');
  return quarter;
}

async function createQuarter(data) {
  try {
    const quarter = await Quarter.create(data);
    return getQuarter(quarter.id);
  } catch (err) {
    if (isUniqueError(err)) {
      throw httpError(409, 'A quarter with this number already exists in this colony and station');
    }
    throw err;
  }
}

async function updateQuarter(id, data) {
  const quarter = await getQuarter(id);

  // allotted / occupied / vacation_pending / retired_occupancy ko allotment-vacation flow chalata hai.
  if (data.status && data.status !== quarter.status && !manualQuarterStatuses.includes(quarter.status)) {
    throw httpError(400, `Status of a ${quarter.status} quarter is managed by the allotment process`);
  }

  try {
    await quarter.update(data);
  } catch (err) {
    if (isUniqueError(err)) {
      throw httpError(409, 'A quarter with this number already exists in this colony and station');
    }
    throw err;
  }
  return getQuarter(id);
}

module.exports = { listQuarters, getQuarter, createQuarter, updateQuarter };
