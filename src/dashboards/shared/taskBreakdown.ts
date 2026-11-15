// Groups real task rows by workflow status for the dashboard status bars.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function taskStatusSegments(tasks: Record<string, any>[]) {
  const count = (pred: (s: string) => boolean) => tasks.filter((t) => pred(t.status || 'Not Started')).length;
  return [
    { key: 'ns', label: 'Not started', cls: 'pending', value: count((s) => s === 'Not Started') },
    { key: 'ip', label: 'In progress', cls: 'progress', value: count((s) => s === 'In Progress') },
    { key: 'rv', label: 'In review', cls: 'clarify', value: count((s) => s === 'Submitted for Review' || s === 'Changes Requested') },
    { key: 'vf', label: 'Verified', cls: 'verified', value: count((s) => s === 'Verified') },
    { key: 'rj', label: 'Rejected', cls: 'incorrect', value: count((s) => s === 'Rejected') },
  ];
}

export function firstName(name?: string | null) {
  return String(name || '').trim().split(/\s+/)[0] || 'there';
}
