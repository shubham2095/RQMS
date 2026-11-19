const rateLimit = require('express-rate-limit');

// Login par sakht limit: 15 min mein 10 galat attempts per IP. Successful login count nahi hota.
// (Hostinger/proxy ke peeche deploy par `app.set('trust proxy', 1)` Phase 6 mein.)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
});

module.exports = loginLimiter;
