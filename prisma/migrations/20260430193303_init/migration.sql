-- CreateEnum
CREATE TYPE "public"."AppType" AS ENUM ('internal_web_app', 'custom_web_app', 'api_schema', 'uploaded_workflow_evidence');

-- CreateEnum
CREATE TYPE "public"."ConnectionStatus" AS ENUM ('not_connected', 'connected', 'failed');

-- CreateEnum
CREATE TYPE "public"."ExecutionMode" AS ENUM ('api', 'browser', 'hybrid');

-- CreateEnum
CREATE TYPE "public"."SourceType" AS ENUM ('sop_document', 'csv_ticket_export', 'json_browser_trace', 'openapi_schema', 'playwright_trace', 'manual_process_text');

-- CreateEnum
CREATE TYPE "public"."SourceStatus" AS ENUM ('uploaded', 'parsed', 'parse_failed');

-- CreateEnum
CREATE TYPE "public"."CandidateStatus" AS ENUM ('needs_review', 'accepted', 'rejected');

-- CreateEnum
CREATE TYPE "public"."RiskLevel" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "public"."CommandStatus" AS ENUM ('draft', 'needs_review', 'testing', 'published', 'paused', 'broken', 'archived');

-- CreateEnum
CREATE TYPE "public"."HealthStatus" AS ENUM ('unknown', 'healthy', 'warning', 'broken');

-- CreateEnum
CREATE TYPE "public"."StepType" AS ENUM ('api', 'browser');

