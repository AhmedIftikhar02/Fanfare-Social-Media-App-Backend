const morgan = require('morgan');
const logger = require('../config/logger');
const config = require('../config');

const stream = {
  write: (message) => logger.http(message.trim()),
};

const format = config.nodeEnv === 'production' ? 'combined' : 'dev';

module.exports = morgan(format, { stream });