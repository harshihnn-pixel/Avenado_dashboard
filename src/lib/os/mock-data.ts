// Mock data layer for the Avenado OS redesign — frontend only, no backend.
//
// PROVENANCE (per the user's explicit "don't use dummy data" instruction):
//   REAL data below is copied verbatim from either
//     - the real Supabase schema seed (supabase/schema.sql), or
//     - the real "Avenado_CRM_Staffing_Model_1.xlsx" workbook the user shared.
//   Everything else is left as a genuinely empty array/honest empty state —
//   nothing in this file invents revenue, names, tasks, leads, or dates.
//
// This file will be replaced by real Supabase queries once the backend is
// connected; until then it is the single source of truth for the UI.

import type {
  Profile, Department, Project, StaffingAssumptions, ProjectStaffing,
  TeamSummaryRow, Lead, Task, Booking, Collection, Expense, Notification, ActivityItem,
} from './types';

// ---- People (REAL: the two founder accounts only) --------------------------

export const PROFILES: Profile[] = [
  {
    id: 'ceo-1',
    full_name: 'Kishor Kumar Reddy',
    email: 'kishorkumarreddy222@gmail.com',
    role: 'owner',
    designation: 'Founder & CEO',
    department_id: null,
    approved: true,
    avatar_url: null,
    isRealPerson: true,
  },
  {
    id: 'ceo-2',
    full_name: 'Harshitha N',
    email: 'nharshitha821@gmail.com',
    role: 'owner',
    designation: null,
    department_id: null,
    approved: true,
    avatar_url: null,
    isRealPerson: true,
  },
  // Sample accounts used only to preview the combined Manager/HR portal and
  // Employee dashboard in this demo. Clearly labeled — not real staff. Both
  // Manager and HR share the ONE 'manager-hr' portal (per the master
  // prompt's non-negotiable rule) — subRole picks which sub-view is active.
  {
    id: 'sample-manager',
    full_name: 'Sample Manager Account',
    email: 'manager@example.invalid',
    role: 'manager-hr',
    subRole: 'manager',
    designation: null,
    department_id: null,
    approved: true,
    avatar_url: null,
    isRealPerson: false,
  },
  {
    id: 'sample-hr',
    full_name: 'Sample HR Account',
    email: 'hr@example.invalid',
    role: 'manager-hr',
    subRole: 'hr',
    designation: null,
    department_id: null,
    approved: true,
    avatar_url: null,
    isRealPerson: false,
  },
  {
    id: 'sample-employee',
    full_name: 'Sample Employee Account',
    email: 'employee@example.invalid',
    role: 'employee',
    designation: null,
    department_id: null,
    approved: true,
    avatar_url: null,
    isRealPerson: false,
  },
];

// ---- Departments (REAL — verbatim from schema.sql seed, plus "Others" for ---
// ---- anyone who doesn't fit the four below) ---------------------------------

export const DEPARTMENTS: Department[] = [
  { id: 'dept-sales', name: 'Sales' },
  { id: 'dept-marketing', name: 'Marketing' },
  { id: 'dept-operations', name: 'Operations' },
  { id: 'dept-hr-admin', name: 'HR / Admin' },
  { id: 'dept-others', name: 'Others' },
];

// ---- Projects (REAL — verbatim stage/health/next_step from schema.sql) -----

export const PROJECTS: Project[] = [
  {
    id: 'proj-colina-meadow',
    name: 'Colina Meadow',
    stage: 'Phase-1 agreement renegotiation',
    health: 'at_risk',
    next_step: 'Finalize renegotiated Phase-1 terms',
    project_type: null,
    location: null,
    manager_id: null,
  },
  {
    id: 'proj-dakshina-heritage',
    name: 'Dakshina Heritage',
    stage: 'Active strategic marketing & sales engagement',
    health: 'on_track',
    next_step: 'Continue marketing & sales push',
    project_type: null,
    location: null,
    manager_id: null,
  },
  {
    id: 'proj-green-avenue',
    name: 'Green Avenue',
    stage: 'Inventory sell-down',
    health: 'on_track',
    next_step: 'Continue inventory sell-down',
    project_type: null,
    location: null,
    manager_id: null,
  },
  {
    id: 'proj-urban-greens',
    name: 'Urban Greens by Varun Infra',
    stage: 'Partnership agreement — final terms',
    health: 'on_track',
    next_step: 'Close out partnership agreement terms',
    project_type: null,
    location: null,
    manager_id: null,
  },
  {
    id: 'proj-skr-garden',
    name: 'SKR Garden',
    stage: 'CRM & sales-process setup',
    health: 'on_track',
    next_step: 'Complete CRM & sales-process setup',
    project_type: null,
    location: null,
    manager_id: null,
  },
  {
    id: 'proj-devagiri-opal',
    name: 'Devagiri Opal',
    stage: 'Active Meta/Google ad campaign',
    health: 'on_track',
    next_step: 'Monitor ad campaign performance',
    project_type: null,
    location: null,
    manager_id: null,
  },
];

// ---- CRM Staffing Model (REAL — verbatim from Avenado_CRM_Staffing_Model_1.xlsx) --

export const STAFFING_ASSUMPTIONS: StaffingAssumptions = {
  id: 'sa-1',
  calling_minutes: 6,
  presentations_per_visit: 1.5,
  presentation_minutes: 20,
  visit_followup_minutes: 20,
  site_visit_minutes: 75,
  working_hours_per_week: 48,
  max_visits_per_crm_per_day: 6,
  visit_days_per_month: 13,
  legal_coordination_hours_per_booking: 2.5,
  legal_hours_per_month: 208,
};

