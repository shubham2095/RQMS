// Saare models yahin register + associate hote hain. Naye models (Phase 2+) yahin add karo.
const sequelize = require('../config/db');
const User = require('./User');
const Role = require('./Role');
const Permission = require('./Permission');
const EmployeeProfile = require('./EmployeeProfile');
const FamilyMember = require('./FamilyMember');
const Quarter = require('./Quarter');
const QuarterApplication = require('./QuarterApplication');
const WaitingListEntry = require('./WaitingListEntry');
const Allotment = require('./Allotment');
const Occupancy = require('./Occupancy');
const Document = require('./Document');
const Certificate = require('./Certificate');
const VacationRequest = require('./VacationRequest');
const VacationClearance = require('./VacationClearance');
const RetirementRecord = require('./RetirementRecord');
const AuditLog = require('./AuditLog');
const NotificationLog = require('./NotificationLog');

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

// ---- Phase 3: allotment flow ----

// QuarterApplication
EmployeeProfile.hasMany(QuarterApplication, { as: 'applications', foreignKey: 'employee_profile_id' });
QuarterApplication.belongsTo(EmployeeProfile, { as: 'employee', foreignKey: 'employee_profile_id' });
QuarterApplication.belongsTo(User, { as: 'verifier', foreignKey: 'verified_by' });
QuarterApplication.belongsTo(User, { as: 'decider', foreignKey: 'decided_by' });
QuarterApplication.hasOne(WaitingListEntry, { as: 'waiting_entry', foreignKey: 'quarter_application_id' });
WaitingListEntry.belongsTo(QuarterApplication, { as: 'application', foreignKey: 'quarter_application_id' });

// Allotment
Allotment.belongsTo(Quarter, { as: 'quarter', foreignKey: 'quarter_id' });
Quarter.hasMany(Allotment, { as: 'allotments', foreignKey: 'quarter_id' });
Allotment.belongsTo(QuarterApplication, { as: 'application', foreignKey: 'quarter_application_id' });
QuarterApplication.hasMany(Allotment, { as: 'allotments', foreignKey: 'quarter_application_id' });
Allotment.belongsTo(EmployeeProfile, { as: 'employee', foreignKey: 'employee_profile_id' });
EmployeeProfile.hasMany(Allotment, { as: 'allotments', foreignKey: 'employee_profile_id' });
Allotment.belongsTo(User, { as: 'approver', foreignKey: 'approved_by' });

// Occupancy
Occupancy.belongsTo(Quarter, { as: 'quarter', foreignKey: 'quarter_id' });
Occupancy.belongsTo(Allotment, { as: 'allotment', foreignKey: 'allotment_id' });
Occupancy.belongsTo(EmployeeProfile, { as: 'employee', foreignKey: 'employee_profile_id' });

// Polymorphic: documents (QuarterApplication) aur certificates (Allotment).
// constraints:false — DB FK nahi, type + id se judte hain.
QuarterApplication.hasMany(Document, {
  as: 'documents',
  foreignKey: 'documentable_id',
  constraints: false,
  scope: { documentable_type: 'QuarterApplication' },
});
Allotment.hasMany(Certificate, {
  as: 'certificates',
  foreignKey: 'certifiable_id',
  constraints: false,
  scope: { certifiable_type: 'Allotment' },
});

// ---- Phase 4: vacation flow ----

VacationRequest.belongsTo(Allotment, { as: 'allotment', foreignKey: 'allotment_id' });
Allotment.hasMany(VacationRequest, { as: 'vacation_requests', foreignKey: 'allotment_id' });
VacationRequest.belongsTo(Quarter, { as: 'quarter', foreignKey: 'quarter_id' });
VacationRequest.belongsTo(EmployeeProfile, { as: 'employee', foreignKey: 'employee_profile_id' });
EmployeeProfile.hasMany(VacationRequest, { as: 'vacation_requests', foreignKey: 'employee_profile_id' });

VacationRequest.hasMany(VacationClearance, { as: 'clearances', foreignKey: 'vacation_request_id' });
VacationClearance.belongsTo(VacationRequest, { as: 'request', foreignKey: 'vacation_request_id' });
VacationClearance.belongsTo(User, { as: 'handler', foreignKey: 'handled_by' });

// Polymorphic: certificates (VacationRequest) — Phase 3 ke Allotment certificates jaisa
VacationRequest.hasMany(Certificate, {
  as: 'certificates',
  foreignKey: 'certifiable_id',
  constraints: false,
  scope: { certifiable_type: 'VacationRequest' },
});

// ---- Phase 5a: retirement, audit, notifications ----

RetirementRecord.belongsTo(EmployeeProfile, { as: 'employee', foreignKey: 'employee_profile_id' });
EmployeeProfile.hasMany(RetirementRecord, { as: 'retirement_records', foreignKey: 'employee_profile_id' });
RetirementRecord.belongsTo(Allotment, { as: 'allotment', foreignKey: 'allotment_id' });

AuditLog.belongsTo(User, { as: 'user', foreignKey: 'user_id' });
NotificationLog.belongsTo(User, { as: 'user', foreignKey: 'user_id' });

module.exports = {
  sequelize,
  User,
  Role,
  Permission,
  EmployeeProfile,
  FamilyMember,
  Quarter,
  QuarterApplication,
  WaitingListEntry,
  Allotment,
  Occupancy,
  Document,
  Certificate,
  VacationRequest,
  VacationClearance,
  RetirementRecord,
  AuditLog,
  NotificationLog,
};
