'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';

import { logoutAction } from '../app/login/actions';
import { navigationItems, portalContext, topbarTabs } from '../lib/portal-data';
import { canViewAccessModule, type PortalRole } from '../lib/portal-model';
import { PortalIcon } from './icons';

type PortalShellProps = {
  children: ReactNode;
  session: {
    displayName: string;
    email: string;
    role: PortalRole;
    roleLabel: string;
    mfaVerified: boolean;
  };
};

const SIDEBAR_COLLAPSE_STORAGE_KEY = 'ops-portal-sidebar-collapsed';
const THEME_STORAGE_KEY = 'ops-portal-theme';

export function PortalShell({ children, session }: PortalShellProps) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const settingsButtonMeta = session.displayName.trim() || session.email;

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY);
    setSidebarCollapsed(stored === '1');
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSE_STORAGE_KEY, sidebarCollapsed ? '1' : '0');
  }, [sidebarCollapsed]);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const resolvedTheme = storedTheme === 'light' ? 'light' : 'dark';

    setTheme(resolvedTheme);
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
  }, []);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    if (sidebarCollapsed) {
      setSettingsOpen(false);
    }
  }, [sidebarCollapsed]);

  const toggleSidebar = () => {
    setSidebarCollapsed((previous) => !previous);
  };

  const toggleSettings = () => {
    setSettingsOpen((previous) => !previous);
  };

  const toggleTheme = () => {
    setTheme((previous) => (previous === 'dark' ? 'light' : 'dark'));
  };

  const navigateTo = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    event.preventDefault();
    window.location.assign(href);
  };

  const canViewAccess = canViewAccessModule(session.role);
  const activeModule = pathname.startsWith('/aviation') ? 'aviation' : 'yachts';
  const visibleNavigationItems = navigationItems.filter((item) => {
    if (!canViewAccess && item.href === '/access') return false;
    if (item.module && item.module !== activeModule) return false;
    return true;
  });

  const isTopbarTabActive = (href: string) => {
    switch (href) {
      case '/dashboard':
        return (
          pathname === '/dashboard' ||
          pathname.startsWith('/agenda') ||
          pathname.startsWith('/maintenance') ||
          pathname.startsWith('/improvements')
        );
      case '/aviation':
        return pathname === '/aviation' || pathname.startsWith('/aviation/');
      case '/audit-governance':
        return pathname === '/audit-governance' || pathname.startsWith('/access');
      case '/cutover':
        return pathname === '/cutover';
      default:
        return pathname === href || pathname.startsWith(`${href}/`);
    }
  };

  return (
    <div className={sidebarCollapsed ? 'app-shell app-shell--sidebar-collapsed' : 'app-shell'}>
      <aside className="app-sidebar">
        <div className="brand-block">
          <button
            type="button"
            className="sidebar-toggle"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
            aria-pressed={sidebarCollapsed}
          >
            <span aria-hidden="true">{sidebarCollapsed ? '>' : '<'}</span>
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Primary">
          {visibleNavigationItems.map((item) => {
            const exactMatch = item.href === '/dashboard' || item.href === '/aviation';
            const active = exactMatch
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <a
                key={item.href}
                href={item.href}
                className={active ? 'nav-link nav-link--active' : 'nav-link'}
                onClick={(event) => navigateTo(event, item.href)}
              >
                <PortalIcon name={item.icon} width={18} height={18} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
            className={settingsOpen ? 'settings-trigger settings-trigger--open' : 'settings-trigger'}
            onClick={toggleSettings}
            aria-expanded={settingsOpen}
            aria-controls="settings-panel"
          >
            <span className="settings-trigger__label">
              <span className="settings-trigger__icon" aria-hidden="true">
                <PortalIcon name="settings" width={16} height={16} />
              </span>
              <span className="settings-trigger__content">
                <span id="settings-trigger-title">Configurações</span>
                <span className="settings-trigger__meta">{settingsButtonMeta}</span>
              </span>
            </span>
            <span className="settings-trigger__state" aria-hidden="true">
              ▾
            </span>
          </button>
          {settingsOpen ? (
            <section className="settings-panel" id="settings-panel" aria-labelledby="settings-trigger-title">
              <div className="settings-panel__identity">
                <span className="settings-panel__eyebrow">Conta ativa</span>
                <strong>{session.displayName}</strong>
                <span>{session.roleLabel}</span>
              </div>
              <div className="settings-panel__meta">{session.email}</div>
              <a href="/security" className="topbar-button settings-panel__link" onClick={(event) => navigateTo(event, '/security')}>
                <span>Segurança da conta</span>
              </a>
              <form action={logoutAction} className="settings-panel__logout">
                <button className="topbar-button" type="submit">
                  <span>Sair</span>
                </button>
              </form>
            </section>
          ) : null}
        </div>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <div className="topbar__identity">
            {sidebarCollapsed ? (
              <button
                type="button"
                className="sidebar-toggle sidebar-toggle--topbar"
                onClick={toggleSidebar}
                aria-label="Expandir barra lateral"
              >
                <span aria-hidden="true">{'>'}</span>
              </button>
            ) : null}
            <div>
              <div className="topbar__title">Portal de Operações</div>
              <div className="topbar__subtitle">{portalContext.tenantLabel}</div>
            </div>
          </div>
          <div className="topbar__actions">
            <button
              type="button"
              className="topbar-button topbar-button--quiet theme-toggle"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
              title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            >
              <PortalIcon name={theme === 'dark' ? 'sun' : 'moon'} width={18} height={18} />
              <span className="sr-only">{theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}</span>
            </button>
            <div className="topbar__tabs">
              {topbarTabs.map((item) => {
                const active = isTopbarTabActive(item.href);

                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={active ? 'tab tab--active' : 'tab'}
                    aria-current={active ? 'page' : undefined}
                    onClick={(event) => navigateTo(event, item.href)}
                  >
                    {item.label}
                  </a>
                );
              })}
            </div>
          </div>
        </header>

        <div className="page-scroll">{children}</div>
      </div>
    </div>
  );
}
