const { z } = require('zod');

// ─── Create Post ──────────────────────────────────────────────────────────────
const createPostSchema = z.object({
  caption: z.string().max(2200, 'Caption max 2200 characters').optional(),
  privacy: z.enum(['public', 'followers', 'only_me']).default('public'),
});

// ─── Update Post ──────────────────────────────────────────────────────────────
const updatePostSchema = z.object({
  caption: z.string().max(2200).optional(),
  privacy: z.enum(['public', 'followers', 'only_me']).optional(),
}).refine(
  (data) => data.caption !== undefined || data.privacy !== undefined,
  { message: 'Provide at least caption or privacy to update' }
);

// ─── Add Comment ─────────────────────────────────────────────────────────────
const addCommentSchema = z.object({
  text: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(500, 'Comment max 500 characters'),
});

// ─── Params ──────────────────────────────────────────────────────────────────
const postIdParamSchema = z.object({
  postId: z.string().uuid('Invalid post ID'),
});

const commentIdParamSchema = z.object({
  postId: z.string().uuid('Invalid post ID'),
  commentId: z.string().uuid('Invalid comment ID'),
});

const userIdParamSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

module.exports = {
  createPostSchema,
  updatePostSchema,
  addCommentSchema,
  postIdParamSchema,
  commentIdParamSchema,
  userIdParamSchema,
};