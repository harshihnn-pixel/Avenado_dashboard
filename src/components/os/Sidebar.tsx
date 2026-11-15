import React, { useEffect, useState } from 'react';
import * as L from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import type { Role, SubRole } from '@/lib/os/types';
import {
  IconDashboard, IconUsers, IconBriefcase, IconKanban, IconWallet,
  IconClipboard, IconSettings, IconChevronLeft, IconChevronRight, IconBuilding, IconTrendingUp,
  IconCalendar, IconBadge, IconFile, IconChevronDown,
} from './icons';

import { OwnerDashboard } from '@/dashboards/owner/OwnerDashboard';
import { LeadsPipeline } from '@/dashboards/owner/LeadsPipeline';
import { CrmStaffingModel } from '@/dashboards/owner/CrmStaffingModel';
import { ProjectsPage } from '@/dashboards/owner/ProjectsPage';
import { FinanceOverview } from '@/dashboards/owner/FinanceOverview';
import { SalesDashboard } from '@/dashboards/owner/SalesDashboard';
import { PermissionsPage, CompanySettingsPage, AuditLogPage, ActivityPage } from '@/dashboards/owner/Settings';
import {
  SiteVisitsModule, FollowupsModule,
  CollectionsModule, ExpensesModule, CommissionsModule, BudgetsModule, TargetsModule,
  DocumentsModule, MarketingModule, CustomersModule, AlertsModule, MessagesModule,
} from '@/dashboards/owner/GenericModules';
import {
  RecruitmentPipeline, InventoryBoard, BookingsPipeline, NotificationsCentre,
  CustomerFeedbackBoard, ChallengesBoard,
} from '@/dashboards/owner/RedesignedModules';
import { EmployeeDirectory, TeamStatusPage, OrgChartPage } from '@/dashboards/shared/People';
import { TeamAccessPage } from '@/dashboards/owner/TeamAccess';
import { TaskAssignmentPage, MyTasksPage, WorkVerificationPage, VerifiedReportsPage } from '@/dashboards/shared/TaskWorkflow';
import { CheckInOutPage, TeamAttendancePage, CompanyAttendancePage, AttendanceCorrectionsPage } from '@/dashboards/shared/Attendance';
import { MyDailyReportPage, DailyReportVerificationPage, OwnerDailyReportsPage } from '@/dashboards/shared/DailyReports';
import { EmployeeProfilePage } from '@/dashboards/shared/EmployeeProfile';

import { EmployeeDashboard } from '@/dashboards/employee/EmployeeDashboard';
import { PerformancePage } from '@/dashboards/employee/Performance';
import {
  TodayWorkModule, TaskTimeModule, DailyLogModule, ChallengesModule, IdeasModule,
  CustomerFeedbackModule, AllowanceModule,
} from '@/dashboards/employee/EmployeeModules';

import { ManagerDashboard } from '@/dashboards/manager/ManagerDashboard';
import { LeaveRequestsModule, ApprovalsPage } from '@/dashboards/manager/ManagerModules';

export interface NavItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  page: React.ComponentType;
  /** Legacy page name(s) this item stands in for. */
  legacy?: string[];
  /** Only shown inside the combined Manager/HR portal when the active sub-role toggle matches.
   *  Omitted entirely => visible to both Manager and HR. */
  visibleFor?: SubRole[];
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}

const EmployeeDirectoryOwner = () => <EmployeeDirectory title="Employee Directory" />;
const EmployeeDirectoryManager = () => <EmployeeDirectory title="Employee Management" />;

