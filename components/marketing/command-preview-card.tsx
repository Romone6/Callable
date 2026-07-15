import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/shared/copy-button";

const runContract = `POST /api/agent/commands/issue_refund_from_ticket/run
Authorization: Bearer <api_key>
Content-Type: application/json

{
  "agent_name": "support-agent",
  "input": {
    "ticket_id": "TCK-1049",
    "amount": 75,
    "reason": "duplicate billing"
  }
}`;

export function CommandPreviewCard() {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Live API contract</h3>
        <div className="flex items-center gap-2">
          <Badge variant="success">Executable</Badge>
          <CopyButton value={runContract} />
        </div>
      </div>
      <pre className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-black/25 p-3 text-xs text-lime-100">{runContract}</pre>
    </Card>
  );
}
