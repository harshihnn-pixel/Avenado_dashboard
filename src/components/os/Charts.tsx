// AdminLTE-style report widgets — a gradient-filled trend line, a
// two-series grouped bar chart with a legend, and a trend-arrow badge —
// hand-built SVG/CSS (no charting library, per this project's convention),
// themed off the same --av-* tokens as the rest of the app so they match
// the Bold Dark Gradient / Glass theme in both light and dark mode.
//
// Every chart here is driven by real, already-computed series (see
// src/lib/reportMetrics.ts) — nothing fabricated, and a series with no
// real rows yet renders the existing .empty-state convention instead of a
// fake curve.
import React, { useId } from 'react';
import { IconTrendingUp, IconTrendingDown } from './icons';
import type { SeriesPoint } from '@/lib/os/reportMetrics';

export function TrendBadge({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="trend-badge flat">— no prior period</span>;
  const up = pct >= 0;
  return (
    <span className={`trend-badge ${up ? 'up' : 'down'}`}>
      {up ? <IconTrendingUp size={13} /> : <IconTrendingDown size={13} />}
      {up ? '+' : ''}{pct}%
    </span>
  );
}

/** A single headline number + trend badge — the "820  +12.5%" line AdminLTE puts above each chart. */
export function ChartHeaderStat({ label, value, pct }: { label: string; value: React.ReactNode; pct: number | null }) {
  return (
    <div className="chart-header-stat">
      <div className="text-sm text-muted">{label}</div>
      <div className="flex items-center gap-2 mt-1">
        <span className="chs-value">{value}</span>
        <TrendBadge pct={pct} />
      </div>
    </div>
  );
}

/** Gradient-filled line chart for a single real time series (e.g. collections by month, submissions by week). */
export function AreaLineChart({ series, color = 'var(--av-primary)', height = 160, formatValue }: {
  series: SeriesPoint[];
  color?: string;
  height?: number;
  formatValue?: (v: number) => string;
}) {
  const gradId = useId();
  if (series.length === 0) {
    return <div className="empty-state" style={{ padding: '32px 0' }}>Nothing dated yet — this fills in as real entries are added.</div>;
  }
  const W = 600;
  const H = height;
  const pad = 10;
  const max = Math.max(1, ...series.map((p) => p.value));
  const stepX = series.length > 1 ? (W - pad * 2) / (series.length - 1) : 0;
  // Real data points — always one per series entry, used for the markers/tooltips.
  const xy = series.map((p, i) => ({
    x: series.length > 1 ? pad + i * stepX : W / 2,
    y: H - pad - (p.value / max) * (H - pad * 2 - 14),
    ...p,
  }));
  // With a single point there's nothing to draw a line *between* — stretch
  // a flat line across the full width at that value so the chart doesn't
  // collapse to an invisible zero-width sliver; the marker itself still
  // sits over the one real data point.
  const linePathPoints = xy.length > 1 ? xy : [{ x: pad, y: xy[0].y }, { x: W - pad, y: xy[0].y }];
  const linePath = linePathPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${linePathPoints[linePathPoints.length - 1].x.toFixed(1)} ${H - pad} L ${linePathPoints[0].x.toFixed(1)} ${H - pad} Z`;

  return (
    <div className="area-chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradId})`} stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {xy.map((p) => (
          <circle key={p.key} cx={p.x} cy={p.y} r={4} fill="var(--av-surface)" stroke={color} strokeWidth={2.5}>
            <title>{p.label}: {formatValue ? formatValue(p.value) : p.value}</title>
          </circle>
        ))}
      </svg>
      <div className="area-chart-labels">
        {series.map((p) => <span key={p.key}>{p.label}</span>)}
      </div>
    </div>
  );
}

export interface CategoryBarItem { key: string; label: string; value: number; color?: string; }

/**
 * Single-series vertical bar chart, one bar per *category* (project, team,
 * etc.) rather than per date — e.g. CRM capacity % by project. Each bar can
 * carry its own status color (good/warning/critical), per the dataviz
 * convention that status colors are reserved and always shown with a label,
 * never color alone — every bar is labeled with its category and value.
 * An optional dashed reference line (e.g. the 100% capacity mark) renders
 * behind the bars.
 */
