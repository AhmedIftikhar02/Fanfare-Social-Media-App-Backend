const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'fail', message: 'Too many requests, please try again later' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'fail', message: 'Too many attempts, please try again later' },
});

// ─── Proxy Limiter — For Sports & News Endpoints ─────────────────────────────
/**
 * Prevents a single mobile client session from hammering 
 * and exhausting the shared external API keys/quotas.
 */
const proxyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 20,             // 20 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status:  'fail',
    message: 'Too many requests to proxy endpoints, please slow down.',
  },
});

module.exports = { 
  apiLimiter, 
  authLimiter, 
  proxyLimiter 
};