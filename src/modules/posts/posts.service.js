const prisma = require('../../database/prisma');
const AppError = require('../../utils/AppError');
const { deletePostFile } = require('../../middlewares/upload');
const { getPagination, buildPaginationMeta } = require('../../utils/paginate');
const { processMentions } = require('../../utils/mention');
const { createNotification } = require('../../utils/notify');


const parseHashtags = (caption) => {
  if (!caption) return [];
  const matches = caption.match(/#([a-zA-Z0-9_]+)/g) || [];
  return [...new Set(matches.map((t) => t.slice(1).toLowerCase()))];
};

const linkHashtagsToPost = async (tx, postId, caption) => {
  const names = parseHashtags(caption);
  if (names.length === 0) return;

  for (const name of names) {
    // Upsert hashtag (create if not exists, get id either way)
    const hashtag = await tx.hashtag.upsert({
      where:  { name },
      create: { name, postCount: 1 },
      update: { postCount: { increment: 1 } },
    });

    // Link post ↔ hashtag (ignore duplicate if post already linked)
    await tx.postHashtag.upsert({
      where:  { postId_hashtagId: { postId, hashtagId: hashtag.id } },
      create: { postId, hashtagId: hashtag.id },
      update: {},
    });
  }
};

const formatPost = (post, requesterId) => ({
  id:           post.id,
  caption:      post.caption,
  privacy:      post.privacy,
  likeCount:    post.likeCount,
  commentCount: post.commentCount,
  shareCount:   post.shareCount,
  isReel:       post.isReel,   
  createdAt:    post.createdAt,
  updatedAt:    post.updatedAt,
  isLiked: post.likes ? post.likes.some((l) => l.userId === requesterId) : false,
  media: (post.media || [])
    .sort((a, b) => a.order - b.order)
    .map((m) => ({
      id:        m.id,
      mediaUrl:  m.mediaUrl,
      mediaType: m.mediaType,
      order:     m.order,
    })),
  user: post.user
    ? {
        id:        post.user.id,
        username:  post.user.username,
        fullName:  post.user.fullName,
        avatarUrl: post.user.avatarUrl,
        isPrivate: post.user.isPrivate,
      }
    : undefined,
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
        firstMedia: post.sharedFrom.media && post.sharedFrom.media.length > 0
          ? {
              mediaUrl:  post.sharedFrom.media[0].mediaUrl,
              mediaType: post.sharedFrom.media[0].mediaType,
            }
          : null,
      }
    : null,
});

const POST_SELECT = {
  id:           true,
  caption:      true,
  privacy:      true,
  likeCount:    true,
  commentCount: true,
  shareCount:   true,  
  isReel:       true,   
  sharedFromId: true,  
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
    select: { userId: true },
  },
  sharedFrom: {
    select: {
      id:      true,
      caption: true,
      privacy: true,
      user: {
        select: {
          id:        true,
          username:  true,
          fullName:  true,
          avatarUrl: true,
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
        take: 1, // Only first media for preview in share card
      },
    },
  },
};

// ─── Create Post ──────────────────────────────────────────────────────────────
exports.createPost = async (userId, body, processedFiles) => {
  if (!processedFiles || processedFiles.length === 0) {
    throw new AppError('At least one image or video is required', 400);
  }

  const { caption, privacy = 'public' } = body;

  const post = await prisma.$transaction(async (tx) => {
    const newPost = await tx.post.create({
      data: {
        userId,
        caption: caption || null,
        privacy,
        media: {
          create: processedFiles.map((f) => ({
            filename: f.filename,
            mediaUrl: f.mediaUrl,
            mediaType: f.mediaType,
            order: f.order,
          })),
        },
      },
      select: POST_SELECT,
    });

    // Update post count on user
    await tx.user.update({
      where: { id: userId },
      data: { postCount: { increment: 1 } },
    });

    await linkHashtagsToPost(tx, newPost.id, caption);
    await processMentions(tx, {
      text:     caption,
      senderId: userId,
      postId:   newPost.id,
    });


    return newPost;
  });

  return formatPost(post, userId);
};


// ─── Create Reel ──────────────────────────────────────────────────────────────
exports.createReel = async (userId, body, reelFile) => {
  if (!reelFile) {
    throw new AppError('A video file is required for reels', 400);
  }

  const { caption, privacy = 'public' } = body;

  const post = await prisma.$transaction(async (tx) => {
    const newPost = await tx.post.create({
      data: {
        userId,
        caption: caption || null,
        privacy,
        isReel:  true,   // ← flag this as a reel
        media: {
          create: [{
            filename:  reelFile.filename,
            mediaUrl:  reelFile.mediaUrl,
            mediaType: 'video',
            order:     0,
          }],
        },
      },
      select: POST_SELECT,
    });

    // Increment user post count
    await tx.user.update({
      where: { id: userId },
      data:  { postCount: { increment: 1 } },
    });

    // Link hashtags from caption (reuse existing helper)
    await linkHashtagsToPost(tx, newPost.id, caption);
    await processMentions(tx, {
      text:     caption,
      senderId: userId,
      postId:   newPost.id,
    });

    return newPost;
  });

  return formatPost(post, userId);
};




