// src/modules/search/search.service.js

const prisma    = require('../../database/prisma');
const AppError  = require('../../utils/AppError');

// ─── 1. Search Users ──────────────────────────────────────────────────────────

/**
 * Search users by username or full name (case-insensitive ILIKE).
 * Excludes the requesting user from results.
 * Ordered by follower count descending (most popular first).
 *
 * @param {string} q           - Search term
 * @param {string} requesterId - ID of the authenticated user
 * @param {number} page        - Page number (1-based)
 * @param {number} limit       - Items per page
 */
exports.searchUsers = async (q, requesterId, page, limit) => {
  const term = q.trim();
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: {
        AND: [
          { id: { not: requesterId } },
          {
            OR: [
              { username: { contains: term, mode: 'insensitive' } },
              { fullName: { contains: term, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id:            true,
        username:      true,
        fullName:      true,
        avatarUrl:     true,
        isPrivate:     true,
        followerCount: true,
        bio:           true,
      },
      orderBy: { followerCount: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({
      where: {
        AND: [
          { id: { not: requesterId } },
          {
            OR: [
              { username: { contains: term, mode: 'insensitive' } },
              { fullName: { contains: term, mode: 'insensitive' } },
            ],
          },
        ],
      },
    }),
  ]);

  return {
    users,
    meta: {
      page,
      limit,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ─── 2. Search Posts (Full-Text) ──────────────────────────────────────────────

/**
 * Full-text search over post captions using PostgreSQL tsvector.
 * Only returns posts the requesting user has permission to see:
 * - public posts (always)
 * - followers-only posts where requester follows the author
 * - own posts
 *
 * @param {string} q           - Search term
 * @param {string} requesterId - ID of the authenticated user
 * @param {number} page        - Page number (1-based)
 * @param {number} limit       - Items per page
 */

exports.searchPosts = async (q, requesterId, page, limit) => {
  const term = q.trim();
  const skip = (page - 1) * limit;

  // We removed "::uuid" casts to let Prisma cleanly bind the parameters as strings/texts
  const posts = await prisma.$queryRaw`
    SELECT
      p.id,
      p.caption,
      p.privacy,
      p.like_count    AS "likeCount",
      p.comment_count AS "commentCount",
      p.created_at    AS "createdAt",
      u.id            AS "authorId",
      u.username      AS "authorUsername",
      u.full_name     AS "authorFullName",
      u.avatar_url    AS "authorAvatarUrl",
      (
        SELECT json_build_object(
          'mediaUrl',  pm.media_url,
          'mediaType', pm.media_type
        )
        FROM post_media pm
        WHERE pm.post_id = p.id
        ORDER BY pm.order ASC
        LIMIT 1
      ) AS "firstMedia",
      ts_rank(p.search_vector, plainto_tsquery('english', ${term})) AS rank
    FROM posts p
    JOIN users u ON u.id = p.user_id
    WHERE
      p.search_vector @@ plainto_tsquery('english', ${term})
      AND (
        p.privacy = 'public'
        OR p.user_id = ${requesterId}
        OR (
          p.privacy = 'followers'
          AND EXISTS (
            SELECT 1 FROM follows f
            WHERE f.follower_id  = ${requesterId}
              AND f.following_id = p.user_id
              AND f.status       = 'active'
          )
        )
      )
    ORDER BY rank DESC, p.created_at DESC
    LIMIT  ${limit}
    OFFSET ${skip}
  `;

  // Count query for pagination meta without explicit uuid casting
  const countResult = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS total
    FROM posts p
    WHERE
      p.search_vector @@ plainto_tsquery('english', ${term})
      AND (
        p.privacy = 'public'
        OR p.user_id = ${requesterId}
        OR (
          p.privacy = 'followers'
          AND EXISTS (
            SELECT 1 FROM follows f
            WHERE f.follower_id  = ${requesterId}
              AND f.following_id = p.user_id
              AND f.status       = 'active'
          )
        )
      )
  `;

  const total = countResult[0]?.total ?? 0;

  return {
    posts,
    meta: {
      page,
      limit,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ─── 3. Search Hashtags ───────────────────────────────────────────────────────

/**
 * Search hashtags by name prefix (ILIKE).
 * Returns hashtags ordered by postCount descending (trending first).
 *
 * @param {string} q     - Search term (without #)
 * @param {number} page  - Page number (1-based)
 * @param {number} limit - Items per page
 */
exports.searchHashtags = async (q, page, limit) => {
  const term = q.trim().replace(/^#/, ''); // strip leading # if user typed it
  const skip = (page - 1) * limit;

  if (term.length === 0) throw new AppError('Hashtag search query cannot be empty', 400);

  const [hashtags, total] = await Promise.all([
    prisma.hashtag.findMany({
      where: { name: { contains: term, mode: 'insensitive' } },
      select: {
        id:        true,
        name:      true,
        postCount: true,
      },
      orderBy: { postCount: 'desc' },
      skip,
      take: limit,
    }),
    prisma.hashtag.count({
      where: { name: { contains: term, mode: 'insensitive' } },
    }),
  ]);

  return {
    hashtags,
    meta: {
      page,
      limit,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ─── 4. Get Single Hashtag Metadata ──────────────────────────────────────────

/**
 * Returns metadata for a single hashtag by exact name.
 * Used for the hashtag screen header (name, postCount).
 *
 * @param {string} name - Hashtag name (without #, already lowercased)
 */
exports.getHashtag = async (name) => {
  const hashtag = await prisma.hashtag.findUnique({
    where:  { name },
    select: { id: true, name: true, postCount: true },
  });

  if (!hashtag) throw new AppError('Hashtag not found', 404);

  return { hashtag };
};

// ─── 5. Get Posts by Hashtag ──────────────────────────────────────────────────

/**
 * Returns all public posts tagged with the given hashtag.
 * Ordered by newest first.
 * Only public posts are returned (followers-only and only_me excluded).
 *
 * @param {string} name        - Hashtag name (without #, already lowercased)
 * @param {string} requesterId - ID of the authenticated user (for isLiked)
 * @param {number} page        - Page number (1-based)
 * @param {number} limit       - Items per page
 */
exports.getHashtagPosts = async (name, requesterId, page, limit) => {
  const skip = (page - 1) * limit;

  // Confirm hashtag exists first (gives a clean 404 vs empty array)
  const hashtag = await prisma.hashtag.findUnique({
    where:  { name },
    select: { id: true, name: true, postCount: true },
  });

  if (!hashtag) throw new AppError('Hashtag not found', 404);

  const [posts, totalItems] = await Promise.all([
    prisma.post.findMany({
      where: {
        privacy: 'public',
        hashtags: {
          some: { hashtagId: hashtag.id },
        },
      },
      select: {
        id:           true,
        caption:      true,
        privacy:      true,
        likeCount:    true,
        commentCount: true,
        shareCount:   true,
        isReel:       true,
        createdAt:    true,
        updatedAt:    true,
        user: {
          select: {
            id:        true,
            username:  true,
            fullName:  true,
            avatarUrl: true,
            isPrivate: true,
          },
        },
        media: {
          select: {
            id:        true,
            mediaUrl:  true,
            mediaType: true,
            order:     true,
          },
          orderBy: { order: 'asc' },
        },
        likes: {
          where:  { userId: requesterId },
          select: { userId: true },
        },
        // Include sharedFrom for completeness (shared posts can have hashtags in caption)
        sharedFrom: {
          select: {
            id:      true,
            caption: true,
            user: {
              select: {
                id:        true,
                username:  true,
                fullName:  true,
                avatarUrl: true,
              },
            },
            media: {
              select: { mediaUrl: true, mediaType: true, order: true },
              orderBy: { order: 'asc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.post.count({
      where: {
        privacy: 'public',
        hashtags: {
          some: { hashtagId: hashtag.id },
        },
      },
    }),
  ]);

  const formattedPosts = posts.map((post) => ({
    id:           post.id,
    caption:      post.caption,
    privacy:      post.privacy,
    likeCount:    post.likeCount,
    commentCount: post.commentCount,
    shareCount:   post.shareCount,
    isReel:       post.isReel,
    createdAt:    post.createdAt,
    updatedAt:    post.updatedAt,
    isLiked:      post.likes.length > 0,
    media: (post.media || []).map((m) => ({
      id:        m.id,
      mediaUrl:  m.mediaUrl,
      mediaType: m.mediaType,
      order:     m.order,
    })),
    user: {
      id:        post.user.id,
      username:  post.user.username,
      fullName:  post.user.fullName,
      avatarUrl: post.user.avatarUrl,
      isPrivate: post.user.isPrivate,
    },
    sharedFrom: post.sharedFrom
      ? {
          id:      post.sharedFrom.id,
          caption: post.sharedFrom.caption,
          user: {
            id:        post.sharedFrom.user.id,
            username:  post.sharedFrom.user.username,
            fullName:  post.sharedFrom.user.fullName,
            avatarUrl: post.sharedFrom.user.avatarUrl,
          },
          firstMedia: post.sharedFrom.media?.[0]
            ? {
                mediaUrl:  post.sharedFrom.media[0].mediaUrl,
                mediaType: post.sharedFrom.media[0].mediaType,
              }
            : null,
        }
      : null,
  }));

  return {
    hashtag: {
      id:        hashtag.id,
      name:      hashtag.name,
      postCount: hashtag.postCount,
    },
    posts:     formattedPosts,
    meta: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    },
  };
};