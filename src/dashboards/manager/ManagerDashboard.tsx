// Team Command Centre — the Manager/HR portal's overview. Every figure is
// computed live from the shared collections (tasks, daily-reports,
// leave-requests, allowance, attendance-corrections, leads, recruitment).
import React from 'react';
import { useApp } from '@/lib/os/store';
import { useLocalCollection } from '@/lib/os/useLocalCollection';
import { PROFILES } from '@/lib/os/mock-data';
import { StatusBadge } from '@/components/os/ListModule';
import { KpiCard, PageHeader, SectionHead, StatusBar, greeting, todayLabel, initialsOf } from '@/components/os/DetailUI';
import { useGoTo } from '@/components/os/nav-context';
import { firstName, taskStatusSegments } from '@/dashboards/shared/taskBreakdown';
import {
  IconUsers, IconFileCheck, IconFile, IconTarget, IconUserPlus, IconPlane, IconCalendarClock, IconWallet,
  IconListTodo, IconBadge, IconArrowRight, IconCircleCheck, IconInbox,
} from '@/components/os/icons';

export function ManagerDashboard() {
  const go = useGoTo();
  const { subRole, profile } = useApp();
  const isHr = subRole === 'hr';
  const roleLabel = isHr ? 'HR' : 'Manager';

  const { items: team } = useLocalCollection('team-members', 'Team Member');
  const { items: tasks } = useLocalCollection('tasks', 'Task');
  const { items: dailyReports } = useLocalCollection('daily-reports', 'Daily Report');
  const { items: leave } = useLocalCollection('leave-requests', 'Leave Request');
  const { items: allowance } = useLocalCollection('allowance', 'Allowance Claim');
  const { items: corrections } = useLocalCollection('attendance-corrections', 'Correction Request');
  const { items: leads } = useLocalCollection('leads', 'Lead');
  const { items: recruitment } = useLocalCollection('recruitment', 'Candidate');

  const headcount = team.length + PROFILES.filter((p) => p.isRealPerson).length;
  const tasksAwaitingReview = tasks.filter((t) => t.status === 'Submitted for Review').length;
  const reportsAwaitingReview = dailyReports.filter((r) => r.verification_status === 'Submitted').length;
  const pendingLeave = leave.filter((l) => (l.status || 'Pending') === 'Pending').length;
  const pendingAllowance = allowance.filter((a) => (a.status || 'Pending') === 'Pending').length;
  const pendingCorrections = corrections.filter((c) => (c.status || 'Pending') === 'Pending').length;
  const openLeads = leads.filter((l) => l.stage && l.stage !== 'Closed Lost' && l.stage !== 'Won').length;
  const activeCandidates = recruitment.filter((r) => r.stage && !['Hired', 'Rejected'].includes(r.stage)).length;

  const actions = [
    { label: 'Task reports to verify', count: tasksAwaitingReview, key: 'mgr-verify', icon: IconFileCheck },
    { label: 'Daily reports to verify', count: reportsAwaitingReview, key: 'mgr-daily-verify', icon: IconFile },
    { label: 'Leave requests', count: pendingLeave, key: 'mgr-leave', icon: IconPlane },
    { label: 'Attendance corrections', count: pendingCorrections, key: 'mgr-attendance-corrections', icon: IconCalendarClock },
    ...(isHr ? [{ label: 'Allowance claims', count: pendingAllowance, key: 'hr-allowance', icon: IconWallet }] : []),
  ];
  const totalPending = actions.reduce((s, a) => s + a.count, 0);

  const recentTasks = [...tasks]
    .sort((a, b) => (b.assigned_date || '').localeCompare(a.assigned_date || ''))
    .slice(0, 7);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`${roleLabel} command centre · ${todayLabel()}`}
        title={`${greeting()}, ${firstName(profile?.full_name)}`}
        sub={totalPending ? `${totalPending} item${totalPending === 1 ? '' : 's'} waiting on your review.` : 'Nothing is waiting on your review right now.'}
        actions={<>
          <button className="btn btn-secondary" onClick={() => go('mgr-verify')}><IconBadge /> Verify work</button>
          <button className="btn btn-primary" onClick={() => go('mgr-assign')}><IconListTodo /> Assign a task</button>
        </>}
      />

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Team headcount" value={headcount} icon={IconUsers} tone="accent" hint="Employee management" onClick={() => go('mgr-directory')} />
        <KpiCard label="Task reports to verify" value={tasksAwaitingReview} icon={IconFileCheck} tone={tasksAwaitingReview ? 'warning' : 'success'} hint={tasksAwaitingReview ? 'Awaiting your review' : 'All caught up'} onClick={() => go('mgr-verify')} />
        <KpiCard label="Daily reports to verify" value={reportsAwaitingReview} icon={IconFile} tone={reportsAwaitingReview ? 'warning' : 'success'} hint={reportsAwaitingReview ? 'Awaiting your review' : 'All caught up'} onClick={() => go('mgr-daily-verify')} />
        {isHr
          ? <KpiCard label="Active candidates" value={activeCandidates} icon={IconUserPlus} tone="violet" hint="In recruitment pipeline" onClick={() => go('hr-recruitment')} />
          : <KpiCard label="Open leads" value={openLeads} icon={IconTarget} tone="violet" hint="My leads & pipeline" onClick={() => go('mgr-leads')} />}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <SectionHead title="Action centre" sub="Pending approvals and reviews" />
          <div className="flex flex-col gap-2">
            {actions.map((a) => (
              <button key={a.key} type="button" className="action-row" onClick={() => go(a.key)}>
                <span className={`kpi-icon ${a.count ? 'tone-warning' : 'tone-neutral'}`}><a.icon size={16} /></span>
                <span className="text-sm" style={{ flex: 1 }}>{a.label}</span>
                {a.count ? <span className="ar-count">{a.count}</span> : <IconCircleCheck size={16} className="text-success" />}
              </button>
            ))}
          </div>
        </div>

        <div className="card col-span-2" style={{ padding: 0 }}>
          <div style={{ padding: '18px 20px 6px' }}>
            <SectionHead title="Recent task activity" sub="Latest assignments across your team" action={<button className="btn btn-ghost btn-sm" onClick={() => go('mgr-assign')}>Task assignment <IconArrowRight /></button>} />
          </div>
          {recentTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><IconInbox size={18} /></div>
              <strong>No tasks assigned yet</strong>
              Assign one from Task Assignment to see it here.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table table-row-hover">
                <thead><tr><th style={{ paddingLeft: 20 }}>Task</th><th>Assigned to</th><th>Project</th><th style={{ paddingRight: 20 }}>Status</th></tr></thead>
                <tbody>
                  {recentTasks.map((t) => (
                    <tr key={t.id} onClick={() => go(t.status === 'Submitted for Review' ? 'mgr-verify' : 'mgr-assign')}>
                      <td style={{ paddingLeft: 20 }} className="font-medium">{t.title}</td>
                      <td>
                        <span className="flex items-center gap-2">
                          <span className="avatar avatar-soft" style={{ width: 24, height: 24, fontSize: 10 }}>{initialsOf(t.assigned_employee)}</span>
                          <span className="text-sm">{t.assigned_employee || '—'}</span>
                        </span>
                      </td>
                      <td className="text-sm text-muted">{t.project || '—'}</td>
                      <td style={{ paddingRight: 20 }}><StatusBadge value={t.status || 'Not Started'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <SectionHead title="Task pipeline" sub={`${tasks.length} task${tasks.length === 1 ? '' : 's'} across every status`} />
        <StatusBar segments={taskStatusSegments(tasks)} />
      </div>
    </div>
  );
}
