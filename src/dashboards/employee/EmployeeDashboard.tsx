// My Dashboard — the Employee portal's overview. Computed from the same
// shared `tasks`, `daily-reports` and `attendance` collections the rest of
// the Employee portal reads and writes. Nothing here is invented.
import React from 'react';
import { useApp } from '@/lib/os/store';
import { useLocalCollection } from '@/lib/os/useLocalCollection';
import { StatusBadge } from '@/components/os/ListModule';
import { KpiCard, SectionHead, StatusBar, ProgressRing, greeting, todayLabel } from '@/components/os/DetailUI';
import { useGoTo } from '@/components/os/nav-context';
import { firstName, taskStatusSegments } from '@/dashboards/shared/taskBreakdown';
import {
  IconAlert, IconListTodo, IconBadge, IconCalendar, IconFile, IconSunrise, IconArrowRight, IconCircleCheck, IconInbox, IconClock,
} from '@/components/os/icons';

function todayStr() { return new Date().toISOString().slice(0, 10); }

export function EmployeeDashboard() {
  const go = useGoTo();
  const { profile } = useApp();
  const { items: tasks } = useLocalCollection('tasks', 'Task');
  const { items: dailyReports } = useLocalCollection('daily-reports', 'Daily Report');
  const { items: attendance } = useLocalCollection('attendance', 'Attendance');

  const mine = tasks.filter((t) => t.assigned_employee === profile?.full_name);
  const open = mine.filter((t) => t.status !== 'Verified');
  const verified = mine.filter((t) => t.status === 'Verified');
  const needsAction = mine.filter((t) => t.status === 'Changes Requested' || t.status === 'Rejected');
  const completion = mine.length ? Math.round((verified.length / mine.length) * 100) : null;

  const myReports = dailyReports.filter((r) => r.employee_name === profile?.full_name);
  const todayReportSubmitted = myReports.some((r) => r.reporting_date === todayStr());
  const checkedInToday = attendance.some((a) => a.employee_name === profile?.full_name && a.date === todayStr());

  const upNext = [...open]
    .sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999'))
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-6">
      <section className="welcome-card" aria-label="Today">
        <div className="flex items-start justify-between gap-6" style={{ flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div className="text-xs" style={{ color: 'var(--av-text-faint)', fontWeight: 600 }}>{todayLabel()}</div>
            <h2 style={{ marginTop: 6 }}>{greeting()}, {firstName(profile?.full_name)}</h2>
            <div className="wc-sub">{profile?.designation || 'Employee'}</div>
            <div className="flex gap-2 mt-4" style={{ flexWrap: 'wrap' }}>
              <span className="wc-chip">
                <span className={`wc-dot ${checkedInToday ? 'ok' : 'warn'}`} />
                {checkedInToday ? 'Checked in today' : 'Not checked in yet'}
              </span>
              <span className="wc-chip">
                <span className={`wc-dot ${todayReportSubmitted ? 'ok' : 'warn'}`} />
                {todayReportSubmitted ? 'Daily report submitted' : 'Daily report pending'}
              </span>
            </div>
          </div>
          <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-on-dark" onClick={() => go('emp-attendance')}><IconCalendar /> {checkedInToday ? 'Attendance' : 'Check in'}</button>
            <button className="btn btn-on-dark" onClick={() => go('emp-today')}><IconSunrise /> Today’s work</button>
            <button className="btn btn-primary" onClick={() => go('emp-daily-report')}><IconFile /> {todayReportSubmitted ? 'View daily report' : 'Submit daily report'}</button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Open tasks" value={open.length} icon={IconListTodo} tone="accent" hint="Assigned to you" onClick={() => go('emp-tasks')} />
        <KpiCard label="Verified tasks" value={verified.length} icon={IconBadge} tone="success" hint="Approved by your manager" onClick={() => go('emp-tasks')} />
        <KpiCard label="Sent back" value={needsAction.length} icon={needsAction.length ? IconAlert : IconCircleCheck} tone={needsAction.length ? 'warning' : 'success'} hint={needsAction.length ? 'Need changes from you' : 'Nothing sent back'} onClick={() => go('emp-tasks')} />
        <KpiCard label="Daily reports filed" value={myReports.length} icon={IconFile} tone="violet" hint={todayReportSubmitted ? "Today's is in" : "Today's still pending"} onClick={() => go('emp-daily-report')} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card col-span-2" style={{ padding: 0 }}>
          <div style={{ padding: '18px 20px 6px' }}>
            <SectionHead title="Up next" sub="Open tasks, soonest deadline first" action={<button className="btn btn-ghost btn-sm" onClick={() => go('emp-tasks')}>My tasks <IconArrowRight /></button>} />
          </div>
          {upNext.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><IconInbox size={18} /></div>
              <strong>No open tasks right now</strong>
              Your manager assigns work from Task Assignment.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table table-row-hover">
                <thead><tr><th style={{ paddingLeft: 20 }}>Task</th><th>Project</th><th>Deadline</th><th style={{ paddingRight: 20 }}>Status</th></tr></thead>
                <tbody>
                  {upNext.map((t) => (
                    <tr key={t.id} onClick={() => go('emp-tasks')}>
                      <td style={{ paddingLeft: 20 }} className="font-medium">{t.title}</td>
                      <td className="text-sm text-muted">{t.project || '—'}</td>
                      <td className="text-sm text-muted num">
                        <span className="flex items-center gap-1"><IconClock size={13} />{t.deadline || '—'}</span>
                      </td>
                      <td style={{ paddingRight: 20 }}><StatusBadge value={t.status || 'Not Started'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="card">
            <SectionHead title="Needs your attention" />
            {needsAction.length === 0 ? (
              <div className="flex items-center gap-3 text-sm text-muted">
                <span className="kpi-icon tone-success"><IconCircleCheck size={16} /></span>
                Nothing has been sent back to you.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {needsAction.map((t) => (
                  <button key={t.id} type="button" className="action-row" onClick={() => go('emp-tasks')}>
                    <span className="kpi-icon tone-warning"><IconAlert size={16} /></span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="text-sm font-medium truncate" style={{ display: 'block' }}>{t.title}</span>
                      <span className="text-xs text-muted">{t.status}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <SectionHead title="My progress" sub={`${mine.length} task${mine.length === 1 ? '' : 's'} assigned`} />
            <div className="flex items-center gap-4">
              <ProgressRing percent={completion} label="verified" size={88} stroke={8} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <StatusBar segments={taskStatusSegments(mine)} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
