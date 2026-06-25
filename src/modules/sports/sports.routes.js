// src/modules/sports/sports.routes.js

const express      = require('express');
const router       = express.Router();
const authenticate = require('../../middlewares/authenticate');
const validate     = require('../../middlewares/validate');
const { proxyLimiter } = require('../../middlewares/rateLimiter');
const controller   = require('./sports.controller');
const { todayQuerySchema } = require('./sports.validation');

// All sports proxy endpoints require user token authentication
router.use(authenticate);

// Apply dedicated proxy-specific rate limiting window
router.use(proxyLimiter);

/**
 * @swagger
 * tags:
 *   name: Sports
 *   description: Live football scores and match proxy endpoints (cached layers)
 */

/**
 * @swagger
 * /sports/football/live:
 *   get:
 *     summary: Get live football matches right now
 *     tags: [Sports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active live matches (cached up to 60s)
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
 *                     matches:
 *                       type: array
 *                       items:
 *                         type: object
 *                     total:
 *                       type: integer
 *                       example: 5
 *                     fromCache:
 *                       type: boolean
 *                       example: false
 *                     fetchedAt:
 *                       type: string
 *                       format: date-time
 */
router.get('/football/live', controller.getLiveMatches);


module.exports = router;