// src/modules/follow/follow.routes.js

const express    = require('express');
const controller = require('./follow.controller');
const validate   = require('../../middlewares/validate');
const authenticate = require('../../middlewares/authenticate');
const { apiLimiter, pollLimiter } = require('../../middlewares/rateLimiter');
const {
  userIdParamSchema,
  followRequestIdParamSchema,
} = require('./follow.validation');

const router = express.Router();
router.use(authenticate);
router.use(apiLimiter);

// ─── Incoming Requests (must be above /:userId) ───────────────────────────────

/**
 * @swagger
 * {
 * "/follow/requests": {
 * "get": {
 * "summary": "Get my incoming pending follow requests",
 * "tags": ["Follow"],
 * "security": [{ "bearerAuth": [] }],
 * "parameters": [
 * { "in": "query", "name": "page", "schema": { "type": "integer", "default": 1 } },
 * { "in": "query", "name": "limit", "schema": { "type": "integer", "default": 20 } }
 * ],
 * "responses": { "200": { "description": "List of pending follow requests" } }
 * }
 * }
 * }
 */
router.get('/requests', controller.getFollowRequests);

/**
 * @swagger
 * {
 * "/follow/requests/{id}/approve": {
 * "put": {
 * "summary": "Approve a follow request",
 * "tags": ["Follow"],
 * "security": [{ "bearerAuth": [] }],
 * "parameters": [
 * { "in": "path", "name": "id", "required": true, "schema": { "type": "string", "format": "uuid" } }
 * ],
 * "responses": {
 * "200": { "description": "Request approved" },
 * "403": { "description": "Not authorized" },
 * "404": { "description": "Not found" }
 * }
 * }
 * }
 * }
 */
router.put(
  '/requests/:id/approve',
  validate(followRequestIdParamSchema, 'params'),
  controller.approveFollowRequest
);

/**
 * @swagger
 * {
 * "/follow/requests/{id}/reject": {
 * "put": {
 * "summary": "Reject a follow request",
 * "tags": ["Follow"],
 * "security": [{ "bearerAuth": [] }],
 * "parameters": [
 * { "in": "path", "name": "id", "required": true, "schema": { "type": "string", "format": "uuid" } }
 * ],
 * "responses": {
 * "200": { "description": "Request rejected" },
 * "403": { "description": "Not authorized" },
 * "404": { "description": "Not found" }
 * }
 * }
 * }
 * }
 */
router.put(
  '/requests/:id/reject',
  validate(followRequestIdParamSchema, 'params'),
  controller.rejectFollowRequest
);

// ─── Status Check ─────────────────────────────────────────────────────────────

/**
 * @swagger
 * {
 * "/follow/status/{userId}": {
 * "get": {
 * "summary": "Check follow relationship status with a user",
 * "tags": ["Follow"],
 * "security": [{ "bearerAuth": [] }],
 * "parameters": [
 * { "in": "path", "name": "userId", "required": true, "schema": { "type": "string", "format": "uuid" } }
 * ],
 * "responses": { "200": { "description": "Status: none | active | pending | self" } }
 * }
 * }
 * }
 */
router.get(
  '/status/:userId',
  pollLimiter, 
  validate(userIdParamSchema, 'params'),
  controller.getFollowStatus
);

// ─── Follower / Following Lists ───────────────────────────────────────────────

/**
 * @swagger
 * {
 * "/follow/{userId}/followers": {
 * "get": {
 * "summary": "Get followers list of a user",
 * "tags": ["Follow"],
 * "security": [{ "bearerAuth": [] }],
 * "parameters": [
 * { "in": "path", "name": "userId", "required": true, "schema": { "type": "string", "format": "uuid" } },
 * { "in": "query", "name": "page", "schema": { "type": "integer", "default": 1 } },
 * { "in": "query", "name": "limit", "schema": { "type": "integer", "default": 20 } }
 * ],
 * "responses": { "200": { "description": "Paginated followers" } }
 * }
 * }
 * }
 */
router.get(
  '/:userId/followers',
  validate(userIdParamSchema, 'params'),
  controller.getFollowers
);

/**
 * @swagger
 * {
 * "/follow/{userId}/following": {
 * "get": {
 * "summary": "Get following list of a user",
 * "tags": ["Follow"],
 * "security": [{ "bearerAuth": [] }],
 * "parameters": [
 * { "in": "path", "name": "userId", "required": true, "schema": { "type": "string", "format": "uuid" } },
 * { "in": "query", "name": "page", "schema": { "type": "integer", "default": 1 } },
 * { "in": "query", "name": "limit", "schema": { "type": "integer", "default": 20 } }
 * ],
 * "responses": { "200": { "description": "Paginated following" } }
 * }
 * }
 * }
 */
router.get(
  '/:userId/following',
  validate(userIdParamSchema, 'params'),
  controller.getFollowing
);

// ─── Follow / Unfollow ────────────────────────────────────────────────────────

/**
 * @swagger
 * {
 * "/follow/{userId}": {
 * "post": {
 * "summary": "Follow a user",
 * "tags": ["Follow"],
 * "security": [{ "bearerAuth": [] }],
 * "parameters": [
 * { "in": "path", "name": "userId", "required": true, "schema": { "type": "string", "format": "uuid" } }
 * ],
 * "responses": {
 * "201": { "description": "Followed (or request sent if private)" },
 * "400": { "description": "Cannot follow yourself" },
 * "404": { "description": "User not found" },
 * "409": { "description": "Already following or request pending" }
 * }
 * },
 * "delete": {
 * "summary": "Unfollow a user or cancel pending request",
 * "tags": ["Follow"],
 * "security": [{ "bearerAuth": [] }],
 * "parameters": [
 * { "in": "path", "name": "userId", "required": true, "schema": { "type": "string", "format": "uuid" } }
 * ],
 * "responses": {
 * "200": { "description": "Unfollowed" },
 * "404": { "description": "Not following this user" }
 * }
 * }
 * }
 * }
 */
router.post(
  '/:userId',
  validate(userIdParamSchema, 'params'),
  controller.followUser
);

router.delete(
  '/:userId',
  validate(userIdParamSchema, 'params'),
  controller.unfollowUser
);

module.exports = router;