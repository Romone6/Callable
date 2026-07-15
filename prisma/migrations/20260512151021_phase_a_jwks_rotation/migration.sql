-- CreateEnum
CREATE TYPE "public"."CronJwksKeyStatus" AS ENUM ('active', 'grace', 'retired');

-- CreateTable
CREATE TABLE "public"."cron_jwks_keys" (
    "id" TEXT NOT NULL,
    "key_id" TEXT NOT NULL,
    "public_jwk_json" JSONB NOT NULL,
    "status" "public"."CronJwksKeyStatus" NOT NULL DEFAULT 'active',
    "grace_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rotated_at" TIMESTAMP(3),

    CONSTRAINT "cron_jwks_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cron_jwks_keys_key_id_key" ON "public"."cron_jwks_keys"("key_id");

-- CreateIndex
CREATE INDEX "cron_jwks_keys_status_idx" ON "public"."cron_jwks_keys"("status");
