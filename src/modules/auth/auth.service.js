const prisma = require('../../database/prisma');
const AppError = require('../../utils/AppError');
const { hashPassword, comparePassword } = require('../../utils/password');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../../utils/jwt');
const hashToken = require('../../utils/hashToken');
const admin = require('../../config/firebase');
const crypto = require('crypto');
const logger = require('../../config/logger');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitizeUser(user) {
  const { passwordHash, resetTokenHash, resetTokenExpiresAt, ...safe } = user;
  return safe;
}

async function issueTokenPair(userId, role) {
  const accessToken = signAccessToken({ id: userId, role });
  const refreshToken = signRefreshToken({ id: userId });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry for social app

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId,
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
}

// ─── Email / Password Register ────────────────────────────────────────────────

exports.register = async ({ email, password, fullName }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('Email already registered', 409);

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash, fullName, onboardingDone: false },
  });

  const tokens = await issueTokenPair(user.id, user.role);
  return { user: sanitizeUser(user), ...tokens };
};

// ─── Email / Password Login ───────────────────────────────────────────────────

exports.login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) throw new AppError('Invalid email or password', 401);

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) throw new AppError('Invalid email or password', 401);

  const tokens = await issueTokenPair(user.id, user.role);
  return { user: sanitizeUser(user), ...tokens };
};

// ─── Firebase Token Exchange (Google + Phone) ─────────────────────────────────

exports.firebaseAuth = async ({ idToken }) => {
  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch (err) {
    logger.warn('Firebase token verification failed', { error: err.message });
    throw new AppError('Invalid or expired Firebase token', 401);
  }

  const { uid, email, name, picture, phone_number } = decoded;

  // Upsert logic: Check if user exists by Firebase UID
  let user = await prisma.user.findUnique({ where: { firebaseUid: uid } });

  if (!user) {
    // If user doesn't exist by Firebase UID, check if email matches an existing email/password account
    if (email) {
      const byEmail = await prisma.user.findUnique({ where: { email } });
      if (byEmail) {
        // Link Firebase UID to existing email account
        user = await prisma.user.update({
          where: { id: byEmail.id },
          data: {
            firebaseUid: uid,
            avatarUrl: byEmail.avatarUrl || picture || null,
          },
        });
      }
    }

    if (!user) {
      // Create a brand new user
      user = await prisma.user.create({
        data: {
          firebaseUid: uid,
          email: email || null,
          phone: phone_number || null,
          fullName: name || null,
          avatarUrl: picture || null,
          isEmailVerified: !!email,
          onboardingDone: false,
        },
      });
    }
  }

  const tokens = await issueTokenPair(user.id, user.role);
  return {
    user: sanitizeUser(user),
    ...tokens,
    needsOnboarding: !user.onboardingDone,
  };
};

// ─── Complete Onboarding ──────────────────────────────────────────────────────

exports.completeOnboarding = async (userId, { username, fullName, bio }) => {
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing && existing.id !== userId) throw new AppError('Username already taken', 409);

  const user = await prisma.user.update({
    where: { id: userId },
    data: { username, fullName, bio, onboardingDone: true },
  });

  return { user: sanitizeUser(user) };
};

// ─── Refresh Tokens ───────────────────────────────────────────────────────────

exports.refresh = async ({ refreshToken }) => {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError('Invalid refresh token', 401);
  }

  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.revokedAt || new Date() > stored.expiresAt) {
    throw new AppError('Refresh token expired or revoked', 401);
  }

  // Token Rotation: revoke old, issue new pair
  await prisma.refreshToken.update({
    where: { tokenHash },
    data: { revokedAt: new Date() },
  });

  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user) throw new AppError('User not found', 404);

  return issueTokenPair(user.id, user.role);
};

// ─── Logout ───────────────────────────────────────────────────────────────────

exports.logout = async ({ refreshToken }) => {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

// ─── Get Me ───────────────────────────────────────────────────────────────────

exports.getMe = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404);
  return sanitizeUser(user);
};

// ─── Forgot Password ──────────────────────────────────────────────────────────

exports.forgotPassword = async ({ email }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // Security: do not reveal user existence

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

  await prisma.user.update({
    where: { id: user.id },
    data: { resetTokenHash: tokenHash, resetTokenExpiresAt: expiresAt },
  });

  // Log to terminal for local verification
  logger.info(`[RESET TOKEN for ${email}]: ${rawToken}`);
};