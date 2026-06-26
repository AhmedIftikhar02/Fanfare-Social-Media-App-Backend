// src/utils/notify.js

const createNotification = async (tx, { recipientId, senderId, type, postId, commentId }) => {
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