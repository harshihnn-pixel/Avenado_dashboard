// Real sign-in: Supabase Auth email+password, replacing the old frontend-
// demo "type an approved email, no password" PortalSelect.tsx. This file
// covers every state useApp()'s authStatus/accountRow can be in:
//   - config-error: public/config.js missing/placeholder — tell the dev, not the end user.
//   - signed-out: sign in, sign up, or request a password reset.
//   - signed-in but accountRow is null/unapproved/deactivated: explain why there's still no dashboard.
// AvenadoApp.tsx's Root() renders this whenever role is null, and swaps to
// the real dashboard the instant an Owner approves this account — the
// realtime subscription in store.tsx handles that without a reload.
import React, { useState } from 'react';
import { useApp } from '@/lib/os/store';
import { signUp, signIn, requestPasswordReset } from '@/lib/os/auth';
import { IconBuilding, IconBriefcase, IconUsers, IconCrown, IconAlert, IconCircleCheck, IconClock } from './icons';
import { ThemeToggle } from './ThemeToggle';

const PORTALS: { icon: typeof IconBriefcase; title: string; desc: string }[] = [
  { icon: IconBriefcase, title: 'Employee', desc: 'Start and end your day, log every piece of work, track tasks and leaves, and send your daily report.' },
  { icon: IconUsers, title: 'Manager / HR', desc: "Assign and split tasks, watch each employee's progress, and approve reports and leaves." },
  { icon: IconCrown, title: 'Owner', desc: 'See everything — people and access, attendance, projects, finance and monthly reports.' },
];

type Mode = 'sign-in' | 'sign-up' | 'forgot';

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <div className="flex items-center gap-3">
          <div className="auth-brand-mark"><IconBuilding size={17} /></div>
          <div>
            <div className="auth-brand-name">Avenado OS</div>
            <div className="auth-muted text-xs">Company operating system</div>
          </div>
        </div>
        <div className="auth-aside-body">
          <h2 className="auth-headline">Every task, every hour, every booking — in one place.</h2>
          <p className="auth-muted" style={{ fontSize: 15, marginTop: 14, lineHeight: 1.6 }}>
            Employees report their day, managers guide the work, and owners see the full picture.
          </p>
          <div className="flex flex-col gap-3" style={{ marginTop: 32 }}>
            {PORTALS.map((p) => (
              <div key={p.title} className="auth-portal">
                <div className="auth-portal-icon"><p.icon size={17} /></div>
                <div style={{ textAlign: 'left' }}>
                  <div className="auth-portal-title">{p.title} portal</div>
                  <div className="auth-muted" style={{ fontSize: 13, marginTop: 2, lineHeight: 1.5 }}>{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="auth-faint text-xs">
          Access is by invitation from an Owner. Signing up works for anyone, but no portal opens until an Owner
          approves your account from Team &amp; Access.
        </div>
      </aside>
      <main className="auth-main">
        <div className="auth-card av-animate-in" style={{ maxWidth: 440 }}>
          <div className="flex items-center justify-between mb-6">
            <div className="auth-mobile-brand">
              <div className="sidebar-brand-mark"><IconBuilding size={16} /></div>
              <span className="font-semibold">Avenado OS</span>
            </div>
            <div style={{ marginLeft: 'auto' }}><ThemeToggle /></div>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

function ConfigErrorScreen({ message }: { message: string }) {
  return (
    <AuthShell>
      <div className="page-eyebrow">Setup needed</div>
      <h1 className="auth-title">Supabase isn't configured yet</h1>
      <div className="form-alert error mt-4" role="alert">
        <IconAlert size={16} style={{ flexShrink: 0, marginTop: 1 }} /><span>{message}</span>
      </div>
      <p className="auth-sub mt-4">See SUPABASE_SETUP.md in the project for step-by-step instructions.</p>
    </AuthShell>
  );
}

function SignInForm({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await signIn(email, password);
      if (res.error) setError(res.error);
      // On success, store.tsx's onAuthStateChange listener picks up the new session automatically.
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-eyebrow">Sign in</div>
      <h1 className="auth-title">Welcome back</h1>
      <p className="auth-sub">Sign in with the email and password you set when you signed up.</p>
      <form onSubmit={submit} style={{ marginTop: 28 }}>
        <div className="mb-4">
          <label className="field-label" htmlFor="auth-email">Email</label>
          <input id="auth-email" className="input" type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="mb-2">
          <label className="field-label" htmlFor="auth-password">Password</label>
          <input id="auth-password" className="input" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div className="flex justify-end mb-4">
          <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 12.5 }} onClick={() => setMode('forgot')}>Forgot password?</button>
        </div>
        {error && (
          <div className="form-alert error mb-4" role="alert">
            <IconAlert size={16} style={{ flexShrink: 0, marginTop: 1 }} /><span>{error}</span>
          </div>
        )}
        <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: '100%', height: 40 }}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <div className="auth-sub mt-4" style={{ textAlign: 'center' }}>
        New here?{' '}
        <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 13.5, padding: 0, height: 'auto' }} onClick={() => setMode('sign-up')}>
          Create an account
        </button>
      </div>
    </>
  );
}

