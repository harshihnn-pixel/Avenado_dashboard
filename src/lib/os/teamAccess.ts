// Real "who's allowed in" data, backed by the Supabase `invites` and
// `profiles` tables (see supabase/001_init.sql) instead of a local-demo
// collection. An Owner's Team & Access page (TeamAccess.tsx) is the only
// place these functions get called from, which lines up with those two
// tables' RLS policies: only an approved, active Owner can read or write
// `invites` at all, or update anyone else's `profiles` row.
//
// A row here can represent two different real things, unified into one
// shape for the UI: someone invited who HAS already created their account
// (a real `profiles` row, with `hasAccount: true`) and someone invited who
// HASN'T yet (only an `invites` row exists — `hasAccount: false`, and
// `account_active` is meaningless until they do sign up).
import { getSupabase } from './supabaseClient';
import type { Role, SubRole } from './types';

// The two real founder accounts — used only to make "isFounder" (which
// protects an account from being deactivated from this page) correct
// regardless of what a given profiles row's own `is_founder` column
// happens to hold. That column is set once, at signup time, from the
// `invites` row that existed then; if someone's account predates this
// app's `is_founder` column, or was created before their invite row did,
// their stored flag can go stale even though they really are one of the
// two founder emails — this list is the one deterministic source of truth.
const FOUNDER_EMAILS = ['kishorkumarreddy222@gmail.com', 'nharshitha821@gmail.com'];

export interface AccessRow {
  id: string;
  name: string;
  email: string;
  role: Role | null;
  subRole?: SubRole;
  approved: boolean;
  account_active: boolean;
  isFounder?: boolean;
  hasAccount: boolean;
}

export const ROLE_CHOICES: { value: string; label: string; role: Role; subRole?: SubRole }[] = [
  { value: 'owner', label: 'Owner', role: 'owner' },
  { value: 'manager', label: 'Manager', role: 'manager-hr', subRole: 'manager' },
  { value: 'hr', label: 'HR', role: 'manager-hr', subRole: 'hr' },
  { value: 'employee', label: 'Employee', role: 'employee' },
];

export function choiceFor(role: Role | null, subRole?: SubRole) {
  return ROLE_CHOICES.find((c) => c.role === role && (c.role !== 'manager-hr' || c.subRole === subRole)) || ROLE_CHOICES[3];
}

interface InviteRow {
  id: string; email: string; name: string; role: Role; sub_role: SubRole | null; approved: boolean;
}
interface ProfileRow {
  id: string; email: string; full_name: string; role: Role | null; sub_role: SubRole | null;
  approved: boolean; account_active: boolean; is_founder: boolean;
}

/** Everyone with either an invite or a real account, as one merged list — newest invite first. */
export async function listAccessRows(): Promise<AccessRow[]> {
  const supabase = getSupabase();
  const [invitesRes, profilesRes] = await Promise.all([
    supabase.from('invites').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('*'),
  ]);
  if (invitesRes.error) throw new Error(invitesRes.error.message);
  if (profilesRes.error) throw new Error(profilesRes.error.message);

  const invites: InviteRow[] = invitesRes.data || [];
  const profiles: ProfileRow[] = profilesRes.data || [];
  const profileByEmail = new Map(profiles.map((p) => [p.email.toLowerCase(), p]));
  const seenEmails = new Set<string>();

  const rows: AccessRow[] = invites.map((inv) => {
    const email = inv.email.toLowerCase();
    seenEmails.add(email);
    const p = profileByEmail.get(email);
    if (p) {
      return {
        id: p.id, name: p.full_name || inv.name, email: p.email, role: p.role, subRole: p.sub_role || undefined,
        approved: p.approved, account_active: p.account_active, isFounder: p.is_founder || FOUNDER_EMAILS.includes(email), hasAccount: true,
      };
    }
    return {
      id: inv.id, name: inv.name, email: inv.email, role: inv.role, subRole: inv.sub_role || undefined,
      approved: inv.approved, account_active: true, isFounder: false, hasAccount: false,
    };
  });

  // Someone who signed up with no invite at all — the normal case now that
  // self-signup is the only way in (handle_new_user still creates their
  // profiles row, just with role=null/approved=false) — show them too, so
  // an Owner can actually grant access rather than this person being
  // invisible until approved.
  for (const p of profiles) {
    if (seenEmails.has(p.email.toLowerCase())) continue;
    rows.push({
      id: p.id, name: p.full_name || p.email, email: p.email, role: p.role, subRole: p.sub_role || undefined,
      approved: p.approved, account_active: p.account_active, isFounder: p.is_founder || FOUNDER_EMAILS.includes(p.email.toLowerCase()), hasAccount: true,
    });
  }

  return rows;
}

/**
 * Approve + assign a role in one step (the "Approve" button next to a
 * pending row). There's no separate "Owner pre-invites by email" step
 * anymore — self-signup is the only way in — so this is also the first
 * time an `invites` row gets created for someone who signed up on their
 * own with no prior invite. An `upsert` (not a plain `update`) handles
 * both cases in one call: it creates that row when it's missing (which
 * then fires `sync_invite_to_profile` on insert, same as on update, so
 * their already-existing `profiles` row — created by `handle_new_user` at
 * signup — gets approved immediately), and it updates it in place when an
 * invite row already exists.
 */
export async function approveWithRole(email: string, name: string, role: Role, subRole?: SubRole): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('invites')
    .upsert({ email: email.trim(), name: name.trim(), approved: true, role, sub_role: subRole || null }, { onConflict: 'email' });
  if (error) throw new Error(error.message);
}

/** Change an already-approved person's role/portal. */
export async function setAccessRole(email: string, role: Role, subRole?: SubRole): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('invites').update({ role, sub_role: subRole || null }).eq('email', email);
  if (error) throw new Error(error.message);
}

/** Deactivate/reactivate someone who already has a real account. Founders can't be deactivated from here. */
export async function setAccountActive(profileId: string, active: boolean): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('profiles').update({ account_active: active }).eq('id', profileId);
  if (error) throw new Error(error.message);
}
