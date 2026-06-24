const catchAsync = require('../../utils/catchAsync');
const authService = require('./auth.service');

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