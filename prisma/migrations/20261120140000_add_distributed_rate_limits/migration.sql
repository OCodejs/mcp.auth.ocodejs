-- Distributed fixed-window buckets shared by all application instances.
-- Keys are HMAC-SHA256 digests; raw email addresses and IPs are never persisted.
CREATE TABLE "RateLimitBucket" (
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL,
  "windowStartedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key"),
  CONSTRAINT "RateLimitBucket_count_positive" CHECK ("count" > 0)
);
CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");
