# LeadsPro — TODO

## Migração do GitHub para o Manus
- [x] Copiar drizzle/schema.ts do repositório GitHub
- [x] Copiar server/db.ts do repositório GitHub
- [x] Copiar server/routers.ts do repositório GitHub
- [x] Copiar server/miningService.ts do repositório GitHub
- [x] Copiar server/whatsappService.ts do repositório GitHub
- [x] Copiar todos os arquivos client/src do repositório GitHub
- [x] Copiar shared/ do repositório GitHub
- [x] Aplicar migração SQL no banco de dados do Manus (campaigns, leads, settings, mining_logs)

## Correções de Backend
- [x] Implementar endpoint trpc.whatsapp.getLogs no routers.ts
- [x] Implementar endpoint trpc.whatsapp.clearQueue no routers.ts
- [x] Implementar endpoint trpc.whatsapp.clearLogs no routers.ts
- [x] Corrigir validação de credenciais da Evolution API antes do envio
- [x] Melhorar tratamento de erros no disparo de mensagens (mensagens claras ao usuário)

## Correções de Frontend
- [x] Adicionar coluna statusEnvio (pending/sent/error) na tabela de leads (Leads.tsx)
- [x] Remover mensagem hard-coded "Ooi, tudo bem?" do botão de envio
- [x] Adicionar campo de input editável para mensagem de disparo (modal com Textarea)
- [x] Adicionar item "Disparos" no menu lateral do DashboardLayout
- [x] Adicionar suporte a props title e subtitle no DashboardLayout
- [x] Registrar rota /broadcasts no App.tsx

## Qualidade
- [x] Testes vitest passando (5 testes: auth.logout + whatsapp endpoints)
- [x] Salvar checkpoint final
- [x] Push para o GitHub

## Correção Evolution API — Separação de campos
- [x] Separar campo "Nome da Instância" do campo "API Key Global" no whatsappService.ts
- [x] Adicionar campo evolution_instance_name no banco de dados (settings)
- [x] Atualizar Settings.tsx com campo separado para Nome da Instância e API Key Global
- [x] Atualizar routers.ts para aceitar e salvar o novo campo evolution_instance_name
- [x] Salvar checkpoint e push para o GitHub
