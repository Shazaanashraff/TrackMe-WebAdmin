import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Activity, Route as RouteIcon, Settings,
  Bus as VehicleIcon, UserCog, LogOut,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip, TooltipProvider, TooltipTrigger, TooltipContent,
} from '@/components/ui/tooltip';
import { Sheet, SheetContent } from '@/components/ui/sheet';
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
  { label: 'Vehicles', path: '/manager/vehicles', icon: VehicleIcon },
  { label: 'Drivers', path: '/manager/accounts', icon: UserCog },
  { label: 'Settings', path: '/manager/settings', icon: Settings },
];

function NavItem({ item, active, collapsed, onNavigate }) {
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
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

function SidebarNav({ navItems, location, collapsed, onLogout, onNavigate }) {
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
