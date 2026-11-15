import React, { useEffect, useMemo, useState } from 'react';
import { AppProvider, useApp } from '@/lib/os/store';
import { Sidebar, visibleGroups } from './Sidebar';
import { Topbar } from './Topbar';
import { ToastProvider } from './Toast';
import { NavProvider } from './nav-context';
import type { Role } from '@/lib/os/types';
import { AuthScreens } from './AuthScreens';

function portalLabelFor(role: Role, subRole: string) {
  if (role === 'manager-hr') return subRole === 'hr' ? 'HR' : 'Manager';
  return role === 'owner' ? 'Owner' : 'Employee';
}

function DashboardShell({ pageKey, onPageChange }: { pageKey?: string; onPageChange: (key: string) => void }) {
  const { role, subRole, setSubRole, sidebarCollapsed, setSidebarCollapsed } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const groups = useMemo(() => visibleGroups(role as Role, subRole), [role, subRole]);
  const allItems = groups.flatMap((g) => g.items);
  const activeItem = allItems.find((i) => i.key === pageKey) || allItems[0];
  const activeGroup = groups.find((g) => g.items.some((i) => i.key === activeItem.key));
  const Page = activeItem.page;
  const portalLabel = portalLabelFor(role as Role, subRole);

  // A page key the current role can't see (stale link, sub-role switch) falls back to the overview.
  useEffect(() => {
    if (pageKey && !allItems.some((i) => i.key === pageKey)) onPageChange(allItems[0].key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey, subRole, role]);

  useEffect(() => {
    document.title = `${activeItem.label} · Avenado OS`;
  }, [activeItem.label]);

  const go = (key: string) => { onPageChange(key); window.scrollTo({ top: 0 }); };

  return (
    <NavProvider go={go}>
      <div className="app-shell">
        <a href="#main-content" className="sr-only focus:not-sr-only" style={{ position: 'absolute', zIndex: 80 }}>Skip to content</a>
        <Sidebar
          role={role as Role}
          subRole={subRole}
          onSubRoleChange={setSubRole}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          active={activeItem.key}
          onSelect={go}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <div className="main-col">
          <Topbar
            title={activeItem.label}
            breadcrumb={activeGroup && activeGroup.label !== 'Overview' ? activeGroup.label : undefined}
            portalLabel={portalLabel}
            groups={groups}
            onNavigate={go}
            onMenu={() => setMobileOpen(true)}
          />
          <main id="main-content" className="content" tabIndex={-1}>
            <div key={activeItem.key} className="av-animate-in">
              <Page />
            </div>
          </main>
        </div>
      </div>
    </NavProvider>
  );
}

function Root({ pageKey, onPageChange }: { pageKey?: string; onPageChange: (key: string) => void }) {
  const { role } = useApp();
  return role ? <DashboardShell pageKey={pageKey} onPageChange={onPageChange} /> : <AuthScreens />;
}

export function AvenadoApp({ pageKey, onPageChange }: { pageKey?: string; onPageChange: (key: string) => void }) {
  return (
    <ToastProvider>
      <AppProvider>
        <Root pageKey={pageKey} onPageChange={onPageChange} />
      </AppProvider>
    </ToastProvider>
  );
}
