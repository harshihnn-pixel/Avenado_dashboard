import React from 'react';
import { PROJECTS, DEPARTMENTS } from '@/lib/os/mock-data';
import { useApp } from '@/lib/os/store';
import { useStaffingAssumptions, useProjectStaffing, useTeamSummary, computeWorkload } from '@/lib/os/useStaffingModel';
import { useLocalCollection } from '@/lib/os/useLocalCollection';
import {
  IconAlert, IconFolder, IconLayers, IconUsers, IconTarget, IconReceipt, IconWallet, IconCard,
  IconFileCheck, IconBadge, IconArrowRight, IconShield, IconFile, IconCircleCheck,
} from '@/components/os/icons';
import { monthlyAmountSeries, latestDeltaPct } from '@/lib/os/reportMetrics';
import { projectCompletions, completionColor } from '@/lib/os/projectMetrics';
import { AreaLineChart, ChartHeaderStat, CategoryBarChart } from '@/components/os/Charts';
import { KpiCard, PageHeader, SectionHead, StatusBar, greeting, todayLabel } from '@/components/os/DetailUI';
import { useGoTo } from '@/components/os/nav-context';
import { firstName, taskStatusSegments } from '@/dashboards/shared/taskBreakdown';

const inr = (n: number) => '₹' + n.toLocaleString('en-IN');
const HEALTH_TONE: Record<string, string> = { on_track: 'success', at_risk: 'warning' };
function todayStr() { return new Date().toISOString().slice(0, 10); }

