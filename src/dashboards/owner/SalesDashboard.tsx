import React from 'react';
import { useLocalCollection } from '@/lib/os/useLocalCollection';
import { PROJECTS } from '@/lib/os/mock-data';

const STAGES = ['New', 'Contacted', 'Site Visit Scheduled', 'Negotiation', 'Won', 'Closed Lost'];

export function SalesDashboard() {
  const { items: leads } = useLocalCollection('leads', 'Lead');
  const { items: bookings } = useLocalCollection('bookings', 'Booking');

  const byStage = STAGES.map((s) => ({ stage: s, count: leads.filter((l) => l.stage === s).length }));
  const byProject = PROJECTS.map((p) => ({
    project: p.name,
    leads: leads.filter((l) => l.project === p.name).length,
    bookings: bookings.filter((b) => b.project === p.name).length,
  }));

  return (
    <div>
      <div className="card mb-6">
        <strong>Pipeline by stage</strong>
        <div className="flex gap-2 mt-3" style={{ flexWrap: 'wrap' }}>
          {byStage.map((s) => (
            <div key={s.stage} className="card-flat p-3" style={{ minWidth: 140 }}>
              <div className="text-sm text-muted">{s.stage}</div>
              <div className="text-xl font-bold" style={{ fontSize: 22, fontWeight: 700 }}>{s.count}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <strong>By project</strong>
        <table className="table mt-3">
          <thead><tr><th>Project</th><th style={{ textAlign: 'right' }}>Leads</th><th style={{ textAlign: 'right' }}>Bookings</th></tr></thead>
          <tbody>
            {byProject.map((p) => (
              <tr key={p.project}><td>{p.project}</td><td style={{ textAlign: 'right' }}>{p.leads}</td><td style={{ textAlign: 'right' }}>{p.bookings}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      {leads.length === 0 && (
        <div className="card empty-state mt-6">Add leads on the Leads &amp; Pipeline page to see this fill in.</div>
      )}
    </div>
  );
}
