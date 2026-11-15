// Thin, declarative wrappers around the generic ListModule component — one
// per legacy page that is fundamentally "a list of records you add to."
// Each starts with zero rows (per the "don't use dummy data" instruction);
// the fields/columns below are structure, not invented business data.
import React from 'react';
import { ListModule, StatusBadge, type FieldDef, type ColumnDef } from '@/components/os/ListModule';
import { CategoryBarChart } from '@/components/os/Charts';
import { PROJECTS, PROJECT_STAFFING, totalSiteVisitsPerMonth } from '@/lib/os/mock-data';

const projectOptions = PROJECTS.map((p) => p.name);
const inr = (row: any, key: string) => row[key] ? '₹' + Number(row[key]).toLocaleString('en-IN') : '—';

export function SiteVisitsModule() {
  const fields: FieldDef[] = [
    { key: 'visitor_name', label: 'Visitor name', required: true },
    { key: 'phone', label: 'Phone' },
    { key: 'project', label: 'Project', type: 'select', options: projectOptions, required: true },
    { key: 'date', label: 'Visit date', type: 'date' },
    { key: 'status', label: 'Status', type: 'select', options: ['Scheduled', 'Completed', 'No-show', 'Cancelled'] },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ];
  const columns: ColumnDef[] = [
    { key: 'visitor_name', label: 'Visitor' }, { key: 'project', label: 'Project' }, { key: 'date', label: 'Date' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status || 'Scheduled'} /> },
  ];
  return (
    <div>
      <div className="card mb-4">
        <strong>30-day site visit targets</strong>
        <div className="text-sm text-muted mt-1 mb-3">
          From the CRM Staffing Model (your Excel, confirmed 1 Oct 2026) — this is the plan, not a log. Every
          actual visit is logged separately below as it happens; nothing on this page is pre-filled.
        </div>
        <CategoryBarChart
          height={180}
          formatValue={(v) => String(v)}
          items={PROJECT_STAFFING.map((p) => ({ key: p.id, label: p.project_name, value: p.site_visits_per_month }))}
        />
        <div className="text-sm text-muted mt-3">
          Total target: <strong className="text-sm" style={{ color: 'var(--av-text)' }}>{totalSiteVisitsPerMonth()}</strong> visits / 30 days across {PROJECT_STAFFING.length} projects.
        </div>
      </div>
      <ListModule
        storageKey="site-visits" label="Site Visit" title="Actual visits logged"
        subtitle="Real visits, as logged — starts empty until your team records one here."
        columns={columns} fields={fields}
      />
    </div>
  );
}

export function FollowupsModule() {
  const fields: FieldDef[] = [
    { key: 'lead_name', label: 'Lead / customer', required: true },
    { key: 'project', label: 'Project', type: 'select', options: projectOptions },
    { key: 'due_date', label: 'Due date', type: 'date' },
    { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Done', 'Overdue'] },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ];
  const columns: ColumnDef[] = [
    { key: 'lead_name', label: 'Lead / customer' }, { key: 'project', label: 'Project' }, { key: 'due_date', label: 'Due' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status || 'Pending'} /> },
  ];
  return <ListModule storageKey="followups" label="Follow-up" title="Follow-ups" columns={columns} fields={fields} />;
}

export function CollectionsModule() {
  const fields: FieldDef[] = [
    { key: 'customer_name', label: 'Customer name', required: true },
    { key: 'project', label: 'Project', type: 'select', options: projectOptions },
    { key: 'amount', label: 'Amount collected (₹)', type: 'number', required: true },
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'mode', label: 'Mode', type: 'select', options: ['Bank Transfer', 'Cheque', 'Cash', 'UPI', 'Loan Disbursement'] },
  ];
  const columns: ColumnDef[] = [
    { key: 'customer_name', label: 'Customer' }, { key: 'project', label: 'Project' },
    { key: 'amount', label: 'Amount', align: 'right', render: (r) => inr(r, 'amount') }, { key: 'mode', label: 'Mode' },
  ];
  return <ListModule storageKey="collections" label="Collection" title="Collections" columns={columns} fields={fields} />;
}

export function ExpensesModule() {
  const fields: FieldDef[] = [
    { key: 'description', label: 'Description', required: true },
    { key: 'category', label: 'Category', type: 'select', options: ['Marketing', 'Office', 'Travel', 'Legal', 'Payroll', 'Other'] },
    { key: 'amount', label: 'Amount (₹)', type: 'number', required: true },
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Approved', 'Paid'] },
  ];
  const columns: ColumnDef[] = [
    { key: 'description', label: 'Description' }, { key: 'category', label: 'Category' },
    { key: 'amount', label: 'Amount', align: 'right', render: (r) => inr(r, 'amount') },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status || 'Pending'} /> },
  ];
  return <ListModule storageKey="expenses" label="Expense" title="Expenses" columns={columns} fields={fields} />;
}

export function CommissionsModule() {
  const fields: FieldDef[] = [
    { key: 'payee_name', label: 'Payee', required: true },
    { key: 'project', label: 'Project', type: 'select', options: projectOptions },
    { key: 'amount', label: 'Amount (₹)', type: 'number', required: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Approved', 'Paid'] },
  ];
  const columns: ColumnDef[] = [
    { key: 'payee_name', label: 'Payee' }, { key: 'project', label: 'Project' },
    { key: 'amount', label: 'Amount', align: 'right', render: (r) => inr(r, 'amount') },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status || 'Pending'} /> },
  ];
  return <ListModule storageKey="commissions" label="Commission" title="Commissions" columns={columns} fields={fields} />;
}

