// src/utils/notify.js
//
// Thin helper that inserts a notification row inside a caller's transaction.
// Always pass the transaction object (tx), not the top-level prisma instance,
// so the insert is rolled back if the parent operation fails.
//
// RULE: never create a notification when recipientId === senderId.
// That check is enforced here so callers don't have to think about it.

/**
 * Create a notification row inside an existing Prisma transaction.
 *
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {object} opts
 * @param {string}  opts.recipientId  - Who receives the notification
 * @param {string}  opts.senderId     - Who triggered the action (may be same as recipient — handled below)
 * @param {string}  opts.type         - NotificationType enum value
 * @param {string} [opts.postId]      - Related post (optional)
 * @param {string} [opts.commentId]   - Related comment (optional)
 * @returns {Promise<void>}
 */
const createNotification = async (tx, { recipientId, senderId, type, postId, commentId }) => {
  // No self-notifications — silently return, do not throw
  if (recipientId === senderId) return;

  await tx.notification.create({
    data: {
      recipientId,
      senderId,
      type,
      postId:    postId    ?? null,
      commentId: commentId ?? null,
      isRead:    false,
    },
  });
};

module.exports = { createNotification };