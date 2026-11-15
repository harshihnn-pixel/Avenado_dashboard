// Every demo "collection" (leads, tasks, bookings, etc.) across the app
// used to read/write these through plain localStorage. They now go through
// recordsStore.ts instead — a real, shared Supabase table — but every
// function here keeps its original name and shape, so none of the ~30
// pages that import from this file needed to change.
//
// The one real behavior change: loadCollection() alone can't tell a caller
// when fresh data arrives from the server (localStorage never had that
// problem — it was synchronous and single-browser). Anywhere that matters —
// which is everywhere data is shown on screen — use the useCollectionSnapshot
// hook below instead of calling loadCollection() directly inside a
// component; it subscribes so the component re-renders the moment real
// data loads or another person's change comes in over realtime.
import { useSyncExternalStore } from 'react';
import * as recordsStore from './recordsStore';

export type { Row } from './recordsStore';
type Row = Record<string, any> & { id: string };

/** One-off synchronous snapshot — whatever's cached right now, or `fallback` if nothing's loaded yet. */
export function loadCollection<T>(key: string, fallback: T[] = []): T[] {
  return recordsStore.getSnapshot(key, fallback as any) as any;
}

/** Whole-array replace (used by the handful of "singleton config" call sites — see recordsStore.replaceAll). */
export function saveCollection<T>(key: string, data: T[]): void {
  recordsStore.replaceAll(key, data as any);
}

/**
 * React hook: the live, auto-updating version of loadCollection. Re-renders
 * this component when the initial fetch resolves or when anyone (including
 * another person, over realtime) changes this collection.
 */
export function useCollectionSnapshot<T>(key: string, fallback: T[] = []): T[] {
  return useSyncExternalStore(
    (onStoreChange) => recordsStore.subscribe(key, onStoreChange),
    () => recordsStore.getSnapshot(key, fallback as any) as any,
  );
}

// There is no "wipe every real record" button anymore — this used to sweep
// every `avenado-os:data:*` localStorage key back to empty, which made
// sense for a single browser's own demo state. Against a real shared
// database that everyone's account reads, that would delete the whole
// company's real data, so this app no longer exposes it (see Topbar.tsx —
// "Reset demo data" was removed from the account menu for the same reason).
export function resetAllCollections(): void {
  console.warn(
    '[persist] resetAllCollections() was called, but a real Supabase backend is connected now — ' +
    'this app deliberately does not wipe shared data. No-op.',
  );
}

export function genId(prefix = 'id'): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  } catch { /* fall through to the timestamp-based id below */ }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
