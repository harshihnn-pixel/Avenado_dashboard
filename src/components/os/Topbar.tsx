import React, { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Command } from 'cmdk';
import { useApp } from '@/lib/os/store';
import { useLocalCollection } from '@/lib/os/useLocalCollection';
import { useTheme } from '@/lib/os/theme';
import { ThemeToggle } from './ThemeToggle';
import { ConfirmDialog } from './ConfirmDialog';
import type { NavItem } from './Sidebar';
import {
  IconMenu, IconBell, IconSearch, IconLogOut, IconChevronDown, IconCheckAll, IconChevronRight,
  IconSun, IconMoon, IconSystem, IconInbox, IconArrowRight,
} from './icons';

function initials(name?: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

const AUDIENCE_FOR_ROLE: Record<string, string> = {
  owner: 'Owners', manager: 'Managers', hr: 'HR', employee: 'Employees',
};

export interface NavGroupLite { label: string; items: NavItem[] }

/** ⌘K command palette — jumps to any page the current role can see. */
function CommandPalette({ groups, onNavigate }: { groups: NavGroupLite[]; onNavigate: (key: string) => void }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((o) => !o); }
      else if (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement) && !(e.target as HTMLElement)?.isContentEditable) {
        e.preventDefault(); setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <button type="button" className="search-trigger hide-mobile" onClick={() => setOpen(true)} aria-label="Search pages">
        <IconSearch size={15} />
        <span style={{ flex: 1, textAlign: 'left' }}>Search pages…</span>
        <span className="kbd">⌘K</span>
      </button>
      <button type="button" className="btn btn-ghost btn-icon hide-desktop" onClick={() => setOpen(true)} aria-label="Search pages">
        <IconSearch size={18} />
      </button>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="modal-overlay" />
          <Dialog.Content className="modal-panel cmdk-panel" aria-describedby={undefined} style={{ top: '18%', transform: 'translate(-50%, 0)', width: 'min(600px, calc(100vw - 32px))', animation: 'av-pop .16s var(--av-ease)' }}>
            <Dialog.Title className="sr-only">Search pages</Dialog.Title>
            <Command label="Search pages" loop>
              <div className="cmdk-input-row">
                <IconSearch size={17} />
                <Command.Input autoFocus placeholder="Search pages and tools…" className="cmdk-input" />
                <span className="kbd">Esc</span>
              </div>
              <Command.List className="cmdk-list">
                <Command.Empty className="empty-state" style={{ padding: '28px 16px' }}>No pages match that search.</Command.Empty>
                {groups.map((g) => (
                  <Command.Group key={g.label} heading={g.label} className="cmdk-group">
                    {g.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Command.Item
                          key={item.key}
                          value={`${item.label} ${g.label}`}
                          onSelect={() => { onNavigate(item.key); setOpen(false); }}
                          className="cmdk-item"
                        >
                          <Icon size={16} />
                          <span style={{ flex: 1 }}>{item.label}</span>
                          <IconArrowRight size={14} className="cmdk-item-arrow" />
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                ))}
              </Command.List>
            </Command>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function ThemeMenu() {
  const { mode, setMode } = useTheme();
  const Icon = mode === 'dark' ? IconMoon : mode === 'light' ? IconSun : IconSystem;
  const opts = [
    { m: 'light' as const, label: 'Light', icon: IconSun },
    { m: 'dark' as const, label: 'Dark', icon: IconMoon },
    { m: 'system' as const, label: 'System', icon: IconSystem },
  ];
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="btn btn-ghost btn-icon hide-mobile" aria-label="Change theme">
        <Icon size={17} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} className="dropdown-panel" style={{ width: 168, padding: 4 }}>
          <DropdownMenu.RadioGroup value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
            {opts.map((o) => (
              <DropdownMenu.RadioItem key={o.m} value={o.m} className="dropdown-item" style={{ borderRadius: 7 }}>
                <o.icon size={15} />
                <span style={{ flex: 1 }}>{o.label}</span>
                <DropdownMenu.ItemIndicator><span className="text-primary">●</span></DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function NotificationMenu({ onNavigate }: { onNavigate: (key: string) => void }) {
  const { role, subRole } = useApp();
  const { items: notifications, update } = useLocalCollection('notifications', 'Notification');
  const { items: tasks } = useLocalCollection('tasks', 'Task');
  const { items: dailyReports } = useLocalCollection('daily-reports', 'Daily Report');

  const audience = role === 'manager-hr' ? AUDIENCE_FOR_ROLE[subRole] : AUDIENCE_FOR_ROLE[role as string];
  const relevant = notifications.filter((n) => n.audience === 'Everyone' || n.audience === audience);
  const unreadAnnouncements = relevant.filter((n) => !n.read);

  // One real, role-specific "needs you" item — computed from the same
  // shared collections every workflow page already reads, never invented.
  const pendingWork = role === 'manager-hr'
    ? tasks.filter((t) => t.status === 'Submitted for Review').length + dailyReports.filter((r) => r.verification_status === 'Submitted').length
    : role === 'employee'
      ? tasks.filter((t) => t.status === 'Changes Requested' || t.status === 'Rejected').length
      : 0;
  const pendingLabel = role === 'manager-hr' ? 'submission(s) waiting on your review' : 'task(s) sent back for changes';
  const pendingNavKey = role === 'manager-hr' ? 'mgr-verify' : 'emp-tasks';

  const totalBadge = unreadAnnouncements.length + (pendingWork > 0 ? 1 : 0);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="btn btn-ghost btn-icon topbar-icon-btn" aria-label={`Notifications${totalBadge ? `, ${totalBadge} unread` : ''}`}>
        <IconBell size={18} />
        {totalBadge > 0 && <span className="topbar-badge">{totalBadge > 9 ? '9+' : totalBadge}</span>}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} className="dropdown-panel notification-panel" style={{ width: 360 }}>
          <div className="dropdown-header">
            <div>
              <div className="font-semibold">Notifications</div>
              <div className="text-xs text-muted">{totalBadge ? `${totalBadge} need${totalBadge === 1 ? 's' : ''} attention` : "You're all caught up"}</div>
            </div>
            {unreadAnnouncements.length > 0 && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => unreadAnnouncements.forEach((n) => update(n.id, { read: true }))}
              >
                <IconCheckAll size={13} /> Mark all read
              </button>
            )}
          </div>
          {pendingWork > 0 && (
            <DropdownMenu.Item className="dropdown-item notification-item" onSelect={() => onNavigate(pendingNavKey)}>
              <span className="notification-dot warn" />
              <span><strong>{pendingWork}</strong> {pendingLabel}</span>
            </DropdownMenu.Item>
          )}
          {relevant.length === 0 && pendingWork === 0 ? (
            <div className="empty-state" style={{ padding: '28px 16px' }}>
              <div className="empty-state-icon"><IconInbox size={18} /></div>
              Nothing here yet.
            </div>
          ) : (
            relevant.slice(0, 6).map((n) => (
              <DropdownMenu.Item
                key={n.id}
                className="dropdown-item notification-item"
                onSelect={(e) => { e.preventDefault(); if (!n.read) update(n.id, { read: true }); }}
              >
                <span className={`notification-dot${n.read ? '' : ' unread'}`} />
                <span style={{ minWidth: 0 }}>
                  <span className="font-medium" style={{ display: 'block' }}>{n.title}</span>
                  {n.body && <span className="text-sm text-muted" style={{ display: 'block' }}>{n.body}</span>}
                </span>
              </DropdownMenu.Item>
            ))
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function ProfileMenu({ portalLabel, onSignOut }: { portalLabel: string; onSignOut: () => void }) {
  const { profile } = useApp();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="profile-trigger" aria-label="Account menu">
        <span className="avatar" style={{ width: 30, height: 30, fontSize: 11.5 }}>{initials(profile?.full_name)}</span>
        <span className="hide-mobile" style={{ flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
          <span className="text-sm font-medium text-main">{profile?.full_name}</span>
          <span className="text-xs text-muted">{portalLabel}</span>
        </span>
        <IconChevronDown size={14} className="hide-mobile text-muted" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} className="dropdown-panel profile-panel" style={{ width: 280 }}>
          <div className="dropdown-header" style={{ justifyContent: 'flex-start', gap: 10 }}>
            <span className="avatar" style={{ width: 36, height: 36, fontSize: 13 }}>{initials(profile?.full_name)}</span>
            <div style={{ minWidth: 0 }}>
              <div className="font-semibold truncate">{profile?.full_name}</div>
              <div className="text-xs text-muted truncate">{profile?.email || profile?.designation}</div>
            </div>
          </div>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--av-border)' }}>
            <div className="text-xs text-muted mb-1">Signed in to</div>
            <div className="text-sm font-medium">{portalLabel} portal{profile?.designation ? ` · ${profile.designation}` : ''}</div>
          </div>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--av-border)' }}>
            <div className="text-xs text-muted mb-2">Appearance</div>
            <ThemeToggle withLabels />
          </div>
          <div style={{ padding: 4 }}>
            <DropdownMenu.Item className="dropdown-item" style={{ borderRadius: 7, color: 'var(--av-error-ink)' }} onSelect={onSignOut}>
              <IconLogOut size={15} style={{ color: 'inherit' }} /> Sign out
            </DropdownMenu.Item>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function Topbar({
  title, breadcrumb, portalLabel, groups, onNavigate, onMenu,
}: {
  title: string;
  breadcrumb?: string;
  portalLabel: string;
  groups: NavGroupLite[];
  onNavigate: (key: string) => void;
  onMenu: () => void;
}) {
  const { signOut } = useApp();
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  return (
    <header className="topbar">
      <button className="btn btn-ghost btn-icon hide-desktop" onClick={onMenu} aria-label="Open menu">
        <IconMenu size={18} />
      </button>
      <nav aria-label="Breadcrumb" className="topbar-crumbs" style={{ minWidth: 0 }}>
        <span className="hide-mobile">{portalLabel}</span>
        {breadcrumb && <><IconChevronRight size={14} className="hide-mobile" /><span className="hide-mobile">{breadcrumb}</span></>}
        <IconChevronRight size={14} className="hide-mobile" />
        <h1 className="crumb-current" aria-current="page" style={{ fontSize: 13.5, margin: 0 }}>{title}</h1>
      </nav>
      <div className="flex-1" />
      <CommandPalette groups={groups} onNavigate={onNavigate} />
      <ThemeMenu />
      <NotificationMenu onNavigate={onNavigate} />
      <ProfileMenu portalLabel={portalLabel} onSignOut={() => setConfirmingSignOut(true)} />

      {confirmingSignOut && (
        <ConfirmDialog
          title="Sign out?"
          message="You'll need to sign in again to get back to your dashboard."
          confirmLabel={signingOut ? 'Signing out…' : 'Sign out'}
          tone="danger"
          onCancel={() => setConfirmingSignOut(false)}
          onConfirm={async () => { setSigningOut(true); await signOut(); setSigningOut(false); setConfirmingSignOut(false); }}
        />
      )}
    </header>
  );
}
