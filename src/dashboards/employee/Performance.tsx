import React from 'react';
import { useLocalCollection } from '@/lib/os/useLocalCollection';

export function PerformancePage() {
  const { items: tasks } = useLocalCollection('tasks', 'Task');
  const { items: dailyLog } = useLocalCollection('daily-log', 'Log');
  const done = tasks.filter((t) => t.stage === 'Done').length;
  const hours = dailyLog.reduce((s, l) => s + (Number(l.hours) || 0), 0);

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="kpi-card card"><div className="text-sm text-muted mb-1">Tasks completed</div><div className="text-2xl font-bold" style={{ fontSize: 26 }}>{done}</div></div>
        <div className="kpi-card card"><div className="text-sm text-muted mb-1">Total tasks</div><div className="text-2xl font-bold" style={{ fontSize: 26 }}>{tasks.length}</div></div>
        <div className="kpi-card card"><div className="text-sm text-muted mb-1">Hours logged</div><div className="text-2xl font-bold" style={{ fontSize: 26 }}>{hours}</div></div>
      </div>
      <div className="card empty-state">
        Computed from your Tasks and Daily Log entries — add some there to see this fill in.
      </div>
    </div>
  );
}
