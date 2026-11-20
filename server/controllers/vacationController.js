const vacationWorkflowService = require('../services/vacationWorkflowService');
const { parse } = require('../utils/validate');
const { initiateSchema, actStepSchema, vacationQuerySchema } = require('../validators/vacationValidator');
const { idParamSchema } = require('../validators/commonValidator');

async function initiate(req, res, next) {
  try {
    const data = parse(initiateSchema, req.body);
    const request = await vacationWorkflowService.initiate(req.user, data);
    res.status(201).json({ request });
  } catch (err) {
    next(err);
  }
}

async function listRequests(req, res, next) {
  try {
    const filters = parse(vacationQuerySchema, req.query);
    const requests = await vacationWorkflowService.list(req.user, filters);
    res.json({ requests });
  } catch (err) {
    next(err);
  }
}

async function getRequest(req, res, next) {
  try {
    const { id } = parse(idParamSchema, req.params);
    const request = await vacationWorkflowService.get(id, req.user);
    res.json({ request });
  } catch (err) {
    next(err);
  }
}

// Body: { step, decision: 'approve'|'reject', remarks?, + us step ke optional fields }
async function act(req, res, next) {
  try {
    const { id } = parse(idParamSchema, req.params);
    const { step } = parse(actStepSchema, req.body);
    const request = await vacationWorkflowService.act(id, req.user, step, req.body);
    res.json({ request });
  } catch (err) {
    next(err);
  }
}

module.exports = { initiate, listRequests, getRequest, act };
