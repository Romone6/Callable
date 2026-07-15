-- CreateTable
CREATE TABLE "public"."send_events" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "command_id" TEXT,
    "execution_id" TEXT,
    "approval_policy_id" TEXT,
    "source" TEXT NOT NULL,
    "decision_status" TEXT NOT NULL,
    "decision_snapshot_json" JSONB NOT NULL,
    "reviewer_state_json" JSONB,
    "risk_state_json" JSONB,
    "connector_target_json" JSONB,
    "delivery_confirmation_json" JSONB,
    "delivery_state" TEXT NOT NULL DEFAULT 'not_dispatched',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "send_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "send_events_organisation_id_created_at_idx" ON "public"."send_events"("organisation_id", "created_at");

-- CreateIndex
CREATE INDEX "send_events_command_id_idx" ON "public"."send_events"("command_id");

-- CreateIndex
CREATE INDEX "send_events_execution_id_idx" ON "public"."send_events"("execution_id");

-- CreateIndex
CREATE INDEX "send_events_approval_policy_id_idx" ON "public"."send_events"("approval_policy_id");

-- AddForeignKey
ALTER TABLE "public"."send_events" ADD CONSTRAINT "send_events_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."send_events" ADD CONSTRAINT "send_events_command_id_fkey" FOREIGN KEY ("command_id") REFERENCES "public"."action_commands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."send_events" ADD CONSTRAINT "send_events_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "public"."command_executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."send_events" ADD CONSTRAINT "send_events_approval_policy_id_fkey" FOREIGN KEY ("approval_policy_id") REFERENCES "public"."approval_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
