// Live, non-fabricated completion metrics shared across the Owner dashboard,
// the Projects list, a Project's own "Team" tab, and employee profiles.
//
// Every number here is a plain derivation of whatever real `tasks` (and,
// for the employee helpers, `daily-reports`) rows currently exist in the
// shared records store — nothing is invented, no project or person is
// given a completion % until at least one real task exists for them, and
// re-running this after a manager verifies/rejects a task (or a new task
// is assigned) picks up the change automatically because callers always
// pass in the live `useLocalCollection('tasks', ...)` snapshot, not a
// cached copy — that's what makes the dashboard "dynamic" rather than a
// one-time calculation.
import type { Project } from './types';

/** A task's completion weight, 0–100, for status labels other than plain done/not-done — mirrors ProjectDetail.tsx's TASK_PROGRESS table so every screen agrees on what "in progress" is worth. */
export const TASK_PROGRESS: Record<string, number> = {
  'Not Started': 0, 'In Progress': 40, 'On Hold': 40, 'Changes Requested': 60, 'Submitted for Review': 80, Rejected: 0, Verified: 100,
};

/** Reserved status colors (per the dataviz convention — never reused for an arbitrary series), picked by completion %. Always paired with the visible % label the chart already renders, never color-alone. */
export function completionColor(pct: number | null): string {
  if (pct == null) return 'var(--av-border-strong)';
  if (pct >= 80) return 'var(--av-success)';
  if (pct >= 40) return 'var(--av-warning)';
  return 'var(--av-error)';
}

export interface ProjectCompletion {
  projectId: string;
  projectName: string;
  totalTasks: number;
  completedTasks: number;
  /** null (not 0) until this project has at least one real task — a project with zero tasks has no completion rate yet, that isn't the same as 0%. */
  completionPct: number | null;
}

/** One row per project, from real `tasks` records matched by `task.project === project.name` (the same join every other project/task screen in this app already uses). */
export function projectCompletions(projects: Project[], tasks: Array<Record<string, any>>): ProjectCompletion[] {
  return projects.map((p) => {
    const projectTasks = tasks.filter((t) => t.project === p.name);
    const completedTasks = projectTasks.filter((t) => t.status === 'Verified').length;
    return {
      projectId: p.id,
      projectName: p.name,
      totalTasks: projectTasks.length,
      completedTasks,
      completionPct: projectTasks.length ? Math.round((completedTasks / projectTasks.length) * 100) : null,
    };
  });
}

export interface EmployeeTaskStats {
  name: string;
  totalTasks: number;
  completedTasks: number;
  completionPct: number | null;
}

/** One row per person who has at least one `assigned_employee` task in whatever task list is passed in — pass every task for a company-wide roll-up, or one project's tasks for that project's Team tab. */
export function employeeTaskStats(tasks: Array<Record<string, any>>): EmployeeTaskStats[] {
  const byPerson = new Map<string, { total: number; completed: number }>();
  tasks.forEach((t) => {
    if (!t.assigned_employee) return;
    const row = byPerson.get(t.assigned_employee) || { total: 0, completed: 0 };
    row.total++;
    if (t.status === 'Verified') row.completed++;
    byPerson.set(t.assigned_employee, row);
  });
  return Array.from(byPerson.entries()).map(([name, r]) => ({
    name,
    totalTasks: r.total,
    completedTasks: r.completed,
    completionPct: r.total ? Math.round((r.completed / r.total) * 100) : null,
  }));
}

/** Distinct dates this person has a daily work report on file — "how many days she's been active," read straight from real `daily-reports` rows, never an attendance estimate. */
export function daysActiveFor(dailyReports: Array<Record<string, any>>, employeeName: string): number {
  const dates = new Set<string>();
  dailyReports.forEach((r) => {
    if (r.employee_name === employeeName && r.reporting_date) dates.add(r.reporting_date);
  });
  return dates.size;
}
