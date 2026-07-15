-- AlterTable
ALTER TABLE "public"."command_executions" ADD COLUMN     "idempotency_key" TEXT;

-- AlterTable
ALTER TABLE "public"."organisations" ADD COLUMN     "clerk_org_id" TEXT;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "clerk_user_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "command_executions_organisation_id_command_id_idempotency_k_key" ON "public"."command_executions"("organisation_id", "command_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "organisations_clerk_org_id_key" ON "public"."organisations"("clerk_org_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_clerk_user_id_key" ON "public"."users"("clerk_user_id");