// ─── Get Feed ─────────────────────────────────────────────────────────────────
exports.getFeed = async (requesterId, rawQuery) => {
  const { page, limit, skip } = getPagination(rawQuery);

  // Get IDs of users the requester actively follows
  const following = await prisma.follow.findMany({
    where: { followerId: requesterId, status: 'active' },
    select: { followingId: true },
  });
  const followingIds = following.map((f) => f.followingId);

  // Feed: posts from followed users (public or followers-only) UNION public posts from others
  const [posts, totalItems] = await Promise.all([
    prisma.post.findMany({
      where: {
        OR: [
          {
            userId: { in: followingIds },
            privacy: { in: ['public', 'followers'] },
          },
          {
            privacy: 'public',
          },
        ],
      },
      select: POST_SELECT,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.post.count({
      where: {
        OR: [
          { userId: { in: followingIds }, privacy: { in: ['public', 'followers'] } },
          { privacy: 'public' },
        ],
      },
    }),
  ]);

  return {
    posts: posts.map((p) => formatPost(p, requesterId)),
    meta: buildPaginationMeta(page, limit, totalItems),
  };
};

// ─── Get Explore (public posts grid) ─────────────────────────────────────────
exports.getExplore = async (requesterId, rawQuery) => {
  const { page, limit, skip } = getPagination(rawQuery);

  const [posts, totalItems] = await Promise.all([
    prisma.post.findMany({
      where: { privacy: 'public' },
      select: POST_SELECT,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.post.count({ where: { privacy: 'public' } }),
  ]);

  return {
    posts: posts.map((p) => formatPost(p, requesterId)),
    meta: buildPaginationMeta(page, limit, totalItems),
  };
};

// ─── Get Reel Feed (public reels, newest first) ───────────────────────────────
exports.getReelFeed = async (requesterId, rawQuery) => {
  const { page, limit, skip } = getPagination(rawQuery);

  const [posts, totalItems] = await Promise.all([
    prisma.post.findMany({
      where: {
        isReel:  true,
        privacy: 'public',
      },
      select:  POST_SELECT,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.post.count({
      where: { isReel: true, privacy: 'public' },
    }),
  ]);

  return {
    reels: posts.map((p) => formatPost(p, requesterId)),
    meta:  buildPaginationMeta(page, limit, totalItems),
  };
};

// ─── Get Single Post ──────────────────────────────────────────────────────────
exports.getPost = async (postId, requesterId) => {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: POST_SELECT,
  });

  if (!post) throw new AppError('Post not found', 404);

  if (post.privacy === 'only_me' && post.user.id !== requesterId) {
    throw new AppError('Post not found', 404);
  }

  if (post.privacy === 'followers' && post.user.id !== requesterId) {
    const isFollower = await prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId: requesterId, followingId: post.user.id },
      },
    });
    if (!isFollower || isFollower.status !== 'active') {
      throw new AppError('This post is only visible to followers', 403);
    }
  }

  return formatPost(post, requesterId);
};

// ─── Update Post ──────────────────────────────────────────────────────────────
exports.updatePost = async (postId, userId, body) => {
  let post;
  
  try {
    post = await prisma.post.findUnique({
      where: { id: postId },
    });
  } catch (error) {
    if (error.message.includes('Can\'t reach database server') || error.code === 'P2024') {
      await prisma.$connect();
      post = await prisma.post.findUnique({
        where: { id: postId },
      });
    } else {
      throw error;
    }
  }

  if (!post) {
    const ApiError = require('../../utils/ApiError');
    const httpStatus = require('http-status');
    throw new ApiError(httpStatus.NOT_FOUND, 'Post not found');
  }

  if (post.userId !== userId) {
    const ApiError = require('../../utils/ApiError');
    const httpStatus = require('http-status');
    throw new ApiError(httpStatus.FORBIDDEN, 'You can only update your own posts');
  }

  try {
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        caption: body.caption !== undefined ? body.caption : post.caption,
        privacy: body.privacy !== undefined ? body.privacy : post.privacy,
      },
    });
    return updatedPost;
  } catch (error) {
    if (error.message.includes('Can\'t reach database server') || error.code === 'P2024') {
      await prisma.$connect();
      return await prisma.post.update({
        where: { id: postId },
        data: {
          caption: body.caption !== undefined ? body.caption : post.caption,
          privacy: body.privacy !== undefined ? body.privacy : post.privacy,
        },
      });
    }
    throw error;
  }
};

