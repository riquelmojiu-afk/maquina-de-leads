/**
 * whatsappService.ts
 *
 * Fila de disparos PERSISTIDA no banco de dados (tabela dispatch_queue).
 * O processador usa polling curto (30s) em vez de sleep longo, garantindo que:
 *  1. Reinicializações do servidor não perdem a fila
 *  2. O loop nunca "para" por timeout de setTimeout
 *  3. Múltiplos itens são processados corretamente com intervalos entre eles
 */

import { getDb } from "./db";
import { eq, lte, and } from "drizzle-orm";
import { leads, dispatchQueue } from "../drizzle/schema";

export interface BroadcastLogEntry {
  time: string;
  type: "info" | "success" | "warning" | "error";
  message: string;
}

// In-memory logs for the UI (não precisam ser persistidos)
let broadcastLogs: BroadcastLogEntry[] = [];
const MAX_LOGS = 200;

function addLog(type: BroadcastLogEntry["type"], message: string) {
  const entry: BroadcastLogEntry = {
    time: new Date().toISOString(),
    type,
    message,
  };
  broadcastLogs.unshift(entry);
  if (broadcastLogs.length > MAX_LOGS) {
    broadcastLogs = broadcastLogs.slice(0, MAX_LOGS);
  }
  console.log(`[WhatsApp][${type.toUpperCase()}] ${message}`);
}

export function getBroadcastLogs() {
  return broadcastLogs;
}

export function clearBroadcastLogs() {
  broadcastLogs = [];
}

// ─── Configurações da Evolution API ───────────────────────────────────────────
let EVOLUTION_API_BASE = "https://evo.wzapflow.com.br";
let INSTANCE_NAME = "";
let EVOLUTION_API_KEY = "";
let SENDER_NUMBER = "";
let DISPATCH_START_HOUR = 8;
let DISPATCH_END_HOUR = 18;

async function loadEvolutionSettings(): Promise<void> {
  try {
    const { getSetting } = await import("./db");
    const baseUrl = await getSetting("evolution_api_base");
    const instanceName = await getSetting("evolution_instance_name");
    const apiKey = await getSetting("evolution_api_key");
    const number = await getSetting("evolution_sender_number");
    const startHour = await getSetting("dispatch_start_hour");
    const endHour = await getSetting("dispatch_end_hour");

    if (baseUrl) EVOLUTION_API_BASE = baseUrl.trim().replace(/\/$/, "");
    if (instanceName) INSTANCE_NAME = instanceName.trim();
    if (apiKey) EVOLUTION_API_KEY = apiKey.trim();
    if (number) SENDER_NUMBER = number.trim();
    if (startHour) DISPATCH_START_HOUR = parseInt(startHour, 10) || 8;
    if (endHour) DISPATCH_END_HOUR = parseInt(endHour, 10) || 18;
  } catch (e) {
    console.error("[WhatsApp] Failed to load settings:", e);
  }
}

// Carrega as configurações na inicialização do módulo
loadEvolutionSettings();

// ─── Constantes ───────────────────────────────────────────────────────────────
const MIN_INTERVAL_MS = 10 * 60 * 1000; // 10 minutos
const MAX_INTERVAL_MS = 30 * 60 * 1000; // 30 minutos
const MAX_RETRIES = 3;
const POLL_INTERVAL_MS = 30 * 1000;     // Verificar fila a cada 30 segundos

function getRandomInterval(): number {
  return MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS);
}

// ─── API Pública ──────────────────────────────────────────────────────────────

/**
 * Adiciona múltiplos leads à fila de disparo no banco de dados.
 * Cada item recebe um sendAfter escalonado para respeitar os intervalos.
 */
