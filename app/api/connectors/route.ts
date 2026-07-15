import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { forbidden, ok, serverError } from "@/lib/http";
import { CONNECTOR_CATALOG } from "@/lib/connectors/catalog";
import { resolveProviderKeyFromMetadata } from "@/lib/connectors/metadata";
import { requirePermission } from "@/lib/permissions";

export async function GET() {
  try {
    const { organisationId, user } = await getDevContext();
    requirePermission(user.role, "connectors:read");
    const apps = await prisma.app.findMany({
      where: { organisationId },
      select: { id: true, type: true, connectionStatus: true, metadataJson: true },
    });

    const rollup = new Map<string, { total: number; connected: number; failed: number; notConnected: number }>();
    for (const connector of CONNECTOR_CATALOG) {
      rollup.set(connector.providerKey, { total: 0, connected: 0, failed: 0, notConnected: 0 });
    }

    for (const app of apps) {
      const key = resolveProviderKeyFromMetadata(app.type, app.metadataJson);
      const current = rollup.get(key);
      if (!current) continue;
      current.total += 1;
      if (app.connectionStatus === "connected") current.connected += 1;
      else if (app.connectionStatus === "failed") current.failed += 1;
      else current.notConnected += 1;
    }

    const connectors = CONNECTOR_CATALOG.map((connector) => ({
      ...connector,
      usage: rollup.get(connector.providerKey) ?? { total: 0, connected: 0, failed: 0, notConnected: 0 },
    }));

    return ok({ connectors });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}
