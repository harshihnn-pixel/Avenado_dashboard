import React from 'react';
import { useTheme } from '@/lib/os/theme';
import { IconSun, IconMoon, IconSystem } from './icons';

const OPTIONS = [
  { mode: 'light' as const, icon: IconSun, label: 'Light' },
  { mode: 'dark' as const, icon: IconMoon, label: 'Dark' },
  { mode: 'system' as const, icon: IconSystem, label: 'System' },
];

export function ThemeToggle({ withLabels = false }: { withLabels?: boolean }) {
  const { mode, setMode } = useTheme();
  return (
    <div className="tabs-list" role="radiogroup" aria-label="Theme">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = mode === opt.mode;
        return (
          <button
            key={opt.mode}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${opt.label} theme`}
            className={`tabs-trigger${active ? ' active' : ''}`}
            onClick={() => setMode(opt.mode)}
            title={opt.label}
            style={withLabels ? { flex: 1 } : undefined}
          >
            <Icon size={14} />
            {withLabels && <span>{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