export function BudgetsModule() {
  const fields: FieldDef[] = [
    { key: 'line_item', label: 'Line item', required: true },
    { key: 'department', label: 'Department', type: 'select', options: ['Sales', 'Marketing', 'Operations', 'HR / Admin'] },
    { key: 'budgeted', label: 'Budgeted (₹)', type: 'number' },
    { key: 'spent', label: 'Spent so far (₹)', type: 'number' },
    { key: 'period', label: 'Period', placeholder: 'e.g. Q1 FY26' },
  ];
  const columns: ColumnDef[] = [
    { key: 'line_item', label: 'Line item' }, { key: 'department', label: 'Department' },
    { key: 'budgeted', label: 'Budgeted', align: 'right', render: (r) => inr(r, 'budgeted') },
    { key: 'spent', label: 'Spent', align: 'right', render: (r) => inr(r, 'spent') },
  ];
  return <ListModule storageKey="budgets" label="Budget Line" title="Budgets" columns={columns} fields={fields} />;
}

export function TargetsModule() {
  const fields: FieldDef[] = [
    { key: 'project', label: 'Project', type: 'select', options: projectOptions, required: true },
    { key: 'metric', label: 'Metric', type: 'select', options: ['Bookings', 'Site Visits', 'Calls', 'Revenue'] },
    { key: 'target', label: 'Target', type: 'number' },
    { key: 'period', label: 'Period', placeholder: 'e.g. Nov 2026' },
  ];
  const columns: ColumnDef[] = [
    { key: 'project', label: 'Project' }, { key: 'metric', label: 'Metric' },
    { key: 'target', label: 'Target', align: 'right' }, { key: 'period', label: 'Period' },
  ];
  return <ListModule storageKey="targets" label="Target" title="Targets" columns={columns} fields={fields} />;
}

export function DocumentsModule() {
  const fields: FieldDef[] = [
    { key: 'name', label: 'Document name', required: true },
    { key: 'project', label: 'Related project', type: 'select', options: projectOptions },
    { key: 'type', label: 'Type', type: 'select', options: ['Agreement', 'Brochure', 'Legal', 'Financial', 'Other'] },
    { key: 'link', label: 'Link / location', placeholder: 'URL or where it’s stored' },
  ];
  const columns: ColumnDef[] = [
    { key: 'name', label: 'Name' }, { key: 'project', label: 'Project' }, { key: 'type', label: 'Type' },
  ];
  return <ListModule storageKey="documents" label="Document" title="Documents" columns={columns} fields={fields}
    emptyHint="This tracks document metadata/links only — file upload isn't wired to a backend yet." />;
}

export function MarketingModule() {
  const fields: FieldDef[] = [
    { key: 'campaign', label: 'Campaign name', required: true },
    { key: 'channel', label: 'Channel', type: 'select', options: ['Meta Ads', 'Google Ads', 'Print', 'Hoarding', 'Referral Drive', 'Other'] },
    { key: 'project', label: 'Project', type: 'select', options: projectOptions },
    { key: 'spend', label: 'Spend (₹)', type: 'number' },
    { key: 'leads_generated', label: 'Leads generated', type: 'number' },
  ];
  const columns: ColumnDef[] = [
    { key: 'campaign', label: 'Campaign' }, { key: 'channel', label: 'Channel' }, { key: 'project', label: 'Project' },
    { key: 'spend', label: 'Spend', align: 'right', render: (r) => inr(r, 'spend') },
    { key: 'leads_generated', label: 'Leads', align: 'right' },
  ];
  return <ListModule storageKey="marketing" label="Campaign" title="Marketing" columns={columns} fields={fields} />;
}

export function CustomersModule() {
  const fields: FieldDef[] = [
    { key: 'name', label: 'Customer name', required: true },
    { key: 'phone', label: 'Phone' },
    { key: 'project', label: 'Project', type: 'select', options: projectOptions },
    { key: 'status', label: 'Status', type: 'select', options: ['Prospect', 'Booked', 'Owner'] },
  ];
  const columns: ColumnDef[] = [
    { key: 'name', label: 'Name' }, { key: 'project', label: 'Project' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status || 'Prospect'} /> },
  ];
  return <ListModule storageKey="customers" label="Customer" title="Customers" columns={columns} fields={fields} />;
}

export function AlertsModule() {
  const fields: FieldDef[] = [
    { key: 'title', label: 'Alert', required: true },
    { key: 'severity', label: 'Severity', type: 'select', options: ['Info', 'Warning', 'Critical'] },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ];
  const columns: ColumnDef[] = [
    { key: 'title', label: 'Alert' },
    { key: 'severity', label: 'Severity', render: (r) => <StatusBadge value={r.severity || 'Info'} /> },
  ];
  return <ListModule storageKey="alerts-custom" label="Alert" title="Custom Alerts"
    subtitle="Capacity alerts from the CRM Staffing Model show automatically on the Executive Overview — these are additional ones you add yourself."
    columns={columns} fields={fields} />;
}

export function MessagesModule() {
  const fields: FieldDef[] = [
    { key: 'to', label: 'To', required: true },
    { key: 'subject', label: 'Subject' },
    { key: 'body', label: 'Message', type: 'textarea', required: true },
  ];
  const columns: ColumnDef[] = [{ key: 'to', label: 'To' }, { key: 'subject', label: 'Subject' }];
  return <ListModule storageKey="messages" label="Message" title="Messages"
    subtitle="A simple internal note log — not connected to real email or chat yet." columns={columns} fields={fields} />;
}
