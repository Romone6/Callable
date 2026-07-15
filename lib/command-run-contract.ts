import { z } from "zod";
import { badRequest } from "@/lib/http";

export const commandRunRequestSchema = z.object({
  agent_name: z.string().min(1),
  dry_run: z.boolean().optional(),
  input: z.record(z.string(), z.unknown()),
});

export async function parseCommandRunRequest(request: Request) {
  const body = await request.json();
  const parsed = commandRunRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      error: await badRequest("Invalid command run payload", parsed.error.flatten()),
      data: null,
    };
  }

  return { error: null, data: parsed.data };
}
