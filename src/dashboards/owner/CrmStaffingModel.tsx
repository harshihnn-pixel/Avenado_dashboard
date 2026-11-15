import React, { useState } from 'react';
import { useStaffingAssumptions, useProjectStaffing, useTeamSummary, computeWorkload } from '@/lib/os/useStaffingModel';
import { Field, type FieldDef } from '@/components/os/ListModule';
import { RadialGaugeGrid } from '@/components/os/Charts';
import { capacityCssColor } from '@/lib/os/mock-data';
import { IconAlert } from '@/components/os/icons';

const TABS = ['Inputs', 'CRM Workload', 'Team Summary', 'Suggestions'] as const;
type Tab = typeof TABS[number];

const ASSUMPTION_FIELDS: { key: string; label: string; suffix?: string }[] = [
  { key: 'calling_minutes', label: 'Calling time per lead', suffix: 'min' },
  { key: 'presentations_per_visit', label: 'Presentations per visit' },
  { key: 'presentation_minutes', label: 'Presentation time', suffix: 'min' },
  { key: 'visit_followup_minutes', label: 'Visit follow-up time', suffix: 'min' },
  { key: 'site_visit_minutes', label: 'Site visit time', suffix: 'min' },
  { key: 'working_hours_per_week', label: 'Working hours / week', suffix: 'hrs' },
  { key: 'max_visits_per_crm_per_day', label: 'Max visits / CRM / day' },
  { key: 'visit_days_per_month', label: 'Visit days / month' },
  { key: 'legal_coordination_hours_per_booking', label: 'Legal coordination / booking', suffix: 'hrs' },
  { key: 'legal_hours_per_month', label: 'Legal hours / month', suffix: 'hrs' },
];

