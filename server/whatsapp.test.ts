import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock do db — necessário para isolar testes do banco real
vi.mock("./db", () => ({
  getCampaigns: vi.fn().mockResolvedValue([]),
  getCampaignById: vi.fn().mockResolvedValue(null),
  createCampaign: vi.fn().mockResolvedValue(1),
  updateCampaign: vi.fn().mockResolvedValue(undefined),
  deleteCampaign: vi.fn().mockResolvedValue(undefined),
  getLeads: vi.fn().mockResolvedValue([
    {
      id: 1,
      campaignId: 1,
      nomeEmpresa: "Empresa Ativa",
      telefoneNormalizado: "5511999990001",
      statusWhatsApp: "pronto",
      statusEnvio: "pending",
      bloqueado: false,
      placeId: "abc",
      telefoneOriginal: null,
      cidade: null,
      categoria: null,
      endereco: null,
      website: null,
      dataCaptura: new Date(),
    },
  ]),
  getLeadsCount: vi.fn().mockResolvedValue(1),
  getDashboardMetrics: vi.fn().mockResolvedValue({
    totalLeads: 1,
    leadsComTelefone: 1,
    campanhasAtivas: 1,
    ultimaExecucao: new Date(),
  }),
  getAllSettings: vi.fn().mockResolvedValue({}),
  setSetting: vi.fn().mockResolvedValue(undefined),
  getSetting: vi.fn().mockResolvedValue(null),
  getMiningLogs: vi.fn().mockResolvedValue([]),
  getMiningLogById: vi.fn().mockResolvedValue(undefined),
  toggleLeadBloqueado: vi.fn().mockResolvedValue(undefined),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
}));

// Mock do whatsappService para isolar dos testes de banco
vi.mock("./whatsappService", () => ({
  queueMultipleMessages: vi.fn().mockResolvedValue(1),
  getQueueStatus: vi.fn().mockResolvedValue({ total: 0, processing: false }),
  getBroadcastLogs: vi.fn().mockReturnValue([]),
  clearBroadcastLogs: vi.fn(),
  clearQueue: vi.fn().mockResolvedValue(undefined),
  startQueueProcessor: vi.fn(),
}));

vi.mock("./miningService", () => ({
  startMining: vi.fn().mockResolvedValue(1),
  getMiningProgress: vi.fn().mockReturnValue(undefined),
}));

function createCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("whatsapp router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getQueueStatus retorna total e processing", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.whatsapp.getQueueStatus();
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("processing");
    expect(typeof result.total).toBe("number");
    expect(typeof result.processing).toBe("boolean");
  });

  it("getLogs retorna array de logs", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.whatsapp.getLogs();
    expect(Array.isArray(result)).toBe(true);
  });

  it("clearLogs limpa os logs e retorna success", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.whatsapp.clearLogs();
    expect(result).toEqual({ success: true });
  });

  it("clearQueue limpa a fila e retorna success", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.whatsapp.clearQueue();
    expect(result).toEqual({ success: true });
  });

  it("sendToCampaign enfileira leads ativos e retorna queued", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.whatsapp.sendToCampaign({
      campaignId: 1,
      message: "Olá, tudo bem?",
    });
    expect(result).toHaveProperty("queued");
    expect(typeof result.queued).toBe("number");
  });

  it("sendToCampaign rejeita mensagem vazia", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.whatsapp.sendToCampaign({ campaignId: 1, message: "" })
    ).rejects.toThrow();
  });
});

describe("settings router — evolution api fields", () => {
  it("settings.getAll retorna campos da evolution api", async () => {
    const caller = appRouter.createCaller(createCtx());
    const settings = await caller.settings.getAll();
    expect(settings).toHaveProperty("evolution_instance_name");
    expect(settings).toHaveProperty("evolution_api_key");
    expect(settings).toHaveProperty("evolution_instance_name_set");
    expect(settings).toHaveProperty("evolution_api_key_set");
    expect(settings).not.toHaveProperty("evolution_instance_token");
  });

  it("settings.set aceita evolution_instance_name e evolution_api_key", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.settings.set({
        evolution_instance_name: "test-instance",
        evolution_api_key: "test-api-key-12345",
      })
    ).resolves.toEqual({ success: true });
  });
});
