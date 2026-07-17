import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import DirectionsBusRoundedIcon from '@mui/icons-material/DirectionsBusRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import RouteRoundedIcon from '@mui/icons-material/RouteRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from './AppShell';
import { adminApi } from '../api';

const baseNavItems = [
  { label: 'Overview', path: '/manager/dashboard', icon: <DashboardRoundedIcon /> },
  { label: 'Buses', path: '/manager/buses', icon: <DirectionsBusRoundedIcon /> },
  { label: 'Live Tracking', path: '/manager/tracking', icon: <MapRoundedIcon /> },
  { label: 'Drivers', path: '/manager/accounts', icon: <BadgeRoundedIcon /> },
  { label: 'Route Approvals', path: '/manager/route-approvals', icon: <RouteRoundedIcon />, badgeKey: 'pendingRoutes' },
  { label: 'Private Routes', path: '/manager/private-routes', icon: <LockRoundedIcon /> },
];

const accountItems = [
  { label: 'Profile', path: '/manager/settings', icon: <PersonRoundedIcon /> },
];

export function ManagerLayout({ user, onLogout, onRefresh }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingRoutesCount, setPendingRoutesCount] = useState(0);

  const loadPendingRoutesCount = useCallback(async () => {
    try {
      const [routesRes, changeRequestsRes] = await Promise.all([
        adminApi.getManagerCustomRoutes({ status: 'PENDING_NAMING' }),
        adminApi.getRouteChangeRequests({ status: 'PENDING' })
      ]);
      const recorded = (routesRes.data || []).filter((route) => route.pathPolyline);
      setPendingRoutesCount(recorded.length + (changeRequestsRes.data || []).length);
    } catch {
      // Badge is a nice-to-have; never break the layout if this call fails.
    }
  }, []);

  useEffect(() => {
    loadPendingRoutesCount();
    const interval = setInterval(loadPendingRoutesCount, 60000);
    return () => clearInterval(interval);
  }, [loadPendingRoutesCount, location.pathname]);

  const navItems = useMemo(
    () => baseNavItems.map((item) => (
      item.badgeKey === 'pendingRoutes' ? { ...item, badge: pendingRoutesCount } : item
    )),
    [pendingRoutesCount]
  );

  return (
    <AppShell
      brandLabel="Manager"
      breadcrumbRoot="Manager"
      navItems={navItems}
      accountItems={accountItems}
      user={user}
      onLogout={onLogout}
      onRefresh={onRefresh}
      notifications={{
        count: pendingRoutesCount,
        onClick: () => navigate('/manager/route-approvals'),
        testId: 'notifications-bell',
      }}
    />
  );
}
