import { useMemo, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Activity, Route as RouteIcon, Settings,
  Bus, MapPin, UserCog, GitPullRequest, Lock, LogOut,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip, TooltipProvider, TooltipTrigger, TooltipContent,
} from '@/components/ui/tooltip';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  useManagerCustomRoutes,
  useRouteChangeRequests,
} from '@/hooks/use-route-approvals';
import { Topbar } from './Topbar';

const SIDEBAR_KEY = 'webadmin-sidebar-collapsed';

export const SUPER_ADMIN_NAV = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Managers', path: '/managers', icon: Users },
  { label: 'Operations', path: '/operations', icon: Activity },
  { label: 'Routes', path: '/routes', icon: RouteIcon },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export const MANAGER_NAV = [
  { label: 'Overview', path: '/manager/dashboard', icon: LayoutDashboard },
  { label: 'Vehicles', path: '/manager/buses', icon: Bus },
  { label: 'Live Tracking', path: '/manager/tracking', icon: MapPin },
  { label: 'Drivers', path: '/manager/accounts', icon: UserCog },
  { label: 'Route Approvals', path: '/manager/route-approvals', icon: GitPullRequest, hasBadge: true },
  { label: 'Private Routes', path: '/manager/private-routes', icon: Lock },
  { label: 'Settings', path: '/manager/settings', icon: Settings },
];

function NavItem({ item, active, collapsed, badge, onNavigate }) {
  const Icon = item.icon;

  const link = (
    <Link
      to={item.path}
      onClick={onNavigate}
      aria-label={collapsed ? item.label : undefined}
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
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {badge > 0 && (
            <Badge variant="danger" className="ml-auto h-4 px-1.5 py-0 text-[10px]">
              {badge > 99 ? '99+' : badge}
            </Badge>
          )}
        </>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2">
          <span>{item.label}</span>
          {badge > 0 && (
            <Badge variant="danger" className="h-4 px-1.5 py-0 text-[10px]">{badge}</Badge>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

function SidebarNav({ navItems, location, collapsed, onLogout, onNavigate, pendingCount }) {
  return (
    <>
      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {navItems.map((item) => (
          <NavItem
            key={item.path}
            item={item}
            active={location.pathname.startsWith(item.path)}
            collapsed={collapsed}
            badge={item.hasBadge ? pendingCount : 0}
            onNavigate={onNavigate}
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
  const isManager = user?.role === 'admin';
  const navItems = isSuperAdmin ? SUPER_ADMIN_NAV : MANAGER_NAV;
  const wordmark = isSuperAdmin ? 'TRACKME ADMIN' : 'TRACKME MGR';

  const routesQ = useManagerCustomRoutes({ status: 'PENDING_NAMING' }, { enabled: isManager });
  const changesQ = useRouteChangeRequests({ status: 'PENDING' }, { enabled: isManager });

  const pendingCount = useMemo(() => {
    if (!isManager) return 0;
    const routes = routesQ.data?.data || [];
    const changes = changesQ.data?.data || [];
    return routes.filter((r) => r.pathPolyline).length + changes.length;
  }, [isManager, routesQ.data, changesQ.data]);

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
            pendingCount={pendingCount}
          />
        </aside>

        {/* Mobile nav sheet — only mount content when open (avoids duplicate nav in JSDOM) */}
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
                pendingCount={pendingCount}
              />
            </SheetContent>
          )}
        </Sheet>

        {/* Content card */}
        <div className="flex-1 flex flex-col bg-surface border border-border rounded-2xl shadow-float overflow-hidden min-w-0">
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
