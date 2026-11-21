const notificationService = require('../services/notificationService');
const { parse } = require('../utils/validate');
const { notificationQuerySchema } = require('../validators/notificationValidator');
const { idParamSchema } = require('../validators/commonValidator');

async function listNotifications(req, res, next) {
  try {
    const filters = parse(notificationQuerySchema, req.query);
    const result = await notificationService.listOwn(req.user, filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function markRead(req, res, next) {
  try {
    const { id } = parse(idParamSchema, req.params);
    const notification = await notificationService.markRead(req.user, id);
    res.json({ notification });
  } catch (err) {
    next(err);
  }
}

async function markAllRead(req, res, next) {
  try {
    const updated = await notificationService.markAllRead(req.user);
    res.json({ updated });
  } catch (err) {
    next(err);
  }
}

module.exports = { listNotifications, markRead, markAllRead };