export function OwnerDashboard() {
  const go = useGoTo();
  const { profile } = useApp();
  const { assumptions } = useStaffingAssumptions();
  const { rows: staffing } = useProjectStaffing();
  const { rows: teamSummary, total: teamTotal } = useTeamSummary();
  const { items: leads } = useLocalCollection('leads', 'Lead');
  const { items: bookings } = useLocalCollection('bookings', 'Booking');
  const { items: collections } = useLocalCollection('collections', 'Collection');
  const { items: expenses } = useLocalCollection('expenses', 'Expense');
  const { items: tasks } = useLocalCollection('tasks', 'Task');
  const { items: dailyReports } = useLocalCollection('daily-reports', 'Daily Report');

  const recommendedCrms = staffing.reduce((s, p) => s + (p.recommended_crms || 0), 0);
  const alerts = staffing
    .map((p) => ({ project: p.project_name, pct: computeWorkload(assumptions, p).utilisationPct }))
    .filter((a) => a.pct > 100);

  const bookingsTotal = bookings.reduce((s, b) => s + (Number(b.amount) || 0), 0);
  const collectionsTotal = collections.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const expensesTotal = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const collectionsMonthly = monthlyAmountSeries(collections, 'date', 'amount');
  const openLeads = leads.filter((l) => l.stage && l.stage !== 'Closed Lost' && l.stage !== 'Won').length;

  const tasksInReview = tasks.filter((t) => t.status === 'Submitted for Review').length;
  const tasksVerified = tasks.filter((t) => t.status === 'Verified').length;
  const reportsToday = dailyReports.filter((r) => r.reporting_date === todayStr()).length;
  const reportsPending = dailyReports.filter((r) => r.verification_status === 'Submitted').length;

  // Live, per-project task completion — moves on its own as employees report
  // work and managers verify it (see ProjectDetail.tsx's Tasks tab and the
  // Manager portal's review queue); never a fixed/typed-in number. A
  // project with no tasks logged yet has no rate to show, so it's left out
  // of the chart rather than shown as a fabricated 0%.
  const projectCompletion = projectCompletions(PROJECTS, tasks);
  const completionChartItems = projectCompletion
    .filter((c) => c.completionPct != null)
    .map((c) => ({ key: c.projectId, label: c.projectName, value: c.completionPct as number, color: completionColor(c.completionPct) }));
  const projectsWithNoTasks = projectCompletion.filter((c) => c.completionPct == null).length;

  const workflow = [
    { label: 'Task reports in review', value: tasksInReview, icon: IconFileCheck, key: 'owner-task-reports', tone: tasksInReview ? 'warning' : 'neutral' },
    { label: 'Tasks verified', value: tasksVerified, icon: IconBadge, key: 'owner-task-reports', tone: 'success' },
    { label: 'Daily reports filed today', value: reportsToday, icon: IconFile, key: 'owner-daily-reports', tone: 'primary' },
    { label: 'Daily reports awaiting review', value: reportsPending, icon: IconAlert, key: 'owner-daily-reports', tone: reportsPending ? 'warning' : 'neutral' },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={todayLabel()}
        title={`${greeting()}, ${firstName(profile?.full_name)}`}
        sub="A live view of projects, people, workflow and money across Avenado."
        actions={<>
          <button className="btn btn-secondary" onClick={() => go('owner-daily-reports')}><IconFile /> Daily reports</button>
          <button className="btn btn-primary" onClick={() => go('owner-team-access')}><IconShield /> Team &amp; access</button>
        </>}
      />

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total projects" value={PROJECTS.length} icon={IconFolder} tone="accent" hint="View all projects" onClick={() => go('owner-projects')} />
        <KpiCard label="Departments" value={DEPARTMENTS.length} icon={IconLayers} tone="violet" hint="Organisation structure" onClick={() => go('owner-org-chart')} />
        <KpiCard label="Recommended CRMs" value={recommendedCrms} icon={IconUsers} tone="neutral" hint="Live from CRM Staffing Model" onClick={() => go('owner-staffing')} />
        <KpiCard
          label="Overloaded projects"
          value={alerts.length}
          icon={alerts.length ? IconAlert : IconCircleCheck}
          tone={alerts.length ? 'warning' : 'success'}
          hint={alerts.length ? 'CRM team above capacity' : 'Every team within capacity'}
          onClick={() => go('owner-staffing')}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="report-chart-card col-span-2">
          <SectionHead title="Collections" sub="Monthly totals from logged collection entries" action={<button className="btn btn-ghost btn-sm" onClick={() => go('owner-collections')}>Open <IconArrowRight /></button>} />
          <ChartHeaderStat
            label="Latest month vs. previous"
            value={inr(collectionsMonthly.length ? collectionsMonthly[collectionsMonthly.length - 1].value : 0)}
            pct={latestDeltaPct(collectionsMonthly)}
          />
          <div className="mt-4">
            <AreaLineChart series={collectionsMonthly} color="var(--av-primary)" formatValue={inr} />
          </div>
        </div>

        <div className="card">
          <SectionHead title="Workflow pulse" sub="Tasks and daily reports across the team" />
          <div className="flex flex-col gap-2">
            {workflow.map((w) => (
              <button key={w.label} type="button" className="action-row" onClick={() => go(w.key)}>
                <span className={`kpi-icon${w.tone !== 'primary' ? ` tone-${w.tone}` : ''}`}><w.icon size={16} /></span>
                <span className="text-sm" style={{ flex: 1 }}>{w.label}</span>
                <span className="ar-count">{w.value}</span>
              </button>
            ))}
          </div>
          <div className="mt-4">
            <div className="text-xs text-muted mb-2">Task pipeline</div>
            <StatusBar segments={taskStatusSegments(tasks)} />
          </div>
        </div>
      </div>

      <div>
        <SectionHead title="Commercial" sub="Computed live from Leads, Bookings, Collections and Expenses — ₹0 until entries are logged." />
        <div className="grid grid-cols-4 gap-4">
          <KpiCard label="Open leads" value={openLeads} icon={IconTarget} tone="accent" hint={`${leads.length} total in pipeline`} onClick={() => go('owner-leads')} />
          <KpiCard label="Bookings value" value={inr(bookingsTotal)} icon={IconReceipt} tone="violet" hint={bookings.length ? `${bookings.length} booking(s) logged` : 'None logged yet'} onClick={() => go('owner-bookings')} />
          <KpiCard label="Collections" value={inr(collectionsTotal)} icon={IconWallet} tone="success" hint={collections.length ? `${collections.length} entr${collections.length === 1 ? 'y' : 'ies'}` : 'None logged yet'} onClick={() => go('owner-collections')} />
          <KpiCard label="Expenses" value={inr(expensesTotal)} icon={IconCard} tone="error" hint={expenses.length ? `${expenses.length} entr${expenses.length === 1 ? 'y' : 'ies'}` : 'None logged yet'} onClick={() => go('owner-expenses')} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card col-span-2" style={{ padding: 0 }}>
          <div style={{ padding: '18px 20px 6px' }}>
            <SectionHead title="Projects" sub={`${PROJECTS.length} active engagements`} action={<button className="btn btn-ghost btn-sm" onClick={() => go('owner-projects')}>View all <IconArrowRight /></button>} />
          </div>
          <div className="table-wrap">
            <table className="table table-row-hover">
              <thead><tr><th style={{ paddingLeft: 20 }}>Project</th><th>Stage</th><th style={{ paddingRight: 20 }}>Health</th></tr></thead>
              <tbody>
                {PROJECTS.map((p) => (
                  <tr key={p.id} onClick={() => go('owner-projects')}>
                    <td style={{ paddingLeft: 20 }} className="font-medium">{p.name}</td>
                    <td className="text-sm text-muted">{p.stage}</td>
                    <td style={{ paddingRight: 20 }}>
                      <span className={`badge badge-${HEALTH_TONE[p.health] || 'error'}`} style={{ textTransform: 'capitalize' }}>
                        {p.health.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="card">
            <SectionHead title="Needs your attention" />
            {alerts.length === 0 ? (
              <div className="flex items-center gap-3 text-sm text-muted">
                <span className="kpi-icon tone-success"><IconCircleCheck size={16} /></span>
                No CRM team is over capacity right now.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {alerts.map((a) => (
                  <button key={a.project} type="button" className="action-row" onClick={() => go('owner-staffing')}>
                    <span className="kpi-icon tone-warning"><IconAlert size={16} /></span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="text-sm font-medium" style={{ display: 'block' }}>{a.project}</span>
                      <span className="text-xs text-muted">CRM team at {a.pct}% of capacity</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <SectionHead title="Team summary" sub="By role" action={<span className="badge badge-neutral badge-plain num">{teamTotal} total</span>} />
            <div>
              {teamSummary.map((r) => (
                <div key={r.role} className="list-row">
                  <span className="text-sm" style={{ flex: 1 }}>{r.role}</span>
                  <span className="text-sm font-semibold num">{r.count || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <SectionHead
          title="Project completion"
          sub="Live task completion % per project — moves as employees report work and managers verify it"
          action={<button className="btn btn-ghost btn-sm" onClick={() => go('owner-projects')}>View all <IconArrowRight /></button>}
        />
        <CategoryBarChart items={completionChartItems} max={100} formatValue={(v) => `${v}%`} />
        {projectsWithNoTasks > 0 && (
          <div className="text-sm text-muted mt-3">
            {projectsWithNoTasks} project{projectsWithNoTasks === 1 ? '' : 's'} with no tasks logged yet — not shown above until work is assigned.
          </div>
        )}
      </div>
    </div>
  );
}
