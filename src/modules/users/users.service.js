// src/modules/users/users.service.js

const prisma = require('../../database/prisma');
const { hashPassword } = require('../../utils/password');
const AppError = require('../../utils/AppError');
const { getPagination, buildPaginationMeta } = require('../../utils/paginate');
const { deleteAvatarFile } = require('../../middlewares/upload'); // ← ADDED

// ─── Shared Sanitizer ─────────────────────────────────────────────────────────

function sanitizeUser(user) {
  const {
    passwordHash,
    resetTokenHash,
    resetTokenExpiresAt,
    firebaseUid,
    ...safe
  } = user;
  return safe;
}

// ─── Admin Integration: Create User ──────────────────────────────────────────

exports.createUser = async ({ email, password, fullName, role }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('An account with this email already exists', 409);

  const hashedPassword = await hashPassword(password);
  const user = await prisma.user.create({ 
    data: { 
      email, 
      passwordHash: hashedPassword, 
      fullName, 
      role 
    } 
  });
  return sanitizeUser(user);
};

// ─── Own Profile Logic ────────────────────────────────────────────────────────

exports.getMe = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404);
  return sanitizeUser(user);
};

exports.updateProfile = async (userId, data) => {
  if (data.websiteUrl === '') data.websiteUrl = null;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      fullName: data.fullName,
      bio: data.bio,
      websiteUrl: data.websiteUrl,
      location: data.location
    },
  });
  return sanitizeUser(user);
};

// UPDATED: Now clears disk before executing database fields update
exports.updateAvatar = async (userId, avatarUrl, avatarFilename) => {
  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarFilename: true },
  });

  if (current?.avatarFilename) {
    deleteAvatarFile(current.avatarFilename);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { 
      avatarUrl, 
      avatarFilename 
    },
  });
  return sanitizeUser(user);
};

exports.updatePrivacy = async (userId, isPrivate) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { isPrivate: isPrivate },
  });
  return sanitizeUser(user);
};

exports.deleteMe = async (userId) => {
  await prisma.user.delete({ where: { id: userId } });
};

// ─── Public Profile Logic ─────────────────────────────────────────────────────

exports.getByUsername = async (username, requesterId) => {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw new AppError('User not found', 404);

  const safe = sanitizeUser(user);

  if (user.isPrivate && user.id !== requesterId) {
    return {
      id: safe.id,
      username: safe.username,
      fullName: safe.fullName,
      avatarUrl: safe.avatarUrl,
      bio: safe.bio,
      isPrivate: true,
      followerCount: safe.followerCount,
      followingCount: safe.followingCount,
      postCount: safe.postCount,
      createdAt: safe.createdAt,
    };
  }

  return safe;
};

// ─── Search Users Logic ───────────────────────────────────────────────────────

exports.searchUsers = async (query, requesterId, rawQuery) => {
  if (!query || query.trim().length < 2) {
    throw new AppError('Search query must be at least 2 characters', 400);
  }

  const { page, limit, skip } = getPagination(rawQuery);

  const [users, totalItems] = await Promise.all([
    prisma.user.findMany({
      where: {
        AND: [
          { id: { not: requesterId } },
          {
            OR: [
              { username: { contains: query.trim(), mode: 'insensitive' } },
              { fullName: { contains: query.trim(), mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        avatarUrl: true,
        isPrivate: true,
        followerCount: true,
      },
      skip,
      take: limit,
      orderBy: { followerCount: 'desc' },
    }),
    prisma.user.count({
      where: {
        AND: [
          { id: { not: requesterId } },
          {
            OR: [
              { username: { contains: query.trim(), mode: 'insensitive' } },
              { fullName: { contains: query.trim(), mode: 'insensitive' } },
            ],
          },
        ],
      },
    }),
  ]);

  return {
    users,
    meta: buildPaginationMeta(page, limit, totalItems),
  };
};

// ─── Admin CRUD Standard Operations ───────────────────────────────────────────

exports.listUsers = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const [users, totalItems] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count(),
  ]);
  return {
    users: users.map(sanitizeUser),
    meta: buildPaginationMeta(page, limit, totalItems),
  };
};

exports.getUserById = async (id) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError('User not found', 404);
  return sanitizeUser(user);
};

exports.adminUpdateUser = async (id, data) => {
  await exports.getUserById(id);
  const user = await prisma.user.update({ where: { id }, data });
  return sanitizeUser(user);
};

exports.adminDeleteUser = async (id) => {
  await exports.getUserById(id);
  await prisma.user.delete({ where: { id } });
};