const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, EmployeeProfile } = require('../models');
const { jwtSecret, jwtExpiresIn } = require('../config/auth');
const { loadUserAccess } = require('./userAccessService');
const httpError = require('../utils/httpError');

const INVALID_LOGIN = 'Invalid credentials';

// identifier me '@' ho to email, warna employee_id (employee ids me '@' allowed nahi — profileValidator).
async function findUserByIdentifier(identifier) {
  const withPassword = User.scope('withPassword');

  if (identifier.includes('@')) {
    return withPassword.findOne({ where: { email: identifier.toLowerCase() } });
  }

  const profile = await EmployeeProfile.findOne({ where: { employee_id: identifier } });
  if (!profile) return null;
  return withPassword.findByPk(profile.user_id);
}

// Login email YA employee_id se. Har failure par same generic 401.
async function login(identifier, password) {
  const user = await findUserByIdentifier(identifier);
  if (!user) throw httpError(401, INVALID_LOGIN);

  const passwordOk = await bcrypt.compare(password, user.password_hash);
  if (!passwordOk) throw httpError(401, INVALID_LOGIN);

  const access = await loadUserAccess(user.id);
  if (!access) throw httpError(401, INVALID_LOGIN); // inactive account

  const token = jwt.sign({ sub: user.id }, jwtSecret, { expiresIn: jwtExpiresIn });
  return { token, user: access };
}

async function getCurrentUser(userId) {
  const user = await loadUserAccess(userId);
  if (!user) throw httpError(401, 'Account not available');
  return user;
}

module.exports = { login, getCurrentUser };