export function CategoryBarChart({ items, height = 160, max, formatValue, referenceValue, referenceLabel }: {
  items: CategoryBarItem[];
  height?: number;
  max?: number;
  formatValue?: (v: number) => string;
  referenceValue?: number;
  referenceLabel?: string;
}) {
  if (items.length === 0) {
    return <div className="empty-state" style={{ padding: '32px 0' }}>Nothing dated yet — this fills in as real entries are added.</div>;
  }
  const barAreaH = height - 30;
  const m = Math.max(1, max ?? 0, referenceValue || 0, ...items.map((it) => it.value));
  return (
    <div className="trend-chart" style={{ height }}>
      {items.map((it) => {
        const h = Math.max(2, Math.round((it.value / m) * 100));
        return (
          <div key={it.key} className="trend-col">
            <div className="trend-bars" style={{ height: barAreaH, position: 'relative' }}>
              {referenceValue != null && (
                <div
                  style={{
                    position: 'absolute', left: -4, right: -4, bottom: `${Math.min(100, (referenceValue / m) * 100)}%`,
                    borderTop: '1.5px dashed var(--av-border-strong)',
                  }}
                  title={referenceLabel}
                />
              )}
              <div className="trend-bar" style={{ height: `${h}%`, width: 28, background: it.color || 'var(--av-primary)' }}
                title={`${it.label}: ${formatValue ? formatValue(it.value) : it.value}`} />
            </div>
            <div className="trend-month-label">{it.label}</div>
            <div className="text-sm" style={{ textAlign: 'center', fontWeight: 700, marginTop: 2, color: it.color || 'var(--av-text)' }}>
              {formatValue ? formatValue(it.value) : it.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export interface RadialGaugeItem { key: string; label: string; value: number; max?: number; color?: string; sublabel?: string; }

/**
 * A grid of radial (ring) gauges — one per category — for the same "value
 * vs. a target/max" job CategoryBarChart does, but read as a dial rather
 * than a column of bars. Each ring fills clockwise from 12 o'clock to the
 * value's share of `max` (or its own `max` override, e.g. for over-100%
 * capacity values that should always read as a full ring). The percentage
 * is the direct label at the ring's center — still a real number, not
 * color-alone — with the category name beneath it.
 */
export function RadialGaugeGrid({ items, size = 132, strokeWidth = 12, formatValue, max = 100 }: {
  items: RadialGaugeItem[];
  size?: number;
  strokeWidth?: number;
  formatValue?: (v: number) => string;
  max?: number;
}) {
  if (items.length === 0) {
    return <div className="empty-state" style={{ padding: '32px 0' }}>Nothing dated yet — this fills in as real entries are added.</div>;
  }
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <div className="gauge-grid">
      {items.map((it) => {
        const itemMax = it.max ?? max;
        const pct = itemMax > 0 ? Math.min(1, Math.max(0, it.value / itemMax)) : 0;
        const dash = circumference * pct;
        const color = it.color || 'var(--av-primary)';
        return (
          <div key={it.key} className="gauge-card">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${it.label}: ${formatValue ? formatValue(it.value) : it.value}`}>
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--av-border)" strokeWidth={strokeWidth} />
              <circle
                cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
                strokeDasharray={`${dash} ${Math.max(0, circumference - dash)}`}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: 'stroke-dasharray .3s ease' }}
              />
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fill="var(--av-text)" style={{ fontSize: size * 0.19, fontWeight: 700 }}>
                {formatValue ? formatValue(it.value) : it.value}
              </text>
            </svg>
            <div className="text-sm text-center mt-1" style={{ fontWeight: 600 }}>{it.label}</div>
            {it.sublabel && <div className="text-sm text-muted text-center">{it.sublabel}</div>}
          </div>
        );
      })}
    </div>
  );
}

export interface BarSeries { label: string; color: string; values: SeriesPoint[]; }

/** Two-series grouped bar chart with a swatch legend — the "This / Last" comparison chart. */
export function GroupedBarChart({ categories, series, height = 160, formatValue }: {
  categories: string[];
  series: BarSeries[];
  height?: number;
  formatValue?: (v: number) => string;
}) {
  const hasData = series.some((s) => s.values.some((v) => v.value > 0));
  if (categories.length === 0 || !hasData) {
    return <div className="empty-state" style={{ padding: '32px 0' }}>Nothing dated yet — this fills in as real entries are added.</div>;
  }
  const max = Math.max(1, ...series.flatMap((s) => s.values.map((v) => v.value)));

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        {series.map((s) => (
          <span key={s.label} className="text-sm text-muted flex items-center gap-1">
            <span className="trend-swatch" style={{ background: s.color }} /> {s.label}
          </span>
        ))}
      </div>
      <div className="trend-chart" style={{ height }}>
        {categories.map((cat, i) => (
          <div key={cat} className="trend-col">
            <div className="trend-bars" style={{ height: height - 30 }}>
              {series.map((s) => {
                const v = s.values[i]?.value || 0;
                const h = Math.round((v / max) * 100);
                return (
                  <div key={s.label} className="trend-bar" style={{ height: `${h}%`, background: s.color }}
                    title={`${cat} — ${s.label}: ${formatValue ? formatValue(v) : v}`} />
                );
              })}
            </div>
            <div className="trend-month-label">{cat}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
