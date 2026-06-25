// src/app.js

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const config = require('./config');
const apiRoutes = require('./routes');
const sanitize = require('./middlewares/sanitize');
const { apiLimiter } = require('./middlewares/rateLimiter');
const notFoundHandler = require('./middlewares/notFoundHandler');
const errorHandler = require('./middlewares/errorHandler');
const requestLogger = require('./middlewares/requestLogger');

const app = express();

app.use(helmet());
app.use(cors({ origin: config.cors.origin }));
app.use(requestLogger);
app.use(express.json());
app.use(sanitize);

// ─── Serve Uploaded Media Statically ─────────────────────────────────────────
const POSTS_DIR = process.env.VERCEL
  ? '/tmp/uploads/posts'
  : path.join(process.cwd(), 'uploads', 'posts');

const STATUSES_DIR = process.env.VERCEL
  ? '/tmp/uploads/statuses'
  : path.join(process.cwd(), 'uploads', 'statuses');

const AVATARS_DIR = process.env.VERCEL
  ? '/tmp/uploads/avatars'
  : path.join(process.cwd(), 'uploads', 'avatars');

app.use('/uploads/posts', express.static(POSTS_DIR));
app.use('/uploads/statuses', express.static(STATUSES_DIR));
app.use('/uploads/avatars', express.static(AVATARS_DIR)); // ← ADDED
// ─────────────────────────────────────────────────────────────────────────────

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Backend Boilerplate API Docs',
}));

app.use('/api/v1', apiLimiter, apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;