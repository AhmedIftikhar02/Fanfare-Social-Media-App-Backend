// src/utils/apiCache.js

const prisma = require('../database/prisma');

/**
 * Read a cache entry if it is fresher than `maxAgeSeconds`.
 *
 * @param {string} key           - Cache key (e.g. 'football_live')
 * @param {number} maxAgeSeconds - Maximum acceptable age in seconds
 * @returns {Promise<any|null>}  - Parsed JSON data or null if stale / missing
 */
const readCache = async (key, maxAgeSeconds) => {
  try {
    const entry = await prisma.apiCache.findUnique({
      where: { cacheKey: key },
    });

    if (!entry) return null;

    const ageMs    = Date.now() - new Date(entry.cachedAt).getTime();
    const ageSec   = ageMs / 1000;
    const isFresh  = ageSec < maxAgeSeconds;

    return isFresh ? entry.data : null;
  } catch {
    // If DB read fails, signal cache miss so we try the external API safely
    return null;
  }
};

/**
 * Write (upsert) a cache entry.
 *
 * @param {string} key  - Cache key
 * @param {any}    data - Data to cache (must be JSON-serialisable)
 * @returns {Promise<void>}
 */
const writeCache = async (key, data) => {
  try {
    await prisma.apiCache.upsert({
      where:  { cacheKey: key },
      create: { cacheKey: key, data, cachedAt: new Date() },
      update: { data,               cachedAt: new Date() },
    });
  } catch {
    // Silent — a failed cache write is not fatal; the caller already has the data
  }
};

/**
 * Read stale cache data regardless of age.
 * Used for graceful degradation when the external API is unavailable or quota is blown.
 *
 * @param {string} key
 * @returns {Promise<any|null>}
 */
const readStale = async (key) => {
  try {
    const entry = await prisma.apiCache.findUnique({
      where: { cacheKey: key },
    });
    return entry ? entry.data : null;
  } catch {
    return null;
  }
};

module.exports = { 
  readCache, 
  writeCache, 
  readStale 
};