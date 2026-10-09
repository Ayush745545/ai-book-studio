CREATE TABLE "WritingActivity" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "bookId" TEXT,
  "chapterId" TEXT,
  "bookTitle" TEXT NOT NULL,
  "action" TEXT NOT NULL DEFAULT 'WRITE',
  "wordsAdded" INTEGER NOT NULL DEFAULT 0,
  "wordsRemoved" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WritingActivity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WritingActivity_userId_createdAt_idx" ON "WritingActivity"("userId", "createdAt");
ALTER TABLE "WritingActivity" ADD CONSTRAINT "WritingActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WritingActivity" ADD CONSTRAINT "WritingActivity_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WritingActivity" ADD CONSTRAINT "WritingActivity_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Import known existing content once, using its actual last-save timestamp.
INSERT INTO "WritingActivity" ("id", "userId", "bookId", "chapterId", "bookTitle", "action", "wordsAdded", "createdAt")
SELECT 'baseline-' || c."id", b."authorId", b."id", c."id", b."title", 'BASELINE', c."wordCount", c."updatedAt"
FROM "Chapter" c JOIN "Book" b ON b."id" = c."bookId"
WHERE c."wordCount" > 0;
