// src/modules/auth/auth.controller.js

const catchAsync = require('../../utils/catchAsync');
const authService = require('./auth.service');

// ─── EXISTING CONTROLLERS ────────────────────────────────────────────────────

exports.register = catchAsync(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json({ status: "success", data: result });
});

exports.login = catchAsync(async (req, res) => {
  const result = await authService.login(req.body);
  res.status(200).json({ status: "success", data: result });
});

exports.firebaseAuth = catchAsync(async (req, res) => {
  const result = await authService.firebaseAuth(req.body);
  res.status(200).json({ status: "success", data: result });
});

exports.completeOnboarding = catchAsync(async (req, res) => {
  const result = await authService.completeOnboarding(req.user.id, req.body);
  res.status(200).json({ status: "success", data: result });
});

exports.refresh = catchAsync(async (req, res) => {
  const result = await authService.refresh(req.body);
  res.status(200).json({ status: "success", data: result });
});

exports.logout = catchAsync(async (req, res) => {
  await authService.logout(req.body);
  res.status(204).send();
});

exports.getMe = catchAsync(async (req, res) => {
  const user = await authService.getMe(req.user.id);
  res.status(200).json({ status: "success", data: { user } });
});

exports.forgotPassword = catchAsync(async (req, res) => {
  await authService.forgotPassword(req.body);
  res.status(200).json({
    status: "success",
    message: "If that email exists, a reset link has been sent.",
  });
});

// ─── NEW: OTP CONTROLLERS ────────────────────────────────────────────────────

// POST /auth/otp/send-email
exports.sendEmailOtp = catchAsync(async (req, res) => {
  const { email } = req.body;
  await authService.sendEmailOtp(email);
  res.status(200).json({
    status:  'success',
    message: 'OTP sent to your email address. Valid for 10 minutes.',
  });
});

// POST /auth/otp/verify-email
exports.verifyEmailOtp = catchAsync(async (req, res) => {
  const { email, otp } = req.body;
  const data = await authService.verifyEmailOtp(email, otp);
  res.status(200).json({
    status: 'success',
    data,
  });
});

// POST /auth/otp/send-sms
exports.sendSmsOtp = catchAsync(async (req, res) => {
  const { phone } = req.body;
  await authService.sendSmsOtp(phone);
  res.status(200).json({
    status:  'success',
    message: 'OTP sent to your phone number. Valid for 10 minutes.',
  });
});

// POST /auth/otp/verify-phone
exports.verifySmsOtp = catchAsync(async (req, res) => {
  const { phone, otp } = req.body;
  const data = await authService.verifySmsOtp(phone, otp);
  res.status(200).json({
    status: 'success',
    data,
  });
});