# Task Breakdown - Phase 1 Yachts (Atomic <=4h)

Date: 2026-05-13
Source spec:
- [2026-05-13-operations-portal-phase1-yachts-spec.md](</C:/Users/Davi Vilela/OneDrive - PRIME YOU/Área de Trabalho/Dev/Portal_de_Operacoes/docs/plans/2026-05-13-operations-portal-phase1-yachts-spec.md>)

## Conventions

- Cada tarefa deve caber em no maximo `4h`.
- `RN` referencia os requisitos da SPEC:
  - `P0-Rx`, `P1-Rx`, `P2-Rx`
  - `E1..E10` (Addendum de execucao/go-live)
- Dependencias usam `Task ID`.

## Atomic Tasks

| Task ID | Task | Est (h) | RN | Depends On |
|---|---|---:|---|---|
| T-001 | Definir estrutura de modulos de dominio (Agenda, Maintenance, Audit, Access, Operational Exception Tracking) | 2 | P0-R2,P0-R4,P0-R9,P0-R10 | - |
| T-002 | Criar dicionario de papeis e escopos (`tenant`, `asset`, `role`) | 2 | P0-R1 | T-001 |
| T-003 | Especificar matriz de permissao por acao (CRUD + approve/override) | 3 | P0-R1,P0-R10,E10 | T-002 |
| T-004 | Revisar matriz com Operacao Central e Coordenacao Tecnica | 2 | P0-R1,E1,E10 | T-003 |
| T-005 | Definir eventos de auditoria obrigatorios por acao critica | 2 | P0-R10 | T-003 |
| T-006 | Definir payload de mini-ata estruturada | 2 | P0-R10,A8,E10 | T-005 |
| T-007 | Definir politica de imutabilidade e retificacao versionada | 2 | P0-R10,A18 | T-005 |
| T-008 | Definir catalogo de status de manutencao e transicoes validas | 3 | P0-R4 | T-001 |
| T-009 | Definir regras de congelado (motivos, limites, escalonamento) | 2 | P0-R6 | T-008 |
| T-010 | Definir taxonomia de prioridade de chamado (P1-P4) | 1 | P0-R4 | T-008 |
| T-011 | Definir taxonomia de severidade de bug (S1-S4) e SLA de resposta | 1 | E5 | - |
| T-012 | Definir tipos de evento de agenda e prioridade operacional | 2 | P0-R3 | T-001 |
| T-013 | Definir regra formal de no-overlap por ativo (janela temporal) | 2 | P0-R2,A4 | T-012 |
| T-014 | Definir fluxo de conflito comum de agenda e decisao central | 2 | P0-R2,P0-R3 | T-013 |
| T-015 | Definir fluxo de bloqueio tecnico provisorio e SLA 24h | 2 | P0-R5 | T-013 |
| T-016 | Definir regra de folga da tripulacao vs minimo seguro | 2 | P0-R3 | T-012 |
| T-017 | Definir campos obrigatorios de abertura de chamado | 2 | P0-R4 | T-008 |
| T-018 | Definir campos obrigatorios de terceiro (fornecedor/custo/evidencia) | 2 | P0-R7 | T-008 |
| T-019 | Definir regra de variacao >10% com dupla validacao | 1 | P0-R7 | T-018 |
| T-020 | Definir regra maker-checker por perfil de usuario | 2 | P0-R7 | T-003 |
| T-021 | Definir evidencias obrigatorias por fase (diagnostico/pagamento/conclusao) | 2 | P0-R8 | T-008 |
| T-022 | Definir limites de upload e tipos permitidos de anexo | 1 | P0-R8,A15 | T-021 |
| T-023 | Definir rastreio de excecao operacional vinculado a manutencao | 2 | P0-R9 | T-001 |
| T-024 | Definir checklist de fechamento de excecao operacional P1/P2 | 2 | P0-R9 | T-023 |
| T-025 | Definir modelo de notificacao imediata para eventos criticos | 2 | P0-R12,E7 | T-005 |
| T-026 | Definir thresholds 75/90/100 e acoes de escalonamento | 2 | P0-R12 | T-025 |
| T-027 | Definir owners de alerta por tipo (operacao, tecnico, executivo) | 1 | P0-R12,E7 | T-025 |
| T-028 | Definir metricas operacionais (leading/lagging) e formulas | 3 | P0-R13 | - |
| T-029 | Definir metricas de disponibilidade e janela operacional 24x7 | 2 | P0-R13,A16 | T-028 |
| T-030 | Definir padrao de logs estruturados com correlation_id | 2 | P0-R13,A11 | T-005 |
| T-031 | Definir health checks obrigatorios (API e DB reais; fila e storage como placeholders) | 2 | P0-R13,A11 | T-030 |
| T-032 | Definir trilhas de rastreamento para fluxos criticos | 2 | P0-R13,A11 | T-030 |
| T-033 | Definir plano de revogacao critica em ate 15 min | 2 | P0-R1,A3 | T-003 |
| T-034 | Definir politica deny-by-default de autorizacao | 1 | P0-R1,A7 | T-003 |
| T-035 | Definir politica de `mfaEnabled` para perfis criticos no cadastro de acesso | 1 | P0-R1 | T-003 |
| T-036 | Definir isolamento logico multi-tenant e regras RLS | 3 | P0-R1,A1 | T-003 |
| T-037 | Definir acesso mediado para anexos com grant curto emitido pelo backend | 2 | P0-R8,A15 | T-022 |
| T-038 | Definir politica de timezone snapshot para SLAs | 2 | A16 | T-026 |
| T-039 | Definir versionamento de API (`v1`) e politica de breaking changes | 2 | A12 | T-001 |
| T-040 | Definir estrategia de migracoes DB expand/contract | 3 | A14 | T-001 |
| T-041 | Definir politica de feature flags para mudancas criticas | 2 | A19 | T-001 |
| T-042 | Definir baseline de seguranca de anexos (antivirus/hash) | 2 | A10,A15 | T-022 |
| T-043 | Definir escopo do dry-run de cutover (dados, testes, tempos) | 3 | P0-R11,A13,E2 | T-001 |
| T-044 | Definir checklist de gate de migracao por entidade | 3 | P0-R11 | T-043 |
| T-045 | Definir validacao de anexos criticos com hash 100% | 2 | P0-R11,A10 | T-044 |
| T-046 | Definir regra de migracao de agenda futura (90 dias) | 2 | P0-R11 | T-044 |
| T-047 | Definir politica de freeze 12h e comunicacao pre-cutover | 2 | E2 | T-043 |
| T-048 | Definir comite de go/no-go e rito de unanimidade | 2 | E1 | T-043 |
| T-049 | Definir playbook de no-go e replanejamento de janela | 2 | E1,ER1 | T-048 |
| T-050 | Definir runbook de cutover com checkpoints T+1/T+4/T+24 | 3 | E2 | T-047 |
| T-051 | Definir modelo de comando de crise de plataforma 72h | 2 | E3 | T-050 |
| T-052 | Definir cadencia de comunicacao em incidente (30/30 min) | 1 | E3 | T-051 |
| T-053 | Definir politica de hotfix (pipeline/dupla aprovacao/P1 excecao) | 2 | E4 | T-051 |
| T-054 | Definir template obrigatorio de postmortem 24h para P1 | 1 | E4 | T-053 |
| T-055 | Definir processo de reconciliacao de dados pos-incidente (24h) | 2 | E6 | T-051 |
| T-056 | Definir modelo de relatorio de impacto por ativo/chamado | 2 | E6 | T-055 |
| T-057 | Definir gatilhos de escalonamento executivo e canais oficiais | 2 | E7 | T-052 |
| T-058 | Definir politica de freeze de features por 30 dias | 1 | E8 | T-053 |
| T-059 | Definir criterio de excecao permitido durante freeze | 1 | E8 | T-058 |
| T-060 | Definir plano de readiness por perfil critico (100%) | 2 | E9 | T-048 |
| T-061 | Definir scripts de simulacao por perfil (operacao, tecnica, campo, admin) | 3 | E9 | T-060 |
| T-062 | Definir criterio formal de "pronto para go-live" com evidencias | 2 | E9,E1 | T-061 |
| T-063 | Definir politica de read-only no portal antigo pos-cutover | 1 | P0-R11 | T-050 |
| T-064 | Definir fluxo de regularizacao de dado tardio legado | 2 | P0-R11 | T-063 |
| T-065 | Definir ownership de metricas e rito diario/semanal/mensal | 2 | P0-R13 | T-028 |
| T-066 | Definir governance de alteracao de regra com vigencia programada | 2 | A9 | T-041 |
| T-067 | Definir matriz de capacidade por ativo/equipe (limites iniciais) | 3 | A17 | T-028 |
| T-068 | Definir regra de bloqueio por excesso de capacidade + override | 2 | A17 | T-067 |
| T-069 | Definir politica de retencao e anonimização apos 5 anos | 2 | A6 | T-005 |
| T-070 | Definir controle de mudanca documental coordenada (single source rule) | 2 | E10 | T-004 |

## Execution Waves

| Wave | Focus | Tasks |
|---|---|---|
| W1 | Governance base and boundaries | T-001..T-016, T-033..T-041 |
| W2 | Core operational rules and evidence | T-017..T-032, T-042 |
| W3 | Migration, cutover, and go-live command | T-043..T-064 |
| W4 | Stabilization governance and scaling controls | T-065..T-070 |

## Critical Path (Recommended)

1. `T-001 -> T-003 -> T-008 -> T-013 -> T-015`
2. `T-043 -> T-044 -> T-045 -> T-048 -> T-050`
3. `T-060 -> T-061 -> T-062 -> T-048`
4. `T-051 -> T-053 -> T-055 -> T-057`
5. `T-063 -> T-064 -> T-070`

## Notes

- Backlog P2 da SPEC (custos variaveis, orcamento fixo, evolucao modal completa) nao entra no MVP de execucao.
- Caso qualquer task de governance (`T-003`, `T-048`, `T-062`, `T-070`) fique pendente, o go-live deve ser tratado como bloqueado.
