import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, Button, IconButton, Avatar, Breadcrumbs, Link, Divider, useTheme } from '@mui/material';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import PrecisionManufacturingRoundedIcon from '@mui/icons-material/PrecisionManufacturingRounded';
import RouteRoundedIcon from '@mui/icons-material/RouteRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { alpha } from '@mui/material/styles';
import { useColorMode } from '../theme/ColorMode';

const drawerWidth = 260;

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
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { mode, toggleColorMode } = useColorMode();

  const activeLabel = navItems.find(i => location.pathname.startsWith(i.path))?.label || 'Dashboard';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.palette.background.default }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth - 24,
            boxSizing: 'border-box',
            backgroundColor: theme.palette.background.paper,
            borderRight: 'none',
            color: theme.palette.text.primary,
            padding: '24px 0',
            margin: '1.5rem 0 1.5rem 1.5rem',
            height: 'calc(100vh - 3rem)',
            borderRadius: '1rem',
            boxShadow: '0 4px 6px rgba(0,0,0,0.02), 0 2px 4px rgba(0,0,0,0.02)',
            overflowX: 'hidden',
            overflowY: 'auto',
            position: 'fixed',
            transition: 'all 0.3s ease',
          },
        }}
      >
        <Toolbar sx={{ minHeight: '70px !important', px: 3, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
              background: theme.custom.gradients.primary,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Typography variant="h6" color="white" sx={{ fontSize: 14, fontWeight: 900 }}>T</Typography>
            </Box>
            <Typography variant="h6" sx={{ color: theme.palette.text.primary, fontSize: 13, fontWeight: 800, letterSpacing: 0.5, fontFamily: 'Uber Move' }}>TRACKME ADMIN</Typography>
          </Box>
        </Toolbar>

        <Divider sx={{ mx: 2, mb: 2, opacity: 0.1 }} />

        <List sx={{ px: 2, flexGrow: 1 }}>
          {navItems.map((item) => {
            const active = location.pathname.startsWith(item.path);
            return (
              <ListItemButton
                key={item.path}
                selected={active}
                onClick={() => navigate(item.path)}
                sx={{
                  mb: 0.8,
                  borderRadius: '12px',
                  py: 1.2,
                  px: 2,
                  '&.Mui-selected': {
                    backgroundColor: theme.palette.background.paper,
                    backgroundImage: theme.custom.gradients.primary,
                    color: theme.palette.primary.contrastText,
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
                    '&:hover': { backgroundColor: theme.palette.primary.dark },
                  },
                  '& .MuiListItemIcon-root': {
                    minWidth: 32,
                    height: 32,
                    width: 32,
                    borderRadius: '8px',
                    backgroundColor: active ? 'transparent' : theme.palette.background.paper,
                    color: active ? theme.palette.primary.contrastText : theme.palette.text.primary,
                    boxShadow: active ? 'none' : '0 2px 4px rgba(0,0,0,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 2,
                  },
                }}
              >
                <ListItemIcon sx={{ fontSize: 18 }}>{item.icon}</ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: active ? 700 : 500 }}
                />
              </ListItemButton>
            );
          })}

          <Typography variant="caption" sx={{ px: 2, mt: 3, mb: 1.5, display: 'block', color: theme.palette.text.primary, fontWeight: 800, textTransform: 'uppercase', fontSize: '0.65rem', opacity: 0.6 }}>
            Account Pages
          </Typography>

          {accountItems.map((item) => (
            <ListItemButton
              key={item.label}
              onClick={() => navigate(item.path)}
              sx={{
                mb: 0.5,
                borderRadius: '12px',
                py: 1,
                px: 2,
                '& .MuiListItemIcon-root': {
                  minWidth: 32,
                  height: 32,
                  width: 32,
                  borderRadius: '8px',
                  backgroundColor: theme.palette.background.paper,
                  color: theme.palette.text.primary,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 2,
                },
              }}
            >
              <ListItemIcon sx={{ fontSize: 18 }}>{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 500 }}
              />
            </ListItemButton>
          ))}
        </List>

        <Box sx={{ p: 3 }}>
          <Button
            startIcon={<LogoutRoundedIcon />}
            variant="contained"
            sx={{
              background: theme.custom.gradients.primary,
              color: theme.palette.primary.contrastText,
              fontSize: '0.7rem',
              fontWeight: 700,
              borderRadius: 2,
              py: 1.2,
              boxShadow: '0 4px 7px -1px rgba(0,0,0,0.11), 0 2px 4px -1px rgba(0,0,0,0.07)',
            }}
            fullWidth
            onClick={onLogout}
          >
            Sign Out
          </Button>
        </Box>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          p: { xs: 2.5, md: 3 },
          display: 'flex',
          flexDirection: 'column',
          overflowX: 'hidden',
        }}
      >
        {/* Top Navbar */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4,
          mt: 1.5,
          p: 1.2,
          px: 3,
          backgroundColor: alpha(theme.palette.background.paper, 0.8),
          backdropFilter: 'blur(10px)',
          borderRadius: 3,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
          border: `1px solid ${alpha(theme.palette.background.paper, 0.8)}`,
          position: 'sticky',
          top: '1.5rem',
          zIndex: 1100,
        }}>
          <Box>
            <Breadcrumbs sx={{ mb: 0, '& .MuiBreadcrumbs-separator': { mx: 1, fontSize: 10 } }}>
              <Link underline="hover" sx={{ fontSize: 12, color: theme.palette.text.primary, opacity: 0.5, display: 'flex', alignItems: 'center' }}>
                <Box component="span" sx={{ mr: 0.5 }}>Pages</Box>
              </Link>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: theme.palette.text.primary }}>{activeLabel}</Typography>
            </Breadcrumbs>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: 16, color: theme.palette.text.primary, fontFamily: 'Uber Move' }}>{activeLabel}</Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ position: 'relative', mr: 2, display: { xs: 'none', lg: 'block' } }}>
              <SearchRoundedIcon sx={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: theme.palette.text.secondary }} />
              <input
                placeholder="Type here..."
                style={{
                  padding: '10px 12px 10px 40px',
                  borderRadius: 10,
                  border: `1px solid ${theme.custom.border}`,
                  backgroundColor: theme.palette.background.paper,
                  fontFamily: 'inherit',
                  fontSize: 13,
                  outline: 'none',
                  width: 180,
                  color: theme.palette.text.primary,
                }}
              />
            </Box>
            <IconButton onClick={onRefresh} size="small" sx={{ color: theme.palette.text.secondary }}><RefreshRoundedIcon sx={{ fontSize: 18 }} /></IconButton>
            <IconButton
              onClick={toggleColorMode}
              size="small"
              aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              sx={{ color: theme.palette.text.secondary }}
            >
              {mode === 'dark' ? <LightModeRoundedIcon sx={{ fontSize: 18 }} /> : <DarkModeRoundedIcon sx={{ fontSize: 18 }} />}
            </IconButton>
            <IconButton size="small" sx={{ color: theme.palette.text.secondary }}><SettingsRoundedIcon sx={{ fontSize: 18 }} /></IconButton>
            <IconButton size="small" sx={{ color: theme.palette.text.secondary }}><NotificationsNoneRoundedIcon sx={{ fontSize: 18 }} /></IconButton>
            <Avatar sx={{ width: 32, height: 32, ml: 1, backgroundColor: theme.palette.primary.main, fontSize: 12, fontWeight: 800 }}>
              {user?.email?.[0].toUpperCase() || 'A'}
            </Avatar>
          </Box>
        </Box>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          style={{ flexGrow: 1 }}
        >
          <Outlet />
        </motion.div>
      </Box>
    </Box>
  );
}

