// Owner-only "Team & Access" — approve a teammate into a portal/role, manage
// who's active. Real backend: a person creates their own account from the
// sign-in screen (AuthScreens.tsx) — confirms their email the normal
// Supabase way — and shows up here, in "Pending approval," with no
// dashboard open yet. An Owner picks their portal/role and hits Approve;
// that's the one real gate (no separate owner-initiated "send an invite by
// email" step — self-signup + approval here is the whole flow).
//
// Reads/writes go through src/lib/os/teamAccess.ts, which talks to Supabase
// directly (RLS restricts all of it to an approved, active Owner already —
// this page doesn't need to re-check that). There's no synchronous
// subscription for these two tables the way recordsStore.ts gives the other
// modules, so this page keeps its own small loading state and refetches
// after every write, plus a realtime subscription so a second Owner's
// changes in another tab show up here too.
import React, { useEffect, useState, useCallback } from 'react';
import { getSupabase } from '@/lib/os/supabaseClient';
import {
  ROLE_CHOICES, choiceFor, listAccessRows,
  approveWithRole, setAccessRole, setAccountActive, type AccessRow,
} from '@/lib/os/teamAccess';

// The "Founder" badge is shown for this one real person only (not for the
// other pre-approved Owner account) — checked directly against the email,
// never against a stored database flag, so it can't drift out of sync with
// whatever a given account's row happens to hold.
const FOUNDER_BADGE_EMAIL = 'kishorkumarreddy222@gmail.com';

export function TeamAccessPage() {
  const [rows, setRows] = useState<AccessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [roleChoice, setRoleChoice] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await listAccessRows();
      setRows(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load Team & Access.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    let channel: any = null;
    try {
      const supabase = getSupabase();
      channel = supabase
        .channel('team-access')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'invites' }, () => refresh())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => refresh())
        .subscribe();
    } catch (err) {
      console.error('[TeamAccess] could not subscribe to realtime updates:', err);
    }
    return () => { if (channel) { try { getSupabase().removeChannel(channel); } catch { /* ignore */ } } };
  }, [refresh]);

  const pending = rows.filter((p) => !p.approved);
  const active = rows.filter((p) => p.approved);

  const approve = async (row: AccessRow) => {
    const choice = ROLE_CHOICES.find((c) => c.value === (roleChoice[row.email] || 'employee')) || ROLE_CHOICES[3];
    setBusy(row.email);
    try {
      await approveWithRole(row.email, row.name, choice.role, choice.subRole);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not approve this invite.');
    } finally {
      setBusy(null);
    }
  };

  const setRole = async (row: AccessRow, value: string) => {
    const choice = ROLE_CHOICES.find((c) => c.value === value) || ROLE_CHOICES[3];
    setBusy(row.email);
    try {
      await setAccessRole(row.email, choice.role, choice.subRole);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change this role.');
    } finally {
      setBusy(null);
    }
  };

  const toggleActive = async (row: AccessRow) => {
    if (!row.hasAccount) return;
    setBusy(row.email);
    try {
      await setAccountActive(row.id, !row.account_active);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update this account.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="card-flat p-3 mb-6 text-sm text-muted" role="status">
        Real backend — anyone can create their own account from the sign-in screen, but it opens no dashboard
        until approved here. Pick their portal/role below and hit Approve.
      </div>

      {error && (
        <div className="card-flat p-3 mb-6 text-sm" style={{ color: 'var(--color-error, #b91c1c)' }} role="alert">
          {error}
        </div>
      )}

      <div className="card mb-6">
        <strong>Pending approval</strong>
        <div className="text-sm text-muted mt-1 mb-4">Signed up but not yet approved into a portal — can't open a dashboard yet.</div>
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : pending.length === 0 ? (
          <div className="empty-state">No pending accounts right now.</div>
        ) : (
          <table className="table">
            <thead><tr><th>Name</th><th>Email</th><th>Assign role</th><th></th></tr></thead>
            <tbody>
              {pending.map((p) => (
                <tr key={p.email}>
                  <td>{p.name}{p.hasAccount && <span className="badge ml-2">Signed up</span>}</td>
                  <td className="text-sm text-muted">{p.email}</td>
                  <td>
                    <select className="select" value={roleChoice[p.email] || 'employee'} onChange={(e) => setRoleChoice((r) => ({ ...r, [p.email]: e.target.value }))}>
                      {ROLE_CHOICES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </td>
                  <td><button className="btn btn-primary btn-sm" disabled={busy === p.email} onClick={() => approve(p)}>{busy === p.email ? 'Approving…' : 'Approve'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <strong>Active accounts</strong>
        <div className="text-sm text-muted mt-1 mb-4">Everyone with access today. Change a role/portal or deactivate someone who's left.</div>
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : active.length === 0 ? (
          <div className="empty-state">No approved accounts yet.</div>
        ) : (
          <table className="table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {active.map((p) => (
                <tr key={p.email}>
                  <td>{p.name}{p.email?.toLowerCase() === FOUNDER_BADGE_EMAIL && <span className="badge badge-success ml-2">Founder</span>}</td>
                  <td className="text-sm text-muted">{p.email}</td>
                  <td>
                    <select className="select" value={choiceFor(p.role, p.subRole).value} disabled={busy === p.email} onChange={(e) => setRole(p, e.target.value)}>
                      {ROLE_CHOICES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </td>
                  <td>
                    {!p.hasAccount ? <span className="badge">Not signed up yet</span>
                      : p.account_active ? <span className="badge badge-success">Active</span>
                      : <span className="badge badge-error">Deactivated</span>}
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(p)} disabled={p.isFounder || !p.hasAccount || busy === p.email}>
                      {p.account_active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
