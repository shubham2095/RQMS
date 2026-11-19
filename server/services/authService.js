const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { jwtSecret, jwtExpiresIn } = require('../config/auth');
const { loadUserAccess } = require('./userAccessService');
const httpError = require('../utils/httpError');

const INVALID_LOGIN = 'Invalid email or password';

// Login abhi sirf EMAIL se. Phase 2 mein employee_id se login yahan add hoga
// (employee_profiles table ke saath) — abhi nahi.
async function login(email, password) {
  const user = await User.scope('withPassword').findOne({ where: { email } });
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
