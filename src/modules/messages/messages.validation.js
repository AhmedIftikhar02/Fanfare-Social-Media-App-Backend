// src/modules/messages/messages.validation.js

const { z } = require('zod');

// POST /conversations
const startConversationSchema = z.object({
  userId: z.string().uuid('Invalid userId'),
});

// POST /conversations/:conversationId/messages
// text is optional only if a media file is also present — enforced in service
const sendMessageSchema = z.object({
  text: z
    .string()
    .min(1, 'Message text cannot be empty')
    .max(2000, 'Message text cannot exceed 2000 characters')
    .optional(),
});

// GET messages — pagination + optional `after` cursor for polling
const getMessagesSchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(30),
  after: z.string().uuid('Invalid after cursor').optional(), // last seen message ID
});

// GET conversations — pagination
const getConversationsSchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(30).default(20),
});

// Param: conversationId only
const conversationIdParamSchema = z.object({
  conversationId: z.string().uuid('Invalid conversationId'),
});

// Params: conversationId + messageId (for delete)
const messageParamsSchema = z.object({
  conversationId: z.string().uuid('Invalid conversationId'),
  messageId:      z.string().uuid('Invalid messageId'),
});

module.exports = {
  startConversationSchema,
  sendMessageSchema,
  getMessagesSchema,
  getConversationsSchema,
  conversationIdParamSchema,
  messageParamsSchema,
};