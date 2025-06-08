/*
  Warnings:

  - You are about to drop the column `descrption` on the `Character` table. All the data in the column will be lost.
  - Added the required column `description` to the `Character` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Character" DROP COLUMN "descrption",
ADD COLUMN     "description" TEXT NOT NULL;
