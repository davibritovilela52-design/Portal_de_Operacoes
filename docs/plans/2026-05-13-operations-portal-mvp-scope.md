# MVP Scope - Enterprise Operational Portal (Phase 1 Yachts)

Date: 2026-05-13
Status: Ready for execution planning
Sources:
- [2026-05-13-operations-portal-prd.md](</C:/Users/Davi Vilela/OneDrive - PRIME YOU/Área de Trabalho/Dev/Portal_de_Operacoes/docs/plans/2026-05-13-operations-portal-prd.md>)
- [2026-05-13-operations-portal-decision-tree-map.md](</C:/Users/Davi Vilela/OneDrive - PRIME YOU/Área de Trabalho/Dev/Portal_de_Operacoes/docs/plans/2026-05-13-operations-portal-decision-tree-map.md>)

## MVP Objective

Colocar o novo portal em producao como fonte unica de verdade para Yachts em dois dominios criticos:
- manutencao
- agenda

Objetivo pratico: substituir o portal antigo apos migracao 100% validada, mantendo operacao diaria segura, rastreavel e com governanca.

## Core Hypothesis

Se a operacao de Yachts usar um unico portal com:
- agenda sem sobreposicao por ativo
- governanca clara de papeis (operacao central, coordenacao tecnica, equipe por ativo)
- trilha de auditoria e SLAs de excecao

entao a empresa reduz fragmentacao operacional e ganha controle suficiente para escalar o modelo para Aviation sem aumentar risco sistemico.

## Primary User Journey

1. Equipe por ativo ou coordenacao tecnica abre chamado de manutencao.
2. Coordenacao tecnica classifica, define prioridade e estrategia de absorcao.
3. Se emergencial, coordenacao tecnica aplica bloqueio tecnico provisario na agenda.
4. Operacao central valida bloqueio em ate 24h.
5. Execucao ocorre (interna ou terceiro) com evidencias e controle de custo.
6. Coordenacao tecnica libera tecnicamente o ativo.
7. Operacao central ajusta impactos de agenda/utilizacao e fecha governanca de pagamento.
8. Chamado encerra com auditoria completa.
9. Incidentes (P1-P4) sao registrados de forma separada e vinculados aos chamados.

## Certainties, Hypotheses, Decisions

### Certezas

- Fase 1 e Yachts.
- Escopo funcional inicial e manutencao + agenda.
- Migracao da base do portal antigo sera 100%.
- Go-live sera apenas no novo portal apos aceite formal.

### Hipoteses

- O escopo de duas frentes (manutencao e agenda) e suficiente para validar a hipotese central.
- A operacao absorve macrostatus e disciplina de anexos/justificativas sem queda de throughput.

### Decisoes

- Fonte de verdade do dominio no go-live: novo portal.
- Sem escrita no portal antigo apos cutover (read-only).
- Seguranca/compliance prevalecem sobre utilizacao comercial.
- Tratamento de excecoes operacionais via operacao central e registros de manutencao/auditoria; nao ha entidade de incidente dedicada no codigo atual.

## MVP Features

| Feature | Purpose | Priority | Notes |
|---|---|---|---|
| Migracao 100% do historico Yachts | Garantir continuidade e confianca no cutover | Must-have | Inclui anexos criticos e mapeamento de IDs legados |
| Migracao de agenda futura (minimo 90 dias) | Evitar operacao cega no go-live | Must-have | Janela minima ja aprovada |
| Agenda unica sem sobreposicao por ativo | Evitar conflitos operacionais | Must-have | Regra hard-block |
| Cadastro e ciclo de vida de manutencao (macrostatus) | Controlar fluxo operacional ponta a ponta | Must-have | Pendente, Em andamento, Congelado, Pagamento, Concluido, Cancelado, Reaberto |
| Controle de prioridade P1-P4 | Priorizacao e SLA | Must-have | Rebaixamento com justificativa auditavel |
| Bloqueio tecnico provisario + validacao central 24h | Proteger seguranca com governanca | Must-have | Escalonamento automatico em breach |
| Permissoes por papel e escopo de ativo | Segregacao de responsabilidades | Must-have | 5 roles (portal_admin, central_operations, yachts_operations, yachts_technical_coordination, asset_field_team); equipe por ativo restrita, demais com escopo mais amplo |
| Auditoria completa de acoes criticas | Compliance e accountability | Must-have | Justificativa obrigatoria em eventos criticos; decision memo imutavel apos confirmacao |
| Evidencias obrigatorias por fase | Integridade operacional e fechamento robusto | Must-have | Bloqueia transicao sem evidencias minimas |
| Notificacoes de excecao e SLA (75/90/100%) via in-app | Evitar estouro sem acao | Must-have | Alarmes para responsavel e operacao central |
| KPI baseline operacional | Medir sucesso do MVP | Should-have | Dashboard inicial pode ser simples |
| Revisao periodica de acessos | Governanca continua | Should-have | Mensal criticos, trimestral demais |
| Retificacao versionada de historico concluido | Preservar imutabilidade com correcao controlada | Should-have | Sem edicao destrutiva |
| Relatorios executivos avancados | Visao estrategica ampliada | Could-have | Pos-MVP imediato |
| Parametrizacao avancada de alcadas | Flexibilidade financeira fina | Could-have | Backlog |
| Integracao de custos variaveis com legado | Visibilidade financeira completa | Won't-have now | Backlog explicito |
| Modulo completo de orcamento fixo | Planejamento financeiro aprofundado | Won't-have now | Fora do escopo fase 1 |
| Fluxo de Aviation | Escalabilidade multimodal | Won't-have now | Fase 2 |

