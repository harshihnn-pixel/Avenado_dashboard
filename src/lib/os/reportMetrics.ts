// Shared helpers for the AdminLTE-style report widgets (Executive Overview,
// Finance Overview, Daily Reports Overview, Verified Task Reports).
//
// Every series here is built by grouping REAL records (the same
// Collections/Expenses/Daily Report/Task rows already on their own pages)
// by their own `date` / `reporting_date` / `verified_date` field — there is
// no separate "analytics" store and nothing is invented. A period with no
// real rows in it renders as 0, and a delta with no comparable prior period
// renders as "—" rather than a made-up percentage.

export function monthKey(dateStr?: string | null): string | null {
  return dateStr && dateStr.length >= 7 ? dateStr.slice(0, 7) : null;
}
export function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

// ISO-ish week key — good enough for grouping within a single app session;
// matches the week numbering already used by Daily Reports Overview.
export function weekKey(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const dt = new Date(dateStr);
  if (isNaN(dt.getTime())) return null;
  const onejan = new Date(dt.getFullYear(), 0, 1);
  const week = Math.ceil((((dt as any) - (onejan as any)) / 86400000 + onejan.getDay() + 1) / 7);
  return `${dt.getFullYear()}-W${String(week).padStart(2, '0')}`;
}
export function weekLabel(key: string): string {
  const w = key.split('-W')[1];
  return `W${w}`;
}

export interface SeriesPoint { key: string; label: string; value: number; }

/** Sum `amountField` of `items` grouped by month (from `dateField`), last `months` buckets, chronological. */
export function monthlyAmountSeries(items: any[], dateField: string, amountField: string, months = 6): SeriesPoint[] {
  const byMonth: Record<string, number> = {};
  items.forEach((it) => {
    const k = monthKey(it[dateField]);
    if (k) byMonth[k] = (byMonth[k] || 0) + (Number(it[amountField]) || 0);
  });
  return Object.keys(byMonth).sort().slice(-months).map((k) => ({ key: k, label: monthLabel(k), value: byMonth[k] }));
}

/** Count of `items` grouped by week (from `dateField`), last `weeks` buckets, chronological. */
export function weeklyCountSeries(items: any[], dateField: string, weeks = 8): SeriesPoint[] {
  const byWeek: Record<string, number> = {};
  items.forEach((it) => {
    const k = weekKey(it[dateField]);
    if (k) byWeek[k] = (byWeek[k] || 0) + 1;
  });
  return Object.keys(byWeek).sort().slice(-weeks).map((k) => ({ key: k, label: weekLabel(k), value: byWeek[k] }));
}

/**
 * Percent change of the latest point vs. the one before it. Returns null
 * (render as "—", never a fabricated number) when there's no real prior
 * period to compare against, or the prior value is zero.
 */
export function latestDeltaPct(series: SeriesPoint[]): number | null {
  if (series.length < 2) return null;
  const prev = series[series.length - 2].value;
  const curr = series[series.length - 1].value;
  if (!prev) return null;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}
