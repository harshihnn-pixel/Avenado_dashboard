// Real Supabase Auth: sign up, sign in, sign out, password reset. Every
// function here returns { error } rather than throwing, and every `await`
// is inside a try/catch — this app got burned once already (Phase 7) by an
// unguarded `await` throw leaving a "Please wait…" button stuck forever
// because the line that clears the busy flag never ran. Never remove these
// try/catches to "simplify."
import { getSupabase, configError } from './supabaseClient';

export interface AuthResult {
  error: string | null;
}

function friendlyAuthError(err: any): string {
  const msg = String(err?.message || err || 'Something went wrong.');
  if (/invalid login credentials/i.test(msg)) return 'Wrong email or password.';
  if (/email not confirmed/i.test(msg)) return 'Please confirm your email first — check your inbox for the confirmation link.';
  if (/user already registered|already exists/i.test(msg)) return 'An account with this email already exists — try signing in instead.';
  if (/rate limit/i.test(msg)) return 'Too many attempts — please wait a minute and try again.';
  return msg;
}

export async function signUp(email: string, password: string, fullName: string): Promise<AuthResult> {
  const cfgErr = configError();
  if (cfgErr) return { error: cfgErr };
  try {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });
    if (error) return { error: friendlyAuthError(error) };
    return { error: null };
  } catch (err) {
    return { error: friendlyAuthError(err) };
  }
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const cfgErr = configError();
  if (cfgErr) return { error: cfgErr };
  try {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { error: friendlyAuthError(error) };
    return { error: null };
  } catch (err) {
    return { error: friendlyAuthError(err) };
  }
}

export async function signOut(): Promise<AuthResult> {
  const cfgErr = configError();
  if (cfgErr) return { error: cfgErr };
  try {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signOut();
    if (error) return { error: friendlyAuthError(error) };
    return { error: null };
  } catch (err) {
    return { error: friendlyAuthError(err) };
  }
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const cfgErr = configError();
  if (cfgErr) return { error: cfgErr };
  try {
    const supabase = getSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    });
    if (error) return { error: friendlyAuthError(error) };
    return { error: null };
  } catch (err) {
    return { error: friendlyAuthError(err) };
  }
}

/** Called from the "set a new password" screen reached via the reset-password email link. */
export async function setOwnPassword(newPassword: string): Promise<AuthResult> {
  const cfgErr = configError();
  if (cfgErr) return { error: cfgErr };
  try {
    const supabase = getSupabase();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: friendlyAuthError(error) };
    return { error: null };
  } catch (err) {
    return { error: friendlyAuthError(err) };
  }
}