// Sidebar groupings per the Version 7.0 master prompt's spec for each of the
// exactly-3 dashboards. Manager and HR share ONE 'manager-hr' array below —
// items tagged `visibleFor` only show for that sub-role; untagged items show
// for both (the shared workflow spine: assignment, verification, attendance,
// org chart, approvals). "legacy" lists which of the 67 original pages this
// nav item absorbs.
const NAV: Record<Role, NavGroup[]> = {
  owner: [
    { label: 'Overview', items: [
      { key: 'owner-overview', label: 'Executive Overview', icon: IconDashboard, page: OwnerDashboard, legacy: ['ceo-dashboard.html'] },
    ]},
    { label: 'Workflow', items: [
      { key: 'owner-daily-reports', label: 'Daily Reports Overview', icon: IconFile, page: OwnerDailyReportsPage, legacy: ['daily-report.html'] },
      { key: 'owner-task-reports', label: 'Verified Task Reports', icon: IconBadge, page: VerifiedReportsPage, legacy: ['verified-reports.html'] },
      { key: 'owner-org-chart', label: 'Organization Structure', icon: IconUsers, page: OrgChartPage, legacy: ['org-chart.html'] },
      { key: 'owner-attendance', label: 'Company Attendance', icon: IconCalendar, page: CompanyAttendancePage, legacy: ['attendance.html'] },
    ]},
    { label: 'Sales & CRM', items: [
      { key: 'owner-leads', label: 'Leads & Pipeline', icon: IconKanban, page: LeadsPipeline, legacy: ['funnel.html', 'enquiry.html', 'lead-detail.html'] },
      { key: 'owner-staffing', label: 'CRM Staffing Model', icon: IconUsers, page: CrmStaffingModel, legacy: ['staffing.html'] },
      { key: 'owner-visits', label: 'Site Visits', icon: IconBriefcase, page: SiteVisitsModule, legacy: ['site-visits.html'] },
      { key: 'owner-followups', label: 'Follow-ups', icon: IconClipboard, page: FollowupsModule, legacy: ['followups.html'] },
      { key: 'owner-sales', label: 'Sales Dashboard', icon: IconTrendingUp, page: SalesDashboard, legacy: ['sales-dashboard.html'] },
    ]},
    { label: 'Projects', items: [
      { key: 'owner-projects', label: 'Projects', icon: IconBuilding, page: ProjectsPage, legacy: ['project.html', 'project-detail.html'] },
      { key: 'owner-inventory', label: 'Inventory', icon: IconClipboard, page: InventoryBoard, legacy: ['inventory.html'] },
    ]},
    { label: 'People & Operations', items: [
      { key: 'owner-team-access', label: 'Team & Access', icon: IconUsers, page: TeamAccessPage, legacy: [] },
      { key: 'owner-directory', label: 'Employee Directory', icon: IconUsers, page: EmployeeDirectoryOwner, legacy: ['employee-directory.html', 'employee-detail.html'] },
      { key: 'owner-team-status', label: 'Team Status', icon: IconUsers, page: TeamStatusPage, legacy: ['team-status.html', 'team.html'] },
      { key: 'owner-recruitment', label: 'Recruitment', icon: IconUsers, page: RecruitmentPipeline, legacy: ['recruitment.html'] },
      { key: 'owner-marketing', label: 'Marketing', icon: IconClipboard, page: MarketingModule, legacy: ['marketing.html'] },
      { key: 'owner-customers', label: 'Customers', icon: IconUsers, page: CustomersModule, legacy: ['customers.html'] },
      { key: 'owner-feedback', label: 'Customer Feedback', icon: IconClipboard, page: CustomerFeedbackBoard, legacy: ['customer-feedback.html', 'feedback.html'] },
      { key: 'owner-challenges', label: 'Challenges', icon: IconClipboard, page: ChallengesBoard, legacy: ['challenges.html'] },
      { key: 'owner-documents', label: 'Documents', icon: IconClipboard, page: DocumentsModule, legacy: ['documents.html'] },
    ]},
    { label: 'Finance', items: [
      { key: 'owner-finance', label: 'Finance Overview', icon: IconWallet, page: FinanceOverview, legacy: ['finance-dashboard.html'] },
      { key: 'owner-bookings', label: 'Bookings', icon: IconClipboard, page: BookingsPipeline, legacy: ['bookings.html'] },
      { key: 'owner-collections', label: 'Collections', icon: IconWallet, page: CollectionsModule, legacy: ['collections.html'] },
      { key: 'owner-expenses', label: 'Expenses', icon: IconWallet, page: ExpensesModule, legacy: ['expenses.html'] },
      { key: 'owner-commissions', label: 'Commissions', icon: IconWallet, page: CommissionsModule, legacy: ['commissions.html'] },
      { key: 'owner-budgets', label: 'Budgets', icon: IconWallet, page: BudgetsModule, legacy: ['budgets.html'] },
    ]},
    { label: 'Management', items: [
      { key: 'owner-targets', label: 'Targets', icon: IconClipboard, page: TargetsModule, legacy: ['targets.html'] },
      { key: 'owner-permissions', label: 'Permissions', icon: IconSettings, page: PermissionsPage, legacy: ['permissions.html'] },
      { key: 'owner-settings', label: 'Company Settings', icon: IconSettings, page: CompanySettingsPage, legacy: ['company-settings.html'] },
      { key: 'owner-audit', label: 'Audit Log', icon: IconClipboard, page: AuditLogPage, legacy: ['audit-log.html'] },
      { key: 'owner-activity', label: 'Activity', icon: IconClipboard, page: ActivityPage, legacy: ['activity.html'] },
      { key: 'owner-alerts', label: 'Alerts', icon: IconClipboard, page: AlertsModule, legacy: ['alerts.html'] },
      { key: 'owner-notifications', label: 'Notifications', icon: IconClipboard, page: NotificationsCentre, legacy: ['notifications.html'] },
      { key: 'owner-messages', label: 'Messages', icon: IconClipboard, page: MessagesModule, legacy: ['messages.html'] },
    ]},
  ],
  'manager-hr': [
    { label: 'Overview', items: [
      { key: 'mgr-overview', label: 'Team Command Centre', icon: IconDashboard, page: ManagerDashboard, legacy: ['manager-dashboard.html', 'hr-dashboard.html'] },
    ]},
    { label: 'Team & Workflow', items: [
      { key: 'mgr-directory', label: 'Employee Management', icon: IconUsers, page: EmployeeDirectoryManager, legacy: ['employee-directory.html', 'employee-detail.html'] },
      { key: 'mgr-org-chart', label: 'Organization Structure', icon: IconUsers, page: OrgChartPage, legacy: ['org-chart.html'] },
      { key: 'mgr-assign', label: 'Task Assignment', icon: IconKanban, page: TaskAssignmentPage, legacy: ['assign-task.html'] },
      { key: 'mgr-verify', label: 'Work Verification', icon: IconBadge, page: WorkVerificationPage, legacy: ['verify-work.html', 'verify.html'] },
      { key: 'mgr-daily-verify', label: 'Daily Report Verification', icon: IconFile, page: DailyReportVerificationPage, legacy: ['daily-report.html'] },
      { key: 'mgr-attendance', label: 'Team Attendance', icon: IconCalendar, page: TeamAttendancePage, legacy: ['attendance.html'] },
      { key: 'mgr-attendance-corrections', label: 'Attendance Corrections', icon: IconCalendar, page: AttendanceCorrectionsPage, legacy: ['attendance.html'] },
      { key: 'mgr-approvals', label: 'Approvals', icon: IconClipboard, page: ApprovalsPage, legacy: ['approval-centre.html'] },
      { key: 'mgr-leave', label: 'Leave Requests', icon: IconClipboard, page: LeaveRequestsModule, legacy: ['leave.html'] },
    ]},
    { label: 'Sales & CRM', items: [
      { key: 'mgr-leads', label: 'My Leads', icon: IconKanban, page: LeadsPipeline, legacy: ['my-leads.html'], visibleFor: ['manager'] },
      { key: 'mgr-visits', label: 'Site Visits', icon: IconBriefcase, page: SiteVisitsModule, legacy: ['site-visits.html'], visibleFor: ['manager'] },
    ]},
    { label: 'HR', items: [
      { key: 'hr-recruitment', label: 'Recruitment', icon: IconUsers, page: RecruitmentPipeline, legacy: ['recruitment.html'], visibleFor: ['hr'] },
      { key: 'hr-allowance', label: 'Allowance', icon: IconWallet, page: AllowanceModule, legacy: ['allowance.html'], visibleFor: ['hr'] },
    ]},
  ],
  employee: [
    { label: 'Overview', items: [
      { key: 'emp-overview', label: 'My Dashboard', icon: IconDashboard, page: EmployeeDashboard, legacy: ['employee-dashboard.html'] },
    ]},
    { label: 'Work', items: [
      { key: 'emp-today', label: 'Today’s Work', icon: IconClipboard, page: TodayWorkModule, legacy: ['today-work.html'] },
      { key: 'emp-tasks', label: 'My Tasks', icon: IconKanban, page: MyTasksPage, legacy: ['tasks.html', 'planned.html'] },
      { key: 'emp-daily-report', label: 'Daily Report', icon: IconFile, page: MyDailyReportPage, legacy: ['daily-report.html'] },
      { key: 'emp-attendance', label: 'Attendance', icon: IconCalendar, page: CheckInOutPage, legacy: ['attendance.html', 'check-in.html'] },
      { key: 'emp-task-time', label: 'Task Time', icon: IconClipboard, page: TaskTimeModule, legacy: ['task-time.html'] },
      { key: 'emp-daily-log', label: 'Daily Log', icon: IconFile, page: DailyLogModule, legacy: ['daily-log.html'] },
      { key: 'emp-performance', label: 'Performance', icon: IconClipboard, page: PerformancePage, legacy: ['performance.html'] },
    ]},
    { label: 'Me', items: [
      { key: 'emp-profile', label: 'My Profile', icon: IconUsers, page: EmployeeProfilePage, legacy: ['my-profile.html'] },
      { key: 'emp-challenges', label: 'Challenges', icon: IconClipboard, page: ChallengesModule, legacy: ['challenges.html'] },
      { key: 'emp-ideas', label: 'Ideas', icon: IconClipboard, page: IdeasModule, legacy: ['ideas.html'] },
      { key: 'emp-feedback', label: 'Customer Feedback', icon: IconClipboard, page: CustomerFeedbackModule, legacy: ['customer-feedback.html', 'feedback.html'] },
      { key: 'emp-allowance', label: 'Allowance', icon: IconWallet, page: AllowanceModule, legacy: ['allowance.html'] },
    ]},
  ],
};

