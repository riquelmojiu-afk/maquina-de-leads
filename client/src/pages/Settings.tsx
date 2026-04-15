import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Clock, Eye, EyeOff, Key, MessageCircle, Settings as SettingsIcon, Shield } from "lucide-react";
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
  const [evolutionInstanceName, setEvolutionInstanceName] = useState("");
  const [evolutionApiKey, setEvolutionApiKey] = useState("");
  const [evolutionNumber, setEvolutionNumber] = useState("");
  const [showPlaces, setShowPlaces] = useState(false);
  const [showMaps, setShowMaps] = useState(false);
  const [showSheets, setShowSheets] = useState(false);
  const [showEvolutionApiKey, setShowEvolutionApiKey] = useState(false);
  const [dispatchStartHour, setDispatchStartHour] = useState("");
  const [dispatchEndHour, setDispatchEndHour] = useState("");

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const payload: any = {};
    if (placesKey.trim()) payload.google_places_api_key = placesKey.trim();
    if (mapsKey.trim()) payload.google_maps_platform_api_key = mapsKey.trim();
    if (sheetsKey.trim()) payload.google_sheets_api_key = sheetsKey.trim();
    if (evolutionBase.trim()) payload.evolution_api_base = evolutionBase.trim();
    if (evolutionInstanceName.trim()) payload.evolution_instance_name = evolutionInstanceName.trim();
    if (evolutionApiKey.trim()) payload.evolution_api_key = evolutionApiKey.trim();
    if (evolutionNumber.trim()) payload.evolution_sender_number = evolutionNumber.trim();
    if (dispatchStartHour.trim()) payload.dispatch_start_hour = dispatchStartHour.trim();
    if (dispatchEndHour.trim()) payload.dispatch_end_hour = dispatchEndHour.trim();

    if (Object.keys(payload).length === 0) {
      toast.error("Preencha ao menos um campo para salvar.");
      return;
    }
    setMutation.mutate(payload);
    setPlacesKey("");
    setMapsKey("");
    setSheetsKey("");
    setEvolutionBase("");
    setEvolutionInstanceName("");
    setEvolutionApiKey("");
    setEvolutionNumber("");
    setDispatchStartHour("");
    setDispatchEndHour("");
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
                settings.google_places_api_key_set ? "bg-emerald-400/10" : "bg-muted"
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
                settings.evolution_instance_name_set && settings.evolution_api_key_set
                  ? "bg-emerald-400/10"
                  : "bg-muted"
              }`}
            >
              {settings.evolution_instance_name_set && settings.evolution_api_key_set ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Evolution API</p>
              <p className="text-xs text-muted-foreground">
                {settings.evolution_instance_name_set && settings.evolution_api_key_set
                  ? `Instância: ${settings.evolution_instance_name}`
                  : "Não configurada"}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <div
              className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                settings.google_sheets_api_key_set ? "bg-emerald-400/10" : "bg-muted"
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
            <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Integração WhatsApp (Evolution API)
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              A Evolution API usa dois campos distintos: o <strong>Nome da Instância</strong> vai na URL da requisição,
              e a <strong>API Key Global</strong> vai no cabeçalho de autenticação.
            </p>

            <div className="space-y-2">
              <Label className="text-foreground">URL Base da Evolution API</Label>
              <Input
                type="text"
                placeholder={settings?.evolution_api_base || "https://evo.wzapflow.com.br"}
                value={evolutionBase}
                onChange={(e) => setEvolutionBase(e.target.value)}
                className="bg-input border-border text-foreground font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                URL base do seu servidor Evolution API (sem barra no final)
              </p>
            </div>

            <div className="space-y-2 mt-4">
              <Label className="text-foreground">
                Nome da Instância
                <span className="ml-2 text-xs font-normal text-amber-500">(usado na URL)</span>
              </Label>
              <Input
                type="text"
                placeholder={settings?.evolution_instance_name || "minha-instancia"}
                value={evolutionInstanceName}
                onChange={(e) => setEvolutionInstanceName(e.target.value)}
                className="bg-input border-border text-foreground font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Nome exato da instância criada no painel da Evolution API (ex: <code className="bg-muted px-1 rounded">minha-instancia</code>).
                Não confundir com o token UUID.
              </p>
            </div>

            <div className="space-y-2 mt-4">
              <Label className="text-foreground">
                API Key Global
                <span className="ml-2 text-xs font-normal text-amber-500">(cabeçalho de autenticação)</span>
              </Label>
              <div className="relative">
                <Input
                  type={showEvolutionApiKey ? "text" : "password"}
                  placeholder={
                    settings?.evolution_api_key_set
                      ? "Digite para substituir a chave atual..."
                      : "sua-api-key-global"
                  }
                  value={evolutionApiKey}
                  onChange={(e) => setEvolutionApiKey(e.target.value)}
                  className="bg-input border-border text-foreground pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowEvolutionApiKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showEvolutionApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Global API Key do servidor Evolution (encontrada em <code className="bg-muted px-1 rounded">Configurações → API Key</code> no painel).
                {settings?.evolution_api_key_set && (
                  <span className="text-emerald-500 ml-1">Configurada: {settings.evolution_api_key}</span>
                )}
              </p>
            </div>

            {/* Horário de Disparo */}
            <div className="mt-6 border-t border-border pt-5">
              <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Janela de Horário para Disparos
              </h4>
              <p className="text-xs text-muted-foreground mb-4">
                Os disparos só serão realizados dentro do horário configurado. Fora desse intervalo, as mensagens ficam na fila e aguardam automaticamente.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Hora de Início</Label>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    placeholder={settings?.dispatch_start_hour ?? "8"}
                    value={dispatchStartHour}
                    onChange={(e) => setDispatchStartHour(e.target.value)}
                    className="bg-input border-border text-foreground font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">Hora de início (0–23). Atual: <strong>{settings?.dispatch_start_hour ?? "8"}h</strong></p>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Hora de Fim</Label>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    placeholder={settings?.dispatch_end_hour ?? "18"}
                    value={dispatchEndHour}
                    onChange={(e) => setDispatchEndHour(e.target.value)}
                    className="bg-input border-border text-foreground font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">Hora de fim (0–23). Atual: <strong>{settings?.dispatch_end_hour ?? "18"}h</strong></p>
                </div>
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <Label className="text-foreground">Número do WhatsApp</Label>
              <Input
                type="text"
                placeholder={settings?.evolution_sender_number || "557999511102"}
                value={evolutionNumber}
                onChange={(e) => setEvolutionNumber(e.target.value)}
                className="bg-input border-border text-foreground font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Número de WhatsApp que enviará as mensagens (somente dígitos com DDD e DDI, ex: <code className="bg-muted px-1 rounded">5511999999999</code>)
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
