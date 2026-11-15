// Attendance, shared across all three dashboards via one 'attendance'
// collection (same cross-role pattern as Tasks). Check-in/out uses the
// browser clock for this frontend demo — explicitly not a tamper-proof or
// payroll-grade record.
// Phase 9 redesign: the employee view is now a real month calendar (not just
// a history table) with per-day status, and a correction-request flow —
// requests go into a separate 'attendance-corrections' collection that
// Manager/HR verify (AttendanceCorrectionsPage below), never silently
// rewriting the original attendance record.
import React, { useState } from 'react';
import { useLocalCollection } from '@/lib/os/useLocalCollection';
import { useApp } from '@/lib/os/store';
import { Modal } from '@/components/os/Modal';
import { StatusBadge } from '@/components/os/ListModule';
import { StatTiles } from '@/components/os/DetailUI';

function todayStr() { return new Date().toISOString().slice(0, 10); }
function timeStr() { return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); }
function pad(n: number) { return String(n).padStart(2, '0'); }
function ymd(y: number, m: number, d: number) { return `${y}-${pad(m + 1)}-${pad(d)}`; }
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function MonthCalendar({
  year, month, records, onDayClick,
}: {
  year: number; month: number; records: Record<string, any>; onDayClick: (date: string) => void;
}) {
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayStr();
  const cells: Array<{ date: string | null; day: number | null }> = [];
  for (let i = 0; i < firstDow; i++) cells.push({ date: null, day: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: ymd(year, month, d), day: d });

  return (
    <div>
      <div className="calendar-grid calendar-head">
        {WEEKDAY_LABELS.map((w) => <div key={w} className="calendar-weekday">{w}</div>)}
      </div>
      <div className="calendar-grid">
        {cells.map((c, i) => {
          if (!c.date) return <div key={i} className="calendar-cell calendar-cell-empty" />;
          const rec = records[c.date];
          const dow = new Date(c.date + 'T00:00:00').getDay();
          const isWeekend = dow === 0;
          const isFuture = c.date > today;
          let tone: 'present' | 'absent' | 'weekend' | 'future' = 'future';
          let label = '';
          if (isFuture) { tone = 'future'; label = ''; }
          else if (rec) { tone = 'present'; label = rec.check_out_time ? 'Complete' : 'Present'; }
          else if (isWeekend) { tone = 'weekend'; label = 'Weekend'; }
          else { tone = 'absent'; label = 'Absent'; }
          return (
            <button
              key={i}
              className={`calendar-cell calendar-cell-${tone}`}
              onClick={() => !isFuture && onDayClick(c.date!)}
              disabled={isFuture}
              title={isFuture ? '' : `${c.date} — ${label || 'No record'}. Click to request a correction.`}
            >
              <span className="calendar-day-num">{c.day}</span>
              {label && <span className="calendar-day-label">{label}</span>}
              {rec && <span className="calendar-day-time">{rec.check_in_time}{rec.check_out_time ? `–${rec.check_out_time}` : ''}</span>}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-3" style={{ flexWrap: 'wrap' }}>
        <span className="text-sm text-muted flex items-center gap-1"><span className="status-bar-legend-dot tone-dot-progress" /> Present</span>
        <span className="text-sm text-muted flex items-center gap-1"><span className="status-bar-legend-dot tone-dot-incorrect" /> Absent</span>
        <span className="text-sm text-muted flex items-center gap-1"><span className="status-bar-legend-dot tone-dot-pending" /> Weekend</span>
        <span className="text-sm text-muted">Click any past/today cell to request a correction.</span>
      </div>
    </div>
  );
}

export function CheckInOutPage() {
  const { profile } = useApp();
  const { items, add, update } = useLocalCollection('attendance', 'Attendance');
  const { items: corrections, add: addCorrection } = useLocalCollection('attendance-corrections', 'Correction Request');
  const today = todayStr();
  const name = profile?.full_name;
  const todays = items.find((a) => a.employee_name === name && a.date === today);
  const myCorrections = corrections.filter((c) => c.employee_name === name).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const [viewDate, setViewDate] = useState(new Date());
  const [correctingDate, setCorrectingDate] = useState<string | null>(null);
  const [form, setForm] = useState({ check_in: '', check_out: '', reason: '' });

  const checkIn = () => add({ employee_name: name, date: today, check_in_time: timeStr(), check_out_time: null, note: 'demo — browser clock, not verified attendance' } as any);
  const checkOut = () => todays && update(todays.id, { check_out_time: timeStr() });

  const records: Record<string, any> = {};
  items.filter((a) => a.employee_name === name).forEach((a) => { records[a.date] = a; });

  const openCorrection = (date: string) => {
    const existing = records[date];
    setForm({ check_in: existing?.check_in_time || '', check_out: existing?.check_out_time || '', reason: '' });
    setCorrectingDate(date);
  };
  const submitCorrection = () => {
    if (!correctingDate) return;
    addCorrection({
      employee_name: name, date: correctingDate,
      requested_check_in: form.check_in, requested_check_out: form.check_out,
      reason: form.reason, status: 'Pending',
    } as any);
    setCorrectingDate(null);
  };

  return (
    <div>
      <div className="card mb-6">
        <strong>Today — {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
        <div className="flex items-center gap-4 mt-4">
          <div className="card-flat p-4" style={{ minWidth: 160 }}>
            <div className="text-sm text-muted">Check-in</div>
            <div className="text-xl font-bold" style={{ fontSize: 20 }}>{todays?.check_in_time || '—'}</div>
          </div>
          <div className="card-flat p-4" style={{ minWidth: 160 }}>
            <div className="text-sm text-muted">Check-out</div>
            <div className="text-xl font-bold" style={{ fontSize: 20 }}>{todays?.check_out_time || '—'}</div>
          </div>
          <div>
            {!todays && <button className="btn btn-primary" onClick={checkIn}>Check In</button>}
            {todays && !todays.check_out_time && <button className="btn btn-secondary" onClick={checkOut}>Check Out</button>}
            {todays?.check_out_time && <span className="badge badge-success">Day complete</span>}
          </div>
        </div>
        <div className="text-sm text-muted mt-3">Demo check-in/out uses your browser's clock — not a verified attendance record.</div>
      </div>

      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <strong>{viewDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</strong>
          <div className="flex gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}>← Prev</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setViewDate(new Date())}>This month</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}>Next →</button>
          </div>
        </div>
        <MonthCalendar year={viewDate.getFullYear()} month={viewDate.getMonth()} records={records} onDayClick={openCorrection} />
      </div>

      <div className="card">
        <strong>My correction requests</strong>
        {myCorrections.length === 0 ? <div className="empty-state mt-3">None yet — click a day above if your attendance looks wrong.</div> : (
          <table className="table mt-3">
            <thead><tr><th>Date</th><th>Requested check-in</th><th>Requested check-out</th><th>Reason</th><th>Status</th></tr></thead>
            <tbody>
              {myCorrections.map((c) => (
                <tr key={c.id}>
                  <td>{c.date}</td><td>{c.requested_check_in || '—'}</td><td>{c.requested_check_out || '—'}</td>
                  <td className="text-sm text-muted">{c.reason}</td>
                  <td><StatusBadge value={c.status || 'Pending'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {correctingDate && (
        <Modal title={`Request correction — ${correctingDate}`} onClose={() => setCorrectingDate(null)}>
          <div className="mb-3">
            <label className="field-label">Correct check-in time</label>
            <input className="input" placeholder="e.g. 09:30 AM" value={form.check_in} onChange={(e) => setForm({ ...form, check_in: e.target.value })} />
          </div>
          <div className="mb-3">
            <label className="field-label">Correct check-out time</label>
            <input className="input" placeholder="e.g. 06:15 PM" value={form.check_out} onChange={(e) => setForm({ ...form, check_out: e.target.value })} />
          </div>
          <div className="mb-3">
            <label className="field-label">Reason *</label>
            <textarea className="input" rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Why does this day need correcting?" />
          </div>
          <div className="flex gap-2 mt-4">
            <button className="btn btn-secondary" onClick={() => setCorrectingDate(null)}>Cancel</button>
            <button className="btn btn-primary" disabled={!form.reason.trim()} onClick={submitCorrection}>Submit request</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function AttendanceCorrectionsPage() {
  const { items: corrections, update } = useLocalCollection('attendance-corrections', 'Correction Request');
  const { items: attendance, add: addAttendance, update: updateAttendance } = useLocalCollection('attendance', 'Attendance');
  const pending = corrections.filter((c) => c.status === 'Pending' || !c.status);
  const resolved = corrections.filter((c) => c.status && c.status !== 'Pending');

  const approve = (c: any) => {
    const existing = attendance.find((a) => a.employee_name === c.employee_name && a.date === c.date);
    if (existing) {
      updateAttendance(existing.id, { check_in_time: c.requested_check_in || existing.check_in_time, check_out_time: c.requested_check_out || existing.check_out_time });
    } else {
      addAttendance({ employee_name: c.employee_name, date: c.date, check_in_time: c.requested_check_in, check_out_time: c.requested_check_out, note: 'added via correction request' } as any);
    }
    update(c.id, { status: 'Approved' });
  };
  const reject = (c: any) => update(c.id, { status: 'Rejected' });

  return (
    <div>
      <StatTiles items={[
        { label: 'Pending requests', value: pending.length, tone: pending.length ? 'amber' : undefined },
        { label: 'Approved', value: corrections.filter((c) => c.status === 'Approved').length, tone: 'green' },
        { label: 'Rejected', value: corrections.filter((c) => c.status === 'Rejected').length },
      ]} />
      <div className="card mt-4">
        <strong>Pending corrections</strong>
        {pending.length === 0 ? <div className="empty-state mt-3">No open attendance correction requests.</div> : (
          <table className="table mt-3">
            <thead><tr><th>Employee</th><th>Date</th><th>Requested</th><th>Reason</th><th></th></tr></thead>
            <tbody>
              {pending.map((c) => (
                <tr key={c.id}>
                  <td>{c.employee_name}</td><td>{c.date}</td>
                  <td className="text-sm text-muted">{c.requested_check_in || '—'} – {c.requested_check_out || '—'}</td>
                  <td className="text-sm text-muted">{c.reason}</td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-primary btn-sm" onClick={() => approve(c)}>Approve</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--av-error)' }} onClick={() => reject(c)}>Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {resolved.length > 0 && (
        <div className="card mt-4">
          <strong>Resolved</strong>
          <table className="table mt-3">
            <thead><tr><th>Employee</th><th>Date</th><th>Requested</th><th>Status</th></tr></thead>
            <tbody>
              {resolved.map((c) => (
                <tr key={c.id}>
                  <td>{c.employee_name}</td><td>{c.date}</td>
                  <td className="text-sm text-muted">{c.requested_check_in || '—'} – {c.requested_check_out || '—'}</td>
                  <td><StatusBadge value={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function TeamAttendancePage() {
  const { items } = useLocalCollection('attendance', 'Attendance');
  const today = todayStr();
  const todays = items.filter((a) => a.date === today);

  return (
    <div className="card">
      <strong>Team Attendance — Today</strong>
      <div className="text-sm text-muted mt-1 mb-4">Updates live as your team checks in/out from their own dashboards.</div>
      {todays.length === 0 ? <div className="empty-state">No check-ins yet today.</div> : (
        <table className="table table-row-hover">
          <thead><tr><th>Employee</th><th>Check-in</th><th>Check-out</th><th>Status</th></tr></thead>
          <tbody>
            {todays.map((a) => (
              <tr key={a.id}>
                <td>{a.employee_name}</td><td>{a.check_in_time || '—'}</td><td>{a.check_out_time || '—'}</td>
                <td><span className={`badge badge-${a.check_out_time ? 'neutral' : 'success'}`}>{a.check_out_time ? 'Checked out' : 'Present'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function CompanyAttendancePage() {
  const { items } = useLocalCollection('attendance', 'Attendance');
  const today = todayStr();
  const todays = items.filter((a) => a.date === today);
  const present = todays.length;
  const checkedOut = todays.filter((a) => a.check_out_time).length;

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="kpi-card card"><div className="text-sm text-muted mb-1">Checked in today</div><div className="text-2xl font-bold" style={{ fontSize: 26 }}>{present}</div></div>
        <div className="kpi-card card"><div className="text-sm text-muted mb-1">Checked out today</div><div className="text-2xl font-bold" style={{ fontSize: 26 }}>{checkedOut}</div></div>
        <div className="kpi-card card"><div className="text-sm text-muted mb-1">Total attendance records</div><div className="text-2xl font-bold" style={{ fontSize: 26 }}>{items.length}</div></div>
      </div>
      <div className="card">
        <strong>All records</strong>
        {items.length === 0 ? <div className="empty-state mt-3">No attendance recorded yet, company-wide.</div> : (
          <table className="table mt-3">
            <thead><tr><th>Employee</th><th>Date</th><th>Check-in</th><th>Check-out</th></tr></thead>
            <tbody>
              {items.slice(0, 100).map((a) => <tr key={a.id}><td>{a.employee_name}</td><td>{a.date}</td><td>{a.check_in_time || '—'}</td><td>{a.check_out_time || '—'}</td></tr>)}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
