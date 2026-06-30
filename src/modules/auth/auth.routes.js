const express = require('express');
const controller = require('./auth.controller');
const validate = require('../../middlewares/validate');
const authenticate = require('../../middlewares/authenticate');
const { authLimiter } = require('../../middlewares/rateLimiter');
const {
  registerSchema,
  loginSchema,
  firebaseAuthSchema,
  onboardingSchema,
  refreshSchema,
  logoutSchema,
  forgotPwSchema,
  sendEmailOtpSchema,
  verifyEmailOtpSchema,
  sendSmsOtpSchema,
  verifySmsOtpSchema,
} = require('./auth.validation');

const router = express.Router();

// ─── Public Routes ───────────────────────────────────────────────────────────

/**
 * @swagger
 * {
 * "/auth/register": {
 * "post": {
 * "summary": "Register a new user account",
 * "tags": ["Auth"],
 * "requestBody": {
 * "required": true,
 * "content": {
 * "application/json": {
 * "schema": {
 * "type": "object",
 * "required": ["email", "password"],
 * "properties": {
 * "email": { "type": "string", "format": "email", "example": "user@example.com" },
 * "password": { "type": "string", "minimum": 6, "example": "SecurePass123" }
 * }
 * }
 * }
 * }
 * },
 * "responses": {
 * "201": { "description": "Account created successfully" }
 * }
 * }
 * }
 * }
 */
router.post("/register", authLimiter, validate(registerSchema), controller.register);

/**
 * @swagger
 * {
 * "/auth/login": {
 * "post": {
 * "summary": "Log in with email and password",
 * "tags": ["Auth"],
 * "requestBody": {
 * "required": true,
 * "content": {
 * "application/json": {
 * "schema": {
 * "type": "object",
 * "required": ["email", "password"],
 * "properties": {
 * "email": { "type": "string", "format": "email", "example": "user@example.com" },
 * "password": { "type": "string", "example": "SecurePass123" }
 * }
 * }
 * }
 * }
 * },
 * "responses": {
 * "200": { "description": "Login successful" }
 * }
 * }
 * }
 * }
 */
router.post("/login", authLimiter, validate(loginSchema), controller.login);

/**
 * @swagger
 * {
 * "/auth/firebase": {
 * "post": {
 * "summary": "Exchange Firebase ID token (Google/Phone OTP)",
 * "tags": ["Auth"],
 * "requestBody": {
 * "required": true,
 * "content": {
 * "application/json": {
 * "schema": {
 * "type": "object",
 * "required": ["idToken"],
 * "properties": {
 * "idToken": { "type": "string", "description": "Firebase JWT ID Token from client app", "example": "eyJhbGciOiJSUzI1Ni..." }
 * }
 * }
 * }
 * }
 * },
 * "responses": {
 * "200": { "description": "Firebase token verification successful" }
 * }
 * }
 * }
 * }
 */
router.post("/firebase", authLimiter, validate(firebaseAuthSchema), controller.firebaseAuth);

/**
 * @swagger
 * {
 * "/auth/refresh": {
 * "post": {
 * "summary": "Exchange a valid refresh token for a new token pair",
 * "tags": ["Auth"],
 * "requestBody": {
 * "required": true,
 * "content": {
 * "application/json": {
 * "schema": {
 * "type": "object",
 * "required": ["refreshToken"],
 * "properties": {
 * "refreshToken": { "type": "string", "example": "eyJhbGciOi..." }
 * }
 * }
 * }
 * }
 * },
 * "responses": {
 * "200": { "description": "New tokens issued" }
 * }
 * }
 * }
 * }
 */
router.post("/refresh", validate(refreshSchema), controller.refresh);

/**
 * @swagger
 * {
 * "/auth/logout": {
 * "post": {
 * "summary": "Revoke a refresh token",
 * "tags": ["Auth"],
 * "requestBody": {
 * "required": true,
 * "content": {
 * "application/json": {
 * "schema": {
 * "type": "object",
 * "required": ["refreshToken"],
 * "properties": {
 * "refreshToken": { "type": "string", "example": "eyJhbGciOi..." }
 * }
 * }
 * }
 * }
 * },
 * "responses": {
 * "204": { "description": "Logged out successfully" }
 * }
 * }
 * }
 * }
 */
router.post("/logout", validate(logoutSchema), controller.logout);

/**
 * @swagger
 * {
 * "/auth/forgot-password": {
 * "post": {
 * "summary": "Request a password reset token",
 * "tags": ["Auth"],
 * "requestBody": {
 * "required": true,
 * "content": {
 * "application/json": {
 * "schema": {
 * "type": "object",
 * "required": ["email"],
 * "properties": {
 * "email": { "type": "string", "format": "email", "example": "user@example.com" }
 * }
 * }
 * }
 * }
 * },
 * "responses": {
 * "200": { "description": "Reset token processed" }
 * }
 * }
 * }
 * }
 */
