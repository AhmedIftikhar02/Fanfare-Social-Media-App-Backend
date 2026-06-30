// src/utils/otp.js

const crypto = require('crypto');
const prisma = require('../database/prisma');

const OTP_LENGTH       = 6;
const OTP_TTL_MINUTES  = 10;
const MAX_ATTEMPTS     = 3;

/**
 * Generate a cryptographically random 6-digit OTP string.
 */
const generateOtp = () => {
  // Use crypto.randomInt for uniform distribution (no modulo bias)
  const code = crypto.randomInt(0, 1_000_000);
  return String(code).padStart(OTP_LENGTH, '0');
};

/**
 * Hash an OTP with SHA-256. We never store the raw code.
 */
const hashOtp = (code) =>
  crypto.createHash('sha256').update(code).digest('hex');

/**
 * Upsert an OTP record for an identifier (email or phone).
 * Replaces any existing pending OTP for the same identifier+type.
 *
 * @param {string} identifier - email address or E.164 phone number
 * @param {'email'|'phone'} type
 * @returns {string} The raw OTP code (to send to the user)
 */
const createOtp = async (identifier, type) => {
  const code      = generateOtp();
  const otpHash   = hashOtp(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  // Delete any existing OTP for this identifier+type first (clean slate)
  await prisma.otpCode.deleteMany({
    where: { identifier, type },
  });

  await prisma.otpCode.create({
    data: { identifier, type, otpHash, expiresAt, attempts: 0 },
  });

  return code;
};

/**
 * Verify a submitted OTP code.
 *
 * @param {string} identifier
 * @param {'email'|'phone'} type
 * @param {string} submittedCode
 * @returns {{ valid: boolean, reason?: string }}
 */
const verifyOtp = async (identifier, type, submittedCode) => {
  const record = await prisma.otpCode.findFirst({
    where: { identifier, type },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) {
    return { valid: false, reason: 'No OTP found. Please request a new one.' };
  }

  if (new Date() > record.expiresAt) {
    await prisma.otpCode.delete({ where: { id: record.id } });
    return { valid: false, reason: 'OTP has expired. Please request a new one.' };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await prisma.otpCode.delete({ where: { id: record.id } });
    return { valid: false, reason: 'Too many failed attempts. Please request a new OTP.' };
  }

  const submittedHash = hashOtp(submittedCode);

  if (submittedHash !== record.otpHash) {
    // Increment attempt counter
    await prisma.otpCode.update({
      where:  { id: record.id },
      data:   { attempts: { increment: 1 } },
    });
    const remaining = MAX_ATTEMPTS - (record.attempts + 1);
    return {
      valid:  false,
      reason: `Invalid OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
    };
  }

  // ✅ Valid — delete the OTP (single-use)
  await prisma.otpCode.delete({ where: { id: record.id } });
  return { valid: true };
};

module.exports = { createOtp, verifyOtp };