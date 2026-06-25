// src/modules/statuses/statuses.routes.js

const express = require('express');
const router  = express.Router();

const authenticate = require('../../middlewares/authenticate');
const validate     = require('../../middlewares/validate');
const { uploadStatusMedia, processStatusFile } = require('../../middlewares/upload');

const controller = require('./statuses.controller');
const {
  createStatusSchema,
  statusIdParamSchema,
  viewersQuerySchema,
} = require('./statuses.validation');

// All routes require absolute authentication token layers
router.use(authenticate);

/**
 * @swagger
 * {
 * "/statuses": {
 * "post": {
 * "summary": "Upload a new story status (Single Image or Video)",
 * "tags": ["Statuses"],
 * "security": [{ "bearerAuth": [] }],
 * "requestBody": {
 * "required": true,
 * "content": {
 * "multipart/form-data": {
 * "schema": {
 * "type": "object",
 * "required": ["status"],
 * "properties": {
 * "status": {
 * "type": "string",
 * "format": "binary",
 * "description": "Single image (max 10 MB) or video (max 50 MB)"
 * },
 * "caption": { "type": "string", "maxLength": 500 },
 * "privacy": {
 * "type": "string",
 * "enum": ["public", "followers", "only_me"],
 * "default": "public"
 * }
 * }
 * }
 * }
 * }
 * },
 * "responses": {
 * "201": { "description": "Story created successfully" },
 * "400": { "description": "Validation error or missing file boundary" }
 * }
 * }
 * }
 * }
 */
router.post(
  '/',
  uploadStatusMedia,
  processStatusFile,
  validate(createStatusSchema, 'body'),
  controller.createStatus
);

/**
 * @swagger
 * {
 * "/statuses/feed": {
 * "get": {
 * "summary": "Get story feed grouped chronologically by user tiers",
 * "tags": ["Statuses"],
 * "security": [{ "bearerAuth": [] }],
 * "responses": {
 * "200": { "description": "Array payload of active user story collections" }
 * }
 * }
 * }
 * }
 */
router.get('/feed', controller.getStatusFeed);

/**
 * @swagger
 * {
 * "/statuses/{statusId}": {
 * "get": {
 * "summary": "View a single story status (Records metric view trace automated)",
 * "tags": ["Statuses"],
 * "security": [{ "bearerAuth": [] }],
 * "parameters": [
 * {
 * "in": "path",
 * "name": "statusId",
 * "required": true,
 * "schema": { "type": "string", "format": "uuid" }
 * }
 * ],
 * "responses": {
 * "200": { "description": "Story data mapped payload" },
 * "404": { "description": "Not found node or story lifetime expired" }
 * }
 * },
 * "delete": {
 * "summary": "Delete own profile story status and media file sync",
 * "tags": ["Statuses"],
 * "security": [{ "bearerAuth": [] }],
 * "parameters": [
 * {
 * "in": "path",
 * "name": "statusId",
 * "required": true,
 * "schema": { "type": "string", "format": "uuid" }
 * }
 * ],
 * "responses": {
 * "200": { "description": "Story explicitly deleted" },
 * "403": { "description": "Forbidden context access structural limit" },
 * "404": { "description": "Target story reference not found" }
 * }
 * }
 * }
 * }
 */
router.get(
  '/:statusId',
  validate(statusIdParamSchema, 'params'),
  controller.viewStatus
);

router.delete(
  '/:statusId',
  validate(statusIdParamSchema, 'params'),
  controller.deleteStatus
);

/**
 * @swagger
 * {
 * "/statuses/{statusId}/viewers": {
 * "get": {
 * "summary": "Get viewers log array of a story context (Owner Authorization Tier Only)",
 * "tags": ["Statuses"],
 * "security": [{ "bearerAuth": [] }],
 * "parameters": [
 * {
 * "in": "path",
 * "name": "statusId",
 * "required": true,
 * "schema": { "type": "string", "format": "uuid" }
 * },
 * {
 * "in": "query",
 * "name": "page",
 * "schema": { "type": "integer", "default": 1 }
 * },
 * {
 * "in": "query",
 * "name": "limit",
 * "schema": { "type": "integer", "default": 30 }
 * }
 * ],
 * "responses": {
 * "200": { "description": "Paginated response dictionary array returned" },
 * "403": { "description": "Forbidden interaction query limits rule broken" }
 * }
 * }
 * }
 * }
 */
router.get(
  '/:statusId/viewers',
  validate(statusIdParamSchema, 'params'),
  validate(viewersQuerySchema, 'query'),
  controller.getStatusViewers
);

module.exports = router;