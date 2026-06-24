const catchAsync = require('../../utils/catchAsync');
const usersService = require('./users.service');

// ─── Admin: Create User Integration ──────────────────────────────────────────

exports.createUser = catchAsync(async (req, res) => {
  const user = await usersService.createUser(req.body);
  res.status(201).json({ status: 'success', data: { user } });
});

// ─── Own Profile ──────────────────────────────────────────────────────────────

exports.getMe = catchAsync(async (req, res) => {
  const user = await usersService.getMe(req.user.id);
  res.status(200).json({ status: 'success', data: { user } });
});

exports.updateProfile = catchAsync(async (req, res) => {
  const user = await usersService.updateProfile(req.user.id, req.body);
  res.status(200).json({ status: 'success', data: { user } });
});

exports.updateAvatar = catchAsync(async (req, res) => {
  const user = await usersService.updateAvatar(req.user.id, req.body.avatarUrl);
  res.status(200).json({ status: 'success', data: { user } });
});

exports.updatePrivacy = catchAsync(async (req, res) => {
  const user = await usersService.updatePrivacy(req.user.id, req.body.isPrivate);
  res.status(200).json({ status: 'success', data: { user } });
});

exports.deleteMe = catchAsync(async (req, res) => {
  await usersService.deleteMe(req.user.id);
  res.status(204).send();
});

// ─── Public Profile & Search ──────────────────────────────────────────────────

exports.getByUsername = catchAsync(async (req, res) => {
  const user = await usersService.getByUsername(req.params.username, req.user.id);
  res.status(200).json({ status: 'success', data: { user } });
});

exports.searchUsers = catchAsync(async (req, res) => {
  const result = await usersService.searchUsers(req.query.q, req.user.id, req.query);
  res.status(200).json({ status: 'success', data: result });
});

// ─── Admin CRUD Operations ────────────────────────────────────────────────────

exports.listUsers = catchAsync(async (req, res) => {
  const result = await usersService.listUsers(req.query);
  res.status(200).json({ status: 'success', data: result });
});

exports.getUserById = catchAsync(async (req, res) => {
  const user = await usersService.getUserById(req.params.id);
  res.status(200).json({ status: 'success', data: { user } });
});

exports.adminUpdateUser = catchAsync(async (req, res) => {
  const user = await usersService.adminUpdateUser(req.params.id, req.body);
  res.status(200).json({ status: 'success', data: { user } });
});

exports.adminDeleteUser = catchAsync(async (req, res) => {
  await usersService.adminDeleteUser(req.params.id);
  res.status(204).send();
});