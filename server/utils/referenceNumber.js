const dayjs = require('dayjs');
const { Op } = require('sequelize');
const httpError = require('./httpError');
const { isUniqueError } = require('./dbErrors');

// Aaj ka agla sequence number: nextDailyNumber('AO', Allotment, 'allotment_order_no', t) -> 'AO-20261121-0001'
// Transaction ke andar chalao. Do requests ek saath same number nikalein to unique index ek ko rok deta hai —
// retryOnUnique use kar ke dobara try karo.
async function nextDailyNumber(prefix, Model, column, transaction, date = new Date()) {
  const start = `${prefix}-${dayjs(date).format('YYYYMMDD')}-`;
  const count = await Model.count({ where: { [column]: { [Op.like]: `${start}%` } }, transaction });
  return `${start}${String(count + 1).padStart(4, '0')}`;
}

// fn() ko unique-constraint error par kuch baar dobara chalata hai (har baar naya transaction).
async function retryOnUnique(fn, attempts = 3) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      if (!isUniqueError(err)) throw err;
      if (attempt === attempts) throw httpError(409, 'Could not generate a unique number. Please try again.');
    }
  }
  return null;
}

module.exports = { nextDailyNumber, retryOnUnique };
