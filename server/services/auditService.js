const dayjs = require('dayjs');
const { Op } = require('sequelize');
const { AuditLog, User } = require('../models');
const { currentRequest } = require('../middleware/requestContext');

const SECRET_KEY = /password|token|secret/i;

// properties se secrets hata do (nested bhi). Kabhi password audit log mein nahi jana chahiye.
function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const clean = {};
    Object.keys(value).forEach((key) => {
      if (!SECRET_KEY.test(key)) clean[key] = sanitize(value[key]);
    });
    return clean;
  }
  return value;
}

// auditable: Sequelize instance (type = model ka naam), ya { type, id }, ya null.
function describeAuditable(auditable) {
  if (!auditable) return { type: null, id: null };
  if (auditable.type !== undefined) return { type: auditable.type, id: auditable.id || null };
  return { type: auditable.constructor.name, id: auditable.id || null };
}

// ip + user-agent: `req` diya ho to usse, warna chalti request ke context se (service ke andar).
function requestInfo(req) {
  if (req) return { ip: req.ip || null, userAgent: (req.headers && req.headers['user-agent']) || null };
  const context = currentRequest();
  return context || { ip: null, userAgent: null };
}

// Ek audit row likho. KABHI throw nahi karta: audit fail ho to log karke aage badho (main action na ruke).
// Transaction COMMIT ke BAAD call karo, andar nahi — rollback hui action ka audit nahi banna chahiye.
async function log(user, action, auditable, description, properties = null, req = null) {
  try {
    const { type, id } = describeAuditable(auditable);
    const info = requestInfo(req);
    await AuditLog.create({
      user_id: user ? user.id : null,
      action,
      auditable_type: type,
      auditable_id: id,
      description: String(description).slice(0, 500),
      properties: properties ? sanitize(properties) : null,
      ip_address: info.ip ? String(info.ip).slice(0, 64) : null,
      user_agent: info.userAgent ? String(info.userAgent).slice(0, 255) : null,
    });
  } catch (err) {
    console.error(`Audit log failed (${action}):`, err.message);
  }
}

// Audit log dekhna: filters { action, user_id, from, to (YYYY-MM-DD, dono din shamil), page, page_size }.
// Newest pehle. Returns { logs, page, page_size, total }.
async function list(filters) {
  const where = {};
  if (filters.action) where.action = filters.action;
  if (filters.user_id) where.user_id = filters.user_id;
  if (filters.from || filters.to) {
    where.created_at = {};
    if (filters.from) where.created_at[Op.gte] = dayjs(filters.from).startOf('day').toDate();
    if (filters.to) where.created_at[Op.lte] = dayjs(filters.to).endOf('day').toDate();
  }

  const { rows, count } = await AuditLog.findAndCountAll({
    where,
    include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
    order: [['id', 'DESC']],
    limit: filters.page_size,
    offset: (filters.page - 1) * filters.page_size,
  });
  return { logs: rows, page: filters.page, page_size: filters.page_size, total: count };
}

module.exports = { log, list, sanitize };
