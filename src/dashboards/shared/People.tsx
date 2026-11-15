// Shared between the Owner's "Employee Directory"/"Add Employee" screens
// and the Manager/HR "Employee Management" page — same underlying data
// either way: the real founder accounts (read-only, not deletable from a
// demo list) plus a "team-members" collection anyone with access can add
// to. This is also the Owner's "Add Manager / HR" flow — same form, the
// Dashboard Role field is what distinguishes an Employee from a Manager/HR
// addition, per the master prompt's Step 1/Step 2.
import React, { useState } from 'react';
import { PROFILES, DEPARTMENTS, PROJECTS } from '@/lib/os/mock-data';
import { ListModule, StatusBadge, type FieldDef, type ColumnDef } from '@/components/os/ListModule';
import { useLocalCollection } from '@/lib/os/useLocalCollection';
import { useApp } from '@/lib/os/store';
import { useAssignableNames } from '@/lib/os/employeeOptions';
import { employeeTaskStats, completionColor } from '@/lib/os/projectMetrics';
import { EmployeeProfilePage } from './EmployeeProfile';

const fields: FieldDef[] = [
  { key: 'full_name', label: 'Full name', required: true },
  { key: 'employee_id', label: 'Employee ID' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Mobile number' },
  { key: 'designation', label: 'Designation' },
  { key: 'department', label: 'Department', type: 'select', options: DEPARTMENTS.map((d) => d.name) },
  { key: 'role', label: 'Dashboard role', type: 'select', options: ['owner', 'manager-hr', 'employee'], required: true },
  { key: 'employment_type', label: 'Employment type', type: 'select', options: ['Full-time', 'Part-time', 'Contract', 'Intern'] },
  { key: 'date_of_joining', label: 'Date of joining', type: 'date' },
  { key: 'reporting_manager', label: 'Reporting manager', type: 'select', options: [] },
  { key: 'assigned_project', label: 'Assigned project', type: 'select', options: PROJECTS.map((p) => p.name) },
  { key: 'work_location', label: 'Work location' },
  { key: 'status', label: 'Employment status', type: 'select', options: ['Active', 'On Leave', 'Inactive'] },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];
const columns: ColumnDef[] = [
  { key: 'full_name', label: 'Name' }, { key: 'designation', label: 'Designation' },
  { key: 'department', label: 'Department' }, { key: 'role', label: 'Dashboard role' },
  { key: 'reporting_manager', label: 'Reports to' },
  { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status || 'Active'} /> },
];

function withManagerOptions(f: FieldDef[], names: string[]): FieldDef[] {
  return f.map((fl) => (fl.key === 'reporting_manager' ? { ...fl, options: names } : fl));
}