// ─── Delete Post ──────────────────────────────────────────────────────────────
exports.deletePost = async (postId, userId) => {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, userId: true, media: { select: { filename: true } } },
  });

  if (!post) throw new AppError('Post not found', 404);
  if (post.userId !== userId) throw new AppError('You can only delete your own posts', 403);

  for (const m of post.media) {
    deletePostFile(m.filename);
  }

  await prisma.$transaction(async (tx) => {
    await tx.post.delete({ where: { id: postId } });
    await tx.user.update({
      where: { id: userId },
      data: { postCount: { decrement: 1 } },
    });
  });

  return { message: 'Post deleted successfully' };
};

// ─── Share Post ───────────────────────────────────────────────────────────────
exports.sharePost = async (originalPostId, userId, body) => {
  const { caption, privacy = 'public' } = body;

  // Load original post to check it exists and is shareable
  const originalPost = await prisma.post.findUnique({
    where:  { id: originalPostId },
    select: { id: true, userId: true, privacy: true },
  });
  if (!originalPost) throw new AppError('Post not found', 404);

  // Cannot share a private (only_me) post
  if (originalPost.privacy === 'only_me') {
    throw new AppError('This post cannot be shared', 403);
  }

  // Cannot share a followers-only post if not following the author
  if (originalPost.privacy === 'followers' && originalPost.userId !== userId) {
    const isFollower = await prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId: userId, followingId: originalPost.userId },
      },
    });
    if (!isFollower || isFollower.status !== 'active') {
      throw new AppError('You cannot share a post that is visible to followers only', 403);
    }
  }

  const sharedPost = await prisma.$transaction(async (tx) => {
    // Create a new Post row that references the original
    const newPost = await tx.post.create({
      data: {
        userId,
        caption:      caption || null,
        privacy,
        isReel:       false,
        sharedFromId: originalPostId,
        // media[] intentionally empty — no files uploaded for a share
      },
      select: POST_SELECT,
    });

    // Increment sharer's post count
    await tx.user.update({
      where: { id: userId },
      data:  { postCount: { increment: 1 } },
    });

    // Increment original post's share count
    await tx.post.update({
      where: { id: originalPostId },
      data:  { shareCount: { increment: 1 } },
    });

    // Notify original post author (skip self-share)
    await createNotification(tx, {
      recipientId: originalPost.userId,
      senderId:    userId,
      type:        'share',
      postId:      originalPostId,
    });
    
    await processMentions(tx, {
      text:     caption,
      senderId: userId,
      postId:   newPost.id,
    });

    return newPost;
  });

  return formatPost(sharedPost, userId);
};

// ─── Get User Posts (profile grid) ───────────────────────────────────────────
exports.getUserPosts = async (userId, requesterId, rawQuery) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isPrivate: true },
  });
  if (!user) throw new AppError('User not found', 404);

  const isOwner = userId === requesterId;
  let privacyFilter;

  if (isOwner) {
    privacyFilter = { in: ['public', 'followers', 'only_me'] };
  } else if (user.isPrivate) {
    const isFollower = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: requesterId, followingId: userId } },
    });
    if (!isFollower || isFollower.status !== 'active') {
      throw new AppError('This account is private', 403);
    }
    privacyFilter = { in: ['public', 'followers'] };
  } else {
    privacyFilter = { in: ['public', 'followers'] };
  }

  const { page, limit, skip } = getPagination(rawQuery);

  const [posts, totalItems] = await Promise.all([
    prisma.post.findMany({
      where: { userId, privacy: privacyFilter },
      select: POST_SELECT,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.post.count({ where: { userId, privacy: privacyFilter } }),
  ]);

  return {
    posts: posts.map((p) => formatPost(p, requesterId)),
    meta: buildPaginationMeta(page, limit, totalItems),
  };
};

// ─── Like Post (PATCHED WITH NOTIFICATION) ────────────────────────────────────
exports.likePost = async (postId, userId) => {
  // Patched to select post author's userId
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true, userId: true } });
  if (!post) throw new AppError('Post not found', 404);

  const existing = await prisma.like.findUnique({
    where: { postId_userId: { postId, userId } },
  });
  if (existing) throw new AppError('You already liked this post', 409);

  await prisma.$transaction(async (tx) => {
    await tx.like.create({ data: { postId, userId } });
    await tx.post.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } });

    // ← ADD: Notify post author
    await createNotification(tx, {
      recipientId: post.userId,
      senderId:    userId,
      type:        'like',
      postId,
    });
  });

  return { message: 'Post liked' };
};

