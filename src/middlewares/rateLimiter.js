const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'fail', message: 'Too many requests, please try again later' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
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
  max: 60,            
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status:  'fail',
    message: 'Too many requests to proxy endpoints, please slow down.',
  },
});

const pollLimiter = rateLimit({
  windowMs: 60 * 1000,         // 1 minute window
  max: 200,                    // 200 req/min per IP — covers batch status fetches
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Too many polling requests, please slow down.',
  },
});


module.exports = { 
  apiLimiter, 
  authLimiter, 
  proxyLimiter,
  pollLimiter 
};