// Distinct, recognisable icons per page (presentation only — the page
// registry above is unchanged).
const KEY_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  'owner-overview': L.LayoutDashboard, 'owner-daily-reports': L.FileText, 'owner-task-reports': L.BadgeCheck,
  'owner-org-chart': L.Network, 'owner-attendance': L.CalendarCheck, 'owner-leads': L.Target,
  'owner-staffing': L.UsersRound, 'owner-visits': L.MapPin, 'owner-followups': L.PhoneCall,
  'owner-sales': L.ChartLine, 'owner-projects': L.FolderKanban, 'owner-inventory': L.Boxes,
  'owner-team-access': L.ShieldCheck, 'owner-directory': L.Contact, 'owner-team-status': L.Activity,
  'owner-recruitment': L.UserPlus, 'owner-marketing': L.Megaphone, 'owner-customers': L.Handshake,
  'owner-feedback': L.MessageSquareQuote, 'owner-challenges': L.Flag, 'owner-documents': L.FolderOpen,
  'owner-finance': L.Landmark, 'owner-bookings': L.Receipt, 'owner-collections': L.Wallet,
  'owner-expenses': L.CreditCard, 'owner-commissions': L.Percent, 'owner-budgets': L.PiggyBank,
  'owner-targets': L.Crosshair, 'owner-permissions': L.KeyRound, 'owner-settings': L.Settings,
  'owner-audit': L.ScrollText, 'owner-activity': L.History, 'owner-alerts': L.TriangleAlert,
  'owner-notifications': L.Bell, 'owner-messages': L.MessagesSquare,
  'mgr-overview': L.LayoutDashboard, 'mgr-directory': L.Users, 'mgr-org-chart': L.Network,
  'mgr-assign': L.ListTodo, 'mgr-verify': L.BadgeCheck, 'mgr-daily-verify': L.FileCheck,
  'mgr-attendance': L.CalendarCheck, 'mgr-attendance-corrections': L.CalendarClock, 'mgr-approvals': L.Stamp,
  'mgr-leave': L.Plane, 'mgr-leads': L.Target, 'mgr-visits': L.MapPin,
  'hr-recruitment': L.UserPlus, 'hr-allowance': L.Wallet,
  'emp-overview': L.LayoutDashboard, 'emp-today': L.Sunrise, 'emp-tasks': L.ListTodo,
  'emp-daily-report': L.FileText, 'emp-attendance': L.CalendarCheck, 'emp-task-time': L.Timer,
  'emp-daily-log': L.NotebookPen, 'emp-performance': L.Gauge, 'emp-profile': L.CircleUser,
  'emp-challenges': L.Flag, 'emp-ideas': L.Lightbulb, 'emp-feedback': L.MessageSquareQuote,
  'emp-allowance': L.Wallet,
};
export function iconFor(item: NavItem) { return KEY_ICONS[item.key] || item.icon; }

