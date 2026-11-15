// Phase 6 — these modules now mirror the real Avenado Employee Work Sheet
// workbook's own sheets field-for-field (verified by opening the actual
// .xlsx: "Daily Log", "Task Time", "Challenges", "Customer Feedback",
// "Allowance", "Ideas" — all 7 of its data-entry sheets; "How to Use",
// "Daily Summary" and "Lists" are instructional/auto-rollup/reference-only
// and aren't editable forms in the workbook either). The workbook's
// "Task List" sheet (7-day priority work) is intentionally NOT duplicated
// here — that's exactly what the shared Task Assignment / My Tasks chain
// in TaskWorkflow.tsx already is, on real shared state; adding a second,
// disconnected task list here would violate the "use existing shared
// frontend data instead of creating disconnected duplicate records" rule.
// Reference option lists (category, stage, priority, etc.) are copied
// verbatim from the workbook's own "Lists" sheet.
import React from 'react';
import { ListModule, StatusBadge, type FieldDef, type ColumnDef } from '@/components/os/ListModule';
import { PROJECTS } from '@/lib/os/mock-data';
import { useAssignableNames } from '@/lib/os/employeeOptions';
import { useCollectionSnapshot } from '@/lib/os/persist';

const projectOptions = PROJECTS.map((p) => p.name);
// From the workbook's "Lists" sheet, column B (Category).
const CATEGORY_OPTIONS = ['Calling', 'Presentation', 'Site Visit', 'Follow-up', 'Customer Messages', 'Booking / Negotiation', 'Documentation / Legal', 'Meeting / Briefing'];
// From "Lists" sheet, column H (Customer Stage).
const CUSTOMER_STAGE_OPTIONS = ['Calling', 'Presentation', 'Site Visit', 'Booking', 'Documentation', 'Agreement', 'Loan / Finance'];

function withAssignee(fields: FieldDef[], key: string, names: string[]): FieldDef[] {
  return fields.map((f) => (f.key === key ? { ...f, options: names } : f));
}

export function TodayWorkModule() {
  const fields: FieldDef[] = [
    { key: 'task', label: 'Task', required: true },
    { key: 'hours', label: 'Hours spent', type: 'number' },
    { key: 'status', label: 'Status', type: 'select', options: ['In Progress', 'Done', 'Blocked'] },
  ];
  const columns: ColumnDef[] = [
    { key: 'task', label: 'Task' }, { key: 'hours', label: 'Hours', align: 'right' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status || 'In Progress'} /> },
  ];
  return <ListModule storageKey="today-work" label="Entry" title="Today's Work"
    subtitle="A quick scratchpad for right now — the Daily Log below is the workbook-matching record for the day." columns={columns} fields={fields} />;
}

export function TaskTimeModule() {
  const fields: FieldDef[] = [
    { key: 'task_particular', label: 'Particular of task', required: true },
    { key: 'category', label: 'Category', type: 'select', options: CATEGORY_OPTIONS },
    { key: 'standard_minutes', label: 'How much time it takes (min)', type: 'number', required: true },
    { key: 'recorded_by', label: 'Recorded by' },
    { key: 'date_recorded', label: 'Date recorded', type: 'date' },
    { key: 'recording_link', label: 'Task screen recording link' },
    { key: 'remarks', label: 'Remarks' },
  ];
  const columns: ColumnDef[] = [
    { key: 'task_particular', label: 'Task' }, { key: 'category', label: 'Category' },
    { key: 'standard_minutes', label: 'Standard (min)', align: 'right' }, { key: 'remarks', label: 'Remarks' },
  ];
  return <ListModule storageKey="task-time" label="Task Type" title="Task Time"
    subtitle="Standard time for each task — when you do a task the first time, screen-record it and note the time it took. Your Daily Log entries can reference these." columns={columns} fields={fields} />;
}

export function DailyLogModule() {
  const taskTimeLib = useCollectionSnapshot<{ task_particular?: string; standard_minutes?: number }>('task-time', []);
  const fields: FieldDef[] = [
    { key: 'work_date', label: 'Work date', type: 'date', required: true },
    { key: 'start_time', label: 'Start time' },
    { key: 'end_time', label: 'End time' },
    { key: 'particulars', label: 'Particulars (what I did)', type: 'textarea', required: true },
    { key: 'project', label: 'Project', type: 'select', options: ['Company / Office', ...projectOptions] },
    { key: 'category', label: 'Category', type: 'select', options: CATEGORY_OPTIONS },
    { key: 'standard_task', label: 'Standard task (from Task Time)', type: 'select', options: taskTimeLib.map((t) => t.task_particular).filter(Boolean) as string[] },
    { key: 'actual_minutes', label: 'Actual time taken (min)', type: 'number' },
    { key: 'output', label: 'Output (calls / visits / items)', type: 'number' },
    { key: 'work_related_link', label: 'Work related link' },
    { key: 'remarks', label: 'Remarks' },
  ];
  const columns: ColumnDef[] = [
    { key: 'work_date', label: 'Date' }, { key: 'particulars', label: 'Particulars' }, { key: 'project', label: 'Project' },
    { key: 'actual_minutes', label: 'Actual (min)', align: 'right' },
    {
      key: 'pct', label: '% of work', align: 'right',
      render: (r) => {
        const std = taskTimeLib.find((t) => t.task_particular === r.standard_task)?.standard_minutes;
        if (!std || !r.actual_minutes) return '—';
        return Math.round((std / Number(r.actual_minutes)) * 100) + '%';
      },
    },
  ];
  return <ListModule storageKey="daily-log" label="Log" title="Daily Log"
    subtitle="Write what you did, from what time to what time — matches the workbook's Daily Log sheet. Pick a Standard Task to see % of work against the standard time." columns={columns} fields={fields} />;
}

