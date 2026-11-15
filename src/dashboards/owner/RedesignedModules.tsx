// Phase 9 — purpose-built redesigns of generic-list pages, matching each
// module's actual business purpose instead of sharing one table template.
// Recruitment -> candidate pipeline; Inventory -> project-wise cards +
// availability table; Bookings -> booking pipeline + detail; Notifications
// -> a functional read/unread centre. Each still uses useLocalCollection,
// so it's the same real shared data, just a dedicated UI on top of it.
import React, { useState } from 'react';
import { useLocalCollection } from '@/lib/os/useLocalCollection';
import { PROJECTS } from '@/lib/os/mock-data';
import { KanbanBoard } from '@/components/os/KanbanBoard';
import { Modal } from '@/components/os/Modal';
import { RecordForm, StatusBadge, type FieldDef } from '@/components/os/ListModule';
import { StatTiles, PulseList } from '@/components/os/DetailUI';

const projectOptions = PROJECTS.map((p) => p.name);
function inr(n: any) { return n ? '₹' + Number(n).toLocaleString('en-IN') : '—'; }

// --------------------------------------------------------------- Recruitment

const RECRUIT_STAGES = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'];
const RECRUIT_FIELDS: FieldDef[] = [
  { key: 'candidate_name', label: 'Candidate name', required: true },
  { key: 'role', label: 'Role applied for' },
  { key: 'phone', label: 'Phone' },
  { key: 'stage', label: 'Stage', type: 'select', options: RECRUIT_STAGES, required: true },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export function RecruitmentPipeline() {
  const { items, add, update } = useLocalCollection('recruitment', 'Candidate');
  const [adding, setAdding] = useState(false);

  const counts = RECRUIT_STAGES.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s]: items.filter((i) => i.stage === s).length }), {});

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <strong>Recruitment</strong>
          <div className="text-sm text-muted mt-1">Candidate pipeline — drag a card between stages, or add a new candidate.</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>+ Add Candidate</button>
      </div>
      <StatTiles items={[
        { label: 'In pipeline', value: items.filter((i) => !['Hired', 'Rejected'].includes(i.stage)).length },
        { label: 'Hired', value: counts['Hired'] || 0, tone: 'green' },
        { label: 'Rejected', value: counts['Rejected'] || 0 },
        { label: 'Total candidates', value: items.length },
      ]} />
      <div className="mt-4">
        {items.length === 0 ? (
          <div className="empty-state">No candidates yet. Add the first one to start the pipeline.</div>
        ) : (
          <KanbanBoard
            columns={RECRUIT_STAGES}
            items={items}
            onMove={(id, toColumn) => update(id, { stage: toColumn })}
            renderCard={(row) => (
              <div>
                <strong style={{ fontSize: 13 }}>{row.candidate_name}</strong>
                <div className="text-sm text-muted mt-1">{row.role || '—'}</div>
                {row.phone && <div className="text-sm text-muted">{row.phone}</div>}
              </div>
            )}
          />
        )}
      </div>
      {adding && (
        <Modal title="Add Candidate" onClose={() => setAdding(false)}>
          <RecordForm fields={RECRUIT_FIELDS} initial={{ stage: 'Applied' } as any} onSubmit={(v) => { add(v as any); setAdding(false); }} onCancel={() => setAdding(false)} submitLabel="Add" />
        </Modal>
      )}
    </div>
  );
}

// ----------------------------------------------------------------- Inventory

const INVENTORY_FIELDS: FieldDef[] = [
  { key: 'unit', label: 'Unit / plot no.', required: true },
  { key: 'project', label: 'Project', type: 'select', options: projectOptions, required: true },
  { key: 'type', label: 'Type', type: 'select', options: ['Plot', 'Villa', 'Apartment', 'Commercial'] },
  { key: 'size', label: 'Size' },
  { key: 'price', label: 'Price (₹)', type: 'number' },
  { key: 'status', label: 'Status', type: 'select', options: ['Available', 'Booked', 'Sold', 'On Hold'] },
];
const INV_STATUS_TONE: Record<string, string> = { Available: 'success', Booked: 'info', Sold: 'neutral', 'On Hold': 'warning' };

