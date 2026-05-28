import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('portal shell navigation', () => {
  it('excludes governance and cutover from sidebar navigation', async () => {
    const portalDataModule = await import('../lib/portal-data');

    expect(portalDataModule.navigationItems.map((item) => item.href)).toEqual([
      '/dashboard',
      '/agenda',
      '/maintenance',
      '/aviation',
      '/improvements',
      '/access'
    ]);
  });

  it('defines topbar tabs with navigation for yachts and aviation', async () => {
    const portalDataModule = await import('../lib/portal-data');

    expect(portalDataModule.topbarTabs).toEqual([
      { href: '/dashboard', label: 'Yachts' },
      { href: '/aviation', label: 'Aviation' }
    ]);
  });

  it('renders shell navigation as plain anchors with href', () => {
    const shellSource = readFileSync(
      resolve(__dirname, '../components/portal-shell.tsx'),
      'utf8'
    );

    expect(shellSource).toContain('topbarTabs.map');
    expect(shellSource).toContain('href={item.href}');
    expect(shellSource).not.toContain("import Link from 'next/link'");
    expect(shellSource).toContain('<a');
    expect(shellSource).toContain('window.location.assign(href)');
    expect(shellSource).toContain('onClick={(event) => navigateTo(event, item.href)}');
  });

  it('keeps the sidebar above wide main-content overflow so nav clicks stay reachable', () => {
    const globalsSource = readFileSync(
      resolve(__dirname, '../app/globals.css'),
      'utf8'
    );

    expect(globalsSource).toContain('.app-sidebar');
    expect(globalsSource).toContain('z-index: 20;');
    expect(globalsSource).toContain('.shell-main');
    expect(globalsSource).toContain('overflow-x: clip;');
  });

  it('removes support quick-link from sidebar footer', () => {
    const shellSource = readFileSync(
      resolve(__dirname, '../components/portal-shell.tsx'),
      'utf8'
    );

    expect(shellSource).not.toContain('href="#support"');
    expect(shellSource).not.toContain('<span>Suporte</span>');
    expect(shellSource).not.toContain('name="support"');
  });

  it('supports collapsing and expanding the sidebar', () => {
    const shellSource = readFileSync(
      resolve(__dirname, '../components/portal-shell.tsx'),
      'utf8'
    );
    const globalsSource = readFileSync(
      resolve(__dirname, '../app/globals.css'),
      'utf8'
    );

    expect(shellSource).toContain('useEffect');
    expect(shellSource).toContain('useState');
    expect(shellSource).toContain('sidebar-toggle');
    expect(shellSource).toContain('app-shell--sidebar-collapsed');
    expect(shellSource).toContain('ops-portal-sidebar-collapsed');
    expect(globalsSource).toContain('.app-shell--sidebar-collapsed');
    expect(globalsSource).toContain('.sidebar-toggle');
  });

  it('shows access navigation for roles that can view the access module', () => {
    const shellSource = readFileSync(
      resolve(__dirname, '../components/portal-shell.tsx'),
      'utf8'
    );

    expect(shellSource).toContain('canViewAccessModule(session.role)');
    expect(shellSource).not.toContain('canManageAccessModule(session.role)');
    expect(shellSource).toContain("item.href === '/access'");
  });

  it('does not render sidebar title text Portal de Operações', () => {
    const shellSource = readFileSync(
      resolve(__dirname, '../components/portal-shell.tsx'),
      'utf8'
    );

    expect(shellSource).not.toContain('<h1>{portalContext.brand}</h1>');
  });

  it('submits logout through the server action instead of navigating to the broken logout page', () => {
    const shellSource = readFileSync(
      resolve(__dirname, '../components/portal-shell.tsx'),
      'utf8'
    );

    expect(shellSource).toContain('logoutAction');
    expect(shellSource).toContain('<form action={logoutAction} className="settings-panel__logout">');
    expect(shellSource).not.toContain('href="/logout"');
  });

  it('reveals the current user identity only when the settings trigger is opened', () => {
    const shellSource = readFileSync(
      resolve(__dirname, '../components/portal-shell.tsx'),
      'utf8'
    );
    const globalsSource = readFileSync(
      resolve(__dirname, '../app/globals.css'),
      'utf8'
    );

    expect(shellSource).toContain('const [settingsOpen, setSettingsOpen] = useState(false);');
    expect(shellSource).toContain('aria-expanded={settingsOpen}');
    expect(shellSource).toContain('aria-controls="settings-panel"');
    expect(shellSource).toContain("settingsOpen ? 'settings-trigger settings-trigger--open' : 'settings-trigger'");
    expect(shellSource).toContain('settingsOpen ? (');
    expect(shellSource).toContain('className="settings-trigger__label"');
    expect(shellSource).toContain('settings-panel__identity');
    expect(shellSource).toContain('settings-panel__eyebrow');
    expect(shellSource).toContain('href="/security"');
    expect(shellSource).toContain('Segurança da conta');
    expect(shellSource).toContain('{session.roleLabel}');
    expect(shellSource).toContain('{session.displayName}');
    expect(shellSource).toContain('{session.email}');
    expect(shellSource).not.toContain('session-summary');
    expect(globalsSource).toContain('.settings-trigger');
    expect(globalsSource).toContain('.settings-trigger--open');
    expect(globalsSource).toContain('.settings-panel');
    expect(globalsSource).toContain('.settings-panel__eyebrow');
    expect(globalsSource).toContain('.settings-panel__meta');
    expect(globalsSource).toContain('.settings-panel__identity');
    expect(globalsSource).toContain('.settings-panel__logout');
  });

  it('keeps the topbar subtitle without the fixed operação Yachts suffix', () => {
    const shellSource = readFileSync(
      resolve(__dirname, '../components/portal-shell.tsx'),
      'utf8'
    );

    expect(shellSource).toContain('topbar__subtitle');
    expect(shellSource).not.toContain('operação Yachts');
  });
});
