const bcrypt = require('bcryptjs');
const { sequelize, User, Role, EmployeeProfile } = require('../models');
const { isSuperAdmin } = require('./userAccessService');
const httpError = require('../utils/httpError');
const { isUniqueError } = require('../utils/dbErrors');

const SUPER_ADMIN = 'super_admin';

const userInclude = [
  { model: Role, as: 'roles', through: { attributes: [] } },
  { model: EmployeeProfile, as: 'profile', attributes: ['employee_id'] },
];

function toSummary(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    is_active: user.is_active,
    employee_id: user.profile ? user.profile.employee_id : null,
    roles: user.roles.map((role) => ({ id: role.id, slug: role.slug, name: role.name })),
    created_at: user.createdAt, // model attribute createdAt hai (column created_at)
  };
}

async function findUserWithRoles(id) {
  const user = await User.findByPk(id, { include: userInclude });
  if (!user) throw httpError(404, 'User not found');
  return user;
}

async function listUsers() {
  const users = await User.findAll({ include: userInclude, order: [['id', 'ASC']] });
  return users.map(toSummary);
}

async function listRoles() {
  const roles = await Role.findAll({ order: [['id', 'ASC']] });
  return roles.map((role) => ({ id: role.id, slug: role.slug, name: role.name }));
}

async function findRolesBySlugs(slugs) {
  const unique = [...new Set(slugs)];
  const roles = await Role.findAll({ where: { slug: unique } });
  if (roles.length !== unique.length) throw httpError(400, 'One or more roles do not exist');
  return roles;
}

// Privilege escalation roko: users.manage wala (admin) super_admin role na de sake.
function assertCanAssign(actor, slugs) {
  if (slugs.includes(SUPER_ADMIN) && !isSuperAdmin(actor)) {
    throw httpError(403, 'Only a super admin can assign the super_admin role');
  }
}

async function createUser(actor, data) {
  assertCanAssign(actor, data.role_slugs);
  const roles = await findRolesBySlugs(data.role_slugs);
  const passwordHash = await bcrypt.hash(data.password, 10);

  try {
    const userId = await sequelize.transaction(async (transaction) => {
      const user = await User.create(
        { name: data.name, email: data.email, password_hash: passwordHash, is_active: data.is_active },
        { transaction }
      );
      await user.setRoles(roles, { transaction });
      return user.id;
    });
    return toSummary(await findUserWithRoles(userId));
  } catch (err) {
    if (isUniqueError(err)) throw httpError(409, 'A user with this email already exists');
    throw err;
  }
}

function sameSlugs(a, b) {
  return a.length === b.length && a.every((slug) => b.includes(slug));
}

async function updateUser(actor, id, data) {
  const user = await findUserWithRoles(id);
  const currentSlugs = user.roles.map((role) => role.slug);
  const isSelf = user.id === actor.id;

  // Super admin ko sirf super admin chheed sakta hai.
  if (currentSlugs.includes(SUPER_ADMIN) && !isSuperAdmin(actor)) {
    throw httpError(403, 'Only a super admin can modify a super admin');
  }
  if (data.role_slugs) assertCanAssign(actor, data.role_slugs);

  // Apne aap ko lock-out se bachao.
  if (isSelf && data.is_active === false) {
    throw httpError(400, 'You cannot deactivate your own account');
  }
  if (isSelf && data.role_slugs && !sameSlugs(data.role_slugs, currentSlugs)) {
    throw httpError(400, 'You cannot change your own roles');
  }

  const roles = data.role_slugs ? await findRolesBySlugs(data.role_slugs) : null;
  const changes = {};
  if (data.name !== undefined) changes.name = data.name;
  if (data.email !== undefined) changes.email = data.email;
  if (data.is_active !== undefined) changes.is_active = data.is_active;
  if (data.password !== undefined) changes.password_hash = await bcrypt.hash(data.password, 10);

  try {
    await sequelize.transaction(async (transaction) => {
      await user.update(changes, { transaction });
      if (roles) await user.setRoles(roles, { transaction });
    });
  } catch (err) {
    if (isUniqueError(err)) throw httpError(409, 'A user with this email already exists');
    throw err;
  }
  return toSummary(await findUserWithRoles(id));
}

module.exports = { listUsers, listRoles, createUser, updateUser };
