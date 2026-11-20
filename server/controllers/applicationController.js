const applicationService = require('../services/applicationService');
const { parse } = require('../utils/validate');
const { removeFiles } = require('../utils/files');
const { applySchema, applicationQuerySchema, decideSchema } = require('../validators/applicationValidator');
const { idParamSchema } = require('../validators/commonValidator');

async function apply(req, res, next) {
  try {
    const data = parse(applySchema, req.body);
    const application = await applicationService.apply(req.user, data, req.files);
    res.status(201).json({ application });
  } catch (err) {
    removeFiles(req.files); // validation / service fail: upload hui files bhi hata do
    next(err);
  }
}

async function listApplications(req, res, next) {
  try {
    const filters = parse(applicationQuerySchema, req.query);
    const applications = await applicationService.list(req.user, filters);
    res.json({ applications });
  } catch (err) {
    next(err);
  }
}

async function getApplication(req, res, next) {
  try {
    const { id } = parse(idParamSchema, req.params);
    const application = await applicationService.get(id, req.user);
    res.json({ application });
  } catch (err) {
    next(err);
  }
}

async function verify(req, res, next) {
  try {
    const { id } = parse(idParamSchema, req.params);
    const application = await applicationService.verify(id, req.user);
    res.json({ application });
  } catch (err) {
    next(err);
  }
}

async function runEngine(req, res, next) {
  try {
    const { id } = parse(idParamSchema, req.params);
    const application = await applicationService.runEngine(id, req.user);
    res.json({ application });
  } catch (err) {
    next(err);
  }
}

async function decide(req, res, next) {
  try {
    const { id } = parse(idParamSchema, req.params);
    const data = parse(decideSchema, req.body);
    const application = await applicationService.decide(id, req.user, data);
    res.json({ application });
  } catch (err) {
    next(err);
  }
}

module.exports = { apply, listApplications, getApplication, verify, runEngine, decide };
