// A single shared activity feed every module writes to when a record is
// added/updated/removed — real cross-account history now (the same
// Supabase `records` table as everything else — see recordsStore.ts),
// so an Owner's Audit Log actually shows what a Manager or Employee did,
// not just this browser's own session.
//
// This appends one row at a time via recordsStore.insertRow() directly,
// rather than going through persist.ts's loadCollection/saveCollection
// (a whole-array replace) — logActivity() fires on every single add/
// update/remove across the whole app, so rewriting the entire log on every
// one of those would mean re-uploading hundreds of unchanged rows just to
// add one. A real database doesn't need localStorage's old 200-entry cap
// either (that existed only to bound one browser's storage), so this no
// longer trims — the Audit Log shows full history.
import * as recordsStore from './recordsStore';
import { useCollectionSnapshot } from './persist';
import { genId } from './persist';

export interface ActivityEntry {
  id: string;
  text: string;
  at: string; // ISO timestamp
  meta?: Record<string, unknown>;
}

const KEY = 'activity';

export function logActivity(text: string, meta?: Record<string, unknown>) {
  try {
    const entry: ActivityEntry = { id: genId('act'), text, at: new Date().toISOString(), meta };
    recordsStore.insertRow(KEY, entry);
  } catch {
    /* best-effort only */
  }
}

/** One-off snapshot — prefer useActivityFeed() in a component so it re-renders on new entries. */
export function readActivity(): ActivityEntry[] {
  return recordsStore.getSnapshot(KEY, []);
}

export function useActivityFeed(): ActivityEntry[] {
  return useCollectionSnapshot<ActivityEntry>(KEY, []);
}
