import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Edit2, Megaphone, Plus, Power, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type CampaignForm = {
  name: string;
  nicho: string;
  cidades: string;
  messageTemplate: string;
  spreadsheetId: string;
  searchVariations: string;
};

const emptyForm: CampaignForm = {
  name: "",
  nicho: "",
  cidades: "",
  messageTemplate: "",
  spreadsheetId: "",
  searchVariations: "",
};

export default function Campaigns() {
  const utils = trpc.useUtils();
  const { data: campaigns, isLoading } = trpc.campaigns.list.useQuery();
  const createMutation = trpc.campaigns.create.useMutation({
    onSuccess: () => {
      utils.campaigns.list.invalidate();
      utils.dashboard.metrics.invalidate();
      toast.success("Campanha criada com sucesso!");
      setOpen(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.campaigns.update.useMutation({
    onSuccess: () => {
      utils.campaigns.list.invalidate();
      toast.success("Campanha atualizada!");
      setOpen(false);
      setEditId(null);
    },
    onError: (e) => toast.error(e.message),
  });
  const toggleMutation = trpc.campaigns.toggleStatus.useMutation({
    onSuccess: (data) => {
      utils.campaigns.list.invalidate();
      utils.dashboard.metrics.invalidate();
      toast.success(`Campanha ${data.status === "ativa" ? "ativada" : "desativada"}!`);
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.campaigns.delete.useMutation({
    onSuccess: () => {
      utils.campaigns.list.invalidate();
      utils.dashboard.metrics.invalidate();
      toast.success("Campanha removida.");
    },
    onError: (e) => toast.error(e.message),
  });

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<CampaignForm>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  function openCreate() {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(c: NonNullable<typeof campaigns>[0]) {
    setEditId(c.id);
    let variations = "";
    if (c.searchVariations) {
      try {
        const parsed = JSON.parse(c.searchVariations);
        variations = parsed.join("\n");
      } catch {
        variations = "";
      }
    }
    setForm({
      name: c.name,
      nicho: c.nicho,
      cidades: c.cidades,
      messageTemplate: c.messageTemplate || "",
      spreadsheetId: c.spreadsheetId || "",
      searchVariations: variations,
    });
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const variations = form.searchVariations
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean);
    const payload = {
      ...form,
      searchVariations: variations.length > 0 ? JSON.stringify(variations) : null,
    };
    if (editId !== null) {
      updateMutation.mutate({ id: editId, ...payload });
    } else {
      createMutation.mutate({ ...payload, status: "inativa" });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Campanhas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie suas campanhas de prospecção
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Campanha
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !campaigns || campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Megaphone className="h-10 w-10 text-muted-foreground/30 mb-4" />
            <p className="text-sm font-medium text-foreground">Nenhuma campanha criada</p>
            <p className="text-xs text-muted-foreground mt-1">
              Crie sua primeira campanha para começar a prospectar leads.
            </p>
            <Button onClick={openCreate} className="mt-4 gap-2" size="sm">
              <Plus className="h-4 w-4" />
              Criar Campanha
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Campanha
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Nicho
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Cidades
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Criada em
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const cities = c.cidades
                  .split(/[,;\n]/)
                  .map((x) => x.trim())
                  .filter(Boolean);
                return (
                  <tr
                    key={c.id}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{c.name}</p>
                      {c.spreadsheetId && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                          Sheet: {c.spreadsheetId}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-foreground">{c.nicho}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {cities.slice(0, 3).map((city) => (
                          <span
                            key={city}
                            className="inline-flex px-2 py-0.5 rounded-md text-xs bg-muted text-muted-foreground"
                          >
                            {city}
                          </span>
                        ))}
                        {cities.length > 3 && (
                          <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-muted text-muted-foreground">
                            +{cities.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`status-${c.status}`}>{c.status}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggleMutation.mutate({ id: c.id })}
                          disabled={toggleMutation.isPending}
                          title={c.status === "ativa" ? "Desativar" : "Ativar"}
                          className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors ${
                            c.status === "ativa"
                              ? "text-primary hover:bg-primary/10"
                              : "text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => openEdit(c)}
                          title="Editar"
                          className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        {deleteConfirm === c.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                deleteMutation.mutate({ id: c.id });
                                setDeleteConfirm(null);
                              }}
                              className="text-xs px-2 py-1 rounded bg-destructive text-destructive-foreground hover:opacity-90"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(c.id)}
                            title="Remover"
                            className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editId ? "Editar Campanha" : "Nova Campanha"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-foreground">Nome da Campanha *</Label>
              <Input
                placeholder="Ex: Prospecção Açaí SP"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                className="bg-input border-border text-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground">Nicho *</Label>
              <Input
                placeholder="Ex: Açaí, Barbearia, Restaurante"
                value={form.nicho}
                onChange={(e) => setForm((f) => ({ ...f, nicho: e.target.value }))}
                required
                className="bg-input border-border text-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground">Cidades *</Label>
              <Textarea
                placeholder="Ex: São Paulo, Campinas, Santos&#10;(uma por linha ou separadas por vírgula)"
                value={form.cidades}
                onChange={(e) => setForm((f) => ({ ...f, cidades: e.target.value }))}
                required
                rows={3}
                className="bg-input border-border text-foreground resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground">Template de Mensagem</Label>
              <Textarea
                placeholder="Ex: Olá {nome_empresa}! Somos da... (use {nome_empresa} e {cidade})"
                value={form.messageTemplate}
                onChange={(e) => setForm((f) => ({ ...f, messageTemplate: e.target.value }))}
                rows={3}
                className="bg-input border-border text-foreground resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground">ID da Planilha Google Sheets</Label>
              <Input
                placeholder="Ex: 1VhQbJTusBc5g-HRKkj5crZjlIJXbU3zcL1N112oChQU"
                value={form.spreadsheetId}
                onChange={(e) => setForm((f) => ({ ...f, spreadsheetId: e.target.value }))}
                className="bg-input border-border text-foreground font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Opcional — ID da planilha para sincronização com Google Sheets
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground">Variações de Busca (Múltiplas Queries)</Label>
              <Textarea
                placeholder="Ex: Açaí&#10;Sorveteria&#10;Açaí Gourmet&#10;(uma por linha — deixe em branco para usar apenas o nicho)"
                value={form.searchVariations}
                onChange={(e) => setForm((f) => ({ ...f, searchVariations: e.target.value }))}
                rows={3}
                className="bg-input border-border text-foreground resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Opcional — Adicione variações de termo para aumentar cobertura (ex: 200+ leads). Deixe em branco para usar apenas o nicho.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="border-border"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando..." : editId ? "Salvar Alterações" : "Criar Campanha"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
