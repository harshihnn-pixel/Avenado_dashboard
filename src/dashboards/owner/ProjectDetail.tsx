// The full 10-tab Project Detail page the Version 7.0 prompt calls for:
// Overview, Tasks, Team, Sales, Marketing, Inventory, Finance,
// Milestones & Risks, Activity, Issues — replacing the earlier simplified
// Drawer view. Modeled directly on the real production app's
// project-detail.js (same 10 tabs, same tab contents), rewired onto this
// frontend's shared local collections instead of Supabase tables. Every
// number is a live read of real project data (PROJECTS) plus whatever has
// actually been entered into leads/marketing/inventory/collections/
// expenses/commissions/tasks for this project — nothing invented.
import React, { useState } from 'react';
import type { Project } from '@/lib/os/types';
import { useLocalCollection } from '@/lib/os/useLocalCollection';
import { useAssignableNames } from '@/lib/os/employeeOptions';
import { PROJECT_STAFFING, capacityPercentFor, capacityTone } from '@/lib/os/mock-data';
import { EntityHeader, ProgressRing, KVGrid, StatusBar, StatTiles, DetailTabBar, PulseList } from '@/components/os/DetailUI';
import { StatusBadge } from '@/components/os/ListModule';
import { employeeTaskStats, completionColor } from '@/lib/os/projectMetrics';
import { CategoryBarChart } from '@/components/os/Charts';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'team', label: 'Team' },
  { key: 'sales', label: 'Sales' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'finance', label: 'Finance' },
  { key: 'milestones', label: 'Milestones & Risks' },
  { key: 'activity', label: 'Activity' },
  { key: 'issues', label: 'Issues' },
] as const;
type TabKey = typeof TABS[number]['key'];

const HEALTH_LABEL: Record<string, string> = { on_track: 'Healthy', at_risk: 'Attention Required', delayed: 'Critical', not_rated: 'Not rated' };
const HEALTH_TONE: Record<string, string> = { on_track: 'success', at_risk: 'warning', delayed: 'error', not_rated: 'neutral' };

const TASK_PROGRESS: Record<string, number> = {
  'Not Started': 0, 'In Progress': 40, 'On Hold': 40, 'Changes Requested': 60, 'Submitted for Review': 80, Rejected: 0, Verified: 100,
};

function todayISO() { return new Date().toISOString().slice(0, 10); }
function inr(n: any) { return n ? '₹' + Number(n).toLocaleString('en-IN') : '—'; }

