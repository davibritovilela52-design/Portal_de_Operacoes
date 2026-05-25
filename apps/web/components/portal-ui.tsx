import type { ReactNode } from 'react';

import { PortalIcon, type PortalIconName } from './icons';

type PanelProps = {
  children: ReactNode;
  className?: string;
  tone?: 'default' | 'critical' | 'highlight';
};

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

type KpiCardProps = {
  label: string;
  value: string;
  hint: string;
  tone?: 'default' | 'critical' | 'success' | 'accent';
  icon?: PortalIconName;
};

type BadgeProps = {
  label: string;
  tone?: 'default' | 'critical' | 'warning' | 'success' | 'accent';
};

type ProgressBarProps = {
  value: number;
  tone?: 'default' | 'critical' | 'warning' | 'success' | 'accent';
};

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div>
        {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}

export function Panel({ children, className, tone = 'default' }: PanelProps) {
  return <section className={joinClasses('panel', `panel--${tone}`, className)}>{children}</section>;
}

export function KpiCard({
  label,
  value,
  hint,
  tone = 'default',
  icon
}: KpiCardProps) {
  return (
    <article className={joinClasses('metric-card', `metric-card--${tone}`)}>
      <div className="metric-card__header">
        <span>{label}</span>
        {icon ? <PortalIcon name={icon} className="metric-card__icon" width={18} height={18} /> : null}
      </div>
      <strong>{value}</strong>
      <p>{hint}</p>
    </article>
  );
}

export function Badge({ label, tone = 'default' }: BadgeProps) {
  return <span className={joinClasses('badge', `badge--${tone}`)}>{label}</span>;
}

export function ProgressBar({ value, tone = 'default' }: ProgressBarProps) {
  const normalized = Math.min(1, Math.max(0, value));

  return (
    <div className="progress">
      <span
        className={joinClasses('progress__fill', `progress__fill--${tone}`)}
        style={{ width: `${normalized * 100}%` }}
      />
    </div>
  );
}

export function ActionButton({
  label,
  icon,
  tone = 'default',
  type = 'button'
}: {
  label: string;
  icon?: PortalIconName;
  tone?: 'default' | 'critical' | 'ghost';
  type?: 'button' | 'submit' | 'reset';
}) {
  return (
    <button className={joinClasses('action-button', `action-button--${tone}`)} type={type}>
      {icon ? <PortalIcon name={icon} width={16} height={16} /> : null}
      <span>{label}</span>
    </button>
  );
}

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(' ');
}
