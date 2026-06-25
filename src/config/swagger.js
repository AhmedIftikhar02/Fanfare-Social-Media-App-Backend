const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Backend Boilerplate API',
    version: '1.0.0',
    description: 'Production-ready Express + Prisma + Neon backend boilerplate.',
  },
  servers: [{ url: '/api/v1', description: 'Version 1' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string', nullable: true },
          role: { type: 'string', enum: ['USER', 'ADMIN'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      RegisterInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'jane@example.com' },
          password: { type: 'string', minLength: 8, example: 'password123' },
          name: { type: 'string', example: 'Jane Doe' },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'jane@example.com' },
          password: { type: 'string', example: 'password123' },
        },
      },
      RefreshInput: {
        type: 'object',
        required: ['refreshToken'],
        properties: { refreshToken: { type: 'string' } },
      },
      ForgotPasswordInput: {
        type: 'object',
        required: ['email'],
        properties: { email: { type: 'string', format: 'email' } },
      },
      CreateUserInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          name: { type: 'string' },
          role: { type: 'string', enum: ['USER', 'ADMIN'] },
        },
      },
      UpdateUserInput: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          role: { type: 'string', enum: ['USER', 'ADMIN'] },
        },
      },
      UpdateProfileInput: {
        type: 'object',
        properties: { name: { type: 'string' } },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'fail' },
          message: { type: 'string', example: 'Invalid email or password' },
        },
      },
      // ─── ADD NOTIFICATION SCHEMA ───────────────────────────────────────────
      Notification: {
        type: 'object',
        properties: {
          id:        { type: 'string', format: 'uuid' },
          type: {
            type: 'string',
            enum: ['like', 'comment', 'follow', 'follow_request', 'follow_accept', 'comment_like'],
          },
          isRead:    { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          sender: {
            type: 'object',
            nullable: true,
            properties: {
              id:        { type: 'string' },
              username:  { type: 'string' },
              fullName:  { type: 'string', nullable: true },
              avatarUrl: { type: 'string', nullable: true },
            },
          },
          post: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'string' },
              firstMedia: {
                type: 'object',
                nullable: true,
                properties: {
                  mediaUrl:  { type: 'string' },
                  mediaType: { type: 'string', enum: ['image', 'video'] },
                },
              },
            },
          },
          comment: {
            type: 'object',
            nullable: true,
            properties: {
              id:   { type: 'string' },
              text: { type: 'string' },
            },
          },
        },
      },
    },
  },
  tags: [
    { name: 'Health', description: 'Server health check' },
    { name: 'Auth', description: 'Authentication — email/password + Firebase' },
    { name: 'Users', description: 'User profiles, search, settings' },
    { name: 'Follow', description: 'Follow / unfollow, requests, followers & following lists' },
    { name: 'Posts', description: 'Posts feed, likes, comments, comment likes' },
    { name: 'Statuses', description: 'Stories — 24-hour expiring media' },
    { name: 'Sports', description: 'Live football scores and match proxy endpoints (cached layers)' },
    { name: 'News', description: 'Breaking news headlines (proxied from Currents API, cached)' },     
    { name: 'Search', description: 'Search users, posts, and hashtags via GIN indices' },
    { name: 'Notifications', description: 'In-app notification system tracking activities' },
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./src/modules/**/*.routes.js'],
};

module.exports = swaggerJSDoc(options);