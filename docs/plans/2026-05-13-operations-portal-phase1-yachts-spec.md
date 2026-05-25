# Product Spec - Operations Portal Phase 1 (Yachts)

Date: 2026-05-13
Version: 1.1
Status: Validated for implementation planning
Scope: Phase 1 MVP only (Yachts)
References:
- [2026-05-13-operations-portal-prd.md](</C:/Users/Davi Vilela/OneDrive - PRIME YOU/Área de Trabalho/Dev/Portal_de_Operacoes/docs/plans/2026-05-13-operations-portal-prd.md>)
- [2026-05-13-operations-portal-mvp-scope.md](</C:/Users/Davi Vilela/OneDrive - PRIME YOU/Área de Trabalho/Dev/Portal_de_Operacoes/docs/plans/2026-05-13-operations-portal-mvp-scope.md>)
- [2026-05-13-operations-portal-architecture-design.md](</C:/Users/Davi Vilela/OneDrive - PRIME YOU/Área de Trabalho/Dev/Portal_de_Operacoes/docs/plans/2026-05-13-operations-portal-architecture-design.md>)
- [2026-05-13-operations-portal-decision-tree-map.md](</C:/Users/Davi Vilela/OneDrive - PRIME YOU/Área de Trabalho/Dev/Portal_de_Operacoes/docs/plans/2026-05-13-operations-portal-decision-tree-map.md>)
- [2026-05-13-operations-portal-architecture-governor-audit.md](</C:/Users/Davi Vilela/OneDrive - PRIME YOU/Área de Trabalho/Dev/Portal_de_Operacoes/docs/plans/2026-05-13-operations-portal-architecture-governor-audit.md>)

## Problem Statement

Hoje, a operacao de Yachts esta fragmentada entre sistemas e rotinas manuais, reduzindo visibilidade, aumentando tempo de decisao e elevando risco de inconsistencias operacionais. A falta de uma agenda unica com governanca clara gera conflitos de uso e manutencao. Sem um portal unico com trilha de auditoria, a empresa fica exposta a risco operacional, financeiro e de compliance, e perde base segura para escalar o modelo para Aviation.

## Goals

1. Estabelecer o novo portal como fonte unica de verdade para `manutencao` e `agenda` de Yachts no go-live.
2. Garantir regra de `zero sobreposicao` na agenda por ativo, com resolucao de conflitos governada.
3. Implementar fluxo completo de manutencao com auditoria, evidencias obrigatorias e segregacao de funcoes.
4. Cumprir SLAs operacionais principais no periodo inicial:
- validacao de bloqueio tecnico emergencial em ate 24h
- resolucao de conflito comum de agenda em ate 72h
5. Criar base confiavel para expansao da arquitetura para Aviation sem reescrever o nucleo de governanca.

## Non-Goals

1. Implementar modulo completo de orcamento fixo na Fase 1.
2. Integrar custos variaveis por utilizacao com legado na Fase 1.
3. Colocar Aviation, Real Estate e Cars em producao na Fase 1.
4. Construir analytics avancado cross-modal na Fase 1.
5. Criar um modelo definitivo de alcadas financeiras finais para terceiros na Fase 1.

## User Stories

### Persona: Operacao Central

- As a central operations user, I want global visibility of all yacht assets and events so that I can orchestrate conflicts and priorities quickly.
- As a central operations user, I want to validate emergency technical blocks within SLA so that safety is preserved with governance control.
- As a central operations user, I want to perform critical overrides so that operational accountability is auditable.

### Persona: Yachts Operations

- As a yachts operations user, I want to create and manage agenda events across all yacht assets so that daily scheduling is efficient.
- As a yachts operations user, I want to create and view maintenance tickets across all yacht assets so that I have full operational visibility within the modal.

### Persona: Coordenacao Tecnica Yachts

- As a yachts technical coordinator, I want to triage and classify maintenance tickets so that execution strategy is technically correct.
- As a yachts technical coordinator, I want to apply provisional technical blocks immediately in emergencies so that unsafe utilization is prevented.
- As a yachts technical coordinator, I want to technically release an asset after service quality checks so that agenda usage can safely resume.

### Persona: Equipe de Campo por Ativo

- As an asset field team member, I want to create and update tickets only for my asset so that operational ownership is clear.
- As an asset field team member, I want to create agenda events for my asset under policy rules so that daily operation is efficient.
- As an asset field team member, I want clear status and required evidence by phase so that I can close work correctly.

### Persona: Admin do Portal

- As a portal admin, I want to manage structural registries and global configuration safely so that platform integrity is preserved.
- As a portal admin, I want to enforce access scope and track MFA state for critical roles so that security posture meets governance requirements.
- As a portal admin, I want migration validation gates before cutover so that go-live risk is controlled.

