type OpenApiServer = {
  url: string;
  description: string;
};

function getServerUrl(request: Request) {
  const requestUrl = new URL(request.url);
  return `${requestUrl.protocol}//${requestUrl.host}`;
}

function buildServers(request: Request): OpenApiServer[] {
  return [
    {
      url: getServerUrl(request),
      description: "Current environment",
    },
  ];
}

export function buildOpenApiSpec(request: Request) {
  return {
    openapi: "3.1.0",
    info: {
      title: "VerblLayer REST API",
      version: "v1",
      description: "Enterprise command-layer API for governed agent execution against real workflow evidence.",
    },
    servers: buildServers(request),
    tags: [
      { name: "Health" },
      { name: "Agent Commands" },
      { name: "MCP" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "API Key",
          description: "Use API keys created in VerblLayer to call agent and MCP endpoints.",
        },
      },
      schemas: {
        ErrorEnvelope: {
          type: "object",
          required: ["error"],
          properties: {
            error: {
              type: "object",
              required: ["code", "message"],
              properties: {
                code: { type: "string" },
                message: { type: "string" },
                details: { type: "object", additionalProperties: true },
                request_id: { type: ["string", "null"] },
              },
            },
          },
        },
      },
    },
    paths: {
      "/api/health": {
        get: {
          tags: ["Health"],
          summary: "Service readiness probe",
          responses: {
            "200": { description: "Service healthy or degraded with details." },
            "503": { description: "Critical dependency unavailable." },
          },
        },
      },
      "/api/audit/events": {
        get: {
          tags: ["MCP"],
          summary: "List audit events with scoped filtering and cursor pagination",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "query",
              name: "event_type",
              schema: { type: "string" },
            },
            {
              in: "query",
              name: "actor_type",
              schema: { type: "string", enum: ["system", "user", "agent"] },
            },
            {
              in: "query",
              name: "actor_id",
              schema: { type: "string" },
            },
            {
              in: "query",
              name: "command_id",
              schema: { type: "string" },
            },
            {
              in: "query",
              name: "execution_id",
              schema: { type: "string" },
            },
            {
              in: "query",
              name: "limit",
              schema: { type: "integer", minimum: 1, maximum: 200, default: 50 },
            },
            {
              in: "query",
              name: "before",
              schema: { type: "string", format: "date-time" },
            },
          ],
          responses: {
            "200": { description: "Audit events list for the caller organisation." },
            "400": { description: "Invalid query parameters." },
            "401": { description: "Missing or invalid API key." },
            "403": { description: "API key missing audit scope." },
          },
        },
      },
      "/api/agent/commands": {
        get: {
          tags: ["Agent Commands"],
          summary: "List published commands",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": { description: "Published command list for the API-key organisation." },
            "401": { description: "Missing or invalid API key." },
            "403": { description: "API key missing required scopes." },
            "429": { description: "Rate limit exceeded." },
          },
        },
      },
      "/api/approval-policies": {
        get: {
          tags: ["Agent Commands"],
          summary: "List organisation approval policies",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": { description: "Approval policies list." },
            "401": { description: "Missing or invalid API key." },
            "403": { description: "API key missing audit or approval scope via role policy." },
          },
        },
        post: {
          tags: ["Agent Commands"],
          summary: "Create an approval policy",
          security: [{ bearerAuth: [] }],
          responses: {
            "201": { description: "Approval policy created." },
            "400": { description: "Invalid payload." },
            "403": { description: "Caller role not allowed." },
          },
        },
        patch: {
          tags: ["Agent Commands"],
          summary: "Update an approval policy",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": { description: "Approval policy updated." },
            "400": { description: "Invalid payload." },
            "404": { description: "Approval policy not found." },
          },
        },
      },
      "/api/auto-send/simulate": {
        post: {
          tags: ["Agent Commands"],
          summary: "Simulate auto-send eligibility with policy guardrails",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": { description: "Simulation decision returned." },
            "400": { description: "Invalid payload." },
            "403": { description: "Caller lacks required role or permissions." },
            "404": { description: "Command or policy not found." },
          },
        },
      },
      "/api/send-events/{id}": {
        get: {
          tags: ["Agent Commands"],
          summary: "Get immutable send event ledger entry",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": { description: "Send event returned." },
            "403": { description: "Caller lacks required permissions." },
            "404": { description: "Send event not found." },
          },
        },
      },
      "/api/agent/commands/{name}": {
        get: {
          tags: ["Agent Commands"],
          summary: "Describe a published command",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "name",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": { description: "Command definition and steps." },
            "404": { description: "Command not found." },
          },
        },
      },
      "/api/agent/commands/{name}/dry-run": {
        post: {
          tags: ["Agent Commands"],
          summary: "Evaluate command execution without side effects where supported",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "name",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": { description: "Dry-run execution result." },
            "401": { description: "Missing or invalid API key." },
            "403": { description: "API key missing required scopes." },
          },
        },
      },
      "/api/agent/commands/{name}/run": {
        post: {
          tags: ["Agent Commands"],
          summary: "Run a command against the target connector/application",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "name",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": { description: "Execution accepted/result payload returned." },
            "401": { description: "Missing or invalid API key." },
            "403": { description: "API key missing required scopes." },
          },
        },
      },
      "/api/agent/executions/{id}": {
        get: {
          tags: ["Agent Commands"],
          summary: "Get execution status",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": { description: "Execution found." },
            "404": { description: "Execution not found." },
          },
        },
      },
      "/api/mcp": {
        post: {
          tags: ["MCP"],
          summary: "Call an MCP tool through the VerblLayer bridge",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": { description: "Tool invocation result." },
            "400": { description: "Unsupported tool or invalid payload." },
            "401": { description: "Missing or invalid API key." },
            "403": { description: "Scope denied for requested tool." },
            "429": { description: "Rate limit exceeded." },
          },
        },
      },
      "/api/mcp/audit": {
        get: {
          tags: ["MCP"],
          summary: "List MCP invocation audit events",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "query",
              name: "tool",
              schema: { type: "string" },
            },
            {
              in: "query",
              name: "outcome",
              schema: { type: "string", enum: ["succeeded", "failed"] },
            },
            {
              in: "query",
              name: "limit",
              schema: { type: "integer", minimum: 1, maximum: 200, default: 50 },
            },
            {
              in: "query",
              name: "before",
              schema: { type: "string", format: "date-time" },
              description: "Return records strictly older than this timestamp.",
            },
          ],
          responses: {
            "200": { description: "Audit events and pagination cursor." },
            "400": { description: "Invalid query parameters." },
            "401": { description: "Missing or invalid API key." },
            "403": { description: "API key missing audit scope." },
          },
        },
      },
    },
  };
}
