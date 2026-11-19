// Models yahan register honge (Phase 1 se):
//   const User = require('./User');
//   const Role = require('./Role');
//   User.belongsToMany(Role, { through: 'role_user' });
const sequelize = require('../config/db');

const db = {
  sequelize,
};

module.exports = db;
