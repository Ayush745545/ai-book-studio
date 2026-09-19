-- AlterTable
ALTER TABLE "Contest" ADD COLUMN     "creatorId" TEXT,
ADD COLUMN     "title" TEXT;

-- AddForeignKey
ALTER TABLE "Contest" ADD CONSTRAINT "Contest_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
