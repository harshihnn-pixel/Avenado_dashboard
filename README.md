# Avenado OS

A company operating system with three portals — Owner, Manager/HR, Employee — covering tasks, daily reports,
attendance, CRM, projects and finance.

## What this build is

This is the full app wired to a **real Supabase backend**: real accounts (email + password via Supabase Auth),
a real shared Postgres database behind every module, server-enforced access control (row-level security, not
just hidden UI), and live updates — one person's change shows up in everyone else's browser without a reload.

There is no project set up yet in this zip — **you create your own Supabase project** and point the app at it.
**→ See [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) for the full step-by-step walkthrough.** Nothing works (you'll
see a "Supabase isn't configured yet" screen) until you've done that.

## How it's wired

- `supabase/001_init.sql` — run this once in your Supabase project. Creates `profiles` (real accounts),
  `invites` (who an Owner has invited and what role they'll get), and `records` (one generic table backing
  every module — tasks, leads, attendance, bookings, finance, CRM staffing model, everything), plus the
  triggers and row-level security policies that enforce access server-side.
- `src/lib/os/supabaseClient.ts` — builds the Supabase client from `public/config.js` (your project URL + anon
  key; gitignored, never committed — see `public/config.example.js`).
- `src/lib/os/auth.ts` — sign up, sign in, sign out, password reset.
- `src/lib/os/recordsStore.ts` + `src/lib/os/persist.ts` + `src/lib/os/useLocalCollection.ts` — every dashboard
  page still calls the exact same `useLocalCollection(key, label, seed)` API it always did; underneath, it now
  reads/writes/subscribes to the real `records` table in real time instead of `localStorage`.
- `src/lib/os/store.tsx` — the signed-in session and the account's real role/approval/active state, loaded from
  `profiles` and kept live via a realtime subscription.
- `src/components/os/AuthScreens.tsx` — real sign-in / sign-up / forgot-password screens, plus a clear
  "pending approval" / "deactivated" screen for an account that's signed in but not yet opened into a portal.
- `src/dashboards/owner/TeamAccess.tsx` + `src/lib/os/teamAccess.ts` — an Owner's real approve/role/deactivate
  screen, backed by the `invites` and `profiles` tables. There's one way in: a person creates their own account
  from the sign-in screen (confirming their email the normal Supabase way), shows up here pending, and an Owner
  picks their portal/role and hits Approve — no separate owner-initiated "send an invite by email" step.
- `src/lib/os/projectMetrics.ts` — the shared, live completion-math used everywhere a "how much is done" number
  or chart shows up (Owner dashboard, Projects list, a project's Team tab, Team Status cards, an employee's
  Productivity tab): per-project and per-employee completion %, computed from real `tasks` rows, never fabricated
  or typed in. The one real entered number, an employee's `target`, lives in its own `employee-targets` records
  and is editable only by an Owner or Manager/HR from that person's Profile.

## Quick start

```sh
npm install
cp public/config.example.js public/config.js   # then fill in your Supabase URL + anon key
npm run dev
```

See `SUPABASE_SETUP.md` if you haven't created a Supabase project yet — that's the step that makes the app
actually work.

```sh
npm run build   # production build -> dist/
```

## Verification note