export function CrmStaffingModel() {
  const [tab, setTab] = useState<Tab>('Inputs');
  const { assumptions, setAssumptions, resetAssumptions } = useStaffingAssumptions();
  const { rows, updateRow, resetRows } = useProjectStaffing();
  const { rows: team, total, updateRole, resetRows: resetTeam } = useTeamSummary();

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <strong>CRM Staffing Model</strong>
          <div className="text-sm text-muted mt-1">
            Seeded with your real Avenado_CRM_Staffing_Model_1.xlsx figures. Every number below is editable and
            recalculates live — including the Owner Dashboard KPIs, which read this same data.
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => { resetAssumptions(); resetRows(); resetTeam(); }}>
          Reset to original Excel values
        </button>
      </div>

      <div className="tabs-list mb-5">
        {TABS.map((t) => (
          <button key={t} className={`tabs-trigger${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'Inputs' && (
        <div className="grid grid-cols-2 gap-4">
          {ASSUMPTION_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="field-label">{f.label}{f.suffix ? ` (${f.suffix})` : ''}</label>
              <Field
                def={{ key: f.key, label: f.label, type: 'number' } as FieldDef}
                value={(assumptions as any)[f.key]}
                onChange={(v) => setAssumptions({ [f.key]: v } as any)}
              />
            </div>
          ))}
        </div>
      )}

      {tab === 'CRM Workload' && (
        <>
          <div className="card mb-4">
            <strong className="text-sm">CRM capacity utilisation by project</strong>
            <div className="text-sm text-muted mt-1 mb-3">
              Each ring is that project's team workload as a % of its recommended CRM headcount's working hours —
              a full ring means fully booked (100%). Green: healthy. Amber: over 85%. Red: over capacity, needs
              more CRMs or lighter targets.
            </div>
            <RadialGaugeGrid
              size={132}
              formatValue={(v) => `${v}%`}
              items={rows.map((p) => {
                const w = computeWorkload(assumptions, p);
                return { key: p.id, label: p.project_name, value: w.utilisationPct, color: capacityCssColor(w.utilisationPct) };
              })}
            />
          </div>
          <table className="table table-row-hover">
          <thead>
            <tr>
              <th>Project</th><th style={{ textAlign: 'right' }}>Units to sell</th><th style={{ textAlign: 'right' }}>Leads/day</th><th style={{ textAlign: 'right' }}>Visits/30d</th>
              <th style={{ textAlign: 'right' }}>Calling hrs/wk</th><th style={{ textAlign: 'right' }}>Presentation hrs/wk</th>
              <th style={{ textAlign: 'right' }}>Follow-up hrs/wk</th><th style={{ textAlign: 'right' }}>Visit hrs/wk</th>
              <th style={{ textAlign: 'right' }}>Total hrs/wk</th><th style={{ textAlign: 'right' }}>Recommended CRMs</th>
              <th style={{ textAlign: 'right' }}>Utilisation</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const w = computeWorkload(assumptions, p);
              return (
                <tr key={p.id}>
                  <td>{p.project_name}</td>
                  <td style={{ textAlign: 'right' }}>
                    <input className="input" style={{ width: 70, textAlign: 'right', display: 'inline-block' }} type="number"
                      value={p.units_to_sell} onChange={(e) => updateRow(p.id, { units_to_sell: e.target.valueAsNumber })} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <input className="input" style={{ width: 70, textAlign: 'right', display: 'inline-block' }} type="number"
                      value={p.calls_per_month} onChange={(e) => updateRow(p.id, { calls_per_month: e.target.valueAsNumber })} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <input className="input" style={{ width: 70, textAlign: 'right', display: 'inline-block' }} type="number"
                      value={p.site_visits_per_month} onChange={(e) => updateRow(p.id, { site_visits_per_month: e.target.valueAsNumber })} />
                  </td>
                  <td style={{ textAlign: 'right' }}>{w.callingHwk.toFixed(1)}</td>
                  <td style={{ textAlign: 'right' }}>{w.presentationsHwk.toFixed(1)}</td>
                  <td style={{ textAlign: 'right' }}>{w.followupHwk.toFixed(1)}</td>
                  <td style={{ textAlign: 'right' }}>{w.siteVisitHwk.toFixed(1)}</td>
                  <td style={{ textAlign: 'right' }}><strong>{w.totalHwk.toFixed(1)}</strong></td>
                  <td style={{ textAlign: 'right' }}>
                    <input className="input" style={{ width: 56, textAlign: 'right', display: 'inline-block' }} type="number"
                      value={p.recommended_crms} onChange={(e) => updateRow(p.id, { recommended_crms: e.target.valueAsNumber })} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={`badge badge-${w.utilisationPct > 100 ? 'error' : w.utilisationPct > 85 ? 'warning' : 'success'}`}>{w.utilisationPct}%</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </>
      )}

      {tab === 'Team Summary' && (
        <table className="table">
          <thead><tr><th>Role</th><th style={{ textAlign: 'right' }}>Headcount</th></tr></thead>
          <tbody>
            {team.map((r) => (
              <tr key={r.role}>
                <td>{r.role}</td>
                <td style={{ textAlign: 'right' }}>
                  <input className="input" style={{ width: 70, textAlign: 'right', display: 'inline-block' }} type="number"
                    value={r.count} onChange={(e) => updateRole(r.role, e.target.valueAsNumber)} />
                </td>
              </tr>
            ))}
            <tr><td><strong>Total</strong></td><td style={{ textAlign: 'right' }}><strong>{total}</strong></td></tr>
          </tbody>
        </table>
      )}

      {tab === 'Suggestions' && (
        <div>
          <p className="text-sm text-muted mb-4">
            These are generated live from the numbers above, not reproduced from your Excel's own Suggestions
            sheet (that sheet's narrative text wasn't part of what was extracted into this app) — so treat this
            as a computed starting point, not a transcript.
          </p>
          {rows.map((p) => {
            const w = computeWorkload(assumptions, p);
            if (w.utilisationPct <= 100) return null;
            const shortBy = Math.ceil((w.utilisationPct - 100) / 100 * p.recommended_crms);
            return (
              <div key={p.id} className="flex items-center gap-2 mb-2">
                <IconAlert size={16} />
                <span className="text-sm">
                  <strong>{p.project_name}</strong> is at {w.utilisationPct}% of CRM capacity — consider adding
                  {' '}{Math.max(shortBy, 1)} more CRM{shortBy > 1 ? 's' : ''} or reducing its visit/call targets.
                </span>
              </div>
            );
          })}
          {rows.every((p) => computeWorkload(assumptions, p).utilisationPct <= 100) && (
            <div className="empty-state">No project is currently over capacity.</div>
          )}
        </div>
      )}
    </div>
  );
}
