const { AsyncLocalStorage } = require('async_hooks');

// Har request ka ip + user-agent yahan rakha jata hai taaki auditService ko `req` services ke through
// pass na karni pade. server.js mein body parsers ke BAAD mount karo (stream events context kho sakte hain).
const storage = new AsyncLocalStorage();

function requestContext(req, res, next) {
  storage.run({ ip: req.ip || null, userAgent: req.headers['user-agent'] || null }, next);
}

// Abhi chalti request ka { ip, userAgent } (request ke bahar, jaise cron / seeder mein, undefined).
function currentRequest() {
  return storage.getStore();
}

module.exports = { requestContext, currentRequest };