function SignUpForm({ setMode }: { setMode: (m: Mode) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setBusy(true);
    try {
      const res = await signUp(email, password, name);
      if (res.error) setError(res.error);
      else setDone(true);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <>
        <div className="page-eyebrow">Check your email</div>
        <h1 className="auth-title">Almost there</h1>
        <div className="form-alert success mt-4">
          <IconCircleCheck size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>We sent a confirmation link to {email}. Click it, then sign in — an Owner still needs to approve your account before any portal opens.</span>
        </div>
        <button className="btn btn-ghost mt-4" style={{ width: '100%', height: 40 }} onClick={() => setMode('sign-in')}>Back to sign in</button>
      </>
    );
  }

  return (
    <>
      <div className="page-eyebrow">Create account</div>
      <h1 className="auth-title">Sign up</h1>
      <p className="auth-sub">Anyone can create an account — an Owner still has to approve it from Team &amp; Access before you can open a portal.</p>
      <form onSubmit={submit} style={{ marginTop: 28 }}>
        <div className="mb-4">
          <label className="field-label" htmlFor="su-name">Full name</label>
          <input id="su-name" className="input" autoComplete="name" placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="mb-4">
          <label className="field-label" htmlFor="su-email">Email</label>
          <input id="su-email" className="input" type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="mb-4">
          <label className="field-label" htmlFor="su-password">Password</label>
          <input id="su-password" className="input" type="password" autoComplete="new-password" placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </div>
        {error && (
          <div className="form-alert error mb-4" role="alert">
            <IconAlert size={16} style={{ flexShrink: 0, marginTop: 1 }} /><span>{error}</span>
          </div>
        )}
        <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: '100%', height: 40 }}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <div className="auth-sub mt-4" style={{ textAlign: 'center' }}>
        Already have an account?{' '}
        <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 13.5, padding: 0, height: 'auto' }} onClick={() => setMode('sign-in')}>
          Sign in
        </button>
      </div>
    </>
  );
}

function ForgotPasswordForm({ setMode }: { setMode: (m: Mode) => void }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await requestPasswordReset(email);
      if (res.error) setError(res.error);
      else setSent(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-eyebrow">Reset password</div>
      <h1 className="auth-title">Forgot your password?</h1>
      <p className="auth-sub">Enter your email and we'll send you a link to set a new one.</p>
      {sent ? (
        <div className="form-alert success mt-4">
          <IconCircleCheck size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>If an account exists for {email}, a reset link is on its way.</span>
        </div>
      ) : (
        <form onSubmit={submit} style={{ marginTop: 28 }}>
          <div className="mb-4">
            <label className="field-label" htmlFor="fp-email">Email</label>
            <input id="fp-email" className="input" type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          {error && (
            <div className="form-alert error mb-4" role="alert">
              <IconAlert size={16} style={{ flexShrink: 0, marginTop: 1 }} /><span>{error}</span>
            </div>
          )}
          <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: '100%', height: 40 }}>
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
      <button type="button" className="btn btn-ghost mt-4" style={{ width: '100%', height: 40 }} onClick={() => setMode('sign-in')}>Back to sign in</button>
    </>
  );
}

/** Signed in with a real session, but no open portal yet — explain why and offer to sign out. */
function AwaitingAccessScreen() {
  const { accountRow, userEmail, signOut } = useApp();
  const deactivated = accountRow && accountRow.approved && !accountRow.account_active;
  return (
    <AuthShell>
      <div className="page-eyebrow">{deactivated ? 'Account deactivated' : 'Pending approval'}</div>
      <h1 className="auth-title">{deactivated ? 'This account was deactivated' : 'Almost there'}</h1>
      <div className="form-alert mt-4" style={{ background: 'var(--av-warn-bg, rgba(217,119,6,.08))', borderColor: 'var(--av-warn-border, rgba(217,119,6,.25))' }}>
        <IconClock size={16} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          {deactivated
            ? 'An Owner has deactivated this account. Contact an Owner if that seems wrong.'
            : accountRow
              ? "You're signed in as " + (accountRow.email || userEmail) + ', but no Owner has approved this account into a portal yet. Ask an Owner to approve you from Team & Access.'
              : "You're signed in, but there's no invite or account record for this email yet. Ask an Owner to send you an invite from Team & Access."}
        </span>
      </div>
      <button className="btn btn-ghost mt-6" style={{ width: '100%', height: 40 }} onClick={() => signOut()}>Sign out</button>
    </AuthShell>
  );
}

export function AuthScreens() {
  const { authStatus, configErrorMessage } = useApp();
  const [mode, setMode] = useState<Mode>('sign-in');

  if (authStatus === 'config-error') return <ConfigErrorScreen message={configErrorMessage || 'Supabase is not configured.'} />;
  if (authStatus === 'loading') {
    return (
      <AuthShell>
        <div className="page-eyebrow">Loading</div>
        <h1 className="auth-title">One moment…</h1>
        <p className="auth-sub">Checking your session.</p>
      </AuthShell>
    );
  }
  if (authStatus === 'signed-in') return <AwaitingAccessScreen />;

  return (
    <AuthShell>
      {mode === 'sign-in' && <SignInForm mode={mode} setMode={setMode} />}
      {mode === 'sign-up' && <SignUpForm setMode={setMode} />}
      {mode === 'forgot' && <ForgotPasswordForm setMode={setMode} />}
    </AuthShell>
  );
}
