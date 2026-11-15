// Daily Report aggregation — a separate layer on top of the per-task
// Task Workflow chain (TaskWorkflow.tsx), per the master prompt's explicit
// instruction that per-task reporting "is not sufficient" on its own.
// Employee submits ONE daily report per day (employee, date, department,
// project, which of their assigned tasks they worked on/completed/left
// pending, a single total-work-duration figure, achievements, challenges,
// next-day plan, links) -> Manager/HR verifies or requests changes ->
// Owner sees verified vs pending, with daily/weekly/monthly rollups.
//
// No double-counting: the per-task "actual time spent" captured on an
// individual task's submission (TaskWorkflow.tsx) stays task-level detail.
// "Total Work Duration" here is the single, separate, authoritative figure
// for the whole day, entered once by the employee — this app never sums
// the two together anywhere, so there's nothing to double-count.
import React, { useMemo, useState } from 'react';
import { useLocalCollection } from '@/lib/os/useLocalCollection';
import { useApp } from '@/lib/os/store';
import { PROJECTS, DEPARTMENTS } from '@/lib/os/mock-data';
import { StatusBadge } from '@/components/os/ListModule';
import { StatTiles } from '@/components/os/DetailUI';
import { Modal } from '@/components/os/Modal';
import { DataTable, type DataTableColumn } from '@/components/os/DataTable';
import { weeklyCountSeries, latestDeltaPct } from '@/lib/os/reportMetrics';
import { AreaLineChart, ChartHeaderStat } from '@/components/os/Charts';

function todayStr() { return new Date().toISOString().slice(0, 10); }
function weekKey(d: string) { const dt = new Date(d); const onejan = new Date(dt.getFullYear(), 0, 1); const week = Math.ceil((((dt as any) - (onejan as any)) / 86400000 + onejan.getDay() + 1) / 7); return `${dt.getFullYear()}-W${week}`; }
function monthKey(d: string) { return d.slice(0, 7); }
function parseHours(v: string | undefined): number { if (!v) return 0; const m = String(v).match(/[\d.]+/); return m ? parseFloat(m[0]) : 0; }

