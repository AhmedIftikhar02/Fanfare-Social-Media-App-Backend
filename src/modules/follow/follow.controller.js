const catchAsync     = require('../../utils/catchAsync');
const followService  = require('./follow.service');

exports.followUser = catchAsync(async (req, res) => {
  const result = await followService.followUser(req.user.id, req.params.userId);
  res.status(201).json({ status: 'success', data: result });
});

exports.unfollowUser = catchAsync(async (req, res) => {
  const result = await followService.unfollowUser(req.user.id, req.params.userId);
  res.status(200).json({ status: 'success', data: result });
});

exports.getFollowRequests = catchAsync(async (req, res) => {
  const result = await followService.getFollowRequests(req.user.id, req.query);
  res.status(200).json({ status: 'success', data: result });
});

exports.approveFollowRequest = catchAsync(async (req, res) => {
  const result = await followService.approveFollowRequest(req.params.id, req.user.id);
  res.status(200).json({ status: 'success', data: result });
});

exports.rejectFollowRequest = catchAsync(async (req, res) => {
  const result = await followService.rejectFollowRequest(req.params.id, req.user.id);
  res.status(200).json({ status: 'success', data: result });
});

exports.getFollowers = catchAsync(async (req, res) => {
  const result = await followService.getFollowers(req.params.userId, req.user.id, req.query);
  res.status(200).json({ status: 'success', data: result });
});

exports.getFollowing = catchAsync(async (req, res) => {
  const result = await followService.getFollowing(req.params.userId, req.user.id, req.query);
  res.status(200).json({ status: 'success', data: result });
});

exports.getFollowStatus = catchAsync(async (req, res) => {
  const result = await followService.getFollowStatus(req.user.id, req.params.userId);
  res.status(200).json({ status: 'success', data: result });
});