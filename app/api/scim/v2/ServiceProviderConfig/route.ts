import { forbidden, ok } from "@/lib/http";
import { authenticateScimRequest } from "@/lib/scim-auth";

export async function GET(request: Request) {
  try {
    await authenticateScimRequest(request);
    return ok({
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig"],
      patch: { supported: true },
      bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
      filter: { supported: true, maxResults: 200 },
      changePassword: { supported: false },
      sort: { supported: true },
      etag: { supported: false },
      authenticationSchemes: [
        {
          type: "oauthbearertoken",
          name: "Bearer Token",
          description: "Use SCIM bearer token",
          primary: true,
        },
      ],
    });
  } catch (error) {
    return forbidden(error instanceof Error ? error.message : "Unauthorized");
  }
}

