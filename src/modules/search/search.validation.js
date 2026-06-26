// src/modules/search/search.validation.js

const { z } = require('zod');

const baseSearchSchema = z.object({
  q:     z.string().min(1, 'Search query cannot be empty').max(100),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  page:  z.coerce.number().int().min(1).default(1),
});

const searchUsersSchema    = baseSearchSchema;
const searchPostsSchema    = baseSearchSchema;
const searchHashtagsSchema = baseSearchSchema;

const explorePostsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(30),
  page:  z.coerce.number().int().min(1).default(1),
});

const hashtagNameParamSchema = z.object({
  name: z
    .string()
    .min(1, 'Hashtag name cannot be empty')
    .max(100)
    .transform((val) => val.replace(/^#/, '').toLowerCase()),
});

const hashtagPostsQuerySchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

module.exports = {
  searchUsersSchema,
  searchPostsSchema,
  searchHashtagsSchema,
  explorePostsSchema,
  hashtagNameParamSchema,
  hashtagPostsQuerySchema,
};