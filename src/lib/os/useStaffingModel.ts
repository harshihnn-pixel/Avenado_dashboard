// The CRM Staffing Model as *editable, live-recalculating* state — backing
// both the dedicated CRM Staffing Model module (4 tabs) and the KPIs shown
// on the Owner's Executive Overview, so an edit made in one place is
// reflected in the other (same underlying state, not two copies).
//
// Seeded with the real numbers from Avenado_CRM_Staffing_Model_1.xlsx (see
// mock-data.ts for the verbatim source values); now persisted through the
// same shared Supabase `records` table as every other collection in this
// app (see persist.ts / recordsStore.ts) — an Owner editing an assumption
// is a real change everyone with the Owner portal sees live, not a
// per-browser setting.
import { useCallback } from 'react';
import { useCollectionSnapshot, saveCollection } from './persist';
import { logActivity } from './activity';
import {
  STAFFING_ASSUMPTIONS, PROJECT_STAFFING, TEAM_SUMMARY, TEAM_SUMMARY_TOTAL,
} from './mock-data';
import type { StaffingAssumptions, ProjectStaffing, TeamSummaryRow } from './types';

const A_KEY = 'staffing-assumptions';
const P_KEY = 'staffing-projects';
const T_KEY = 'staffing-team';

// TeamSummaryRow has no `id` of its own (it's keyed by role, a small fixed
// set) — role doubles as the records-table id.
type TeamRow = TeamSummaryRow & { id: string };
const TEAM_SEED: TeamRow[] = TEAM_SUMMARY.map((r) => ({ ...r, id: r.role }));

export function useStaffingAssumptions() {
  const rows = useCollectionSnapshot<StaffingAssumptions>(A_KEY, [STAFFING_ASSUMPTIONS]);
  const assumptions = rows[0] || STAFFING_ASSUMPTIONS;
  const setAssumptions = useCallback((patch: Partial<StaffingAssumptions>) => {
    saveCollection(A_KEY, [{ ...assumptions, ...patch }]);
    logActivity('Updated CRM staffing assumptions');
  }, [assumptions]);
  const resetAssumptions = useCallback(() => { saveCollection(A_KEY, [STAFFING_ASSUMPTIONS]); }, []);
  return { assumptions, setAssumptions, resetAssumptions };
}

export function useProjectStaffing() {
  const rows = useCollectionSnapshot<ProjectStaffing>(P_KEY, PROJECT_STAFFING);
  const updateRow = useCallback((id: string, patch: Partial<ProjectStaffing>) => {
    saveCollection(P_KEY, rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    logActivity('Updated project staffing targets');
  }, [rows]);
  const resetRows = useCallback(() => { saveCollection(P_KEY, PROJECT_STAFFING); }, []);
  return { rows, updateRow, resetRows };
}

export function useTeamSummary() {
  const raw = useCollectionSnapshot<TeamRow>(T_KEY, TEAM_SEED);
  const rows: TeamSummaryRow[] = raw.map((r) => ({ role: r.role, count: r.count }));
  const updateRole = useCallback((role: string, count: number) => {
    saveCollection(T_KEY, raw.map((r) => (r.role === role ? { ...r, count } : r)));
    logActivity('Updated team summary headcount');
  }, [raw]);
  const total = rows.reduce((s, r) => s + (r.count || 0), 0) || TEAM_SUMMARY_TOTAL;
  const resetRows = useCallback(() => { saveCollection(T_KEY, TEAM_SEED); }, []);
  return { rows, total, updateRole, resetRows };
}

export interface Workload {
  visitsPerWeek: number;
  callingHwk: number;
  presentationsHwk: number;
  followupHwk: number;
  siteVisitHwk: number;
  totalHwk: number;
  utilisationPct: number;
}

// Same formula as the real app's js/staffing.js / js/ceo-dashboard.js
// (staffingOverview()) — unchanged, just taking live (editable) inputs now.
export function computeWorkload(a: StaffingAssumptions, p: ProjectStaffing): Workload {
  const visitsPerWeek = (p.site_visits_per_month / 30) * 7;
  const callingHwk = (p.calls_per_month * 7 * a.calling_minutes) / 60;
  const presentationsHwk = (visitsPerWeek * a.presentations_per_visit * a.presentation_minutes) / 60;
  const followupHwk = (visitsPerWeek * a.visit_followup_minutes) / 60;
  const siteVisitHwk = (visitsPerWeek * a.site_visit_minutes) / 60;
  const totalHwk = callingHwk + presentationsHwk + followupHwk + siteVisitHwk;
  const utilisationPct = p.recommended_crms ? Math.round((totalHwk / (p.recommended_crms * a.working_hours_per_week)) * 100) : 0;
  return { visitsPerWeek, callingHwk, presentationsHwk, followupHwk, siteVisitHwk, totalHwk, utilisationPct };
}
