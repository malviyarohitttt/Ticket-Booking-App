/*
  Warnings:

  - You are about to drop the column `bookingId` on the `seat_hold` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "seat_hold" DROP CONSTRAINT "seat_hold_bookingId_fkey";

-- AlterTable
ALTER TABLE "seat_hold" DROP COLUMN "bookingId";