This zip was assembled in a sandboxed tool with no access to the npm registry, so the real third-party
packages (`@radix-ui/*`, `cmdk`, `lucide-react`, `@supabase/supabase-js`, the Tailwind v4 toolchain) couldn't be
installed there. To verify this pass anyway: every file this pass touched or added was hand-reviewed against
the real Supabase JS v2 API shapes and this project's own types, and every file (new and edited) was run
through a real `esbuild` syntax check plus a full whole-app `esbuild` bundle build (third-party packages marked
external, since they aren't installed in this sandbox) — the entire app's import graph, including every new
file, resolves and compiles cleanly. The UI layer was previously verified end-to-end with a real TypeScript
compiler and real rendered screenshots in an earlier pass. The Supabase-specific code paths — auth, the
`records` realtime store, row-level security — have **not** been run against a live database or a live
Supabase project in this sandbox, since there's no network access to one here. Please run `npm install`,
complete `SUPABASE_SETUP.md`, and tell me if anything doesn't behave as described.

## Known, disclosed gap

Row-level security currently enforces "do you have an approved + active account at all" for the `records`
table — the same boundary the previous frontend-only build had. It does not yet add per-module, per-role
database rules (e.g. stopping a Manager from reading Finance's rows directly via the API rather than through
the UI, which already hides that page from them). See `SUPABASE_SETUP.md`'s "What's real now" section for the
full explanation — this is a disclosed trade-off for delivering every module at once, not an oversight.

## What changed from the previous (frontend-only) delivery

Added: `supabase/001_init.sql`, `public/config.example.js`, `SUPABASE_SETUP.md`, `src/lib/os/supabaseClient.ts`,
`src/lib/os/auth.ts`, `src/lib/os/recordsStore.ts`, `src/components/os/AuthScreens.tsx`.

Rewritten to be Supabase-backed (same public API every dashboard page already calls, so no dashboard file
needed to change): `src/lib/os/persist.ts`, `src/lib/os/useLocalCollection.ts`, `src/lib/os/useStaffingModel.ts`,
`src/lib/os/employeeOptions.ts`, `src/lib/os/activity.ts`, `src/lib/os/store.tsx`, `src/lib/os/teamAccess.ts`,
`src/dashboards/owner/TeamAccess.tsx`, `src/dashboards/owner/Settings.tsx`.

Removed: `src/components/os/PortalSelect.tsx` (replaced by `AuthScreens.tsx`); the "Reset demo data" and
"Switch portal" actions in the account menu (replaced by a real "Sign out").

Unchanged: every dashboard page's own UI and logic, every other component, `src/styles/avenado.css`,
`src/styles.css`, `src/lib/os/mock-data.ts` (still used for a handful of UI sample labels unrelated to login
identity — see `SUPABASE_SETUP.md`'s note on Employee Directory staying separate from login accounts),
`src/lib/os/theme.ts`, `src/lib/os/types.ts`, `src/lib/os/reportMetrics.ts`.

## What changed — live completion charts

Added `src/lib/os/projectMetrics.ts` (the shared live completion-math) and extended, in small, additive ways —
nothing about the existing dashboards' design or layout changed, every edit below only adds a new chart,
column, or field next to what was already there:
- `src/dashboards/owner/OwnerDashboard.tsx` — added a live "Project completion" chart.
- `src/dashboards/owner/ProjectsPage.tsx` — added a live "Completion" column.
- `src/dashboards/owner/ProjectDetail.tsx` — the Team tab's plain table now also shows a completion-%-by-person
  bar chart above it.
- `src/dashboards/shared/EmployeeProfile.tsx` — the Productivity tab now has a "Days active" stat, a real
  Owner/Manager-HR-editable `target` field, and a gauge showing verified tasks against that target.
- `src/dashboards/shared/People.tsx` — Team Status cards now show each person's live verified/total task count
  and completion %.

## What changed — removed the separate invite-email step, a couple of fixes

- **Invitation flow simplified to one path.** There's no more owner-initiated "send an invite by name + email"
  step, and no more automatic/real invite-email sending (that standalone mail server has been removed
  entirely). Self-signup is the only way in now: a person creates their own account from the sign-in screen,
  confirms their email the normal Supabase way, and shows up in **Team & Access → Pending approval** for an
  Owner to pick their portal/role and approve. `src/dashboards/owner/TeamAccess.tsx` and
  `src/lib/os/teamAccess.ts` were both trimmed back to just that; `src/lib/os/supabaseClient.ts`,
  `public/config.example.js`, `package.json`, and `.gitignore` had every trace of the invite-mail server
  removed with it.
- **Fixed: "Founder" badge showing on the wrong account.** `src/dashboards/owner/TeamAccess.tsx`'s Active
  accounts list now shows the "Founder" badge for Kishor Kumar Reddy's email specifically, not Harshitha's — it
  no longer trusts the database's `is_founder` column for this (that column is only set at the moment someone
  first signs up, so an account created before this schema existed can end up with it stuck at `false` even
  though it really is one of the two founder emails). `src/lib/os/teamAccess.ts`'s founder-based protection
  against accidentally deactivating either real founder account was made robust the same way, so it can't be
  thrown off by the same stale-column issue.
- **Added an "Others" department.** The Add Employee / Employee Management department dropdown
  (`src/lib/os/mock-data.ts`'s `DEPARTMENTS`) had only Sales, Marketing, Operations, and HR / Admin — anyone
  outside those four had no option that fit. Added "Others" as a fifth choice; the Owner dashboard's
  "Departments" count reflects it too, since it's now a real selectable department.
