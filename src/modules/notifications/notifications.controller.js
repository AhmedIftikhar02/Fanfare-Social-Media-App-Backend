// src/modules/notifications/notifications.controller.js

const notificationsService = require('./notifications.service');
const catchAsync           = require('../../utils/catchAsync');

// ─── GET /api/v1/notifications ────────────────────────────────────────────────
exports.listNotifications = catchAsync(async (req, res) => {
  const page  = Number(req.query.page)  || 1;
  const limit = Number(req.query.limit) || 20;

  const result = await notificationsService.listNotifications(req.user.id, page, limit);

  res.status(200).json({ status: 'success', data: result });
});

// ─── GET /api/v1/notifications/unread-count ───────────────────────────────────
exports.getUnreadCount = catchAsync(async (req, res) => {
  const result = await notificationsService.getUnreadCount(req.user.id);

  res.status(200).json({ status: 'success', data: result });
});

// ─── PUT /api/v1/notifications/read-all ──────────────────────────────────────
exports.markAllRead = catchAsync(async (req, res) => {
  const result = await notificationsService.markAllRead(req.user.id);

  res.status(200).json({ status: 'success', data: result });
});

// ─── PUT /api/v1/notifications/:id/read ──────────────────────────────────────
exports.markOneRead = catchAsync(async (req, res) => {
  const result = await notificationsService.markOneRead(req.params.id, req.user.id);

  res.status(200).json({ status: 'success', data: result });
});

// ─── DELETE /api/v1/notifications/:id ────────────────────────────────────────
exports.deleteNotification = catchAsync(async (req, res) => {
  await notificationsService.deleteNotification(req.params.id, req.user.id);

  res.status(204).send();
});