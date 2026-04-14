import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => ({
  getCampaigns: vi.fn().mockResolvedValue([
    {
      id: 1,
      name: "Campanha Teste",
      nicho: "Açaí",
      cidades: "São Paulo, Campinas",
      messageTemplate: "Olá {nome_empresa}!",
      status: "ativa",
      spreadsheetId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getCampaignById: vi.fn().mockResolvedValue({
    id: 1,
    name: "Campanha Teste",
    nicho: "Açaí",
    cidades: "São Paulo",
    status: "ativa",
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  createCampaign: vi.fn().mockResolvedValue(1),
  updateCampaign: vi.fn().mockResolvedValue(undefined),
  deleteCampaign: vi.fn().mockResolvedValue(undefined),
  getLeads: vi.fn().mockResolvedValue([
    {
      id: 1,
      campaignId: 1,
      placeId: "ChIJ_test_123",
      nomeEmpresa: "Açaí do João",
      telefoneOriginal: "(11) 99999-9999",
      telefoneNormalizado: "5511999999999",
      cidade: "São Paulo",
      categoria: "food",
      endereco: "Rua Teste, 123",
      website: "https://example.com",
      statusWhatsApp: "pronto",
      statusEnvio: "pending",
      dataCaptura: new Date(),
    },
  ]),
  getLeadsCount: vi.fn().mockResolvedValue(1),
  getDashboardMetrics: vi.fn().mockResolvedValue({
    totalLeads: 60,
    leadsComTelefone: 45,
    campanhasAtivas: 2,
    ultimaExecucao: new Date(),
  }),
  getAllSettings: vi.fn().mockResolvedValue({
    google_places_api_key: "AIzaSy_test_key_1234",
    google_sheets_api_key: "",
  }),
  setSetting: vi.fn().mockResolvedValue(undefined),
  getMiningLogs: vi.fn().mockResolvedValue([]),
  getMiningLogById: vi.fn().mockResolvedValue(undefined),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./miningService", () => ({
  startMining: vi.fn().mockResolvedValue(42),
  getMiningProgress: vi.fn().mockReturnValue(undefined),
}));

function createCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("campaigns router", () => {
  it("list returns campaigns", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.campaigns.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].name).toBe("Campanha Teste");
  });

  it("create campaign returns id", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.campaigns.create({
      name: "Nova Campanha",
      nicho: "Barbearia",
      cidades: "Rio de Janeiro",
      status: "inativa",
    });
    expect(result.id).toBe(1);
  });

  it("toggleStatus switches campaign status", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.campaigns.toggleStatus({ id: 1 });
    expect(result.status).toBe("inativa"); // was "ativa", now toggled
  });
});

describe("leads router", () => {
  it("list returns leads with total", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.leads.list({ limit: 100, offset: 0 });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0].statusWhatsApp).toBe("pronto");
  });

  it("exportCsv returns valid CSV", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.leads.exportCsv({});
    expect(result.csv).toContain("Nome Empresa");
    expect(result.csv).toContain("Açaí do João");
    expect(result.count).toBe(1);
  });
});

describe("dashboard router", () => {
  it("metrics returns correct structure", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.dashboard.metrics();
    expect(result.totalLeads).toBe(60);
    expect(result.leadsComTelefone).toBe(45);
    expect(result.campanhasAtivas).toBe(2);
    expect(result.ultimaExecucao).toBeDefined();
  });
});

describe("settings router", () => {
  it("getAll masks API keys", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.settings.getAll();
    expect(result.google_places_api_key).toContain("••••••••");
    expect(result.google_places_api_key_set).toBe(true);
    expect(result.google_sheets_api_key_set).toBe(false);
  });

  it("set saves API keys", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.settings.set({
      google_places_api_key: "AIzaSy_new_key_xyz",
    });
    expect(result.success).toBe(true);
  });
});

describe("mining router", () => {
  it("start returns logId", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.mining.start({ campaignId: 1 });
    expect(result.logId).toBe(42);
  });

  it("history returns array", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.mining.history();
    expect(Array.isArray(result)).toBe(true);
  });
});
