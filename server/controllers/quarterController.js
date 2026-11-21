const quarterService = require('../services/quarterService');
const { parse } = require('../utils/validate');
const {
  createQuarterSchema,
  updateQuarterSchema,
  quarterQuerySchema,
} = require('../validators/quarterValidator');
const { idParamSchema } = require('../validators/commonValidator');

async function listQuarters(req, res, next) {
  try {
    const filters = parse(quarterQuerySchema, req.query);
    const quarters = await quarterService.listQuarters(filters);
    res.json({ quarters });
  } catch (err) {
    next(err);
  }
}

async function getQuarter(req, res, next) {
  try {
    const { id } = parse(idParamSchema, req.params);
    const quarter = await quarterService.getQuarter(id);
    res.json({ quarter });
  } catch (err) {
    next(err);
  }
}

async function createQuarter(req, res, next) {
  try {
    const data = parse(createQuarterSchema, req.body);
    const quarter = await quarterService.createQuarter(req.user, data);
    res.status(201).json({ quarter });
  } catch (err) {
    next(err);
  }
}

async function updateQuarter(req, res, next) {
  try {
    const { id } = parse(idParamSchema, req.params);
    const data = parse(updateQuarterSchema, req.body);
    const quarter = await quarterService.updateQuarter(req.user, id, data);
    res.json({ quarter });
  } catch (err) {
    next(err);
  }
}

module.exports = { listQuarters, getQuarter, createQuarter, updateQuarter };
