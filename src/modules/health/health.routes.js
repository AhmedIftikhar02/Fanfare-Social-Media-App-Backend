const express = require('express');
const { checkHealth } = require('./health.controller');

const router = express.Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Check service and database health
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service and database are reachable
 */
router.get('/', checkHealth);

module.exports = router;