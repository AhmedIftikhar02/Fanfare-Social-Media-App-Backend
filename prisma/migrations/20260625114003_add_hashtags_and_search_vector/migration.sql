-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "search_vector" tsvector;

-- AlterTable
ALTER TABLE "statuses" ALTER COLUMN "expires_at" SET DEFAULT NOW() + INTERVAL '24 hours';

-- CreateTable
CREATE TABLE "hashtags" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "post_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "hashtags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_hashtags" (
    "post_id" TEXT NOT NULL,
    "hashtag_id" INTEGER NOT NULL,

    CONSTRAINT "post_hashtags_pkey" PRIMARY KEY ("post_id","hashtag_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hashtags_name_key" ON "hashtags"("name");

-- AddForeignKey
ALTER TABLE "post_hashtags" ADD CONSTRAINT "post_hashtags_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_hashtags" ADD CONSTRAINT "post_hashtags_hashtag_id_fkey" FOREIGN KEY ("hashtag_id") REFERENCES "hashtags"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Add full-text search vector column to posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Populate for existing rows
UPDATE posts SET search_vector = to_tsvector('english', COALESCE(caption, '')) WHERE search_vector IS NULL;

-- GIN index for fast full-text lookups
CREATE INDEX IF NOT EXISTS posts_search_idx ON posts USING GIN (search_vector);

-- Trigger function — keeps search_vector in sync on every insert/update
CREATE OR REPLACE FUNCTION update_post_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.caption, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to posts table
DROP TRIGGER IF EXISTS post_search_vector_trigger ON posts;
CREATE TRIGGER post_search_vector_trigger
  BEFORE INSERT OR UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_post_search_vector();