## Out of Scope

- Aviation, Real Estate e Cars em producao no MVP.
- Integracoes realtime obrigatorias para o go-live de Yachts.
- Modelo completo de custos variaveis por utilizacao.
- Modulo corporativo completo de orcamento fixo.
- Parametrizacao definitiva de alcadas financeiras.

## Manual or Simulated Processes

- Custos variaveis por utilizacao: controle fora do MVP (manual/processo legado ate decisao formal).
- Relatorio executivo expandido: pode iniciar com consolidacao manual semanal no inicio.
- Saneamento de lacunas historicas legadas: fila manual priorizada por risco operacional.
- Contingencia em indisponibilidade acima do limite: registro manual minimo com reconciliacao obrigatoria no novo portal.

## Success Metrics

Metas operacionais (primeiros 60 dias):
- >=95% das validacoes emergenciais dentro de 24h.
- 100% dos conflitos de agenda resolvidos em ate 72h.
- 0 chamados P1 vencidos.
- >=98% dos chamados concluidos com evidencias completas.
- 0 acao critica sem decision memo / justificativa estruturada.

Metas de adocao:
- 100% dos novos chamados criados no novo portal desde o go-live.
- 0 escrita operacional no portal antigo apos cutover.

Metas de confianca de dados:
- 100% dos registros migrados por contagem de entidade.
- 100% dos anexos criticos acessiveis.

## Acceptance Criteria

- Todos os gates de migracao e go-live aprovados por:
  - operacao central
  - coordenacao tecnica Yachts
  - admin do portal
- Regras de agenda unica testadas e sem sobreposicao valida.
- Permissoes criticas validadas (admin, operacao central, yachts operations, coordenacao tecnica, equipe por ativo).
- Fluxos de excecao funcionando:
  - bloqueio tecnico provisario
  - validacao central 24h
  - escalonamento de SLA
- Auditoria obrigatoria ativa para acoes criticas.
- Portal antigo em read-only apos virada.

## Risks and Uncertainties

- Risco: baixa qualidade de dados legados em parte do historico.
  - Mitigacao: classificar como "historico com lacuna" e priorizar saneamento por risco.
- Risco: sobrecarga da operacao central em conflito de agenda.
  - Mitigacao: alertas de SLA, fila priorizada, e ajuste de capacidade.
- Risco: uso inadequado de Congelado para mascarar SLA.
  - Mitigacao: motivo obrigatorio, limite de congelamentos e escalonamento automatico.
- Incerteza: desenho final de custos variaveis.
  - Acao: manter em backlog ate decisao de ownership e ingestao.

## Post-MVP Roadmap

1. Harden Yachts (30-60 dias)
- estabilizar SLAs e capacidade
- fechar lacunas de dados historicos criticos
- consolidar dashboard executivo base

2. Expandir para Aviation
- criar fluxo proprio de Aviation sobre o mesmo nucleo de governanca
- manter agenda unica por ativo e trilha de auditoria comum

3. Expandir para Real Estate e Cars
- reutilizar macrostatus e governanca central
- adaptar subetapas por contexto operacional

4. Finance and Intelligence Wave
- decidir estrategia de custos variaveis
- evoluir modelo de orcamento fixo
- ampliar analytics cross-modal
