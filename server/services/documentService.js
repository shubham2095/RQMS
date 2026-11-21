const dayjs = require('dayjs');
const { Op } = require('sequelize');
const { Document, User, QuarterApplication, EmployeeProfile } = require('../models');
const { documentScope, canSeeDocument } = require('./fileAccess');
const { likePattern } = require('../utils/likeSearch');
const httpError = require('../utils/httpError');

// Server ka stored filename / disk client ko nahi dikhana.
const PUBLIC_ATTRIBUTES = { exclude: ['path', 'disk'] };
const UPLOADER = { model: User, as: 'uploader', attributes: ['id', 'name'] };

// Polymorphic parent (abhi sirf QuarterApplication) ke liye ek query: reference no + applicant. N+1 nahi.
async function relatedFor(documents) {
  const ids = [...new Set(documents.filter((d) => d.documentable_type === 'QuarterApplication').map((d) => d.documentable_id))];
  if (ids.length === 0) return {};

  const applications = await QuarterApplication.findAll({
    where: { id: { [Op.in]: ids } },
    attributes: ['id', 'reference_no', 'status'],
    include: [
      {
        model: EmployeeProfile,
        as: 'employee',
        attributes: ['id', 'employee_id'],
        include: [{ model: User, as: 'user', attributes: ['name'] }],
      },
    ],
  });
  const map = {};
  applications.forEach((app) => {
    map[app.id] = {
      type: 'QuarterApplication',
      id: app.id,
      reference_no: app.reference_no,
      status: app.status,
      employee_id: app.employee.employee_id,
      employee_name: app.employee.user.name,
    };
  });
  return map;
}

function withRelated(document, related) {
  const json = document.toJSON();
  json.related = related[document.documentable_id] || null;
  return json;
}

// filters: { documentable_type, category, uploaded_by, from, to, q, page, page_size }
// Staff ko sab, baaki ko sirf apne (documentScope). Newest pehle. Returns { items, page, page_size, total }.
async function list(actor, filters) {
  const conditions = [await documentScope(actor)];
  if (filters.documentable_type) conditions.push({ documentable_type: filters.documentable_type });
  if (filters.category) conditions.push({ category: filters.category });
  if (filters.uploaded_by) conditions.push({ uploaded_by: filters.uploaded_by });
  if (filters.from) conditions.push({ created_at: { [Op.gte]: dayjs(filters.from).startOf('day').toDate() } });
  if (filters.to) conditions.push({ created_at: { [Op.lte]: dayjs(filters.to).endOf('day').toDate() } });
  if (filters.q) {
    const pattern = likePattern(filters.q);
    conditions.push({ [Op.or]: [{ original_name: { [Op.like]: pattern } }, { title: { [Op.like]: pattern } }] });
  }

  const { rows, count } = await Document.findAndCountAll({
    where: { [Op.and]: conditions },
    attributes: PUBLIC_ATTRIBUTES,
    include: [UPLOADER],
    order: [['id', 'DESC']],
    limit: filters.page_size,
    offset: (filters.page - 1) * filters.page_size,
  });

  const related = await relatedFor(rows);
  return { items: rows.map((row) => withRelated(row, related)), page: filters.page, page_size: filters.page_size, total: count };
}

// Metadata. Dekhne ka haq na ho to 404. same_hash_count = us actor ko dikhne wale baaki documents jinki hash same hai.
async function get(id, actor) {
  const document = await Document.findByPk(id, { attributes: PUBLIC_ATTRIBUTES, include: [UPLOADER] });
  if (!document || !(await canSeeDocument(document, actor))) throw httpError(404, 'Document not found');

  const related = await relatedFor([document]);
  const result = withRelated(document, related);
  result.same_hash_count = document.hash
    ? await Document.count({ where: { [Op.and]: [await documentScope(actor), { hash: document.hash, id: { [Op.ne]: document.id } }] } })
    : 0;
  return result;
}

module.exports = { list, get };
