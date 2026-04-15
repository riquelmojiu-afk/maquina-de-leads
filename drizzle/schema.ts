import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  bigint,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Campaigns ────────────────────────────────────────────────────────────────
export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  nicho: varchar("nicho", { length: 255 }).notNull(),
  cidades: text("cidades").notNull(), // comma-separated
  messageTemplate: text("messageTemplate"),
  status: mysqlEnum("status", ["ativa", "inativa"]).default("inativa").notNull(),
  spreadsheetId: varchar("spreadsheetId", { length: 255 }),
  searchVariations: text("searchVariations"), // JSON array of search query variations
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

// Helper to parse search variations
export function parseSearchVariations(json: string | null): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter(v => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

// Helper to stringify search variations
export function stringifySearchVariations(variations: string[]): string {
  return JSON.stringify(variations);
}

// ─── Leads ────────────────────────────────────────────────────────────────────
export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  placeId: varchar("placeId", { length: 255 }).notNull(),
  nomeEmpresa: varchar("nomeEmpresa", { length: 500 }).notNull(),
  telefoneOriginal: varchar("telefoneOriginal", { length: 50 }),
  telefoneNormalizado: varchar("telefoneNormalizado", { length: 50 }),
  cidade: varchar("cidade", { length: 255 }),
  categoria: text("categoria"),
  endereco: text("endereco"),
  website: text("website"),
  statusWhatsApp: mysqlEnum("statusWhatsApp", ["pronto", "sem_telefone"])
    .default("sem_telefone")
    .notNull(),
  statusEnvio: mysqlEnum("statusEnvio", ["pending", "sent", "error"])
    .default("pending")
    .notNull(),
  dataCaptura: timestamp("dataCaptura").defaultNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

// ─── Settings ─────────────────────────────────────────────────────────────────
export const settings = mysqlTable("settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Setting = typeof settings.$inferSelect;

// ─── Mining Logs ──────────────────────────────────────────────────────────────
export const miningLogs = mysqlTable("mining_logs", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  campaignName: varchar("campaignName", { length: 255 }),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  finishedAt: timestamp("finishedAt"),
  leadsFound: int("leadsFound").default(0).notNull(),
  duplicatesSkipped: int("duplicatesSkipped").default(0).notNull(),
  errorsCount: int("errorsCount").default(0).notNull(),
  status: mysqlEnum("status", ["running", "completed", "error"])
    .default("running")
    .notNull(),
  logMessages: text("logMessages"), // JSON array of log entries
});

export type MiningLog = typeof miningLogs.$inferSelect;
export type InsertMiningLog = typeof miningLogs.$inferInsert;
