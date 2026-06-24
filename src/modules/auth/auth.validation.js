const { z } = require('zod');

// Email/password register (kept from boilerplate, extended)
const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  fullName: z.string().max(100).optional(),
});

// Email/password login
const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

// Firebase token exchange (Google Sign-In + Phone OTP)
const firebaseAuthSchema = z.object({
  idToken: z.string().min(1, 'Firebase ID token is required'),
});

// Complete onboarding (set username after first Firebase login)
const onboardingSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  fullName: z.string().max(100).optional(),
  bio: z.string().max(150).optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

const forgotPwSchema = z.object({ 
  email: z.string().email('Invalid email') 
});

module.exports = {
  registerSchema,
  loginSchema,
  firebaseAuthSchema,
  onboardingSchema,
  refreshSchema,
  logoutSchema,
  forgotPwSchema,
};