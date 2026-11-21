const auditService = require('../services/auditService');
const { parse } = require('../utils/validate');
const { auditQuerySchema } = require('../validators/auditValidator');

async function listAudit(req, res, next) {
  try {
    const filters = parse(auditQuerySchema, req.query);
    const result = await auditService.list(filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { listAudit };
