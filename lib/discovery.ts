import OpenAI from "openai";
import { RiskLevel, type DiscoverySource } from "@prisma/client";
import { env } from "@/lib/env";

export type DiscoveryCandidate = {
  name: string;
  description: string;
  required_inputs: string[];
  expected_outputs: string[];
  risk_level: RiskLevel;
  approval_conditions: string[];
  source_evidence: string[];
  confidence: number;
};

const outputShapeDescription = `
Return strict JSON in this exact shape:
{
  "candidates": [{
    "name": "string",
    "description": "string",
    "required_inputs": ["string"],
    "expected_outputs": ["string"],
    "risk_level": "low|medium|high",
    "approval_conditions": ["string"],
    "source_evidence": ["string"],
    "confidence": 0.0
  }]
}
If no candidates are found, return {"candidates": []}.
`;

function buildEvidencePayload(sources: DiscoverySource[]) {
  return sources.map((source) => ({
    id: source.id,
    name: source.name,
    type: source.type,
    raw_text: source.rawText,
    parsed_json: source.parsedJson,
  }));
}

function normalizeCandidates(rawText: string) {
  const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(cleaned) as { candidates?: DiscoveryCandidate[] };
  const candidates = Array.isArray(parsed.candidates) ? parsed.candidates : [];

  return candidates
    .map((candidate) => ({
      ...candidate,
      risk_level: candidate.risk_level,
      confidence: Math.max(0, Math.min(1, Number(candidate.confidence ?? 0))),
    }))
    .filter((candidate) => candidate.name && candidate.description);
}

async function runOpenAIDiscovery(evidence: unknown) {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured. Discovery is unavailable.");
  }

  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const response = await openai.responses.create({
    model: env.OPENAI_MODEL,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: "You extract executable business workflow candidates from real evidence. Never invent workflows.",
          },
        ],
      },
      {
        role: "user",
        content: [{ type: "input_text", text: `${outputShapeDescription}\n\nEvidence:\n${JSON.stringify(evidence)}` }],
      },
    ],
  });

  const text = response.output_text;
  if (!text) throw new Error("Discovery model returned empty output.");
  return text;
}

async function runAnthropicDiscovery(evidence: unknown) {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured. Discovery is unavailable.");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 1500,
      system: "You extract executable business workflow candidates from real evidence. Never invent workflows.",
      messages: [{ role: "user", content: `${outputShapeDescription}\n\nEvidence:\n${JSON.stringify(evidence)}` }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic discovery request failed: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = data.content?.find((part) => part.type === "text")?.text;
  if (!text) throw new Error("Anthropic discovery model returned empty output.");
  return text;
}

async function runOpenRouterDiscovery(evidence: unknown) {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not configured. Discovery is unavailable.");
  }

  const client = new OpenAI({
    apiKey: env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
  });

  const response = await client.chat.completions.create({
    model: env.OPENROUTER_MODEL,
    messages: [
      {
        role: "system",
        content: "You extract executable business workflow candidates from real evidence. Never invent workflows.",
      },
      {
        role: "user",
        content: `${outputShapeDescription}\n\nEvidence:\n${JSON.stringify(evidence)}`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("OpenRouter discovery model returned empty output.");
  return text;
}

export async function discoverWorkflows(sources: DiscoverySource[]): Promise<DiscoveryCandidate[]> {
  const evidence = buildEvidencePayload(sources);

  let text: string;
  if (env.DISCOVERY_PROVIDER === "anthropic") {
    text = await runAnthropicDiscovery(evidence);
  } else if (env.DISCOVERY_PROVIDER === "openrouter") {
    text = await runOpenRouterDiscovery(evidence);
  } else {
    text = await runOpenAIDiscovery(evidence);
  }

  return normalizeCandidates(text);
}