export function ChallengesModule() {
  const names = useAssignableNames();
  const fields: FieldDef[] = withAssignee([
    { key: 'date_raised', label: 'Date raised', type: 'date', required: true },
    { key: 'raised_to', label: 'Raised to (person)', type: 'select', options: [] },
    { key: 'particulars', label: 'Particulars / questions / queries', type: 'textarea', required: true },
    { key: 'priority', label: 'Priority (1/2/3)', type: 'select', options: ['1', '2', '3'] },
    { key: 'resolved_by', label: 'Resolved by' },
    { key: 'solution_date', label: 'Solution date', type: 'date' },
    { key: 'solution', label: 'Solution', type: 'textarea' },
    { key: 'links', label: 'Links' },
    { key: 'remarks', label: 'Remarks' },
  ], 'raised_to', names);
  const columns: ColumnDef[] = [
    { key: 'particulars', label: 'Challenge' }, { key: 'raised_to', label: 'Raised to' }, { key: 'priority', label: 'Priority' },
    {
      key: 'hour_status', label: '24-hour status',
      render: (r) => {
        if (r.solution) return <StatusBadge value="Resolved" />;
        const hrs = r.date_raised ? (Date.now() - new Date(r.date_raised).getTime()) / 3600000 : 0;
        return <StatusBadge value={hrs > 24 ? 'Overdue' : 'Open'} />;
      },
    },
  ];
  return <ListModule storageKey="challenges" label="Challenge" title="Challenges"
    subtitle="Any problem you face — the person you raise it with should solve it within 24 hours (same rule as the workbook)." columns={columns} fields={fields} />;
}

export function IdeasModule() {
  const fields: FieldDef[] = [
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'process_area', label: 'Process / area' },
    { key: 'idea', label: 'Idea — the smarter way', type: 'textarea', required: true },
    { key: 'expected_benefit', label: 'Expected benefit' },
    { key: 'status', label: 'Status', type: 'select', options: ['Proposed', 'Approved', 'Implemented', 'Dropped'] },
    { key: 'remarks', label: 'Remarks' },
  ];
  const columns: ColumnDef[] = [
    { key: 'idea', label: 'Idea' }, { key: 'process_area', label: 'Process / area' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status || 'Proposed'} /> },
  ];
  return <ListModule storageKey="ideas" label="Idea" title="Ideas"
    subtitle="Any idea that makes our process faster, simpler or better — the founders review these." columns={columns} fields={fields} />;
}

export function CustomerFeedbackModule() {
  const names = useAssignableNames();
  const fields: FieldDef[] = withAssignee([
    { key: 'date', label: 'Date', type: 'date', required: true },
    { key: 'customer_name', label: 'Customer name', required: true },
    { key: 'project', label: 'Project', type: 'select', options: projectOptions },
    { key: 'stage', label: 'Stage', type: 'select', options: CUSTOMER_STAGE_OPTIONS },
    { key: 'expected', label: 'What the customer expected', type: 'textarea' },
    { key: 'expectation_met', label: 'Expectation met?', type: 'select', options: ['Yes', 'Partly', 'No'] },
    { key: 'rating', label: 'Customer rating (1-5)', type: 'number' },
    { key: 'action_needed', label: 'Action needed' },
    { key: 'action_owner', label: 'Action owner', type: 'select', options: [] },
    { key: 'link_remarks', label: 'Link / remarks' },
  ], 'action_owner', names);
  const columns: ColumnDef[] = [
    { key: 'customer_name', label: 'Customer' }, { key: 'project', label: 'Project' }, { key: 'stage', label: 'Stage' },
    { key: 'expectation_met', label: 'Expectation met', render: (r) => <StatusBadge value={r.expectation_met || '—'} /> },
    { key: 'rating', label: 'Rating', align: 'right' },
  ];
  return <ListModule storageKey="customer-feedback" label="Feedback" title="Customer Feedback"
    subtitle="After calls, presentations, site visits and bookings — note what the customer expected and whether it was met." columns={columns} fields={fields} />;
}

export function AllowanceModule() {
  const names = useAssignableNames();
  const fields: FieldDef[] = withAssignee([
    { key: 'date', label: 'Date', type: 'date', required: true },
    { key: 'particulars', label: 'Particulars', required: true },
    { key: 'work_related_to', label: 'Work related to (project / purpose)' },
    { key: 'amount', label: 'Amount (₹)', type: 'number', required: true },
    { key: 'proof_link', label: 'Bill / proof link' },
    { key: 'approved_by', label: 'Approved by', type: 'select', options: [] },
    { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Approved', 'Paid', 'Rejected'] },
    { key: 'remarks', label: 'Remarks' },
  ], 'approved_by', names);
  const columns: ColumnDef[] = [
    { key: 'date', label: 'Date' }, { key: 'particulars', label: 'Particulars' },
    { key: 'amount', label: 'Amount', align: 'right', render: (r) => r.amount ? '₹' + Number(r.amount).toLocaleString('en-IN') : '—' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status || 'Pending'} /> },
  ];
  return <ListModule storageKey="allowance" label="Allowance Claim" title="Allowance"
    subtitle="Any allowance the company has committed for work — travel, site visits, phone, etc. Attach the bill or proof link." columns={columns} fields={fields} />;
}
