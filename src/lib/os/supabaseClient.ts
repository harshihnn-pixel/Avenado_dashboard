// Builds the real Supabase client from public/config.js (loaded as a plain
// <script> in index.html, before this bundle — see that file). No Vite, so
// no import.meta.env; this is the same runtime-config approach this app's
// very first Supabase build used, because it survives a plain static build
// with nothing to substitute at build time.
//
// Lesson from this app's Phase 5 hardening: touching a misconfigured client
// must never throw synchronously where a React effect can't catch it — that
// is exactly what left an earlier version of this app stuck on its loading
// screen forever. So this file never throws; it reports `configError`
// instead, and every caller checks that before using `supabase`.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface AvenadoConfig {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

declare global {
  interface Window {
    __AVENADO_CONFIG__?: Partial<AvenadoConfig>;
    __AVENADO_CONFIG_MISSING__?: boolean;
  }
}

function readConfig(): { config: AvenadoConfig | null; error: string | null } {
  if (typeof window === 'undefined') return { config: null, error: 'Not running in a browser.' };

  if (window.__AVENADO_CONFIG_MISSING__ || !window.__AVENADO_CONFIG__) {
    return {
      config: null,
      error:
        "No public/config.js found. Copy public/config.example.js to public/config.js and fill in " +
        "your Supabase project's URL and anon key — see SUPABASE_SETUP.md.",
    };
  }

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.__AVENADO_CONFIG__;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('your-project-ref')) {
    return {
      config: null,
      error:
        'public/config.js exists but still has placeholder values. Fill in your real Supabase ' +
        'project URL and anon key — see SUPABASE_SETUP.md.',
    };
  }

  return { config: { SUPABASE_URL, SUPABASE_ANON_KEY }, error: null };
}

let cachedClient: SupabaseClient | null = null;
let cachedError: string | null = null;
let attempted = false;

function ensureClient(): { client: SupabaseClient | null; error: string | null } {
  if (attempted) return { client: cachedClient, error: cachedError };
  attempted = true;
  const { config, error } = readConfig();
  if (error || !config) {
    cachedError = error;
    return { client: null, error };
  }
  try {
    cachedClient = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    return { client: cachedClient, error: null };
  } catch (err: any) {
    cachedError = `Could not create the Supabase client: ${err?.message || String(err)}`;
    return { client: null, error: cachedError };
  }
}

/** The error string if Supabase isn't configured/reachable yet, otherwise null. Check this first. */
export function configError(): string | null {
  return ensureClient().error;
}

/**
 * The real Supabase client. Only call this after confirming `configError()`
 * is null — if config is bad this throws, same as the rest of the app's
 * "fail loud at the one checked call site, not deep inside an effect" rule.
 */
export function getSupabase(): SupabaseClient {
  const { client, error } = ensureClient();
  if (!client) throw new Error(error || 'Supabase is not configured.');
  return client;
}
