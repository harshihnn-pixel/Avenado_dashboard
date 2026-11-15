import React, { useState } from 'react';
import { useCollectionSnapshot, saveCollection } from '@/lib/os/persist';
import { useActivityFeed } from '@/lib/os/activity';

const MODULES = ['Leads & Pipeline', 'CRM Staffing Model', 'Projects', 'Bookings', 'Finance', 'Employee Directory', 'Company Settings'];
// Exactly 3 dashboard roles — Manager and HR share one portal ('manager-hr'),
// so this matrix (and the frontend nav it loosely documents) has one column
// for the combined portal rather than separate Manager/HR columns.
const ROLES = ['owner', 'manager-hr', 'employee'] as const;

function defaultMatrix(): Record<string, Record<string, boolean>> {
  const defaults: Record<string, Record<string, boolean>> = {};
  for (const m of MODULES) {
    defaults[m] = { owner: true, 'manager-hr': m !== 'Company Settings', employee: false };
  }
  return defaults;
}

export function PermissionsPage() {
  const rows = useCollectionSnapshot<{ id: string; value: Record<string, Record<string, boolean>> }>('permissions-matrix', []);
  const matrix = rows[0]?.value || defaultMatrix();
  const toggle = (mod: string, role: string) => {
    const next = { ...matrix, [mod]: { ...matrix[mod], [role]: !matrix[mod][role] } };
    saveCollection('permissions-matrix', [{ id: 'permissions-matrix', value: next }]);
  };
  return (
    <div className="card">
      <strong>Permissions</strong>
      <div className="text-sm text-muted mt-1 mb-4">Which dashboard role can see each module. Saved locally — doesn't enforce access yet (no backend/auth connected).</div>
      <table className="table">
        <thead><tr><th>Module</th>{ROLES.map((r) => <th key={r} style={{ textAlign: 'center' }}>{r}</th>)}</tr></thead>
        <tbody>
          {MODULES.map((m) => (
            <tr key={m}>
              <td>{m}</td>
              {ROLES.map((r) => (
                <td key={r} style={{ textAlign: 'center' }}>
                  <input type="checkbox" checked={!!matrix[m]?.[r]} onChange={() => toggle(m, r)} disabled={r === 'owner'} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const DEFAULT_SETTINGS = { company_name: 'Avenado Private Limited', currency: 'INR (₹)', timezone: 'Asia/Kolkata' };

export function CompanySettingsPage() {
  const rows = useCollectionSnapshot<{ id: string; value: Record<string, string> }>('company-settings', []);
  const saved0 = rows[0]?.value || DEFAULT_SETTINGS;
  const [settings, setSettings] = useState(saved0);
  const [saved, setSaved] = useState(false);
  const set = (k: string, v: string) => setSettings((s) => ({ ...s, [k]: v }));
  const save = () => {
    saveCollection('company-settings', [{ id: 'company-settings', value: settings }]);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };
  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <strong>Company Settings</strong>
      <div className="grid gap-3 mt-4">
        <div>
          <label className="field-label">Company name</label>
          <input className="input" value={settings.company_name} onChange={(e) => set('company_name', e.target.value)} />
        </div>
        <div>
          <label className="field-label">Currency</label>
          <input className="input" value={settings.currency} onChange={(e) => set('currency', e.target.value)} />
        </div>
        <div>
          <label className="field-label">Timezone</label>
          <input className="input" value={settings.timezone} onChange={(e) => set('timezone', e.target.value)} />
        </div>
      </div>
      <button className="btn btn-primary mt-4" onClick={save}>{saved ? 'Saved ✓' : 'Save changes'}</button>
    </div>
  );
}

export function AuditLogPage() {
  const entries = useActivityFeed();
  return (
    <div className="card">
      <strong>Audit Log</strong>
      <div className="text-sm text-muted mt-1 mb-4">Every add/edit/delete you've made in this demo session, newest first.</div>
      {entries.length === 0 ? (
        <div className="empty-state">Nothing logged yet — it fills in as you use the other modules.</div>
      ) : (
        <table className="table">
          <thead><tr><th>When</th><th>Action</th></tr></thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="text-sm text-muted">{new Date(e.at).toLocaleString('en-IN')}</td>
                <td>{e.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function ActivityPage() {
  const entries = useActivityFeed().slice(0, 30);
  return (
    <div className="card">
      <strong>Activity</strong>
      <div className="text-sm text-muted mt-1 mb-4">Recent activity across the app (same feed as Audit Log, condensed).</div>
      {entries.length === 0 ? (
        <div className="empty-state">No activity yet.</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-2 mb-2 text-sm">
              <span className="text-muted" style={{ minWidth: 140 }}>{new Date(e.at).toLocaleTimeString('en-IN')}</span>
              <span>{e.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
