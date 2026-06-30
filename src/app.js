// src/app.js

const express      = require('express');
const helmet        = require('helmet');
const cors           = require('cors');
const swaggerUi      = require('swagger-ui-express');
const swaggerSpec    = require('./config/swagger');
const config          = require('./config');
const apiRoutes        = require('./routes');
const sanitize           = require('./middlewares/sanitize');
const { apiLimiter }      = require('./middlewares/rateLimiter');
const notFoundHandler      = require('./middlewares/notFoundHandler');
const errorHandler          = require('./middlewares/errorHandler');
const requestLogger          = require('./middlewares/requestLogger');
const { renderStatusPage }    = require('./views/statusPage');
const prisma                   = require('./database/prisma');

const app = express();

app.use(helmet());
app.use(cors({ origin: config.cors.origin }));
app.use(requestLogger);
app.use(express.json());
app.use(sanitize);

// ─── Root status page ─────────────────────────────────────────────────────────
app.get('/', async (req, res) => {
  let dbOk = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbOk = false;
  }
  res.status(200).send(renderStatusPage(process.env.NODE_ENV || 'production', dbOk));
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Fanfare API Docs',
}));

app.use('/api/v1', apiLimiter, apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;