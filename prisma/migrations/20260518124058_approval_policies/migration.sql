-- CreateTable
CREATE TABLE "public"."approval_policies" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "policy_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "approval_policies_organisation_id_idx" ON "public"."approval_policies"("organisation_id");

-- CreateIndex
CREATE INDEX "approval_policies_organisation_id_status_is_default_idx" ON "public"."approval_policies"("organisation_id", "status", "is_default");

-- AddForeignKey
ALTER TABLE "public"."approval_policies" ADD CONSTRAINT "approval_policies_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
