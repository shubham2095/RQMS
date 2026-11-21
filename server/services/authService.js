const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, EmployeeProfile } = require('../models');
const { jwtSecret, jwtExpiresIn } = require('../config/auth');
const { loadUserAccess } = require('./userAccessService');
const auditService = require('./auditService');
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
  if (!user) return failLogin(identifier, null, 'unknown user');

  const passwordOk = await bcrypt.compare(password, user.password_hash);
  if (!passwordOk) return failLogin(identifier, user, 'wrong password');

  const access = await loadUserAccess(user.id);
  if (!access) return failLogin(identifier, user, 'inactive account');

  const token = jwt.sign({ sub: user.id }, jwtSecret, { expiresIn: jwtExpiresIn });
  await auditService.log(access, 'login', user, `${access.email} logged in`);
  return { token, user: access };
}

// Failure audit karo (identifier + wajah; password kabhi nahi) aur wahi generic 401 do.
// Client ko wajah nahi dikhti (user enumeration nahi), sirf audit mein.
async function failLogin(identifier, user, reason) {
  await auditService.log(user ? { id: user.id } : null, 'login_failed', user, `Failed login attempt for "${identifier}"`, {
    identifier,
    reason,
  });
  throw httpError(401, INVALID_LOGIN);
}

async function getCurrentUser(userId) {
  const user = await loadUserAccess(userId);
  if (!user) throw httpError(401, 'Account not available');
  return user;
}

module.exports = { login, getCurrentUser };