export async function queueMultipleMessages(
  leadsToQueue: Array<{ id: number; telefoneNormalizado: string; nomeEmpresa: string }>,
  message: string
): Promise<number> {
  const db = await getDb();
  if (!db) {
    addLog("error", "Banco de dados indisponível. Não foi possível enfileirar mensagens.");
    return 0;
  }

  let queued = 0;
  // O primeiro item pode ser enviado imediatamente (respeitando a janela de horário)
  // Os demais recebem delays escalonados para garantir o intervalo entre envios
  let nextSendAfter = new Date();

  addLog("info", `Enfileirando ${leadsToQueue.length} mensagens no banco de dados...`);

  for (const lead of leadsToQueue) {
    if (!lead.telefoneNormalizado) continue;

    // Escalonar: cada item após o primeiro recebe um delay adicional
    if (queued > 0) {
      nextSendAfter = new Date(nextSendAfter.getTime() + getRandomInterval());
    }

    await db.insert(dispatchQueue).values({
      leadId: lead.id,
      telefoneNormalizado: lead.telefoneNormalizado,
      nomeEmpresa: lead.nomeEmpresa,
      message,
      retries: 0,
      sendAfter: nextSendAfter,
      status: "pending",
    });

    queued++;
  }

  addLog("success", `${queued} mensagens adicionadas à fila. O processador enviará automaticamente no horário configurado.`);
  return queued;
}

/**
 * Retorna o status atual da fila (contagem de pendentes no banco).
 */
export async function getQueueStatus(): Promise<{ total: number; processing: boolean }> {
  const db = await getDb();
  if (!db) return { total: 0, processing: false };

  try {
    const rows = await db
      .select({ id: dispatchQueue.id })
      .from(dispatchQueue)
      .where(eq(dispatchQueue.status, "pending"));

    return { total: rows.length, processing: isPolling };
  } catch {
    return { total: 0, processing: isPolling };
  }
}

/**
 * Limpa todos os itens pendentes da fila no banco.
 */
export async function clearQueue(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const rows = await db
      .select({ id: dispatchQueue.id })
      .from(dispatchQueue)
      .where(eq(dispatchQueue.status, "pending"));

    if (rows.length > 0) {
      await db
        .delete(dispatchQueue)
        .where(eq(dispatchQueue.status, "pending"));
    }

    addLog("warning", `Fila de disparos limpa (${rows.length} mensagens removidas).`);
  } catch (e) {
    addLog("error", "Erro ao limpar fila: " + (e instanceof Error ? e.message : String(e)));
  }
}

// ─── Processador da Fila (Polling) ────────────────────────────────────────────
let isPolling = false;
let pollTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Inicia o loop de polling se ainda não estiver rodando.
 * Usa setTimeout recursivo curto (30s) em vez de sleep longo,
 * garantindo que o loop nunca seja interrompido por hot-reload ou timeout.
 */
export function startQueueProcessor(): void {
  if (isPolling) return;
  isPolling = true;
  addLog("info", "Processador de fila iniciado (polling a cada 30s).");
  schedulePoll();
}

function schedulePoll(): void {
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = setTimeout(async () => {
    await pollAndProcess();
    schedulePoll(); // Reagenda imediatamente após processar
  }, POLL_INTERVAL_MS);
}

