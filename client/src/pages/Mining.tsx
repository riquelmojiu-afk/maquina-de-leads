import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { AlertCircle, CheckCircle2, Clock, Loader2, Play, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type LogEntry = {
  time: string;
  type: "info" | "success" | "warning" | "error";
  message: string;
};

function LogLine({ entry }: { entry: LogEntry }) {
  const colorClass = {
    info: "text-sky-400",
    success: "text-emerald-400",
    warning: "text-amber-400",
    error: "text-red-400",
  }[entry.type];

  const time = new Date(entry.time).toLocaleTimeString("pt-BR");

  return (
    <div className="flex gap-3 text-xs font-mono leading-relaxed">
      <span className="text-muted-foreground shrink-0">{time}</span>
      <span className={colorClass}>{entry.message}</span>
    </div>
  );
}

export default function Mining() {
  const utils = trpc.useUtils();
  const { data: campaigns } = trpc.campaigns.list.useQuery();
  const { data: history, refetch: refetchHistory } = trpc.mining.history.useQuery();

  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [useMapsApiKey, setUseMapsApiKey] = useState(false);
  const [activeLogId, setActiveLogId] = useState<number | null>(null);
  const [polling, setPolling] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const startMutation = trpc.mining.start.useMutation({
    onSuccess: (data) => {
      setActiveLogId(data.logId);
      setPolling(true);
      toast.success("Mineração iniciada!");
    },
    onError: (e) => toast.error(e.message),
  });

  const { data: progress } = trpc.mining.getProgress.useQuery(
    { logId: activeLogId! },
    {
      enabled: activeLogId !== null && polling,
      refetchInterval: polling ? 1500 : false,
    }
  );

  useEffect(() => {
    if (progress?.status === "completed" || progress?.status === "error") {
      setPolling(false);
      refetchHistory();
      utils.dashboard.metrics.invalidate();
      utils.leads.list.invalidate();
      if (progress.status === "completed") {
        toast.success(`Mineração concluída! ${progress.leadsFound} leads capturados.`);
      } else {
        toast.error("Mineração encerrada com erro.");
      }
    }
  }, [progress?.status]);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [progress?.logs?.length]);

  const activeCampaigns = campaigns?.filter((c) => c.status === "ativa") || [];
  const isRunning = progress?.status === "running";

  function handleStart() {
    if (!selectedCampaign) {
      toast.error("Selecione uma campanha ativa.");
      return;
    }
    startMutation.mutate({ campaignId: Number(selectedCampaign), useMapsApiKey });
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Mineração de Leads</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Execute a prospecção automática via Google Places API com paginação automática (100+ leads)
        </p>
      </div>

      {/* Controls */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">Iniciar Nova Mineração</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Campanha Ativa
            </label>
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger className="w-64 bg-input border-border text-foreground">
                <SelectValue placeholder="Selecionar campanha..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {activeCampaigns.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                    Nenhuma campanha ativa. Ative uma campanha primeiro.
                  </div>
                ) : (
                  activeCampaigns.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name} — {c.nicho}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Estratégia
            </label>
            <Select value={useMapsApiKey ? "maps" : "places"} onValueChange={(v) => setUseMapsApiKey(v === "maps")}>
              <SelectTrigger className="w-56 bg-input border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="places">Places API (60 leads)</SelectItem>
                <SelectItem value="maps">Maps Platform API (teste)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleStart}
            disabled={isRunning || startMutation.isPending || !selectedCampaign}
            className="gap-2"
          >
            {isRunning || startMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Minerando...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Iniciar Mineração
              </>
            )}
          </Button>
        </div>

        {activeCampaigns.length === 0 && (
          <p className="text-xs text-amber-400 mt-3">
            ⚠️ Nenhuma campanha ativa. Vá em Campanhas e ative uma para poder minerar.
          </p>
        )}

        {useMapsApiKey && (
          <p className="text-xs text-sky-400 mt-3">
            🔍 Testando com Maps Platform API Key. Configure-a em Configurações para usar esta estratégia.
          </p>
        )}
      </div>

      {/* Active Mining Progress */}
      {activeLogId !== null && progress && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Stats bar */}
          <div className="flex items-center gap-6 px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              {progress.status === "running" ? (
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
              ) : progress.status === "completed" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-400" />
              )}
              <span
                className={`text-sm font-medium ${
                  progress.status === "running"
                    ? "text-primary"
                    : progress.status === "completed"
                      ? "text-emerald-400"
                      : "text-red-400"
                }`}
              >
                {progress.status === "running"
                  ? "Minerando..."
                  : progress.status === "completed"
                    ? "Concluído"
                    : "Erro"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Zap className="h-3.5 w-3.5 text-emerald-400" />
              <span className="font-semibold text-foreground">{progress.leadsFound}</span>
              <span className="text-muted-foreground">leads</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-muted-foreground">Duplicatas:</span>
              <span className="font-semibold text-amber-400">{progress.duplicatesSkipped}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-muted-foreground">Erros:</span>
              <span className="font-semibold text-red-400">{progress.errorsCount}</span>
            </div>
          </div>

          {/* Log terminal */}
          <div className="bg-background/50 p-4 h-80 overflow-y-auto space-y-1">
            {progress.logs.length === 0 ? (
              <p className="text-xs text-muted-foreground font-mono">Aguardando logs...</p>
            ) : (
              progress.logs.map((entry: LogEntry, i: number) => (
                <LogLine key={i} entry={entry} />
              ))
            )}
            <div ref={logEndRef} />
          </div>
        </div>
      )}

      {/* History */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Histórico de Execuções</h2>
        </div>
        {!history || history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma execução registrada ainda.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Campanha", "Iniciado em", "Concluído em", "Leads", "Duplicatas", "Erros", "Status"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {history.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => {
                    setActiveLogId(log.id);
                    setPolling(false);
                  }}
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {log.campaignName || `Campanha #${log.campaignId}`}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(log.startedAt).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {log.finishedAt
                      ? new Date(log.finishedAt).toLocaleString("pt-BR")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-emerald-400">{log.leadsFound}</span>
                  </td>
                  <td className="px-4 py-3 text-amber-400">{log.duplicatesSkipped}</td>
                  <td className="px-4 py-3 text-red-400">{log.errorsCount}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                        log.status === "completed"
                          ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
                          : log.status === "running"
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "bg-red-400/10 text-red-400 border border-red-400/20"
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
