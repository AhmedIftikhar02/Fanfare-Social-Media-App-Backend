
const { z } = require('zod');

// ─── Create Status ────────────────────────────────────────────────────────────
const createStatusSchema = z.object({
  caption: z.string().max(500, 'Caption max 500 characters').optional(),
  privacy: z.enum(['public', 'followers', 'only_me']).default('public'),
});

// ─── Params ──────────────────────────────────────────────────────────────────
const statusIdParamSchema = z.object({
  statusId: z.string().uuid('Invalid status ID'),
});

// ─── Viewers Query ────────────────────────────────────────────────────────────
const viewersQuerySchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

module.exports = {
  createStatusSchema,
  statusIdParamSchema,
  viewersQuerySchema,
};