// REAL — the Excel's "30-day targets per project (from Kishor)" table,
// verbatim: Units to sell / Site visits (30 days) / Leads per day /
// Recommended CRMs, one row per project (totals 150 / 700 / 220 / 10).
// FIX (2026-11-10): this array previously had a `bookings_per_month` field
// holding 3/3/2/2 — a duplicate of `recommended_crms`, not the Excel's real
// "Units to sell" column (20/45/55/30). That meant the per-project unit
// targets existed nowhere in the live app, even though their total (150)
// was shown on the landing page — the exact inconsistency Kishor flagged.
// Replaced with `units_to_sell` holding the real per-project figures below,
// now wired into Project Detail and the CRM Staffing Model page too.
export const PROJECT_STAFFING: ProjectStaffing[] = [
  { id: 'ps-colina', project_id: 'proj-colina-meadow', project_name: 'Colina Meadow', units_to_sell: 20, calls_per_month: 65, site_visits_per_month: 200, recommended_crms: 3 },
  { id: 'ps-dakshina', project_id: 'proj-dakshina-heritage', project_name: 'Dakshina Heritage', units_to_sell: 45, calls_per_month: 50, site_visits_per_month: 200, recommended_crms: 3 },
  { id: 'ps-green', project_id: 'proj-green-avenue', project_name: 'Green Avenue', units_to_sell: 55, calls_per_month: 40, site_visits_per_month: 150, recommended_crms: 2 },
  { id: 'ps-urban', project_id: 'proj-urban-greens', project_name: 'Urban Greens by Varun Infra', units_to_sell: 30, calls_per_month: 65, site_visits_per_month: 150, recommended_crms: 2 },
];
// NOTE: `calls_per_month` here is the Excel's "leads/day" column (the input
// the real calling-hours formula actually uses — see capacityPercentFor
// below), not a literal monthly call count. Kept under this field name for
// shape-compatibility with ProjectStaffing; renamed clearly here so the
// source is traceable.

export const TEAM_SUMMARY: TeamSummaryRow[] = [
  { role: 'CRM', count: 10 },
  { role: 'HR Manager', count: 1 },
  { role: 'Administration Head', count: 1 },
  { role: 'Legal Officer', count: 1 },
  { role: 'Documentation Assistant', count: 1 },
  { role: 'Digital Marketing Team', count: 0 }, // "existing" in the Excel — no headcount number given
];
export const TEAM_SUMMARY_TOTAL = 14;

export function recommendedCrmsTotal(): number {
  return PROJECT_STAFFING.reduce((sum, p) => sum + p.recommended_crms, 0);
}

// REAL — the "Inputs" tab of the Excel's CRM Staffing Model states a
// 30-day sales target of 150 units across the 4 staffed projects. Derived
// from the per-project `units_to_sell` figures above (20+45+55+30=150)
// rather than kept as a second hardcoded constant, so this total can never
// drift out of sync with the per-project rows it's made of.
export function totalUnitsTarget30d(): number {
  return PROJECT_STAFFING.reduce((sum, p) => sum + p.units_to_sell, 0);
}
export const UNITS_TARGET_30D = totalUnitsTarget30d();

export function totalSiteVisitsPerMonth(): number {
  return PROJECT_STAFFING.reduce((sum, p) => sum + p.site_visits_per_month, 0);
}

// Capacity utilisation per project — same formula as the real app's
// js/staffing.js and js/ceo-dashboard.js (staffingOverview()):
//   visitsPerWeek = (site_visits_target_30d / 30) * 7
//   callingHwk       = (leads_per_day * 7 * calling_minutes) / 60
//   presentationsHwk = (visitsPerWeek * presentations_per_visit * presentation_minutes) / 60
//   followupHwk      = (visitsPerWeek * visit_followup_minutes) / 60
//   siteVisitHwk     = (visitsPerWeek * site_visit_minutes) / 60
//   utilisation = totalHwk / (recommended_crms * working_hours_per_week)
export function capacityPercentFor(projectId: string): number {
  const p = PROJECT_STAFFING.find((row) => row.project_id === projectId);
  if (!p) return 0;
  const a = STAFFING_ASSUMPTIONS;
  const visitsPerWeek = (p.site_visits_per_month / 30) * 7;
  const callingHwk = (p.calls_per_month * 7 * a.calling_minutes) / 60;
  const presentationsHwk = (visitsPerWeek * a.presentations_per_visit * a.presentation_minutes) / 60;
  const followupHwk = (visitsPerWeek * a.visit_followup_minutes) / 60;
  const siteVisitHwk = (visitsPerWeek * a.site_visit_minutes) / 60;
  const totalHwk = callingHwk + presentationsHwk + followupHwk + siteVisitHwk;
  if (!p.recommended_crms) return 0;
  return Math.round((totalHwk / (p.recommended_crms * a.working_hours_per_week)) * 100);
}

// Single shared threshold for "is this project's CRM team over capacity?" —
// used everywhere a capacity % is shown (CRM Staffing Model, Project
// Detail, Site Visits) so the color-coding can't drift out of sync between
// pages the way the >85%/>95% thresholds briefly did.
export function capacityTone(pct: number): 'red' | 'amber' | 'green' {
  return pct > 100 ? 'red' : pct > 85 ? 'amber' : 'green';
}
export function capacityCssColor(pct: number): string {
  return pct > 100 ? 'var(--av-error)' : pct > 85 ? 'var(--av-warning)' : 'var(--av-success)';
}

// ---- Transactional data: genuinely empty until real figures/Supabase exist --

export const LEADS: Lead[] = [];
export const TASKS: Task[] = [];
export const BOOKINGS: Booking[] = [];
export const COLLECTIONS: Collection[] = [];
export const EXPENSES: Expense[] = [];
export const NOTIFICATIONS: Notification[] = [];
export const ACTIVITY: ActivityItem[] = [];
