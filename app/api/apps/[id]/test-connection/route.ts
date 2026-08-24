import { ConnectionStatus } from "@prisma/client";

import { getDevContext } from "@/lib/auth";
import { resolveProviderKeyFromMetadata } from "@/lib/connectors/metadata";
import { readZendeskCredentials, zendeskAuthorizationHeader } from "@/lib/connectors/zendesk";
import { buildSalesforceConnectionRequest, readSalesforceCredentials } from "@/lib/connectors/salesforce";
import { prisma } from "@/lib/db";
import { forbidden, notFound, ok, serverError } from "@/lib/http";
import { requirePermission } from "@/lib/permissions";

async function testConnection(app: { baseUrl: string; type: "internal_web_app" | "custom_web_app" | "api_schema" | "uploaded_workflow_evidence"; metadataJson: unknown }): Promise<string | null> {
  try {
    const providerKey = resolveProviderKeyFromMetadata(app.type, app.metadataJson as never);
    const salesforce = providerKey === "salesforce" ? buildSalesforceConnectionRequest(app.baseUrl, readSalesforceCredentials(app.metadataJson)) : null;
    const endpoint = salesforce?.endpoint ?? (providerKey === "zendesk" ? new URL("/api/v2/users/me.json", app.baseUrl).toString() : `${app.baseUrl}/api/health`);
    const headers = salesforce?.headers ?? (providerKey === "zendesk" ? { authorization: zendeskAuthorizationHeader(readZendeskCredentials(app.metadataJson)) } : undefined);
    const response = await fetch(endpoint, { headers, signal: AbortSignal.timeout(3000) });

    if (response.ok) return null;
    const body = (await response.text()).trim().slice(0, 500);
    return `Connection endpoint returned ${response.status}${body ? `: ${body}` : ""}`;
  } catch (cause) {
    return cause instanceof Error ? cause.message : String(cause);
  }
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organisationId, userId, user } = await getDevContext();
    requirePermission(user.role, "apps:manage");
    const app = await prisma.app.findFirst({ where: { id: (await params).id, organisationId } });
    if (!app) return notFound("App not found");

    const error = await testConnection(app);
    const connectionStatus = error ? ConnectionStatus.failed : ConnectionStatus.connected;
    const updated = await prisma.app.update({ where: { id: app.id }, data: { connectionStatus } });
    await prisma.auditLog.create({
      data: {
        organisationId,
        eventType: "app_connection_tested",
        actorType: "user",
        actorId: userId,
        detailsJson: { app_id: app.id, connection_status: connectionStatus, error },
      },
    });

    return ok({ app: updated, tested: true, connection_status: connectionStatus, error });
  } catch (error) {
    return error instanceof Error && error.message.startsWith("Forbidden") ? forbidden(error.message) : serverError(error);
  }
}
