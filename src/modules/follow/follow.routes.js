const express = require('express');
const controller = require('./follow.controller');
const validate = require('../../middlewares/validate');
const authenticate = require('../../middlewares/authenticate');
const {
  userIdParamSchema,
  followRequestIdParamSchema,
} = require('./follow.validation');

const router = express.Router();

// All follow relationships endpoints require active session tokens
router.use(authenticate);

// ─── Incoming Requests (Must reside above /:userId path blocks) ───────────────

/**
 * @swagger
 * {
 * "/follow/requests": {
 * "get": {
 * "summary": "Get my incoming pending follow requests (for private accounts)",
 * "tags": ["Follow"],
 * "security": [{ "bearerAuth": [] }],
 * "parameters": [
 * { "in": "query", "name": "page", "schema": { "type": "integer", "default": 1 } },
 * { "in": "query", "name": "limit", "schema": { "type": "integer", "default": 20 } }
 * ],
 * "responses": {
 * "200": { "description": "List of pending follow requests with pagination matching profile details" }
 * }
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
 * { "in": "path", "name": "id", "required": true, "schema": { "type": "string", "format": "uuid" }, "description": "Follow request primary key ID" }
 * ],
 * "responses": {
 * "200": { "description": "Request approved successfully" },
 * "403": { "description": "Not authorized to modify this entity" },
 * "404": { "description": "Request context identifier not found" }
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
 * { "in": "path", "name": "id", "required": true, "schema": { "type": "string", "format": "uuid" }, "description": "Follow request primary key ID" }
 * ],
 * "responses": {
 * "200": { "description": "Request rejected successfully" },
 * "403": { "description": "Not authorized to modify this entity" },
 * "404": { "description": "Request context identifier not found" }
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

// ─── Verification Status Utility ─────────────────────────────────────────────

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
 * "responses": {
 * "200": { "description": "Follow status output — none | active | pending | self" }
 * }
 * }
 * }
 * }
 */
router.get(
  '/status/:userId',
  validate(userIdParamSchema, 'params'),
  controller.getFollowStatus
);

// ─── Network Relations Graph lists ───────────────────────────────────────────

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
 * "responses": {
 * "200": { "description": "Paginated array of follower profiles mapping metrics" },
 * "403": { "description": "Private account access restrictions applied" }
 * }
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
 * "responses": {
 * "200": { "description": "Paginated array of target following profiles details" },
 * "403": { "description": "Private account access restrictions applied" }
 * }
 * }
 * }
 * }
 */
router.get(
  '/:userId/following',
  validate(userIdParamSchema, 'params'),
  controller.getFollowing
);

// ─── Mutable Operations (Follow / Unfollow action handles) ─────────────────────

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
 * "201": { "description": "Relationship state built (or state locked to pending if profile is private)" },
 * "400": { "description": "Self operational restrictions matching requester ID identity" },
 * "404": { "description": "Target profile system mapping entity details not found" },
 * "409": { "description": "Active state or pending payload state conflicts duplicate error" }
 * }
 * },
 * "delete": {
 * "summary": "Unfollow a user (or cancel a pending follow request)",
 * "tags": ["Follow"],
 * "security": [{ "bearerAuth": [] }],
 * "parameters": [
 * { "in": "path", "name": "userId", "required": true, "schema": { "type": "string", "format": "uuid" } }
 * ],
 * "responses": {
 * "200": { "description": "Connection dropped and network state counters decremented safely" },
 * "404": { "description": "No active data relationship existing with requested targets" }
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