const express      = require('express');
const controller   = require('./posts.controller');
const validate     = require('../../middlewares/validate');
const authenticate = require('../../middlewares/authenticate');
const { uploadPostMedia, processPostFiles } = require('../../middlewares/upload');

const {
  createPostSchema,
  updatePostSchema,
  addCommentSchema,
  postIdParamSchema,
  commentIdParamSchema,
  userIdParamSchema,
} = require('./posts.validation');

const router = express.Router();

// All posts routes require auth
router.use(authenticate);

// ─── Feed & Explore ───────────────────────────────────────────────────────────

/**
 * @swagger
 * {
 * "/posts/feed": {
 * "get": {
 * "summary": "Get home feed (followed users + public posts)",
 * "tags": ["Posts"],
 * "security": [{ "bearerAuth": [] }],
 * "parameters": [
 * { "in": "query", "name": "page", "schema": { "type": "integer", "default": 1 } },
 * { "in": "query", "name": "limit", "schema": { "type": "integer", "default": 20 } }
 * ],
 * "responses": {
 * "200": { "description": "Paginated feed successfully returned." }
 * }
 * }
 * }
 * }
 */
router.get('/feed', controller.getFeed);

/**
 * @swagger
 * {
 * "/posts/explore": {
 * "get": {
 * "summary": "Get explore grid (public posts)",
 * "tags": ["Posts"],
 * "security": [{ "bearerAuth": [] }],
 * "parameters": [
 * { "in": "query", "name": "page", "schema": { "type": "integer", "default": 1 } },
 * { "in": "query", "name": "limit", "schema": { "type": "integer", "default": 20 } }
 * ],
 * "responses": {
 * "200": { "description": "Paginated public posts grid returned." }
 * }
 * }
 * }
 * }
 */
router.get('/explore', controller.getExplore);

// ─── User Posts Grid ──────────────────────────────────────────────────────────

/**
 * @swagger
 * {
 * "/posts/user/{userId}": {
 * "get": {
 * "summary": "Get posts grid for a user profile",
 * "tags": ["Posts"],
 * "security": [{ "bearerAuth": [] }],
 * "parameters": [
 * { "in": "path", "name": "userId", "required": true, "schema": { "type": "string", "format": "uuid" }, "description": "Target profile user ID" },
 * { "in": "query", "name": "page", "schema": { "type": "integer", "default": 1 } },
 * { "in": "query", "name": "limit", "schema": { "type": "integer", "default": 20 } }
 * ],
 * "responses": {
 * "200": { "description": "User's posts array returned." },
 * "403": { "description": "Private account restriction." }
 * }
 * }
 * }
 * }
 */
router.get(
  '/user/:userId',
  validate(userIdParamSchema, 'params'),
  controller.getUserPosts
);

// ─── Create Post ──────────────────────────────────────────────────────────────

/**
 * @swagger
 * {
 * "/posts": {
 * "post": {
 * "summary": "Create a new post (multipart/form-data)",
 * "tags": ["Posts"],
 * "security": [{ "bearerAuth": [] }],
 * "requestBody": {
 * "required": true,
 * "content": {
 * "multipart/form-data": {
 * "schema": {
 * "type": "object",
 * "properties": {
 * "media": {
 * "type": "array",
 * "items": { "type": "string", "format": "binary" },
 * "description": "1–10 image or video files"
 * },
 * "caption": { "type": "string", "maxLength": 2200 },
 * "privacy": { "type": "string", "enum": ["public", "followers", "only_me"], "default": "public" }
 * }
 * }
 * }
 * }
 * },
 * "responses": {
 * "201": { "description": "Post created successfully." },
 * "400": { "description": "Payload constraints failure." }
 * }
 * }
 * }
 * }
 */
router.post(
  '/',
  uploadPostMedia,
  processPostFiles,
  validate(createPostSchema, 'body'),
  controller.createPost
);

// ─── Single Post Actions ──────────────────────────────────────────────────────

/**
 * @swagger
 * {
 * "/posts/{postId}": {
 * "get": {
 * "summary": "Get a single post by ID",
 * "tags": ["Posts"],
 * "security": [{ "bearerAuth": [] }],
 * "parameters": [
 * { "in": "path", "name": "postId", "required": true, "schema": { "type": "string", "format": "uuid" } }
 * ],
 * "responses": {
 * "200": { "description": "Post detail returned." },
 * "404": { "description": "Not found." }
 * }
 * },
 * "put": {
 * "summary": "Edit caption or privacy of own post",
 * "tags": ["Posts"],
 * "security": [{ "bearerAuth": [] }],
 * "parameters": [
 * { "in": "path", "name": "postId", "required": true, "schema": { "type": "string", "format": "uuid" } }
 * ],
 * "requestBody": {
 * "required": true,
 * "content": {
 * "application/json": {
 * "schema": {
 * "type": "object",
 * "properties": {
 * "caption": { "type": "string" },
 * "privacy": { "type": "string", "enum": ["public", "followers", "only_me"] }
 * }
 * }
 * }
 * }
 * },
 * "responses": {
 * "200": { "description": "Post updated successfully." }
 * }
 * },
 * "delete": {
 * "summary": "Delete own post",
 * "tags": ["Posts"],
 * "security": [{ "bearerAuth": [] }],
 * "parameters": [
 * { "in": "path", "name": "postId", "required": true, "schema": { "type": "string", "format": "uuid" } }
 * ],
 * "responses": {
 * "200": { "description": "Deleted successfully." }
 * }
 * }
 * }
 * }
 */
