const { z } = require('zod');

const userIdParamSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

const followRequestIdParamSchema = z.object({
  id: z.string().uuid('Invalid follow request ID'),
});

module.exports = {
  userIdParamSchema,
  followRequestIdParamSchema,
};