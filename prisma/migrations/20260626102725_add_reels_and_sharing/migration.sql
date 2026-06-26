-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "is_reel" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "share_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shared_from_id" TEXT;

-- CreateIndex
CREATE INDEX "posts_is_reel_privacy_created_at_idx" ON "posts"("is_reel", "privacy", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_shared_from_id_fkey" FOREIGN KEY ("shared_from_id") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
