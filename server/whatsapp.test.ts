import { describe, expect, it, beforeEach } from "vitest";
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
