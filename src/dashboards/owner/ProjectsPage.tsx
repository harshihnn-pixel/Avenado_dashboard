import React, { useState } from 'react';
import { PROJECTS } from '@/lib/os/mock-data';
import { useLocalCollection } from '@/lib/os/useLocalCollection';
import { projectCompletions, completionColor } from '@/lib/os/projectMetrics';
import { ProjectDetail } from './ProjectDetail';

function healthBadge(h: string) {
  return <span className={`badge badge-${h === 'on_track' ? 'success' : h === 'at_risk' ? 'warning' : 'error'}`}>{h.replace('_', ' ')}</span>;
}

export function ProjectsPage() {
  const [openId, setOpenId] = useState<string | null>(null);
  const { items: overrides } = useLocalCollection('project-overrides', 'Project Override');
  const { items: tasks } = useLocalCollection('tasks', 'Task');
  const project = PROJECTS.find((p) => p.id === openId);

  if (project) {
    return <ProjectDetail project={project} onBack={() => setOpenId(null)} />;
  }

  // Live completion %, by project id — recomputed from the real `tasks`
  // collection on every render, so it moves on its own as employees report
  // work and managers verify it, instead of being a number typed in once.
  const completionById = new Map(projectCompletions(PROJECTS, tasks).map((c) => [c.projectId, c]));

  return (
    <div className="card">
      <strong>Projects</strong>
      <div className="text-sm text-muted mt-1 mb-4">All {PROJECTS.length} are real, current Avenado engagements — stage/health/next step as last verified. "Completion" is live, from real logged and verified tasks. Click one for the full picture: tasks, team, sales, marketing, inventory, finance, milestones &amp; risks, activity and issues.</div>
      <table className="table table-row-hover">
        <thead><tr><th>Project</th><th>Stage</th><th>Health</th><th>Next step</th><th>Completion</th></tr></thead>
        <tbody>
          {PROJECTS.map((p) => {
            const o = overrides.find((ov) => ov.project_id === p.id);
            const merged = { ...p, ...o };
            const completion = completionById.get(p.id);
            const pct = completion?.completionPct ?? null;
            return (
              <tr key={p.id} onClick={() => setOpenId(p.id)}>
                <td><strong>{merged.name}</strong></td>
                <td className="text-sm text-muted">{merged.stage}</td>
                <td>{healthBadge(merged.health)}</td>
                <td className="text-sm text-muted">{merged.next_step}</td>
                <td>
                  {pct == null ? (
                    <span className="text-sm text-muted">No tasks yet</span>
                  ) : (
                    <span className="text-sm font-semibold" style={{ color: completionColor(pct) }}>
                      {pct}% ({completion!.completedTasks}/{completion!.totalTasks} tasks)
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
