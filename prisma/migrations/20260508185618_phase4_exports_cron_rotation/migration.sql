-- CreateTable
CREATE TABLE "public"."export_signing_keys" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "key_id" TEXT NOT NULL,
    "key_cipher_json" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rotated_at" TIMESTAMP(3),

    CONSTRAINT "export_signing_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."compliance_exports" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "row_count" INTEGER NOT NULL DEFAULT 0,
    "from_date" TIMESTAMP(3),
    "to_date" TIMESTAMP(3),
    "signature" TEXT NOT NULL,
    "signature_key_id" TEXT NOT NULL,
    "artifact_path" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_exports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "export_signing_keys_organisation_id_idx" ON "public"."export_signing_keys"("organisation_id");

-- CreateIndex
CREATE UNIQUE INDEX "export_signing_keys_organisation_id_key_id_key" ON "public"."export_signing_keys"("organisation_id", "key_id");

-- CreateIndex
CREATE INDEX "compliance_exports_organisation_id_idx" ON "public"."compliance_exports"("organisation_id");

-- CreateIndex
CREATE INDEX "compliance_exports_resource_created_at_idx" ON "public"."compliance_exports"("resource", "created_at");

-- AddForeignKey
ALTER TABLE "public"."export_signing_keys" ADD CONSTRAINT "export_signing_keys_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."compliance_exports" ADD CONSTRAINT "compliance_exports_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."compliance_exports" ADD CONSTRAINT "compliance_exports_signature_key_id_fkey" FOREIGN KEY ("signature_key_id") REFERENCES "public"."export_signing_keys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
