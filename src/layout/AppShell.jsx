import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Activity, Route as RouteIcon, Settings,
  Bus as VehicleIcon, MapPin, UserCog, LogOut, Inbox, Code, ClipboardList,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useEnrollmentRequestCount } from '@/hooks/use-enrollment-requests';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip, TooltipProvider, TooltipTrigger, TooltipContent,
} from '@/components/ui/tooltip';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Topbar } from './Topbar';
import { SandboxBanner } from './SandboxBanner';

const SIDEBAR_KEY = 'webadmin-sidebar-collapsed';

export const SUPER_ADMIN_NAV = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Managers', path: '/managers', icon: Users },
  { label: 'Operations', path: '/operations', icon: Activity },
  { label: 'Routes', path: '/routes', icon: RouteIcon },
  { label: 'Enrollment form', path: '/enrollment-form', icon: ClipboardList },
  { label: 'Settings', path: '/settings', icon: Settings },
  // Compiled out of production builds — Developer Mode is dev-only by construction.
  ...(import.meta.env.DEV ? [{ label: 'Developer', path: '/developer', icon: Code }] : []),
];

export const MANAGER_NAV = [
  { label: 'Overview', path: '/manager/dashboard', icon: LayoutDashboard },
  { label: 'Vehicles', path: '/manager/vehicles', icon: VehicleIcon },
  { label: 'Live tracking', path: '/manager/tracking', icon: MapPin },
  { label: 'Drivers', path: '/manager/accounts', icon: UserCog },
  { label: 'Requests', path: '/manager/requests', icon: Inbox },
  { label: 'Enrollment form', path: '/manager/enrollment-form', icon: ClipboardList },
  { label: 'Settings', path: '/manager/settings', icon: Settings },
];

function NavItem({ item, active, collapsed, onNavigate, badge = 0 }) {
  const Icon = item.icon;
  const hasBadge = badge > 0;
  // Collapsed leaves no room for a number, so the count becomes a dot on the
  // icon and the tooltip carries the detail.
  const label = hasBadge ? `${item.label} (${badge} pending)` : item.label;

  const link = (
    <Link
      to={item.path}
      onClick={onNavigate}
      aria-label={collapsed || hasBadge ? label : undefined}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex items-center gap-2.5 rounded-lg py-2 text-sm font-medium transition-colors',
        'text-muted-foreground hover:bg-surface-muted hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        collapsed ? 'justify-center px-2' : 'px-3',
        active && !collapsed && 'border-l-2 border-primary bg-primary/10 text-primary pl-[10px]',
        active && collapsed && 'bg-primary/10 text-primary',
      )}
    >
      <span className="relative shrink-0">
        <Icon className="h-5 w-5" />
        {hasBadge && collapsed && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary ring-2 ring-surface"
          />
        )}
      </span>
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!collapsed && hasBadge && (
        <span
          aria-hidden="true"
          className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold leading-none text-primary-foreground"
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

function SidebarNav({ navItems, location, collapsed, onLogout, onNavigate, badges = {} }) {
  return (
    <>
      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {navItems.map((item) => (
          <NavItem
            key={item.path}
            item={item}
            active={location.pathname.startsWith(item.path)}
            collapsed={collapsed}
            onNavigate={onNavigate}
            badge={badges[item.path] || 0}
          />
        ))}
      </nav>

      <div className={cn('border-t border-border p-2', collapsed && 'flex justify-center')}>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onLogout}
                aria-label="Sign out"
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Sign out</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="ghost"
            onClick={onLogout}
            className="w-full justify-start gap-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </Button>
        )}
      </div>
    </>
  );
}

export function AppShell({ user, onLogout, onRefresh }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const location = useLocation();

  const isSuperAdmin = user?.role === 'super-admin';
  const navItems = isSuperAdmin ? SUPER_ADMIN_NAV : MANAGER_NAV;
  const wordmark = isSuperAdmin ? 'TRACKME ADMIN' : 'TRACKME MGR';

  // Pending enrolment requests waiting on this manager. Super-admins own no
  // drivers, so the call is skipped for them entirely.
  const { data: pendingEnrollments = 0 } = useEnrollmentRequestCount({ enabled: !isSuperAdmin });
  const navBadges = { '/manager/requests': pendingEnrollments };

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(SIDEBAR_KEY, String(next)); } catch { /* storage unavailable */ }
      return next;
    });
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-background p-[14px] gap-3">

        {/* Desktop sidebar card */}
        <aside
          aria-label="Sidebar"
          className={cn(
            'hidden md:flex flex-col bg-surface border border-border rounded-2xl shadow-float shrink-0 overflow-hidden transition-all duration-200',
            collapsed ? 'w-14' : 'w-56',
          )}
        >
          <div className="flex items-center h-12 border-b border-border px-3 gap-2 shrink-0">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground text-xs font-bold font-heading">T</span>
            </div>
            {!collapsed && (
              <span className="font-heading text-sm font-semibold text-foreground truncate">
                {wordmark}
              </span>
            )}
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="ml-auto h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-colors"
            >
              {collapsed
                ? <ChevronRight className="h-3.5 w-3.5" />
                : <ChevronLeft className="h-3.5 w-3.5" />}
            </button>
          </div>

          <SidebarNav
            navItems={navItems}
            location={location}
            collapsed={collapsed}
            onLogout={onLogout}
            onNavigate={undefined}
            badges={navBadges}
          />
        </aside>

        {/* Mobile nav sheet: only mount content when open (avoids duplicate nav in JSDOM) */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          {mobileOpen && (
            <SheetContent side="left" className="w-56 p-0 flex flex-col">
              <div className="flex items-center h-12 border-b border-border px-3 gap-2 shrink-0">
                <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground text-xs font-bold font-heading">T</span>
                </div>
                <span className="font-heading text-sm font-semibold text-foreground truncate">
                  {wordmark}
                </span>
              </div>
              <SidebarNav
                navItems={navItems}
                location={location}
                collapsed={false}
                onLogout={() => { setMobileOpen(false); onLogout(); }}
                onNavigate={() => setMobileOpen(false)}
                badges={navBadges}
              />
            </SheetContent>
          )}
        </Sheet>

        {/* Content card */}
        <div className="flex-1 flex flex-col bg-surface border border-border rounded-2xl shadow-float overflow-hidden min-w-0">
          <SandboxBanner />
          <Topbar
            user={user}
            navItems={navItems}
            onLogout={onLogout}
            onRefresh={onRefresh}
            onMobileMenuOpen={() => setMobileOpen(true)}
          />

          <main className="flex-1 overflow-y-auto">
            <div className="max-w-screen-2xl mx-auto px-6 py-6">
              <Outlet context={{ user }} />
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