## Requirements

### Must-Have (P0)

#### P0-R1 - Access Control and Security Baseline
- Requirement:
- O sistema usa bridge login com email/senha e guarda estado de MFA na sessao e no cadastro de acessos para perfis criticos.
- Nao ha desafio MFA dedicado no fluxo de login da fase 1.
- O sistema deve operar com permissao por `tenant + ativo + papel`.
- Politica de autorizacao deve ser deny-by-default.
- Roles do sistema: `portal_admin`, `central_operations`, `yachts_operations`, `yachts_technical_coordination`, `asset_field_team`.
  - `yachts_operations`: escopo cross-asset dentro do modal Yachts; acesso a agenda (create/update/delete) e manutencao (search/read/create); nao pode aplicar bloqueio provisorio.
  - `asset_field_team`: escopo restrito ao(s) ativo(s) designado(s); pode fazer transicao de status de chamados dentro do seu ativo.
- Acceptance:
- [ ] Given um usuario sem escopo valido, when tenta acao operacional, then acao e negada e auditada.
- [ ] Given um papel critico sem `mfaEnabled`, when admin tenta salvar o cadastro de acesso, then a atribuicao e bloqueada.
- [ ] Given revogacao critica, when executada, then acesso deve ser removido em ate 15 minutos.

#### P0-R2 - Agenda Unica sem Sobreposicao por Ativo
- Requirement:
- O sistema deve impedir sobreposicao de eventos para o mesmo ativo.
- Conflitos concorrentes devem ser resolvidos por consistencia forte no momento de confirmacao.
- Acceptance:
- [ ] Given dois eventos no mesmo ativo e janela, when segundo tenta confirmar, then sistema bloqueia com erro de conflito.
- [ ] Given conflito comum, when escalado, then operacao central pode decidir override com justificativa.

#### P0-R3 - Tipos e Prioridade de Evento de Agenda
- Requirement:
- Tipos permitidos: Utilizacao, Manutencao planejada, Manutencao emergencial, Bloqueio operacional, Folga da tripulacao.
- Ordem de prioridade operacional deve seguir regra definida.
- Acceptance:
- [ ] Given eventos concorrentes, when avaliados, then priorizacao aplica a ordem oficial.
- [ ] Given folga de tripulacao, when escala fica abaixo do minimo seguro, then bloqueio deve prevalecer.

#### P0-R4 - Fluxo Macro de Manutencao
- Requirement:
- Status obrigatorios: Pendente, Em andamento, Congelado, Pagamento, Concluido, Cancelado, Reaberto.
- Subetapas de Em andamento devem ser rastreadas.
- Acceptance:
- [ ] Given ticket novo, when criado, then inicia em Pendente com campos obrigatorios.
- [ ] Given tentativa de transicao invalida, when executada, then sistema bloqueia com motivo.
- [ ] Given ticket Cancelado ou Reaberto, when executado, then justificativa obrigatoria e registrada.

#### P0-R5 - Bloqueio Tecnico Provisorio Emergencial
- Requirement:
- Coordenacao tecnica pode aplicar bloqueio tecnico provisorio imediato.
- Operacao central deve validar em ate 24h.
- Acceptance:
- [ ] Given bloqueio provisorio, when 24h atingidas sem validacao, then sistema marca breach e escala para lideranca.
- [ ] Given ativo bloqueado emergencialmente, when sem validacao central, then utilizacao nao pode ser liberada.

#### P0-R6 - Governance de Congelado e SLA
- Requirement:
- SLA pausa apenas com motivo valido de congelamento.
- Maximo de 2 congelamentos sem escalonamento automatico.
- Acceptance:
- [ ] Given ticket congelado sem motivo valido, when tentativa de salvar, then sistema bloqueia.
- [ ] Given terceiro congelamento, when solicitado, then escalonamento automatico ocorre.

#### P0-R7 - Evidencias Obrigatorias por Fase
- Requirement:
- Em andamento requer evidencia diagnostica.
- Pagamento requer documento financeiro minimo.
- Concluido requer evidencia final e evidencia de qualidade/liberacao tecnica.
- Acceptance:
- [ ] Given ausencia de evidencia obrigatoria, when transicao de fase e tentada, then sistema bloqueia.

#### P0-R8 - Auditoria e Imutabilidade
- Requirement:
- Acoes criticas exigem justificativa estruturada.
- Registros concluidos sao imutaveis; correcao so por retificacao versionada.
- Mini-atas criticas sao imutaveis apos confirmacao.
- Acceptance:
- [ ] Given acao critica sem justificativa, when submetida, then sistema bloqueia.
- [ ] Given registro concluido, when tentativa de edicao direta ocorre, then sistema bloqueia e oferece fluxo de retificacao.

