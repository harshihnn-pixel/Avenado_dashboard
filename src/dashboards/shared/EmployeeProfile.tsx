// The 10-section Employee Profile the Version 7.0 prompt calls for:
// Overview, Personal & Employment Details, Attendance, Assigned Tasks,
// Daily Work Reports, Productivity, Challenges, Customer Feedback,
// Leave & Allowances, Activity History — built entirely from the existing
// shared records (team-members / PROFILES, tasks, attendance,
// daily-reports, challenges, customer-feedback, leave-requests, allowance,
// activity log), never a second copy of any of it.
import React, { useState } from 'react';
import { useLocalCollection } from '@/lib/os/useLocalCollection';
import { useApp } from '@/lib/os/store';
import { PROFILES } from '@/lib/os/mock-data';
import { readActivity } from '@/lib/os/activity';
import { StatusBadge } from '@/components/os/ListModule';
import { EntityHeader, StatTiles, DetailTabBar, KVGrid, PulseList } from '@/components/os/DetailUI';
import { daysActiveFor, completionColor } from '@/lib/os/projectMetrics';
import { RadialGaugeGrid } from '@/components/os/Charts';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'personal', label: 'Personal & Employment' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'tasks', label: 'Assigned Tasks' },
  { key: 'daily', label: 'Daily Work Reports' },
  { key: 'productivity', label: 'Productivity' },
  { key: 'challenges', label: 'Challenges' },
  { key: 'feedback', label: 'Customer Feedback' },
  { key: 'leave', label: 'Leave & Allowances' },
  { key: 'activity', label: 'Activity History' },
] as const;
type TabKey = typeof TABS[number]['key'];

