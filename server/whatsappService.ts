import { getDb } from "./db";
import { eq } from "drizzle-orm";
import { leads } from "../drizzle/schema";

export interface WhatsAppQueueItem {
  leadId: number;
  telefoneNormalizado: string;
  nomeEmpresa: string;
  message: string;
  retries: number;
  nextRetryAt: Date;
}

export interface BroadcastLogEntry {
  time: string;
  type: "info" | "success" | "warning" | "error";
  message: string;
}

// In-memory queue for WhatsApp messages
const messageQueue: WhatsAppQueueItem[] = [];
let isProcessing = false;

// In-memory logs for the UI
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
}

export function getBroadcastLogs() {
  return broadcastLogs;
}

export function clearBroadcastLogs() {
  broadcastLogs = [];
}

// Configuration - loaded from database settings
// Evolution API structure:
//   POST {EVOLUTION_API_BASE}/message/sendText/{INSTANCE_NAME}
//   Header: apikey: {EVOLUTION_API_KEY}
let EVOLUTION_API_BASE = "https://evo.wzapflow.com.br";
let INSTANCE_NAME = "";    // Nome da instância (aparece na URL)
let EVOLUTION_API_KEY = ""; // Global API Key (vai no header apikey)
let SENDER_NUMBER = "";
let DISPATCH_START_HOUR = 8;  // Hora de início dos disparos (0-23)
let DISPATCH_END_HOUR = 18;   // Hora de fim dos disparos (0-23)

// Load settings from database
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

    if (!INSTANCE_NAME || !EVOLUTION_API_KEY) {
      addLog("warning", "Configuração da Evolution API incompleta. Acesse Configurações e preencha Nome da Instância e API Key.");
    } else {
      addLog("info", `Configurações carregadas. Instância: ${INSTANCE_NAME} | Horário de disparo: ${DISPATCH_START_HOUR}h – ${DISPATCH_END_HOUR}h`);
    }
  } catch (e) {
    console.error("[WhatsApp] Failed to load settings:", e);
    addLog("error", "Erro ao carregar configurações da Evolution API.");
  }
}

// Load settings on module init
loadEvolutionSettings();
const MIN_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_RETRIES = 3;

function getRandomInterval(): number {
  return MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS);
}

export async function queueWhatsAppMessage(
  leadId: number,
  telefoneNormalizado: string,
  nomeEmpresa: string,
  message: string
): Promise<void> {
  const item: WhatsAppQueueItem = {
    leadId,
    telefoneNormalizado,
    nomeEmpresa,
    message,
    retries: 0,
    nextRetryAt: new Date(),
  };

  messageQueue.push(item);
  addLog("info", `Adicionado à fila: ${nomeEmpresa} (${telefoneNormalizado})`);
  startProcessing();
}

export async function queueMultipleMessages(
  leads: Array<{ id: number; telefoneNormalizado: string; nomeEmpresa: string }>,
  message: string
): Promise<number> {
  let queued = 0;
  addLog("info", `Iniciando agendamento de ${leads.length} mensagens...`);
  for (const lead of leads) {
    if (lead.telefoneNormalizado) {
      await queueWhatsAppMessage(lead.id, lead.telefoneNormalizado, lead.nomeEmpresa, message);
      queued++;
    }
  }
  addLog("success", `${queued} mensagens adicionadas à fila de disparo.`);
  return queued;
}

export function getQueueStatus(): { total: number; processing: boolean } {
  return {
    total: messageQueue.length,
    processing: isProcessing,
  };
}

export function clearQueue(): void {
  const count = messageQueue.length;
  messageQueue.length = 0;
  addLog("warning", `Fila de disparos limpa (${count} mensagens removidas).`);
}

function startProcessing(): void {
  if (isProcessing) return;
  isProcessing = true;
  processQueue();
}

