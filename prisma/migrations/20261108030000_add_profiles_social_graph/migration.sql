-- OCode.js Profile: additive migration. Existing users/accounts/sessions remain untouched.
CREATE TABLE "Profile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "username" VARCHAR(30) NOT NULL,
  "displayName" VARCHAR(80),
  "bio" VARCHAR(280),
  "avatarUrl" TEXT,
  "websiteUrl" VARCHAR(2048),
  "location" VARCHAR(120),
  "timezone" VARCHAR(80),
  "statusText" VARCHAR(80),
  "readme" TEXT,
  "githubUsername" VARCHAR(39),
  "isPublic" BOOLEAN NOT NULL DEFAULT true,
  "showActivity" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");
CREATE UNIQUE INDEX "Profile_username_key" ON "Profile"("username");
CREATE UNIQUE INDEX "Profile_githubUsername_key" ON "Profile"("githubUsername");
CREATE INDEX "Profile_isPublic_username_idx" ON "Profile"("isPublic", "username");
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ProfileLink" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "kind" VARCHAR(32) NOT NULL,
  "label" VARCHAR(60) NOT NULL,
  "url" VARCHAR(2048) NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProfileLink_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProfileLink_profileId_sortOrder_idx" ON "ProfileLink"("profileId", "sortOrder");
ALTER TABLE "ProfileLink" ADD CONSTRAINT "ProfileLink_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ProfileFollow" (
  "id" TEXT NOT NULL,
  "followerId" TEXT NOT NULL,
  "followedId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProfileFollow_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProfileFollow_no_self_follow" CHECK ("followerId" <> "followedId")
);
CREATE UNIQUE INDEX "ProfileFollow_followerId_followedId_key" ON "ProfileFollow"("followerId", "followedId");
CREATE INDEX "ProfileFollow_followedId_createdAt_idx" ON "ProfileFollow"("followedId", "createdAt");
CREATE INDEX "ProfileFollow_followerId_createdAt_idx" ON "ProfileFollow"("followerId", "createdAt");
ALTER TABLE "ProfileFollow" ADD CONSTRAINT "ProfileFollow_followerId_fkey"
  FOREIGN KEY ("followerId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileFollow" ADD CONSTRAINT "ProfileFollow_followedId_fkey"
  FOREIGN KEY ("followedId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ProfileStar" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "resourceType" VARCHAR(32) NOT NULL,
  "resourceId" VARCHAR(255) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProfileStar_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProfileStar_profileId_resourceType_resourceId_key" ON "ProfileStar"("profileId", "resourceType", "resourceId");
CREATE INDEX "ProfileStar_profileId_createdAt_idx" ON "ProfileStar"("profileId", "createdAt");
CREATE INDEX "ProfileStar_resourceType_resourceId_idx" ON "ProfileStar"("resourceType", "resourceId");
ALTER TABLE "ProfileStar" ADD CONSTRAINT "ProfileStar_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ProfileActivity" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "eventType" VARCHAR(40) NOT NULL,
  "summary" VARCHAR(240) NOT NULL,
  "resourceUrl" VARCHAR(2048),
  "metadata" JSONB,
  "isPublic" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProfileActivity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProfileActivity_profileId_isPublic_createdAt_idx" ON "ProfileActivity"("profileId", "isPublic", "createdAt");
ALTER TABLE "ProfileActivity" ADD CONSTRAINT "ProfileActivity_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
