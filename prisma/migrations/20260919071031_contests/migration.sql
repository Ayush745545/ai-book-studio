-- CreateEnum
CREATE TYPE "ContestStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('PENDING', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PAID');

-- CreateTable
CREATE TABLE "Contest" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "status" "ContestStatus" NOT NULL DEFAULT 'OPEN',
    "potAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'inr',
    "winnerId" TEXT,
    "payoutStatus" "PayoutStatus",
    "payoutPaidAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestEntry" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "fee" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'inr',
    "status" "EntryStatus" NOT NULL DEFAULT 'PENDING',
    "stripeSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContestEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contest_weekStart_key" ON "Contest"("weekStart");

-- CreateIndex
CREATE INDEX "Contest_status_idx" ON "Contest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ContestEntry_stripeSessionId_key" ON "ContestEntry"("stripeSessionId");

-- CreateIndex
CREATE INDEX "ContestEntry_contestId_idx" ON "ContestEntry"("contestId");

-- CreateIndex
CREATE INDEX "ContestEntry_userId_idx" ON "ContestEntry"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ContestEntry_contestId_bookId_key" ON "ContestEntry"("contestId", "bookId");

-- AddForeignKey
ALTER TABLE "Contest" ADD CONSTRAINT "Contest_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestEntry" ADD CONSTRAINT "ContestEntry_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestEntry" ADD CONSTRAINT "ContestEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestEntry" ADD CONSTRAINT "ContestEntry_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
