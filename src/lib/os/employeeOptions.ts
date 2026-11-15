// The pool of names a task/attendance record can be assigned to — real
// founder accounts plus whatever has been added via Employee Management
// (the shared 'team-members' collection, now a real Supabase-backed table —
// see recordsStore.ts). A hook, not a plain function, so a page using it
// re-renders the moment Employee Management data loads or someone else
// adds a team member.
import { PROFILES } from './mock-data';
import { useCollectionSnapshot } from './persist';

export function useAssignableNames(): string[] {
  const real = PROFILES.filter((p) => p.isRealPerson).map((p) => p.full_name);
  const demo = PROFILES.filter((p) => !p.isRealPerson).map((p) => p.full_name);
  const teamMembers = useCollectionSnapshot<{ full_name?: string }>('team-members', []);
  const team = teamMembers.map((t) => t.full_name).filter(Boolean) as string[];
  return Array.from(new Set([...real, ...demo, ...team]));
}
