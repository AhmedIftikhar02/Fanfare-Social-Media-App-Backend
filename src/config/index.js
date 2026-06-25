require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  },
  // ─── Sports & News Proxy Credentials ───────────────────────────────────────
  rapidapi: {
    key:  process.env.RAPIDAPI_KEY  || '',
    host: process.env.RAPIDAPI_HOST || 'free-api-live-football-data.p.rapidapi.com',
  },
  currents: {
    key: process.env.CURRENTS_API_KEY || '',
  },
};