const waitingListService = require('../services/waitingListService');
const { parse } = require('../utils/validate');
const { waitingListQuerySchema } = require('../validators/allotmentValidator');

async function listWaitingList(req, res, next) {
  try {
    const filters = parse(waitingListQuerySchema, req.query);
    const entries = await waitingListService.queue(filters);
    res.json({ entries });
  } catch (err) {
    next(err);
  }
}

module.exports = { listWaitingList };
