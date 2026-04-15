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
let EVOLUTION_API_BASE = "https://evo.wzapflow.com.br";
let INSTANCE_TOKEN = "";
let SENDER_NUMBER = "";

// Load settings from database
async function loadEvolutionSettings(): Promise<void> {
  try {
    const { getSetting } = await import("./db");
    const baseUrl = await getSetting("evolution_api_base");
    const token = await getSetting("evolution_instance_token");
    const number = await getSetting("evolution_sender_number");
    
    if (baseUrl) EVOLUTION_API_BASE = baseUrl;
    if (token) INSTANCE_TOKEN = token;
    if (number) SENDER_NUMBER = number;
    
    if (!INSTANCE_TOKEN) {
      addLog("warning", "Configuração da Evolution API pendente (Token não encontrado).");
    } else {
      addLog("info", `Configurações carregadas. Instância: ${INSTANCE_TOKEN.slice(0, 5)}...`);
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

  if (!INSTANCE_TOKEN) {
    throw new Error("Evolution Instance Token não configurado. Acesse Configurações e preencha o token da Evolution API.");
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

  const response = await fetch(`${EVOLUTION_API_BASE}/message/sendText/${INSTANCE_TOKEN}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": INSTANCE_TOKEN,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { message: errorText };
    }
    throw new Error(
      `Evolution API error: ${response.status} - ${errorData.message || JSON.stringify(errorData)}`
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
