// src/modules/auth/auth.validation.js

const { z } = require('zod');

// ─── Existing schemas (keep all unchanged) ────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  fullName: z.string().max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

const firebaseAuthSchema = z.object({
  idToken: z.string().min(1, 'Firebase ID token is required'),
});

const onboardingSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  fullName: z.string().max(100).optional(),
  bio: z.string().max(150).optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const forgotPwSchema = z.object({
  email: z.string().email('Invalid email'),
});

// ─── NEW: OTP Schemas ─────────────────────────────────────────────────────────

// E.164 phone number (e.g. +923001234567, +14155551234)
const e164Phone = z
  .string()
  .min(7, 'Phone number is too short')
  .max(16, 'Phone number is too long')
  .regex(/^\+[1-9]\d{6,14}$/, 'Phone number must be in E.164 format (e.g. +923001234567)');

const sendEmailOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const verifyEmailOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp:   z.string().length(6, 'OTP must be exactly 6 digits').regex(/^\d+$/, 'OTP must contain digits only'),
});

const sendSmsOtpSchema = z.object({
  phone: e164Phone,
});

const verifySmsOtpSchema = z.object({
  phone: e164Phone,
  otp:   z.string().length(6, 'OTP must be exactly 6 digits').regex(/^\d+$/, 'OTP must contain digits only'),
});

module.exports = {
  // Existing
  registerSchema,
  loginSchema,
  firebaseAuthSchema,
  onboardingSchema,
  refreshSchema,
  logoutSchema,
  forgotPwSchema,
  // New OTP
  sendEmailOtpSchema,
  verifyEmailOtpSchema,
  sendSmsOtpSchema,
  verifySmsOtpSchema,
};