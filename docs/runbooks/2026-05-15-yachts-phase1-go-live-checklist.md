# Deploy Checklist: Yachts Phase 1
**Date:** 2026-05-15 | **Scope:** maintenance + agenda + access + cutover

## Pre-Deploy
- [ ] `npm run test --workspace @ops-portal/api`
- [ ] `npm run build --workspace @ops-portal/api`
- [ ] `npm run test --workspace @ops-portal/web`
- [ ] `npm run build --workspace @ops-portal/web`
- [ ] `npx prisma migrate status --schema apps/api/prisma/schema.prisma`
- [ ] `npm run uat:phase1:check` if the final validation is running on the local operator machine
- [ ] `npm run readiness:phase1`
- [ ] Confirmar `657` chamados Yachts importados no tenant alvo
- [ ] Confirmar `270` eventos de agenda importados no tenant alvo
- [ ] Confirmar `7` ativos Yachts ativos no `asset-registry`
- [ ] Configurar `OPS_PORTAL_API_BASE_URL` e `OPS_PORTAL_TENANT_ID` no frontend
- [ ] Cadastrar os acessos reais de operacao central, coordenacao tecnica e equipes por ativo
- [ ] Validar backup pre-cutover e relatorio de migracao em `.tmp`

## Deploy
- [ ] Aplicar migrations no banco alvo
- [ ] Subir API
- [ ] Subir frontend
- [ ] Rodar `npm run smoke:phase1`
- [ ] Navegar em `/dashboard`, `/maintenance`, `/agenda` e `/access`
- [ ] Validar abertura de chamado, transicao de status e reagendamento de agenda

## Post-Deploy
- [ ] Validar que o dashboard mostra `API snapshot active`
- [ ] Validar que a agenda nao mostra `yacht-unknown` nem datas `1970`
- [ ] Validar que manutencao nao mostra placeholders de demo
- [ ] Validar que a contagem de usuarios ativos exclui assignments revogados
- [ ] Executar o roteiro em `docs/runbooks/2026-05-15-yachts-phase1-uat.md`
- [ ] Confirmar com operacao central o aceite operacional do go-live

## Rollback Triggers
- Dashboard volta para `Mock snapshot active`
- Endpoints `maintenance`, `agenda`, `access` ou `asset-registry` retornam `500`
- Contagem migrada diverge de `657` manutencoes ou `270` eventos
- Agenda apresenta conflito inexistente ou ativo sem identificacao
- Frontend perde leitura do tenant `prime-you`

## Notes
- O portal antigo nao entra mais como canal principal no go-live. O corte aprovado e iniciar a operacao somente no novo portal, apos confirmacao total da migracao.
- O comando de smoke usa `http://127.0.0.1:3000` por padrao e pode ser sobrescrito via `OPS_PORTAL_WEB_URL`.
