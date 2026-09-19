-- CreateEnum
CREATE TYPE "Role" AS ENUM ('AUTHOR', 'READER', 'ADMIN');

-- CreateEnum
CREATE TYPE "BookStatus" AS ENUM ('DRAFT', 'WRITING', 'EDITING', 'DESIGNING', 'READY', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'PRINTING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CoverSource" AS ENUM ('AI', 'UPLOAD');

-- CreateEnum
CREATE TYPE "CoverSide" AS ENUM ('FRONT', 'BACK');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('PHYSICAL', 'DIGITAL');

-- CreateEnum
CREATE TYPE "ChapterType" AS ENUM ('FRONT_MATTER', 'CHAPTER', 'BACK_MATTER');

-- CreateEnum
CREATE TYPE "AiEditAction" AS ENUM ('PROOFREAD', 'REWRITE', 'TONE_FRIENDLY', 'TONE_PROFESSIONAL', 'TONE_CONCISE', 'SUMMARY', 'KEY_POINTS', 'LIST', 'TABLE', 'COMPOSE', 'CUSTOM', 'CHAT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "password" TEXT,
    "role" "Role" NOT NULL DEFAULT 'AUTHOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverUrl" TEXT,
    "backCoverUrl" TEXT,
    "status" "BookStatus" NOT NULL DEFAULT 'DRAFT',
    "genre" TEXT,
    "language" TEXT NOT NULL DEFAULT 'English',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "digitalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "authorId" TEXT NOT NULL,
    "originalBookId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrintSettings" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "pageSize" TEXT NOT NULL DEFAULT '6x9',
    "margin" TEXT NOT NULL DEFAULT '0.5in',
    "font" TEXT NOT NULL DEFAULT 'serif',
    "fontSize" INTEGER NOT NULL DEFAULT 11,
    "lineSpacing" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrintSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoverImage" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source" "CoverSource" NOT NULL,
    "side" "CoverSide" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoverImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "type" "ChapterType" NOT NULL DEFAULT 'CHAPTER',
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "bookId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Version" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiEdit" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "bookId" TEXT,
    "chapterId" TEXT,
    "action" "AiEditAction" NOT NULL,
    "prompt" TEXT,
    "beforeText" TEXT NOT NULL,
    "afterText" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'ollama',
    "model" TEXT NOT NULL DEFAULT 'llama3',
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiEdit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "type" "OrderType" NOT NULL DEFAULT 'PHYSICAL',
    "shippingAddr" TEXT,
    "stripeId" TEXT,
    "printOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PrintSettings_bookId_key" ON "PrintSettings"("bookId");

-- CreateIndex
CREATE INDEX "CoverImage_bookId_idx" ON "CoverImage"("bookId");

-- CreateIndex
CREATE INDEX "AiEdit_userId_idx" ON "AiEdit"("userId");

-- CreateIndex
CREATE INDEX "AiEdit_bookId_idx" ON "AiEdit"("bookId");

-- CreateIndex
CREATE INDEX "AiEdit_chapterId_idx" ON "AiEdit"("chapterId");

-- CreateIndex
CREATE INDEX "AiEdit_createdAt_idx" ON "AiEdit"("createdAt");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_bookId_idx" ON "Order"("bookId");

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_originalBookId_fkey" FOREIGN KEY ("originalBookId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintSettings" ADD CONSTRAINT "PrintSettings_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverImage" ADD CONSTRAINT "CoverImage_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Version" ADD CONSTRAINT "Version_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiEdit" ADD CONSTRAINT "AiEdit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiEdit" ADD CONSTRAINT "AiEdit_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiEdit" ADD CONSTRAINT "AiEdit_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
