const { isSuperAdmin } = require('../services/userAccessService');
const httpError = require('../utils/httpError');

// Koi bhi ek role match ho to allow (any-of). super_admin hamesha allow. `auth` ke baad lagao.
function requireRole(...roleSlugs) {
  return function (req, res, next) {
    if (!req.user) return next(httpError(401, 'Authentication required'));
    if (isSuperAdmin(req.user)) return next();

    const allowed = req.user.roles.some((role) => roleSlugs.includes(role.slug));
    if (!allowed) return next(httpError(403, 'Forbidden'));
    next();
  };
}

module.exports = requireRole;
