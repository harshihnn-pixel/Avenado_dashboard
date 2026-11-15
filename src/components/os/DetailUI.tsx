// Shared "entity detail page" building blocks — entity header, progress
// ring, KV grid, status-breakdown bar, stat tiles, and the horizontally
// scrollable tab bar. Used by the 10-tab Project Detail page, the
// 10-section Employee Profile page, and reused wherever else a detail
// view needs the same premium look rather than hand-rolling it again.
import React from 'react';

export function initialsOf(name?: string | null) {
  const parts = String(name || '?').trim().split(/\s+/);
  return (((parts[0]?.[0] || '') + (parts[1]?.[0] || '')) || '?').toUpperCase();
}

export function EntityHeader({ name, sub, chips }: { name: string; sub?: string; chips?: React.ReactNode[] }) {
  return (
    <div className="entity-header av-animate-in">
      <div className="eh-body">
        <div className="eh-avatar">{initialsOf(name)}</div>
        <div>
          <h1 className="eh-name">{name}</h1>
          {sub && <div className="eh-sub">{sub}</div>}
          {chips && chips.length > 0 && <div className="eh-chips">{chips.map((c, i) => <span key={i} className="eh-chip">{c}</span>)}</div>}
        </div>
      </div>
    </div>
  );
}

export function ProgressRing({ percent, label, size = 96, stroke = 9 }: { percent: number | null; label: string; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = percent == null ? 0 : Math.max(0, Math.min(100, percent));
  const offset = c - (pct / 100) * c;
  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle className="pr-track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
        <circle className="pr-value" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="pr-label">
        <span className="pr-num">{percent == null ? '—' : `${Math.round(pct)}%`}</span>
        <span className="pr-cap">{label}</span>
      </div>
    </div>
  );
}

export function KVGrid({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <div className="kv-grid">
      {items.map((it, i) => (
        <div key={i}>
          <div className="kv-label">{it.label}</div>
          <div className="kv-value">{it.value}</div>
        </div>
      ))}
    </div>
  );
}

export function StatusBar({ segments }: { segments: { key: string; label: string; cls: string; value: number }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) return <div className="empty-state" style={{ padding: '12px 0' }}>Nothing to break down yet.</div>;
  return (
    <div>
      <div className="status-bar">
        {segments.filter((s) => s.value > 0).map((s) => (
          <div key={s.key} className={`status-bar-seg bar-${s.cls}`} style={{ width: `${(s.value / total) * 100}%` }} title={`${s.label}: ${s.value}`} />
        ))}
      </div>
      <div className="status-bar-legend">
        {segments.map((s) => (
          <div key={s.key} className="status-bar-legend-item">
            <span className={`status-bar-legend-dot tone-dot-${s.cls}`} />
            {s.label} ({s.value})
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatTiles({ items }: { items: { label: string; value: React.ReactNode; tone?: 'green' | 'amber' | 'red' }[] }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {items.map((it, i) => (
        <div key={i} className={`stat-tile${it.tone ? ` tone-${it.tone}` : ''}`}>
          <div className="st-value">{it.value}</div>
          <div className="st-label">{it.label}</div>
        </div>
      ))}
    </div>
  );
}

export function DetailTabBar({ tabs, active, onChange }: { tabs: { key: string; label: string }[]; active: string; onChange: (k: string) => void }) {
  return (
    <div className="detail-tab-bar">
      {tabs.map((t) => (
        <button key={t.key} className={`detail-tab-btn${active === t.key ? ' active' : ''}`} onClick={() => onChange(t.key)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function PulseList({ items }: { items: { key: string; sev?: 'high' | 'medium'; content: React.ReactNode }[] }) {
  if (items.length === 0) return <div className="empty-state">Nothing here yet.</div>;
  return (
    <div>
      {items.map((it) => (
        <div key={it.key} className={`pulse-row${it.sev ? ` sev-${it.sev}` : ''}`}>
          <span className="pulse-dot" />
          <div style={{ fontSize: 13 }}>{it.content}</div>
        </div>
      ))}
    </div>
  );
}

type KpiTone = 'primary' | 'success' | 'warning' | 'error' | 'violet' | 'accent' | 'neutral';

/** Executive KPI card: label, headline value, optional icon chip, hint and click-through. */
export function KpiCard({ label, value, hint, icon: Icon, tone = 'primary', onClick, trend }: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ComponentType<{ size?: number }>;
  tone?: KpiTone;
  onClick?: () => void;
  trend?: React.ReactNode;
}) {
  const body = (
    <>
      <div className="kpi-head">
        <span className="kpi-label">{label}</span>
        {Icon && <span className={`kpi-icon${tone !== 'primary' ? ` tone-${tone}` : ''}`}><Icon size={16} /></span>}
      </div>
      <div className="kpi-value">{value}</div>
      {(hint || trend) && (
        <div className="flex items-center gap-2" style={{ minHeight: 18 }}>
          {trend}
          {hint && <span className="kpi-hint">{hint}</span>}
        </div>
      )}
    </>
  );
  return onClick
    ? <button type="button" className="kpi-card" onClick={onClick}>{body}</button>
    : <div className="kpi-card">{body}</div>;
}

/** Standard page header for dashboard-level screens. */
export function PageHeader({ eyebrow, title, sub, actions }: { eyebrow?: React.ReactNode; title: React.ReactNode; sub?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="page-header" style={{ marginBottom: 0 }}>
      <div style={{ minWidth: 0 }}>
        {eyebrow && <div className="page-eyebrow">{eyebrow}</div>}
        <h2 className="page-title">{title}</h2>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  );
}

/** Card section heading with optional action on the right. */
export function SectionHead({ title, sub, action }: { title: React.ReactNode; sub?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="section-head">
      <div style={{ minWidth: 0 }}>
        <div className="section-title">{title}</div>
        {sub && <div className="section-sub">{sub}</div>}
      </div>
      {action}
    </div>
  );
}

export function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export function todayLabel(d = new Date()) {
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
