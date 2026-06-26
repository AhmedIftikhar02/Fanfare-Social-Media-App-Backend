// src/modules/messages/messages.controller.js

const messagesService = require('./messages.service');
const catchAsync      = require('../../utils/catchAsync');

// ─── POST /conversations ──────────────────────────────────────────────────────
// Start or get existing conversation (idempotent)
const startConversation = catchAsync(async (req, res) => {
  // Service returns { conversation: { ... } } — unwrap one level
  const result = await messagesService.startConversation(
    req.user.id,
    req.body.userId
  );
  // result is already { conversation: {...} } — send it directly
  res.status(200).json({ status: 'success', data: result });
});

// ─── GET /conversations ───────────────────────────────────────────────────────
// List all conversations (inbox)
const getConversations = catchAsync(async (req, res) => {
  // Extract page and limit as numbers before passing to service
  const page  = parseInt(req.query.page,  10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;

  const result = await messagesService.getConversations(req.user.id, page, limit);
  res.status(200).json({ status: 'success', data: result });
});

// ─── GET /conversations/:conversationId ───────────────────────────────────────
// Single conversation detail
const getConversation = catchAsync(async (req, res) => {
  // Correct arg order: service signature is (requesterId, conversationId)
  const result = await messagesService.getConversation(
    req.user.id,                       // ← requesterId FIRST
    req.params.conversationId          // ← conversationId SECOND
  );
  res.status(200).json({ status: 'success', data: result });
});

// ─── GET /conversations/:conversationId/messages ──────────────────────────────
// Paginated messages — supports ?after= cursor for polling
const getMessages = catchAsync(async (req, res) => {
  const page  = parseInt(req.query.page,  10) || 1;
  const limit = parseInt(req.query.limit, 10) || 30;
  const after = req.query.after || null;

  // Correct arg order: service signature is (requesterId, conversationId, page, limit, after)
  const result = await messagesService.getMessages(
    req.user.id,                       // ← requesterId FIRST
    req.params.conversationId,         // ← conversationId SECOND
    page,
    limit,
    after
  );
  res.status(200).json({ status: 'success', data: result });
});

// ─── POST /conversations/:conversationId/messages ─────────────────────────────
// Send a message — text, image, video, or text + media combined
const sendMessage = catchAsync(async (req, res) => {
  // req.processedFiles is set by processMessageFile middleware
  const mediaFile = req.processedFiles && req.processedFiles.length > 0
    ? req.processedFiles[0]
    : null;

  // Correct arg order: service signature is (requesterId, conversationId, text, mediaFile)
  const result = await messagesService.sendMessage(
    req.user.id,                       // ← requesterId FIRST
    req.params.conversationId,         // ← conversationId SECOND
    req.body.text  || null,
    mediaFile
  );
  res.status(201).json({ status: 'success', data: result });
});

// ─── PUT /conversations/:conversationId/read ──────────────────────────────────
// Mark all unread messages in conversation as read
const markConversationRead = catchAsync(async (req, res) => {
  const result = await messagesService.markAsRead(
    req.user.id,
    req.params.conversationId
  );
  res.status(200).json({ status: 'success', data: result });
});

// ─── DELETE /conversations/:conversationId/messages/:messageId ────────────────
// Soft-delete own message
const deleteMessage = catchAsync(async (req, res) => {
  const result = await messagesService.deleteMessage(
    req.user.id,
    req.params.conversationId,
    req.params.messageId
  );
  res.status(200).json({ status: 'success', data: result });
});

// ─── GET /unread-count ────────────────────────────────────────────────────────
// Total unread count across all conversations (for nav badge)
const getUnreadCount = catchAsync(async (req, res) => {
  const result = await messagesService.getUnreadCount(req.user.id);
  res.status(200).json({ status: 'success', data: result });
});

module.exports = {
  startConversation,
  getConversations,
  getConversation,
  getMessages,
  sendMessage,
  markConversationRead,
  deleteMessage,
  getUnreadCount,
};