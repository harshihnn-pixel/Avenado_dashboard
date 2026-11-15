import React, { useState } from 'react';
import { useLocalCollection } from '@/lib/os/useLocalCollection';
import { KanbanBoard } from '@/components/os/KanbanBoard';
import { Modal } from '@/components/os/Modal';
import { RecordForm, type FieldDef } from '@/components/os/ListModule';
import { PROJECTS } from '@/lib/os/mock-data';

const STAGES = ['New', 'Contacted', 'Site Visit Scheduled', 'Negotiation', 'Won', 'Closed Lost'];

const FIELDS: FieldDef[] = [
  { key: 'name', label: 'Lead name', required: true },
  { key: 'phone', label: 'Phone' },
  { key: 'project', label: 'Project', type: 'select', options: PROJECTS.map((p) => p.name), required: true },
  { key: 'source', label: 'Source', type: 'select', options: ['Walk-in', 'Meta Ads', 'Referral', 'Site Visit', 'Call-in', 'Other'] },
  { key: 'stage', label: 'Stage', type: 'select', options: STAGES, required: true },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export function LeadsPipeline() {
  const { items, add, update, remove } = useLocalCollection('leads', 'Lead');
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const openLead = items.find((i) => i.id === open);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <strong>Leads & Pipeline</strong>
          <div className="text-sm text-muted mt-1">Drag a card between stages, or open it to edit. Nothing is pre-seeded here.</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>+ Add Lead</button>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">No leads yet. Add your first lead to start the pipeline.</div>
      ) : (
        <KanbanBoard
          columns={STAGES}
          items={items}
          onMove={(id, toColumn) => update(id, { stage: toColumn })}
          renderCard={(row) => (
            <div onClick={() => setOpen(row.id)} style={{ cursor: 'pointer' }}>
              <strong style={{ fontSize: 13 }}>{row.name}</strong>
              <div className="text-sm text-muted mt-1">{row.project}</div>
              {row.source && <span className="badge badge-neutral mt-2" style={{ display: 'inline-block' }}>{row.source}</span>}
            </div>
          )}
        />
      )}

      {adding && (
        <Modal title="Add Lead" onClose={() => setAdding(false)} width={560}>
          <RecordForm fields={FIELDS} initial={{ id: '', stage: 'New' } as any} onSubmit={(v) => { add(v as any); setAdding(false); }} onCancel={() => setAdding(false)} submitLabel="Add" />
        </Modal>
      )}
      {openLead && (
        <Modal title={openLead.name} onClose={() => setOpen(null)} width={560}>
          <RecordForm
            fields={FIELDS}
            initial={openLead}
            onSubmit={(v) => { update(openLead.id, v); setOpen(null); }}
            onCancel={() => setOpen(null)}
            submitLabel="Save"
          />
          <button className="btn btn-ghost btn-sm mt-3" style={{ color: 'var(--av-error)' }} onClick={() => { remove(openLead.id); setOpen(null); }}>
            Delete lead
          </button>
        </Modal>
      )}
    </div>
  );
}
