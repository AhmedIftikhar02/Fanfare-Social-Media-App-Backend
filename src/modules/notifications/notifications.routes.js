// src/modules/notifications/notifications.routes.js

const express      = require('express');
const router       = express.Router();
const authenticate = require('../../middlewares/authenticate');
const validate     = require('../../middlewares/validate');
const { apiLimiter } = require('../../middlewares/rateLimiter');
const controller   = require('./notifications.controller');
const {
  listNotificationsSchema,
  notificationIdSchema,
} = require('./notifications.validation');

// All notification routes require authentication
router.use(authenticate);
router.use(apiLimiter);

/**
 * @swagger
 * tags:
 *   - name: Notifications
 *     description: In-app notification system (no push — DB-stored, polled by client)
 */

/**
 * @swagger
 * /notifications/unread-count:
 *   get:
 *     summary: Get count of unread notifications
 *     description: >
 *       Lightweight endpoint. Poll this every 30–60 seconds from Android to update
 *       the nav bar badge count. Returns `{ count: N }`.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                       example: 5
 */
router.get('/unread-count', controller.getUnreadCount);

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: List notifications for the authenticated user
 *     description: >
 *       Returns paginated notifications newest-first. Each item includes
 *       the sender's username + avatar and (where applicable) the related
 *       post thumbnail or comment text. Call `PUT /notifications/read-all`
 *       when the user opens this screen.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 50
 *     responses:
 *       200:
 *         description: Paginated notification list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     notifications:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Notification'
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'
 */
router.get(
  '/',
  validate(listNotificationsSchema, 'query'),
  controller.listNotifications,
);

/**
 * @swagger
 * /notifications/read-all:
 *   put:
 *     summary: Mark all notifications as read
 *     description: >
 *       Call this when the user opens the Notifications screen. Returns
 *       `{ updated: N }` — how many rows were changed.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     updated:
 *                       type: integer
 *                       example: 3
 */
router.put('/read-all', controller.markAllRead);

/**
 * @swagger
 * /notifications/{id}/read:
 *   put:
 *     summary: Mark a single notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Notification marked as read (or already was read)
 *       404:
 *         description: Notification not found or not owned by user
 */
router.put(
  '/:id/read',
  validate(notificationIdSchema, 'params'),
  controller.markOneRead,
);

/**
 * @swagger
 * /notifications/{id}:
 *   delete:
 *     summary: Delete a single notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Notification deleted successfully
 *       404:
 *         description: Notification not found or not owned by user
 */
router.delete(
  '/:id',
  validate(notificationIdSchema, 'params'),
  controller.deleteNotification,
);

module.exports = router;