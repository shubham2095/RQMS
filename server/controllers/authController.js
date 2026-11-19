const authService = require('../services/authService');
const { parse } = require('../utils/validate');
const { loginSchema } = require('../validators/authValidator');

async function login(req, res, next) {
  try {
    const { email, password } = parse(loginSchema, req.body);
    const result = await authService.login(email, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

// Token client side discard hota hai; server par kuch store nahi.
function logout(req, res) {
  res.json({ ok: true });
}

module.exports = { login, me, logout };