export function MyDailyReportPage() {
  const { profile } = useApp();
  const { items: tasks } = useLocalCollection('tasks', 'Task');
  const { items: reports, add, update } = useLocalCollection('daily-reports', 'Daily Report');
  const mine = reports.filter((r) => r.employee_name === profile?.full_name).sort((a, b) => (b.reporting_date > a.reporting_date ? 1 : -1));
  const myTasks = tasks.filter((t) => t.assigned_employee === profile?.full_name);

  const [date, setDate] = useState(todayStr());
  const existing = mine.find((r) => r.reporting_date === date);
  const [department, setDepartment] = useState(existing?.department || '');
  const [project, setProject] = useState(existing?.project || '');
  const [workedOn, setWorkedOn] = useState<string[]>(existing?.tasks_worked_on || []);
  const [completedIds, setCompletedIds] = useState<string[]>(existing?.tasks_completed || []);
  const [duration, setDuration] = useState(existing?.total_work_duration || '');
  const [achievements, setAchievements] = useState(existing?.achievements || '');
  const [challenges, setChallenges] = useState(existing?.challenges || '');
  const [nextPlan, setNextPlan] = useState(existing?.next_day_plan || '');
  const [links, setLinks] = useState(existing?.supporting_links || '');

  const pendingTasks = myTasks.filter((t) => t.status !== 'Verified' && !workedOn.includes(t.id));

  const toggleWorked = (id: string) => setWorkedOn((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id]));
  const toggleCompleted = (id: string) => setCompletedIds((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id]));

  const submit = () => {
    const payload = {
      employee_name: profile?.full_name,
      reporting_date: date,
      department, project,
      tasks_assigned: myTasks.length,
      tasks_worked_on: workedOn,
      tasks_completed: completedIds,
      tasks_pending: myTasks.filter((t) => t.status !== 'Verified').length - completedIds.length,
      total_work_duration: duration,
      achievements, challenges, next_day_plan: nextPlan, supporting_links: links,
      verification_status: 'Submitted',
    };
    if (existing) update(existing.id, payload as any);
    else add(payload as any);
  };

  return (
    <div>
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <strong>Daily Report</strong>
            <div className="text-sm text-muted mt-1">
              One report per day — separate from, and in addition to, the per-task submissions on My Tasks. Pick the date, select which
              assigned tasks you worked on today, and fill in the rest.
            </div>
          </div>
          <input className="input" type="date" style={{ width: 170 }} value={date} onChange={(e) => setDate(e.target.value)} max={todayStr()} />
        </div>

        {existing && <div className="badge badge-info mb-4" style={{ display: 'inline-block' }}>You already have a {existing.verification_status.toLowerCase()} report for this date — submitting again updates it.</div>}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="field-label">Department</label>
            <select className="select" value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">Select…</option>
              {DEPARTMENTS.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Project</label>
            <select className="select" value={project} onChange={(e) => setProject(e.target.value)}>
              <option value="">Select…</option>
              {PROJECTS.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
        </div>

        <label className="field-label">Tasks worked on today (from your assigned tasks)</label>
        {myTasks.length === 0 ? (
          <div className="empty-state mb-3">You have no assigned tasks yet — nothing to pick from.</div>
        ) : (
          <div className="card-flat p-3 mb-4">
            {myTasks.map((t) => (
              <div key={t.id} className="flex items-center gap-2 mb-2" style={{ fontSize: 13 }}>
                <input type="checkbox" checked={workedOn.includes(t.id)} onChange={() => toggleWorked(t.id)} />
                <span style={{ flex: 1 }}>{t.title}</span>
                <StatusBadge value={t.status || 'Not Started'} />
                {workedOn.includes(t.id) && (
                  <label className="flex items-center gap-1 text-sm text-muted">
                    <input type="checkbox" checked={completedIds.includes(t.id)} onChange={() => toggleCompleted(t.id)} /> Completed today
                  </label>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="field-label">Total work duration (today)</label>
            <input className="input" placeholder="e.g. 7.5 hours" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Supporting links</label>
            <input className="input" placeholder="Drive / document links" value={links} onChange={(e) => setLinks(e.target.value)} />
          </div>
        </div>
        <div className="mb-3">
          <label className="field-label">Achievements</label>
          <textarea className="input" rows={2} value={achievements} onChange={(e) => setAchievements(e.target.value)} />
        </div>
        <div className="mb-3">
          <label className="field-label">Challenges</label>
          <textarea className="input" rows={2} value={challenges} onChange={(e) => setChallenges(e.target.value)} />
        </div>
        <div className="mb-4">
          <label className="field-label">Next-day plan</label>
          <textarea className="input" rows={2} value={nextPlan} onChange={(e) => setNextPlan(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={submit}>{existing ? 'Update' : 'Submit'} Daily Report</button>
        <div className="text-sm text-muted mt-2">
          Pending tasks not worked on today: {pendingTasks.length}. "Total work duration" is your one figure for the whole day — it's
          never summed with the per-task time you log when submitting an individual task, so nothing here gets double-counted.
        </div>
      </div>

      <div className="card">
        <strong>Your report history</strong>
        {mine.length === 0 ? <div className="empty-state mt-3">No daily reports submitted yet.</div> : (
          <table className="table mt-3">
            <thead><tr><th>Date</th><th>Project</th><th>Worked on</th><th>Completed</th><th>Duration</th><th>Status</th></tr></thead>
            <tbody>
              {mine.map((r) => (
                <tr key={r.id}>
                  <td>{r.reporting_date}</td><td className="text-sm text-muted">{r.project || '—'}</td>
                  <td>{(r.tasks_worked_on || []).length}</td><td>{(r.tasks_completed || []).length}</td>
                  <td className="text-sm text-muted">{r.total_work_duration || '—'}</td>
                  <td><StatusBadge value={r.verification_status || 'Submitted'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function DailyReportVerificationPage() {
  const { profile } = useApp();
  const { items: reports, update } = useLocalCollection('daily-reports', 'Daily Report');
  const { items: tasks } = useLocalCollection('tasks', 'Task');
  const pending = reports.filter((r) => r.verification_status === 'Submitted');
  const [remarksFor, setRemarksFor] = useState<{ id: string } | null>(null);
  const [remarks, setRemarks] = useState('');

  const verify = (id: string) => update(id, { verification_status: 'Verified', verified_by: profile?.full_name, verified_date: new Date().toISOString() });
  const requestChanges = () => {
    if (!remarksFor) return;
    update(remarksFor.id, { verification_status: 'Changes Requested', manager_feedback: remarks, verified_by: profile?.full_name });
    setRemarksFor(null); setRemarks('');
  };
  const taskTitle = (id: string) => tasks.find((t) => t.id === id)?.title || id;

  return (
    <div className="card">
      <strong>Daily Report Verification</strong>
      <div className="text-sm text-muted mt-1 mb-4">Submitted daily reports awaiting your decision — separate from per-task Work Verification.</div>
      {pending.length === 0 ? (
        <div className="empty-state">Nothing waiting for daily-report verification right now.</div>
      ) : (
        pending.map((r) => (
          <div key={r.id} className="card-flat p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <strong>{r.employee_name} — {r.reporting_date}</strong>
              <span className="text-sm text-muted">{r.project || '—'} / {r.department || '—'}</span>
            </div>
            <div className="text-sm mb-1"><strong>Worked on:</strong> {(r.tasks_worked_on || []).map(taskTitle).join(', ') || '—'}</div>
            <div className="text-sm mb-1"><strong>Completed:</strong> {(r.tasks_completed || []).map(taskTitle).join(', ') || 'None'}</div>
            <div className="text-sm mb-1"><strong>Total duration:</strong> {r.total_work_duration || '—'}</div>
            {r.achievements && <div className="text-sm mb-1"><strong>Achievements:</strong> {r.achievements}</div>}
            {r.challenges && <div className="text-sm mb-1"><strong>Challenges:</strong> {r.challenges}</div>}
            {r.next_day_plan && <div className="text-sm mb-3"><strong>Next-day plan:</strong> {r.next_day_plan}</div>}
            <div className="flex gap-2 mt-3">
              <button className="btn btn-primary btn-sm" onClick={() => verify(r.id)}>Verify</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setRemarksFor({ id: r.id })}>Request Changes</button>
            </div>
          </div>
        ))
      )}
      {remarksFor && (
        <Modal title="Request changes — feedback" onClose={() => setRemarksFor(null)}>
          <textarea className="input" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Feedback for the employee…" />
          <div className="flex justify-between mt-4">
            <button className="btn btn-secondary" onClick={() => setRemarksFor(null)}>Cancel</button>
            <button className="btn btn-primary" disabled={!remarks.trim()} onClick={requestChanges}>Confirm</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const DAILY_REPORT_COLUMNS: DataTableColumn<any>[] = [
  { key: 'employee_name', label: 'Employee' },
  { key: 'reporting_date', label: 'Date', render: (r) => <span className="text-sm text-muted">{r.reporting_date}</span> },
  { key: 'project', label: 'Project', render: (r) => <span className="text-sm text-muted">{r.project || '—'}</span> },
  { key: 'tasks_worked_on', label: 'Worked on', render: (r) => (r.tasks_worked_on || []).length, sortValue: (r) => (r.tasks_worked_on || []).length },
  { key: 'tasks_completed', label: 'Completed', render: (r) => (r.tasks_completed || []).length, sortValue: (r) => (r.tasks_completed || []).length },
  { key: 'total_work_duration', label: 'Duration', render: (r) => <span className="text-sm text-muted">{r.total_work_duration || '—'}</span> },
  { key: 'verification_status', label: 'Status', render: (r) => <StatusBadge value={r.verification_status || 'Submitted'} /> },
];

export function OwnerDailyReportsPage() {
  const { items: reports } = useLocalCollection('daily-reports', 'Daily Report');
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [filter, setFilter] = useState<'Verified' | 'Submitted' | 'Changes Requested' | 'All'>('Verified');

  const counts = {
    verified: reports.filter((r) => r.verification_status === 'Verified').length,
    pending: reports.filter((r) => r.verification_status === 'Submitted').length,
    changes: reports.filter((r) => r.verification_status === 'Changes Requested').length,
  };

  const filtered = filter === 'All' ? reports : reports.filter((r) => r.verification_status === filter);

  const weeklyVolume = useMemo(() => weeklyCountSeries(reports, 'reporting_date', 8), [reports]);

  const grouped = useMemo(() => {
    if (period === 'daily') return null;
    const keyFn = period === 'weekly' ? weekKey : monthKey;
    const map = new Map<string, { period: string; employee: string; reports: number; hours: number; verified: number }>();
    reports.forEach((r) => {
      const k = `${keyFn(r.reporting_date)}__${r.employee_name}`;
      const row = map.get(k) || { period: keyFn(r.reporting_date), employee: r.employee_name, reports: 0, hours: 0, verified: 0 };
      row.reports++;
      row.hours += parseHours(r.total_work_duration);
      if (r.verification_status === 'Verified') row.verified++;
      map.set(k, row);
    });
    return Array.from(map.values()).sort((a, b) => (a.period < b.period ? 1 : -1));
  }, [reports, period]);

  return (
    <div>
      <StatTiles items={[
        { label: 'Verified daily reports', value: counts.verified, tone: 'green' },
        { label: 'Pending verification', value: counts.pending, tone: counts.pending ? 'amber' : undefined },
        { label: 'Changes requested', value: counts.changes },
        { label: 'Total submitted', value: reports.length },
      ]} />

      <div className="report-chart-card mt-4">
        <ChartHeaderStat
          label="Reports submitted — this week vs. last week"
          value={weeklyVolume.length ? weeklyVolume[weeklyVolume.length - 1].value : 0}
          pct={latestDeltaPct(weeklyVolume)}
        />
        <div className="text-sm text-muted mt-1 mb-4">Built from each report's own date — grouped by week, last 8 weeks.</div>
        <AreaLineChart series={weeklyVolume} color="var(--av-accent)" />
      </div>

      <div className="card mt-4">
        <div className="flex items-center justify-between mb-4" style={{ flexWrap: 'wrap', gap: 8 }}>
          <strong>Daily Reports Overview</strong>
          <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
            <div className="tabs-list">
              {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                <button key={p} className={`tabs-trigger${period === p ? ' active' : ''}`} onClick={() => setPeriod(p)}>{p[0].toUpperCase() + p.slice(1)}</button>
              ))}
            </div>
            {period === 'daily' && (
              <div className="tabs-list">
                {(['Verified', 'Submitted', 'Changes Requested', 'All'] as const).map((f) => (
                  <button key={f} className={`tabs-trigger${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        {period === 'daily' ? (
          <DataTable
            columns={DAILY_REPORT_COLUMNS}
            rows={filtered}
            searchKeys={['employee_name', 'project']}
            searchPlaceholder="Search employee or project…"
            stickyHeader
            emptyState={<div className="empty-state">Nothing in this view yet.</div>}
          />
        ) : (
          !grouped || grouped.length === 0 ? <div className="empty-state">Nothing to summarize yet.</div> : (
            <table className="table table-row-hover">
              <thead><tr><th>{period === 'weekly' ? 'Week' : 'Month'}</th><th>Employee</th><th>Reports</th><th>Verified</th><th>Total hours (parsed)</th></tr></thead>
              <tbody>
                {grouped.map((g, i) => (
                  <tr key={i}>
                    <td className="text-sm text-muted">{g.period}</td><td>{g.employee}</td><td>{g.reports}</td><td>{g.verified}</td><td>{g.hours.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
      <div className="card empty-state mt-4">
        "Total hours (parsed)" is a best-effort sum of the free-text duration each employee typed for that day (e.g. "7.5 hours") — it's
        a weekly/monthly rollup of the daily reports only, not a second count of per-task time already logged elsewhere.
      </div>
    </div>
  );
}
