// src/utils/mention.js

const MENTION_REGEX = /@([a-zA-Z0-9_.]+)/g;
const MAX_MENTIONS  = 10;

const extractMentionUsernames = (text) => {
  if (!text) return [];
  const matches = [...text.matchAll(MENTION_REGEX)];
  const unique  = [...new Set(matches.map((m) => m[1].toLowerCase()))];
  return unique.slice(0, MAX_MENTIONS);
};

const resolveUsernames = async (tx, usernames) => {
  if (usernames.length === 0) return [];
  return tx.user.findMany({
    where:  { username: { in: usernames, mode: 'insensitive' } },
    select: { id: true, username: true },
  });
};

const processMentions = async (tx, { text, senderId, postId, commentId }) => {
  const usernames = extractMentionUsernames(text);
  if (usernames.length === 0) return;

  const users = await resolveUsernames(tx, usernames);

  for (const user of users) {
    if (user.id === senderId) continue;

    await tx.notification.create({
      data: {
        recipientId: user.id,
        senderId,
        type:        'mention',
        postId:      postId    ?? null,
        commentId:   commentId ?? null,
        isRead:      false,
      },
    });
  }
};

module.exports = { processMentions, extractMentionUsernames };