export function EmployeeProfilePage({ employeeName }: { employeeName?: string }) {
  const { profile, role } = useApp();
  const name = employeeName || profile?.full_name || '';
  const [tab, setTab] = useState<TabKey>('overview');
  // Manager/HR can see everything else about a person here, just not their
  // email address — an Owner, or the person viewing their own profile, still can.
  const showEmail = role !== 'manager-hr';

  const { items: team } = useLocalCollection('team-members', 'Team Member');
  const { items: tasks } = useLocalCollection('tasks', 'Task');
  const { items: attendance } = useLocalCollection('attendance', 'Attendance');
  const { items: dailyReports } = useLocalCollection('daily-reports', 'Daily Report');
  const { items: challenges } = useLocalCollection('challenges', 'Challenge');
  const { items: feedback } = useLocalCollection('customer-feedback', 'Feedback');
  const { items: leave } = useLocalCollection('leave-requests', 'Leave Request');
  const { items: allowance } = useLocalCollection('allowance', 'Allowance Claim');
  // A real, person-entered target — never invented. Only an Owner or
  // Manager/HR can set it; an employee viewing their own profile sees it
  // read-only. One row per person, upserted in place (see setTarget below)
  // rather than kept as a history, since only "the current target" matters
  // here.
  const { items: targets, add: addTarget, update: updateTarget } = useLocalCollection('employee-targets', 'Employee Target');
  const canEditTarget = role === 'owner' || role === 'manager-hr';

  const real = PROFILES.find((p) => p.isRealPerson && p.full_name === name);
  const teamRecord = team.find((t) => t.full_name === name);
  const person = real
    ? { full_name: real.full_name, email: real.email, designation: real.designation, role: real.role }
    : teamRecord || { full_name: name };

  const myTasks = tasks.filter((t) => t.assigned_employee === name);
  const myAttendance = attendance.filter((a) => a.employee_name === name);
  const myReports = dailyReports.filter((r) => r.employee_name === name);
  const myChallenges = challenges.filter((c) => c.raised_to === name || c.created_by === name);
  const myFeedback = feedback.filter((f) => f.action_owner === name);
  const myLeave = leave.filter((l) => l.employee_name === name);
  const myAllowance = allowance.filter((a) => a.approved_by === name || a.employee_name === name);

  const openTasks = myTasks.filter((t) => t.status !== 'Verified').length;
  const overdueTasks = myTasks.filter((t) => t.deadline && t.deadline < new Date().toISOString().slice(0, 10) && t.status !== 'Verified').length;
  const verifiedCount = myTasks.filter((t) => t.status === 'Verified').length;
  const daysActive = daysActiveFor(dailyReports, name);
  const targetRow = targets.find((t) => t.employee_name === name);
  const targetTasks: number | null = targetRow?.target_tasks != null ? Number(targetRow.target_tasks) : null;
  const targetPct = targetTasks ? Math.min(100, Math.round((verifiedCount / targetTasks) * 100)) : null;

  const setTarget = (value: number | null) => {
    if (targetRow) updateTarget(targetRow.id, { target_tasks: value });
    else addTarget({ employee_name: name, target_tasks: value } as any);
  };

  return (
    <div className="av-animate-in">
      <EntityHeader
        name={person.full_name || name}
        sub={showEmail ? (person as any).email : undefined}
        chips={[
          (person as any).role && <span key="role">{String((person as any).role).replace('-', ' / ')}</span>,
          (person as any).designation,
          (person as any).department,
          (person as any).employee_id && `ID: ${(person as any).employee_id}`,
        ].filter(Boolean) as React.ReactNode[]}
      />

      <StatTiles items={[
        { label: 'Open tasks', value: openTasks },
        { label: 'Overdue tasks', value: overdueTasks, tone: overdueTasks ? 'red' : undefined },
        { label: 'Verified tasks', value: verifiedCount, tone: 'green' },
        { label: 'Daily reports', value: myReports.length },
      ]} />

      <div className="mt-4"><DetailTabBar tabs={TABS as any} active={tab} onChange={(k) => setTab(k as TabKey)} /></div>

      {tab === 'overview' && (
        <div className="card av-animate-in">
          <KVGrid items={[
            { label: 'Role', value: (person as any).role ? String((person as any).role).replace('-', ' / ') : '—' },
            { label: 'Designation', value: (person as any).designation || '—' },
            { label: 'Department', value: (person as any).department || '—' },
            { label: 'Reporting manager', value: (person as any).reporting_manager || '—' },
            { label: 'Assigned project', value: (person as any).assigned_project || '—' },
            { label: 'Status', value: <StatusBadge value={(person as any).status || 'Active'} /> },
          ]} />
        </div>
      )}

      {tab === 'personal' && (
        <div className="card av-animate-in">
          {real ? (
            <div className="empty-state">Real founder account — personal/employment fields aren't editable demo records here.{showEmail ? ` Email: ${real.email}` : ''}</div>
          ) : (
            <KVGrid items={[
              { label: 'Employee ID', value: (teamRecord as any)?.employee_id || '—' },
              ...(showEmail ? [{ label: 'Email', value: (teamRecord as any)?.email || '—' }] : []),
              { label: 'Phone', value: (teamRecord as any)?.phone || '—' },
              { label: 'Designation', value: (teamRecord as any)?.designation || '—' },
              { label: 'Department', value: (teamRecord as any)?.department || '—' },
              { label: 'Employment type', value: (teamRecord as any)?.employment_type || '—' },
              { label: 'Date of joining', value: (teamRecord as any)?.date_of_joining || '—' },
              { label: 'Reporting manager', value: (teamRecord as any)?.reporting_manager || '—' },
              { label: 'Assigned project', value: (teamRecord as any)?.assigned_project || '—' },
              { label: 'Work location', value: (teamRecord as any)?.work_location || '—' },
              { label: 'Employment status', value: <StatusBadge value={(teamRecord as any)?.status || 'Active'} /> },
            ]} />
          )}
          {!real && !teamRecord && <div className="empty-state">No Employee Management record found for this name yet.</div>}
        </div>
      )}

      {tab === 'attendance' && (
        <div className="card av-animate-in">
          {myAttendance.length === 0 ? <div className="empty-state">No attendance recorded yet.</div> : (
            <table className="table"><thead><tr><th>Date</th><th>Check-in</th><th>Check-out</th></tr></thead>
              <tbody>{myAttendance.slice(0, 30).map((a) => <tr key={a.id}><td>{a.date}</td><td>{a.check_in_time || '—'}</td><td>{a.check_out_time || '—'}</td></tr>)}</tbody></table>
          )}
        </div>
      )}

      {tab === 'tasks' && (
        <div className="card av-animate-in">
          {myTasks.length === 0 ? <div className="empty-state">No tasks assigned yet.</div> : (
            <table className="table"><thead><tr><th>Task</th><th>Project</th><th>Priority</th><th>Deadline</th><th>Status</th></tr></thead>
              <tbody>{myTasks.map((t) => <tr key={t.id}><td>{t.title}</td><td className="text-sm text-muted">{t.project || '—'}</td><td>{t.priority || '—'}</td><td className="text-sm text-muted">{t.deadline || '—'}</td><td><StatusBadge value={t.status || 'Not Started'} /></td></tr>)}</tbody></table>
          )}
        </div>
      )}

      {tab === 'daily' && (
        <div className="card av-animate-in">
          {myReports.length === 0 ? <div className="empty-state">No daily reports submitted yet.</div> : (
            <table className="table"><thead><tr><th>Date</th><th>Project</th><th>Worked on</th><th>Completed</th><th>Duration</th><th>Status</th></tr></thead>
              <tbody>{myReports.map((r) => <tr key={r.id}><td>{r.reporting_date}</td><td className="text-sm text-muted">{r.project || '—'}</td><td>{(r.tasks_worked_on || []).length}</td><td>{(r.tasks_completed || []).length}</td><td className="text-sm text-muted">{r.total_work_duration || '—'}</td><td><StatusBadge value={r.verification_status || 'Submitted'} /></td></tr>)}</tbody></table>
          )}
        </div>
      )}

      {tab === 'productivity' && (
        <div className="av-animate-in">
          <StatTiles items={[
            { label: 'Tasks assigned (all time)', value: myTasks.length },
            { label: 'Tasks verified', value: verifiedCount, tone: 'green' },
            { label: 'Daily reports submitted', value: myReports.length },
            { label: 'Days active', value: daysActive },
          ]} />

          <div className="card mt-4">
            <strong className="text-sm">Target</strong>
            <div className="text-sm text-muted mt-1 mb-3">
              {canEditTarget
                ? 'A real, entered target for this person — not calculated or guessed. Leave blank to clear it.'
                : 'Set by an Owner or Manager/HR. Progress below is live against this number, computed from real verified tasks.'}
            </div>
            {canEditTarget ? (
              <div className="flex items-center gap-3" style={{ maxWidth: 320 }}>
                <input
                  className="input"
                  type="number"
                  min={0}
                  placeholder="e.g. 20 tasks this month"
                  defaultValue={targetTasks ?? ''}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    setTarget(v === '' ? null : Math.max(0, Number(v)));
                  }}
                />
                <span className="text-sm text-muted">tasks</span>
              </div>
            ) : (
              <div className="text-sm">{targetTasks != null ? `${targetTasks} tasks` : 'No target set yet.'}</div>
            )}

            {targetTasks != null && (
              <div className="mt-4">
                <RadialGaugeGrid
                  items={[{ key: 'target', label: 'Verified vs. target', value: verifiedCount, max: targetTasks, color: completionColor(targetPct), sublabel: `${verifiedCount} of ${targetTasks} verified` }]}
                  formatValue={(v) => `${targetPct ?? 0}%`}
                />
              </div>
            )}
          </div>

          <div className="card mt-4 empty-state">
            Mirrors the workbook's automatic "Daily Summary" sheet (open tasks, overdue tasks, hours logged) — computed live from the
            same task/attendance/daily-report records above, not a separately maintained figure.
          </div>
        </div>
      )}

      {tab === 'challenges' && (
        <div className="card av-animate-in">
          {myChallenges.length === 0 ? <div className="empty-state">No challenges raised to this person yet.</div> : (
            <table className="table"><thead><tr><th>Date</th><th>Particulars</th><th>Priority</th><th>Status</th></tr></thead>
              <tbody>{myChallenges.map((c) => <tr key={c.id}><td className="text-sm text-muted">{c.date_raised}</td><td>{c.particulars}</td><td>{c.priority || '—'}</td><td><StatusBadge value={c.solution ? 'Resolved' : 'Open'} /></td></tr>)}</tbody></table>
          )}
        </div>
      )}

      {tab === 'feedback' && (
        <div className="card av-animate-in">
          {myFeedback.length === 0 ? <div className="empty-state">No customer feedback action items for this person yet.</div> : (
            <table className="table"><thead><tr><th>Customer</th><th>Project</th><th>Expectation met</th><th>Rating</th></tr></thead>
              <tbody>{myFeedback.map((f) => <tr key={f.id}><td>{f.customer_name}</td><td className="text-sm text-muted">{f.project || '—'}</td><td><StatusBadge value={f.expectation_met || '—'} /></td><td>{f.rating || '—'}</td></tr>)}</tbody></table>
          )}
        </div>
      )}

      {tab === 'leave' && (
        <div className="av-animate-in">
          <div className="card mb-4">
            <strong className="text-sm">Leave requests</strong>
            {myLeave.length === 0 ? <div className="empty-state mt-2">None yet.</div> : (
              <table className="table mt-2"><thead><tr><th>From</th><th>To</th><th>Status</th></tr></thead>
                <tbody>{myLeave.map((l) => <tr key={l.id}><td>{l.from_date}</td><td>{l.to_date}</td><td><StatusBadge value={l.status || 'Pending'} /></td></tr>)}</tbody></table>
            )}
          </div>
          <div className="card">
            <strong className="text-sm">Allowance claims</strong>
            {myAllowance.length === 0 ? <div className="empty-state mt-2">None yet.</div> : (
              <table className="table mt-2"><thead><tr><th>Date</th><th>Particulars</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>{myAllowance.map((a) => <tr key={a.id}><td className="text-sm text-muted">{a.date}</td><td>{a.particulars}</td><td>{a.amount ? '₹' + Number(a.amount).toLocaleString('en-IN') : '—'}</td><td><StatusBadge value={a.status || 'Pending'} /></td></tr>)}</tbody></table>
            )}
          </div>
        </div>
      )}

      {tab === 'activity' && (
        <div className="card av-animate-in">
          {(() => {
            const entries = readActivity().filter((e) => (e.text || '').includes(name)).slice(0, 40);
            if (entries.length === 0) return <div className="empty-state">No activity log entries explicitly mention this person yet — see the full Activity/Audit Log for everything.</div>;
            return <PulseList items={entries.map((e) => ({ key: e.id, content: <>{e.text}<div className="text-sm text-muted">{new Date(e.at).toLocaleString('en-IN')}</div></> }))} />;
          })()}
        </div>
      )}
    </div>
  );
}
