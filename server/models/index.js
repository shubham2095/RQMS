// Saare models yahin register + associate hote hain. Naye models (Phase 2+) yahin add karo.
const sequelize = require('../config/db');
const User = require('./User');
const Role = require('./Role');
const Permission = require('./Permission');
const EmployeeProfile = require('./EmployeeProfile');
const FamilyMember = require('./FamilyMember');
const Quarter = require('./Quarter');

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

// User <-> EmployeeProfile (ek user ka ek profile)
User.hasOne(EmployeeProfile, { as: 'profile', foreignKey: 'user_id' });
EmployeeProfile.belongsTo(User, { as: 'user', foreignKey: 'user_id' });

// EmployeeProfile <-> FamilyMember
EmployeeProfile.hasMany(FamilyMember, { as: 'family_members', foreignKey: 'employee_profile_id' });
FamilyMember.belongsTo(EmployeeProfile, { as: 'profile', foreignKey: 'employee_profile_id' });

// Quarter -> current occupant (EmployeeProfile)
Quarter.belongsTo(EmployeeProfile, { as: 'current_occupant', foreignKey: 'current_occupant_id' });

module.exports = {
  sequelize,
  User,
  Role,
  Permission,
  EmployeeProfile,
  FamilyMember,
  Quarter,
};
