// src/modules/sports/sports.service.js

const axios                                = require('axios');
const config                               = require('../../config');
const { readCache, writeCache, readStale } = require('../../utils/apiCache');

// ─── Constants ────────────────────────────────────────────────────────────────
const LIVE_CACHE_KEY    = 'football_live';
const LIVE_TTL_SECONDS  = 60;          // 1 minute — live scores change fast
const MAX_LIVE_MATCHES  = 20;

const RAPIDAPI_HEADERS = {
  'x-rapidapi-key':  config.rapidapi.key,
  'x-rapidapi-host': config.rapidapi.host,
};

const BASE_URL = `https://${config.rapidapi.host}`;

// ─── Helper: Shape Free API structure safely for Android UI ──────────────────
const formatMatch = (m) => {
  if (!m) return null;

  return {
    id:       m.id || m.match_id || null,
    status:   m.status || m.match_status || 'LIVE', 
    elapsed:  m.elapsed || m.match_time || m.time || null,
    date:     m.date || m.match_date || null,
    venue:    m.venue || m.stadium || null,
    league: {
      id:   m.league_id || null,
      name: m.league_name || 'International / Tournament',
      logo: m.league_logo || null,
      round: m.round || m.match_round || null,
    },
    home: {
      id:     m.home_id || m.team_home_id || null,
      name:   m.home_name || m.team_home || 'Home Team',
      logo:   m.home_logo || m.team_home_logo || null,
      goals:  Number(m.home_score ?? m.goals_home ?? m.team_home_score ?? 0),
    },
    away: {
      id:     m.away_id || m.team_away_id || null,
      name:   m.away_name || m.team_away || 'Away Team',
      logo:   m.away_logo || m.team_away_logo || null,
      goals:  Number(m.away_score ?? m.goals_away ?? m.team_away_score ?? 0),
    },
  };
};

// ─── Live Matches Engine (Targeting data.response.live) ──────────────────────
exports.getLiveMatches = async () => {
  const cached = await readCache(LIVE_CACHE_KEY, LIVE_TTL_SECONDS);
  if (cached) {
    return { ...cached, fromCache: true };
  }

  try {
    const { data } = await axios.get(`${BASE_URL}/football-current-live`, {
      headers: { ...RAPIDAPI_HEADERS },
      timeout: 8000,
    });

    // Match strictly with Postman verified structure: data.response.live
    const rawMatches = data?.response?.live || data?.live || [];
    const targetArray = Array.isArray(rawMatches) ? rawMatches : [];

    const matches = targetArray
      .slice(0, MAX_LIVE_MATCHES)
      .map(formatMatch)
      .filter(Boolean);

    const payload = {
      matches,
      total:     matches.length,
      fetchedAt: new Date().toISOString(),
      fromCache: false,
    };

    await writeCache(LIVE_CACHE_KEY, payload);
    return payload;
  } catch (err) {
    console.error("🔴 SPORTS API LIVE ERROR:", {
      message: err.message,
      status: err.response?.status,
      responseData: err.response?.data
    });

    const stale = await readStale(LIVE_CACHE_KEY);
    if (stale) return { ...stale, fromCache: true, stale: true };

    return { 
      matches: [], 
      total: 0, 
      fetchedAt: null, 
      fromCache: false, 
      error: `External Sports API layer temporarily unavailable: ${err.message}` 
    };
  }
};