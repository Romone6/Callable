import { RiskLevel } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { badRequest, forbidden, ok } from "@/lib/http";
import { discoverWorkflows } from "@/lib/discovery";
import { runDiscoverySchema } from "@/lib/schemas";
import { writeAuditLog } from "@/lib/audit";
import { requirePermission } from "@/lib/permissions";

export async function POST(request: Request) {
  try {
    const { organisationId, userId, user } = await getDevContext();
    requirePermission(user.role, "discovery:manage");
    const parsed = runDiscoverySchema.safeParse(await request.json());
    if (!parsed.success) {
      return badRequest("Invalid discovery run payload", parsed.error.flatten());
    }

    const sources = await prisma.discoverySource.findMany({
      where: {
        organisationId,
        id: { in: parsed.data.source_ids },
      },
    });

    if (sources.length === 0) {
      return badRequest("No valid discovery sources found");
    }

    const candidates = await discoverWorkflows(sources);

    if (candidates.length === 0) {
      return ok({ message: "No candidate workflows found from the selected sources.", candidates: [] });
    }

    const created = await prisma.$transaction(
      candidates.map((candidate) =>
        prisma.workflowCandidate.create({
          data: {
            organisationId,
            appId: parsed.data.app_id,
            name: candidate.name,
            description: candidate.description,
            confidence: candidate.confidence,
            riskLevel: candidate.risk_level as RiskLevel,
            requiredInputsJson: candidate.required_inputs,
            expectedOutputsJson: candidate.expected_outputs,
            approvalConditionsJson: candidate.approval_conditions,
            sourceEvidenceJson: candidate.source_evidence,
          },
        }),
      ),
    );

    for (const candidate of created) {
      await writeAuditLog({
        organisationId,
        eventType: "workflow_discovered",
        actorType: "user",
        actorId: userId,
        details: {
          candidate_id: candidate.id,
          candidate_name: candidate.name,
          confidence: candidate.confidence,
        },
      });
    }

    return ok({ candidates: created });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return badRequest("Discovery failed", error instanceof Error ? error.message : String(error));
  }
}