async function pollAndProcess(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Recarregar configurações a cada ciclo para pegar mudanças do usuário
  await loadEvolutionSettings();

  // Verificar janela de horário
  const currentHour = new Date().getHours();
  if (currentHour < DISPATCH_START_HOUR || currentHour >= DISPATCH_END_HOUR) {
    // Só loga uma vez por hora para não poluir os logs
    const minuteNow = new Date().getMinutes();
    if (minuteNow < 1) {
      addLog(
        "warning",
        `Fora da janela de disparo (${DISPATCH_START_HOUR}h–${DISPATCH_END_HOUR}h). Aguardando automaticamente. Use Configurações para alterar o horário.`
      );
    }
    return;
  }

  // Buscar o próximo item pendente cujo sendAfter já passou
  let nextItem: typeof dispatchQueue.$inferSelect | null = null;
  try {
    const rows = await db
      .select()
      .from(dispatchQueue)
      .where(
        and(
          eq(dispatchQueue.status, "pending"),
          lte(dispatchQueue.sendAfter, new Date())
        )
      )
      .orderBy(dispatchQueue.sendAfter)
      .limit(1);

    nextItem = rows[0] ?? null;
  } catch (e) {
    console.error("[WhatsApp] Erro ao buscar fila:", e);
    return;
  }

  if (!nextItem) return; // Nada para processar agora

  // Marcar como "processing" para evitar duplo processamento
  try {
    await db
      .update(dispatchQueue)
      .set({ status: "processing" })
      .where(eq(dispatchQueue.id, nextItem.id));
  } catch {
    return;
  }

  addLog("info", `Enviando para: ${nextItem.nomeEmpresa} (${nextItem.telefoneNormalizado})...`);

  try {
    await sendWhatsAppMessage(nextItem);

    // Sucesso: marcar como sent no banco
    await db
      .update(dispatchQueue)
      .set({ status: "sent" })
      .where(eq(dispatchQueue.id, nextItem.id));

    // Atualizar statusEnvio do lead
    await db
      .update(leads)
      .set({ statusEnvio: "sent" })
      .where(eq(leads.id, nextItem.leadId));

    addLog("success", `✓ Enviado com sucesso para: ${nextItem.nomeEmpresa}`);

    // Verificar quantos ainda restam
    const remaining = await db
      .select({ id: dispatchQueue.id })
      .from(dispatchQueue)
      .where(eq(dispatchQueue.status, "pending"));

    if (remaining.length > 0) {
      const nextInterval = getRandomInterval();
      const nextMin = Math.round(nextInterval / 60000);
      addLog("info", `Próximo disparo em ~${nextMin} min. Restam ${remaining.length} na fila.`);
    } else {
      addLog("info", "✓ Fila de disparos concluída! Todos os leads foram processados.");
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const newRetries = (nextItem.retries ?? 0) + 1;

    if (newRetries < MAX_RETRIES) {
      // Reagendar com novo intervalo
      const nextInterval = getRandomInterval();
      const nextRetryAt = new Date(Date.now() + nextInterval);
      const nextMin = Math.round(nextInterval / 60000);

      await db
        .update(dispatchQueue)
        .set({ status: "pending", retries: newRetries, sendAfter: nextRetryAt })
        .where(eq(dispatchQueue.id, nextItem.id));

      addLog(
        "warning",
        `Erro ao enviar para ${nextItem.nomeEmpresa}: ${errorMsg}. Tentativa ${newRetries}/${MAX_RETRIES}. Reagendado para daqui a ${nextMin} min.`
      );
    } else {
      // Falha definitiva
      await db
        .update(dispatchQueue)
        .set({ status: "error", retries: newRetries })
        .where(eq(dispatchQueue.id, nextItem.id));

      await db
        .update(leads)
        .set({ statusEnvio: "error" })
        .where(eq(leads.id, nextItem.leadId));

      addLog(
        "error",
        `✗ Falha definitiva para ${nextItem.nomeEmpresa} após ${MAX_RETRIES} tentativas: ${errorMsg}`
      );
    }
  }
}

// ─── Envio via Evolution API ──────────────────────────────────────────────────
async function sendWhatsAppMessage(
  item: typeof dispatchQueue.$inferSelect
): Promise<void> {
  if (!INSTANCE_NAME) {
    throw new Error(
      "Nome da Instância não configurado. Acesse Configurações → Evolution API."
    );
  }
  if (!EVOLUTION_API_KEY) {
    throw new Error(
      "API Key Global não configurada. Acesse Configurações → Evolution API."
    );
  }
  if (!EVOLUTION_API_BASE) {
    throw new Error("URL da Evolution API não configurada.");
  }

  const phoneNumber = item.telefoneNormalizado.replace(/\D/g, "");
  if (phoneNumber.length < 10) {
    throw new Error(`Número de telefone inválido: ${item.telefoneNormalizado}`);
  }

  const url = `${EVOLUTION_API_BASE}/message/sendText/${INSTANCE_NAME}`;
  const payload = { number: phoneNumber, text: item.message };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: EVOLUTION_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorData: any;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { message: errorText };
    }

    if (response.status === 404) {
      throw new Error(
        `Instância "${INSTANCE_NAME}" não encontrada. Verifique o Nome da Instância nas Configurações.`
      );
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `API Key inválida ou sem permissão. Verifique a API Key Global nas Configurações.`
      );
    }

    throw new Error(
      `Evolution API error: ${response.status} - ${
        errorData?.message ||
        errorData?.response?.message ||
        JSON.stringify(errorData)
      }`
    );
  }
}

// ─── Inicialização ────────────────────────────────────────────────────────────
// Inicia o processador quando o módulo é carregado
startQueueProcessor();
