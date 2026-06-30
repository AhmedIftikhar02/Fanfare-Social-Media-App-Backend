// src/modules/statuses/statuses.service.js

const prisma          = require('../../database/prisma');
const AppError        = require('../../utils/AppError');
const { deleteStatusFile, deleteStatusThumbnail } = require('../../middlewares/upload');
const { getPagination, buildPaginationMeta } = require('../../utils/paginate');

// ─── Helper: shape a single status for API response ──────────────────────────
const formatStatus = (status, viewerId) => ({
  id:           status.id,
  mediaUrl:     status.mediaUrl,
  mediaType:    status.mediaType,
  thumbnailUrl: status.thumbnailUrl || null,
  caption:      status.caption,
  privacy:      status.privacy,
  viewCount:    status.viewCount, // Only meaningful to owner
  createdAt:    status.createdAt,
  expiresAt:    status.expiresAt,
  isViewed:     Array.isArray(status.views)
    ? status.views.some((v) => v.viewerId === viewerId)
    : false,
});

// ─── Helper: active statuses filter ──────────────────────────────────────────
const ACTIVE = { expiresAt: { gt: new Date() } };

// ─── Helper: user selector used across queries ────────────────────────────────
const USER_SELECT = {
  id:        true,
  username:  true,
  fullName:  true,
  avatarUrl: true,
};

// ─── 1. Create Status ─────────────────────────────────────────────────────────
exports.createStatus = async (userId, body, processedFile) => {
  if (!processedFile) {
    throw new AppError('A media file is required', 400);
  }

  const { caption, privacy = 'public' } = body;

  const status = await prisma.status.create({
    data: {
      userId,
      filename:          processedFile.filename,
      mediaUrl:          processedFile.mediaUrl,
      mediaType:         processedFile.mediaType,
      thumbnailFilename: processedFile.thumbnailFilename || null,
      thumbnailUrl:      processedFile.thumbnailUrl || null,
      caption:           caption || null,
      privacy,
    },
    include: {
      user:  { select: USER_SELECT },
      views: { select: { viewerId: true } },
    },
  });

  return formatStatus(status, userId);
};

// ─── 2. Get Story Feed (grouped by user) ──────────────────────────────────────
exports.getStatusFeed = async (requesterId) => {
  const now = new Date();

  // ── Own statuses ────────────────────────────────────────────────────────────
  const ownUser = await prisma.user.findUnique({
    where: { id: requesterId },
    select: {
      ...USER_SELECT,
      statuses: {
        where: ACTIVE,
        orderBy: { createdAt: 'asc' },
        include: { views: { select: { viewerId: true } } },
      },
    },
  });

  // ── Followed users with active statuses ─────────────────────────────────────
  const followedUsers = await prisma.user.findMany({
    where: {
      followersRel: {
        some: {
          followerId: requesterId,
          status:     'active',
        },
      },
      statuses: {
        some: ACTIVE,
      },
    },
    select: {
      ...USER_SELECT,
      statuses: {
        where: ACTIVE,
        orderBy: { createdAt: 'asc' },
        include: { views: { select: { viewerId: true } } },
      },
    },
  });

  const includedIds = new Set([
    requesterId,
    ...followedUsers.map((u) => u.id),
  ]);

  const includedIdsArray = Array.from(includedIds);

  // ── Random public users (not followed, not self) ─────────────────────────────
  const publicUserRows = await prisma.$queryRaw`
    SELECT id FROM (
      SELECT DISTINCT u.id
      FROM users u
      INNER JOIN statuses s ON s.user_id = u.id
      WHERE s.expires_at > ${now}
        AND s.privacy    = 'public'
        AND u.is_private = false
        AND u.id NOT IN (SELECT UNNEST(${includedIdsArray}::text[]))
    ) as unique_public_users
    ORDER BY RANDOM()
    LIMIT 20
  `;

  const publicUserIds = publicUserRows.map((r) => r.id);

  const publicUsers = publicUserIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: publicUserIds } },
        select: {
          ...USER_SELECT,
          statuses: {
            where: { ...ACTIVE, privacy: 'public' },
            orderBy: { createdAt: 'asc' },
            include: { views: { select: { viewerId: true } } },
          },
        },
      })
    : [];

  // ── Build response groups ────────────────────────────────────────────────────
  const buildGroup = (user) => {
    const statuses = (user.statuses || []).map((s) => formatStatus(s, requesterId));
    const latest = statuses[statuses.length - 1]; // orderBy createdAt asc → last = newest

    return {
      user: {
        id:        user.id,
        username:  user.username,
        fullName:  user.fullName,
        avatarUrl: user.avatarUrl,
      },
      statuses,
      hasUnviewed: statuses.some((s) => !s.isViewed),
      // Convenience field — avoids the client having to reach into the array
      // to find the latest story's thumbnail for the home-feed story ring.
      latestThumbnailUrl: latest ? (latest.thumbnailUrl || latest.mediaUrl) : null,
    };
  };

  const ownGroup = buildGroup(ownUser);

  const followedGroups = followedUsers
    .map(buildGroup)
    .filter((g) => g.statuses.length > 0)
    .sort((a, b) => Number(b.hasUnviewed) - Number(a.hasUnviewed));

  const publicGroups = publicUsers
    .map(buildGroup)
    .filter((g) => g.statuses.length > 0)
    .sort((a, b) => Number(b.hasUnviewed) - Number(a.hasUnviewed));

  return [ownGroup, ...followedGroups, ...publicGroups];
};