export function visibleGroups(role: Role, subRole: SubRole) {
  return NAV[role]
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.visibleFor || i.visibleFor.includes(subRole)).map((i) => ({ ...i, icon: iconFor(i) })) }))
    .filter((g) => g.items.length > 0);
}

const GROUPS_KEY = 'avenado-os:nav-collapsed-groups';

const PORTAL_NAME: Record<Role, string> = { owner: 'Owner', 'manager-hr': 'Manager / HR', employee: 'Employee' };

export function Sidebar({
  role, subRole, onSubRoleChange, collapsed, onToggle, active, onSelect, mobileOpen, onCloseMobile,
}: {
  role: Role;
  subRole: SubRole;
  onSubRoleChange: (s: SubRole) => void;
  collapsed: boolean;
  onToggle: () => void;
  active: string;
  onSelect: (key: string) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const groups = visibleGroups(role, subRole);
  const [closedGroups, setClosedGroups] = useState<string[]>([]);
  useEffect(() => {
    try { setClosedGroups(JSON.parse(localStorage.getItem(GROUPS_KEY) || '[]')); } catch { /* ignore */ }
  }, []);
  const toggleGroup = (label: string) => {
    setClosedGroups((prev) => {
      const next = prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label];
      try { localStorage.setItem(GROUPS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };
  const isCollapsed = collapsed && !mobileOpen;
  const portalSub = role === 'manager-hr' ? (subRole === 'hr' ? 'HR portal' : 'Manager portal') : `${PORTAL_NAME[role]} portal`;

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const btn = (
      <button
        key={item.key}
        type="button"
        className={`sidebar-item${active === item.key ? ' active' : ''}`}
        aria-current={active === item.key ? 'page' : undefined}
        aria-label={isCollapsed ? item.label : undefined}
        onClick={() => { onSelect(item.key); onCloseMobile(); }}
      >
        <Icon size={17} />
        {!isCollapsed && <span>{item.label}</span>}
      </button>
    );
    if (!isCollapsed) return btn;
    return (
      <Tooltip key={item.key}>
        <TooltipTrigger asChild>{btn}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>{item.label}</TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={150}>
      {mobileOpen && <div className="drawer-overlay" style={{ zIndex: 55 }} onClick={onCloseMobile} />}
      <aside className={`sidebar${isCollapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`} aria-label="Main navigation">
        <div className="sidebar-brand" style={isCollapsed ? { justifyContent: 'center', padding: 0 } : undefined}>
          <div className="sidebar-brand-mark"><IconBuilding size={17} /></div>
          {!isCollapsed && (
            <div style={{ minWidth: 0 }}>
              <div className="sidebar-brand-name">Avenado OS</div>
              <div className="sidebar-brand-sub">{portalSub}</div>
            </div>
          )}
        </div>

        <nav className="sidebar-scroll">
          {/* Manager/HR share one portal, distinguished in-dashboard by sub_role —
              fixed by your real account now (not a switch: a real Manager account
              can't self-promote into the HR view, or the reverse). */}
          {role === 'manager-hr' && !isCollapsed && (
            <div className="sidebar-segment" role="group" aria-label="Portal view" style={{ pointerEvents: 'none' }}>
              <button className={subRole === 'manager' ? 'active' : ''} tabIndex={-1}>Manager</button>
              <button className={subRole === 'hr' ? 'active' : ''} tabIndex={-1}>HR</button>
            </div>
          )}
          {groups.map((g, gi) => {
            const isOverview = g.label === 'Overview';
            const open = isCollapsed || isOverview || !closedGroups.includes(g.label) || g.items.some((i) => i.key === active);
            return (
              <div key={g.label} className="sidebar-group">
                {isCollapsed ? (gi > 0 && <div className="sidebar-divider" />) : !isOverview && (
                  <button type="button" className="sidebar-group-label" data-open={open} aria-expanded={open} onClick={() => toggleGroup(g.label)}>
                    {g.label}
                    <IconChevronDown size={13} />
                  </button>
                )}
                {open && g.items.map(renderItem)}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <button type="button" className="sidebar-item" onClick={onToggle} aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {isCollapsed ? <IconChevronRight size={17} /> : <IconChevronLeft size={17} />}
            {!isCollapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}

export { NAV };
