const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/auth');
const { loadUserAccess } = require('../services/userAccessService');
const httpError = require('../utils/httpError');

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

// JWT verify -> DB se fresh user + roles + permissions -> req.user
async function auth(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) throw httpError(401, 'Authentication required');

    let payload;
    try {
      payload = jwt.verify(token, jwtSecret);
    } catch {
      throw httpError(401, 'Invalid or expired token');
    }

    const user = await loadUserAccess(payload.sub);
    if (!user) throw httpError(401, 'Account not available');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = auth;
