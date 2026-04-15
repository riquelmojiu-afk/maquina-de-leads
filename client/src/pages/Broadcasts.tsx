import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Trash2, RefreshCcw, AlertCircle, CheckCircle2, Clock, PauseCircle, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export default function Broadcasts() {
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { data: status, refetch: refetchStatus } = trpc.whatsapp.getQueueStatus.useQuery(undefined, {
    refetchInterval: 3000,
  });
  
  const { data: logs, refetch: refetchLogs } = trpc.whatsapp.getLogs.useQuery(undefined, {
    refetchInterval: 1500,
  });

  const clearQueue = trpc.whatsapp.clearQueue.useMutation({
    onSuccess: () => {
      toast.success("Fila de disparos limpa com sucesso");
      refetchStatus();
    },
    onError: (err) => toast.error("Erro ao limpar fila: " + err.message),
  });

  const clearLogs = trpc.whatsapp.clearLogs.useMutation({
    onSuccess: () => {
      toast.success("Logs limpos");
      refetchLogs();
    },
  });

  useEffect(() => {
    if (isAutoScroll && scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [logs, isAutoScroll]);

  return (
    <DashboardLayout title="Monitor de Disparos" subtitle="Acompanhe o envio de mensagens em tempo real">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status da Fila</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{status?.total || 0}</div>
              <Badge variant={status?.processing ? "default" : "secondary"} className="flex gap-1 items-center">
                {status?.processing ? (
                  <><RefreshCcw className="w-3 h-3 animate-spin" /> Processando</>
                ) : (
                  <><PauseCircle className="w-3 h-3" /> Ocioso</>
                )}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Mensagens aguardando envio</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">Ações Rápidas</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button variant="outline" size="sm" className="flex gap-2" onClick={() => refetchStatus()}>
              <RefreshCcw className="w-4 h-4" /> Atualizar Status
            </Button>
            <Button variant="destructive" size="sm" className="flex gap-2" disabled={!status?.total || clearQueue.isPending} onClick={() => { if (confirm("Tem certeza que deseja cancelar todos os disparos pendentes?")) { clearQueue.mutate(); } }}>
              <Trash2 className="w-4 h-4" /> Limpar Fila
            </Button>
            <Button variant="ghost" size="sm" className="flex gap-2" onClick={() => clearLogs.mutate()}>
              <MessageSquare className="w-4 h-4" /> Limpar Log
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="flex flex-col h-[600px]">
        <CardHeader className="flex flex-row items-center justify-between border-b py-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${status?.processing ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
            <CardTitle className="text-base">Log de Atividades</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className={`text-xs ${isAutoScroll ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => setIsAutoScroll(!isAutoScroll)}>
              {isAutoScroll ? "Auto-scroll ON" : "Auto-scroll OFF"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-hidden bg-slate-950 font-mono text-sm">
          <ScrollArea className="h-full" ref={scrollRef}>
            <div className="p-4 space-y-1">
              {(!logs || logs.length === 0) && (
                <div className="text-slate-500 italic py-4 text-center">
                  Nenhuma atividade registrada ainda...
                </div>
              )}
              {logs?.slice().reverse().map((log, i) => (
                <div key={i} className="flex gap-3 leading-relaxed border-b border-slate-900 pb-1 mb-1">
                  <span className="text-slate-500 shrink-0">
                    [{new Date(log.time).toLocaleTimeString()}]
                  </span>
                  <span className={`${log.type === 'success' ? 'text-emerald-400' : ''} ${log.type === 'error' ? 'text-rose-400' : ''} ${log.type === 'warning' ? 'text-amber-400' : ''} ${log.type === 'info' ? 'text-blue-300' : ''}`}>
                    {log.type === 'success' && <CheckCircle2 className="inline w-3 h-3 mr-1 mb-0.5" />}
                    {log.type === 'error' && <AlertCircle className="inline w-3 h-3 mr-1 mb-0.5" />}
                    {log.type === 'warning' && <Clock className="inline w-3 h-3 mr-1 mb-0.5" />}
                    {log.type === 'info' && <Send className="inline w-3 h-3 mr-1 mb-0.5" />}
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      
      <div className="mt-6">
        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-300">
                <p className="font-semibold mb-1">Dica de Segurança:</p>
                <p>O sistema utiliza intervalos aleatórios entre 10 e 30 minutos entre cada mensagem para proteger seu número contra bloqueios.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
