import { chromium } from "playwright";
import { DriftSeverity, DriftStatus, HealthStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { writeAuditLog } from "@/lib/audit";

export async function runDriftCheck(commandId: string, organisationId: string) {
  const command = await prisma.actionCommand.findUnique({
    where: { id: commandId },
    include: { steps: true },
  });

  if (!command) throw new Error("Command not found");

  const issues: Array<{ type: string; description: string; severity: DriftSeverity }> = [];

  for (const step of command.steps) {
    if (step.apiRoute) {
      try {
        const response = await fetch(`${env.APP_BASE_URL}${step.apiRoute}`, {
          method: step.httpMethod ?? "GET",
          signal: AbortSignal.timeout(3000),
        });
        if (response.status === 404) {
          issues.push({
            type: "api_route_missing",
            description: `API route returned 404: ${step.apiRoute}`,
            severity: DriftSeverity.high,
          });
        }
      } catch (error) {
        issues.push({
          type: "api_unreachable",
          description: `API route unreachable: ${step.apiRoute} (${error instanceof Error ? error.message : String(error)})`,
          severity: DriftSeverity.high,
        });
      }
    }
  }

  const selectorStep = command.steps.find((step) => step.selector);
  if (selectorStep?.selector) {
    try {
      const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL });
      const page = await browser.newPage();
      try {
        await page.goto(`${env.APP_BASE_URL}/acme/tickets`);
        const found = await page.locator(selectorStep.selector).count();
        if (found === 0) {
          issues.push({
            type: "selector_missing",
            description: `Required selector missing: ${selectorStep.selector}`,
            severity: DriftSeverity.medium,
          });
        }
      } finally {
        await browser.close();
      }
    } catch (error) {
      issues.push({
        type: "browser_unavailable",
        description: `Browser drift check unavailable: ${error instanceof Error ? error.message : String(error)}`,
        severity: DriftSeverity.high,
      });
    }
  }

  const status = issues.length === 0 ? DriftStatus.healthy : issues.some((issue) => issue.severity === DriftSeverity.high) ? DriftStatus.broken : DriftStatus.warning;

  const check = await prisma.driftCheck.create({
    data: {
      organisationId,
      commandId,
      status,
      severity:
        status === DriftStatus.healthy
          ? DriftSeverity.low
          : status === DriftStatus.warning
            ? DriftSeverity.medium
            : DriftSeverity.high,
      issueType: issues[0]?.type ?? "no_issues",
      issueDescription: issues[0]?.description ?? "All checks passed",
      rawResultJson: { issues },
    },
  });

  await prisma.actionCommand.update({
    where: { id: commandId },
    data: {
      healthStatus:
        status === DriftStatus.healthy
          ? HealthStatus.healthy
          : status === DriftStatus.warning
            ? HealthStatus.warning
            : HealthStatus.broken,
    },
  });

  await writeAuditLog({
    organisationId,
    eventType: status === DriftStatus.healthy ? "drift_check_passed" : "drift_check_failed",
    actorType: "system",
    commandId,
    details: { drift_check_id: check.id, status, issues },
  });

  return check;
}

