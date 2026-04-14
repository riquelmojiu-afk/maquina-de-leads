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


## Melhorias — Aumento de Cobertura de Leads

### Fase 1: Checkpoint de Segurança
- [ ] Checkpoint criado antes das mudanças (versão segura para rollback)

### Fase 2: Maps Platform API Key
- [ ] Suporte para Maps Platform API Key no painel de configurações
- [ ] Testar mineração com Maps Platform API Key
- [ ] Comparar resultados: Places API vs Maps Platform API

### Fase 3: Múltiplas Queries + Nearby Search
- [ ] Implementar estratégia de múltiplas queries (variações de busca)
- [ ] Implementar Nearby Search em paralelo com Text Search
- [ ] Consolidar resultados sem duplicatas
- [ ] Testar com Aracaju para validar 200+ leads

### Fase 4: Testes e Validação
- [ ] Testes vitest para novas estratégias de mineração
- [ ] Validar deduplicação entre Text Search e Nearby Search
- [ ] Testar com múltiplas cidades

### Fase 5: Entrega
- [ ] Checkpoint final com melhorias
- [ ] Documentação de como usar ambas as estratégias
