import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import PrecisionManufacturingRoundedIcon from '@mui/icons-material/PrecisionManufacturingRounded';
import RouteRoundedIcon from '@mui/icons-material/RouteRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import { AppShell } from './AppShell';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: <DashboardRoundedIcon /> },
  { label: 'Managers', path: '/managers', icon: <GroupRoundedIcon /> },
  { label: 'Operations', path: '/operations', icon: <PrecisionManufacturingRoundedIcon /> },
  { label: 'Routes', path: '/routes', icon: <RouteRoundedIcon /> },
];

const accountItems = [
  { label: 'Profile', path: '/settings', icon: <PersonRoundedIcon /> },
];

export function SuperAdminLayout({ user, onLogout, onRefresh }) {
  return (
    <AppShell
      brandLabel="Admin"
      breadcrumbRoot="Pages"
      navItems={navItems}
      accountItems={accountItems}
      user={user}
      onLogout={onLogout}
      onRefresh={onRefresh}
    />
  );
}
