import { trpc } from "@/lib/trpc";
import { Building2, Clock, Megaphone, Phone, TrendingUp, Zap } from "lucide-react";
import { useLocation } from "wouter";

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div
          className="h-9 w-9 rounded-lg flex items-center justify-center"
          style={{ background: color + "22" }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: metrics, isLoading } = trpc.dashboard.metrics.useQuery();
  const { data: miningHistory } = trpc.mining.history.useQuery();
  const { data: campaigns } = trpc.campaigns.list.useQuery();
  const [, setLocation] = useLocation();

  const lastExec = metrics?.ultimaExecucao
    ? new Date(metrics.ultimaExecucao).toLocaleString("pt-BR")
    : "Nunca executado";

  const phoneRate =
    metrics && metrics.totalLeads > 0
      ? Math.round((metrics.leadsComTelefone / metrics.totalLeads) * 100)
      : 0;

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão geral da sua prospecção automática de leads
          </p>
        </div>
        <button
          onClick={() => setLocation("/mining")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Zap className="h-4 w-4" />
          Nova Mineração
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Building2}
          label="Total de Leads"
          value={isLoading ? "—" : (metrics?.totalLeads ?? 0).toLocaleString("pt-BR")}
          sub="Leads minerados no total"
          color="oklch(0.72 0.18 195)"
        />
        <MetricCard
          icon={Phone}
          label="Leads com Telefone"
          value={isLoading ? "—" : (metrics?.leadsComTelefone ?? 0).toLocaleString("pt-BR")}
          sub={`${phoneRate}% do total — status pronto`}
          color="oklch(0.72 0.18 165)"
        />
        <MetricCard
          icon={Megaphone}
          label="Campanhas Ativas"
          value={isLoading ? "—" : (metrics?.campanhasAtivas ?? 0)}
          sub="Campanhas em execução"
          color="oklch(0.80 0.17 80)"
        />
        <MetricCard
          icon={Clock}
          label="Última Execução"
          value={isLoading ? "—" : lastExec}
          sub="Data e hora da última mineração"
          color="oklch(0.65 0.22 295)"
        />
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Mining */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Histórico de Minerações</h2>
            <button
              onClick={() => setLocation("/mining")}
              className="text-xs text-primary hover:underline"
            >
              Ver tudo
            </button>
          </div>
          {!miningHistory || miningHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Zap className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma mineração executada ainda.</p>
              <button
                onClick={() => setLocation("/mining")}
                className="mt-3 text-xs text-primary hover:underline"
              >
                Iniciar primeira mineração →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {miningHistory.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        log.status === "completed"
                          ? "bg-emerald-400"
                          : log.status === "running"
                            ? "bg-amber-400 animate-pulse"
                            : "bg-red-400"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {log.campaignName || `Campanha #${log.campaignId}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.startedAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-semibold text-foreground">{log.leadsFound}</p>
                    <p className="text-xs text-muted-foreground">leads</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Campaigns */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Campanhas Ativas</h2>
            <button
              onClick={() => setLocation("/campaigns")}
              className="text-xs text-primary hover:underline"
            >
              Gerenciar
            </button>
          </div>
          {!campaigns || campaigns.filter((c) => c.status === "ativa").length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Megaphone className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma campanha ativa.</p>
              <button
                onClick={() => setLocation("/campaigns")}
                className="mt-3 text-xs text-primary hover:underline"
              >
                Criar campanha →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {campaigns
                .filter((c) => c.status === "ativa")
                .slice(0, 5)
                .map((campaign) => (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{campaign.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {campaign.nicho} · {campaign.cidades.split(",").length} cidade(s)
                      </p>
                    </div>
                    <span className="status-ativa shrink-0 ml-3">ativa</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
