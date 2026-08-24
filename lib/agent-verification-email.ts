type VerificationCommand = { name: string; description: string; riskLevel: string };

export function getVerificationEmailConfig(environment: Record<string, string | undefined>) {
  const apiKey = environment.RESEND_API_KEY?.trim();
  const from = environment.CALLABLE_EMAIL_FROM?.trim();
  return apiKey && from ? { apiKey, from } : null;
}

export function buildAgentVerificationEmail(input: { recipient: string; agentName: string; commands: VerificationCommand[]; completedAt: Date }) {
  const commandList = input.commands.map((command) => `- ${command.name} [${command.riskLevel}]: ${command.description}`).join("\n");
  const text = [
    "Callable agent verification complete",
    "",
    `Agent: ${input.agentName}`,
    `Completed: ${input.completedAt.toISOString()}`,
    "",
    "The agent retrieved Callable's current published command inventory and completed a successful dry run.",
    "",
    "Published commands:",
    commandList || "No published commands.",
  ].join("\n");
  return { to: input.recipient, subject: "Callable agent verification complete", text };
}

export async function sendAgentVerificationEmail(input: { recipient: string; agentName: string; commands: VerificationCommand[]; completedAt: Date; idempotencyKey: string }) {
  const config = getVerificationEmailConfig(process.env);
  if (!config) return { status: "unavailable" as const, reason: "RESEND_API_KEY and CALLABLE_EMAIL_FROM must be configured." };

  const email = buildAgentVerificationEmail(input);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json",
      "user-agent": "Callable/0.1",
      "idempotency-key": input.idempotencyKey,
    },
    body: JSON.stringify({ from: config.from, to: email.to, subject: email.subject, text: email.text }),
    signal: AbortSignal.timeout(10_000),
  });
  const responseBody = await response.text();
  if (!response.ok) return { status: "failed" as const, reason: `Email provider returned ${response.status}${responseBody ? `: ${responseBody.slice(0, 500)}` : ""}` };

  let providerId: string | null = null;
  try {
    const parsed = JSON.parse(responseBody) as { id?: unknown };
    providerId = typeof parsed.id === "string" ? parsed.id : null;
  } catch {
    // The provider accepted the message even if it did not return JSON.
  }
  return { status: "sent" as const, providerId };
}
