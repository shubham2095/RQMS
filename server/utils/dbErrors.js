// Sequelize unique-constraint error pehchanne ke liye (services 409 throw karte hain).
function isUniqueError(err) {
  return Boolean(err) && err.name === 'SequelizeUniqueConstraintError';
}

module.exports = { isUniqueError };