// ─── 3. View a Single Status (records view) ───────────────────────────────────
exports.viewStatus = async (statusId, viewerId) => {
  const status = await prisma.status.findFirst({
    where: { id: statusId, ...ACTIVE },
    include: {
      user:  { select: USER_SELECT },
      views: { select: { viewerId: true } },
    },
  });

  if (!status) throw new AppError('Story not found or expired', 404);

  if (status.privacy === 'only_me' && status.userId !== viewerId) {
    throw new AppError('Story not found or expired', 404);
  }

  if (status.privacy === 'followers' && status.userId !== viewerId) {
    const follow = await prisma.follow.findFirst({
      where: { followerId: viewerId, followingId: status.userId, status: 'active' },
    });
    if (!follow) throw new AppError('Story not found or expired', 404);
  }

  if (status.userId !== viewerId) {
    await prisma.$transaction([
      prisma.statusView.upsert({
        where:  { statusId_viewerId: { statusId, viewerId } },
        create: { statusId, viewerId },
        update: { viewedAt: new Date() },
      }),
      prisma.status.update({
        where: { id: statusId },
        data:  { viewCount: { increment: 1 } },
      }),
    ]);

    const updated = await prisma.status.findUnique({
      where:   { id: statusId },
      select:  { viewCount: true },
    });
    status.viewCount = updated.viewCount;
  }

  const formatted = formatStatus(status, viewerId);

  if (status.userId !== viewerId) {
    delete formatted.viewCount;
  }

  return formatted;
};

// ─── 4. Get Viewers of a Status (owner only) ─────────────────────────────────
exports.getStatusViewers = async (statusId, requesterId, query) => {
  const status = await prisma.status.findUnique({
    where:  { id: statusId },
    select: { userId: true, expiresAt: true },
  });

  if (!status) throw new AppError('Story not found', 404);
  if (status.userId !== requesterId) throw new AppError('Forbidden', 403);

  const { skip, take } = getPagination(query);

  const [viewers, total] = await prisma.$transaction([
    prisma.statusView.findMany({
      where:   { statusId },
      skip,
      take,
      orderBy: { viewedAt: 'desc' },
      include: {
        viewer: { select: USER_SELECT },
      },
    }),
    prisma.statusView.count({ where: { statusId } }),
  ]);

  return {
    viewers: viewers.map((v) => ({
      user:     v.viewer,
      viewedAt: v.viewedAt,
    })),
    pagination: buildPaginationMeta({ total, skip, take, query }),
  };
};

// ─── 5. Delete Status ─────────────────────────────────────────────────────────
exports.deleteStatus = async (statusId, requesterId) => {
  const status = await prisma.status.findUnique({
    where:  { id: statusId },
    select: { userId: true, filename: true, thumbnailFilename: true },
  });

  if (!status) throw new AppError('Story not found', 404);
  if (status.userId !== requesterId) throw new AppError('Forbidden — not your story', 403);

  await prisma.status.delete({ where: { id: statusId } });

  // Safe isolated filesystem purge — main media + thumbnail
  deleteStatusFile(status.filename, status.mediaType);
  deleteStatusThumbnail(status.thumbnailFilename);
};