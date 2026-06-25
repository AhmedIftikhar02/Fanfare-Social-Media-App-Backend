// src/modules/news/news.validation.js

const { z } = require('zod');

const latestNewsQuerySchema = z.object({
  language: z.string().length(2).default('en'), // ISO 639-1 language code logic
  category: z
    .enum(['general', 'technology', 'sports', 'entertainment', 'business', 'health', 'science'])
    .optional(),
}).catchall(z.any()); // Prevents strict failures on extra meta query strings

module.exports = { latestNewsQuerySchema };