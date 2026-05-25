import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('security page ui', () => {
  it('renders the 2fa setup and management copy', () => {
    const pageSource = readFileSync(resolve(__dirname, '../app/security/page.tsx'), 'utf8');
    const panelSource = readFileSync(
      resolve(__dirname, '../app/security/two-factor-security-panel.tsx'),
      'utf8'
    );
    const shellSource = readFileSync(resolve(__dirname, '../components/portal-shell.tsx'), 'utf8');

    expect(pageSource).toContain('TwoFactorSecurityPanel');
    expect(pageSource).toContain('Better Auth');
    expect(shellSource).toContain('href="/security"');
    expect(shellSource).toContain('settings-panel__link');
    expect(panelSource).toContain('Gerar QR code');
    expect(panelSource).toContain('Confirmar 2FA');
    expect(panelSource).toContain('Gerar novos backup codes');
    expect(panelSource).toContain('Desativar 2FA');
    expect(panelSource).toContain('react-qr-code');
    expect(panelSource).toContain('authClient.twoFactor.enable');
    expect(panelSource).toContain('authClient.twoFactor.disable');
    expect(panelSource).toContain('authClient.twoFactor.generateBackupCodes');
  });
});
