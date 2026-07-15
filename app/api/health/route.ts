import { ok } from "@/lib/http";
import { getReadinessReport } from "@/lib/readiness";

export async function GET() {
  const report = await getReadinessReport();
  return ok(report, report.status === "ok" ? 200 : 503);
}
