// Saare models yahin register + associate hote hain. Naye models (Phase 2+) yahin add karo.
const sequelize = require('../config/db');
const User = require('./User');
const Role = require('./Role');
const Permission = require('./Permission');

// User <-> Role  (role_user)
User.belongsToMany(Role, {
  through: 'role_user',
  as: 'roles',
  foreignKey: 'user_id',
  otherKey: 'role_id',
  timestamps: false,
});
Role.belongsToMany(User, {
  through: 'role_user',
  as: 'users',
  foreignKey: 'role_id',
  otherKey: 'user_id',
  timestamps: false,
});

// Role <-> Permission  (permission_role)
Role.belongsToMany(Permission, {
  through: 'permission_role',
  as: 'permissions',
  foreignKey: 'role_id',
  otherKey: 'permission_id',
  timestamps: false,
});
Permission.belongsToMany(Role, {
  through: 'permission_role',
  as: 'roles',
  foreignKey: 'permission_id',
  otherKey: 'role_id',
  timestamps: false,
});

module.exports = { sequelize, User, Role, Permission };
