import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('phase 1 go-live smoke assets', () => {
  it('defines coverage for the operational pages and legacy-data regressions', async () => {
    const smokeModulePath = resolve(
      __dirname,
      '../../../scripts/phase1-go-live-smoke.mjs'
    );
    const smokeModule = await import(smokeModulePath);

    expect(smokeModule.phase1SmokeTargets).toEqual([
      expect.objectContaining({
        path: '/dashboard',
        mustContain: expect.arrayContaining([
          'Painel operacional',
          'Ativos totais',
          'Eventos totais',
          'Chamados abertos',
          'Mondebleu'
        ])
      }),
      expect.objectContaining({
        path: '/maintenance',
        mustContain: expect.arrayContaining([
          'Abrir novo chamado',
          'Arraste os cards entre substatus ou use a rolagem lateral do quadro',
          'Sapphire'
        ]),
        mustNotContain: expect.arrayContaining([
          'field-yacht-001',
          'Resumo dos macrostatus',
          'Regras operacionais de escrita'
        ])
      }),
      expect.objectContaining({
        path: '/agenda',
        mustContain: expect.arrayContaining(['Mondebleu']),
        mustNotContain: expect.arrayContaining(['yacht-unknown', '1970'])
      }),
      expect.objectContaining({
        path: '/access',
        mustContain: expect.arrayContaining([
          'Acessos e administração',
          'Cadastrar acesso',
          'Acessos atuais',
          'D. Vecchi'
        ]),
        mustNotContain: expect.arrayContaining([
          'Diretório de acessos',
          'Provisionar ou atualizar acesso',
          'Revogação operacional'
        ])
      }),
      expect.objectContaining({
        path: '/audit-governance',
        mustContain: expect.arrayContaining([
          'Registrar mini-ata',
          'Abrir retifica\u00e7\u00e3o'
        ])
      }),
      expect.objectContaining({
        path: '/cutover',
        mustContain: expect.arrayContaining([
          'Controle de cutover',
          'Registrar checkpoint',
          'Checkpoints e decis\u00e3o'
        ])
      })
    ]);
  });

  it('documents the frontend runtime variables required for api-backed rendering', () => {
    const envExampleSource = readFileSync(
      resolve(__dirname, '../.env.example'),
      'utf8'
    );

    expect(envExampleSource).toContain('OPS_PORTAL_API_BASE_URL=http://127.0.0.1:3001/v1');
    expect(envExampleSource).toContain('OPS_PORTAL_TENANT_ID=prime-you');
    expect(envExampleSource).toContain('OPS_PORTAL_SESSION_SECRET=ops-portal-dev-session-secret');
    expect(envExampleSource).toContain('OPS_PORTAL_BRIDGE_PASSWORD=ops-portal-bridge-secret');
    expect(envExampleSource).toContain('OPS_PORTAL_SMOKE_EMAIL=dvecchi@primeyou.com.br');
    expect(envExampleSource).not.toContain('OPS_PORTAL_SMOKE_ROLE=');
    expect(envExampleSource).not.toContain('OPS_PORTAL_BRIDGE_MFA_CODE=');
  });
});

