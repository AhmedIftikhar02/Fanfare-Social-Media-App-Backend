// src/modules/search/search.controller.js

const searchService = require('./search.service');
const catchAsync    = require('../../utils/catchAsync');

// ─── GET /api/v1/search/users?q=ahmed ────────────────────────────────────────
exports.searchUsers = catchAsync(async (req, res) => {
  const { q, page, limit } = req.query;

  const result = await searchService.searchUsers(
    q,
    req.user.id,
    Number(page)  || 1,
    Number(limit) || 20
  );

  res.status(200).json({ status: 'success', data: result });
});

// ─── GET /api/v1/search/posts?q=football ─────────────────────────────────────
exports.searchPosts = catchAsync(async (req, res) => {
  const { q, page, limit } = req.query;

  const result = await searchService.searchPosts(
    q,
    req.user.id,
    Number(page)  || 1,
    Number(limit) || 20
  );

  res.status(200).json({ status: 'success', data: result });
});

// ─── GET /api/v1/search/hashtags?q=travel ────────────────────────────────────
exports.searchHashtags = catchAsync(async (req, res) => {
  const { q, page, limit } = req.query;

  const result = await searchService.searchHashtags(
    q,
    Number(page)  || 1,
    Number(limit) || 20
  );

  res.status(200).json({ status: 'success', data: result });
});
