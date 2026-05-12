-- AlterTable
ALTER TABLE "seat_hold" ADD COLUMN     "bookingId" INTEGER;

-- AddForeignKey
ALTER TABLE "seat_hold" ADD CONSTRAINT "seat_hold_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
