function server(request: Request) { const url = new URL(request.url); return [{ url: `${url.protocol}//${url.host}`, description: "Current environment" }]; }
const secured = [{ bearerAuth: [] }];

export function buildOpenApiSpec(request: Request) {
  return {
    openapi: "3.1.0",
    info: { title: "Callable REST API", version: "v1", description: "Open-source command-layer API for real controlled workflow execution." },
    servers: server(request),
    tags: [{ name: "Health" }, { name: "Agent Commands" }, { name: "MCP" }],
    components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "API Key" } } },
    paths: {
      "/api/health": { get: { tags: ["Health"], summary: "Service readiness", responses: { "200": { description: "Database is reachable." }, "503": { description: "Database is unavailable." } } } },
      "/api/agent/commands": { get: { tags: ["Agent Commands"], summary: "List published commands", security: secured, responses: { "200": { description: "Published command list." }, "401": { description: "Missing or invalid API key." } } } },
      "/api/agent/commands/{name}": { get: { tags: ["Agent Commands"], summary: "Describe a published command", security: secured, responses: { "200": { description: "Command definition." }, "404": { description: "Command not found." } } } },
      "/api/agent/commands/{name}/dry-run": { post: { tags: ["Agent Commands"], summary: "Validate a command without side effects", security: secured, responses: { "200": { description: "Dry-run result." } } } },
      "/api/agent/commands/{name}/run": { post: { tags: ["Agent Commands"], summary: "Run a reviewed command", security: secured, responses: { "200": { description: "Execution result." } } } },
      "/api/agent/executions/{id}": { get: { tags: ["Agent Commands"], summary: "Get execution status", security: secured, responses: { "200": { description: "Execution status." }, "404": { description: "Execution not found." } } } },
      "/api/mcp": { post: { tags: ["MCP"], summary: "Call a Callable MCP tool", security: secured, responses: { "200": { description: "Tool result." }, "400": { description: "Unsupported request." } } } },
      "/api/mcp/audit": { get: { tags: ["MCP"], summary: "List MCP invocation audits", security: secured, responses: { "200": { description: "Audit stream." } } } },
    } as Record<string, unknown>,
  };
}
