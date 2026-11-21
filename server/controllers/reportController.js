const reportService = require('../services/reportService');
const { parse } = require('../utils/validate');
const { vacantQuartersQuerySchema } = require('../validators/reportValidator');

async function summary(req, res, next) {
  try {
    res.json({ summary: await reportService.summary() });
  } catch (err) {
    next(err);
  }
}

async function vacantQuarters(req, res, next) {
  try {
    const filters = parse(vacantQuartersQuerySchema, req.query);
    res.json(await reportService.vacantQuarters(filters));
  } catch (err) {
    next(err);
  }
}

async function overstaying(req, res, next) {
  try {
    res.json(await reportService.overstaying());
  } catch (err) {
    next(err);
  }
}

async function workQueue(req, res, next) {
  try {
    res.json({ queue: await reportService.workQueue(req.user) });
  } catch (err) {
    next(err);
  }
}

module.exports = { summary, vacantQuarters, overstaying, workQueue };
