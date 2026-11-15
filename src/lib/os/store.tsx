// App-wide frontend state: the signed-in session, the real account's role
// (derived from their `profiles` row — not user-chosen), the Manager/HR
// in-dashboard sub-role (also fixed by their account now, not a toggle),
// and sidebar collapse state.
//
// This is the real-backend build: "signing in" is a real Supabase Auth
// session, and "which portal you see" is decided by your own profiles row
// (role/approved/account_active), kept live via a realtime subscription to
// that one row — so an Owner approving you, or changing your role, takes
// effect in your own open tab without you having to sign out and back in.
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Role, SubRole, Profile } from './types';
import { getSupabase, configError } from './supabaseClient';
import { signOut as authSignOut } from './auth';
import { setCurrentUserId } from './recordsStore';

const SIDEBAR_KEY = 'avenado-os:sidebar-collapsed';

export type AuthStatus = 'loading' | 'config-error' | 'signed-out' | 'signed-in';

interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  role: Role | null;
  sub_role: SubRole | null;
  designation: string | null;
  approved: boolean;
  account_active: boolean;
  is_founder: boolean;
}

interface AppState {
  authStatus: AuthStatus;
  configErrorMessage: string | null;
  userEmail: string | null;
  /** The real account's own row, whatever its approval state — AuthScreens reads this to explain a pending/deactivated account. */
  accountRow: ProfileRow | null;
  /** null until signed in AND approved AND active — the only thing that actually opens a dashboard. */
  role: Role | null;
  subRole: SubRole; // fixed by the account once role === 'manager-hr'; not user-settable
  setSubRole: (s: SubRole) => void; // kept only for prop-compatibility with Sidebar.tsx's toggle UI — a no-op now
  profile: Profile | undefined;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  signOut: () => Promise<void>;
}

const AppCtx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const cfgErr = configError();
  const [authStatus, setAuthStatus] = useState<AuthStatus>(cfgErr ? 'config-error' : 'loading');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [accountRow, setAccountRow] = useState<ProfileRow | null>(null);
  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(() => {
    try { return localStorage.getItem(SIDEBAR_KEY) === '1'; } catch { return false; }
  });

  const setSidebarCollapsed = (v: boolean) => {
    setSidebarCollapsedState(v);
    try { localStorage.setItem(SIDEBAR_KEY, v ? '1' : '0'); } catch { /* ignore */ }
  };

  // Loads (or re-loads) the signed-in user's own profiles row, and keeps a
  // realtime subscription open on it so an Owner's approval/role change
  // reaches this tab without a reload.
  useEffect(() => {
    if (cfgErr) return;
    let cancelled = false;
    let channel: any = null;

    async function loadProfile(userId: string) {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
        if (cancelled) return;
        if (error) {
          console.error('[store] could not load profile:', error.message);
          setAccountRow(null);
          return;
        }
        setAccountRow(data as ProfileRow | null);
      } catch (err) {
        if (!cancelled) { console.error('[store] could not load profile:', err); setAccountRow(null); }
      }
    }

    function subscribeToOwnProfile(userId: string) {
      try {
        const supabase = getSupabase();
        channel = supabase
          .channel(`profile-${userId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
            (payload: any) => { if (!cancelled && payload.new) setAccountRow(payload.new as ProfileRow); },
          )
          .subscribe();
      } catch (err) {
        console.error('[store] could not subscribe to own profile:', err);
      }
    }

    (async () => {
      try {
        const supabase = getSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (session?.user) {
          setUserEmail(session.user.email || null);
          setCurrentUserId(session.user.id);
          setAuthStatus('signed-in');
          await loadProfile(session.user.id);
          subscribeToOwnProfile(session.user.id);
        } else {
          setAuthStatus('signed-out');
        }
      } catch (err) {
        console.error('[store] could not read the current session:', err);
        if (!cancelled) setAuthStatus('signed-out');
      }
    })();

    let authSub: { unsubscribe: () => void } | null = null;
    try {
      const supabase = getSupabase();
      const { data } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
        if (cancelled) return;
        if (session?.user) {
          setUserEmail(session.user.email || null);
          setCurrentUserId(session.user.id);
          setAuthStatus('signed-in');
          loadProfile(session.user.id);
          if (channel) { try { getSupabase().removeChannel(channel); } catch { /* ignore */ } }
          subscribeToOwnProfile(session.user.id);
        } else {
          setUserEmail(null);
          setAccountRow(null);
          setCurrentUserId(null);
          setAuthStatus('signed-out');
          if (channel) { try { getSupabase().removeChannel(channel); } catch { /* ignore */ } channel = null; }
        }
      });
      authSub = data.subscription;
    } catch (err) {
      console.error('[store] could not subscribe to auth state:', err);
    }

    return () => {
      cancelled = true;
      authSub?.unsubscribe();
      if (channel) { try { getSupabase().removeChannel(channel); } catch { /* ignore */ } }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfgErr]);

  // role is null — no dashboard — unless the account is approved AND active.
  // An unapproved or deactivated account still has `accountRow` populated
  // (AuthScreens uses that to explain why), but never a role.
  const role: Role | null = accountRow && accountRow.approved && accountRow.account_active ? accountRow.role : null;
  const subRole: SubRole = (accountRow?.sub_role as SubRole) || 'manager';
  const setSubRole = useCallback((_s: SubRole) => { /* fixed by the account now — see Sidebar.tsx's read-only toggle */ }, []);

  const profile: Profile | undefined = accountRow
    ? {
        id: accountRow.id,
        full_name: accountRow.full_name || accountRow.email,
        email: accountRow.email,
        role: (accountRow.role as Role) || 'employee',
        subRole: (accountRow.sub_role as SubRole) || undefined,
        designation: accountRow.designation,
        department_id: null,
        approved: accountRow.approved,
        avatar_url: null,
        isRealPerson: accountRow.is_founder,
      }
    : undefined;

  useEffect(() => {
    const label = role === 'manager-hr' ? (subRole === 'hr' ? 'HR' : 'Manager') : role ? role[0].toUpperCase() + role.slice(1) : '';
    document.title = role ? `Avenado OS — ${label}` : 'Avenado OS';
  }, [role, subRole]);

  const signOut = useCallback(async () => {
    await authSignOut();
    // onAuthStateChange above handles clearing state; nothing else to do.
  }, []);

  return (
    <AppCtx.Provider
      value={{
        authStatus, configErrorMessage: cfgErr, userEmail, accountRow,
        role, subRole, setSubRole, profile, sidebarCollapsed, setSidebarCollapsed, signOut,
      }}
    >
      {children}
    </AppCtx.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
