import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Building2, CheckCircle2, Clock, Download, MessageCircle, Phone, Search, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function StatusEnvioBadge({ status }: { status: string }) {
  if (status === "sent") {
    return (
      <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20">
        <CheckCircle2 className="h-3 w-3" />
        Enviado
      </Badge>
    );
  }
  if (status === "error") {
    return (
      <Badge variant="outline" className="gap-1 text-rose-600 border-rose-200 bg-rose-50 dark:bg-rose-950/20">
        <XCircle className="h-3 w-3" />
        Erro
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-slate-500 border-slate-200 bg-slate-50 dark:bg-slate-950/20">
      <Clock className="h-3 w-3" />
      Pendente
    </Badge>
  );
}

export default function Leads() {
  const { data: campaigns } = trpc.campaigns.list.useQuery();

  const [campaignId, setCampaignId] = useState<string>("all");
  const [statusWhatsApp, setStatusWhatsApp] = useState<string>("all");
  const [cidadeFilter, setCidadeFilter] = useState("");
  const [cidadeInput, setCidadeInput] = useState("");
  const [offset, setOffset] = useState(0);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const LIMIT = 100;

  const filters = {
    campaignId: campaignId !== "all" ? Number(campaignId) : undefined,
    statusWhatsApp:
      statusWhatsApp !== "all"
        ? (statusWhatsApp as "pronto" | "sem_telefone")
        : undefined,
    cidade: cidadeFilter || undefined,
    limit: LIMIT,
    offset,
  };

  const { data, isLoading } = trpc.leads.list.useQuery(filters);

  const { data: csvData, refetch: fetchCsv } = trpc.leads.exportCsv.useQuery(
    {
      campaignId: filters.campaignId,
      statusWhatsApp: filters.statusWhatsApp,
      cidade: filters.cidade,
    },
    { enabled: false }
  );

  const sendWhatsAppMutation = trpc.whatsapp.sendToCampaign.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.queued} mensagens adicionadas à fila de disparo!`);
      setShowSendDialog(false);
    },
    onError: (e) => toast.error("Erro ao enviar: " + e.message),
  });

  const handleOpenSendDialog = () => {
    if (!campaignId || campaignId === "all") {
      toast.error("Selecione uma campanha para enviar mensagens");
      return;
    }
    setShowSendDialog(true);
  };

  const handleConfirmSend = () => {
    const msg = customMessage.trim();
    if (!msg) {
      toast.error("Digite uma mensagem antes de enviar");
      return;
    }
    sendWhatsAppMutation.mutate({
      campaignId: Number(campaignId),
      message: msg,
    });
  };

  function handleExport() {
    fetchCsv().then((result) => {
      if (result.data?.csv) {
        const blob = new Blob(["\uFEFF" + result.data.csv], {
          type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`${result.data.count} leads exportados!`);
      }
    });
  }

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 0;
  const currentPage = Math.floor(offset / LIMIT) + 1;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data ? `${data.total.toLocaleString("pt-BR")} leads encontrados` : "Carregando..."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleOpenSendDialog}
            disabled={sendWhatsAppMutation.isPending || campaignId === "all"}
            className="gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            <MessageCircle className="h-4 w-4" />
            Enviar WhatsApp
          </Button>
          <Button onClick={handleExport} variant="outline" className="gap-2 border-border">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={campaignId} onValueChange={(v) => { setCampaignId(v); setOffset(0); }}>
          <SelectTrigger className="w-48 bg-card border-border text-foreground">
            <SelectValue placeholder="Campanha" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">Todas as campanhas</SelectItem>
            {campaigns?.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusWhatsApp} onValueChange={(v) => { setStatusWhatsApp(v); setOffset(0); }}>
          <SelectTrigger className="w-44 bg-card border-border text-foreground">
            <SelectValue placeholder="Status WhatsApp" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pronto">pronto</SelectItem>
            <SelectItem value="sem_telefone">sem_telefone</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Input
            placeholder="Filtrar por cidade..."
            value={cidadeInput}
            onChange={(e) => setCidadeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setCidadeFilter(cidadeInput);
                setOffset(0);
              }
            }}
            className="w-48 bg-card border-border text-foreground"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => { setCidadeFilter(cidadeInput); setOffset(0); }}
            className="border-border"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {(campaignId !== "all" || statusWhatsApp !== "all" || cidadeFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCampaignId("all");
              setStatusWhatsApp("all");
              setCidadeFilter("");
              setCidadeInput("");
              setOffset(0);
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground/30 mb-4" />
            <p className="text-sm font-medium text-foreground">Nenhum lead encontrado</p>
            <p className="text-xs text-muted-foreground mt-1">
              Execute uma mineração para capturar leads.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Empresa", "Telefone", "Cidade", "Categoria", "Status WhatsApp", "Status Envio", "Capturado em"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((lead) => (
                    <tr
                      key={lead.id}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground max-w-[200px] truncate">
                          {lead.nomeEmpresa}
                        </p>
                        {lead.website && (
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary hover:underline truncate block max-w-[200px]"
                          >
                            {lead.website.replace(/^https?:\/\//, "")}
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {lead.telefoneNormalizado ? (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-foreground font-mono text-xs">
                              {lead.telefoneNormalizado}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-foreground whitespace-nowrap">{lead.cidade || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[160px] truncate text-xs">
                        {lead.categoria
                          ? lead.categoria.split(",")[0]?.trim()
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`status-${lead.statusWhatsApp}`}>
                          {lead.statusWhatsApp}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusEnvioBadge status={lead.statusEnvio} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(lead.dataCaptura).toLocaleString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Página {currentPage} de {totalPages} · {data.total.toLocaleString("pt-BR")} leads
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={offset === 0}
                    onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                    className="border-border text-xs"
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={offset + LIMIT >= data.total}
                    onClick={() => setOffset(offset + LIMIT)}
                    className="border-border text-xs"
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialog de envio de mensagem */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              Enviar Mensagem WhatsApp
            </DialogTitle>
            <DialogDescription>
              Escreva a mensagem que será enviada para todos os leads com telefone da campanha selecionada.
              Os disparos serão feitos com intervalos aleatórios de 10 a 30 minutos para proteção do número.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea
              placeholder="Digite sua mensagem aqui... Ex: Olá! Vi que você tem um negócio na área e gostaria de apresentar nossa solução."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {customMessage.length} caracteres
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmSend}
              disabled={sendWhatsAppMutation.isPending || !customMessage.trim()}
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
            >
              {sendWhatsAppMutation.isPending ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <MessageCircle className="h-4 w-4" />
              )}
              Confirmar Disparo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
