-- CreateEnum
CREATE TYPE "admin_status" AS ENUM ('active', 'suspended');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('active', 'suspended');

-- CreateEnum
CREATE TYPE "user_roles" AS ENUM ('user', 'manager');

-- CreateEnum
CREATE TYPE "event_status" AS ENUM ('active', 'suspended', 'completed');

-- CreateEnum
CREATE TYPE "booking_status" AS ENUM ('pending', 'confirmed', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "SeatHoldStatus" AS ENUM ('hold', 'processing', 'completed', 'expired');

-- CreateEnum
CREATE TYPE "txn_type" AS ENUM ('credit', 'debit');

-- CreateEnum
CREATE TYPE "txn_purpose" AS ENUM ('booking_payment', 'platform_commission', 'event_manager_payout', 'wallet_topup', 'refund');

-- CreateEnum
CREATE TYPE "split_type" AS ENUM ('admin', 'manager');

-- CreateEnum
CREATE TYPE "otp_transport" AS ENUM ('email', 'mobile');

-- CreateEnum
CREATE TYPE "setting_type" AS ENUM ('binary', 'multi_select', 'single_select');

-- CreateEnum
CREATE TYPE "setting_context" AS ENUM ('user', 'system');

-- CreateTable
CREATE TABLE "admin" (
    "id" SERIAL NOT NULL,
    "firstname" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "profile_image" TEXT,
    "status" "admin_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_meta" (
    "password_salt" TEXT,
    "password_hash" TEXT,
    "admin_id" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "admin_wallet" (
    "id" SERIAL NOT NULL,
    "admin_id" INTEGER NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_wallet_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "firstname" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "username" TEXT,
    "email" TEXT NOT NULL,
    "dial_code" TEXT,
    "mobile" TEXT,
    "profile_image" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "country" TEXT,
    "role" "user_roles" NOT NULL DEFAULT 'user',
    "status" "user_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_meta" (
    "google_id" TEXT,
    "password_salt" TEXT,
    "password_hash" TEXT,
    "user_id" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "wallet" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "txn_type" NOT NULL,
    "purpose" "txn_purpose" NOT NULL,
    "reference_id" INTEGER,
    "note" TEXT,
    "walletId" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "performer" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "age_limit" INTEGER NOT NULL,
    "total_seats" INTEGER NOT NULL,
    "booked_seats" INTEGER NOT NULL DEFAULT 0,
    "status" "event_status" NOT NULL DEFAULT 'active',
    "manager_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "event_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "status" "booking_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeatHold" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "eventId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "SeatHoldStatus" NOT NULL DEFAULT 'hold',
    "paymentStartedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeatHold_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "otp" (
    "code" TEXT NOT NULL,
    "attempt" SMALLINT NOT NULL DEFAULT 1,
    "last_sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retries" SMALLINT NOT NULL DEFAULT 0,
    "transport" "otp_transport" NOT NULL,
    "target" TEXT NOT NULL,
    "last_code_verified" BOOLEAN NOT NULL DEFAULT false,
    "blocked" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "setting" (
    "id" SERIAL NOT NULL,
    "mapped_to" TEXT NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "type" "setting_type" NOT NULL,
    "context" "setting_context" NOT NULL,
    "default" JSONB NOT NULL,
    "is_defined_options" BOOLEAN NOT NULL,
    "parent_id" INTEGER,

    CONSTRAINT "setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "setting_option" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',
    "value" TEXT NOT NULL,
    "setting_id" INTEGER NOT NULL,

    CONSTRAINT "setting_option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_setting" (
    "selection" JSONB NOT NULL,
    "user_id" INTEGER NOT NULL,
    "setting_id" INTEGER NOT NULL,

    CONSTRAINT "user_setting_pkey" PRIMARY KEY ("user_id","setting_id")
);

-- CreateTable
CREATE TABLE "system_setting" (
    "selection" JSONB NOT NULL,
    "setting_id" INTEGER NOT NULL,

    CONSTRAINT "system_setting_pkey" PRIMARY KEY ("setting_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_email_key" ON "admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admin_meta_admin_id_key" ON "admin_meta"("admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_wallet_admin_id_key" ON "admin_wallet"("admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_mobile_key" ON "user"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "user_meta_google_id_key" ON "user_meta"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_meta_user_id_key" ON "user_meta"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_user_id_key" ON "wallet"("user_id");

-- CreateIndex
CREATE INDEX "transaction_user_id_idx" ON "transaction"("user_id");

-- CreateIndex
CREATE INDEX "event_manager_id_idx" ON "event"("manager_id");

-- CreateIndex
CREATE INDEX "booking_user_id_idx" ON "booking"("user_id");

-- CreateIndex
CREATE INDEX "booking_event_id_idx" ON "booking"("event_id");

-- CreateIndex
CREATE INDEX "revenue_split_booking_id_idx" ON "revenue_split"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "otp_transport_target_key" ON "otp"("transport", "target");

-- CreateIndex
CREATE UNIQUE INDEX "setting_context_mapped_to_key" ON "setting"("context", "mapped_to");

-- CreateIndex
CREATE UNIQUE INDEX "setting_option_setting_id_value_key" ON "setting_option"("setting_id", "value");

-- AddForeignKey
ALTER TABLE "admin_meta" ADD CONSTRAINT "admin_meta_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_wallet" ADD CONSTRAINT "admin_wallet_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_transactions" ADD CONSTRAINT "admin_transactions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_transactions" ADD CONSTRAINT "admin_transactions_adminWalletId_fkey" FOREIGN KEY ("adminWalletId") REFERENCES "admin_wallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_meta" ADD CONSTRAINT "user_meta_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet" ADD CONSTRAINT "wallet_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatHold" ADD CONSTRAINT "SeatHold_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatHold" ADD CONSTRAINT "SeatHold_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_split" ADD CONSTRAINT "revenue_split_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "setting" ADD CONSTRAINT "setting_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "setting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "setting_option" ADD CONSTRAINT "setting_option_setting_id_fkey" FOREIGN KEY ("setting_id") REFERENCES "setting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_setting" ADD CONSTRAINT "user_setting_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_setting" ADD CONSTRAINT "user_setting_setting_id_fkey" FOREIGN KEY ("setting_id") REFERENCES "setting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_setting" ADD CONSTRAINT "system_setting_setting_id_fkey" FOREIGN KEY ("setting_id") REFERENCES "setting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
