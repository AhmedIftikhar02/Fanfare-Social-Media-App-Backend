// src/modules/statuses/statuses.controller.js

const statusesService = require('./statuses.service');
const catchAsync      = require('../../utils/catchAsync');
const httpStatus      = require('http-status');

// ─── POST /api/v1/statuses ────────────────────────────────────────────────────
exports.createStatus = catchAsync(async (req, res) => {
  // req.processedFiles is set by processStatusFile middleware
  // Single file upload → take index 0 safely
  const processedFile = req.processedFiles?.[0] ?? null;

  const data = await statusesService.createStatus(
    req.user.id,
    req.body,
    processedFile
  );

  res.status(httpStatus.CREATED || 201).json({
    status: 'success',
    message: 'Story posted',
    data,
  });
});

// ─── GET /api/v1/statuses/feed ────────────────────────────────────────────────
exports.getStatusFeed = catchAsync(async (req, res) => {
  const data = await statusesService.getStatusFeed(req.user.id);

  res.status(httpStatus.OK || 200).json({
    status: 'success',
    data,
  });
});

// ─── GET /api/v1/statuses/:statusId ──────────────────────────────────────────
exports.viewStatus = catchAsync(async (req, res) => {
  const data = await statusesService.viewStatus(
    req.params.statusId,
    req.user.id
  );

  res.status(httpStatus.OK || 200).json({
    status: 'success',
    data,
  });
});

// ─── GET /api/v1/statuses/:statusId/viewers ──────────────────────────────────
exports.getStatusViewers = catchAsync(async (req, res) => {
  const data = await statusesService.getStatusViewers(
    req.params.statusId,
    req.user.id,
    req.query
  );

  res.status(httpStatus.OK || 200).json({
    status: 'success',
    data,
  });
});

// ─── DELETE /api/v1/statuses/:statusId ───────────────────────────────────────
exports.deleteStatus = catchAsync(async (req, res) => {
  await statusesService.deleteStatus(req.params.statusId, req.user.id);

  // standard structural compliance across endpoints
  res.status(httpStatus.OK || 200).json({
    status: 'success',
    message: 'Story deleted',
  });
});