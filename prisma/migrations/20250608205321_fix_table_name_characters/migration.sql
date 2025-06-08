/*
  Warnings:

  - You are about to drop the `Character` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Character";

-- CreateTable
CREATE TABLE "Characters" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Characters_pkey" PRIMARY KEY ("id")
);
