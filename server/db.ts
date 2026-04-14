import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  Campaign,
  InsertCampaign,
  InsertLead,
  InsertMiningLog,
  InsertUser,
  Lead,
  MiningLog,
  campaigns,
  leads,
  miningLogs,
  settings,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Campaigns ────────────────────────────────────────────────────────────────
export async function getCampaigns(): Promise<Campaign[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
}

export async function getCampaignById(id: number): Promise<Campaign | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  return result[0];
}

export async function createCampaign(data: Omit<InsertCampaign, "id">): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(campaigns).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function updateCampaign(id: number, data: Partial<InsertCampaign>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(campaigns).set(data).where(eq(campaigns.id, id));
}

export async function deleteCampaign(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(campaigns).where(eq(campaigns.id, id));
}

// ─── Leads ────────────────────────────────────────────────────────────────────
export async function getLeads(filters?: {
  campaignId?: number;
  statusWhatsApp?: "pronto" | "sem_telefone";
  cidade?: string;
  limit?: number;
  offset?: number;
}): Promise<Lead[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (filters?.campaignId) conditions.push(eq(leads.campaignId, filters.campaignId));
  if (filters?.statusWhatsApp) conditions.push(eq(leads.statusWhatsApp, filters.statusWhatsApp));
  if (filters?.cidade) conditions.push(like(leads.cidade, `%${filters.cidade}%`));

  const query = db
    .select()
    .from(leads)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(leads.dataCaptura))
    .limit(filters?.limit ?? 500)
    .offset(filters?.offset ?? 0);

  return query;
}

export async function getLeadsCount(filters?: {
  campaignId?: number;
  statusWhatsApp?: "pronto" | "sem_telefone";
  cidade?: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const conditions = [];
  if (filters?.campaignId) conditions.push(eq(leads.campaignId, filters.campaignId));
  if (filters?.statusWhatsApp) conditions.push(eq(leads.statusWhatsApp, filters.statusWhatsApp));
  if (filters?.cidade) conditions.push(like(leads.cidade, `%${filters.cidade}%`));

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(leads)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return Number(result[0]?.count ?? 0);
}

export async function getExistingPlaceIds(campaignId?: number): Promise<Set<string>> {
  const db = await getDb();
  if (!db) return new Set();

  const conditions = campaignId ? [eq(leads.campaignId, campaignId)] : [];
  const result = await db
    .select({ placeId: leads.placeId })
    .from(leads)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return new Set(result.map((r) => r.placeId));
}

export async function getExistingPhones(): Promise<Set<string>> {
  const db = await getDb();
  if (!db) return new Set();

  const result = await db
    .select({ telefoneNormalizado: leads.telefoneNormalizado })
    .from(leads)
    .where(sql`telefoneNormalizado IS NOT NULL AND telefoneNormalizado != ''`);

  return new Set(result.map((r) => r.telefoneNormalizado!).filter(Boolean));
}

export async function insertLead(data: Omit<InsertLead, "id">): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(leads).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function getDashboardMetrics() {
  const db = await getDb();
  if (!db) return { totalLeads: 0, leadsComTelefone: 0, campanhasAtivas: 0, ultimaExecucao: null };

  const [totalLeadsResult, leadsComTelefoneResult, campanhasAtivasResult, ultimaExecucaoResult] =
    await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(leads),
      db
        .select({ count: sql<number>`count(*)` })
        .from(leads)
        .where(eq(leads.statusWhatsApp, "pronto")),
      db
        .select({ count: sql<number>`count(*)` })
        .from(campaigns)
        .where(eq(campaigns.status, "ativa")),
      db
        .select({ startedAt: miningLogs.startedAt })
        .from(miningLogs)
        .orderBy(desc(miningLogs.startedAt))
        .limit(1),
    ]);

  return {
    totalLeads: Number(totalLeadsResult[0]?.count ?? 0),
    leadsComTelefone: Number(leadsComTelefoneResult[0]?.count ?? 0),
    campanhasAtivas: Number(campanhasAtivasResult[0]?.count ?? 0),
    ultimaExecucao: ultimaExecucaoResult[0]?.startedAt ?? null,
  };
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return result[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(settings)
    .values({ key, value })
    .onDuplicateKeyUpdate({ set: { value } });
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const db = await getDb();
  if (!db) return {};
  const result = await db.select().from(settings);
  return Object.fromEntries(result.map((s) => [s.key, s.value ?? ""]));
}

// ─── Mining Logs ──────────────────────────────────────────────────────────────
export async function createMiningLog(data: Omit<InsertMiningLog, "id">): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(miningLogs).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function updateMiningLog(
  id: number,
  data: Partial<InsertMiningLog>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(miningLogs).set(data).where(eq(miningLogs.id, id));
}

export async function getMiningLogs(limit = 20): Promise<MiningLog[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(miningLogs).orderBy(desc(miningLogs.startedAt)).limit(limit);
}

export async function getMiningLogById(id: number): Promise<MiningLog | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(miningLogs).where(eq(miningLogs.id, id)).limit(1);
  return result[0];
}
