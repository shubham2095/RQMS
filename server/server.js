require('./config/env');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const sequelize = require('./config/db');

const healthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// General limiter; login par alag, sakht limiter Phase 1 mein lagega.
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use('/api/health', healthRoutes);

// Unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Central error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

// DB down ho tab bhi server chalta hai (health check kaam kare); bas warning dikhao.
async function checkDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');
  } catch (err) {
    console.warn(`Database not reachable: ${err.message}`);
    console.warn('Run "npm run db:create" and "npm run db:migrate" from the project root.');
  }
}

app.listen(PORT, () => {
  console.log(`RQMS server running on http://localhost:${PORT}`);
  checkDatabase();
});
