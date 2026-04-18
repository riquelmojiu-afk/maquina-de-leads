import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createCampaign,
  deleteCampaign,
  getAllSettings,
  getCampaignById,
  getCampaigns,
  getDashboardMetrics,
  getLeads,
  getLeadsCount,
  getMiningLogs,
  getMiningLogById,
  setSetting,
  toggleLeadBloqueado,
  updateCampaign,
} from "./db";
import { getMiningProgress, startMining } from "./miningService";
import { queueMultipleMessages, getQueueStatus, getBroadcastLogs, clearBroadcastLogs, clearQueue } from "./whatsappService";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Dashboard ──────────────────────────────────────────────────────────────
  dashboard: router({
    metrics: publicProcedure.query(async () => {
      return getDashboardMetrics();
    }),
  }),

  // ─── Campaigns ──────────────────────────────────────────────────────────────
  campaigns: router({
    list: publicProcedure.query(async () => {
      return getCampaigns();
    }),

    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const campaign = await getCampaignById(input.id);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campanha não encontrada" });
      return campaign;
    }),

    create: publicProcedure
      .input(
        z.object({
          name: z.string().min(1, "Nome obrigatório"),
          nicho: z.string().min(1, "Nicho obrigatório"),
          cidades: z.string().min(1, "Informe ao menos uma cidade"),
          messageTemplate: z.string().optional(),
          spreadsheetId: z.string().optional(),
          searchVariations: z.string().nullable().optional(),
          status: z.enum(["ativa", "inativa"]).default("inativa"),
        })
      )
      .mutation(async ({ input }) => {
        const id = await createCampaign(input);
        return { id };
      }),

    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).optional(),
          nicho: z.string().min(1).optional(),
          cidades: z.string().optional(),
          messageTemplate: z.string().optional(),
          spreadsheetId: z.string().optional(),
          searchVariations: z.string().nullable().optional(),
          status: z.enum(["ativa", "inativa"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateCampaign(id, data);
        return { success: true };
      }),

    toggleStatus: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const campaign = await getCampaignById(input.id);
        if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
        const newStatus = campaign.status === "ativa" ? "inativa" : "ativa";
        await updateCampaign(input.id, { status: newStatus });
        return { status: newStatus };
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteCampaign(input.id);
        return { success: true };
      }),
  }),

  // ─── Leads ──────────────────────────────────────────────────────────────────
  leads: router({
    list: publicProcedure
      .input(
        z.object({
          campaignId: z.number().optional(),
          statusWhatsApp: z.enum(["pronto", "sem_telefone"]).optional(),
          cidade: z.string().optional(),
          bloqueado: z.boolean().optional(),
          limit: z.number().default(100),
          offset: z.number().default(0),
        })
      )
      .query(async ({ input }) => {
        const [items, total] = await Promise.all([
          getLeads(input),
          getLeadsCount({
            campaignId: input.campaignId,
            statusWhatsApp: input.statusWhatsApp,
            cidade: input.cidade,
            bloqueado: input.bloqueado,
          }),
        ]);
        return { items, total };
      }),

    toggleBloqueado: publicProcedure
      .input(z.object({ id: z.number(), bloqueado: z.boolean() }))
      .mutation(async ({ input }) => {
        await toggleLeadBloqueado(input.id, input.bloqueado);
        return { success: true };
      }),

    exportCsv: publicProcedure
      .input(
        z.object({
          campaignId: z.number().optional(),
          statusWhatsApp: z.enum(["pronto", "sem_telefone"]).optional(),
          cidade: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        const items = await getLeads({ ...input, limit: 10000, offset: 0 });

        const headers = [
          "ID",
          "Campanha ID",
          "Nome Empresa",
          "Telefone Original",
          "Telefone Normalizado",
          "Cidade",
          "Categoria",
          "Endereço",
          "Website",
          "Status WhatsApp",
          "Status Envio",
          "Data Captura",
        ];

        const rows = items.map((l) => [
          l.id,
          l.campaignId,
          `"${(l.nomeEmpresa || "").replace(/"/g, '""')}"`,
          l.telefoneOriginal || "",
          l.telefoneNormalizado || "",
          `"${(l.cidade || "").replace(/"/g, '""')}"`,
          `"${(l.categoria || "").replace(/"/g, '""')}"`,
          `"${(l.endereco || "").replace(/"/g, '""')}"`,
          `"${(l.website || "").replace(/"/g, '""')}"`,
          l.statusWhatsApp,
          l.statusEnvio,
          l.dataCaptura ? new Date(l.dataCaptura).toISOString() : "",
        ]);

        const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        return { csv, count: items.length };
      }),
  }),

  // ─── Mining ─────────────────────────────────────────────────────────────────
  mining: router({
    start: publicProcedure
      .input(z.object({ campaignId: z.number(), useMapsApiKey: z.boolean().optional() }))
      .mutation(async ({ input }) => {
        const logId = await startMining(input.campaignId, input.useMapsApiKey);
        return { logId };
      }),

    getProgress: publicProcedure
      .input(z.object({ logId: z.number() }))
      .query(async ({ input }) => {
        const progress = getMiningProgress(input.logId);
        if (progress) return progress;

        // Fallback to DB
        const log = await getMiningLogById(input.logId);
        if (!log) throw new TRPCError({ code: "NOT_FOUND" });

        return {
          logId: log.id,
          status: log.status,
          leadsFound: log.leadsFound,
          duplicatesSkipped: log.duplicatesSkipped,
          errorsCount: log.errorsCount,
          logs: JSON.parse(log.logMessages || "[]"),
        };
      }),

    history: publicProcedure.query(async () => {
      return getMiningLogs(20);
    }),
  }),

  // ─── WhatsApp ──────────────────────────────────────────────────────────────
  whatsapp: router({
    sendToCampaign: publicProcedure
      .input(
        z.object({
          campaignId: z.number(),
          message: z.string().min(1, "Mensagem obrigatória"),
        })
      )
      .mutation(async ({ input }) => {
        // Exclude blocked leads from dispatch
        const allLeads = await getLeads({ campaignId: input.campaignId, statusWhatsApp: "pronto", bloqueado: false });
        const validLeads = allLeads.filter((l) => l.telefoneNormalizado);
        const queued = await queueMultipleMessages(
          validLeads.map((l) => ({ id: l.id, telefoneNormalizado: l.telefoneNormalizado!, nomeEmpresa: l.nomeEmpresa })),
          input.message
        );
        return { queued, total: validLeads.length };
      }),

    sendToLeads: publicProcedure
      .input(
        z.object({
          leadIds: z.array(z.number()),
          message: z.string().min(1, "Mensagem obrigatória"),
        })
      )
      .mutation(async ({ input }) => {
        const leads = await getLeads();
        const validLeads = leads.filter((l) => input.leadIds.includes(l.id) && l.statusWhatsApp === "pronto" && l.telefoneNormalizado);
        const queued = await queueMultipleMessages(
          validLeads.map((l) => ({ id: l.id, telefoneNormalizado: l.telefoneNormalizado!, nomeEmpresa: l.nomeEmpresa })),
          input.message
        );
        return { queued, total: validLeads.length };
      }),

    getQueueStatus: publicProcedure.query(async () => {
      return await getQueueStatus();
    }),

    getLogs: publicProcedure.query(async () => {
      return getBroadcastLogs();
    }),

    clearQueue: publicProcedure.mutation(async () => {
      await clearQueue();
      return { success: true };
    }),

    clearLogs: publicProcedure.mutation(async () => {
      clearBroadcastLogs();
      return { success: true };
    }),
  }),

  // ─── Settings ───────────────────────────────────────────────────────────────
  settings: router({
    getAll: publicProcedure.query(async () => {
      const all = await getAllSettings();
      // Mask API keys for display
      return {
        google_places_api_key: all.google_places_api_key
          ? "••••••••" + (all.google_places_api_key.slice(-4) || "")
          : "",
        google_maps_platform_api_key: all.google_maps_platform_api_key
          ? "••••••••" + (all.google_maps_platform_api_key.slice(-4) || "")
          : "",
        google_sheets_api_key: all.google_sheets_api_key
          ? "••••••••" + (all.google_sheets_api_key.slice(-4) || "")
          : "",
        google_places_api_key_set: !!all.google_places_api_key,
        google_maps_platform_api_key_set: !!all.google_maps_platform_api_key,
        google_sheets_api_key_set: !!all.google_sheets_api_key,
        evolution_api_base: all.evolution_api_base || "",
        evolution_instance_name: all.evolution_instance_name || "",
        evolution_api_key: all.evolution_api_key ? "••••••••" + (all.evolution_api_key.slice(-4) || "") : "",
        evolution_sender_number: all.evolution_sender_number || "",
        evolution_api_base_set: !!all.evolution_api_base,
        evolution_instance_name_set: !!all.evolution_instance_name,
        evolution_api_key_set: !!all.evolution_api_key,
        evolution_sender_number_set: !!all.evolution_sender_number,
        dispatch_start_hour: all.dispatch_start_hour || "8",
        dispatch_end_hour: all.dispatch_end_hour || "18",
      };
    }),

    set: publicProcedure
      .input(
        z.object({
          google_places_api_key: z.string().optional(),
          google_maps_platform_api_key: z.string().optional(),
          google_sheets_api_key: z.string().optional(),
          evolution_api_base: z.string().optional(),
          evolution_instance_name: z.string().optional(),
          evolution_api_key: z.string().optional(),
          evolution_sender_number: z.string().optional(),
          dispatch_start_hour: z.string().optional(),
          dispatch_end_hour: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        if (input.google_places_api_key) {
          await setSetting("google_places_api_key", input.google_places_api_key);
        }
        if (input.google_maps_platform_api_key) {
          await setSetting("google_maps_platform_api_key", input.google_maps_platform_api_key);
        }
        if (input.google_sheets_api_key) {
          await setSetting("google_sheets_api_key", input.google_sheets_api_key);
        }
        if (input.evolution_api_base) {
          await setSetting("evolution_api_base", input.evolution_api_base);
        }
        if (input.evolution_instance_name) {
          await setSetting("evolution_instance_name", input.evolution_instance_name);
        }
        if (input.evolution_api_key) {
          await setSetting("evolution_api_key", input.evolution_api_key);
        }
        if (input.evolution_sender_number) {
          await setSetting("evolution_sender_number", input.evolution_sender_number);
        }
        if (input.dispatch_start_hour !== undefined) {
          await setSetting("dispatch_start_hour", input.dispatch_start_hour);
        }
        if (input.dispatch_end_hour !== undefined) {
          await setSetting("dispatch_end_hour", input.dispatch_end_hour);
        }
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
