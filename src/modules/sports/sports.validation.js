// src/modules/sports/sports.validation.js

const { z } = require('zod');

// Optional query parameters to filter today's match blocks cleanly
const todayQuerySchema = z.object({
  league: z.coerce.number().int().positive().optional(), // e.g., 39 = Premier League
  season: z.coerce.number().int().min(2000).max(2100).optional(),
});

module.exports = { todayQuerySchema };