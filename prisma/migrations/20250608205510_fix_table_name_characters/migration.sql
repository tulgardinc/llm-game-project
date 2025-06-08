/*
  Warnings:

  - You are about to drop the `Characters` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Characters";

-- CreateTable
CREATE TABLE "characters" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);
