// src/modules/messages/messages.service.js

const prisma   = require('../../database/prisma');
const AppError = require('../../utils/AppError');

// ─── Shared selector for a message ───────────────────────────────────────────
const MESSAGE_SELECT = {
  id:             true,
  conversationId: true,
  senderId:       true,
  text:           true,
  mediaUrl:       true,
  mediaType:      true,
  isRead:         true,
  deletedAt:      true,
  createdAt:      true,
  sender: {
    select: {
      id:        true,
      username:  true,
      fullName:  true,
      avatarUrl: true,
    },
  },
};

// ─── Shared selector for a conversation ──────────────────────────────────────
const CONVERSATION_SELECT = {
  id:             true,
  participantAId: true,
  participantBId: true,
  lastMessageId:  true,
  lastActivityAt: true,
  createdAt:      true,
  participantA: {
    select: { id: true, username: true, fullName: true, avatarUrl: true },
  },
  participantB: {
    select: { id: true, username: true, fullName: true, avatarUrl: true },
  },
  lastMessage: {
    select: MESSAGE_SELECT,
  },
};

// ─── Formatters ───────────────────────────────────────────────────────────────
const formatMessage = (msg) => ({
  ...msg,
  isDeleted: msg.deletedAt !== null,
});

const formatConversation = (conv, requesterId) => {
  const otherUser =
    conv.participantAId === requesterId ? conv.participantB : conv.participantA;

  return {
    ...conv,
    lastMessage: conv.lastMessage ? formatMessage(conv.lastMessage) : null,
    otherUser,
  };
};

// ─── 1. Start or get existing conversation ────────────────────────────────────
exports.startConversation = async (requesterId, targetUserId) => {
  if (requesterId === targetUserId) {
    throw new AppError('You cannot start a conversation with yourself', 400);
  }

  const targetUser = await prisma.user.findUnique({
    where:  { id: targetUserId },
    select: { id: true },
  });
  if (!targetUser) throw new AppError('User not found', 404);

  // Enforce participantA < participantB (lexicographic) to prevent duplicates
  const [participantAId, participantBId] =
    requesterId < targetUserId
      ? [requesterId, targetUserId]
      : [targetUserId, requesterId];

  const conversation = await prisma.conversation.upsert({
    where:  { participantAId_participantBId: { participantAId, participantBId } },
    create: { participantAId, participantBId },
    update: {},
    select: CONVERSATION_SELECT,
  });

  // Return { conversation: {...} } — controller sends this as data directly
  return { conversation: formatConversation(conversation, requesterId) };
};

