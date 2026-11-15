# Supabase setup — step by step

This app now runs on a real Supabase backend: real accounts (email + password), a real shared
database, and live updates across everyone's browser. You need to create a Supabase project and
point this app at it — nobody else can do that step for you, since it's tied to your own Supabase
account. This walkthrough assumes you've never used Supabase before.

## 1. Create the project

1. Go to [supabase.com](https://supabase.com) and sign up (or sign in).
2. Click **New project**. Pick any organization, give the project a name (e.g. `avenado-os`), set
   a database password (save it somewhere — you probably won't need it again, but don't lose it),
   and pick a region close to your team.
3. Wait 1-2 minutes for the project to finish provisioning.

## 2. Run the database migration

1. In your new project, open **SQL Editor** in the left sidebar → **New query**.
2. Open `supabase/001_init.sql` from this project, copy its entire contents, and paste it into the
   query editor.
3. Click **Run**. It should finish with no errors. This one file creates everything: the
   `profiles`, `invites`, and `records` tables, the triggers that wire signup → profile creation,
   the row-level security policies that lock everything down, and realtime so changes show up live.
4. It also pre-approves the two founder accounts as Owners:
   - `kishorkumarreddy222@gmail.com` (Kishor Kumar Reddy)
   - `nharshitha821@gmail.com` (Harshitha N)

   Whichever of these two emails signs up first in step 5 gets Owner access immediately — no
   separate approval step needed for either of you.

## 3. Turn off "Confirm email" (optional, but recommended while testing)

By default Supabase requires a confirmation-email click before a new account can sign in. That's
fine in production, but while you're getting set up it's an extra step per person. To turn it off:

1. **Authentication** → **Providers** → **Email** (or **Authentication** → **Settings** depending
   on your Supabase version).
2. Turn off **Confirm email**.
3. Save.

You can turn this back on later once you're ready for real teammates to sign up.

## 4. Get your API keys

1. **Settings** (gear icon, bottom of the left sidebar) → **API**.
2. You need two values from this page:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public** key (under **Project API keys**) — a long string starting with `eyJ...`
3. **Do not use the `service_role` key anywhere in this app.** That key bypasses every security
   rule above and must never be shipped to a browser. The app only ever needs the `anon` key.

## 5. Configure the app

1. In this project's folder, copy `public/config.example.js` to `public/config.js`:
   ```sh
   cp public/config.example.js public/config.js
   ```
2. Open `public/config.js` and fill in the two values from step 4:
   ```js
   window.__AVENADO_CONFIG__ = {
     SUPABASE_URL: 'https://abcdefgh.supabase.co',
     SUPABASE_ANON_KEY: 'eyJ...',
   };
   ```
3. `public/config.js` is already in `.gitignore` — it holds your project's own keys, so it's never
   committed. Each person who runs this app locally creates their own copy of this file.

## 6. Install the new dependency and run it

```sh
npm install
npm run dev
```

Open the printed local URL. You should land on a real sign-in/sign-up screen.

## 7. Create the first account

1. Click **Create an account**. Sign up with one of the two founder emails above (so you land
   straight in as Owner) or any other email (which will sit "pending approval" until an Owner
   approves it from **Team & Access**).
2. If you left "Confirm email" on in step 3, check your inbox and click the confirmation link, then
   sign in.
3. Once signed in as a founder, open **Team & Access** in the Owner portal to approve everyone
   else: anyone who creates an account shows up there, pending, until you pick their portal/role
   and hit Approve.

## What's real now vs. what's still worth knowing

- **Real accounts.** Email + password via Supabase Auth, with sign-up, sign-in, "forgot password,"
  and session persistence (you stay signed in across reloads).
- **Real shared database.** Every module — tasks, leads, attendance, bookings, finance, the CRM
  staffing model, everything — reads and writes to your Supabase project, not `localStorage`. Two
  people in two browsers now see each other's changes live.
- **Access control that's actually enforced server-side**, not just hidden in the UI: row-level
  security policies mean only an active Owner can read/write the `invites` table or change anyone's
  role/approval, and only an approved + active account can read/write app data at all. This isn't
  cosmetic — someone poking at the API directly with the anon key still can't bypass it.
- **One honest gap, by design, for this pass:** every approved account (Owner, Manager/HR, or
  Employee alike) can read and write every module's data at the database level, the same way the
  old frontend-only build let any approved email use any UI page. The dashboards still only *show*
  each role what it should see, but someone opening browser devtools could call the database
  directly and reach another module's records. Tightening this to real per-module, per-role
  database rules is a well-scoped follow-up, not something silently papered over here.
- **Project/task completion and employee productivity are now live, not typed-in numbers.** Every
  completion % shown on the Owner dashboard, the Projects list, a project's Team tab, Team Status
  cards, and an employee's Productivity tab is computed on the fly from real `tasks` rows (verified
  by a Manager/HR) — there's nothing to "update," it moves on its own as work gets reported and
  verified. The one real, entered number is an employee's **target**, settable by an Owner or
  Manager/HR from that person's Profile → Productivity tab — never invented, blank until someone
  sets it.
- **Employee Directory stays separate from login identity**, deliberately. The people you add from
  Employee Directory / Employee Management are HR roster rows (name, designation, phone, etc.) in
  the shared `records` table — they are not the same thing as a real login account. Someone needs
  both: an HR record so they show up in directory/attendance/task-assignment lists, and an invite +
  approval from Team & Access so they can actually sign in. Merging these into one concept is a
  bigger change than this pass made.