export function InventoryBoard() {
  const { items, add } = useLocalCollection('inventory', 'Unit');
  const [adding, setAdding] = useState(false);
  const byProject = projectOptions.map((p) => ({
    project: p,
    units: items.filter((i) => i.project === p),
  }));

  return (
    <div>
      <div className="card mb-4">
        <div className="flex items-center justify-between">
          <div>
            <strong>Inventory</strong>
            <div className="text-sm text-muted mt-1">Project-wise units and availability, across all projects.</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>+ Add Unit</button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card empty-state">No inventory units recorded yet.</div>
      ) : byProject.map(({ project, units }) => {
        if (units.length === 0) return null;
        const counts = units.reduce<Record<string, number>>((acc, u) => ({ ...acc, [u.status || 'Available']: (acc[u.status || 'Available'] || 0) + 1 }), {});
        return (
          <div key={project} className="card mb-4">
            <strong className="text-sm">{project}</strong>
            <div className="mt-2 mb-3"><StatTiles items={[
              { label: 'Total', value: units.length },
              { label: 'Available', value: counts['Available'] || 0, tone: 'green' },
              { label: 'Booked', value: counts['Booked'] || 0 },
              { label: 'Sold', value: counts['Sold'] || 0 },
            ]} /></div>
            <table className="table">
              <thead><tr><th>Unit</th><th>Type</th><th>Size</th><th>Price</th><th>Status</th></tr></thead>
              <tbody>{units.map((u) => (
                <tr key={u.id}>
                  <td>{u.unit}</td><td className="text-sm text-muted">{u.type || '—'}</td><td>{u.size || '—'}</td><td>{inr(u.price)}</td>
                  <td><span className={`badge badge-${INV_STATUS_TONE[u.status] || 'neutral'}`}>{u.status || 'Available'}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        );
      })}

      {adding && (
        <Modal title="Add Unit" onClose={() => setAdding(false)}>
          <RecordForm fields={INVENTORY_FIELDS} initial={{ status: 'Available' } as any} onSubmit={(v) => { add(v as any); setAdding(false); }} onCancel={() => setAdding(false)} submitLabel="Add" />
        </Modal>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Bookings

const BOOKING_STAGES = ['Booked', 'Agreement Signed', 'Cancelled'];
const BOOKING_FIELDS: FieldDef[] = [
  { key: 'customer_name', label: 'Customer name', required: true },
  { key: 'project', label: 'Project', type: 'select', options: projectOptions, required: true },
  { key: 'unit', label: 'Unit' },
  { key: 'amount', label: 'Booking amount (₹)', type: 'number', required: true },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'stage', label: 'Status', type: 'select', options: BOOKING_STAGES, required: true },
];

export function BookingsPipeline() {
  const { items, add, update } = useLocalCollection('bookings', 'Booking');
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const openRow = items.find((i) => i.id === open);
  const totalValue = items.filter((i) => i.stage !== 'Cancelled').reduce((s, i) => s + Number(i.amount || 0), 0);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <strong>Bookings</strong>
          <div className="text-sm text-muted mt-1">Booking pipeline — open a card for the full record.</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>+ Add Booking</button>
      </div>
      <StatTiles items={[
        { label: 'Active bookings', value: items.filter((i) => i.stage !== 'Cancelled').length },
        { label: 'Agreements signed', value: items.filter((i) => i.stage === 'Agreement Signed').length, tone: 'green' },
        { label: 'Cancelled', value: items.filter((i) => i.stage === 'Cancelled').length },
        { label: 'Active booking value', value: inr(totalValue) },
      ]} />
      <div className="mt-4">
        {items.length === 0 ? (
          <div className="empty-state">No bookings recorded yet.</div>
        ) : (
          <KanbanBoard
            columns={BOOKING_STAGES}
            items={items}
            onMove={(id, toColumn) => update(id, { stage: toColumn })}
            renderCard={(row) => (
              <div onClick={() => setOpen(row.id)} style={{ cursor: 'pointer' }}>
                <strong style={{ fontSize: 13 }}>{row.customer_name}</strong>
                <div className="text-sm text-muted mt-1">{row.project} {row.unit ? `· ${row.unit}` : ''}</div>
                <div className="text-sm mt-1">{inr(row.amount)}</div>
              </div>
            )}
          />
        )}
      </div>
      {adding && (
        <Modal title="Add Booking" onClose={() => setAdding(false)}>
          <RecordForm fields={BOOKING_FIELDS} initial={{ stage: 'Booked' } as any} onSubmit={(v) => { add(v as any); setAdding(false); }} onCancel={() => setAdding(false)} submitLabel="Add" />
        </Modal>
      )}
      {openRow && (
        <Modal title={openRow.customer_name} onClose={() => setOpen(null)}>
          <RecordForm fields={BOOKING_FIELDS} initial={openRow} onSubmit={(v) => { update(openRow.id, v); setOpen(null); }} onCancel={() => setOpen(null)} submitLabel="Save" />
        </Modal>
      )}
    </div>
  );
}

// -------------------------------------------------------------- Notifications

const NOTIF_FIELDS: FieldDef[] = [
  { key: 'title', label: 'Notification', required: true },
  { key: 'audience', label: 'Audience', type: 'select', options: ['Everyone', 'Owners', 'Managers', 'HR', 'Employees'] },
  { key: 'body', label: 'Details', type: 'textarea' },
];

export function NotificationsCentre() {
  const { items, add, update, remove } = useLocalCollection('notifications', 'Notification');
  const [adding, setAdding] = useState(false);
  const unread = items.filter((n) => !n.read);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <strong>Notifications</strong>
          <div className="text-sm text-muted mt-1">{unread.length} unread.</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>+ New Notification</button>
      </div>
      {items.length === 0 ? (
        <div className="empty-state">No notifications yet.</div>
      ) : (
        <div>
          {items.map((n) => (
            <div key={n.id} className="card-flat p-3 mb-2" style={{ opacity: n.read ? 0.6 : 1 }}>
              <div className="flex items-center justify-between">
                <strong className="text-sm">{n.title}</strong>
                <span className="badge badge-neutral">{n.audience || 'Everyone'}</span>
              </div>
              {n.body && <div className="text-sm text-muted mt-1">{n.body}</div>}
              <div className="flex gap-2 mt-2">
                {!n.read && <button className="btn btn-ghost btn-sm" onClick={() => update(n.id, { read: true })}>Mark read</button>}
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--av-error)' }} onClick={() => remove(n.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {adding && (
        <Modal title="New Notification" onClose={() => setAdding(false)}>
          <RecordForm fields={NOTIF_FIELDS} initial={{ audience: 'Everyone' } as any} onSubmit={(v) => { add({ ...v, read: false } as any); setAdding(false); }} onCancel={() => setAdding(false)} submitLabel="Send" />
        </Modal>
      )}
    </div>
  );
}

// ------------------------------------------------------------ Customer Feedback

// Company-wide view over the same 'customer-feedback' collection employees
// submit into (CustomerFeedbackModule in EmployeeModules.tsx) — ratings
// breakdown + an action-tracking board, not a second copy of the records.
// "Resolved" is tracked as a field on the existing record (action_resolved),
// never a parallel collection.
export function CustomerFeedbackBoard() {
  const { items, update } = useLocalCollection('customer-feedback', 'Feedback');
  const withAction = items.filter((f) => (f.action_needed || '').trim());
  const openActions = withAction.filter((f) => !f.action_resolved);
  const ratings = items.filter((f) => f.rating).map((f) => Number(f.rating));
  const avgRating = ratings.length ? (ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(1) : '—';
  const metCount = items.filter((f) => f.expectation_met === 'Yes').length;
  const metPct = items.length ? Math.round((metCount / items.length) * 100) : 0;
  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({ star, count: items.filter((f) => Number(f.rating) === star).length }));
  const maxRatingCount = Math.max(1, ...ratingCounts.map((r) => r.count));

  return (
    <div>
      <StatTiles items={[
        { label: 'Total feedback', value: items.length },
        { label: 'Average rating', value: avgRating },
        { label: 'Expectation met', value: items.length ? `${metPct}%` : '—', tone: metPct >= 70 ? 'green' : undefined },
        { label: 'Open action items', value: openActions.length, tone: openActions.length ? 'amber' : undefined },
      ]} />

      <div className="card mt-4 mb-4">
        <strong>Rating distribution</strong>
        {ratings.length === 0 ? <div className="empty-state mt-3">No ratings recorded yet.</div> : (
          <div className="mt-3">
            {ratingCounts.map((r) => (
              <div key={r.star} className="flex items-center gap-3 mb-2">
                <span className="text-sm" style={{ width: 44 }}>{r.star} ★</span>
                <div style={{ flex: 1, height: 8, background: 'var(--av-border)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${(r.count / maxRatingCount) * 100}%`, height: '100%', background: 'var(--av-primary)', borderRadius: 4 }} />
                </div>
                <span className="text-sm text-muted" style={{ width: 24, textAlign: 'right' }}>{r.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <strong>Action tracking</strong>
        <div className="text-sm text-muted mt-1 mb-3">Feedback entries that need a follow-up action.</div>
        {withAction.length === 0 ? <div className="empty-state">No action items from feedback yet.</div> : (
          <table className="table">
            <thead><tr><th>Customer</th><th>Project</th><th>Action needed</th><th>Owner</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {withAction.map((f) => (
                <tr key={f.id} style={{ opacity: f.action_resolved ? 0.6 : 1 }}>
                  <td>{f.customer_name}</td><td className="text-sm text-muted">{f.project || '—'}</td>
                  <td>{f.action_needed}</td><td className="text-sm text-muted">{f.action_owner || '—'}</td>
                  <td><StatusBadge value={f.action_resolved ? 'Resolved' : 'Open'} /></td>
                  <td>
                    {!f.action_resolved && <button className="btn btn-ghost btn-sm" onClick={() => update(f.id, { action_resolved: true })}>Mark resolved</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Challenges

// Company-wide escalation view over the shared 'challenges' collection
// (same records employees raise in ChallengesModule) — an actual timeline
// with overdue highlighting per the workbook's 24-hour resolution rule,
// instead of a flat table.
export function ChallengesBoard() {
  const { items, update } = useLocalCollection('challenges', 'Challenge');
  const now = Date.now();
  const hoursOpen = (c: any) => c.date_raised ? (now - new Date(c.date_raised).getTime()) / 3600000 : 0;
  const open = items.filter((c) => !c.solution);
  const overdue = open.filter((c) => hoursOpen(c) > 24);
  const resolved = items.filter((c) => c.solution);

  const sorted = [...items].sort((a, b) => (b.date_raised || '').localeCompare(a.date_raised || ''));
  const timelineItems = sorted.slice(0, 30).map((c) => ({
    key: c.id,
    sev: (!c.solution && hoursOpen(c) > 24 ? 'high' : !c.solution ? 'medium' : undefined) as 'high' | 'medium' | undefined,
    content: (
      <div>
        <div className="flex items-center justify-between">
          <strong style={{ fontSize: 13 }}>{c.particulars}</strong>
          <StatusBadge value={c.solution ? 'Resolved' : hoursOpen(c) > 24 ? 'Overdue' : 'Open'} />
        </div>
        <div className="text-sm text-muted mt-1">
          Raised by {c.created_by || '—'} to {c.raised_to || '—'} · {c.date_raised || '—'}
          {c.priority ? ` · Priority ${c.priority}` : ''}
        </div>
        {c.solution && <div className="text-sm mt-1">Solution: {c.solution}</div>}
        {!c.solution && (
          <button className="btn btn-ghost btn-sm mt-2" onClick={() => update(c.id, { solution: 'Resolved from the Challenges board', solution_date: new Date().toISOString().slice(0, 10) })}>
            Mark resolved
          </button>
        )}
      </div>
    ),
  }));

  return (
    <div>
      <StatTiles items={[
        { label: 'Open', value: open.length, tone: open.length ? 'amber' : undefined },
        { label: 'Overdue (> 24h)', value: overdue.length, tone: overdue.length ? 'red' : undefined },
        { label: 'Resolved', value: resolved.length, tone: 'green' },
        { label: 'Total raised', value: items.length },
      ]} />
      <div className="card mt-4">
        <strong>Escalation timeline</strong>
        <div className="text-sm text-muted mt-1 mb-3">Most recent first — anything unresolved past 24 hours is flagged overdue, matching the workbook's rule.</div>
        <PulseList items={timelineItems} />
      </div>
    </div>
  );
}
