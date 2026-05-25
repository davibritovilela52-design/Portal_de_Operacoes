import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('two-factor page ui', () => {
  it('renders the two-factor challenge copy and keeps the flow centered', () => {
    const pageSource = readFileSync(resolve(__dirname, '../app/2fa/page.tsx'), 'utf8');
    const challengeSource = readFileSync(
      resolve(__dirname, '../app/2fa/two-factor-challenge.tsx'),
      'utf8'
    );

    expect(pageSource).toContain('Verificação em duas etapas');
    expect(pageSource).toContain('auth-page auth-page--centered');
    expect(challengeSource).toContain('Código do autenticador');
    expect(challengeSource).toContain('Código de backup');
    expect(challengeSource).toContain('authClient.twoFactor.verifyTotp');
    expect(challengeSource).toContain('authClient.twoFactor.verifyBackupCode');
    expect(challengeSource).toContain('Confiar neste dispositivo por 30 dias');
  });
});
