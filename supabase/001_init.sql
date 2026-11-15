-- Avenado OS — real Supabase backend, step 1.
--
-- Run this once in your Supabase project's SQL editor (Dashboard → SQL Editor → New query →
-- paste this whole file → Run). See SUPABASE_SETUP.md for the full walkthrough.
--
-- What this creates:
--   1. public.profiles   — one row per real account (name, role, approval, active/deactivated).
--   2. public.invites     — who an Owner has invited, and what role they'll get once approved.
--   3. public.records     — ONE generic table backing every list/module in the app (tasks,
--                           leads, bookings, attendance, etc. — ~33 of them) plus 3 "singleton"
--                           config rows (the CRM Staffing Model's editable assumptions). Every
--                           module already reads/writes through one shared frontend hook
--                           (useLocalCollection), so one real table behind all of them is the
--                           direct translation of that — not a shortcut. A future pass can split
--                           any one of these out into its own typed table with real foreign keys
--                           if/when you want stronger relational integrity; nothing here blocks
--                           that later.
--
-- Deliberate scope boundary for this pass: this does NOT create per-employee HR-directory
-- fields (employee ID, phone, department, etc.) as columns on profiles. That data already lives
-- in the generic "team-members" records collection (added via the Employee Directory /
-- Employee Management pages) and stays there — it's HR roster data, separate from "who can log
-- in," and merging the two would touch a lot more of the app than this request asked for.

-- ============================================================================
-- 1. PROFILES — one row per real signed-up account.
-- ============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text check (role in ('owner', 'manager-hr', 'employee')),
  sub_role text check (sub_role in ('manager', 'hr')),
  designation text,
  approved boolean not null default false,
  account_active boolean not null default true,
  is_founder boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per real Supabase Auth account. role/approved/account_active together decide which, '
  'if any, of the 3 portals this person can open — see handle_new_user() and the RLS policies below.';

-- ============================================================================
-- 2. INVITES — what an Owner has promised an email address, before or after signup.
-- ============================================================================

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null default '',
  role text not null default 'employee' check (role in ('owner', 'manager-hr', 'employee')),
  sub_role text check (sub_role in ('manager', 'hr')),
  approved boolean not null default false,
  invited_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.invites is
  'Created by an Owner from the Team & Access page, keyed by email. handle_new_user() consults '
  'this table by email the moment someone signs up, so an invite can be approved before OR after '
  'that person actually creates their account.';

-- Seed: the two founder emails are pre-approved Owners from day one, exactly like this app's
-- local-demo build already did. These are the two real founder addresses given to this project —
-- nothing invented.
insert into public.invites (email, name, role, approved)
values
  ('kishorkumarreddy222@gmail.com', 'Kishor Kumar Reddy', 'owner', true),
  ('nharshitha821@gmail.com', 'Harshitha N', 'owner', true)
on conflict (email) do nothing;

-- ============================================================================
-- 3. RECORDS — the generic table every list module reads/writes through.
-- ============================================================================

create table if not exists public.records (
  -- Client-generated (see src/lib/os/persist.ts genId()), not a uuid default:
  -- the frontend creates an id for its optimistic local row before this
  -- insert ever reaches the server, and both sides must agree on it.
  id text primary key,
  collection text not null,
  data jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists records_collection_idx on public.records (collection);

comment on table public.records is
  'Generic rows for every module (collection = ''tasks'' | ''leads'' | ''attendance'' | ... — see '
  'src/lib/os/useLocalCollection.ts). The 3 CRM Staffing Model config values are stored here too, '
  'one fixed-id row each, as collection = ''staffing-assumptions'' | ''staffing-projects'' | '
  '''staffing-team''.';

-- ============================================================================
-- 4. Helper functions used by RLS policies below.
-- ============================================================================

create or replace function public.current_profile()
returns public.profiles
language sql
security definer
stable
set search_path = public
as $$
  select * from public.profiles where id = auth.uid();
$$;

create or replace function public.is_active_owner(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and role = 'owner' and approved = true and account_active = true
  );
$$;

create or replace function public.is_approved_active(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and approved = true and account_active = true
  );
$$;

-- ============================================================================
-- 5. New-signup trigger — the only place a profiles row is ever created.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.invites%rowtype;
begin
  select * into inv from public.invites where email = new.email;

  if found then
    insert into public.profiles (id, email, full_name, role, sub_role, approved, is_founder)
    values (
      new.id, new.email, coalesce(inv.name, ''), inv.role, inv.sub_role, inv.approved,
      inv.role = 'owner' and inv.approved
    );
  else
    -- Signed up with no matching invite: a real account exists, but it opens no portal
    -- until an Owner adds them from Team & Access (which creates/approves the invite row;
    -- see sync_invite_to_profile() below for what happens once they already have an account).
    insert into public.profiles (id, email, full_name, role, approved)
    values (new.id, new.email, '', null, false);
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 6. Keep profiles in sync when an Owner edits an invite for someone who has
--    ALREADY signed up (e.g. approving them, or changing their role later).
-- ============================================================================

create or replace function public.sync_invite_to_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set role = new.role, sub_role = new.sub_role, approved = new.approved,
      full_name = case when full_name = '' then new.name else full_name end,
      updated_at = now()
  where email = new.email;
  return new;
end;
$$;

drop trigger if exists on_invite_changed on public.invites;
create trigger on_invite_changed
  after insert or update on public.invites
  for each row execute function public.sync_invite_to_profile();

-- ============================================================================
-- 7. Block privilege escalation: only an active Owner may change role/
--    approved/account_active on ANY profile (including their own — an Owner
--    demoting themselves still has to mean it, but at least it's still only
--    an Owner doing it, not a random approved employee granting themselves
--    Owner access).
-- ============================================================================

create or replace function public.guard_profile_privilege_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role
      or new.approved is distinct from old.approved
      or new.account_active is distinct from old.account_active
      or new.is_founder is distinct from old.is_founder)
     and not public.is_active_owner(auth.uid()) then
    raise exception 'Only an active Owner can change role, approval or active status.';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_profile_privilege_change on public.profiles;
create trigger on_profile_privilege_change
  before update on public.profiles
  for each row execute function public.guard_profile_privilege_change();

-- ============================================================================
-- 8. Row Level Security.
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.invites enable row level security;
alter table public.records enable row level security;

-- profiles: you can always read your own row (needed to find out your own
-- role/approval status right after signing in); an active Owner can read
-- and update everyone's.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());

drop policy if exists profiles_select_owner on public.profiles;
create policy profiles_select_owner on public.profiles
  for select using (public.is_active_owner(auth.uid()));

drop policy if exists profiles_update_owner on public.profiles;
create policy profiles_update_owner on public.profiles
  for update using (public.is_active_owner(auth.uid()));

-- invites: Owner-only, full stop. Nobody else needs to see who's been invited.
drop policy if exists invites_all_owner on public.invites;
create policy invites_all_owner on public.invites
  for all using (public.is_active_owner(auth.uid()))
  with check (public.is_active_owner(auth.uid()));

-- records: any approved + active account (any role) can read and write.
-- This matches exactly what the app enforced before (nothing — any signed-in
-- portal already let you add/edit records in the pages it showed you); the
-- real access boundary is still "do you have an approved account at all,"
-- same as the frontend's own email gate. It does NOT yet stop a Manager from
-- reading another module's table directly outside the UI — see the honest
-- caveat in SUPABASE_SETUP.md.
drop policy if exists records_all_approved on public.records;
create policy records_all_approved on public.records
  for all using (public.is_approved_active(auth.uid()))
  with check (public.is_approved_active(auth.uid()));

-- ============================================================================
-- 9. Realtime — so one person's change shows up live for everyone else
--    (the whole point of a real shared database instead of per-browser
--    localStorage).
-- ============================================================================

-- Wrapped so re-running this whole file a second time (e.g. after fixing a
-- typo earlier in it) doesn't fail on "table is already a member" here.
do $$
begin
  alter publication supabase_realtime add table public.records;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null;
end $$;
