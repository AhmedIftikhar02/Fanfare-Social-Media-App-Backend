// src/modules/search/search.controller.js

const searchService = require('./search.service');
const catchAsync    = require('../../utils/catchAsync');

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

exports.searchHashtags = catchAsync(async (req, res) => {
  const { q, page, limit } = req.query;
  const result = await searchService.searchHashtags(
    q,
    Number(page)  || 1,
    Number(limit) || 20
  );
  res.status(200).json({ status: 'success', data: result });
});

exports.getHashtag = catchAsync(async (req, res) => {
  const result = await searchService.getHashtag(req.params.name);
  res.status(200).json({ status: 'success', data: result });
});

exports.getHashtagPosts = catchAsync(async (req, res) => {
  const { page, limit } = req.query;

  const result = await searchService.getHashtagPosts(
    req.params.name,
    req.user.id,
    Number(page)  || 1,
    Number(limit) || 20
  );

  res.status(200).json({ status: 'success', data: result });
});

