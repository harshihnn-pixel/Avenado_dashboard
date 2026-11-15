// Shared domain types for the Avenado OS redesign.
// Mirrors the real Supabase schema (supabase/schema.sql) where data is real;
// fields that schema never populates are typed nullable rather than invented.

// Exactly 3 portals, per the master prompt's non-negotiable rule — Manager
// and HR share ONE portal ('manager-hr') with an in-dashboard role toggle,
// never two separate top-level portals.
export type Role = 'owner' | 'manager-hr' | 'employee';
export type SubRole = 'manager' | 'hr';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  subRole?: SubRole; // only meaningful when role === 'manager-hr'
  designation: string | null;
  department_id: string | null;
  approved: boolean;
  avatar_url: string | null;
  /** True only for the two real founder accounts. Everyone else here is a labeled sample account. */
  isRealPerson: boolean;
}

// Task status enum per the master prompt's work lifecycle (section 5/11):
// Not Started -> In Progress -> (On Hold) -> Submitted for Review ->
// Changes Requested | Rejected | Verified/Completed.
export const TASK_STATUSES = [
  'Not Started', 'In Progress', 'On Hold', 'Submitted for Review', 'Changes Requested', 'Rejected', 'Verified',
] as const;
export type TaskStatus = typeof TASK_STATUSES[number];

export interface Department {
  id: string;
  name: string;
}

export type ProjectHealth = 'on_track' | 'at_risk' | 'delayed';

export interface Project {
  id: string;
  name: string;
  stage: string;
  health: ProjectHealth;
  next_step: string;
  project_type: string | null;
  location: string | null;
  manager_id: string | null;
  manager_name?: string | null;
  developer?: string | null;
  start_date?: string | null;
  launch_date?: string | null;
}

export interface StaffingAssumptions {
  id: string;
  calling_minutes: number;
  presentations_per_visit: number;
  presentation_minutes: number;
  visit_followup_minutes: number;
  site_visit_minutes: number;
  working_hours_per_week: number;
  /** Not in the original Excel's single assumptions block — surfaced separately below. */
  max_visits_per_crm_per_day?: number;
  visit_days_per_month?: number;
  legal_coordination_hours_per_booking?: number;
  legal_hours_per_month?: number;
}

export interface ProjectStaffing {
  id: string;
  project_id: string;
  project_name: string;
  units_to_sell: number;
  calls_per_month: number;
  site_visits_per_month: number;
  recommended_crms: number;
}

export interface TeamSummaryRow {
  role: string;
  count: number;
}

// --- Everything below is transactional/business data with NO verified real
// source yet. Each array stays empty until Supabase is connected or the user
// supplies real figures, per the explicit "don't use dummy data" instruction.
// Do not seed these with invented rows.

export interface Lead { id: string; [key: string]: unknown }
export interface Task { id: string; [key: string]: unknown }
export interface Booking { id: string; [key: string]: unknown }
export interface Collection { id: string; [key: string]: unknown }
export interface Expense { id: string; [key: string]: unknown }
export interface Notification { id: string; [key: string]: unknown }
export interface ActivityItem { id: string; [key: string]: unknown }
