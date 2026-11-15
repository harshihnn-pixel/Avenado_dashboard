// The one real primitive behind every "collection" in this app (tasks,
// leads, attendance, the CRM Staffing Model's editable assumptions, the
// Team & Access invite list before it existed as its own table — all of
// it): an in-memory cache per collection name, kept in sync with the
// Supabase `records` table via an initial fetch plus a realtime
// subscription, with optimistic local writes so the UI never waits on a
// round-trip to feel responsive.
//
// Every read in this app used to be perfectly synchronous (localStorage
// never has a loading state). Supabase obviously isn't synchronous, so this
// cache is what lets `persist.ts`'s loadCollection/saveCollection — and
// every page that calls them directly instead of going through
// useLocalCollection — keep working as synchronous-looking calls: the
// first call returns whatever's in the cache right now (empty, usually,
// the very first time) and kicks off a background fetch; once that
// resolves, anything subscribed via useCollectionSnapshot (see persist.ts)
// re-renders with the real data. This is a plain, deliberate cache — not a
// replacement for Supabase's own consistency guarantees.
import { getSupabase, configError } from './supabaseClient';

export type Row = Record<string, any> & { id: string };
type Listener = () => void;

interface CacheEntry {
  rows: Row[];
  loaded: boolean;
  listeners: Set<Listener>;
  started: boolean;
}

const cache = new Map<string, CacheEntry>();
let currentUserId: string | null = null;

/** Set once by store.tsx whenever the signed-in user changes, so writes can stamp created_by. */
export function setCurrentUserId(id: string | null) {
  currentUserId = id;
}

function entryFor(collection: string): CacheEntry {
  let e = cache.get(collection);
  if (!e) {
    e = { rows: [], loaded: false, listeners: new Set(), started: false };
    cache.set(collection, e);
  }
  if (!e.started) {
    e.started = true;
    startSync(collection, e);
  }
  return e;
}

function notify(e: CacheEntry) {
  e.listeners.forEach((l) => {
    try { l(); } catch { /* a listener's own error shouldn't break the others */ }
  });
}

function rowFromRecord(rec: { id: string; data: Record<string, any> }): Row {
  return { ...rec.data, id: rec.id };
}

async function startSync(collection: string, e: CacheEntry) {
  const cfgErr = configError();
  if (cfgErr) {
    // No Supabase configured yet — stay a harmless empty collection rather
    // than throw. AuthScreens/the config-error page is what tells the user
    // about this; every data page just renders its honest empty state.
    e.loaded = true;
    notify(e);
    return;
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('records')
      .select('id, data, created_at')
      .eq('collection', collection)
      .order('created_at', { ascending: false });
    if (!error && data) e.rows = data.map(rowFromRecord);
  } catch {
    /* best-effort initial load; realtime below will still try to connect */
  }
  e.loaded = true;
  notify(e);

  try {
    const supabase = getSupabase();
    supabase
      .channel(`records-${collection}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'records', filter: `collection=eq.${collection}` },
        (payload: any) => applyRealtimeChange(e, payload),
      )
      .subscribe();
  } catch {
    /* realtime is a live-update nicety; writes still work without it */
  }
}

function applyRealtimeChange(e: CacheEntry, payload: { eventType: string; new?: any; old?: any }) {
  if (payload.eventType === 'INSERT' && payload.new) {
    const row = rowFromRecord(payload.new);
    if (!e.rows.some((r) => r.id === row.id)) e.rows = [row, ...e.rows];
  } else if (payload.eventType === 'UPDATE' && payload.new) {
    const row = rowFromRecord(payload.new);
    e.rows = e.rows.map((r) => (r.id === row.id ? row : r));
  } else if (payload.eventType === 'DELETE' && payload.old) {
    e.rows = e.rows.filter((r) => r.id !== payload.old.id);
  } else {
    return;
  }
  notify(e);
}

export function subscribe(collection: string, listener: Listener): () => void {
  const e = entryFor(collection);
  e.listeners.add(listener);
  return () => { e.listeners.delete(listener); };
}

/** Synchronous snapshot for useSyncExternalStore — never blocks, never throws. */
export function getSnapshot(collection: string, fallback: Row[]): Row[] {
  const e = entryFor(collection);
  return e.loaded ? e.rows : fallback;
}

async function persistInsert(collection: string, row: Row) {
  try {
    const supabase = getSupabase();
    const { id, ...data } = row;
    const { error } = await supabase.from('records').insert({ id, collection, data, created_by: currentUserId });
    if (error) console.error(`[records] insert into "${collection}" failed:`, error.message);
  } catch (err) {
    console.error(`[records] insert into "${collection}" failed:`, err);
  }
}

async function persistUpdate(collection: string, id: string, data: Record<string, any>) {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('records')
      .update({ data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('collection', collection);
    if (error) console.error(`[records] update in "${collection}" failed:`, error.message);
  } catch (err) {
    console.error(`[records] update in "${collection}" failed:`, err);
  }
}

async function persistDelete(collection: string, id: string) {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('records').delete().eq('id', id).eq('collection', collection);
    if (error) console.error(`[records] delete in "${collection}" failed:`, error.message);
  } catch (err) {
    console.error(`[records] delete in "${collection}" failed:`, err);
  }
}

/** Optimistic insert: updates the local cache immediately, then writes through in the background. */
export function insertRow(collection: string, row: Row) {
  const e = entryFor(collection);
  e.rows = [row, ...e.rows];
  notify(e);
  if (!configError()) void persistInsert(collection, row);
}

export function updateRow(collection: string, id: string, patch: Partial<Row>) {
  const e = entryFor(collection);
  let full: Row | undefined;
  e.rows = e.rows.map((r) => {
    if (r.id !== id) return r;
    full = { ...r, ...patch };
    return full;
  });
  notify(e);
  if (full && !configError()) {
    const { id: _drop, ...data } = full;
    void persistUpdate(collection, id, data);
  }
}

export function removeRow(collection: string, id: string) {
  const e = entryFor(collection);
  e.rows = e.rows.filter((r) => r.id !== id);
  notify(e);
  if (!configError()) void persistDelete(collection, id);
}

/**
 * Whole-array replace, for the handful of "singleton" call sites (the CRM
 * Staffing Model's 3 config blobs, Settings' permissions-matrix and
 * company-settings) that read/write a single-row array as one unit rather
 * than through add/update/remove. Diffs against what's cached so an edit
 * doesn't delete-and-reinsert rows that didn't change.
 */
export function replaceAll(collection: string, rows: Row[]) {
  const e = entryFor(collection);
  const prevIds = new Set(e.rows.map((r) => r.id));
  const nextIds = new Set(rows.map((r) => r.id));
  const toDelete = [...prevIds].filter((id) => !nextIds.has(id));
  e.rows = rows;
  notify(e);
  if (configError()) return;
  void (async () => {
    try {
      const supabase = getSupabase();
      if (toDelete.length) {
        const { error } = await supabase.from('records').delete().eq('collection', collection).in('id', toDelete);
        if (error) console.error(`[records] cleanup delete in "${collection}" failed:`, error.message);
      }
      for (const row of rows) {
        const { id, ...data } = row;
        const { error } = await supabase
          .from('records')
          .upsert({ id, collection, data, created_by: currentUserId, updated_at: new Date().toISOString() });
        if (error) console.error(`[records] upsert in "${collection}" failed:`, error.message);
      }
    } catch (err) {
      console.error(`[records] replaceAll in "${collection}" failed:`, err);
    }
  })();
}
