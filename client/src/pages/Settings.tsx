import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Eye, EyeOff, Key, Settings as SettingsIcon, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Settings() {
  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.settings.getAll.useQuery();

  const setMutation = trpc.settings.set.useMutation({
    onSuccess: () => {
      utils.settings.getAll.invalidate();
      toast.success("Configurações salvas com sucesso!");
    },
    onError: (e) => toast.error(e.message),
  });

  const [placesKey, setPlacesKey] = useState("");
  const [sheetsKey, setSheetsKey] = useState("");
  const [showPlaces, setShowPlaces] = useState(false);
  const [showSheets, setShowSheets] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const payload: { google_places_api_key?: string; google_sheets_api_key?: string } = {};
    if (placesKey.trim()) payload.google_places_api_key = placesKey.trim();
    if (sheetsKey.trim()) payload.google_sheets_api_key = sheetsKey.trim();

    if (Object.keys(payload).length === 0) {
      toast.error("Preencha ao menos uma chave para salvar.");
      return;
    }
    setMutation.mutate(payload);
    setPlacesKey("");
    setSheetsKey("");
  }

  return (
    <div className="space-y-6 p-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure as chaves de API necessárias para o funcionamento do sistema
        </p>
      </div>

      {/* Status Cards */}
      {!isLoading && settings && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <div
              className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                settings.google_places_api_key_set
                  ? "bg-emerald-400/10"
                  : "bg-muted"
              }`}
            >
              {settings.google_places_api_key_set ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <Key className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Google Places API</p>
              <p className="text-xs text-muted-foreground">
                {settings.google_places_api_key_set
                  ? `Configurada — ${settings.google_places_api_key}`
                  : "Não configurada"}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <div
              className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                settings.google_sheets_api_key_set
                  ? "bg-emerald-400/10"
                  : "bg-muted"
              }`}
            >
              {settings.google_sheets_api_key_set ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <Key className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Google Sheets API</p>
              <p className="text-xs text-muted-foreground">
                {settings.google_sheets_api_key_set
                  ? `Configurada — ${settings.google_sheets_api_key}`
                  : "Não configurada"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <SettingsIcon className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">Atualizar Chaves de API</h2>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Google Places API Key */}
          <div className="space-y-2">
            <Label className="text-foreground">
              Google Places API Key
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                (necessária para mineração de leads)
              </span>
            </Label>
            <div className="relative">
              <Input
                type={showPlaces ? "text" : "password"}
                placeholder={
                  settings?.google_places_api_key_set
                    ? "Digite para substituir a chave atual..."
                    : "AIzaSy..."
                }
                value={placesKey}
                onChange={(e) => setPlacesKey(e.target.value)}
                className="bg-input border-border text-foreground pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPlaces((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPlaces ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Obtenha sua chave em{" "}
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                Google Cloud Console
              </a>{" "}
              — habilite a API "Places API" no seu projeto.
            </p>
          </div>

          {/* Google Sheets API Key */}
          <div className="space-y-2">
            <Label className="text-foreground">
              Google Sheets API Key
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                (para sincronização com planilhas)
              </span>
            </Label>
            <div className="relative">
              <Input
                type={showSheets ? "text" : "password"}
                placeholder={
                  settings?.google_sheets_api_key_set
                    ? "Digite para substituir a chave atual..."
                    : "AIzaSy..."
                }
                value={sheetsKey}
                onChange={(e) => setSheetsKey(e.target.value)}
                className="bg-input border-border text-foreground pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowSheets((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showSheets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Habilite a API "Google Sheets API" no mesmo projeto do Google Cloud.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={setMutation.isPending} className="gap-2">
              {setMutation.isPending ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </form>
      </div>

      {/* Security note */}
      <div className="rounded-xl border border-border/50 bg-muted/30 p-4 flex gap-3">
        <Shield className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">Segurança das Chaves</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            As chaves de API são armazenadas de forma segura no banco de dados do servidor e nunca
            são expostas no frontend. Apenas os últimos 4 caracteres são exibidos para confirmação.
            Certifique-se de restringir suas chaves no Google Cloud Console para maior segurança.
          </p>
        </div>
      </div>

      {/* Quick setup guide */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">Guia Rápido de Configuração</h2>
        <ol className="space-y-3 text-sm text-muted-foreground">
          <li className="flex gap-3">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">
              1
            </span>
            <span>
              Acesse o{" "}
              <a
                href="https://console.cloud.google.com"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                Google Cloud Console
              </a>{" "}
              e crie ou selecione um projeto.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">
              2
            </span>
            <span>
              Vá em <strong className="text-foreground">APIs e Serviços → Biblioteca</strong> e
              habilite: <strong className="text-foreground">Places API</strong> e{" "}
              <strong className="text-foreground">Google Sheets API</strong>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">
              3
            </span>
            <span>
              Em <strong className="text-foreground">Credenciais</strong>, crie uma{" "}
              <strong className="text-foreground">Chave de API</strong> e cole acima.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">
              4
            </span>
            <span>
              Crie uma campanha, ative-a e execute a mineração. O sistema buscará automaticamente
              todas as páginas de resultados (100+ leads por execução).
            </span>
          </li>
        </ol>
      </div>
    </div>
  );
}