// ─── 2. List conversations ────────────────────────────────────────────────────
exports.getConversations = async (requesterId, page, limit) => {
  const skip = (page - 1) * limit;

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where: {
        OR: [
          { participantAId: requesterId },
          { participantBId: requesterId },
        ],
      },
      select:  CONVERSATION_SELECT,
      orderBy: { lastActivityAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.conversation.count({
      where: {
        OR: [
          { participantAId: requesterId },
          { participantBId: requesterId },
        ],
      },
    }),
  ]);

  return {
    conversations: conversations.map((c) => formatConversation(c, requesterId)),
    meta: {
      page,
      limit,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ─── 3. Get single conversation ───────────────────────────────────────────────
exports.getConversation = async (requesterId, conversationId) => {
  const conversation = await prisma.conversation.findUnique({
    where:  { id: conversationId },
    select: CONVERSATION_SELECT,
  });

  if (!conversation) throw new AppError('Conversation not found', 404);

  const isParticipant =
    conversation.participantAId === requesterId ||
    conversation.participantBId === requesterId;

  if (!isParticipant) throw new AppError('Conversation not found', 404);

  return { conversation: formatConversation(conversation, requesterId) };
};

// ─── 4. Get messages ──────────────────────────────────────────────────────────
exports.getMessages = async (requesterId, conversationId, page, limit, after) => {
  // Verify membership
  const conversation = await prisma.conversation.findUnique({
    where:  { id: conversationId },
    select: { participantAId: true, participantBId: true },
  });

  if (!conversation) throw new AppError('Conversation not found', 404);

  const isParticipant =
    conversation.participantAId === requesterId ||
    conversation.participantBId === requesterId;

  if (!isParticipant) throw new AppError('Conversation not found', 404);

  // ── Cursor path: ?after=<messageId> ──────────────────────────────────────
  if (after) {
    // Look up the pivot message — if not found, fall back to regular page load
    // (do NOT throw — Android may send a stale cursor after conversation reset)
    const cursorMessage = await prisma.message.findFirst({
      where:  { id: after, conversationId },
      select: { createdAt: true },
    });

    if (cursorMessage) {
      const messages = await prisma.message.findMany({
        where: {
          conversationId,
          createdAt: { gt: cursorMessage.createdAt },
        },
        select:  MESSAGE_SELECT,
        orderBy: { createdAt: 'asc' },
        take:    limit,
      });

      return {
        messages: messages.map(formatMessage),
        meta: null,   // no pagination meta for cursor/polling responses
      };
    }
    // Cursor not found → fall through to offset path below
  }

  // ── Offset path: standard pagination ─────────────────────────────────────
  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where:   { conversationId },
      select:  MESSAGE_SELECT,
      orderBy: { createdAt: 'asc' },
      skip,
      take:    limit,
    }),
    prisma.message.count({ where: { conversationId } }),
  ]);

  return {
    messages: messages.map(formatMessage),
    meta: {
      page,
      limit,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ─── 5. Send a message ────────────────────────────────────────────────────────
exports.sendMessage = async (requesterId, conversationId, text, mediaFile) => {
  const conversation = await prisma.conversation.findUnique({
    where:  { id: conversationId },
    select: { id: true, participantAId: true, participantBId: true },
  });

  if (!conversation) throw new AppError('Conversation not found', 404);

  const isParticipant =
    conversation.participantAId === requesterId ||
    conversation.participantBId === requesterId;

  if (!isParticipant) throw new AppError('Conversation not found', 404);

  const hasText  = text && text.trim().length > 0;
  const hasMedia = !!mediaFile;

  if (!hasText && !hasMedia) {
    throw new AppError('Message must have text or media', 400);
  }

  const message = await prisma.$transaction(async (tx) => {
    const newMessage = await tx.message.create({
      data: {
        conversationId,
        senderId:  requesterId,
        text:      hasText ? text.trim() : null,
        mediaUrl:  mediaFile?.mediaUrl  ?? null,
        mediaType: mediaFile?.mediaType ?? null,
      },
      select: MESSAGE_SELECT,
    });

    await tx.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageId:  newMessage.id,
        lastActivityAt: newMessage.createdAt,
      },
    });

    return newMessage;
  });

  return { message: formatMessage(message) };
};

// ─── 6. Mark conversation as read ────────────────────────────────────────────
exports.markAsRead = async (requesterId, conversationId) => {
  const conversation = await prisma.conversation.findUnique({
    where:  { id: conversationId },
    select: { participantAId: true, participantBId: true },
  });

  if (!conversation) throw new AppError('Conversation not found', 404);

  const isParticipant =
    conversation.participantAId === requesterId ||
    conversation.participantBId === requesterId;

  if (!isParticipant) throw new AppError('Conversation not found', 404);

  const { count } = await prisma.message.updateMany({
    where: {
      conversationId,
      senderId: { not: requesterId },
      isRead:   false,
    },
    data: { isRead: true },
  });

  return { markedRead: count };
};

// ─── 7. Soft-delete a message ─────────────────────────────────────────────────
exports.deleteMessage = async (requesterId, conversationId, messageId) => {
  const message = await prisma.message.findUnique({
    where:  { id: messageId },
    select: { id: true, senderId: true, conversationId: true, deletedAt: true },
  });

  if (!message)                                    throw new AppError('Message not found', 404);
  if (message.conversationId !== conversationId)   throw new AppError('Message not found', 404);
  if (message.senderId !== requesterId)            throw new AppError('You can only delete your own messages', 403);
  if (message.deletedAt)                           throw new AppError('Message already deleted', 409);

  await prisma.message.update({
    where: { id: messageId },
    data:  { deletedAt: new Date(), text: null },
  });

  return { messageId };
};

// ─── 8. Total unread count across all conversations ───────────────────────────
exports.getUnreadCount = async (requesterId) => {
  const unreadCount = await prisma.message.count({
    where: {
      isRead:   false,
      senderId: { not: requesterId },
      conversation: {
        OR: [
          { participantAId: requesterId },
          { participantBId: requesterId },
        ],
      },
    },
  });

  return { unreadCount };
};