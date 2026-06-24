const express = require('express');
const controller = require('./users.controller');
const validate = require('../../middlewares/validate');
const authenticate = require('../../middlewares/authenticate');
const authorize = require('../../middlewares/authorize');
const {
  updateProfileSchema,
  updateAvatarSchema,
  updatePrivacySchema,
  createUserSchema,
  adminUpdateUserSchema,
} = require('./users.validation');

const router = express.Router();

// All user routes require a valid access token
router.use(authenticate);

// ─── Own Profile ──────────────────────────────────────────────────────────────

/**
 * @swagger
 * {
 * "/users/me": {
 * "get": {
 * "summary": "Get own full profile",
 * "tags": ["Users"],
 * "security": [{ "bearerAuth": [] }],
 * "responses": {
 * "200": { "description": "Current user object" }
 * }
 * },
 * "put": {
 * "summary": "Update own profile (name, bio, website, location)",
 * "tags": ["Users"],
 * "security": [{ "bearerAuth": [] }],
 * "requestBody": {
 * "required": true,
 * "content": {
 * "application/json": {
 * "schema": {
 * "type": "object",
 * "properties": {
 * "fullName": { "type": "string", "example": "Ahmed Iftikhar" },
 * "bio": { "type": "string", "maxLength": 150, "example": "Android & Backend Developer" },
 * "websiteUrl": { "type": "string", "example": "https://github.com" },
 * "location": { "type": "string", "example": "Pakistan" }
 * }
 * }
 * }
 * }
 * },
 * "responses": {
 * "200": { "description": "Updated user object" }
 * }
 * },
 * "delete": {
 * "summary": "Delete own account (permanent)",
 * "tags": ["Users"],
 * "security": [{ "bearerAuth": [] }],
 * "responses": {
 * "204": { "description": "Account deleted successfully" }
 * }
 * }
 * }
 * }
 */
router.get('/me', controller.getMe);
router.put('/me', validate(updateProfileSchema), controller.updateProfile);
router.delete('/me', controller.deleteMe);

/**
 * @swagger
 * {
 * "/users/me/avatar": {
 * "put": {
 * "summary": "Update avatar URL",
 * "tags": ["Users"],
 * "security": [{ "bearerAuth": [] }],
 * "requestBody": {
 * "required": true,
 * "content": {
 * "application/json": {
 * "schema": {
 * "type": "object",
 * "required": ["avatarUrl"],
 * "properties": {
 * "avatarUrl": { "type": "string", "example": "https://example.com/avatar.jpg" }
 * }
 * }
 * }
 * }
 * },
 * "responses": {
 * "200": { "description": "Updated user object with new avatar" }
 * }
 * }
 * }
 * }
 */
router.put('/me/avatar', validate(updateAvatarSchema), controller.updateAvatar);

/**
 * @swagger
 * {
 * "/users/me/privacy": {
 * "put": {
 * "summary": "Toggle public / private account",
 * "tags": ["Users"],
 * "security": [{ "bearerAuth": [] }],
 * "requestBody": {
 * "required": true,
 * "content": {
 * "application/json": {
 * "schema": {
 * "type": "object",
 * "required": ["isPrivate"],
 * "properties": {
 * "isPrivate": { "type": "boolean", "example": true }
 * }
 * }
 * }
 * }
 * },
 * "responses": {
 * "200": { "description": "Updated user privacy preference" }
 * }
 * }
 * }
 * }
 */
router.put('/me/privacy', validate(updatePrivacySchema), controller.updatePrivacy);

// ─── Search (Placed before /:username to prevent route clashing) ──────────────

/**
 * @swagger
 * {
 * "/users/search": {
 * "get": {
 * "summary": "Search users by username or name",
 * "tags": ["Users"],
 * "security": [{ "bearerAuth": [] }],
 * "parameters": [
 * { "in": "query", "name": "q", "required": true, "schema": { "type": "string" }, "description": "Search query text" },
 * { "in": "query", "name": "page", "schema": { "type": "integer", "default": 1 } },
 * { "in": "query", "name": "limit", "schema": { "type": "integer", "default": 20 } }
 * ],
 * "responses": {
 * "200": { "description": "List of matching users with pagination meta" }
 * }
 * }
 * }
 * }
 */
router.get('/search', controller.searchUsers);

// ─── Public Profile ───────────────────────────────────────────────────────────

/**
 * @swagger
 * {
 * "/users/{username}": {
 * "get": {
 * "summary": "Get public profile by username",
 * "tags": ["Users"],
 * "security": [{ "bearerAuth": [] }],
 * "parameters": [
 * { "in": "path", "name": "username", "required": true, "schema": { "type": "string" }, "description": "Target profile username" }
 * ],
 * "responses": {
 * "200": { "description": "User profile data returned" },
 * "404": { "description": "User not found" }
 * }
 * }
 * }
 * }
 */
router.get('/:username', controller.getByUsername);

// ─── Admin Routes (Strict Admin Role Access) ───────────────────────────────────

router.use(authorize('ADMIN'));

/**
 * @swagger
 * {
 * "/users/admin/create": {
 * "post": {
 * "summary": "Create a new user (Admin Only)",
 * "tags": ["Users - Admin"],
 * "security": [{ "bearerAuth": [] }],
 * "requestBody": {
 * "required": true,
 * "content": {
 * "application/json": {
 * "schema": {
 * "type": "object",
 * "required": ["email", "password"],
 * "properties": {
 * "email": { "type": "string", "example": "admin_created@example.com" },
 * "password": { "type": "string", "example": "Password123" },
 * "fullName": { "type": "string", "example": "John Doe" },
 * "role": { "type": "string", "enum": ["USER", "ADMIN"], "default": "USER" }
 * }
 * }
 * }
 * }
 * },
 * "responses": {
 * "201": { "description": "User account provisioned" }
 * }
 * }
 * }
 * }
 */
router.post('/', validate(createUserSchema), controller.createUser);
router.get('/', controller.listUsers);
router.get('/id/:id', controller.getUserById);
router.patch('/id/:id', validate(adminUpdateUserSchema), controller.adminUpdateUser);
router.delete('/id/:id', controller.adminDeleteUser);

module.exports = router;