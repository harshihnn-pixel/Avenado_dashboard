// The central operational chain the master prompt calls "the heart of
// Avenado OS": Manager/HR assigns a task -> Employee works it and submits
// a completion report -> Manager/HR verifies (or requests changes/rejects)
// -> Owner reviews verified (and pending) reports. All four views below
// read and write the SAME shared 'tasks' collection (keyed globally, not
// per-role — see useLocalCollection/persist.ts), so a task assigned here
// genuinely appears in the assigned employee's dashboard, a submission
// genuinely appears in the verification queue, and a verified task
// genuinely appears in the owner's overview. Nothing is faked per-view.
import React, { useMemo, useState } from 'react';
import { useLocalCollection } from '@/lib/os/useLocalCollection';
import { useApp } from '@/lib/os/store';
import { PROJECTS, DEPARTMENTS } from '@/lib/os/mock-data';
import { useAssignableNames } from '@/lib/os/employeeOptions';
import { TASK_STATUSES, type TaskStatus } from '@/lib/os/types';
import { Modal } from '@/components/os/Modal';
import { KanbanBoard } from '@/components/os/KanbanBoard';
import { RecordForm, StatusBadge, type FieldDef } from '@/components/os/ListModule';
import { DataTable, type DataTableColumn } from '@/components/os/DataTable';
import { weeklyCountSeries, latestDeltaPct } from '@/lib/os/reportMetrics';
import { AreaLineChart, ChartHeaderStat } from '@/components/os/Charts';

const ASSIGN_FIELDS: FieldDef[] = [
  { key: 'title', label: 'Task title', required: true },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'project', label: 'Project', type: 'select', options: PROJECTS.map((p) => p.name) },
  { key: 'department', label: 'Department', type: 'select', options: DEPARTMENTS.map((d) => d.name) },
  { key: 'assigned_employee', label: 'Assign to', type: 'select', options: [], required: true },
  { key: 'priority', label: 'Priority', type: 'select', options: ['High', 'Medium', 'Low'], required: true },
  { key: 'category', label: 'Category', placeholder: 'e.g. Sales, Admin, Legal' },
  { key: 'assigned_date', label: 'Assigned date', type: 'date' },
  { key: 'deadline', label: 'Deadline', type: 'date' },
  { key: 'expected_duration', label: 'Expected duration', placeholder: 'e.g. 2 hours' },
  { key: 'instructions', label: 'Instructions', type: 'textarea' },
];

function withEmployeeOptions(fields: FieldDef[], names: string[]): FieldDef[] {
  return fields.map((f) => (f.key === 'assigned_employee' ? { ...f, options: names } : f));
}

