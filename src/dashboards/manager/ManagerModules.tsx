import React, { useState } from 'react';
import { ListModule, StatusBadge, type FieldDef, type ColumnDef } from '@/components/os/ListModule';
import { useLocalCollection } from '@/lib/os/useLocalCollection';
import { useApp } from '@/lib/os/store';
import { StatTiles } from '@/components/os/DetailUI';

export function LeaveRequestsModule() {
  const fields: FieldDef[] = [
    { key: 'employee_name', label: 'Employee', required: true },
    { key: 'from_date', label: 'From', type: 'date' },
    { key: 'to_date', label: 'To', type: 'date' },
    { key: 'reason', label: 'Reason', type: 'textarea' },
    { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Approved', 'Rejected'] },
  ];
  const columns: ColumnDef[] = [
    { key: 'employee_name', label: 'Employee' }, { key: 'from_date', label: 'From' }, { key: 'to_date', label: 'To' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status || 'Pending'} /> },
  ];
  return <ListModule storageKey="leave-requests" label="Leave Request" title="Leave Requests" columns={columns} fields={fields} />;
}

// Phase 9 redesign — a genuinely categorized multi-type approval queue
// (not just leave requests): Leave Requests, Allowance Claims and
// Attendance Corrections all funnel here as one inbox with a category
// filter and per-type counts, while each type's own full workflow page
// (Leave Requests list, Allowance, Attendance Corrections) remains available
// for the detailed record. Nothing here is a second copy of that data —
// same 'leave-requests' / 'allowance' / 'attendance-corrections' collections.
type ApprovalCategory = 'all' | 'leave' | 'allowance' | 'attendance';

export function ApprovalsPage() {
  const { items: leave, update: updateLeave } = useLocalCollection('leave-requests', 'Leave Request');
  const { items: allowance, update: updateAllowance } = useLocalCollection('allowance', 'Allowance Claim');
  const { items: corrections, update: updateCorrection } = useLocalCollection('attendance-corrections', 'Correction Request');
  const { items: attendance, add: addAttendance, update: updateAttendance } = useLocalCollection('attendance', 'Attendance');
  const { profile } = useApp();
  const [category, setCategory] = useState<ApprovalCategory>('all');

  const pendingLeave = leave.filter((r) => (r.status || 'Pending') === 'Pending')
    .map((r) => ({ ...r, _type: 'leave' as const }));
  const pendingAllowance = allowance.filter((r) => (r.status || 'Pending') === 'Pending')
    .map((r) => ({ ...r, _type: 'allowance' as const }));
  const pendingCorrections = corrections.filter((r) => (r.status || 'Pending') === 'Pending')
    .map((r) => ({ ...r, _type: 'attendance' as const }));

  const all = [...pendingLeave, ...pendingAllowance, ...pendingCorrections];
  const visible = category === 'all' ? all : all.filter((r) => r._type === category);

  const approve = (r: any) => {
    if (r._type === 'leave') updateLeave(r.id, { status: 'Approved' });
    else if (r._type === 'allowance') updateAllowance(r.id, { status: 'Approved', approved_by: profile?.full_name });
    else if (r._type === 'attendance') {
      const existing = attendance.find((a) => a.employee_name === r.employee_name && a.date === r.date);
      if (existing) updateAttendance(existing.id, { check_in_time: r.requested_check_in || existing.check_in_time, check_out_time: r.requested_check_out || existing.check_out_time });
      else addAttendance({ employee_name: r.employee_name, date: r.date, check_in_time: r.requested_check_in, check_out_time: r.requested_check_out, note: 'added via correction request' } as any);
      updateCorrection(r.id, { status: 'Approved' });
    }
  };
  const reject = (r: any) => {
    if (r._type === 'leave') updateLeave(r.id, { status: 'Rejected' });
    else if (r._type === 'allowance') updateAllowance(r.id, { status: 'Rejected' });
    else if (r._type === 'attendance') updateCorrection(r.id, { status: 'Rejected' });
  };

  const typeLabel: Record<string, string> = { leave: 'Leave', allowance: 'Allowance', attendance: 'Attendance' };
  const describeRow = (r: any) => {
    if (r._type === 'leave') return { who: r.employee_name, what: `${r.from_date || '—'} → ${r.to_date || '—'}`, detail: r.reason };
    if (r._type === 'allowance') return { who: r.employee_name, what: r.amount ? '₹' + Number(r.amount).toLocaleString('en-IN') : '—', detail: r.particulars };
    return { who: r.employee_name, what: `${r.date || '—'}`, detail: `${r.requested_check_in || '—'} – ${r.requested_check_out || '—'} · ${r.reason}` };
  };

  return (
    <div>
      <StatTiles items={[
        { label: 'All pending', value: all.length, tone: all.length ? 'amber' : undefined },
        { label: 'Leave', value: pendingLeave.length },
        { label: 'Allowance', value: pendingAllowance.length },
        { label: 'Attendance', value: pendingCorrections.length },
      ]} />
      <div className="card mt-4">
        <div className="flex items-center justify-between mb-4">
          <strong>Approvals</strong>
          <div className="flex gap-2 approval-filter-bar">
            {(['all', 'leave', 'allowance', 'attendance'] as ApprovalCategory[]).map((c) => (
              <button key={c} className={`btn btn-sm approval-filter-btn ${category === c ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setCategory(c)}>
                {c === 'all' ? 'All' : typeLabel[c]}
              </button>
            ))}
          </div>
        </div>
        {visible.length === 0 ? (
          <div className="empty-state">Nothing waiting on your approval right now.</div>
        ) : (
          <table className="table">
            <thead><tr><th>Type</th><th>Employee</th><th>Details</th><th>Notes</th><th style={{ textAlign: 'right' }}>Decision</th></tr></thead>
            <tbody>
              {visible.map((r) => {
                const d = describeRow(r);
                return (
                  <tr key={`${r._type}-${r.id}`}>
                    <td><span className="badge badge-info">{typeLabel[r._type]}</span></td>
                    <td>{d.who}</td><td>{d.what}</td>
                    <td className="text-sm text-muted">{d.detail}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => approve(r)}>Approve</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--av-error)' }} onClick={() => reject(r)}>Reject</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