router.get(
  '/:postId',
  validate(postIdParamSchema, 'params'),
  controller.getPost
);

router.put(
  '/:postId',
  validate(postIdParamSchema, 'params'),
  validate(updatePostSchema, 'body'),
  controller.updatePost
);

router.delete(
  '/:postId',
  validate(postIdParamSchema, 'params'),
  controller.deletePost
);

// ─── Likes ────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * {
 * "/posts/{postId}/like": {
 * "post": {
 * "summary": "Like a post",
 * "tags": ["Posts"],
 * "security": [{ "bearerAuth": [] }],
 * "parameters": [
 * { "in": "path", "name": "postId", "required": true, "schema": { "type": "string", "format": "uuid" } }
 * ],
 * "responses": {
 * "200": { "description": "Liked successfully." }
 * }
 * },
 * "delete": {
 * "summary": "Unlike a post",
 * "tags": ["Posts"],
 * "security": [{ "bearerAuth": [] }],
 * "parameters": [
 * { "in": "path", "name": "postId", "required": true, "schema": { "type": "string", "format": "uuid" } }
 * ],
 * "responses": {
 * "200": { "description": "Unliked successfully." }
 * }
 * }
 * }
 * }
 */
router.post(
  '/:postId/like',
  validate(postIdParamSchema, 'params'),
  controller.likePost
);

router.delete(
  '/:postId/like',
  validate(postIdParamSchema, 'params'),
  controller.unlikePost
);

// ─── Comments ─────────────────────────────────────────────────────────────────

/**
 * @swagger
 * {
 * "/posts/{postId}/comments": {
 * "get": {
 * "summary": "Get paginated comments for a post",
 * "tags": ["Posts"],
 * "security": [{ "bearerAuth": [] }],
 * "parameters": [
 * { "in": "path", "name": "postId", "required": true, "schema": { "type": "string", "format": "uuid" } },
 * { "in": "query", "name": "page", "schema": { "type": "integer", "default": 1 } },
 * { "in": "query", "name": "limit", "schema": { "type": "integer", "default": 20 } }
 * ],
 * "responses": {
 * "200": { "description": "Paginated comments returned." }
 * }
 * },
 * "post": {
 * "summary": "Add a comment to a post",
 * "tags": ["Posts"],
 * "security": [{ "bearerAuth": [] }],
 * "parameters": [
 * { "in": "path", "name": "postId", "required": true, "schema": { "type": "string", "format": "uuid" } }
 * ],
 * "requestBody": {
 * "required": true,
 * "content": {
 * "application/json": {
 * "schema": {
 * "type": "object",
 * "required": ["text"],
 * "properties": {
 * "text": { "type": "string", "maxLength": 500 }
 * }
 * }
 * }
 * }
 * },
 * "responses": {
 * "201": { "description": "Comment added successfully." }
 * }
 * }
 * }
 * }
 */
router.get(
  '/:postId/comments',
  validate(postIdParamSchema, 'params'),
  controller.getComments
);

router.post(
  '/:postId/comments',
  validate(postIdParamSchema, 'params'),
  validate(addCommentSchema, 'body'),
  controller.addComment
);

/**
 * @swagger
 * {
 * "/posts/{postId}/comments/{commentId}": {
 * "delete": {
 * "summary": "Delete own comment",
 * "tags": ["Posts"],
 * "security": [{ "bearerAuth": [] }],
 * "parameters": [
 * { "in": "path", "name": "postId", "required": true, "schema": { "type": "string", "format": "uuid" } },
 * { "in": "path", "name": "commentId", "required": true, "schema": { "type": "string", "format": "uuid" } }
 * ],
 * "responses": {
 * "200": { "description": "Comment dropped." }
 * }
 * }
 * }
 * }
 */
router.delete(
  '/:postId/comments/:commentId',
  validate(commentIdParamSchema, 'params'),
  controller.deleteComment
);

// ─── Comment Likes ────────────────────────────────────────────────────────────

/**
 * @swagger
 * {
 * "/posts/{postId}/comments/{commentId}/like": {
 * "post": {
 * "summary": "Like a comment",
 * "tags": ["Posts"],
 * "security": [{ "bearerAuth": [] }],
 * "parameters": [
 * { "in": "path", "name": "postId", "required": true, "schema": { "type": "string", "format": "uuid" } },
 * { "in": "path", "name": "commentId", "required": true, "schema": { "type": "string", "format": "uuid" } }
 * ],
 * "responses": {
 * "200": { "description": "Comment liked." }
 * }
 * },
 * "delete": {
 * "summary": "Unlike a comment",
 * "tags": ["Posts"],
 * "security": [{ "bearerAuth": [] }],
 * "parameters": [
 * { "in": "path", "name": "postId", "required": true, "schema": { "type": "string", "format": "uuid" } },
 * { "in": "path", "name": "commentId", "required": true, "schema": { "type": "string", "format": "uuid" } }
 * ],
 * "responses": {
 * "200": { "description": "Unliked successfully." }
 * }
 * }
 * }
 * }
 */
router.post(
  '/:postId/comments/:commentId/like',
  validate(commentIdParamSchema, 'params'),
  controller.likeComment
);

router.delete(
  '/:postId/comments/:commentId/like',
  validate(commentIdParamSchema, 'params'),
  controller.unlikeComment
);

module.exports = router;