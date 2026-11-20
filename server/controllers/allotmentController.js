const allotmentService = require('../services/allotmentService');
const { parse } = require('../utils/validate');
const { respondSchema, possessionSchema, allotmentQuerySchema } = require('../validators/allotmentValidator');
const { idParamSchema } = require('../validators/commonValidator');

async function listAllotments(req, res, next) {
  try {
    const filters = parse(allotmentQuerySchema, req.query);
    const allotments = await allotmentService.list(req.user, filters);
    res.json({ allotments });
  } catch (err) {
    next(err);
  }
}

async function getAllotment(req, res, next) {
  try {
    const { id } = parse(idParamSchema, req.params);
    const allotment = await allotmentService.get(id, req.user);
    res.json({ allotment });
  } catch (err) {
    next(err);
  }
}

async function respond(req, res, next) {
  try {
    const { id } = parse(idParamSchema, req.params);
    const data = parse(respondSchema, req.body);
    const allotment = await allotmentService.respond(id, req.user, data);
    res.json({ allotment });
  } catch (err) {
    next(err);
  }
}

async function takePossession(req, res, next) {
  try {
    const { id } = parse(idParamSchema, req.params);
    const { possession_date } = parse(possessionSchema, req.body);
    const allotment = await allotmentService.takePossession(id, req.user, possession_date);
    res.json({ allotment });
  } catch (err) {
    next(err);
  }
}

// POST /api/quarters/:id/offer
async function offerQuarter(req, res, next) {
  try {
    const { id } = parse(idParamSchema, req.params);
    const allotment = await allotmentService.offer(id, req.user);
    res.status(201).json({ allotment });
  } catch (err) {
    next(err);
  }
}

// GET /api/quarters/:id/offer-suggestion
async function offerSuggestion(req, res, next) {
  try {
    const { id } = parse(idParamSchema, req.params);
    const suggestion = await allotmentService.suggestFor(id);
    res.json({ suggestion });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listAllotments,
  getAllotment,
  respond,
  takePossession,
  offerQuarter,
  offerSuggestion,
};