export function ProjectDetail({ project, onBack }: { project: Project; onBack: () => void }) {
  const [tab, setTab] = useState<TabKey>('overview');
  const { items: overrides, update: updateOverride, add: addOverride } = useLocalCollection('project-overrides', 'Project Override');
  const override = overrides.find((o) => o.project_id === project.id) || {};
  const p = { ...project, ...override }; // override wins where set, real PROJECTS data otherwise

  const { items: allTasks } = useLocalCollection('tasks', 'Task');
  const { items: allLeads } = useLocalCollection('leads', 'Lead');
  const { items: allMarketing } = useLocalCollection('marketing', 'Campaign');
  const { items: allInventory } = useLocalCollection('inventory', 'Unit');
  const { items: allCollections } = useLocalCollection('collections', 'Collection');
  const { items: allExpenses } = useLocalCollection('expenses', 'Expense');
  const { items: allCommissions } = useLocalCollection('commissions', 'Commission');
  const { items: milestones, add: addMilestone, update: updateMilestone } = useLocalCollection('project-milestones', 'Milestone');
  const { items: risks, add: addRisk, update: updateRisk } = useLocalCollection('project-risks', 'Risk');
  // Called unconditionally here (not inline where it's used below, inside the
  // `tab === 'overview'` block) — a hook can't be called only on some renders.
  const assignableNames = useAssignableNames();

  const tasks = allTasks.filter((t) => t.project === project.name);
  const leads = allLeads.filter((l) => l.project === project.name);
  const marketing = allMarketing.filter((m) => m.project === project.name);
  const inventory = allInventory.filter((i) => i.project === project.name);
  const collections = allCollections.filter((c) => c.project === project.name);
  const expenses = allExpenses.filter((e) => e.project === project.name);
  const commissions = allCommissions.filter((c) => c.project === project.name);
  const projectMilestones = milestones.filter((m) => m.project === project.name);
  const projectRisks = risks.filter((r) => r.project === project.name);

  const today = todayISO();
  const completed = tasks.filter((t) => t.status === 'Verified').length;
  const completionPct = tasks.length ? Math.round((completed / tasks.length) * 100) : null;
  const overdueTasks = tasks.filter((t) => t.deadline && t.deadline < today && t.status !== 'Verified');
  const issueTasks = tasks.filter((t) => t.status === 'Rejected' || t.status === 'Changes Requested');
  const openHighRisks = projectRisks.filter((r) => r.status !== 'Closed' && (r.severity === 'High' || r.severity === 'Critical'));

  const setOverride = (patch: Record<string, any>) => {
    const existing = overrides.find((o) => o.project_id === project.id);
    if (existing) updateOverride(existing.id, patch);
    else addOverride({ project_id: project.id, ...patch } as any);
  };

  return (
    <div className="av-animate-in">
      <button className="btn btn-secondary btn-sm mb-4" onClick={onBack}>← Back to Projects</button>

      <EntityHeader
        name={p.name}
        sub={p.location || p.project_type || undefined}
        chips={[
          <span className={`badge badge-${HEALTH_TONE[p.health] || 'neutral'}`}>{HEALTH_LABEL[p.health] || 'Not rated'}</span>,
          p.stage,
          p.project_type,
          p.location,
        ].filter(Boolean) as React.ReactNode[]}
      />

      <StatTiles items={[
        { label: 'Open tasks', value: tasks.length - completed },
        { label: 'Critical issues', value: overdueTasks.length + issueTasks.length, tone: (overdueTasks.length + issueTasks.length) ? 'red' : undefined },
        { label: 'Sales status', value: leads.length === 0 ? 'No leads yet' : 'Tracked live' },
        { label: 'Marketing status', value: marketing.length === 0 ? 'No campaigns yet' : 'Tracked live' },
      ]} />

      <div className="mt-4">
        <DetailTabBar tabs={TABS as any} active={tab} onChange={(k) => setTab(k as TabKey)} />
      </div>

      {tab === 'overview' && (
        <div className="card av-animate-in">
          <div className="ring-row">
            <ProgressRing percent={completionPct} label="Task completion" />
            <div style={{ flex: 1, minWidth: 260 }}>
              <KVGrid items={[
                { label: 'Overall status', value: <span className={`badge badge-${HEALTH_TONE[p.health] || 'neutral'}`}>{HEALTH_LABEL[p.health] || 'Not rated'}</span> },
                { label: 'Project manager', value: p.manager_name || 'Not assigned' },
                { label: 'Stage', value: p.stage || 'Not set' },
                { label: 'Next milestone', value: p.next_step || 'Not set' },
                { label: 'Developer', value: p.developer || 'Not set' },
                { label: 'Location', value: p.location || 'Not set' },
                { label: 'Project type', value: p.project_type || 'Not set' },
                { label: 'Start date', value: p.start_date || '—' },
                { label: 'Launch date', value: p.launch_date || '—' },
              ]} />
            </div>
          </div>

          {(() => {
            const staffing = PROJECT_STAFFING.find((row) => row.project_id === project.id);
            if (!staffing) return null;
            const utilisation = capacityPercentFor(project.id);
            return (
              <>
                <hr style={{ border: 'none', borderTop: '1px solid var(--av-border)', margin: '20px 0' }} />
                <strong className="text-sm">30-day staffing target</strong>
                <div className="text-sm text-muted mt-1 mb-3">
                  From the CRM Staffing Model (your Excel, confirmed 1 Oct 2026) — the plan for this project, not a
                  log of what's happened yet. See the Sales and Finance tabs above for real, logged activity.
                </div>
                <StatTiles items={[
                  { label: 'Units to sell', value: staffing.units_to_sell },
                  { label: 'Site visits target', value: staffing.site_visits_per_month },
                  { label: 'Leads / day', value: staffing.calls_per_month },
                  { label: 'Recommended CRMs', value: staffing.recommended_crms },
                  { label: 'CRM capacity', value: `${utilisation}%`, tone: capacityTone(utilisation) },
                ]} />
              </>
            );
          })()}

          <hr style={{ border: 'none', borderTop: '1px solid var(--av-border)', margin: '20px 0' }} />
          <strong className="text-sm">Update this project</strong>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="field-label">Stage</label>
              <input className="input" defaultValue={p.stage || ''} onBlur={(e) => setOverride({ stage: e.target.value })} />
            </div>
            <div>
              <label className="field-label">Health</label>
              <select className="select" defaultValue={p.health} onChange={(e) => setOverride({ health: e.target.value })}>
                <option value="on_track">Healthy</option>
                <option value="at_risk">Attention Required</option>
                <option value="delayed">Critical</option>
                <option value="not_rated">Not rated</option>
              </select>
            </div>
            <div>
              <label className="field-label">Next milestone</label>
              <input className="input" defaultValue={p.next_step || ''} onBlur={(e) => setOverride({ next_step: e.target.value })} />
            </div>
            <div>
              <label className="field-label">Project manager</label>
              <select className="select" defaultValue={p.manager_name || ''} onChange={(e) => setOverride({ manager_name: e.target.value })}>
                <option value="">Not assigned</option>
                {assignableNames.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Developer</label>
              <input className="input" defaultValue={p.developer || ''} onBlur={(e) => setOverride({ developer: e.target.value })} />
            </div>
            <div>
              <label className="field-label">Location</label>
              <input className="input" defaultValue={p.location || ''} onBlur={(e) => setOverride({ location: e.target.value })} />
            </div>
            <div>
              <label className="field-label">Project type</label>
              <input className="input" defaultValue={p.project_type || ''} onBlur={(e) => setOverride({ project_type: e.target.value })} placeholder="e.g. Plotted development, Farmland, Residential" />
            </div>
            <div className="flex gap-3">
              <div style={{ flex: 1 }}>
                <label className="field-label">Start date</label>
                <input className="input" type="date" defaultValue={p.start_date || ''} onChange={(e) => setOverride({ start_date: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="field-label">Launch date</label>
                <input className="input" type="date" defaultValue={p.launch_date || ''} onChange={(e) => setOverride({ launch_date: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="text-sm text-muted mt-3">
            Stage/health/next-step shown above start from the real, last-verified values — anything you change here is saved as an override, kept separately from the verified source data.
          </div>
        </div>
      )}

      {tab === 'tasks' && (
        <div className="card av-animate-in">
          {tasks.length === 0 ? <div className="empty-state">No tasks on this project yet — assign one from Task Assignment.</div> : (
            <table className="table table-row-hover">
              <thead><tr><th>Task</th><th>Employee</th><th>Priority</th><th>Deadline</th><th>Status</th><th>Progress</th></tr></thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id}>
                    <td><strong>{t.title}</strong></td>
                    <td>{t.assigned_employee || '—'}</td>
                    <td>{t.priority || '—'}</td>
                    <td>{t.deadline || '—'}{t.deadline && t.deadline < today && t.status !== 'Verified' && <span className="badge badge-error ml-2">Overdue</span>}</td>
                    <td><StatusBadge value={t.status || 'Not Started'} /></td>
                    <td>{TASK_PROGRESS[t.status] ?? 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'team' && (
        <div className="card av-animate-in">
          {(() => {
            const rows = employeeTaskStats(tasks);
            if (rows.length === 0) return <div className="empty-state">No one has been assigned work on this project yet.</div>;
            return (
              <>
                <strong className="text-sm">Completion % by person</strong>
                <div className="mt-3">
                  <CategoryBarChart
                    items={rows.map((r) => ({ key: r.name, label: r.name, value: r.completionPct ?? 0, color: completionColor(r.completionPct) }))}
                    max={100}
                    formatValue={(v) => `${v}%`}
                  />
                </div>
                <table className="table mt-4">
                  <thead><tr><th>Employee</th><th>Tasks</th><th>Completed</th><th>Completion</th></tr></thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.name}>
                        <td>{r.name}</td>
                        <td>{r.totalTasks}</td>
                        <td>{r.completedTasks}</td>
                        <td style={{ color: completionColor(r.completionPct) }} className="font-semibold">{r.completionPct == null ? '—' : `${r.completionPct}%`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            );
          })()}
        </div>
      )}

      {tab === 'sales' && (
        <div className="av-animate-in">
          {leads.length === 0 ? <div className="card empty-state">No leads recorded for this project yet.</div> : (
            <>
              <StatTiles items={[
                { label: 'Total leads', value: leads.length },
                { label: 'Open', value: leads.filter((l) => !['Won', 'Closed Lost'].includes(l.stage)).length },
                { label: 'Won', value: leads.filter((l) => l.stage === 'Won').length, tone: 'green' },
                { label: 'Closed lost', value: leads.filter((l) => l.stage === 'Closed Lost').length },
              ]} />
              <div className="card mt-4">
                <table className="table">
                  <thead><tr><th>Lead</th><th>Stage</th><th>Source</th></tr></thead>
                  <tbody>{leads.map((l) => <tr key={l.id}><td>{l.name}</td><td><StatusBadge value={l.stage} /></td><td className="text-sm text-muted">{l.source || '—'}</td></tr>)}</tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'marketing' && (
        <div className="av-animate-in">
          {marketing.length === 0 ? <div className="card empty-state">No marketing spend recorded for this project yet.</div> : (() => {
            const totalSpend = marketing.reduce((s, m) => s + Number(m.spend || 0), 0);
            const totalLeads = marketing.reduce((s, m) => s + Number(m.leads_generated || 0), 0);
            return (
              <>
                <StatTiles items={[
                  { label: 'Total spend', value: inr(totalSpend) },
                  { label: 'Leads generated', value: totalLeads },
                  { label: 'Cost per lead', value: totalLeads ? inr(Math.round(totalSpend / totalLeads)) : '—' },
                ]} />
                <div className="card mt-4">
                  <table className="table">
                    <thead><tr><th>Campaign</th><th>Channel</th><th>Spend</th><th>Leads</th></tr></thead>
                    <tbody>{marketing.map((m) => <tr key={m.id}><td>{m.campaign}</td><td className="text-sm text-muted">{m.channel || '—'}</td><td>{inr(m.spend)}</td><td>{m.leads_generated || 0}</td></tr>)}</tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {tab === 'inventory' && (
        <div className="av-animate-in">
          {inventory.length === 0 ? <div className="card empty-state">No inventory units recorded for this project yet.</div> : (() => {
            const counts: Record<string, number> = {};
            inventory.forEach((u) => { counts[u.status || 'Available'] = (counts[u.status || 'Available'] || 0) + 1; });
            return (
              <>
                <StatTiles items={[
                  { label: 'Total units', value: inventory.length },
                  { label: 'Available', value: counts['Available'] || 0, tone: 'green' },
                  { label: 'Booked', value: counts['Booked'] || 0 },
                  { label: 'Sold', value: counts['Sold'] || 0 },
                ]} />
                <div className="card mt-4">
                  <table className="table">
                    <thead><tr><th>Unit</th><th>Type</th><th>Size</th><th>Price</th><th>Status</th></tr></thead>
                    <tbody>{inventory.map((u) => <tr key={u.id}><td>{u.unit}</td><td className="text-sm text-muted">{u.type || '—'}</td><td>{u.size || '—'}</td><td>{inr(u.price)}</td><td><StatusBadge value={u.status || 'Available'} /></td></tr>)}</tbody>
                  </table>
                </div>
                <p className="text-sm text-muted mt-2"><a href="#" onClick={(e) => e.preventDefault()}>Full Inventory module is in the sidebar →</a></p>
              </>
            );
          })()}
        </div>
      )}

      {tab === 'finance' && (
        <div className="av-animate-in">
          {collections.length === 0 && expenses.length === 0 && commissions.length === 0 ? (
            <div className="card empty-state">No financial records for this project yet.</div>
          ) : (() => {
            const collected = collections.reduce((s, c) => s + Number(c.amount || 0), 0);
            const paidExpenses = expenses.filter((e) => e.status === 'Paid').reduce((s, e) => s + Number(e.amount || 0), 0);
            const commissionPayable = commissions.filter((c) => c.status !== 'Paid').reduce((s, c) => s + Number(c.amount || 0), 0);
            return (
              <>
                <StatTiles items={[
                  { label: 'Collected', value: inr(collected), tone: 'green' },
                  { label: 'Expenses (paid)', value: inr(paidExpenses) },
                  { label: 'Commission payable', value: inr(commissionPayable), tone: commissionPayable ? 'amber' : undefined },
                ]} />
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="card">
                    <strong className="text-sm">Collections ({collections.length})</strong>
                    {collections.length === 0 ? <div className="empty-state mt-2">None yet.</div> : (
                      <table className="table mt-2"><thead><tr><th>Customer</th><th>Amount</th><th>Mode</th></tr></thead>
                        <tbody>{collections.map((c) => <tr key={c.id}><td>{c.customer_name}</td><td>{inr(c.amount)}</td><td className="text-sm text-muted">{c.mode || '—'}</td></tr>)}</tbody></table>
                    )}
                  </div>
                  <div className="card">
                    <strong className="text-sm">Expenses ({expenses.length})</strong>
                    {expenses.length === 0 ? <div className="empty-state mt-2">None yet.</div> : (
                      <table className="table mt-2"><thead><tr><th>Description</th><th>Amount</th><th>Status</th></tr></thead>
                        <tbody>{expenses.map((e) => <tr key={e.id}><td>{e.description}</td><td>{inr(e.amount)}</td><td><StatusBadge value={e.status || 'Pending'} /></td></tr>)}</tbody></table>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {tab === 'milestones' && (
        <MilestonesRisksTab
          milestones={projectMilestones} risks={projectRisks} today={today}
          onAddMilestone={(v) => addMilestone({ ...v, project: project.name } as any)}
          onAddRisk={(v) => addRisk({ ...v, project: project.name } as any)}
          onMarkMilestoneDone={(id) => updateMilestone(id, { status: 'Done' })}
          onAdvanceRisk={(id, current) => updateRisk(id, { status: current === 'Open' ? 'Mitigated' : 'Closed' })}
        />
      )}

      {tab === 'activity' && (
        <div className="card av-animate-in">
          {(() => {
            const events = tasks
              .filter((t) => t.submission_date || t.verified_date)
              .flatMap((t) => {
                const evs: { date: string; node: React.ReactNode }[] = [];
                if (t.submission_date) evs.push({ date: t.submission_date, node: <span><strong>{t.assigned_employee}</strong> submitted "{t.title}" <StatusBadge value="Submitted for Review" /></span> });
                if (t.verified_date) evs.push({ date: t.verified_date, node: <span><strong>{t.verified_by}</strong> {t.status === 'Verified' ? 'verified' : 'reviewed'} "{t.title}" <StatusBadge value={t.status} /></span> });
                return evs;
              })
              .sort((a, b) => (b.date > a.date ? 1 : -1));
            if (events.length === 0) return <div className="empty-state">No work updates submitted on this project yet.</div>;
            return <PulseList items={events.slice(0, 30).map((e, i) => ({ key: String(i), content: <>{e.node}<div className="text-sm text-muted">{new Date(e.date).toLocaleString('en-IN')}</div></> }))} />;
          })()}
        </div>
      )}

      {tab === 'issues' && (
        <div className="card av-animate-in">
          {overdueTasks.length === 0 && issueTasks.length === 0 && openHighRisks.length === 0 ? (
            <div className="empty-state">No issues on this project right now.</div>
          ) : (
            <PulseList items={[
              ...openHighRisks.map((r) => ({ key: 'risk-' + r.id, sev: 'high' as const, content: <>{r.severity} risk: {r.title}</> })),
              ...overdueTasks.map((t) => ({ key: 'od-' + t.id, sev: 'high' as const, content: <>Overdue: "{t.title}" ({t.assigned_employee})</> })),
              ...issueTasks.map((t) => ({ key: 'is-' + t.id, sev: 'medium' as const, content: <>{t.status}: "{t.title}" ({t.assigned_employee})</> })),
            ]} />
          )}
        </div>
      )}
    </div>
  );
}

function MilestonesRisksTab({ milestones, risks, today, onAddMilestone, onAddRisk, onMarkMilestoneDone, onAdvanceRisk }: {
  milestones: any[]; risks: any[]; today: string;
  onAddMilestone: (v: any) => void; onAddRisk: (v: any) => void;
  onMarkMilestoneDone: (id: string) => void; onAdvanceRisk: (id: string, current: string) => void;
}) {
  const [mTitle, setMTitle] = useState(''); const [mDue, setMDue] = useState(''); const [mStatus, setMStatus] = useState('Pending'); const [mNotes, setMNotes] = useState('');
  const [rTitle, setRTitle] = useState(''); const [rSeverity, setRSeverity] = useState('Medium'); const [rStatus, setRStatus] = useState('Open'); const [rDesc, setRDesc] = useState('');

  const mBreakdown = ['Pending', 'In Progress', 'Done', 'Blocked'].map((s) => ({
    key: s, label: s, cls: s === 'Done' ? 'verified' : s === 'Blocked' ? 'incorrect' : s === 'In Progress' ? 'progress' : 'pending',
    value: milestones.filter((m) => (m.status || 'Pending') === s).length,
  }));
  const rBreakdown = ['Low', 'Medium', 'High', 'Critical'].map((s) => ({
    key: s, label: s, cls: s === 'Critical' ? 'incorrect' : s === 'High' ? 'clarify' : s === 'Medium' ? 'progress' : 'pending',
    value: risks.filter((r) => (r.severity || 'Medium') === s).length,
  }));

  return (
    <div className="av-animate-in">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="card">
          <strong className="text-sm">Add a milestone</strong>
          <div className="grid gap-2 mt-3">
            <input className="input" placeholder="Title" value={mTitle} onChange={(e) => setMTitle(e.target.value)} />
            <div className="flex gap-2">
              <input className="input" type="date" value={mDue} onChange={(e) => setMDue(e.target.value)} />
              <select className="select" value={mStatus} onChange={(e) => setMStatus(e.target.value)}>
                {['Pending', 'In Progress', 'Done', 'Blocked'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <input className="input" placeholder="Notes" value={mNotes} onChange={(e) => setMNotes(e.target.value)} />
            <button className="btn btn-primary btn-sm" disabled={!mTitle.trim()} onClick={() => { onAddMilestone({ title: mTitle, due_date: mDue, status: mStatus, notes: mNotes }); setMTitle(''); setMDue(''); setMStatus('Pending'); setMNotes(''); }}>Add milestone</button>
          </div>
        </div>
        <div className="card">
          <strong className="text-sm">Add a risk</strong>
          <div className="grid gap-2 mt-3">
            <input className="input" placeholder="Title" value={rTitle} onChange={(e) => setRTitle(e.target.value)} />
            <div className="flex gap-2">
              <select className="select" value={rSeverity} onChange={(e) => setRSeverity(e.target.value)}>
                {['Low', 'Medium', 'High', 'Critical'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select className="select" value={rStatus} onChange={(e) => setRStatus(e.target.value)}>
                {['Open', 'Mitigated', 'Closed'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <input className="input" placeholder="Description" value={rDesc} onChange={(e) => setRDesc(e.target.value)} />
            <button className="btn btn-primary btn-sm" disabled={!rTitle.trim()} onClick={() => { onAddRisk({ title: rTitle, severity: rSeverity, status: rStatus, description: rDesc }); setRTitle(''); setRSeverity('Medium'); setRStatus('Open'); setRDesc(''); }}>Add risk</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <strong className="text-sm">Milestones ({milestones.length})</strong>
          {milestones.length === 0 ? <div className="card empty-state mt-2">No milestones recorded yet.</div> : (
            <>
              <div className="card mt-2"><StatusBar segments={mBreakdown} /></div>
              <table className="table mt-2">
                <thead><tr><th>Title</th><th>Due</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {milestones.map((m) => (
                    <tr key={m.id}>
                      <td>{m.title}{m.notes && <div className="text-sm text-muted">{m.notes}</div>}</td>
                      <td className="text-sm text-muted">{m.due_date || '—'}{m.due_date && m.due_date < today && m.status !== 'Done' && <span className="badge badge-error ml-2">Overdue</span>}</td>
                      <td><StatusBadge value={m.status || 'Pending'} /></td>
                      <td>{m.status !== 'Done' && <button className="btn btn-ghost btn-sm" onClick={() => onMarkMilestoneDone(m.id)}>Mark done</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
        <div>
          <strong className="text-sm">Risks ({risks.length})</strong>
          {risks.length === 0 ? <div className="card empty-state mt-2">No risks logged yet.</div> : (
            <>
              <div className="card mt-2"><StatusBar segments={rBreakdown} /></div>
              <table className="table mt-2">
                <thead><tr><th>Title</th><th>Severity</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {risks.map((r) => (
                    <tr key={r.id}>
                      <td>{r.title}{r.description && <div className="text-sm text-muted">{r.description}</div>}</td>
                      <td><StatusBadge value={r.severity || 'Medium'} /></td>
                      <td>{r.status || 'Open'}</td>
                      <td>{r.status !== 'Closed' && <button className="btn btn-ghost btn-sm" onClick={() => onAdvanceRisk(r.id, r.status || 'Open')}>{(r.status || 'Open') === 'Open' ? 'Mark mitigated' : 'Close'}</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
