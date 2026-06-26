// src/modules/messages/messages.routes.js

const express      = require('express');
const router       = express.Router();
const controller   = require('./messages.controller');
const authenticate = require('../../middlewares/authenticate');
const validate     = require('../../middlewares/validate');
const {
  uploadMessageMedia,
  processMessageFile,
} = require('../../middlewares/upload');
const {
  startConversationSchema,
  sendMessageSchema,
  getMessagesSchema,
  getConversationsSchema,
  conversationIdParamSchema,
  messageParamsSchema,
} = require('./messages.validation');

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: One-to-one direct messaging
 */

// ─── IMPORTANT: static routes must come before param routes ──────────────────

/**
 * @swagger
 * /messages/unread-count:
 *   get:
 *     summary: Total unread message count across all conversations (for nav badge)
 *     tags: [Messages]
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
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount: { type: integer, example: 5 }
 */
router.get('/unread-count', controller.getUnreadCount);

/**
 * @swagger
 * /messages/conversations:
 *   post:
 *     summary: Start or get existing conversation with a user (idempotent)
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: The other user's ID
 *     responses:
 *       200:
 *         description: Conversation (existing or newly created)
 *       400:
 *         description: Cannot message yourself
 *       403:
 *         description: Privacy rules prevent messaging
 *       404:
 *         description: User not found
 */
router.post(
  '/conversations',
  validate(startConversationSchema),
  controller.startConversation
);

/**
 * @swagger
 * /messages/conversations:
 *   get:
 *     summary: List all conversations (inbox), ordered by latest activity
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Conversation list with last message preview and unread count per conversation
 */
router.get(
  '/conversations',
  validate(getConversationsSchema, 'query'),
  controller.getConversations
);

/**
 * @swagger
 * /messages/conversations/{conversationId}:
 *   get:
 *     summary: Get a single conversation's details
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Conversation details
 *       403:
 *         description: Not a participant
 *       404:
 *         description: Not found
 */
router.get(
  '/conversations/:conversationId',
  validate(conversationIdParamSchema, 'params'),
  controller.getConversation
);

/**
 * @swagger
 * /messages/conversations/{conversationId}/messages:
 *   get:
 *     summary: Get paginated messages. Pass `after` param for polling (returns only new messages).
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 30 }
 *       - in: query
 *         name: after
 *         schema: { type: string, format: uuid }
 *         description: Last message ID the client has. Returns only newer messages (for polling).
 *     responses:
 *       200:
 *         description: Messages (oldest first). meta is null when `after` is used.
 *       403:
 *         description: Not a participant
 *       404:
 *         description: Conversation not found
 */
router.get(
  '/conversations/:conversationId/messages',
  validate(conversationIdParamSchema, 'params'),
  validate(getMessagesSchema, 'query'),
  controller.getMessages
);

/**
 * @swagger
 * /messages/conversations/{conversationId}/messages:
 *   post:
 *     summary: Send a message — text, image, video, or text+media combined
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 maxLength: 2000
 *                 description: Message text (optional if media provided)
 *               media:
 *                 type: string
 *                 format: binary
 *                 description: Image or video file (optional if text provided). Field name is "media".
 *     responses:
 *       201:
 *         description: Message sent
 *       400:
 *         description: No text or media provided, or file type/size invalid
 *       403:
 *         description: Not a participant or privacy changed
 *       404:
 *         description: Conversation not found
 */
router.post(
  '/conversations/:conversationId/messages',
  validate(conversationIdParamSchema, 'params'),
  uploadMessageMedia,      // multer — reads multipart, puts file in req.file
  processMessageFile,      // sharp/write — produces req.processedFiles[]
  validate(sendMessageSchema),
  controller.sendMessage
);

/**
 * @swagger
 * /messages/conversations/{conversationId}/read:
 *   put:
 *     summary: Mark all unread messages in conversation as read
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Returns count of messages marked as read
 */
router.put(
  '/conversations/:conversationId/read',
  validate(conversationIdParamSchema, 'params'),
  controller.markConversationRead
);

/**
 * @swagger
 * /messages/conversations/{conversationId}/messages/{messageId}:
 *   delete:
 *     summary: Soft-delete own message (shows as "This message was deleted" on client)
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Message soft-deleted
 *       400:
 *         description: Already deleted
 *       403:
 *         description: Not your message
 *       404:
 *         description: Message not found
 */
router.delete(
  '/conversations/:conversationId/messages/:messageId',
  validate(messageParamsSchema, 'params'),
  controller.deleteMessage
);

module.exports = router;