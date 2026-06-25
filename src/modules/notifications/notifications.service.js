// src/modules/notifications/notifications.service.js

const prisma   = require('../../database/prisma');
const AppError = require('../../utils/AppError');

// ─── Shared select shape for notification list ────────────────────────────────
// Returns enough data for the Android notification row:
//   - notification metadata (type, isRead, createdAt)
//   - sender's username + avatar (who triggered the action)
//   - post's first media thumbnail (for like/comment notifications)
//   - comment text snippet (for comment notifications)

const NOTIFICATION_SELECT = {
  id:        true,
  type:      true,
  isRead:    true,
  createdAt: true,
  sender: {
    select: {
      id:        true,
      username:  true,
      fullName:  true,
      avatarUrl: true,
    },
  },
  post: {
    select: {
      id:    true,
      media: {
        select:  { mediaUrl: true, mediaType: true },
        orderBy: { order: 'asc' }, // Fixed to match your exact media order model key
        take:    1,
      },
    },
  },
  comment: {
    select: {
      id:   true,
      text: true,
    },
  },
};

// ─── 1. List notifications (paginated) ───────────────────────────────────────

/**
 * Returns paginated notifications for the authenticated user, newest first.
 *
 * @param {string} recipientId - Authenticated user's id
 * @param {number} page        - 1-based page number
 * @param {number} limit       - Items per page (max 50)
 */
exports.listNotifications = async (recipientId, page, limit) => {
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where:   { recipientId },
      select:  NOTIFICATION_SELECT,
      orderBy: { createdAt: 'desc' },
      skip,
      take:    limit,
    }),
    prisma.notification.count({
      where: { recipientId },
    }),
  ]);

  // Flatten the post's media array to a single firstMedia object
  const shaped = notifications.map((n) => ({
    id:        n.id,
    type:      n.type,
    isRead:    n.isRead,
    createdAt: n.createdAt,
    sender:    n.sender ?? null,
    post:      n.post
      ? {
          id:         n.post.id,
          firstMedia: n.post.media?.[0] ?? null,
        }
      : null,
    comment: n.comment ?? null,
  }));

  return {
    notifications: shaped,
    meta: {
      page,
      limit,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ─── 2. Unread count ─────────────────────────────────────────────────────────

/**
 * Returns the count of unread notifications.
 * This is the cheap query polled by the Android nav bar badge.
 *
 * @param {string} recipientId
 * @returns {Promise<{ count: number }>}
 */
exports.getUnreadCount = async (recipientId) => {
  const count = await prisma.notification.count({
    where: { recipientId, isRead: false },
  });
  return { count };
};

// ─── 3. Mark all as read ─────────────────────────────────────────────────────

/**
 * Marks every unread notification for this user as read.
 * Used when user opens the notifications screen.
 *
 * @param {string} recipientId
 * @returns {Promise<{ updated: number }>}
 */
exports.markAllRead = async (recipientId) => {
  const { count } = await prisma.notification.updateMany({
    where: { recipientId, isRead: false },
    data:  { isRead: true },
  });
  return { updated: count };
};

// ─── 4. Mark single notification as read ─────────────────────────────────────

/**
 * Marks a single notification as read.
 * Throws 404 if notification doesn't exist or doesn't belong to the user.
 *
 * @param {string} notificationId
 * @param {string} recipientId
 */
exports.markOneRead = async (notificationId, recipientId) => {
  // Verify ownership before updating
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, recipientId },
    select: { id: true, isRead: true },
  });
  if (!notification) throw new AppError('Notification not found', 404);

  // If already read, return early without hitting the DB again
  if (notification.isRead) return { alreadyRead: true };

  await prisma.notification.update({
    where: { id: notificationId },
    data:  { isRead: true },
  });

  return { alreadyRead: false };
};

// ─── 5. Delete a notification ────────────────────────────────────────────────

/**
 * Deletes a single notification.
 * Throws 404 if it doesn't exist or doesn't belong to this user.
 *
 * @param {string} notificationId
 * @param {string} recipientId
 */
exports.deleteNotification = async (notificationId, recipientId) => {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, recipientId },
    select: { id: true },
  });
  if (!notification) throw new AppError('Notification not found', 404);

  await prisma.notification.delete({ where: { id: notificationId } });
};