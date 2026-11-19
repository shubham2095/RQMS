require('./env');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is missing in server/.env');
}

module.exports = {
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
};
