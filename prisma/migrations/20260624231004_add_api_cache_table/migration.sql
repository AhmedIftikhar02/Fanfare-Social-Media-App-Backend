-- AlterTable
ALTER TABLE "statuses" ALTER COLUMN "expires_at" SET DEFAULT NOW() + INTERVAL '24 hours';

-- CreateTable
CREATE TABLE "api_cache" (
    "cache_key" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "cached_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_cache_pkey" PRIMARY KEY ("cache_key")
);
