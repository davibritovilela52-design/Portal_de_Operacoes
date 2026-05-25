import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('login page ui', () => {
  it('keeps the authentication screen centered and removes role, MFA and explanatory copy', () => {
    const pageSource = readFileSync(
      resolve(__dirname, '../app/login/page.tsx'),
      'utf8'
    );
    const globalsSource = readFileSync(
      resolve(__dirname, '../app/globals.css'),
      'utf8'
    );

    expect(pageSource).not.toContain('Orquestra');
    expect(pageSource).not.toContain('Portal de Opera');
    expect(pageSource).not.toContain('Login transit');
    expect(pageSource).not.toContain('Sessão assinada + MFA');
    expect(pageSource).not.toContain('fase transit');
    expect(pageSource).not.toContain('name="role"');
    expect(pageSource).not.toContain('name="mfaCode"');
    expect(pageSource).not.toContain('Desafio MFA');
    expect(pageSource).not.toContain('Papel');
    expect(pageSource).toContain('name="email"');
    expect(pageSource).toContain('name="password"');
    expect(pageSource).toContain('Criar conta');
    expect(pageSource).toContain('Esqueci minha senha');
    expect(pageSource).toContain('auth-page auth-page--centered');
    expect(globalsSource).toContain('.auth-page--centered');
    expect(globalsSource).toContain('place-items: center;');
  });
});
