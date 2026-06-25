// src/modules/search/search.validation.js

const { z } = require('zod');

// Shared base for all search queries
const baseSearchSchema = z.object({
  q:     z.string().min(1, 'Search query cannot be empty').max(100),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  page:  z.coerce.number().int().min(1).default(1),
});

// User search — same as base
const searchUsersSchema = baseSearchSchema;

// Post search — same as base
const searchPostsSchema = baseSearchSchema;

// Hashtag search — same as base
const searchHashtagsSchema = baseSearchSchema;

// Explore grid — no `q`, just pagination
const explorePostsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(30),
  page:  z.coerce.number().int().min(1).default(1),
});

module.exports = {
  searchUsersSchema,
  searchPostsSchema,
  searchHashtagsSchema,
  explorePostsSchema,
};