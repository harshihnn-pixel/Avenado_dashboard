// Every dashboard page reads/writes its data through this one hook. It
// used to be backed entirely by localStorage; it's now backed by the real
// shared `records` table in Supabase (via recordsStore.ts), with the exact
// same {items, add, update, remove, reset} shape every call site already
// expects — so nothing above this hook had to change, even though the name
// now undersells what it does ("local" meant "not a backend", when there
// was no backend; kept the name anyway rather than rename ~30 import
// lines over a comment).
import { useCallback } from 'react';
import { useCollectionSnapshot } from './persist';
import * as recordsStore from './recordsStore';
import { genId } from './persist';
import { logActivity } from './activity';

export type Row = Record<string, any> & { id: string };

export function useLocalCollection(key: string, label: string, seed: Row[] = []) {
  const items = useCollectionSnapshot<Row>(key, seed);

  const add = useCallback((row: Omit<Row, 'id'>) => {
    const newRow: Row = { id: genId(key), ...row };
    recordsStore.insertRow(key, newRow);
    logActivity(`Added ${label.toLowerCase()} entry`, { key, id: newRow.id });
    return newRow;
  }, [key, label]);

  const update = useCallback((id: string, patch: Partial<Row>) => {
    recordsStore.updateRow(key, id, patch);
    logActivity(`Updated ${label.toLowerCase()} entry`, { key, id });
  }, [key, label]);

  const remove = useCallback((id: string) => {
    recordsStore.removeRow(key, id);
    logActivity(`Removed ${label.toLowerCase()} entry`, { key, id });
  }, [key, label]);

  // No longer wipes anything real (see persist.ts's resetAllCollections) —
  // kept only so the handful of callers that destructure `reset` don't
  // break; it's a deliberate no-op against shared data.
  const reset = useCallback(() => {
    console.warn(`[useLocalCollection] reset() on "${key}" is a no-op against the real shared database.`);
  }, [key]);

  return { items, add, update, remove, reset };
}
