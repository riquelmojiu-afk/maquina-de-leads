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

// In-memory queue for WhatsApp messages
const messageQueue: WhatsAppQueueItem[] = [];
let isProcessing = false;

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
  } catch (e) {
    console.error("[WhatsApp] Failed to load settings:", e);
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
  startProcessing();
}

export async function queueMultipleMessages(
  leads: Array<{ id: number; telefoneNormalizado: string; nomeEmpresa: string }>,
  message: string
): Promise<number> {
  let queued = 0;
  for (const lead of leads) {
    if (lead.telefoneNormalizado) {
      await queueWhatsAppMessage(lead.id, lead.telefoneNormalizado, lead.nomeEmpresa, message);
      queued++;
    }
  }
  return queued;
}

export function getQueueStatus(): { total: number; processing: boolean } {
  return {
    total: messageQueue.length,
    processing: isProcessing,
  };
}

function startProcessing(): void {
  if (isProcessing) return;
  isProcessing = true;
  processQueue();
}

async function processQueue(): Promise<void> {
  while (messageQueue.length > 0) {
    const now = new Date();
    const item = messageQueue[0];

    // Check if it's time to process this item
    if (item.nextRetryAt > now) {
      // Wait until next retry time
      const waitMs = item.nextRetryAt.getTime() - now.getTime();
      await sleep(Math.min(waitMs, 60000)); // Check every minute max
      continue;
    }

    // Remove from queue
    messageQueue.shift();

    try {
      await sendWhatsAppMessage(item);
    } catch (error) {
      item.retries++;
      if (item.retries < MAX_RETRIES) {
        // Re-queue for retry
        item.nextRetryAt = new Date(Date.now() + getRandomInterval());
        messageQueue.push(item);
      } else {
        // Max retries exceeded - mark as error
        console.error(
          `[WhatsApp] Failed to send message to ${item.telefoneNormalizado} after ${MAX_RETRIES} retries:`,
          error
        );
        const db = await getDb();
        if (db) {
          await db.update(leads).set({ statusEnvio: "error" }).where(eq(leads.id, item.leadId));
        }
      }
    }

    // Random interval before next message
    if (messageQueue.length > 0) {
      await sleep(getRandomInterval());
    }
  }

  isProcessing = false;
}

async function sendWhatsAppMessage(item: WhatsAppQueueItem): Promise<void> {
  // Format phone number for Evolution API
  // Expected format: 557999511102 (without @ or @s.whatsapp.net)
  const phoneNumber = item.telefoneNormalizado.replace(/\D/g, "");

  const payload = {
    number: phoneNumber,
    text: item.message,
  };

  const response = await fetch(`${EVOLUTION_API_BASE}/message/sendText/${INSTANCE_TOKEN}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${INSTANCE_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Evolution API error: ${response.status} ${JSON.stringify(errorData)}`
    );
  }

  const data = (await response.json()) as { status?: string; message?: string };

      // Mark as sent
      const db = await getDb();
      if (db) {
        await db.update(leads).set({ statusEnvio: "sent" }).where(eq(leads.id, item.leadId));
      }

      console.log(
        `[WhatsApp] Message sent to ${item.nomeEmpresa} (${item.telefoneNormalizado})`
      );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Start processing queue on module load
startProcessing();