export function TaskAssignmentPage() {
  const { profile } = useApp();
  const { items, add, update } = useLocalCollection('tasks', 'Task');
  // Called unconditionally here — used below inside `{adding && (...)}`,
  // which a hook call itself can never be (hook count must be identical on
  // every render).
  const assignableNames = useAssignableNames();
  const [adding, setAdding] = useState(false);
  const [view, setView] = useState<'table' | 'kanban'>('table');
  const assignedByMe = items; // in this demo, every task shows here regardless of who assigned it — see note below

  const workload = Array.from(new Set(items.map((t) => t.assigned_employee).filter(Boolean))).map((name) => ({
    name,
    count: items.filter((t) => t.assigned_employee === name && t.status !== 'Verified').length,
  }));

  return (
    <div>
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <strong>Task Assignment</strong>
            <div className="text-sm text-muted mt-1">
              Assign work to anyone in your team (real accounts, or anyone added via Employee Management). An
              assigned task appears immediately on that person's Employee dashboard — same shared data, not a copy.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="tabs-list">
              <button className={`tabs-trigger${view === 'table' ? ' active' : ''}`} onClick={() => setView('table')}>Table</button>
              <button className={`tabs-trigger${view === 'kanban' ? ' active' : ''}`} onClick={() => setView('kanban')}>Kanban</button>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>+ Assign Task</button>
          </div>
        </div>

        {assignedByMe.length === 0 ? (
          <div className="empty-state">No tasks assigned yet.</div>
        ) : view === 'table' ? (
          <table className="table table-row-hover">
            <thead><tr><th>Task</th><th>Assigned to</th><th>Project</th><th>Priority</th><th>Deadline</th><th>Status</th></tr></thead>
            <tbody>
              {assignedByMe.map((t) => (
                <tr key={t.id}>
                  <td>{t.title}</td><td>{t.assigned_employee}</td><td className="text-sm text-muted">{t.project || '—'}</td>
                  <td>{t.priority || '—'}</td><td className="text-sm text-muted">{t.deadline || '—'}</td>
                  <td><StatusBadge value={t.status || 'Not Started'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <KanbanBoard columns={[...TASK_STATUSES]} items={assignedByMe} onMove={(id, toColumn) => update(id, { status: toColumn as TaskStatus })}
            renderCard={(t) => (
              <div>
                <strong style={{ fontSize: 13 }}>{t.title}</strong>
                <div className="text-sm text-muted mt-1">{t.assigned_employee}</div>
              </div>
            )} />
        )}
      </div>

      {workload.length > 0 && (
        <div className="card">
          <strong>Team workload</strong>
          <div className="text-sm text-muted mt-1 mb-3">Open (non-verified) tasks per person.</div>
          <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
            {workload.map((w) => (
              <div key={w.name} className="card-flat p-3" style={{ minWidth: 160 }}>
                <div className="text-sm">{w.name}</div>
                <div className="text-xl font-bold" style={{ fontSize: 20, fontWeight: 700 }}>{w.count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {adding && (
        <Modal title="Assign Task" onClose={() => setAdding(false)} width={600}>
          <RecordForm
            fields={withEmployeeOptions(ASSIGN_FIELDS, assignableNames)}
            initial={{ status: 'Not Started', assigned_by: profile?.full_name, assigned_date: new Date().toISOString().slice(0, 10) } as any}
            onSubmit={(v) => { add({ ...v, status: 'Not Started', assigned_by: profile?.full_name } as any); setAdding(false); }}
            onCancel={() => setAdding(false)}
            submitLabel="Assign"
          />
        </Modal>
      )}
    </div>
  );
}

const SUBMIT_FIELDS: FieldDef[] = [
  { key: 'work_description', label: 'Work description', type: 'textarea', required: true },
  { key: 'actual_time_spent', label: 'Actual time spent', placeholder: 'e.g. 3 hours' },
  { key: 'output_delivered', label: 'Output delivered', type: 'textarea' },
  { key: 'challenges', label: 'Challenges faced', type: 'textarea' },
  { key: 'pending_work', label: 'Pending work, if any' },
];

export function MyTasksPage() {
  const { profile } = useApp();
  const { items, update } = useLocalCollection('tasks', 'Task');
  const mine = items.filter((t) => t.assigned_employee === profile?.full_name);
  const [submitting, setSubmitting] = useState<any>(null);
  const [view, setView] = useState<'list' | 'kanban'>('list');

  const act = (id: string, status: TaskStatus) => update(id, { status });

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <strong>My Tasks</strong>
          <div className="text-sm text-muted mt-1">
            Tasks assigned to {profile?.full_name}. Nothing shown here was entered by you — it's whatever a
            Manager/HR actually assigned.
          </div>
        </div>
        <div className="tabs-list">
          <button className={`tabs-trigger${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')}>List</button>
          <button className={`tabs-trigger${view === 'kanban' ? ' active' : ''}`} onClick={() => setView('kanban')}>Kanban</button>
        </div>
      </div>

      {mine.length === 0 ? (
        <div className="empty-state">
          No tasks assigned to you yet. Ask a Manager/HR to assign one to "{profile?.full_name}" from Task
          Assignment to see it appear here.
        </div>
      ) : view === 'kanban' ? (
        <KanbanBoard columns={[...TASK_STATUSES]} items={mine} onMove={(id, toColumn) => act(id, toColumn as TaskStatus)}
          renderCard={(t) => (
            <div>
              <strong style={{ fontSize: 13 }}>{t.title}</strong>
              {t.deadline && <div className="text-sm text-muted mt-1">Due {t.deadline}</div>}
            </div>
          )} />
      ) : (
        <div>
          {mine.map((t) => (
            <div key={t.id} className="card-flat p-4 mb-3">
              <div className="flex items-center justify-between mb-2">
                <strong>{t.title}</strong>
                <StatusBadge value={t.status || 'Not Started'} />
              </div>
              <div className="text-sm text-muted mb-2">
                {t.project && <span>{t.project} · </span>}
                {t.priority && <span>{t.priority} priority · </span>}
                {t.deadline && <span>Due {t.deadline}</span>}
              </div>
              {t.instructions && <div className="text-sm mb-3">{t.instructions}</div>}
              {t.manager_remarks && (
                <div className="badge badge-warning mb-3" style={{ display: 'block', width: 'fit-content' }}>
                  Manager feedback: {t.manager_remarks}
                </div>
              )}
              <div className="flex gap-2">
                {t.status === 'Not Started' && <button className="btn btn-secondary btn-sm" onClick={() => act(t.id, 'In Progress')}>Start Task</button>}
                {t.status === 'In Progress' && <button className="btn btn-secondary btn-sm" onClick={() => act(t.id, 'On Hold')}>Pause</button>}
                {t.status === 'On Hold' && <button className="btn btn-secondary btn-sm" onClick={() => act(t.id, 'In Progress')}>Resume</button>}
                {(t.status === 'In Progress' || t.status === 'On Hold' || t.status === 'Changes Requested') && (
                  <button className="btn btn-primary btn-sm" onClick={() => setSubmitting(t)}>Submit for Review</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {submitting && (
        <Modal title={`Submit: ${submitting.title}`} onClose={() => setSubmitting(null)} width={560}>
          <RecordForm
            fields={SUBMIT_FIELDS}
            onSubmit={(v) => {
              update(submitting.id, { ...v, status: 'Submitted for Review', submission_date: new Date().toISOString() });
              setSubmitting(null);
            }}
            onCancel={() => setSubmitting(null)}
            submitLabel="Submit"
          />
        </Modal>
      )}
    </div>
  );
}

export function WorkVerificationPage() {
  const { profile } = useApp();
  const { items, update } = useLocalCollection('tasks', 'Task');
  const pending = items.filter((t) => t.status === 'Submitted for Review');
  const [remarksFor, setRemarksFor] = useState<{ id: string; action: 'Changes Requested' | 'Rejected' } | null>(null);
  const [remarks, setRemarks] = useState('');

  const verify = (id: string) => update(id, { status: 'Verified', verified_by: profile?.full_name, verified_date: new Date().toISOString() });
  const applyDecision = () => {
    if (!remarksFor) return;
    update(remarksFor.id, { status: remarksFor.action, manager_remarks: remarks, verified_by: profile?.full_name });
    setRemarksFor(null); setRemarks('');
  };

  return (
    <div className="card">
      <strong>Work Verification Centre</strong>
      <div className="text-sm text-muted mt-1 mb-4">Submitted task reports awaiting your decision.</div>
      {pending.length === 0 ? (
        <div className="empty-state">Nothing waiting for verification right now.</div>
      ) : (
        pending.map((t) => (
          <div key={t.id} className="card-flat p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <strong>{t.title}</strong>
              <span className="text-sm text-muted">{t.assigned_employee}</span>
            </div>
            <div className="text-sm mb-1"><strong>Work description:</strong> {t.work_description || '—'}</div>
            <div className="text-sm mb-1"><strong>Time spent:</strong> {t.actual_time_spent || '—'}</div>
            {t.output_delivered && <div className="text-sm mb-1"><strong>Output:</strong> {t.output_delivered}</div>}
            {t.challenges && <div className="text-sm mb-1"><strong>Challenges:</strong> {t.challenges}</div>}
            {t.pending_work && <div className="text-sm mb-3"><strong>Pending work:</strong> {t.pending_work}</div>}
            <div className="flex gap-2 mt-3">
              <button className="btn btn-primary btn-sm" onClick={() => verify(t.id)}>Approve / Verify</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setRemarksFor({ id: t.id, action: 'Changes Requested' })}>Request Changes</button>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--av-error)' }} onClick={() => setRemarksFor({ id: t.id, action: 'Rejected' })}>Reject</button>
            </div>
          </div>
        ))
      )}

      {remarksFor && (
        <Modal title={remarksFor.action === 'Rejected' ? 'Reject — reason required' : 'Request changes — feedback'} onClose={() => setRemarksFor(null)}>
          <textarea className="input" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Feedback for the employee…" />
          <div className="flex justify-between mt-4">
            <button className="btn btn-secondary" onClick={() => setRemarksFor(null)}>Cancel</button>
            <button className="btn btn-primary" disabled={!remarks.trim()} onClick={applyDecision}>Confirm</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const VERIFIED_COLUMNS: DataTableColumn<any>[] = [
  { key: 'title', label: 'Task' },
  { key: 'assigned_employee', label: 'Employee' },
  { key: 'project', label: 'Project', render: (r) => <span className="text-sm text-muted">{r.project || '—'}</span> },
  { key: 'actual_time_spent', label: 'Time spent', render: (r) => <span className="text-sm text-muted">{r.actual_time_spent || '—'}</span> },
  { key: 'manager_remarks', label: 'Manager remarks', render: (r) => <span className="text-sm text-muted">{r.manager_remarks || '—'}</span> },
  { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status || 'Not Started'} /> },
];

export function VerifiedReportsPage() {
  const { items } = useLocalCollection('tasks', 'Task');
  const [filter, setFilter] = useState<'Verified' | 'Submitted for Review' | 'Changes Requested' | 'Rejected' | 'All'>('Verified');
  const filtered = filter === 'All' ? items : items.filter((t) => t.status === filter);

  const counts = {
    total: items.length,
    verified: items.filter((t) => t.status === 'Verified').length,
    pending: items.filter((t) => t.status === 'Submitted for Review').length,
    changes: items.filter((t) => t.status === 'Changes Requested').length,
    overdue: items.filter((t) => t.deadline && t.status !== 'Verified' && new Date(t.deadline) < new Date()).length,
  };

  const verifiedWeekly = useMemo(
    () => weeklyCountSeries(items.filter((t) => t.status === 'Verified'), 'verified_date', 8),
    [items]
  );

  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="kpi-card card"><div className="text-sm text-muted mb-1">Verified reports</div><div className="text-2xl font-bold" style={{ fontSize: 26 }}>{counts.verified}</div></div>
        <div className="kpi-card card"><div className="text-sm text-muted mb-1">Pending verification</div><div className="text-2xl font-bold" style={{ fontSize: 26 }}>{counts.pending}</div></div>
        <div className="kpi-card card"><div className="text-sm text-muted mb-1">Changes requested</div><div className="text-2xl font-bold" style={{ fontSize: 26 }}>{counts.changes}</div></div>
        <div className="kpi-card card"><div className="text-sm text-muted mb-1">Overdue (unverified)</div><div className="text-2xl font-bold" style={{ fontSize: 26 }}>{counts.overdue}</div></div>
      </div>

      <div className="report-chart-card mb-6">
        <ChartHeaderStat
          label="Task reports verified — this week vs. last week"
          value={verifiedWeekly.length ? verifiedWeekly[verifiedWeekly.length - 1].value : 0}
          pct={latestDeltaPct(verifiedWeekly)}
        />
        <div className="text-sm text-muted mt-1 mb-4">Built from each task's own verified date — grouped by week, last 8 weeks.</div>
        <AreaLineChart series={verifiedWeekly} color="var(--av-primary)" />
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <strong>Verified Task Reports</strong>
          <div className="tabs-list">
            {(['Verified', 'Submitted for Review', 'Changes Requested', 'Rejected', 'All'] as const).map((f) => (
              <button key={f} className={`tabs-trigger${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
        </div>
        <DataTable
          columns={VERIFIED_COLUMNS}
          rows={filtered}
          searchKeys={['title', 'assigned_employee', 'project']}
          searchPlaceholder="Search task or employee…"
          stickyHeader
          emptyState={<div className="empty-state">Nothing in this view yet.</div>}
        />
      </div>
      <div className="card empty-state mt-4">
        This is the per-task report trail — one row per individual task submission, verified by Manager/HR in
        Work Verification. For the separate employee Daily Report (one per person per day, aggregating multiple
        tasks with its own achievements/challenges/next-day plan), see "Daily Reports Overview" above — the two
        are never summed together, so nothing here double-counts time against that page.
      </div>
    </div>
  );
}
