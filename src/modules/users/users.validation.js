const { z } = require('zod');

// 1. Update Profile Validation (User)
const updateProfileSchema = z.object({
  fullName: z.string().min(1).max(100).optional(),
  bio: z.string().max(150, 'Bio must be 150 characters or less').optional(),
  websiteUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  location: z.string().max(100).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Provide at least one field to update' }
);

// 2. Update Avatar Validation (User)
const updateAvatarSchema = z.object({
  avatarUrl: z.string().url('Invalid avatar URL'),
});

// 3. Update Privacy Validation (User)
const updatePrivacySchema = z.object({
  isPrivate: z.boolean(),
});

// 4. Create User Validation (Admin CRUD integration)
const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().max(100).optional(),
  role: z.enum(['USER', 'ADMIN']).default('USER'),
});

// 5. Update User Validation (Admin CRUD integration)
const adminUpdateUserSchema = z.object({
  fullName: z.string().max(100).optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Provide at least one field to update' }
);

module.exports = {
  updateProfileSchema,
  updateAvatarSchema,
  updatePrivacySchema,
  createUserSchema,
  adminUpdateUserSchema,
};