#### P0-R9 - Migracao e Cutover Gates
- Requirement:
- Migrar 100% da base historica de manutencao de Yachts.
- Migrar agenda futura minima de 90 dias.
- Exigir freeze final no antigo antes da extracao final.
- Go-live apenas com gates aprovados por operacao central, coordenacao tecnica e admin.
- Portal antigo fica read-only apos cutover.
- Acceptance:
- [ ] Given contagem de entidades divergente, when gate e executado, then go-live bloqueado.
- [ ] Given anexo critico invalido, when gate e executado, then go-live bloqueado.
- [ ] Given cutover aprovado, when concluido, then escrita no portal antigo e proibida.

#### P0-R10 - Notificacoes e Escalonamentos de SLA
- Requirement:
- Alertas em 75%, 90% e 100% do SLA.
- Eventos criticos com notificacao imediata para operacao central.
- Acceptance:
- [ ] Given ticket/decisao em risco de SLA, when 75% atingido, then alerta ao responsavel direto.
- [ ] Given 90% atingido, when alerta dispara, then operacao central tambem e notificada.
- [ ] Given 100% atingido, when SLA estoura, then incidente de governanca e aberto.

#### P0-R11 - Observabilidade Minima
- Requirement:
- Logs estruturados com correlation_id.
- Metricas de dominio (SLA, conflitos, P1 vencido, falhas de autorizacao).
- Health checks reais de API e DB; fila e storage aparecem como indicadores preparados para integracao futura, ainda sem probe dedicado.
- Acceptance:
- [ ] Given falha em API ou DB, when health check falha, then alerta acionavel e emitido.
- [ ] Given queue ou storage ainda nao configurados, when health check e avaliado, then o estado informativo e retornado.
- [ ] Given fluxo critico, when executado, then eventos essenciais estao rastreaveis.

### Nice-to-Have (P1)

#### P1-R1 - Dashboard Operacional Basico
- Requirement:
- Painel consolidado de backlog, SLA, conflitos e disponibilidade por ativo.
- Acceptance:
- [ ] Dashboard exibe metricas basicas atualizadas com granularidade operacional.

#### P1-R2 - Fila de Saneamento de Historico
- Requirement:
- Registros migrados com lacuna devem ser rotulados e entrar em fila de saneamento por risco.
- Acceptance:
- [ ] Registros com lacuna sao identificados e priorizaveis.

#### P1-R3 - Revisao Periodica de Acessos
- Requirement:
- Revisao mensal para perfis criticos e trimestral para demais.
- Acceptance:
- [ ] Sistema gera relatorio de revisao com aprovacao e revogacao registradas.

### Future Considerations (P2)

#### P2-R1 - Integracao de Custos Variaveis
- Requirement:
- Definir origem, ownership e frequencia de ingestao de custos variaveis por utilizacao.
- Acceptance:
- [ ] Documento de decisao aprovado com modelo de sincronizacao e governanca.

#### P2-R2 - Modulo de Orcamento Fixo
- Requirement:
- Planejamento e acompanhamento de budget por ativo e centro de custo.
- Acceptance:
- [ ] Fluxo de previsao vs realizado com trilha de aprovacao.

#### P2-R3 - Evolucao Cross-Modal
- Requirement:
- Reuso do nucleo de governanca para Aviation com state machine propria OCC/dispatch.
- Acceptance:
- [ ] Especificacao de Aviation aprovada com diferencas e invariantes documentados.

### Won't-Have (Now)

- Integracao realtime obrigatoria com sistemas financeiros externos no go-live de Yachts.
- Release de Real Estate e Cars na mesma janela de Fase 1.
- Automacao avancada de analytics preditivo cross-modal na Fase 1.

## Success Metrics

### Leading Indicators (dias a semanas)

- Adocao de criacao de chamados no novo portal: meta `100%` desde o go-live.
- Conflitos de agenda resolvidos em SLA 72h: meta `100%`.
- Validacoes emergenciais em SLA 24h: meta `>=95%`.
- Chamados concluidos com evidencias completas: meta `>=98%`.
- Incidentes criticos sem mini-ata: meta `0`.

### Lagging Indicators (semanas a meses)

- Chamados P1 vencidos: meta `0`.
- Reducao de divergencia operacional entre times: meta `nenhuma divergencia critica apos cutover`.
- Estabilidade para fase seguinte: 2 ciclos semanais consecutivos sem incidente critico de governanca/SLA.
- Prontidao para Aviation: aprovacao formal de licoes aprendidas apos estabilizacao Yachts.

## Open Questions

