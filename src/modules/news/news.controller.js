// src/modules/news/news.controller.js

const newsService = require('./news.service');
const catchAsync  = require('../../utils/catchAsync');

// ─── GET /api/v1/news/latest ─────────────────────────────────────────────────
exports.getLatestNews = catchAsync(async (req, res) => {
  const { language, category } = req.query;

  // Uses sanitized strings directly from validation pipeline defaults
  const result = await newsService.getLatestNews({ 
    language: language || 'en', 
    category 
  });

  res.status(200).json({
    status: 'success',
    data:   result,
  });
});