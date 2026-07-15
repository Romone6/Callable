import { describe, expect, it } from "vitest";
import { GET as getConnectors } from "@/app/api/connectors/route";


describe("connectors api", () => {
  it("returns connector catalog with usage rollups", async () => {
    const res = await getConnectors();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.connectors)).toBe(true);

    const stripe = body.connectors.find((item: { providerKey: string }) => item.providerKey === "stripe");
    expect(stripe).toBeTruthy();
    expect(stripe.status).toBe("in_development");
    expect(stripe.usage).toBeTruthy();
    expect(typeof stripe.usage.total).toBe("number");
  });
});
