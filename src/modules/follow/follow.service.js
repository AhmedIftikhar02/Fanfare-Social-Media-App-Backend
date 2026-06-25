const prisma    = require('../../database/prisma');
const AppError  = require('../../utils/AppError');
const { getPagination, buildPaginationMeta } = require('../../utils/paginate');
// ─── ADD NOTIFICATION UTILITY IMPORT ─────────────────────────────────────────
const { createNotification } = require('../../utils/notify');

// ─── Follow a User (PATCHED WITH NOTIFICATION) ────────────────────────────────

exports.followUser = async (followerId, followingId) => {
  if (followerId === followingId) {
    throw new AppError('You cannot follow yourself', 400);
  }

  // Check target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: followingId },
    select: { id: true, isPrivate: true, username: true },
  });
  if (!targetUser) throw new AppError('User not found', 404);

  // Check if already following
  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  });
  if (existing) {
    if (existing.status === 'active') {
      throw new AppError('You are already following this user', 409);
    }
    if (existing.status === 'pending') {
      throw new AppError('Follow request already sent', 409);
    }
  }

  const status = targetUser.isPrivate ? 'pending' : 'active';

  // Create follow record and update counters in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const follow = await tx.follow.create({
      data: { followerId, followingId, status, },
    });

    // Only update counters for active follows (not pending)
    if (status === 'active') {
      await tx.user.update({
        where: { id: followerId },
        data: { followingCount: { increment: 1 } },
      });
      await tx.user.update({
        where: { id: followingId },
        data: { followerCount: { increment: 1 } },
      });

      // ← ADD: Notify target user they have a new follower
      await createNotification(tx, {
        recipientId: followingId,
        senderId:    followerId,
        type:        'follow',
      });
    } else {
      // ← ADD: Notify private user they have a new follow request
      await createNotification(tx, {
        recipientId: followingId,
        senderId:    followerId,
        type:        'follow_request',
      });
    }

    return follow;
  });

  return {
    status: result.status,
    message:
      status === 'pending'
        ? 'Follow request sent. Waiting for approval.'
        : `You are now following @${targetUser.username}`,
  };
};

// ─── Unfollow a User ──────────────────────────────────────────────────────────

exports.unfollowUser = async (followerId, followingId) => {
  if (followerId === followingId) {
    throw new AppError('You cannot unfollow yourself', 400);
  }

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  });
  if (!existing) throw new AppError('You are not following this user', 404);

  const wasActive = existing.status === 'active';

  await prisma.$transaction(async (tx) => {
    await tx.follow.delete({
      where: { followerId_followingId: { followerId, followingId } },
    });

    // Only decrement counters if the follow was active (not pending)
    if (wasActive) {
      await tx.user.update({
        where: { id: followerId },
        data: { followingCount: { decrement: 1 } },
      });
      await tx.user.update({
        where: { id: followingId },
        data: { followerCount: { decrement: 1 } },
      });
    }
  });

  return { message: 'Unfollowed successfully' };
};

// ─── Get Incoming Follow Requests (for private accounts) ─────────────────────

exports.getFollowRequests = async (userId, rawQuery) => {
  const { page, limit, skip } = getPagination(rawQuery);

  const [requests, totalItems] = await Promise.all([
    prisma.follow.findMany({
      where: { followingId: userId, status: 'pending' },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.follow.count({
      where: { followingId: userId, status: 'pending' },
    }),
  ]);

  return {
    requests: requests.map((r) => ({
      id: r.id,
      requestedAt: r.createdAt,
      follower: r.follower,
    })),
    meta: buildPaginationMeta(page, limit, totalItems),
  };
};

// ─── Approve Follow Request (PATCHED WITH NOTIFICATION) ───────────────────────

exports.approveFollowRequest = async (followId, targetUserId) => {
  const request = await prisma.follow.findUnique({
    where: { id: followId },
  });

  if (!request) throw new AppError('Follow request not found', 404);
  if (request.followingId !== targetUserId) {
    throw new AppError('You are not authorized to approve this request', 403);
  }
  if (request.status !== 'pending') {
    throw new AppError('This request is not pending', 400);
  }

  await prisma.$transaction(async (tx) => {
    await tx.follow.update({
      where: { id: followId },
      data: { status: 'active' },
    });

    // Now update counters since follow is now active
    await tx.user.update({
      where: { id: request.followerId },
      data: { followingCount: { increment: 1 } },
    });
    await tx.user.update({
      where: { id: request.followingId },
      data: { followerCount: { increment: 1 } },
    });

    // ← ADD: Notify the requester their follow was accepted
    await createNotification(tx, {
      recipientId: request.followerId,  // person who requested
      senderId:    targetUserId,        // person who approved
      type:        'follow_accept',
    });
  });

  return { message: 'Follow request approved' };
};

// ─── Reject Follow Request ────────────────────────────────────────────────────

exports.rejectFollowRequest = async (followId, targetUserId) => {
  const request = await prisma.follow.findUnique({
    where: { id: followId },
  });

  if (!request) throw new AppError('Follow request not found', 404);
  if (request.followingId !== targetUserId) {
    throw new AppError('You are not authorized to reject this request', 403);
  }
  if (request.status !== 'pending') {
    throw new AppError('This request is not pending', 400);
  }

  // Just delete the request — no counter changes since it was pending
  await prisma.follow.delete({ where: { id: followId } });

  return { message: 'Follow request rejected' };
};

// ─── Get Followers List ───────────────────────────────────────────────────────

exports.getFollowers = async (userId, requesterId, rawQuery) => {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isPrivate: true },
  });
  if (!user) throw new AppError('User not found', 404);

  // If private account and not the owner, deny
  if (user.isPrivate && user.id !== requesterId) {
    // Check if requester is an active follower
    const isFollower = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: requesterId, followingId: userId } },
    });
    if (!isFollower || isFollower.status !== 'active') {
      throw new AppError('This account is private', 403);
    }
  }

  const { page, limit, skip } = getPagination(rawQuery);

  const [followers, totalItems] = await Promise.all([
    prisma.follow.findMany({
      where: { followingId: userId, status: 'active' },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
            isPrivate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.follow.count({ where: { followingId: userId, status: 'active' } }),
  ]);

  return {
    followers: followers.map((f) => f.follower),
    meta: buildPaginationMeta(page, limit, totalItems),
  };
};

// ─── Get Following List ───────────────────────────────────────────────────────

exports.getFollowing = async (userId, requesterId, rawQuery) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isPrivate: true },
  });
  if (!user) throw new AppError('User not found', 404);

  if (user.isPrivate && user.id !== requesterId) {
    const isFollower = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: requesterId, followingId: userId } },
    });
    if (!isFollower || isFollower.status !== 'active') {
      throw new AppError('This account is private', 403);
    }
  }

  const { page, limit, skip } = getPagination(rawQuery);

  const [following, totalItems] = await Promise.all([
    prisma.follow.findMany({
      where: { followerId: userId, status: 'active' },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
            isPrivate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.follow.count({ where: { followerId: userId, status: 'active' } }),
  ]);

  return {
    following: following.map((f) => f.following),
    meta: buildPaginationMeta(page, limit, totalItems),
  };
};

// ─── Check Follow Status ──────────────────────────────────────────────────────

exports.getFollowStatus = async (requesterId, targetUserId) => {
  if (requesterId === targetUserId) {
    return { status: 'self' };
  }

  const record = await prisma.follow.findUnique({
    where: {
      followerId_followingId: { followerId: requesterId, followingId: targetUserId },
    },
  });

  if (!record) return { status: 'none' };
  return { status: record.status }; // 'active' | 'pending'
};