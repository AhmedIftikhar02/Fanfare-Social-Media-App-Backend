# Backend Boilerplate — Express + Prisma + Neon PostgreSQL

A production-ready, feature-based backend boilerplate built with **Express.js**, **Prisma ORM**, and **Neon PostgreSQL**. Clone this repository and start writing business logic immediately — all the infrastructure, security, authentication, and conventions are already in place.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Complete Folder Structure](#3-complete-folder-structure)
4. [Environment Setup](#4-environment-setup)
5. [Neon Database Setup](#5-neon-database-setup)
6. [Prisma Setup](#6-prisma-setup)
7. [Installation & Running the Project](#7-installation--running-the-project)
8. [Database Migrations](#8-database-migrations)
9. [Authentication Flow](#9-authentication-flow)
10. [API Structure & Endpoints](#10-api-structure--endpoints)
11. [Swagger Documentation](#11-swagger-documentation)
12. [Security Features](#12-security-features)
13. [Logging](#13-logging)
14. [Error Handling](#14-error-handling)
15. [Validation](#15-validation)
16. [Role-Based Access Control](#16-role-based-access-control)
17. [How to Add a New Module](#17-how-to-add-a-new-module)
18. [How to Add a New API to an Existing Module](#18-how-to-add-a-new-api-to-an-existing-module)
19. [How to Add a New Database Table](#19-how-to-add-a-new-database-table)
20. [How to Add Middleware](#20-how-to-add-middleware)
21. [How to Add a New Guard (Protect a Route)](#21-how-to-add-a-new-guard-protect-a-route)
22. [How to Add a New Validator](#22-how-to-add-a-new-validator)
23. [How to Add a Utility Function](#23-how-to-add-a-utility-function)
24. [Package.json Scripts](#24-packagejson-scripts)
25. [Docker](#25-docker)
26. [Deployment](#26-deployment)
27. [Git Strategy](#27-git-strategy)
28. [Coding Standards](#28-coding-standards)
29. [Common Mistakes to Avoid](#29-common-mistakes-to-avoid)
30. [Future Improvements](#30-future-improvements)
31. [Developer Notes](#31-developer-notes)

---

## 1. Project Overview

This boilerplate is the answer to: *"I need to start a new backend project — what do I build first?"*

The answer is always the same: auth, users, security headers, rate limiting, logging, error handling, database connection, validation, API docs. This boilerplate ships all of that pre-built and pre-wired so you never write it again.

**What this is:**
- A cloneable starting point for any REST API project
- Production-grade from day one — not a tutorial codebase that needs hardening before deployment
- Feature-based and modular — adding a new feature means adding one new folder, not touching existing code
- Fully documented at `/api-docs` (Swagger UI) so frontend developers can start integrating immediately

**What this is not:**
- A framework — it is plain Express with deliberate conventions applied
- A microservices template — it is a single monolithic Express server designed to be the backend for a mobile or web application

---

## 2. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Runtime | Node.js (v20 LTS) | JavaScript runtime |
| Framework | Express.js | HTTP server and routing |
| Database | Neon PostgreSQL | Serverless, branch-based Postgres |
| ORM | Prisma | Type-safe database client and migrations |
| Authentication | JSON Web Tokens (jsonwebtoken) | Access and refresh token issuance |
| Password Hashing | bcryptjs | Secure password storage |
| Validation | Zod | Schema-based request body validation |
| Sanitization | xss | Strip malicious HTML from input |
| Security Headers | Helmet | Sets 15+ HTTP security headers automatically |
| CORS | cors | Controls which frontend origins can call the API |
| Rate Limiting | express-rate-limit | Prevents brute force and abuse |
| Logging | Winston + Morgan | Structured app logging + HTTP request logging |
| API Docs | swagger-jsdoc + swagger-ui-express | Interactive OpenAPI 3.0 documentation |
| Environment | dotenv | Loads `.env` variables at runtime |

---

## 3. Complete Folder Structure

```
backend-boilerplate/
│
├── prisma/
│   ├── schema.prisma              # Database schema — all models and relations defined here
│   └── migrations/                # Auto-generated SQL migration files (committed to git)
│
├── logs/                          # Runtime log files written by Winston (git-ignored)
│   ├── error.log                  # Error-level logs only
│   └── combined.log               # All log levels
│
├── src/
│   │
│   ├── config/
│   │   ├── index.js               # Central typed config — reads process.env and exports a config object
│   │   ├── logger.js              # Winston logger instance — import this everywhere you need to log
│   │   └── swagger.js             # OpenAPI spec definition — reusable schemas and security schemes
│   │
│   ├── database/
│   │   └── prisma.js              # Singleton PrismaClient instance — import this to query the database
│   │
│   ├── middlewares/
│   │   ├── authenticate.js        # JWT guard — verifies Bearer token, attaches req.user
│   │   ├── authorize.js           # Roles guard — restricts route to specific roles e.g. authorize('ADMIN')
│   │   ├── errorHandler.js        # Global error handler — catches all errors, sends consistent JSON response
│   │   ├── notFoundHandler.js     # 404 handler — catches requests to undefined routes
│   │   ├── rateLimiter.js         # Rate limiting — apiLimiter (global) and authLimiter (strict, for auth routes)
│   │   ├── requestLogger.js       # Morgan HTTP request logger — routes through Winston
│   │   ├── sanitize.js            # XSS sanitizer — strips HTML tags from all request body and query fields
│   │   └── validate.js            # Zod validation runner — takes a Zod schema, validates req.body against it
│   │
│   ├── utils/
│   │   ├── AppError.js            # Custom error class — throw new AppError('message', statusCode)
│   │   ├── catchAsync.js          # Async error wrapper — wraps async route handlers so errors go to next()
│   │   ├── hashToken.js           # SHA-256 token hasher — used to hash refresh tokens before DB storage
│   │   ├── jwt.js                 # JWT helpers — signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken
│   │   ├── paginate.js            # Pagination helpers — getPagination(query) and buildPaginationMeta()
│   │   └── password.js            # Password helpers — hashPassword(plain) and comparePassword(plain, hash)
│   │
│   ├── modules/
│   │   │
│   │   ├── health/
│   │   │   ├── health.controller.js   # Queries DB for user count, returns status + timestamp
│   │   │   └── health.routes.js       # GET / → health.controller.checkHealth (with Swagger annotation)
│   │   │
│   │   ├── auth/
│   │   │   ├── auth.controller.js     # Thin layer — calls auth.service, sends HTTP response
│   │   │   ├── auth.routes.js         # Defines /register /login /refresh /logout /forgot-password /me
│   │   │   ├── auth.service.js        # All auth business logic — token generation, hashing, DB queries
│   │   │   └── auth.validation.js     # Zod schemas for register, login, refresh, forgotPassword inputs
│   │   │
│   │   └── users/
│   │       ├── users.controller.js    # Thin layer — calls users.service, sends HTTP response
│   │       ├── users.routes.js        # Self-service routes (/me) + admin CRUD routes with layered guards
│   │       ├── users.service.js       # User CRUD business logic — sanitizes output, uses paginate util
│   │       └── users.validation.js    # Zod schemas for createUser, updateUser, updateProfile inputs
│   │
│   ├── routes/
│   │   └── index.js               # Aggregates all module routers — single import point for app.js
│   │
│   └── app.js                     # Express app setup — middleware stack, routes, error handlers mounted here
│
├── server.js                      # Entry point — binds the app to a port and starts listening
├── .env                           # Local environment variables (never committed to git)
├── .env.example                   # Template showing every required variable with placeholder values
├── .gitignore                     # Excludes node_modules, .env, logs/, prisma/generated/
└── package.json                   # Dependencies, scripts, project metadata
```

---

## 4. Environment Setup

Create a `.env` file in the project root. Never commit this file. Use `.env.example` as the template.

```env
# ─── Server ────────────────────────────────────────────────────────────────────
PORT=3000
NODE_ENV=development              # development | production

# ─── Database ──────────────────────────────────────────────────────────────────
# Pooled connection — used by the app at runtime (goes through PgBouncer)
DATABASE_URL="postgresql://user:password@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_limit=1"

# Direct connection — used by Prisma migrate (must bypass the pooler)
DIRECT_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"

# ─── JWT ───────────────────────────────────────────────────────────────────────
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_ACCESS_SECRET=your-access-token-secret-here
JWT_ACCESS_EXPIRES_IN=15m

JWT_REFRESH_SECRET=your-refresh-token-secret-here        # Must be different from access secret
JWT_REFRESH_EXPIRES_IN=7d

# ─── CORS ──────────────────────────────────────────────────────────────────────
# Comma-separated list of allowed frontend origins
CORS_ORIGIN=http://localhost:5173
```

**Generating secrets** — run this command twice to get two different secrets, one for access tokens and one for refresh tokens:

```cmd
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Environment behaviour:**

| Variable | Development | Production |
|---|---|---|
| `NODE_ENV` | `development` | `production` |
| Log format | Colored single-line | Structured JSON |
| Log destination | Console only | Console + `logs/` files |
| Error response | Full message | Generic message for unexpected errors |

---

## 5. Neon Database Setup

Neon is a branch-based serverless Postgres platform. Think of branches like Git branches but for your database — you get an isolated copy of your schema to develop against, with no risk of corrupting production data.

**Step by step:**

1. Go to [neon.tech](https://neon.tech) and create an account (GitHub or Google sign-in)
2. Create a **Project** — Neon automatically creates a `main` (or `production`) branch and a default database named `neondb`
3. Go to the **Branches** tab and create a `development` branch off `main` — use this for all local development
4. Go to **Dashboard → Connection Details**, select your `development` branch
5. Copy both the **Pooled** and **Direct** connection strings into your `.env`

**Why two connection strings:**

- **Pooled** (`DATABASE_URL`) — routes through PgBouncer, Neon's connection pooler. Handles traffic spikes gracefully. Your app uses this at runtime.
- **Direct** (`DIRECT_URL`) — a raw TCP connection straight to Postgres. Required for `prisma migrate` because migration DDL commands need a real, non-pooled session.

**SSL:** Both strings must contain `sslmode=require`. Neon rejects unencrypted connections entirely.

---

## 6. Prisma Setup

Prisma has two separate concepts that are easy to mix up:

- **Prisma Client** — the generated, type-safe query builder your code imports (`const prisma = require('./database/prisma')`). Auto-regenerated whenever you run a migration.
- **Migrations** — SQL files in `prisma/migrations/` describing what changed in your schema. Tracked in git like source code.

**Key commands:**

```cmd
# Apply pending migrations AND regenerate the client (use during development)
npx prisma migrate dev --name description-of-what-changed

# Apply pending migrations WITHOUT regenerating (use in production/CI)
npx prisma migrate deploy

# Regenerate the Prisma Client without running a migration (use after git clone + npm install)
npx prisma generate

# Open a local GUI browser to inspect and edit your database directly
npx prisma studio

# Reset the database — drops everything and re-applies all migrations (development only)
npx prisma migrate reset
```

**Schema location:** `prisma/schema.prisma`

The `datasource` block controls the database connection. The `generator` block controls what Prisma generates (the TypeScript/JS client). Every `model` block becomes a database table.

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // pooled — used at runtime
  directUrl = env("DIRECT_URL")     // direct — used by migrate
}

generator client {
  provider = "prisma-client-js"
}
```

---

## 7. Installation & Running the Project

**Prerequisites:** Node.js v18 or higher (v20 LTS recommended)

```cmd
# 1. Clone the repository
git clone https://github.com/your-username/backend-boilerplate.git
cd backend-boilerplate

# 2. Install dependencies
npm install

# 3. Copy the environment template and fill in your values
copy .env.example .env

# 4. Generate the Prisma Client (required after every fresh clone)
npx prisma generate

# 5. Apply all database migrations
npx prisma migrate deploy

# 6. Start the development server (with auto-restart on file changes)
npm run dev
```

**Verify it is working:**

```cmd
curl http://localhost:3000/api/v1/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "userCount": 0,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Open the API docs: `http://localhost:3000/api-docs`

---

## 8. Database Migrations

Every change to `prisma/schema.prisma` requires a migration to update the actual database.

**Development workflow:**

```cmd
# 1. Edit prisma/schema.prisma (add a model, add a field, etc.)

# 2. Create and apply the migration
npx prisma migrate dev --name what-you-changed

# 3. Prisma regenerates the client automatically — no extra step needed
```

**Production workflow:**

```cmd
# Never run migrate dev in production — it can reset data
# Use migrate deploy instead — it only applies pending migrations, never resets
npx prisma migrate deploy
```

**Migration naming convention:**

```cmd
npx prisma migrate dev --name add_posts_table
npx prisma migrate dev --name add_avatar_to_users
npx prisma migrate dev --name remove_reset_token_from_users
```

Migrations are committed to git. Every team member and every environment gets the exact same schema history.

---

## 9. Authentication Flow

This boilerplate uses a **dual-token** pattern: a short-lived access token for API requests and a long-lived refresh token for obtaining new access tokens without re-entering credentials.

### Registration

```
POST /api/v1/auth/register
Body: { email, password, name? }

→ Validates input with Zod
→ Checks email is not already registered
→ Hashes password with bcrypt (12 salt rounds)
→ Creates user in DB
→ Issues access token (15m) + refresh token (7d)
→ Stores SHA-256 hash of refresh token in refresh_tokens table
→ Returns: { user (no password), accessToken, refreshToken }
```

### Login

```
POST /api/v1/auth/login
Body: { email, password }

→ Validates input
→ Finds user by email
→ Compares submitted password against stored bcrypt hash
→ Issues new access token + refresh token
→ Stores hash of refresh token in DB
→ Returns: { user, accessToken, refreshToken }
```

### Using the Access Token

All protected endpoints require this header:

```
Authorization: Bearer <accessToken>
```

The `authenticate` middleware verifies the token signature and expiry, then attaches `req.user = { id, role }` for downstream handlers.

### Refreshing Tokens

```
POST /api/v1/auth/refresh
Body: { refreshToken }

→ Verifies refresh token signature
→ Hashes the submitted token and looks it up in refresh_tokens table
→ Checks it has not been revoked (revokedAt is null) and has not expired
→ Revokes the used token (sets revokedAt = now) — this is token rotation
→ Issues a brand new access token + refresh token pair
→ Returns: { accessToken, refreshToken }
```

**Token rotation** means each refresh token can only be used once. If a stolen refresh token is used, the legitimate user's next refresh attempt will fail (the token was already rotated), alerting them to re-authenticate.

### Logout

```
POST /api/v1/auth/logout
Body: { refreshToken }

→ Hashes the submitted token
→ Sets revokedAt = now in the DB
→ The access token expires naturally after 15 minutes
```

### Forgot Password

```
POST /api/v1/auth/forgot-password
Body: { email }

→ Looks up user by email
→ If not found, returns success anyway (never reveal whether an email exists)
→ Generates a random 32-byte reset token
→ Stores SHA-256 hash of token + expiry (15 minutes) on the user record
→ Logs the raw token to console (wire up an email provider like Resend or SendGrid here)
```

### Token Security Design

| Decision | Reason |
|---|---|
| Access tokens expire in 15 minutes | Limits damage window if a token is stolen |
| Refresh tokens stored as SHA-256 hashes | A database leak cannot be used to forge sessions |
| Separate JWT secrets for access and refresh | Compromise of one secret does not compromise the other |
| Refresh token rotation on every use | Detects token theft — a reused token invalidates the session |
| Role baked into JWT payload | Role checks happen without a DB query on every request |
| Role changes require re-login | A promoted user needs a fresh token to see new permissions |

---

## 10. API Structure & Endpoints

All endpoints are prefixed with `/api/v1`.

### Health

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/health` | None | Returns server status and DB connection state |

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | None | Create a new user account |
| POST | `/api/v1/auth/login` | None | Log in, receive token pair |
| POST | `/api/v1/auth/refresh` | None | Exchange refresh token for new token pair |
| POST | `/api/v1/auth/logout` | None | Revoke a refresh token |
| POST | `/api/v1/auth/forgot-password` | None | Request a password reset token |
| GET | `/api/v1/auth/me` | Bearer | Get the current user's profile |

### Users

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| PATCH | `/api/v1/users/me` | Bearer | Any | Update own profile (name only) |
| DELETE | `/api/v1/users/me` | Bearer | Any | Delete own account |
| POST | `/api/v1/users` | Bearer | ADMIN | Create a user |
| GET | `/api/v1/users` | Bearer | ADMIN | List all users (paginated) |
| GET | `/api/v1/users/:id` | Bearer | ADMIN | Get a single user by ID |
| PATCH | `/api/v1/users/:id` | Bearer | ADMIN | Update any user |
| DELETE | `/api/v1/users/:id` | Bearer | ADMIN | Delete any user |

### Standard Response Format

**Success:**
```json
{
  "status": "success",
  "data": { }
}
```

**Error:**
```json
{
  "status": "fail",
  "message": "Human-readable description of what went wrong"
}
```

**Paginated list:**
```json
{
  "status": "success",
  "data": {
    "users": [ ],
    "meta": {
      "page": 1,
      "limit": 20,
      "totalItems": 45,
      "totalPages": 3
    }
  }
}
```

### Pagination Query Parameters

Any list endpoint accepts:

```
GET /api/v1/users?page=2&limit=10
```

| Parameter | Default | Max | Description |
|---|---|---|---|
| `page` | 1 | — | Page number |
| `limit` | 20 | 100 | Items per page |

---

## 11. Swagger Documentation

Interactive API documentation is available at:

```
http://localhost:3000/api-docs
```

**Testing protected endpoints from the docs page:**

1. Expand `POST /auth/login` → click **Try it out** → fill in credentials → click **Execute**
2. Copy the `accessToken` from the response body
3. Click the **Authorize** button (top right of the page)
4. Paste the token into the **Value** field — do not add "Bearer " yourself, the UI adds it
5. Click **Authorize** → **Close**
6. All endpoints with a padlock icon will now include your token automatically

**Adding Swagger docs to a new endpoint** — add a JSDoc comment directly above the route definition in the `.routes.js` file:

```javascript
/**
 * @swagger
 * /posts:
 *   get:
 *     summary: Get all posts
 *     tags: [Posts]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of posts
 */
router.get('/', authenticate, controller.listPosts);
```

Add new reusable schemas to `src/config/swagger.js` under `components.schemas`, then reference them with `$ref: '#/components/schemas/YourSchemaName'`.

---

## 12. Security Features

| Feature | Implementation | File |
|---|---|---|
| Secure HTTP Headers | Helmet sets X-Frame-Options, X-Content-Type-Options, HSTS, CSP, and 12 more | `src/app.js` |
| CORS | Only origins listed in `CORS_ORIGIN` env variable are allowed | `src/app.js` |
| Rate Limiting (global) | 100 requests per 15 minutes per IP across all endpoints | `src/middlewares/rateLimiter.js` |
| Rate Limiting (auth) | 5 requests per 15 minutes on `/register`, `/login`, `/forgot-password` | `src/middlewares/rateLimiter.js` |
| XSS Sanitization | HTML stripped from all string fields in req.body and req.query | `src/middlewares/sanitize.js` |
| SQL Injection Protection | All queries use Prisma's parameterized query builder — no raw SQL strings | `src/database/prisma.js` |
| Password Hashing | bcrypt with 12 salt rounds | `src/utils/password.js` |
| JWT Security | Short-lived access tokens (15m), separate secrets, token rotation | `src/utils/jwt.js` |
| Refresh Token Storage | Stored as SHA-256 hashes — raw tokens never touch the database | `src/utils/hashToken.js` |
| Input Validation | Zod schemas reject malformed requests before they reach business logic | `src/middlewares/validate.js` |
| Sensitive Field Stripping | `password`, `resetTokenHash`, `resetTokenExpiresAt` removed before any response | `src/modules/*/service.js` |

---

## 13. Logging

Logging is split across two tools that work together:

- **Morgan** — logs every HTTP request (method, path, status code, response time). Configured in `src/middlewares/requestLogger.js`.
- **Winston** — logs application events, warnings, and errors. The logger instance lives at `src/config/logger.js`. Import it wherever you need to log something.

**Using the logger in your code:**

```javascript
const logger = require('../../config/logger');

logger.debug('Detailed info useful during development');
logger.info('Something notable happened');
logger.warn('Something unexpected but not fatal');
logger.error('Something broke', { stack: err.stack });
logger.http('HTTP request details'); // used by Morgan internally
```

**Log levels by environment:**

| Environment | Minimum level logged | Destination |
|---|---|---|
| development | debug (everything) | Console (colored, readable) |
| production | info and above | Console (JSON) + `logs/error.log` + `logs/combined.log` |

**Log format in development:**
```
10:23:45 info: Server running on http://localhost:3000 [development]
10:23:46 http: GET /api/v1/health 200 4.231 ms
10:23:50 error: POST /api/v1/auth/login - Invalid email or password
```

**Log format in production (structured JSON, easy for Datadog / CloudWatch / Logtail to parse):**
```json
{"level":"info","message":"Server running","timestamp":"2024-01-01T10:23:45.000Z"}
{"level":"http","message":"GET /api/v1/health 200 4.231 ms","timestamp":"2024-01-01T10:23:46.000Z"}
```

---

## 14. Error Handling

All errors funnel through `src/middlewares/errorHandler.js`. You never need to send error responses manually — just throw or call `next(error)`.

**Throwing a known operational error (wrong input, not found, etc.):**

```javascript
const AppError = require('../../utils/AppError');

throw new AppError('User not found', 404);
throw new AppError('Email already registered', 409);
throw new AppError('You do not have permission', 403);
```

**Wrapping an async route handler** (so unhandled promise rejections reach the error handler):

```javascript
const catchAsync = require('../../utils/catchAsync');

exports.myHandler = catchAsync(async (req, res) => {
  // Any thrown error or rejected promise is caught and forwarded to errorHandler
  const result = await someService.doSomething();
  res.status(200).json({ status: 'success', data: result });
});
```

**HTTP status code conventions used in this project:**

| Code | Meaning | When to use |
|---|---|---|
| 200 | OK | Successful GET, PATCH, POST (non-creating) |
| 201 | Created | Successful resource creation (POST) |
| 204 | No Content | Successful deletion (DELETE) |
| 400 | Bad Request | Validation failed, malformed input |
| 401 | Unauthorized | Missing token, invalid token, wrong credentials |
| 403 | Forbidden | Valid token but insufficient role |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Duplicate — e.g. email already registered |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected crash — never returned for operational errors |

---

## 15. Validation

All request body validation uses **Zod** schemas defined in `*.validation.js` files alongside the module they belong to.

**How it works:**

1. Define a Zod schema in `module.validation.js`
2. Pass it to the `validate` middleware in the route
3. If validation fails, the middleware calls `next(new AppError(errorMessage, 400))` automatically
4. If validation passes, `req.body` is replaced with the parsed, type-coerced Zod output

**Example schema:**

```javascript
const { z } = require('zod');

const createPostSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  body: z.string().min(10, 'Body must be at least 10 characters'),
  published: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
});

module.exports = { createPostSchema };
```

**Attaching it to a route:**

```javascript
const { createPostSchema } = require('./posts.validation');
const validate = require('../../middlewares/validate');

router.post('/', authenticate, validate(createPostSchema), controller.createPost);
```

---

## 16. Role-Based Access Control

Two roles exist: `USER` (default) and `ADMIN`.

**How roles are checked:**

1. `authenticate` middleware verifies the JWT and attaches `req.user = { id, role }` to the request
2. `authorize(...roles)` middleware checks `req.user.role` against the allowed list
3. Both are composable — use them as a chain in route definitions or router-level middleware

**Route-level (per endpoint):**

```javascript
router.delete('/:id', authenticate, authorize('ADMIN'), controller.deletePost);
```

**Router-level (all routes below the line):**

```javascript
router.use(authenticate);         // all routes below require login
router.get('/me', controller.getMe);

router.use(authorize('ADMIN'));   // all routes below ALSO require ADMIN role
router.get('/', controller.listAll);
router.delete('/:id', controller.deleteOne);
```

**Adding a new role:**

1. Add the value to the `Role` enum in `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name add_role_value`
3. Use `authorize('NEW_ROLE')` on the relevant routes

**Important:** Role changes take effect at next login — the role is signed into the JWT payload at issuance time, so a user already logged in carries their old role until their access token expires (15 minutes) and they re-authenticate.

---

## 17. How to Add a New Module

A "module" is a self-contained feature folder. Follow these exact steps every time.

**Example: adding a `posts` module**

### Step 1 — Create the folder

```cmd
mkdir src\modules\posts
```

### Step 2 — Create the database model

In `prisma/schema.prisma`, add your model:

```prisma
model Post {
  id        String   @id @default(uuid())
  title     String
  body      String
  published Boolean  @default(false)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("posts")
}
```

Also add the relation back-reference on the `User` model:

```prisma
model User {
  // ... existing fields
  posts Post[]
}
```

Run the migration:

```cmd
npx prisma migrate dev --name add_posts_table
```

### Step 3 — Create the validation file

`src/modules/posts/posts.validation.js`:

```javascript
const { z } = require('zod');

const createPostSchema = z.object({
  title: z.string().min(3),
  body: z.string().min(10),
  published: z.boolean().default(false),
});

const updatePostSchema = z.object({
  title: z.string().min(3).optional(),
  body: z.string().min(10).optional(),
  published: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, { message: 'At least one field required' });

module.exports = { createPostSchema, updatePostSchema };
```

### Step 4 — Create the service file

`src/modules/posts/posts.service.js`:

```javascript
const prisma = require('../../database/prisma');
const AppError = require('../../utils/AppError');
const { getPagination, buildPaginationMeta } = require('../../utils/paginate');

exports.createPost = async (data, authorId) => {
  return prisma.post.create({ data: { ...data, authorId } });
};

exports.listPosts = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const [posts, totalItems] = await Promise.all([
    prisma.post.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.post.count(),
  ]);
  return { posts, meta: buildPaginationMeta(page, limit, totalItems) };
};

exports.getPostById = async (id) => {
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) throw new AppError('Post not found', 404);
  return post;
};

exports.updatePost = async (id, data) => {
  await exports.getPostById(id);
  return prisma.post.update({ where: { id }, data });
};

exports.deletePost = async (id) => {
  await exports.getPostById(id);
  await prisma.post.delete({ where: { id } });
};
```

### Step 5 — Create the controller file

`src/modules/posts/posts.controller.js`:

```javascript
const catchAsync = require('../../utils/catchAsync');
const postsService = require('./posts.service');

exports.createPost = catchAsync(async (req, res) => {
  const post = await postsService.createPost(req.body, req.user.id);
  res.status(201).json({ status: 'success', data: { post } });
});

exports.listPosts = catchAsync(async (req, res) => {
  const result = await postsService.listPosts(req.query);
  res.status(200).json({ status: 'success', data: result });
});

exports.getPost = catchAsync(async (req, res) => {
  const post = await postsService.getPostById(req.params.id);
  res.status(200).json({ status: 'success', data: { post } });
});

exports.updatePost = catchAsync(async (req, res) => {
  const post = await postsService.updatePost(req.params.id, req.body);
  res.status(200).json({ status: 'success', data: { post } });
});

exports.deletePost = catchAsync(async (req, res) => {
  await postsService.deletePost(req.params.id);
  res.status(204).send();
});
```

### Step 6 — Create the routes file

`src/modules/posts/posts.routes.js`:

```javascript
const express = require('express');
const controller = require('./posts.controller');
const validate = require('../../middlewares/validate');
const authenticate = require('../../middlewares/authenticate');
const { createPostSchema, updatePostSchema } = require('./posts.validation');

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * /posts:
 *   get:
 *     summary: List all posts
 *     tags: [Posts]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Paginated list of posts
 *   post:
 *     summary: Create a post
 *     tags: [Posts]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Post created
 */
router.get('/', controller.listPosts);
router.post('/', validate(createPostSchema), controller.createPost);

/**
 * @swagger
 * /posts/{id}:
 *   get:
 *     summary: Get a post by ID
 *     tags: [Posts]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Post found
 */
router.get('/:id', controller.getPost);
router.patch('/:id', validate(updatePostSchema), controller.updatePost);
router.delete('/:id', controller.deletePost);

module.exports = router;
```

### Step 7 — Register in the route aggregator

In `src/routes/index.js`:

```javascript
const postsRoutes = require('../modules/posts/posts.routes');
router.use('/posts', postsRoutes);
```

### Step 8 — Add the Swagger tag

In `src/config/swagger.js`, add to the `tags` array:

```javascript
{ name: 'Posts', description: 'Post management' }
```

That is the complete process. Every new module follows these exact 8 steps.

---

## 18. How to Add a New API to an Existing Module

**Example: adding `GET /api/v1/users/me/posts` to the users module**

### Step 1 — Add the service method

In `src/modules/users/users.service.js`:

```javascript
exports.getMyPosts = async (userId) => {
  return prisma.post.findMany({
    where: { authorId: userId },
    orderBy: { createdAt: 'desc' },
  });
};
```

### Step 2 — Add the controller method

In `src/modules/users/users.controller.js`:

```javascript
exports.getMyPosts = catchAsync(async (req, res) => {
  const posts = await usersService.getMyPosts(req.user.id);
  res.status(200).json({ status: 'success', data: { posts } });
});
```

### Step 3 — Add the route

In `src/modules/users/users.routes.js`, before the `authorize('ADMIN')` line:

```javascript
/**
 * @swagger
 * /users/me/posts:
 *   get:
 *     summary: Get the current user's posts
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: User's posts
 */
router.get('/me/posts', controller.getMyPosts);
```

No other files need changing. The route aggregator and app.js remain untouched.

---

## 19. How to Add a New Database Table

1. Open `prisma/schema.prisma`
2. Add a new `model` block
3. If it relates to an existing model, add the relation fields on both sides
4. Run: `npx prisma migrate dev --name add_your_table_name`
5. The Prisma Client regenerates automatically — `prisma.yourModel` is immediately available everywhere

**Naming conventions:**
- Model names: `PascalCase` singular (`Post`, `Comment`, `UserProfile`)
- Table names via `@@map`: `snake_case` plural (`posts`, `comments`, `user_profiles`)
- Field names: `camelCase` (`createdAt`, `authorId`, `isPublished`)
- Relation fields: `camelCase` matching the related model name (`author`, `posts`, `comments`)

---

## 20. How to Add Middleware

Middleware is a function with the signature `(req, res, next) => void`.

### Application-wide middleware

Add it in `src/app.js` before the route mounting line:

```javascript
const myMiddleware = require('./middlewares/myMiddleware');
app.use(myMiddleware);
app.use('/api/v1', apiRoutes); // middleware runs before all routes
```

### Router-wide middleware (affects all routes in one module)

Add it at the top of a `.routes.js` file:

```javascript
router.use(myMiddleware); // all routes below this line are affected
```

### Per-route middleware

Add it inline between the path and the controller:

```javascript
router.get('/sensitive', authenticate, authorize('ADMIN'), myMiddleware, controller.handler);
```

### Creating a new middleware

Create `src/middlewares/myMiddleware.js`:

```javascript
const myMiddleware = (req, res, next) => {
  // do something with req or res
  next(); // always call next() or send a response — never both
};

module.exports = myMiddleware;
```

For middleware that needs configuration (like `authorize`), return the middleware function from a factory:

```javascript
const configurable = (option) => (req, res, next) => {
  // use option here
  next();
};

module.exports = configurable;
```

---

## 21. How to Add a New Guard (Protect a Route)

A guard is just middleware that either calls `next()` (allow) or `next(new AppError(...))` (deny).

**Example: an API key guard for a webhook endpoint**

`src/middlewares/requireApiKey.js`:

```javascript
const AppError = require('../utils/AppError');

const requireApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.WEBHOOK_SECRET) {
    return next(new AppError('Invalid or missing API key', 401));
  }
  next();
};

module.exports = requireApiKey;
```

Use it on any route:

```javascript
const requireApiKey = require('../../middlewares/requireApiKey');
router.post('/webhook', requireApiKey, controller.handleWebhook);
```

---

## 22. How to Add a New Validator

All validators live in the `*.validation.js` file of the module they belong to.

**Steps:**

1. Open the relevant `src/modules/yourModule/yourModule.validation.js`
2. Add a new Zod schema
3. Export it
4. Import it in the `.routes.js` file and pass it to `validate()`

**Common Zod validators reference:**

```javascript
const { z } = require('zod');

z.string()                          // must be a string
z.string().min(3)                   // minimum length
z.string().max(100)                 // maximum length
z.string().email()                  // must be a valid email
z.string().url()                    // must be a valid URL
z.string().uuid()                   // must be a UUID
z.number().int().positive()         // positive integer
z.boolean()                         // true or false
z.enum(['VALUE_A', 'VALUE_B'])      // one of the listed values
z.array(z.string())                 // array of strings
z.object({ key: z.string() })       // nested object
z.string().optional()               // field is not required
z.string().default('fallback')      // default value if not provided
```

---

## 23. How to Add a Utility Function

Utility functions are pure, reusable helpers that contain no business logic and no direct database access.

1. Create or open a file in `src/utils/`
2. Write and export your function
3. Import it wherever needed using a relative path

**Examples of good utility candidates:**
- Date formatting
- String slugification
- Currency conversion
- File size formatting
- Generating random codes (OTP, invite codes)

**Example:**

`src/utils/generateOtp.js`:

```javascript
const crypto = require('crypto');

const generateOtp = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[crypto.randomInt(0, digits.length)];
  }
  return otp;
};

module.exports = generateOtp;
```

---

## 24. Package.json Scripts

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "db:migrate": "prisma migrate dev",
    "db:migrate:prod": "prisma migrate deploy",
    "db:studio": "prisma studio",
    "db:generate": "prisma generate",
    "db:reset": "prisma migrate reset"
  }
}
```

| Script | Command | When to use |
|---|---|---|
| `npm start` | `node server.js` | Production startup |
| `npm run dev` | `nodemon server.js` | Local development (auto-restarts) |
| `npm run db:migrate` | `prisma migrate dev` | Apply schema changes locally |
| `npm run db:migrate:prod` | `prisma migrate deploy` | Apply migrations in production/CI |
| `npm run db:studio` | `prisma studio` | Browse and edit database in a GUI |
| `npm run db:generate` | `prisma generate` | Regenerate client after `git clone` |
| `npm run db:reset` | `prisma migrate reset` | Wipe and rebuild the database (dev only) |

---

## 25. Docker

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

### docker-compose.yml

```yaml
version: '3.9'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: ${DATABASE_URL}
      DIRECT_URL: ${DIRECT_URL}
      JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET}
      JWT_ACCESS_EXPIRES_IN: ${JWT_ACCESS_EXPIRES_IN}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      JWT_REFRESH_EXPIRES_IN: ${JWT_REFRESH_EXPIRES_IN}
      CORS_ORIGIN: ${CORS_ORIGIN}
    restart: unless-stopped
```

Since the database is hosted on Neon, no local Postgres container is needed.

**Build and run:**

```cmd
docker build -t backend-boilerplate .
docker-compose up -d
```

---

## 26. Deployment

### Pre-deployment checklist

- [ ] All required environment variables are set on the server
- [ ] `NODE_ENV=production` is set
- [ ] `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are long random strings (64+ bytes)
- [ ] `CORS_ORIGIN` is set to your actual frontend domain(s)
- [ ] `DATABASE_URL` points to the Neon **production** branch, not development
- [ ] Migrations are applied: `npx prisma migrate deploy`
- [ ] `logs/` directory exists and is writable by the process

### Production start

```cmd
NODE_ENV=production npm start
```

### Recommended hosting platforms

| Platform | Notes |
|---|---|
| Railway | Connect GitHub repo, set env vars, auto-deploys on push |
| Render | Free tier available, set `npm start` as start command |
| Fly.io | Good for Docker deployments, global edge regions |
| AWS EC2 / DigitalOcean | Full control, use PM2 as the process manager |

### Using PM2 (if deploying to a raw server)

```cmd
npm install -g pm2
pm2 start server.js --name backend-boilerplate
pm2 save
pm2 startup
```

PM2 keeps the process alive after crashes and system restarts.

---

## 27. Git Strategy

### .gitignore

```
node_modules/
.env
.env.production
logs/
dist/
*.log
```

### Branching strategy

```
main           → production-ready code only, protected, no direct pushes
develop        → integration branch, all feature branches merge here first
feature/*      → one branch per feature, e.g. feature/add-posts-module
fix/*          → bug fixes, e.g. fix/refresh-token-expiry
hotfix/*       → urgent production fixes branched off main, merged back to both main and develop
```

### Commit message convention

```
feat: add posts module with CRUD endpoints
fix: correct refresh token expiry comparison
docs: update README with posts module instructions
refactor: extract sanitizeUser helper to shared util
security: increase bcrypt salt rounds to 12
chore: add db:studio npm script
```

---

## 28. Coding Standards

### File naming

| Type | Convention | Example |
|---|---|---|
| Route files | `module.routes.js` | `posts.routes.js` |
| Controller files | `module.controller.js` | `posts.controller.js` |
| Service files | `module.service.js` | `posts.service.js` |
| Validation files | `module.validation.js` | `posts.validation.js` |
| Middleware files | `camelCase.js` | `authenticate.js` |
| Utility files | `camelCase.js` | `hashToken.js` |

### Code principles

- **Single Responsibility** — each file does one thing. Routes define paths. Controllers handle HTTP. Services contain business logic. Utilities are pure functions.
- **DRY** — if you write the same logic in two controllers, it belongs in a service or utility.
- **Never put business logic in controllers** — controllers only call the service and send a response. All decisions, DB queries, and data transformations happen in the service.
- **Never import one module's service into another module's service** — if two modules need to share logic, extract it to `src/utils/` or create a shared service.
- **Always use `catchAsync`** — never write an async route handler without wrapping it. An unwrapped rejected promise hangs the request forever.
- **Always throw `AppError`** — never call `res.status(x).json(...)` directly from a service. Throw the error, let the handler deal with the response.

---

## 29. Common Mistakes to Avoid

| Mistake | Consequence | Correct approach |
|---|---|---|
| Creating a new `PrismaClient` per request | Exhausts Neon's connection limit almost immediately | Always import from `src/database/prisma.js` |
| Using `migrate dev` in production | Can wipe data | Use `migrate deploy` in production |
| Storing raw refresh tokens in DB | Database leak = permanent session hijack | Hash with SHA-256 before storing |
| Returning `password` field in responses | Exposes hashed passwords | Always use the `sanitizeUser` pattern |
| Not wrapping async handlers with `catchAsync` | Unhandled rejections crash or hang | Wrap every async route handler |
| Putting business logic in controllers | Untestable, duplicated code | All logic goes in service files |
| Wide-open CORS (`*`) in production | Any website can call your API | Set `CORS_ORIGIN` to specific frontend domains |
| Promoting a user's role mid-session without re-login | User keeps old permissions until token expires | Document this, keep access tokens short (15m) |
| Committing `.env` to git | Exposes all secrets | `.env` must always be in `.gitignore` |

---

## 30. Future Improvements

These are features intentionally excluded from the boilerplate to keep it focused, but are logical next additions for most real projects:

- **Email service** — wire up Resend or SendGrid to the `forgotPassword` service method
- **File uploads** — Multer for handling multipart form data, S3/Cloudflare R2 for storage
- **Soft deletes** — add `deletedAt DateTime?` to models and filter deleted records via a Prisma middleware extension
- **Request ID tracing** — attach a UUID to every request and include it in all log lines for that request, making it possible to trace a single request across multiple log entries
- **Environment validation** — validate all required env variables at startup using Zod, fail loudly if any are missing rather than discovering a missing `JWT_ACCESS_SECRET` at runtime
- **Testing** — Jest + Supertest for integration tests, with a separate `.env.test` pointing at a Neon test branch
- **Admin panel** — a basic admin UI for user management (Retool or a custom React page)
- **WebSockets** — Socket.io for real-time features, sharing the same Express server
- **Caching** — Redis (Upstash for serverless) for caching expensive queries and storing rate limit counters centrally when running multiple instances
- **Background jobs** — BullMQ with Redis for email queues, report generation, and other async workloads

---

## 31. Developer Notes

**For another developer or AI assistant continuing this project:**

This project is a clean, conventional Express.js REST API. There is no magic, no code generation at runtime, and no hidden framework conventions. Everything is plain JavaScript with deliberate structure applied manually.

**The three rules that make everything else work:**

1. Routes (`*.routes.js`) wire paths to middleware chains and controllers — nothing else
2. Controllers (`*.controller.js`) call one service method and send one response — nothing else  
3. Services (`*.service.js`) contain all business logic and all database access — everything else

**Finding things quickly:**

- Something broke in authentication → `src/modules/auth/auth.service.js`
- A route is returning the wrong status code → `src/modules/<module>/<module>.controller.js`
- A validation error message is wrong → `src/modules/<module>/<module>.validation.js`
- Rate limiting is too strict or too loose → `src/middlewares/rateLimiter.js`
- A security header is missing or wrong → `src/app.js` (Helmet configuration)
- A log message is not appearing → `src/config/logger.js` (check the `level` setting for current `NODE_ENV`)
- Prisma is throwing connection errors → check `DATABASE_URL` in `.env`, verify Neon branch is active, verify `sslmode=require` is present

**Adding a new feature always follows the same 8 steps:** schema → migration → validation → service → controller → routes → register in `src/routes/index.js` → add Swagger tag. Never skip a step and never merge steps into one file.

---

*Last updated: 2024 — covers the complete boilerplate as described in this README.*