-- CreateEnum
CREATE TYPE "public"."ExecutionStatus" AS ENUM ('queued', 'running', 'waiting_for_approval', 'succeeded', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "public"."ApprovalStatus" AS ENUM ('pending', 'approved', 'rejected', 'more_info');

-- CreateEnum
CREATE TYPE "public"."DriftStatus" AS ENUM ('healthy', 'warning', 'broken');

-- CreateEnum
CREATE TYPE "public"."DriftSeverity" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "public"."ActorType" AS ENUM ('system', 'user', 'agent');

-- CreateTable
CREATE TABLE "public"."organisations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."apps" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."AppType" NOT NULL,
    "base_url" TEXT NOT NULL,
    "auth_method" TEXT NOT NULL,
    "connection_status" "public"."ConnectionStatus" NOT NULL DEFAULT 'not_connected',
    "execution_mode" "public"."ExecutionMode" NOT NULL DEFAULT 'hybrid',
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."discovery_sources" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "app_id" TEXT,
    "type" "public"."SourceType" NOT NULL,
    "name" TEXT NOT NULL,
    "file_url" TEXT,
    "raw_text" TEXT,
    "parsed_json" JSONB,
    "status" "public"."SourceStatus" NOT NULL DEFAULT 'uploaded',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discovery_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."workflow_candidates" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "app_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "risk_level" "public"."RiskLevel" NOT NULL,
    "required_inputs_json" JSONB NOT NULL,
    "expected_outputs_json" JSONB NOT NULL,
    "approval_conditions_json" JSONB,
    "source_evidence_json" JSONB NOT NULL,
    "status" "public"."CandidateStatus" NOT NULL DEFAULT 'needs_review',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."action_commands" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "app_id" TEXT,
    "candidate_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "input_schema_json" JSONB NOT NULL,
    "output_schema_json" JSONB NOT NULL,
    "execution_strategy" TEXT NOT NULL,
    "risk_level" "public"."RiskLevel" NOT NULL,
    "approval_rules_json" JSONB,
    "success_condition" TEXT NOT NULL,
    "failure_conditions_json" JSONB,
    "source_evidence_json" JSONB NOT NULL,
    "status" "public"."CommandStatus" NOT NULL DEFAULT 'draft',
    "health_status" "public"."HealthStatus" NOT NULL DEFAULT 'unknown',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "action_commands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."command_steps" (
    "id" TEXT NOT NULL,
    "command_id" TEXT NOT NULL,
    "step_index" INTEGER NOT NULL,
    "step_type" "public"."StepType" NOT NULL,
    "api_route" TEXT,
    "http_method" TEXT,
    "selector" TEXT,
    "fallback_selector" TEXT,
    "input_mapping_json" JSONB,
    "success_condition_json" JSONB,
    "error_condition_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "command_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."command_executions" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "command_id" TEXT NOT NULL,
    "agent_name" TEXT NOT NULL,
    "user_id" TEXT,
    "input_json" JSONB NOT NULL,
    "output_json" JSONB,
    "status" "public"."ExecutionStatus" NOT NULL DEFAULT 'queued',
    "execution_mode" "public"."ExecutionMode" NOT NULL DEFAULT 'api',
    "approval_status" "public"."ApprovalStatus",
    "error_message" TEXT,
    "trace_url" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "command_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."approvals" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "execution_id" TEXT NOT NULL,
    "command_id" TEXT NOT NULL,
    "requested_by_agent" TEXT NOT NULL,
    "reviewer_id" TEXT,
    "status" "public"."ApprovalStatus" NOT NULL DEFAULT 'pending',
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."drift_checks" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "command_id" TEXT NOT NULL,
    "status" "public"."DriftStatus" NOT NULL,
    "severity" "public"."DriftSeverity" NOT NULL,
    "issue_type" TEXT NOT NULL,
    "issue_description" TEXT NOT NULL,
    "raw_result_json" JSONB NOT NULL,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drift_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "actor_type" "public"."ActorType" NOT NULL,
    "actor_id" TEXT,
    "command_id" TEXT,
    "execution_id" TEXT,
    "details_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."api_keys" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "scopes_json" JSONB NOT NULL,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customers" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tickets" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "ticket_code" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "refund_eligible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."refunds" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "confirmation_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organisations_slug_key" ON "public"."organisations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_organisation_id_idx" ON "public"."users"("organisation_id");

-- CreateIndex
CREATE INDEX "apps_organisation_id_idx" ON "public"."apps"("organisation_id");

-- CreateIndex
CREATE INDEX "discovery_sources_organisation_id_idx" ON "public"."discovery_sources"("organisation_id");

-- CreateIndex
CREATE INDEX "discovery_sources_app_id_idx" ON "public"."discovery_sources"("app_id");

-- CreateIndex
CREATE INDEX "workflow_candidates_organisation_id_idx" ON "public"."workflow_candidates"("organisation_id");

-- CreateIndex
CREATE INDEX "workflow_candidates_app_id_idx" ON "public"."workflow_candidates"("app_id");

-- CreateIndex
CREATE INDEX "action_commands_organisation_id_idx" ON "public"."action_commands"("organisation_id");

-- CreateIndex
CREATE INDEX "action_commands_name_idx" ON "public"."action_commands"("name");

-- CreateIndex
CREATE INDEX "action_commands_app_id_idx" ON "public"."action_commands"("app_id");

-- CreateIndex
CREATE INDEX "command_steps_command_id_idx" ON "public"."command_steps"("command_id");

-- CreateIndex
CREATE INDEX "command_executions_organisation_id_idx" ON "public"."command_executions"("organisation_id");

-- CreateIndex
CREATE INDEX "command_executions_command_id_idx" ON "public"."command_executions"("command_id");

-- CreateIndex
CREATE INDEX "approvals_organisation_id_idx" ON "public"."approvals"("organisation_id");

-- CreateIndex
CREATE INDEX "approvals_execution_id_idx" ON "public"."approvals"("execution_id");

-- CreateIndex
CREATE INDEX "drift_checks_organisation_id_idx" ON "public"."drift_checks"("organisation_id");

-- CreateIndex
CREATE INDEX "drift_checks_command_id_idx" ON "public"."drift_checks"("command_id");

-- CreateIndex
CREATE INDEX "audit_logs_organisation_id_idx" ON "public"."audit_logs"("organisation_id");

-- CreateIndex
CREATE INDEX "audit_logs_event_type_idx" ON "public"."audit_logs"("event_type");

-- CreateIndex
CREATE INDEX "audit_logs_command_id_idx" ON "public"."audit_logs"("command_id");

-- CreateIndex
CREATE INDEX "audit_logs_execution_id_idx" ON "public"."audit_logs"("execution_id");

-- CreateIndex
CREATE INDEX "api_keys_organisation_id_idx" ON "public"."api_keys"("organisation_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_external_id_key" ON "public"."customers"("external_id");

-- CreateIndex
CREATE INDEX "customers_organisation_id_idx" ON "public"."customers"("organisation_id");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticket_code_key" ON "public"."tickets"("ticket_code");

-- CreateIndex
CREATE INDEX "tickets_organisation_id_idx" ON "public"."tickets"("organisation_id");

-- CreateIndex
CREATE INDEX "tickets_customer_id_idx" ON "public"."tickets"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_confirmation_id_key" ON "public"."refunds"("confirmation_id");

-- CreateIndex
CREATE INDEX "refunds_organisation_id_idx" ON "public"."refunds"("organisation_id");

-- CreateIndex
CREATE INDEX "refunds_ticket_id_idx" ON "public"."refunds"("ticket_id");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."apps" ADD CONSTRAINT "apps_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."discovery_sources" ADD CONSTRAINT "discovery_sources_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."discovery_sources" ADD CONSTRAINT "discovery_sources_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."workflow_candidates" ADD CONSTRAINT "workflow_candidates_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."workflow_candidates" ADD CONSTRAINT "workflow_candidates_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."action_commands" ADD CONSTRAINT "action_commands_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."action_commands" ADD CONSTRAINT "action_commands_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."action_commands" ADD CONSTRAINT "action_commands_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."workflow_candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."command_steps" ADD CONSTRAINT "command_steps_command_id_fkey" FOREIGN KEY ("command_id") REFERENCES "public"."action_commands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."command_executions" ADD CONSTRAINT "command_executions_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."command_executions" ADD CONSTRAINT "command_executions_command_id_fkey" FOREIGN KEY ("command_id") REFERENCES "public"."action_commands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."approvals" ADD CONSTRAINT "approvals_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."approvals" ADD CONSTRAINT "approvals_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "public"."command_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."approvals" ADD CONSTRAINT "approvals_command_id_fkey" FOREIGN KEY ("command_id") REFERENCES "public"."action_commands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."drift_checks" ADD CONSTRAINT "drift_checks_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."drift_checks" ADD CONSTRAINT "drift_checks_command_id_fkey" FOREIGN KEY ("command_id") REFERENCES "public"."action_commands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_command_id_fkey" FOREIGN KEY ("command_id") REFERENCES "public"."action_commands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "public"."command_executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."api_keys" ADD CONSTRAINT "api_keys_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customers" ADD CONSTRAINT "customers_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tickets" ADD CONSTRAINT "tickets_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tickets" ADD CONSTRAINT "tickets_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refunds" ADD CONSTRAINT "refunds_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refunds" ADD CONSTRAINT "refunds_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refunds" ADD CONSTRAINT "refunds_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
