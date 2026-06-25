// src/modules/news/news.routes.js

const express      = require('express');
const router       = express.Router();
const authenticate = require('../../middlewares/authenticate');
const validate     = require('../../middlewares/validate');
const { proxyLimiter } = require('../../middlewares/rateLimiter');
const controller   = require('./news.controller');
const { latestNewsQuerySchema } = require('./news.validation');

router.use(authenticate);
router.use(proxyLimiter);

/**
 * @swagger
 * tags:
 *   name: News
 *   description: Breaking news headlines (proxied from Currents API, cached)
 */

/**
 * @swagger
 * /news/latest:
 *   get:
 *     summary: Get latest breaking news headlines
 *     tags: [News]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *           default: en
 *         description: "ISO 639-1 language code (e.g. en, ar, ur)"
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [general, technology, sports, entertainment, business, health, science]
 *         description: "Filter by news category"
 *     responses:
 *       200:
 *         description: Latest news articles (cached up to 15 min)
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
 *                     articles:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           description:
 *                             type: string
 *                             nullable: true
 *                           url:
 *                             type: string
 *                           image:
 *                             type: string
 *                             nullable: true
 *                           published:
 *                             type: string
 *                           author:
 *                             type: string
 *                             nullable: true
 *                           category:
 *                             type: array
 *                             items:
 *                               type: string
 *                     total:
 *                       type: integer
 *                     fromCache:
 *                       type: boolean
 *                     fetchedAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 */
router.get(
  '/latest',
  validate(latestNewsQuerySchema, 'query'),
  controller.getLatestNews
);

module.exports = router;