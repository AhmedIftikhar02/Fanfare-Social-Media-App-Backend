const xss = require('xss');

// Passwords and tokens must stay byte-exact — sanitizing them would
// silently mangle what the user actually typed for no security benefit.
const SKIP_FIELDS = new Set(['password', 'newPassword', 'token', 'refreshToken', 'accessToken']);

const sanitizeValue = (value, key) => {
  if (key && SKIP_FIELDS.has(key)) return value;

  if (typeof value === 'string') return xss(value.trim());
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item));

  if (value && typeof value === 'object') {
    Object.keys(value).forEach((k) => {
      value[k] = sanitizeValue(value[k], k);
    });
    return value;
  }

  return value;
};

const sanitize = (req, res, next) => {
  if (req.body && typeof req.body === 'object') sanitizeValue(req.body);
  if (req.query && typeof req.query === 'object') sanitizeValue(req.query);
  next();
};

module.exports = sanitize;