import React, { useState } from 'react';
import { useLocalCollection, type Row } from '@/lib/os/useLocalCollection';
import { Modal } from './Modal';
import { ConfirmDialog } from './ConfirmDialog';
import { DataTable, type DataTableColumn } from './DataTable';
import { useToast } from './Toast';
import { IconClipboard } from './icons';

export interface FieldDef {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'select' | 'textarea';
  options?: string[];
  required?: boolean;
  placeholder?: string;
}
export interface ColumnDef {
  key: string;
  label: string;
  render?: (row: Row) => React.ReactNode;
  align?: 'left' | 'right';
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'warning', open: 'warning', 'in progress': 'info', active: 'info',
  approved: 'success', done: 'success', completed: 'success', paid: 'success', resolved: 'success',
  rejected: 'error', overdue: 'error', blocked: 'error',
  closed: 'neutral', archived: 'neutral',
  'not started': 'neutral', 'submitted for review': 'info', submitted: 'info', verified: 'success',
  'changes requested': 'warning', 'needs clarification': 'warning', incorrect: 'error',
  present: 'success', absent: 'error', late: 'warning', 'on leave': 'info', 'half day': 'warning',
  won: 'success', 'closed lost': 'neutral', lost: 'neutral', hired: 'success', new: 'info',
  inactive: 'neutral', 'on track': 'success', on_track: 'success', 'at risk': 'warning', at_risk: 'warning', delayed: 'error',
};

export function StatusBadge({ value }: { value: string }) {
  const tone = STATUS_BADGE[(value || '').toLowerCase()] || 'neutral';
  return <span className={`badge badge-${tone}`}>{value}</span>;
}

export function Field({ def, value, onChange }: { def: FieldDef; value: any; onChange: (v: any) => void }) {
  if (def.type === 'select') {
    return (
      <select className="select" value={value ?? ''} onChange={(e) => onChange(e.target.value)} required={def.required}>
        <option value="" disabled>Select…</option>
        {def.options?.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (def.type === 'textarea') {
    return <textarea className="input" rows={3} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={def.placeholder} required={def.required} />;
  }
  return (
    <input
      className="input"
      type={def.type === 'number' ? 'number' : def.type === 'date' ? 'date' : 'text'}
      value={value ?? ''}
      onChange={(e) => onChange(def.type === 'number' ? e.target.valueAsNumber : e.target.value)}
      placeholder={def.placeholder}
      required={def.required}
    />
  );
}

export function RecordForm({ fields, initial, onSubmit, onCancel, submitLabel }: {
  fields: FieldDef[]; initial?: Row; onSubmit: (values: Record<string, any>) => void; onCancel: () => void; submitLabel: string;
}) {
  const [values, setValues] = useState<Record<string, any>>(() => initial || {});
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(values); }}>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {fields.map((f) => (
          <div key={f.key} style={f.type === 'textarea' ? { gridColumn: '1 / -1' } : undefined}>
            <label className="field-label">{f.label}{f.required && ' *'}</label>
            <Field def={f} value={values[f.key]} onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))} />
          </div>
        ))}
      </div>
      <div className="flex gap-2 justify-between">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">{submitLabel}</button>
      </div>
    </form>
  );
}

export function ListModule({
  storageKey, label, title, subtitle, columns, fields, seed, emptyHint,
}: {
  storageKey: string; label: string; title: string; subtitle?: string;
  columns: ColumnDef[]; fields: FieldDef[]; seed?: Row[]; emptyHint?: string;
}) {
  const { items, add, update, remove } = useLocalCollection(storageKey, label, seed || []);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const { show } = useToast();

  // Columns rendered as a plain field (no custom `render`) are searchable
  // and sortable by that same field's raw value — columns with a custom
  // `render` (badges, formatted currency, etc.) are excluded from both
  // since there's no single string/number to compare against.
  const plainKeys = columns.filter((c) => !c.render).map((c) => c.key);
  const dtColumns: DataTableColumn<Row>[] = columns.map((c) => ({
    key: c.key, label: c.label, render: c.render, align: c.align,
    sortValue: c.render ? false : undefined,
  }));

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <strong>{title}</strong>
          {subtitle && <div className="text-sm text-muted mt-1">{subtitle}</div>}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>+ Add {label}</button>
      </div>

      <DataTable
        columns={dtColumns}
        rows={items}
        searchKeys={plainKeys.length > 0 ? plainKeys : undefined}
        searchPlaceholder={`Search ${label.toLowerCase()}…`}
        renderActions={(row) => (
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(row)}>Edit</button>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--av-error)' }} onClick={() => setDeleting(row)}>Delete</button>
          </>
        )}
        emptyState={
          <div className="empty-state">
            <IconClipboard size={32} className="empty-state-icon" />
            <div>No {label.toLowerCase()} entries yet.</div>
            <div className="text-sm mt-1">{emptyHint || `Add the first one — nothing is pre-filled here.`}</div>
          </div>
        }
      />

      {adding && (
        <Modal title={`Add ${label}`} onClose={() => setAdding(false)}>
          <RecordForm
            fields={fields}
            onSubmit={(v) => { add(v as any); setAdding(false); show(`${label} added.`); }}
            onCancel={() => setAdding(false)}
            submitLabel="Add"
          />
        </Modal>
      )}
      {editing && (
        <Modal title={`Edit ${label}`} onClose={() => setEditing(null)}>
          <RecordForm
            fields={fields}
            initial={editing}
            onSubmit={(v) => { update(editing.id, v); setEditing(null); show(`${label} updated.`); }}
            onCancel={() => setEditing(null)}
            submitLabel="Save"
          />
        </Modal>
      )}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${label.toLowerCase()}?`}
          message={`This removes this ${label.toLowerCase()} entry from local demo state. This can't be undone.`}
          confirmLabel="Delete"
          tone="danger"
          onCancel={() => setDeleting(null)}
          onConfirm={() => { remove(deleting.id); setDeleting(null); show(`${label} deleted.`, 'info'); }}
        />
      )}
    </div>
  );
}
