// src/modules/notifications/notifications.validation.js

const { z } = require('zod');

// GET /notifications — pagination
const listNotificationsSchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// PUT /notifications/:id/read  &  DELETE /notifications/:id
const notificationIdSchema = z.object({
  id: z.string().uuid('Invalid notification ID'),
});

module.exports = {
  listNotificationsSchema,
  notificationIdSchema,
};