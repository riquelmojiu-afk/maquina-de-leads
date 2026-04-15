import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Eye, EyeOff, Key, MessageCircle, Settings as SettingsIcon, Shield } from "lucide-react";
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
  const [mapsKey, setMapsKey] = useState("");
  const [sheetsKey, setSheetsKey] = useState("");
  const [evolutionBase, setEvolutionBase] = useState("");
  const [evolutionToken, setEvolutionToken] = useState("");
  const [evolutionNumber, setEvolutionNumber] = useState("");
  const [showPlaces, setShowPlaces] = useState(false);
  const [showMaps, setShowMaps] = useState(false);
  const [showSheets, setShowSheets] = useState(false);
  const [showEvolutionToken, setShowEvolutionToken] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const payload: any = {};
    if (placesKey.trim()) payload.google_places_api_key = placesKey.trim();
    if (mapsKey.trim()) payload.google_maps_platform_api_key = mapsKey.trim();
    if (sheetsKey.trim()) payload.google_sheets_api_key = sheetsKey.trim();
    if (evolutionBase.trim()) payload.evolution_api_base = evolutionBase.trim();
    if (evolutionToken.trim()) payload.evolution_instance_token = evolutionToken.trim();
    if (evolutionNumber.trim()) payload.evolution_sender_number = evolutionNumber.trim();

    if (Object.keys(payload).length === 0) {
      toast.error("Preencha ao menos um campo para salvar.");
      return;
    }
    setMutation.mutate(payload);
    setPlacesKey("");
    setMapsKey("");
    setSheetsKey("");
    setEvolutionBase("");
    setEvolutionToken("");
    setEvolutionNumber("");
  }

  return (
    <div className="space-y-6 p-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure as chaves de API necessárias para o funcionamento do sistema
        </p>
      </div>

      {/* Status Cards */}
      {!isLoading && settings && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <p className="text-sm font-medium text-foreground">Places API</p>
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
                settings.evolution_instance_token_set
                  ? "bg-emerald-400/10"
                  : "bg-muted"
              }`}
            >
              {settings.evolution_instance_token_set ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Evolution API</p>
              <p className="text-xs text-muted-foreground">
                {settings.evolution_instance_token_set
                  ? `Configurada — ${settings.evolution_instance_token}`
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
              <p className="text-sm font-medium text-foreground">Sheets API</p>
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
          <h2 className="text-base font-semibold text-foreground">Atualizar Configurações</h2>
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
          </div>

          {/* Evolution API Settings */}
          <div className="border-t border-border pt-6 mt-6">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Integração WhatsApp (Evolution API)
            </h3>

            <div className="space-y-2">
              <Label className="text-foreground">URL Base da Evolution API</Label>
              <Input
                type="text"
                placeholder="https://evo.wzapflow.com.br"
                value={evolutionBase}
                onChange={(e) => setEvolutionBase(e.target.value)}
                className="bg-input border-border text-foreground font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                URL base da sua instância Evolution API
              </p>
            </div>

            <div className="space-y-2 mt-4">
              <Label className="text-foreground">Token da Instância</Label>
              <div className="relative">
                <Input
                  type={showEvolutionToken ? "text" : "password"}
                  placeholder="7504E1D39F79-4BF2-AA96-1DD9E9ADA726"
                  value={evolutionToken}
                  onChange={(e) => setEvolutionToken(e.target.value)}
                  className="bg-input border-border text-foreground pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowEvolutionToken((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showEvolutionToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Token de autenticação da sua instância
              </p>
            </div>

            <div className="space-y-2 mt-4">
              <Label className="text-foreground">Número do WhatsApp</Label>
              <Input
                type="text"
                placeholder="557999511102@s.whatsapp.net"
                value={evolutionNumber}
                onChange={(e) => setEvolutionNumber(e.target.value)}
                className="bg-input border-border text-foreground font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Número de WhatsApp que enviará as mensagens (formato: 55XXXXXXXXXXX@s.whatsapp.net)
              </p>
            </div>
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
    </div>
  );
}
