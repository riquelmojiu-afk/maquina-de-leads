import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("whatsapp router", () => {
  it("getQueueStatus returns total and processing state", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const status = await caller.whatsapp.getQueueStatus();
    expect(status).toHaveProperty("total");
    expect(status).toHaveProperty("processing");
    expect(typeof status.total).toBe("number");
    expect(typeof status.processing).toBe("boolean");
  });

  it("getLogs returns an array of log entries", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const logs = await caller.whatsapp.getLogs();
    expect(Array.isArray(logs)).toBe(true);
  });

  it("clearLogs clears broadcast logs and returns success", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.whatsapp.clearLogs();
    expect(result).toEqual({ success: true });
    const logs = await caller.whatsapp.getLogs();
    expect(logs).toHaveLength(0);
  });

  it("clearQueue clears the message queue and returns success", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.whatsapp.clearQueue();
    expect(result).toEqual({ success: true });
    const status = await caller.whatsapp.getQueueStatus();
    expect(status.total).toBe(0);
  });
});

describe("settings router — evolution api fields", () => {
  it("settings.getAll returns evolution_instance_name and evolution_api_key fields", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const settings = await caller.settings.getAll();
    // New fields must exist (replacing old evolution_instance_token)
    expect(settings).toHaveProperty("evolution_instance_name");
    expect(settings).toHaveProperty("evolution_api_key");
    expect(settings).toHaveProperty("evolution_instance_name_set");
    expect(settings).toHaveProperty("evolution_api_key_set");
    // Old field must NOT exist
    expect(settings).not.toHaveProperty("evolution_instance_token");
    expect(settings).not.toHaveProperty("evolution_instance_token_set");
  });

  it("settings.set accepts evolution_instance_name and evolution_api_key", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    // Should not throw — just validates the schema accepts the new fields
    await expect(
      caller.settings.set({
        evolution_instance_name: "test-instance",
        evolution_api_key: "test-api-key-12345",
      })
    ).resolves.toEqual({ success: true });
  });
});
