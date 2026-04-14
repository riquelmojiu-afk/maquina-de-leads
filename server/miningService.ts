import {
  createMiningLog,
  getCampaignById,
  getExistingPhones,
  getExistingPlaceIds,
  getSetting,
  insertLead,
  updateMiningLog,
} from "./db";

export interface LogEntry {
  time: string;
  type: "info" | "success" | "warning" | "error";
  message: string;
}

export interface MiningProgress {
  logId: number;
  status: "running" | "completed" | "error";
  leadsFound: number;
  duplicatesSkipped: number;
  errorsCount: number;
  logs: LogEntry[];
}

// In-memory store for active mining sessions
const activeSessions = new Map<number, MiningProgress>();

function normalizePhone(value: string): string {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length >= 10 && digits.length <= 11) return "55" + digits;
  return digits;
}

function log(progress: MiningProgress, type: LogEntry["type"], message: string) {
  const entry: LogEntry = { time: new Date().toISOString(), type, message };
  progress.logs.push(entry);
  // Keep last 500 log entries
  if (progress.logs.length > 500) progress.logs = progress.logs.slice(-500);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getMiningProgress(logId: number): MiningProgress | undefined {
  return activeSessions.get(logId);
}

export async function startMining(campaignId: number, useMapsApiKey: boolean = false): Promise<number> {
  const campaign = await getCampaignById(campaignId);
  if (!campaign) throw new Error("Campanha não encontrada");

  const settingKey = useMapsApiKey ? "google_maps_platform_api_key" : "google_places_api_key";
  const apiKey = await getSetting(settingKey);
  if (!apiKey) throw new Error(`Chave da ${useMapsApiKey ? "Maps Platform" : "Google Places"} API não configurada. Acesse Configurações.`);

  const logId = await createMiningLog({
    campaignId,
    campaignName: campaign.name,
    status: "running",
    leadsFound: 0,
    duplicatesSkipped: 0,
    errorsCount: 0,
    logMessages: "[]",
  });

  const progress: MiningProgress = {
    logId,
    status: "running",
    leadsFound: 0,
    duplicatesSkipped: 0,
    errorsCount: 0,
    logs: [],
  };

  activeSessions.set(logId, progress);

  // Run mining asynchronously
  runMining(campaign, apiKey, logId, progress).catch((err) => {
    log(progress, "error", `Erro fatal: ${err.message}`);
    progress.status = "error";
    updateMiningLog(logId, {
      status: "error",
      finishedAt: new Date(),
      leadsFound: progress.leadsFound,
      duplicatesSkipped: progress.duplicatesSkipped,
      errorsCount: progress.errorsCount,
      logMessages: JSON.stringify(progress.logs.slice(-100)),
    });
  });

  return logId;
}

async function runMining(
  campaign: { id: number; nicho: string; cidades: string; name: string },
  apiKey: string,
  logId: number,
  progress: MiningProgress
) {
  log(progress, "info", `🚀 Iniciando mineração da campanha: ${campaign.name}`);

  const cities = campaign.cidades
    .split(/[,;\n]/)
    .map((c) => c.trim())
    .filter(Boolean);

  log(progress, "info", `📍 Cidades alvo: ${cities.join(", ")}`);

  // Load existing place_ids and phones for deduplication
  const existingPlaceIds = await getExistingPlaceIds(campaign.id);
  const existingPhones = await getExistingPhones();

  log(progress, "info", `🔍 Cache de deduplicação: ${existingPlaceIds.size} place_ids, ${existingPhones.size} telefones já registrados`);

  for (const city of cities) {
    const query = `${campaign.nicho} em ${city}`;
    log(progress, "info", `🏙️ Minerando: "${query}"`);

    let nextPageToken = "";
    let pageCount = 0;
    let cityLeads = 0;

    do {
      pageCount++;
      log(progress, "info", `  📄 Página ${pageCount} — buscando resultados...`);

      try {
        // Build URL
        const params = new URLSearchParams({
          query,
          key: apiKey,
          language: "pt-BR",
        });
        if (nextPageToken) {
          params.set("pagetoken", nextPageToken);
          // Google requires a 2-3s delay before using next_page_token
          log(progress, "info", `  ⏳ Aguardando 3s antes da próxima página...`);
          await sleep(3000);
        }

        const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`;
        const response = await fetch(url);
        const data = (await response.json()) as {
          status: string;
          results: Array<{
            place_id: string;
            name: string;
            formatted_address?: string;
            types?: string[];
          }>;
          next_page_token?: string;
          error_message?: string;
        };

        if (data.status === "REQUEST_DENIED") {
          throw new Error(`API Key inválida ou sem permissão: ${data.error_message}`);
        }

        if (data.status === "ZERO_RESULTS") {
          log(progress, "warning", `  ⚠️ Nenhum resultado para "${query}"`);
          break;
        }

        // INVALID_REQUEST often means the token is not ready yet — retry once
        if (data.status === "INVALID_REQUEST" && nextPageToken) {
          log(progress, "warning", `  ⏳ Token ainda não pronto (INVALID_REQUEST), aguardando 3s...`);
          await sleep(3000);
          continue;
        }

        if (data.status !== "OK") {
          log(progress, "warning", `  ⚠️ Status inesperado: ${data.status}`);
          break;
        }

        const results = data.results || [];
        log(progress, "info", `  ✅ ${results.length} resultados nesta página`);

        for (const place of results) {
          // Deduplication by place_id
          if (existingPlaceIds.has(place.place_id)) {
            progress.duplicatesSkipped++;
            log(progress, "warning", `  ⏭️ Duplicata ignorada (place_id): ${place.name}`);
            continue;
          }

          // Fetch place details for phone number
          let phone = "";
          let website = "";
          try {
            const detailParams = new URLSearchParams({
              place_id: place.place_id,
              fields: "name,formatted_phone_number,international_phone_number,website,types,formatted_address",
              key: apiKey,
              language: "pt-BR",
            });
            const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?${detailParams.toString()}`;
            const detailRes = await fetch(detailUrl);
            const detailData = (await detailRes.json()) as {
              result?: {
                formatted_phone_number?: string;
                international_phone_number?: string;
                website?: string;
              };
            };

            const rawPhone =
              detailData.result?.international_phone_number ||
              detailData.result?.formatted_phone_number ||
              "";
            phone = normalizePhone(rawPhone);
            website = detailData.result?.website || "";
          } catch {
            progress.errorsCount++;
            log(progress, "error", `  ❌ Erro ao buscar detalhes de: ${place.name}`);
          }

          // Deduplication by normalized phone
          if (phone && existingPhones.has(phone)) {
            progress.duplicatesSkipped++;
            log(progress, "warning", `  ⏭️ Duplicata ignorada (telefone): ${place.name}`);
            continue;
          }

          // Insert lead
          try {
            await insertLead({
              campaignId: campaign.id,
              placeId: place.place_id,
              nomeEmpresa: place.name,
              telefoneOriginal: phone,
              telefoneNormalizado: phone,
              cidade: city,
              categoria: (place.types || []).join(", "),
              endereco: place.formatted_address || "",
              website,
              statusWhatsApp: phone ? "pronto" : "sem_telefone",
              statusEnvio: "pending",
            });

            existingPlaceIds.add(place.place_id);
            if (phone) existingPhones.add(phone);

            progress.leadsFound++;
            cityLeads++;
            log(
              progress,
              "success",
              `  ✅ Lead salvo: ${place.name} | ${phone || "sem telefone"} | ${city}`
            );
          } catch (err: unknown) {
            progress.errorsCount++;
            const msg = err instanceof Error ? err.message : String(err);
            log(progress, "error", `  ❌ Erro ao salvar lead ${place.name}: ${msg}`);
          }
        }

        nextPageToken = data.next_page_token || "";

        // Update progress in DB periodically
        await updateMiningLog(logId, {
          leadsFound: progress.leadsFound,
          duplicatesSkipped: progress.duplicatesSkipped,
          errorsCount: progress.errorsCount,
          logMessages: JSON.stringify(progress.logs.slice(-100)),
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        progress.errorsCount++;
        log(progress, "error", `  ❌ Erro na busca: ${msg}`);
        nextPageToken = "";
      }
    } while (nextPageToken); // Continue while there are more pages

    log(
      progress,
      "info",
      `🏁 ${city}: ${cityLeads} leads capturados em ${pageCount} página(s)`
    );
  }

  // Finalize
  progress.status = "completed";
  const summary = `🎉 Mineração concluída! Total: ${progress.leadsFound} leads | ${progress.duplicatesSkipped} duplicatas ignoradas | ${progress.errorsCount} erros`;
  log(progress, "success", summary);

  await updateMiningLog(logId, {
    status: "completed",
    finishedAt: new Date(),
    leadsFound: progress.leadsFound,
    duplicatesSkipped: progress.duplicatesSkipped,
    errorsCount: progress.errorsCount,
    logMessages: JSON.stringify(progress.logs.slice(-100)),
  });

  // Clean up session after 10 minutes
  setTimeout(() => activeSessions.delete(logId), 10 * 60 * 1000);
}
