-- CreateTable
CREATE TABLE "public"."organisation_security_policies" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "session_timeout_minutes" INTEGER NOT NULL DEFAULT 480,
    "api_key_ttl_days" INTEGER NOT NULL DEFAULT 90,
    "require_mfa" BOOLEAN NOT NULL DEFAULT false,
    "ip_allowlist_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisation_security_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organisation_security_policies_organisation_id_key" ON "public"."organisation_security_policies"("organisation_id");

-- AddForeignKey
ALTER TABLE "public"."organisation_security_policies" ADD CONSTRAINT "organisation_security_policies_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
