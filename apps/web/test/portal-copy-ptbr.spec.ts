import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('portal copy pt-BR', () => {
  it('does not expose the main portal shell and page copy in English', () => {
    const fileAssertions = [
      {
        file: '../app/layout.tsx',
        forbidden: ['Operations Portal', 'Phase 1 Yachts operational control center'],
        required: ['Portal de Operações']
      },
      {
        file: '../lib/portal-data.ts',
        forbidden: [
          'Operations Portal',
          'Phase 1 Yachts',
          '24/7 orchestration active',
          "Dashboard', icon",
          "Maintenance', icon",
          "Audit & Governance', icon",
          "Access & Admin', icon",
          "Governance' }",
          "Phase 1' }"
        ],
        required: ['Portal de Operações']
      },
      {
        file: '../components/portal-shell.tsx',
        forbidden: [
          'Enterprise orchestration',
          'yachts command center',
          'MFA ok',
          'Orquestração operacional',
          'Orquestração ativa 24/7',
          'Fase 1 Yachts'
        ],
        required: ['Portal de Operações']
      },
      {
        file: '../app/(portal)/dashboard/page.tsx',
        forbidden: [
          'Fleet command center',
          'Safety first, utilization second.',
          'Queues requiring action',
          'Asset availability',
          'Live operational state',
          'Maintenance backlog',
          'Phase 1 lifecycle',
          'Critical tickets',
          'Audit & decision feed',
          'Immutable trail',
          'Operational notes',
          'This frontend slice',
          'Backend-aligned vocabulary',
          'API snapshot active',
          'Mock snapshot active'
        ],
        required: ['Painel operacional']
      },
      {
        file: '../app/(portal)/agenda/page.tsx',
        forbidden: [
          'Single agenda per asset',
          'Agenda orchestration',
          'Conflict SLA: 72h',
          'Agenda by asset',
          'Conflict queue',
          'Orquestração da agenda'
        ],
        required: ['title="Agenda"']
      },
      {
        file: '../app/(portal)/access/page.tsx',
        forbidden: [
          'Tenant + asset + role',
          'Governance rules',
          'Locatário + ativo + papel',
          'Provisionar ou atualizar acesso',
          'Revogação operacional',
          'Resumo de conformidade',
          'Regras de governança'
        ],
        required: ['Acessos e administração']
      },
      {
        file: '../app/(portal)/audit-governance/page.tsx',
        forbidden: [
          'Governance pulse',
          'Governance rules',
          'Critical action ledger',
          'Governance table'
        ],
        required: ['Pulso de governança']
      },
      {
        file: '../app/(portal)/cutover/page.tsx',
        forbidden: ['Cutover control'],
        required: ['Controle de cutover']
      }
    ] as const;

    for (const assertion of fileAssertions) {
      const source = readFileSync(resolve(__dirname, assertion.file), 'utf8');

      for (const text of assertion.forbidden) {
        expect(source, `${assertion.file} should not contain ${text}`).not.toContain(text);
      }

      for (const text of assertion.required) {
        expect(source, `${assertion.file} should contain ${text}`).toContain(text);
      }
    }
  });
});
