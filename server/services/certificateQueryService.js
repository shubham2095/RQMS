// Certificates ki list / metadata (generation `certificateService.js` mein hai).
const dayjs = require('dayjs');
const { Op } = require('sequelize');
const { Certificate, User, Allotment, VacationRequest, EmployeeProfile, Quarter } = require('../models');
const { certificateScope, canSeeCertificate } = require('./fileAccess');
const { likePattern } = require('../utils/likeSearch');
const httpError = require('../utils/httpError');

const ISSUER = { model: User, as: 'issuer', attributes: ['id', 'name'] };
const HOLDER = {
  model: EmployeeProfile,
  as: 'employee',
  attributes: ['id', 'employee_id'],
  include: [{ model: User, as: 'user', attributes: ['name'] }],
};
const QUARTER = { model: Quarter, as: 'quarter', attributes: ['id', 'quarter_number', 'quarter_type'] };

function summary(type, record, label) {
  return {
    type,
    id: record.id,
    label, // dikhane ke liye: order no / reference no
    quarter_number: record.quarter ? record.quarter.quarter_number : null,
    employee_id: record.employee.employee_id,
    employee_name: record.employee.user.name,
  };
}

// Parent type ke hisaab se ek query (N+1 nahi): order/reference no, quarter, holder.
async function relatedFor(certificates) {
  const idsOf = (type) => [...new Set(certificates.filter((c) => c.certifiable_type === type).map((c) => c.certifiable_id))];
  const map = { Allotment: {}, VacationRequest: {} };

  const allotmentIds = idsOf('Allotment');
  if (allotmentIds.length > 0) {
    const rows = await Allotment.findAll({ where: { id: { [Op.in]: allotmentIds } }, attributes: ['id', 'allotment_order_no'], include: [HOLDER, QUARTER] });
    rows.forEach((row) => {
      map.Allotment[row.id] = summary('Allotment', row, row.allotment_order_no);
    });
  }

  const vacationIds = idsOf('VacationRequest');
  if (vacationIds.length > 0) {
    const rows = await VacationRequest.findAll({ where: { id: { [Op.in]: vacationIds } }, attributes: ['id', 'reference_no'], include: [HOLDER, QUARTER] });
    rows.forEach((row) => {
      map.VacationRequest[row.id] = summary('VacationRequest', row, row.reference_no);
    });
  }
  return map;
}

function withRelated(certificate, related) {
  const json = certificate.toJSON();
  json.related = (related[certificate.certifiable_type] || {})[certificate.certifiable_id] || null;
  return json;
}

// List mein payload nahi (bhaari); file_path server-side hai, client ko nahi.
const LIST_ATTRIBUTES = { exclude: ['file_path', 'payload'] };

// filters: { type, certifiable_type, from, to, q (number), page, page_size }. Staff ko apne types ke sab, baaki ko sirf apne.
async function list(actor, filters) {
  const conditions = [await certificateScope(actor)];
  if (filters.type) conditions.push({ type: filters.type });
  if (filters.certifiable_type) conditions.push({ certifiable_type: filters.certifiable_type });
  if (filters.from) conditions.push({ issued_at: { [Op.gte]: dayjs(filters.from).startOf('day').toDate() } });
  if (filters.to) conditions.push({ issued_at: { [Op.lte]: dayjs(filters.to).endOf('day').toDate() } });
  if (filters.q) conditions.push({ number: { [Op.like]: likePattern(filters.q) } });

  const { rows, count } = await Certificate.findAndCountAll({
    where: { [Op.and]: conditions },
    attributes: LIST_ATTRIBUTES,
    include: [ISSUER],
    order: [['id', 'DESC']],
    limit: filters.page_size,
    offset: (filters.page - 1) * filters.page_size,
  });

  const related = await relatedFor(rows);
  return { items: rows.map((row) => withRelated(row, related)), page: filters.page, page_size: filters.page_size, total: count };
}

// Metadata (payload ke saath). Dekhne ka haq na ho to 404.
async function get(id, actor) {
  const certificate = await Certificate.findByPk(id, { attributes: { exclude: ['file_path'] }, include: [ISSUER] });
  if (!certificate || !(await canSeeCertificate(certificate, actor))) throw httpError(404, 'Certificate not found');
  return withRelated(certificate, await relatedFor([certificate]));
}

module.exports = { list, get };
