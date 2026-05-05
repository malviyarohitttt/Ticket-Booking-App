/*
  Warnings:

  - You are about to drop the column `adminWalletId` on the `transaction` table. All the data in the column will be lost.
  - Added the required column `purpose` to the `transaction` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "txn_purpose" AS ENUM ('booking_payment', 'platform_commission', 'event_manager_payout', 'wallet_topup', 'refund');

-- DropForeignKey
ALTER TABLE "transaction" DROP CONSTRAINT "transaction_adminWalletId_fkey";

-- AlterTable
ALTER TABLE "transaction" DROP COLUMN "adminWalletId",
ADD COLUMN     "note" TEXT,
ADD COLUMN     "purpose" "txn_purpose" NOT NULL;

-- CreateTable
CREATE TABLE "admin_transactions" (
    "id" SERIAL NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "txn_type" NOT NULL,
    "purpose" "txn_purpose" NOT NULL,
    "reference_id" INTEGER,
    "note" TEXT,
    "admin_id" INTEGER NOT NULL,
    "adminWalletId" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_split" (
    "id" SERIAL NOT NULL,
    "booking_id" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "split_type" "split_type" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_split_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "revenue_split_booking_id_idx" ON "revenue_split"("booking_id");

-- AddForeignKey
ALTER TABLE "admin_transactions" ADD CONSTRAINT "admin_transactions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_transactions" ADD CONSTRAINT "admin_transactions_adminWalletId_fkey" FOREIGN KEY ("adminWalletId") REFERENCES "admin_wallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_split" ADD CONSTRAINT "revenue_split_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
