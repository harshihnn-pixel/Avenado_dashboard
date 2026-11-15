import React from 'react';
import { useLocalCollection } from '@/lib/os/useLocalCollection';
import { monthlyAmountSeries, latestDeltaPct, type SeriesPoint } from '@/lib/os/reportMetrics';
import { AreaLineChart, GroupedBarChart, ChartHeaderStat } from '@/components/os/Charts';

const inr = (n: number) => '₹' + n.toLocaleString('en-IN');

function sum(items: any[], key = 'amount') { return items.reduce((s, r) => s + (Number(r[key]) || 0), 0); }

// Net = Collections − Expenses, aligned month-by-month over the union of
// both series' keys (not just whichever has more months).
function netSeries(collectionsSeries: SeriesPoint[], expensesSeries: SeriesPoint[]): SeriesPoint[] {
  const byKey: Record<string, { label: string; c: number; e: number }> = {};
  collectionsSeries.forEach((p) => { byKey[p.key] = byKey[p.key] || { label: p.label, c: 0, e: 0 }; byKey[p.key].c = p.value; });
  expensesSeries.forEach((p) => { byKey[p.key] = byKey[p.key] || { label: p.label, c: 0, e: 0 }; byKey[p.key].e = p.value; });
  return Object.keys(byKey).sort().map((k) => ({ key: k, label: byKey[k].label, value: byKey[k].c - byKey[k].e }));
}

export function FinanceOverview() {
  const { items: bookings } = useLocalCollection('bookings', 'Booking');
  const { items: collections } = useLocalCollection('collections', 'Collection');
  const { items: expenses } = useLocalCollection('expenses', 'Expense');
  const { items: commissions } = useLocalCollection('commissions', 'Commission');
  const { items: budgets } = useLocalCollection('budgets', 'Budget');

  const bookingsTotal = sum(bookings);
  const collectionsTotal = sum(collections);
  const expensesTotal = sum(expenses);
  const commissionsTotal = sum(commissions);
  const budgetedTotal = sum(budgets, 'budgeted');
  const spentTotal = sum(budgets, 'spent');
  const net = collectionsTotal - expensesTotal - commissionsTotal;

  // Real monthly trends — grouped off each record's own `date` field.
  const collectionsMonthly = monthlyAmountSeries(collections, 'date', 'amount');
  const expensesMonthly = monthlyAmountSeries(expenses, 'date', 'amount');
  const netMonthly = netSeries(collectionsMonthly, expensesMonthly);

  const Card = ({ label, value, tone }: { label: string; value: string; tone?: string }) => (
    <div className="kpi-card card">
      <div className="text-sm text-muted mb-1">{label}</div>
      <div className="text-2xl font-bold" style={{ fontSize: 26, fontWeight: 700, color: tone }}>{value}</div>
    </div>
  );

  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card label="Bookings value" value={inr(bookingsTotal)} />
        <Card label="Collections" value={inr(collectionsTotal)} />
        <Card label="Expenses" value={inr(expensesTotal)} />
        <Card label="Commissions" value={inr(commissionsTotal)} />
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card label="Net (Collections − Expenses − Commissions)" value={inr(net)} tone={net < 0 ? 'var(--av-error)' : 'var(--av-success)'} />
        <Card label="Budgeted" value={inr(budgetedTotal)} />
        <Card label="Spent against budget" value={inr(spentTotal)} />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="report-chart-card">
          <ChartHeaderStat
            label="Net income — latest month vs. previous"
            value={inr(netMonthly.length ? netMonthly[netMonthly.length - 1].value : 0)}
            pct={latestDeltaPct(netMonthly)}
          />
          <div className="mt-4">
            <AreaLineChart series={netMonthly} color="var(--av-primary)" formatValue={inr} />
          </div>
        </div>
        <div className="report-chart-card">
          <strong>Collections vs. Expenses — last 6 months</strong>
          <div className="text-sm text-muted mt-1 mb-4">Built from each entry's own date on the Collections and Expenses pages.</div>
          <GroupedBarChart
            categories={collectionsMonthly.length ? collectionsMonthly.map((p) => p.label) : expensesMonthly.map((p) => p.label)}
            series={[
              { label: 'Collections', color: 'var(--av-primary)', values: collectionsMonthly },
              { label: 'Expenses', color: 'var(--av-error)', values: expensesMonthly },
            ]}
            formatValue={inr}
          />
        </div>
      </div>

      <div className="card mb-6">
        <strong>Budgets by line item</strong>
        <div className="text-sm text-muted mt-1 mb-4">Variance = Spent − Budgeted, from the Budgets page — add line items there to see them here.</div>
        {budgets.length === 0 ? (
          <div className="empty-state">No budget line items yet.</div>
        ) : (
          <table className="table table-row-hover">
            <thead><tr><th>Line item</th><th>Department</th><th style={{ textAlign: 'right' }}>Budgeted</th><th style={{ textAlign: 'right' }}>Spent</th><th style={{ textAlign: 'right' }}>Variance</th></tr></thead>
            <tbody>
              {budgets.map((b: any) => {
                const budgeted = Number(b.budgeted) || 0;
                const spent = Number(b.spent) || 0;
                const variance = spent - budgeted;
                return (
                  <tr key={b.id}>
                    <td>{b.line_item || '—'}</td>
                    <td className="text-sm text-muted">{b.department || '—'}</td>
                    <td style={{ textAlign: 'right' }}>{inr(budgeted)}</td>
                    <td style={{ textAlign: 'right' }}>{inr(spent)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={`trend-badge ${variance > 0 ? 'down' : variance < 0 ? 'up' : 'flat'}`}>
                        {variance === 0 ? '—' : `${variance > 0 ? '+' : ''}${inr(variance)}`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="card empty-state">
        <strong>How this is computed</strong>
        <p className="text-sm text-muted mt-2">
          Every figure above is a live sum over the Bookings, Collections, Expenses, Commissions and Budgets
          pages — add entries there and this page updates. Nothing is pre-filled or invented.
        </p>
      </div>
    </div>
  );
}
