# Máquina de Leads — TODO

## Schema & Backend
- [x] Schema: tabela campaigns (id, name, nicho, cidades, template, status, spreadsheetId, createdAt)
- [x] Schema: tabela leads (id, campaignId, placeId, nomeEmpresa, telefoneOriginal, telefoneNormalizado, cidade, categoria, endereco, website, statusWhatsApp, statusEnvio, dataCaptura)
- [x] Schema: tabela settings (key, value)
- [x] Schema: tabela mining_logs (id, campaignId, startedAt, finishedAt, leadsFound, duplicatesSkipped, errors, status)
- [x] Migração SQL aplicada
- [x] db.ts: helpers para campaigns, leads, settings, mining_logs
- [x] router: campaigns (list, create, update, delete, toggleStatus)
- [x] router: leads (list com filtros, exportCSV, count)
- [x] router: mining (start, getStatus, getLogs)
- [x] router: settings (get, set — para API keys)
- [x] router: dashboard (metrics)
- [x] Lógica de mineração: Google Places Text Search + paginação next_page_token (100+ leads)
- [x] Deduplicação por place_id e telefone normalizado
- [x] Normalização de telefone para formato 55+DDD+número
- [x] Integração Google Sheets: leitura de campanhas e escrita de leads
- [x] Log de execução em tempo real (polling a cada 1.5s)

## Frontend
- [x] Design system: paleta dark elegante, tipografia refinada, espaçamento generoso
- [x] DashboardLayout com sidebar de navegação
- [x] Página Dashboard: métricas (total leads, com telefone, campanhas ativas, última execução)
- [x] Página Campanhas: tabela, criar/editar modal, toggle ativo/inativo
- [x] Página Leads: tabela com filtros (campanha, statusWhatsApp, cidade), exportar CSV
- [x] Página Mineração: iniciar mineração, log em tempo real, progresso
- [x] Página Configurações: campos para Google Places API Key e Google Sheets API Key
- [x] Componente de status badge (pronto / sem_telefone)
- [x] Feedback visual de loading, empty states e erros

## Qualidade
- [x] Testes vitest para routers principais (11 testes passando)
- [x] Checkpoint final

## Melhorias — Teste de Maps Platform API Key

- [x] Adicionar suporte para Maps Platform API Key no backend (miningService.ts)
- [x] Adicionar campo Maps Platform API Key no routers.ts
- [x] Atualizar Settings.tsx com novo campo para Maps Platform API Key
- [x] Adicionar seletor de estratégia na página Mining (Places vs Maps)
- [x] Testar mineração com Maps Platform API Key (resultado: mesmos 60 leads)
- [x] Validar se consegue 200+ leads com a chave alternativa (não melhorou)
- [x] Implementar múltiplas queries com variações de termos (miningService.ts)
- [x] Adicionar campo de variações no schema de campanhas (searchVariations)
- [x] UI para gerenciar variações de busca por campanha (Campaigns.tsx)
- [x] Backend: routers.ts com suporte a searchVariations
- [x] Testes vitest passando (11 testes) — validado
- [ ] Testar mineração com múltiplas queries em tempo real (meta: 200+ leads)

## Melhorias — Estratégia de Múltiplas Queries (200+ leads)

### Fase 2: Implementação de Múltiplas Queries
- [x] Checkpoint criado antes das mudanças (versão segura para rollback) — be50cf1c

### Fase 2: Implementar Mineração V2 (Múltiplas Queries + Nearby Search)
- [ ] Criar miningServiceV2.ts com estratégia avançada (CRIADO, precisa integrar)
- [ ] Integrar startMiningV2 no routers.ts com flag useV2
- [ ] Atualizar página Mining.tsx com botão para escolher estratégia
- [ ] Testar mineração V2 com Aracaju para validar 200+ leads

### Fase 3: Testes e Validação
- [ ] Testes vitest para miningServiceV2
- [ ] Validar deduplicação entre Text Search e Nearby Search
- [ ] Comparar resultados: V1 (60) vs V2 (200+)

### Fase 4: Entrega
- [ ] Checkpoint final com melhorias
- [ ] Documentação de como usar ambas as estratégias


## Disparo de Mensagens WhatsApp

- [x] Checkpoint de segurança antes de implementar disparo (5197655b)
- [x] Backend: router para disparar mensagens (sendWhatsApp + sendToLeads)
- [x] Backend: fila de processamento com intervalos 10-30 min (whatsappService.ts)
- [x] Backend: integração com Evolution API (https://evo.wzapflow.com.br)
- [x] Backend: carregar credenciais da Evolution API do banco de dados
- [x] Frontend: botão "Enviar WhatsApp" na página Leads
- [x] Frontend: campos de configuração da Evolution API em Configurações
- [x] Testes vitest passando (11 testes)
- [ ] Validar disparo em tempo real com Evolution API
- [ ] Adicionar coluna de status de envio na tabela de leads