1. Qual modelo permanente de alcada para terceiros apos politica temporaria da Fase 1?
- Owner: `Operacao Central + Coordenacao Tecnica + Financeiro`
2. Qual estrategia de custos variaveis (ownership, fonte e frequencia)?
- Owner: `Operacao Central + Produto + Engenharia`
3. Quais limites numericos de capacidade por ativo/equipe para bloquear "Em andamento"?
- Owner: `Operacao Central + Coordenacao Tecnica`
4. Qual dicionario final de subetapas para Aviation (OCC/dispatch)?
- Owner: `Operacao Aviation + Produto`
5. Qual publico e cadencia oficial do dashboard executivo?
- Owner: `Lideranca Operacional + Produto`

## Timeline Considerations

### Phase A - Readiness and Governance Freeze

- Fechar matriz de permissao por acao.
- Fechar modelo de justificativa estruturada e mini-ata.
- Fechar checklist de gate de migracao e cutover.

### Phase B - Migration and Dry Run

- Executar pelo menos um dry run completo de cutover.
- Validar contagens, anexos criticos, comportamento de agenda e perfis.
- Corrigir gaps bloqueadores antes da janela real.

### Phase C - Production Cutover (Yachts)

- Aplicar freeze final no portal antigo.
- Executar migracao final e ativar novo portal como fonte unica.
- Colocar portal antigo em read-only.

### Phase D - Stabilization (First 60 Days)

- Acompanhar metricas leading/lagging e SLAs.
- Tratar backlog de saneamento de historico por risco.
- Formalizar licoes aprendidas e gate para inicio de Aviation.

## Addendum v1 - Execution and Go-Live Governance

Addendum date: 2026-05-13  
Source: `grill-me` execution cycle (10 decisions approved)

### E1 - Final Go/No-Go Authority

- Go-live committee:
  - Operacao Central
  - Coordenacao Tecnica Yachts
  - Admin do Portal
- Rule: unanimidade obrigatoria.
- Sem unanimidade: `no-go` automatico.

### E2 - Cutover Window Policy

- Cutover em janela de menor criticidade operacional.
- Freeze previo de 12h.
- Comunicacao formal para perfis impactados.
- Ponte de comando ativa com checkpoints:
  - T+1h
  - T+4h
  - T+24h

### E3 - Platform Incident Command (First 72h)

- Incident commander tecnico de plataforma: `Admin do Portal`.
- Operacao Central: owner de impacto operacional.
- Coordenacao Tecnica: owner de impacto tecnico-operacional no ativo.
- Rito de atualizacao: a cada 30 minutos ate normalizacao.

### E4 - Hotfix Policy During Stabilization

- Primeiros 60 dias:
  - somente deploy por pipeline controlado.
  - aprovacao dupla para mudancas com impacto operacional:
    - Admin do Portal
    - Operacao Central
- Excecao P1:
  - hotfix emergencial permitido com mini-ata obrigatoria.
  - postmortem em ate 24h.

### E5 - Bug Severity and Response SLA

- Severidade:
  - S1 Critico
  - S2 Alto
  - S3 Medio
  - S4 Baixo
- SLA de resposta inicial:
  - S1: 15 min
  - S2: 1h
  - S3: 8h uteis
  - S4: proximo ciclo planejado

### E6 - Data Reconciliation After System Incident

- Prazo maximo de reconciliacao de dados impactados: `24h`.
- Fechamento requer:
  - relatorio de impacto por ativo/chamado
  - validacao conjunta (Operacao Central + Coordenacao Tecnica)
  - mini-ata de fechamento

### E7 - Executive Escalation Triggers

Comunicacao imediata para diretoria quando ocorrer:
- incidente S1
- risco de descumprimento de SLA critico em massa
- indisponibilidade superior a 30 minutos
- falha de permissao com potencial exposicao de dados sensiveis

### E8 - Feature Freeze After Go-Live

- Freeze de novas features por 30 dias apos go-live.
- Permitido nesse periodo:
  - correcoes S1/S2
  - ajustes de compliance/seguranca
  - ajustes estritamente necessarios para manter SLA operacional

### E9 - User Readiness Gate

- Prontidao minima por perfil critico: `100%`.
- Sem 100% dos perfis criticos treinados/simulados: `no-go`.
- Perfis e simulacoes obrigatorias:
  - Operacao Central (conflito + override)
  - Coordenacao Tecnica (emergencia + liberacao tecnica)
  - Equipe por ativo (create/update/close com evidencias)
  - Admin (gates, cutover, contingencia)

### E10 - Single Reference Rule

- Este addendum passa a compor a referencia oficial de execucao/go-live da Fase 1.
- Mudancas futuras nessas regras exigem atualizacao coordenada da SPEC e artefatos vinculados.
