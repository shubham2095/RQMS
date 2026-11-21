const bcrypt = require('bcryptjs');
const { sequelize, User, Role, EmployeeProfile } = require('../models');
const { isSuperAdmin } = require('./userAccessService');
const auditService = require('./auditService');
const httpError = require('../utils/httpError');
const { isUniqueError } = require('../utils/dbErrors');

const SUPER_ADMIN = 'super_admin';

const userInclude = [
  { model: Role, as: 'roles', through: { attributes: [] } },
  { model: EmployeeProfile, as: 'profile', attributes: ['id', 'employee_id', 'grade_pay', 'is_gazetted'] },
];

function toSummary(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    is_active: user.is_active,
    employee_id: user.profile ? user.profile.employee_id : null,
    has_profile: Boolean(user.profile),
    grade_pay: user.profile ? user.profile.grade_pay : null,
    is_gazetted: user.profile ? user.profile.is_gazetted : null,
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
    const created = await sequelize.transaction(async (transaction) => {
      const user = await User.create(
        { name: data.name, email: data.email, password_hash: passwordHash, is_active: data.is_active },
        { transaction }
      );
      await user.setRoles(roles, { transaction });
      return user;
    });

    await auditService.log(actor, 'user.create', created, `User ${created.email} created`, {
      email: created.email,
      roles: data.role_slugs,
      is_active: data.is_active,
    });
    return toSummary(await findUserWithRoles(created.id));
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

  // Entitlement fields employee profile par jaate hain — profile na ho to saaf error
  const profileChanges = {};
  if (data.grade_pay !== undefined) profileChanges.grade_pay = data.grade_pay;
  if (data.is_gazetted !== undefined) profileChanges.is_gazetted = data.is_gazetted;
  if (Object.keys(profileChanges).length > 0 && !user.profile) {
    throw httpError(400, 'This user has not saved an employee profile yet, so grade pay / gazetted cannot be set');
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
      if (user.profile && Object.keys(profileChanges).length > 0) {
        await EmployeeProfile.update(profileChanges, { where: { id: user.profile.id }, transaction });
      }
    });
  } catch (err) {
    if (isUniqueError(err)) throw httpError(409, 'A user with this email already exists');
    throw err;
  }

  // Sirf field NAAM (password ka value kabhi nahi); role badle to naye role slugs bhi
  const changedFields = Object.keys(data).filter((key) => data[key] !== undefined);
  await auditService.log(actor, 'user.update', user, `User ${user.email} updated`, {
    changed: changedFields,
    roles: data.role_slugs,
  });
  return toSummary(await findUserWithRoles(id));
}

module.exports = { listUsers, listRoles, createUser, updateUser };
