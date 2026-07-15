-- CreateTable
CREATE TABLE "public"."custom_roles" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "role_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custom_roles_organisation_id_idx" ON "public"."custom_roles"("organisation_id");

-- CreateIndex
CREATE UNIQUE INDEX "custom_roles_organisation_id_role_key_key" ON "public"."custom_roles"("organisation_id", "role_key");

-- AddForeignKey
ALTER TABLE "public"."custom_roles" ADD CONSTRAINT "custom_roles_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