router.post("/forgot-password", authLimiter, validate(forgotPwSchema), controller.forgotPassword);


// ─── Protected Routes ────────────────────────────────────────────────────────

/**
 * @swagger
 * {
 * "/auth/me": {
 * "get": {
 * "summary": "Get the current authenticated user's profile",
 * "tags": ["Auth"],
 * "security": [{ "bearerAuth": [] }],
 * "responses": {
 * "200": { "description": "Current user profile returned" }
 * }
 * }
 * }
 * }
 */
router.get("/me", authenticate, controller.getMe);

/**
 * @swagger
 * {
 * "/auth/onboarding": {
 * "post": {
 * "summary": "Complete onboarding by setting username and profile details",
 * "tags": ["Auth"],
 * "security": [{ "bearerAuth": [] }],
 * "requestBody": {
 * "required": true,
 * "content": {
 * "application/json": {
 * "schema": {
 * "type": "object",
 * "required": ["username"],
 * "properties": {
 * "username": { "type": "string", "example": "ahmed_dev" },
 * "fullName": { "type": "string", "example": "Ahmed Iftikhar" },
 * "bio": { "type": "string", "example": "Building backend logic" }
 * }
 * }
 * }
 * }
 * },
 * "responses": {
 * "200": { "description": "Onboarding completed successfully" }
 * }
 * }
 * }
 * }
 */
router.post("/onboarding", authenticate, validate(onboardingSchema), controller.completeOnboarding);

// ─── OTP Routes ─────────────────────────────────────────────────────────────

const otpRouter = express.Router();

/**
 * @swagger
 * {
 * "/auth/otp/send-email": {
 * "post": {
 * "summary": "Send email OTP for login or registration",
 * "tags": ["Auth"],
 * "requestBody": {
 * "required": true,
 * "content": {
 * "application/json": {
 * "schema": {
 * "type": "object",
 * "required": ["email"],
 * "properties": {
 * "email": { "type": "string", "format": "email", "example": "user@example.com" }
 * }
 * }
 * }
 * }
 * },
 * "responses": {
 * "200": { "description": "OTP sent to email" }
 * }
 * }
 * }
 * }
 */
otpRouter.post(
  '/send-email',
  authLimiter,
  validate(sendEmailOtpSchema),
  controller.sendEmailOtp,
);

/**
 * @swagger
 * {
 * "/auth/otp/verify-email": {
 * "post": {
 * "summary": "Verify email OTP — returns JWT pair + user object",
 * "tags": ["Auth"],
 * "requestBody": {
 * "required": true,
 * "content": {
 * "application/json": {
 * "schema": {
 * "type": "object",
 * "required": ["email", "otp"],
 * "properties": {
 * "email": { "type": "string", "format": "email" },
 * "otp":   { "type": "string", "example": "483921" }
 * }
 * }
 * }
 * }
 * },
 * "responses": {
 * "200": { "description": "OTP valid — tokens issued" },
 * "400": { "description": "Invalid or expired OTP" }
 * }
 * }
 * }
 * }
 */
otpRouter.post(
  '/verify-email',
  authLimiter,
  validate(verifyEmailOtpSchema),
  controller.verifyEmailOtp,
);

/**
 * @swagger
 * {
 * "/auth/otp/send-sms": {
 * "post": {
 * "summary": "Send SMS OTP for login or registration",
 * "tags": ["Auth"],
 * "requestBody": {
 * "required": true,
 * "content": {
 * "application/json": {
 * "schema": {
 * "type": "object",
 * "required": ["phone"],
 * "properties": {
 * "phone": { "type": "string", "example": "+923001234567" }
 * }
 * }
 * }
 * }
 * },
 * "responses": {
 * "200": { "description": "OTP sent to phone" }
 * }
 * }
 * }
 * }
 */
otpRouter.post(
  '/send-sms',
  authLimiter,
  validate(sendSmsOtpSchema),
  controller.sendSmsOtp,
);

/**
 * @swagger
 * {
 * "/auth/otp/verify-phone": {
 * "post": {
 * "summary": "Verify phone OTP — returns JWT pair + user object",
 * "tags": ["Auth"],
 * "requestBody": {
 * "required": true,
 * "content": {
 * "application/json": {
 * "schema": {
 * "type": "object",
 * "required": ["phone", "otp"],
 * "properties": {
 * "phone": { "type": "string", "example": "+923001234567" },
 * "otp":   { "type": "string", "example": "826471" }
 * }
 * }
 * }
 * }
 * },
 * "responses": {
 * "200": { "description": "OTP valid — tokens issued" },
 * "400": { "description": "Invalid or expired OTP" }
 * }
 * }
 * }
 * }
 */
otpRouter.post(
  '/verify-phone',
  authLimiter,
  validate(verifySmsOtpSchema),
  controller.verifySmsOtp,
);

router.use('/otp', otpRouter);

module.exports = router;