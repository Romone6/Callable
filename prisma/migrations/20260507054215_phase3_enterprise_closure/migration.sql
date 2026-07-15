-- AlterTable
ALTER TABLE "public"."approvals" ADD COLUMN     "required_role" TEXT,
ADD COLUMN     "stage_index" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stage_name" TEXT;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "external_id" TEXT;

-- CreateTable
CREATE TABLE "public"."identity_providers" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "provider_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT,
    "sso_url" TEXT,
    "x509_cert" TEXT,
    "domains_json" JSONB,
    "metadata_json" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "identity_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scim_tokens" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "scim_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "identity_providers_organisation_id_idx" ON "public"."identity_providers"("organisation_id");

-- CreateIndex
CREATE INDEX "scim_tokens_organisation_id_idx" ON "public"."scim_tokens"("organisation_id");

-- CreateIndex
CREATE INDEX "users_organisation_id_external_id_idx" ON "public"."users"("organisation_id", "external_id");

-- AddForeignKey
ALTER TABLE "public"."identity_providers" ADD CONSTRAINT "identity_providers_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scim_tokens" ADD CONSTRAINT "scim_tokens_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
