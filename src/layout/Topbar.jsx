import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useIsFetching } from '@tanstack/react-query';
import {
  LogOut, Menu, Moon, RefreshCw, Search, Sun, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useColorMode } from '@/theme/ColorMode';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  CommandDialog, CommandEmpty, CommandGroup,
  CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';

const ROUTE_LABELS = {
  '/dashboard': 'Dashboard',
  '/managers': 'Managers',
  '/operations': 'Operations',
  '/routes': 'Routes',
  '/settings': 'Settings',
  '/manager/dashboard': 'Overview',
  '/manager/vehicles': 'Vehicles',
  '/manager/tracking': 'Live Tracking',
  '/manager/accounts': 'Drivers',
  '/manager/route-approvals': 'Route Approvals',
  '/manager/private-routes': 'Private Routes',
  '/manager/settings': 'Settings',
};

function pageLabel(pathname) {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
  const last = pathname.split('/').filter(Boolean).at(-1) ?? '';
  return last.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Topbar({ user, navItems, onLogout, onRefresh, onMobileMenuOpen }) {
  const { mode, toggleColorMode } = useColorMode();
  const navigate = useNavigate();
  const location = useLocation();
  const isFetching = useIsFetching();
  const [commandOpen, setCommandOpen] = useState(false);

  const isSuperAdmin = user?.role === 'super-admin';
  const rootHref = isSuperAdmin ? '/dashboard' : '/manager/dashboard';
  const rootLabel = isSuperAdmin ? 'Admin' : 'Manager';
  const currentLabel = pageLabel(location.pathname);
  const initials = (user?.name || user?.email || 'U')[0].toUpperCase();
  const roleLabel = isSuperAdmin ? 'Super Admin' : 'Manager';

  useEffect(() => {
    const handleKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <header className="h-14 border-b border-border flex items-center gap-2 px-4 shrink-0">
      {/* Mobile hamburger (< md) */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMobileMenuOpen}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={rootHref} className="text-muted-foreground hover:text-foreground transition-colors">
                {rootLabel}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{currentLabel}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex-1" />

      {/* ⌘K trigger */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCommandOpen(true)}
        aria-label="Open command menu"
        className="hidden md:flex h-8 gap-2 text-muted-foreground text-sm px-3 font-normal"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Search…</span>
        <kbd className="ml-1 pointer-events-none inline-flex h-4 select-none items-center gap-1 rounded border bg-surface-muted px-1 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      {/* Refresh */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onRefresh}
        aria-label="Refresh data"
      >
        <RefreshCw className={cn('h-4 w-4', isFetching > 0 && 'animate-spin')} />
      </Button>

      {/* Theme toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleColorMode}
        aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {mode === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      {/* User dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 px-2 h-8"
            aria-label="User menu"
          >
            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="font-normal py-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium truncate">{user?.name || user?.email}</span>
              <span className="text-xs text-muted-foreground">{roleLabel}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={onLogout}
            className="text-destructive focus:text-destructive focus:bg-destructive/10 gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Command dialog */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Search pages…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigate">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.path}
                  value={item.label}
                  onSelect={() => {
                    navigate(item.path);
                    setCommandOpen(false);
                  }}
                >
                  <Icon />
                  {item.label}
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </header>
  );
}
