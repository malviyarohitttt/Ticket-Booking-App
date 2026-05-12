/*
  Warnings:

  - You are about to drop the `SeatHold` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "SeatHoldStatus" ADD VALUE 'cancelled';

-- DropForeignKey
ALTER TABLE "SeatHold" DROP CONSTRAINT "SeatHold_eventId_fkey";

-- DropForeignKey
ALTER TABLE "SeatHold" DROP CONSTRAINT "SeatHold_userId_fkey";

-- DropTable
DROP TABLE "SeatHold";

-- CreateTable
CREATE TABLE "seat_hold" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "eventId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "SeatHoldStatus" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paymentStartedAt" TIMESTAMP(3),
    "processingExpiresAt" TIMESTAMP(3),
    "bookingId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seat_hold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "seat_hold_eventId_status_idx" ON "seat_hold"("eventId", "status");

-- CreateIndex
CREATE INDEX "seat_hold_expiresAt_idx" ON "seat_hold"("expiresAt");

-- CreateIndex
CREATE INDEX "seat_hold_processingExpiresAt_idx" ON "seat_hold"("processingExpiresAt");

-- AddForeignKey
ALTER TABLE "seat_hold" ADD CONSTRAINT "seat_hold_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_hold" ADD CONSTRAINT "seat_hold_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_hold" ADD CONSTRAINT "seat_hold_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
