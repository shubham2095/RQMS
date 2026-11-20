const { User, Role, Permission } = require('../models');

const SUPER_ADMIN = 'super_admin';

// User + uske roles + un roles ke saare permissions (unique slugs).
// Missing ya inactive user ke liye null.
async function loadUserAccess(userId) {
  const user = await User.findByPk(userId, {
    include: [
      {
        model: Role,
        as: 'roles',
        through: { attributes: [] },
        include: [{ model: Permission, as: 'permissions', through: { attributes: [] } }],
      },
    ],
  });
  if (!user || !user.is_active) return null;

  const permissions = new Set();
  user.roles.forEach((role) => {
    role.permissions.forEach((permission) => permissions.add(permission.slug));
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roles: user.roles.map((role) => ({ id: role.id, slug: role.slug, name: role.name })),
    permissions: [...permissions].sort(),
  };
}

function isSuperAdmin(user) {
  return user.roles.some((role) => role.slug === SUPER_ADMIN);
}

// Koi bhi ek permission ho to true (super_admin ke liye hamesha true). req.user par chalta hai.
function hasAnyPermission(user, ...slugs) {
  return isSuperAdmin(user) || user.permissions.some((slug) => slugs.includes(slug));
}

module.exports = { loadUserAccess, isSuperAdmin, hasAnyPermission };
