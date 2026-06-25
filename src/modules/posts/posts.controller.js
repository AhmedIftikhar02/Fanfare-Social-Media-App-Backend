const catchAsync   = require('../../utils/catchAsync');
const postsService = require('./posts.service');

exports.createPost = catchAsync(async (req, res) => {
  const result = await postsService.createPost(req.user.id, req.body, req.processedFiles);
  res.status(201).json({ status: 'success', data: result });
});

exports.getFeed = catchAsync(async (req, res) => {
  const result = await postsService.getFeed(req.user.id, req.query);
  res.status(200).json({ status: 'success', data: result });
});

exports.getExplore = catchAsync(async (req, res) => {
  const result = await postsService.getExplore(req.user.id, req.query);
  res.status(200).json({ status: 'success', data: result });
});

exports.getPost = catchAsync(async (req, res) => {
  const result = await postsService.getPost(req.params.postId, req.user.id);
  res.status(200).json({ status: 'success', data: result });
});

exports.updatePost = catchAsync(async (req, res) => {
  const result = await postsService.updatePost(req.params.postId, req.user.id, req.body);
  res.status(200).json({ status: 'success', data: result });
});

exports.deletePost = catchAsync(async (req, res) => {
  const result = await postsService.deletePost(req.params.postId, req.user.id);
  res.status(200).json({ status: 'success', data: result });
});

exports.getUserPosts = catchAsync(async (req, res) => {
  const result = await postsService.getUserPosts(req.params.userId, req.user.id, req.query);
  res.status(200).json({ status: 'success', data: result });
});

exports.likePost = catchAsync(async (req, res) => {
  const result = await postsService.likePost(req.params.postId, req.user.id);
  res.status(200).json({ status: 'success', data: result });
});

exports.unlikePost = catchAsync(async (req, res) => {
  const result = await postsService.unlikePost(req.params.postId, req.user.id);
  res.status(200).json({ status: 'success', data: result });
});

exports.getComments = catchAsync(async (req, res) => {
  const result = await postsService.getComments(req.params.postId, req.user.id, req.query);
  res.status(200).json({ status: 'success', data: result });
});

exports.addComment = catchAsync(async (req, res) => {
  const result = await postsService.addComment(req.params.postId, req.user.id, req.body.text);
  res.status(201).json({ status: 'success', data: result });
});

exports.deleteComment = catchAsync(async (req, res) => {
  const result = await postsService.deleteComment(
    req.params.postId,
    req.params.commentId,
    req.user.id
  );
  res.status(200).json({ status: 'success', data: result });
});

exports.likeComment = catchAsync(async (req, res) => {
  const result = await postsService.likeComment(
    req.params.postId,
    req.params.commentId,
    req.user.id
  );
  res.status(200).json({ status: 'success', data: result });
});

exports.unlikeComment = catchAsync(async (req, res) => {
  const result = await postsService.unlikeComment(
    req.params.postId,
    req.params.commentId,
    req.user.id
  );
  res.status(200).json({ status: 'success', data: result });
});