// ─── Unlike Post ──────────────────────────────────────────────────────────────
exports.unlikePost = async (postId, userId) => {
  const existing = await prisma.like.findUnique({
    where: { postId_userId: { postId, userId } },
  });
  if (!existing) throw new AppError('You have not liked this post', 404);

  await prisma.$transaction(async (tx) => {
    await tx.like.delete({ where: { postId_userId: { postId, userId } } });
    await tx.post.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } });
  });

  return { message: 'Post unliked' };
};

// ─── Get Comments ─────────────────────────────────────────────────────────────
exports.getComments = async (postId, requesterId, rawQuery) => {
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
  if (!post) throw new AppError('Post not found', 404);

  const { page, limit, skip } = getPagination(rawQuery);

  const [comments, totalItems] = await Promise.all([
    prisma.comment.findMany({
      where: { postId },
      select: {
        id: true,
        text: true,
        likeCount: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: { id: true, username: true, fullName: true, avatarUrl: true },
        },
        commentLikes: {
          where: { userId: requesterId },
          select: { userId: true },
        },
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
    }),
    prisma.comment.count({ where: { postId } }),
  ]);

  return {
    comments: comments.map((c) => ({
      id: c.id,
      text: c.text,
      likeCount: c.likeCount,
      isLiked: c.commentLikes.length > 0,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      user: c.user,
    })),
    meta: buildPaginationMeta(page, limit, totalItems),
  };
};

// ─── Add Comment (PATCHED WITH NOTIFICATION) ─────────────────────────────────
exports.addComment = async (postId, userId, text) => {
  // Patched to select post author's userId
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true, userId: true } });
  if (!post) throw new AppError('Post not found', 404);

  const comment = await prisma.$transaction(async (tx) => {
    const newComment = await tx.comment.create({
      data: { postId, userId, text },
      select: {
        id: true,
        text: true,
        likeCount: true,
        createdAt: true,
        user: {
          select: { id: true, username: true, fullName: true, avatarUrl: true },
        },
      },
    });

    await tx.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } });

    // ← ADD: Notify post author about new comment
    await createNotification(tx, {
      recipientId: post.userId,
      senderId:    userId,
      type:        'comment',
      postId,
      commentId:   newComment.id,
    });

    await processMentions(tx, {
      text:     caption,
      senderId: userId,
      postId:   newPost.id,
    });

    return newComment;
  });

  return { ...comment, isLiked: false };
};

// ─── Delete Comment ───────────────────────────────────────────────────────────
exports.deleteComment = async (postId, commentId, userId) => {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
  });
  if (!comment) throw new AppError('Comment not found', 404);
  if (comment.postId !== postId) throw new AppError('Comment does not belong to this post', 400);
  if (comment.userId !== userId) throw new AppError('You can only delete your own comments', 403);

  await prisma.$transaction(async (tx) => {
    await tx.comment.delete({ where: { id: commentId } });
    await tx.post.update({ where: { id: postId }, data: { commentCount: { decrement: 1 } } });
  });

  return { message: 'Comment deleted' };
};

// ─── Like Comment (PATCHED WITH NOTIFICATION) ─────────────────────────────────
exports.likeComment = async (postId, commentId, userId) => {
  // Patched to select comment author's userId and postId
  const comment = await prisma.comment.findUnique({ where: { id: commentId }, select: { id: true, userId: true, postId: true } });
  if (!comment) throw new AppError('Comment not found', 404);
  if (comment.postId !== postId) throw new AppError('Comment does not belong to this post', 400);

  const existing = await prisma.commentLike.findUnique({
    where: { commentId_userId: { commentId, userId } },
  });
  if (existing) throw new AppError('You already liked this comment', 409);

  await prisma.$transaction(async (tx) => {
    await tx.commentLike.create({ data: { commentId, userId } });
    await tx.comment.update({ where: { id: commentId }, data: { likeCount: { increment: 1 } } });

    // ← ADD: Notify comment author
    await createNotification(tx, {
      recipientId: comment.userId,
      senderId:    userId,
      type:        'comment_like',
      postId:      comment.postId,
      commentId,
    });
  });

  return { message: 'Comment liked' };
};

// ─── Unlike Comment ───────────────────────────────────────────────────────────
exports.unlikeComment = async (postId, commentId, userId) => {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw new AppError('Comment not found', 404);
  if (comment.postId !== postId) throw new AppError('Comment does not belong to this post', 400);

  const existing = await prisma.commentLike.findUnique({
    where: { commentId_userId: { commentId, userId } },
  });
  if (!existing) throw new AppError('You have not liked this comment', 404);

  await prisma.$transaction(async (tx) => {
    await tx.commentLike.delete({ where: { commentId_userId: { commentId, userId } } });
    await tx.comment.update({ where: { id: commentId }, data: { likeCount: { decrement: 1 } } });
  });

  return { message: 'Comment unliked' };
};