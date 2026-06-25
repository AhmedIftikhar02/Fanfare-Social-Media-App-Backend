// src/modules/sports/sports.controller.js

const sportsService = require('./sports.service');
const catchAsync    = require('../../utils/catchAsync');

// ─── GET /api/v1/sports/football/live ────────────────────────────────────────
exports.getLiveMatches = catchAsync(async (req, res) => {
  const result = await sportsService.getLiveMatches();

  res.status(200).json({
    status: 'success',
    data:   result,
  });
});