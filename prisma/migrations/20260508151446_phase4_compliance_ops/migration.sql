-- CreateTable
CREATE TABLE "public"."retention_policies" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "audit_log_days" INTEGER NOT NULL DEFAULT 90,
    "approval_days" INTEGER NOT NULL DEFAULT 90,
    "execution_days" INTEGER NOT NULL DEFAULT 90,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retention_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "retention_policies_organisation_id_key" ON "public"."retention_policies"("organisation_id");

-- AddForeignKey
ALTER TABLE "public"."retention_policies" ADD CONSTRAINT "retention_policies_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
