const retirementService = require('../services/retirementService');
const { parse } = require('../utils/validate');
const { retirementQuerySchema } = require('../validators/retirementValidator');

async function listRetirements(req, res, next) {
  try {
    const filters = parse(retirementQuerySchema, req.query);
    const retirements = await retirementService.list(filters);
    res.json({ retirements });
  } catch (err) {
    next(err);
  }
}

// Manual trigger. Deploy par daily cron isi service function ko call karega (Phase 6).
async function runCycle(req, res, next) {
  try {
    const summary = await retirementService.processDailyRetentionCycle(new Date(), req.user);
    res.json({ summary });
  } catch (err) {
    next(err);
  }
}

module.exports = { listRetirements, runCycle };