export function EmployeeDirectory({ title = 'Employee Directory' }: { title?: string }) {
  // Manager/HR sees who the founders are but not their email addresses —
  // only an Owner (viewing this same shared component as "Employee
  // Directory") sees that column.
  const { role } = useApp();
  const showEmail = role !== 'manager-hr';
  return (
    <div>
      <div className="card mb-4">
        <strong>Founder accounts</strong>
        <div className="text-sm text-muted mt-1 mb-3">Real accounts, not editable from here.</div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Name</th>{showEmail && <th>Email</th>}<th>Designation</th></tr></thead>
            <tbody>
              {PROFILES.filter((p) => p.isRealPerson).map((p) => (
                <tr key={p.id}><td>{p.full_name}</td>{showEmail && <td className="text-sm text-muted">{p.email}</td>}<td>{p.designation || '—'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ListModuleWithManagerOptions title={title} />
    </div>
  );
}

// A thin variant of ListModule whose "reporting manager" select is
// populated live from everyone addable in this app (real accounts + any
// team member already added) — plain ListModule's fields are static, so
// this wraps it rather than modifying the generic component for one field.
function ListModuleWithManagerOptions({ title }: { title: string }) {
  const names = useAssignableNames();
  return (
    <ListModule
      storageKey="team-members"
      label="Team Member"
      title={title}
      subtitle="Add employees, managers or HR here — the Dashboard Role field decides which portal they'd use. Shared between the Owner's directory and Manager/HR's Employee Management."
      columns={columns}
      fields={withManagerOptions(fields, names)}
    />
  );
}

export function TeamStatusPage() {
  const real = PROFILES.filter((p) => p.isRealPerson);
  const { items: team } = useLocalCollection('team-members', 'Team Member');
  const { items: tasks } = useLocalCollection('tasks', 'Task');
  const [openName, setOpenName] = useState<string | null>(null);
  // Live per-person completion, straight from real tasks — not fetched
  // separately per card, so this stays one pass over the same data this
  // page already loads.
  const statsByName = new Map(employeeTaskStats(tasks).map((s) => [s.name, s]));
  const workLine = (name: string) => {
    const s = statsByName.get(name);
    if (!s || s.totalTasks === 0) return <span className="text-sm text-muted">No tasks assigned yet</span>;
    return (
      <span className="text-sm font-semibold" style={{ color: completionColor(s.completionPct) }}>
        {s.completedTasks}/{s.totalTasks} tasks verified ({s.completionPct}%)
      </span>
    );
  };

  if (openName) {
    return (
      <div>
        <button className="btn btn-secondary btn-sm mb-4" onClick={() => setOpenName(null)}>← Back to Team Status</button>
        <EmployeeProfilePage employeeName={openName} />
      </div>
    );
  }

  return (
    <div className="card">
      <strong>Team Status</strong>
      <div className="text-sm text-muted mt-1 mb-4">Quick status view — click anyone for their full profile. Add team members on the Employee Directory page to see them here too.</div>
      <div className="grid grid-cols-3 gap-4">
        {real.map((p) => (
          <div key={p.id} className="card-flat p-4 card-hover" style={{ cursor: 'pointer' }} onClick={() => setOpenName(p.full_name)}>
            <div className="flex items-center gap-2 mb-2">
              <div className="avatar" style={{ width: 32, height: 32, background: 'var(--av-primary)' }}>{p.full_name[0]}</div>
              <strong className="text-sm">{p.full_name}</strong>
            </div>
            <div className="text-sm text-muted">{p.designation || p.role}</div>
            <span className="badge badge-success mt-2" style={{ display: 'inline-block' }}>Approved</span>
            <div className="mt-2">{workLine(p.full_name)}</div>
          </div>
        ))}
        {team.map((p) => (
          <div key={p.id} className="card-flat p-4 card-hover" style={{ cursor: 'pointer' }} onClick={() => setOpenName(p.full_name)}>
            <div className="flex items-center gap-2 mb-2">
              <div className="avatar" style={{ width: 32, height: 32, background: 'var(--av-accent)' }}>{(p.full_name || '?')[0]}</div>
              <strong className="text-sm">{p.full_name}</strong>
            </div>
            <div className="text-sm text-muted">{p.designation || p.role || '—'}</div>
            <span className={`badge badge-${p.status === 'Inactive' ? 'neutral' : p.status === 'On Leave' ? 'warning' : 'success'} mt-2`} style={{ display: 'inline-block' }}>
              {p.status || 'Active'}
            </span>
            <div className="mt-2">{workLine(p.full_name)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OrgChartPage() {
  const { items: team } = useLocalCollection('team-members', 'Team Member');
  const owners = PROFILES.filter((p) => p.isRealPerson);
  const managersHr = team.filter((t) => t.role === 'manager-hr');
  const employees = team.filter((t) => t.role === 'employee');

  const employeesFor = (managerName: string) => employees.filter((e) => e.reporting_manager === managerName);
  const unassignedEmployees = employees.filter((e) => !managersHr.find((m) => m.full_name === e.reporting_manager));

  return (
    <div className="card">
      <strong>Organization Structure</strong>
      <div className="text-sm text-muted mt-1 mb-4">Owner → Manager/HR → Employees, built from Employee Management's "Reports to" field.</div>

      <div className="card-flat p-4 mb-3">
        <strong className="text-sm">Owner</strong>
        <div className="flex gap-2 mt-2" style={{ flexWrap: 'wrap' }}>
          {owners.map((o) => <span key={o.id} className="badge badge-accent">{o.full_name}</span>)}
        </div>
      </div>

      {managersHr.length === 0 ? (
        <div className="empty-state">Add Manager/HR profiles via Employee Management to build out the chart.</div>
      ) : managersHr.map((m) => (
        <div key={m.id} className="card-flat p-4 mb-3" style={{ marginLeft: 24 }}>
          <strong className="text-sm">{m.full_name} <span className="text-muted">— {m.designation || 'Manager/HR'}</span></strong>
          <div className="flex gap-2 mt-2" style={{ flexWrap: 'wrap' }}>
            {employeesFor(m.full_name).length === 0
              ? <span className="text-sm text-muted">No direct reports yet</span>
              : employeesFor(m.full_name).map((e) => <span key={e.id} className="badge badge-info">{e.full_name}</span>)}
          </div>
        </div>
      ))}

      {unassignedEmployees.length > 0 && (
        <div className="card-flat p-4" style={{ marginLeft: 24 }}>
          <strong className="text-sm text-muted">Unassigned employees</strong>
          <div className="flex gap-2 mt-2" style={{ flexWrap: 'wrap' }}>
            {unassignedEmployees.map((e) => <span key={e.id} className="badge badge-neutral">{e.full_name}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}
