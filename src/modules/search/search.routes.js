// src/modules/search/search.routes.js

const express      = require('express');
const router       = express.Router();
const authenticate = require('../../middlewares/authenticate');
const validate     = require('../../middlewares/validate');
const { apiLimiter } = require('../../middlewares/rateLimiter');
const controller   = require('./search.controller');
const {
  searchUsersSchema,
  searchPostsSchema,
  searchHashtagsSchema,
  explorePostsSchema,
} = require('./search.validation');

// All search routes require authentication
router.use(authenticate);
// Reuse global api rate limiter (100 req/15min per IP)
router.use(apiLimiter);

/**
 * @swagger
 * tags:
 *   - name: Search
 *     description: Full-text search across users, posts, and hashtags
 *   - name: Explore
 *     description: Public post grid for the Explore screen
 */

/**
 * @swagger
 * /search/users:
 *   get:
 *     summary: Search users by username or full name
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: "Search term (min 1 char, max 100)"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 50
 *     responses:
 *       200:
 *         description: Paginated list of matching users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           username:
 *                             type: string
 *                           fullName:
 *                             type: string
 *                             nullable: true
 *                           avatarUrl:
 *                             type: string
 *                             nullable: true
 *                           isPrivate:
 *                             type: boolean
 *                           followerCount:
 *                             type: integer
 *                           bio:
 *                             type: string
 *                             nullable: true
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'
 */
router.get('/users', validate(searchUsersSchema, 'query'), controller.searchUsers);

/**
 * @swagger
 * /search/posts:
 *   get:
 *     summary: Full-text search posts by caption
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: "Search term — matched against post captions using PostgreSQL full-text search"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 50
 *     responses:
 *       200:
 *         description: Paginated list of matching posts (ordered by relevance then recency)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     posts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           caption:
 *                             type: string
 *                             nullable: true
 *                           likeCount:
 *                             type: integer
 *                           commentCount:
 *                             type: integer
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           authorId:
 *                             type: string
 *                           authorUsername:
 *                             type: string
 *                           authorFullName:
 *                             type: string
 *                             nullable: true
 *                           authorAvatarUrl:
 *                             type: string
 *                             nullable: true
 *                           firstMedia:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               mediaUrl:
 *                                 type: string
 *                               mediaType:
 *                                 type: string
 *                                 enum: [image, video]
 *                           rank:
 *                             type: number
 *                             description: "Full-text relevance score"
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'
 */
router.get('/posts', validate(searchPostsSchema, 'query'), controller.searchPosts);

/**
 * @swagger
 * /search/hashtags:
 *   get:
 *     summary: Search hashtags by name
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: "Hashtag search term (do not include the # symbol)"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 50
 *     responses:
 *       200:
 *         description: Paginated list of matching hashtags (ordered by post count)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     hashtags:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           postCount:
 *                             type: integer
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'
 */
router.get('/hashtags', validate(searchHashtagsSchema, 'query'), controller.searchHashtags);



module.exports = router;