async function processQueue(): Promise<void> {
  addLog("info", "Processamento da fila iniciado.");

  while (messageQueue.length > 0) {
    const now = new Date();
    const item = messageQueue[0];

    // Check if it's time to process this item
    if (item.nextRetryAt > now) {
      const waitMs = item.nextRetryAt.getTime() - now.getTime();
      const waitMinutes = Math.ceil(waitMs / 60000);
      addLog("info", `Aguardando intervalo de segurança... Próximo envio em ~${waitMinutes} min.`);
      await sleep(Math.min(waitMs, 60000)); // Check every minute max
      continue;
    }

    // Check dispatch time window
    const currentHour = new Date().getHours();
    if (currentHour < DISPATCH_START_HOUR || currentHour >= DISPATCH_END_HOUR) {
      const nextStart = new Date();
      if (currentHour >= DISPATCH_END_HOUR) {
        // After end hour: schedule for next day start
        nextStart.setDate(nextStart.getDate() + 1);
      }
      nextStart.setHours(DISPATCH_START_HOUR, 0, 0, 0);
      const waitMs = nextStart.getTime() - now.getTime();
      const waitHours = Math.ceil(waitMs / 3600000);
      addLog("warning", `Fora da janela de disparo (${DISPATCH_START_HOUR}h–${DISPATCH_END_HOUR}h). Aguardando até ${DISPATCH_START_HOUR}h (~${waitHours}h). Use Configurações para alterar o horário.`);
      await sleep(Math.min(waitMs, 60 * 60 * 1000)); // Check every hour max
      continue;
    }

    // Remove from queue
    messageQueue.shift();

    try {
      addLog("info", `Enviando para: ${item.nomeEmpresa}...`);
      await sendWhatsAppMessage(item);
      addLog("success", `Enviado com sucesso para: ${item.nomeEmpresa}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      item.retries++;

      if (item.retries < MAX_RETRIES) {
        const nextInterval = getRandomInterval();
        item.nextRetryAt = new Date(Date.now() + nextInterval);
        const nextMin = Math.round(nextInterval / 60000);
        messageQueue.push(item);
        addLog("warning", `Erro ao enviar para ${item.nomeEmpresa}: ${errorMsg}. Tentativa ${item.retries}/${MAX_RETRIES}. Reagendado para daqui a ${nextMin} min.`);
      } else {
        addLog("error", `Falha definitiva para ${item.nomeEmpresa} após ${MAX_RETRIES} tentativas: ${errorMsg}`);
        const db = await getDb();
        if (db) {
          await db.update(leads).set({ statusEnvio: "error" }).where(eq(leads.id, item.leadId));
        }
      }
    }

    // Random interval before next message
    if (messageQueue.length > 0) {
      const nextInterval = getRandomInterval();
      const nextMin = Math.round(nextInterval / 60000);
      addLog("info", `Aguardando ${nextMin} minutos para o próximo disparo (evitar bloqueio)...`);
      await sleep(nextInterval);
    }
  }

  addLog("info", "Fila de disparos vazia. Processamento finalizado.");
  isProcessing = false;
}

async function sendWhatsAppMessage(item: WhatsAppQueueItem): Promise<void> {
  // Ensure settings are fresh
  await loadEvolutionSettings();

  if (!INSTANCE_NAME) {
    throw new Error("Nome da Instância não configurado. Acesse Configurações → Evolution API e preencha o campo 'Nome da Instância'.");
  }

  if (!EVOLUTION_API_KEY) {
    throw new Error("API Key da Evolution não configurada. Acesse Configurações → Evolution API e preencha o campo 'API Key Global'.");
  }

  if (!EVOLUTION_API_BASE) {
    throw new Error("URL da Evolution API não configurada. Acesse Configurações e preencha a URL base.");
  }

  const phoneNumber = item.telefoneNormalizado.replace(/\D/g, "");

  if (phoneNumber.length < 10) {
    throw new Error(`Número de telefone inválido: ${item.telefoneNormalizado}`);
  }

  const payload = {
    number: phoneNumber,
    text: item.message,
  };

  // Correct Evolution API v2 endpoint:
  // POST {base}/message/sendText/{instanceName}
  // Header: apikey: {globalApiKey}
  const url = `${EVOLUTION_API_BASE}/message/sendText/${INSTANCE_NAME}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": EVOLUTION_API_KEY,
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

    // Provide a helpful message for common errors
    if (response.status === 404) {
      throw new Error(
        `Instância "${INSTANCE_NAME}" não encontrada na Evolution API. Verifique se o nome da instância está correto nas Configurações.`
      );
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `API Key inválida ou sem permissão. Verifique a API Key Global nas Configurações.`
      );
    }

    throw new Error(
      `Evolution API error: ${response.status} - ${errorData?.message || errorData?.response?.message || JSON.stringify(errorData)}`
    );
  }

  // Mark as sent in DB
  const db = await getDb();
  if (db) {
    await db.update(leads).set({ statusEnvio: "sent" }).where(eq(leads.id, item.leadId));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Start processing queue on module load
startProcessing();
