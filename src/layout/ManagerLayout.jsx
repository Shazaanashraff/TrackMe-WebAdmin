import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, Button, IconButton, Avatar, Breadcrumbs, Link, Divider } from '@mui/material';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import DirectionsBusRoundedIcon from '@mui/icons-material/DirectionsBusRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const drawerWidth = 260;

const navItems = [
  { label: 'Overview', path: '/manager/dashboard', icon: <DashboardRoundedIcon /> },
  { label: 'Buses', path: '/manager/buses', icon: <DirectionsBusRoundedIcon /> },
  { label: 'Live Tracking', path: '/manager/tracking', icon: <MapRoundedIcon /> },
  { label: 'Drivers', path: '/manager/accounts', icon: <BadgeRoundedIcon /> },
];

const accountItems = [
  { label: 'Profile', path: '/manager/settings', icon: <PersonRoundedIcon /> },
];

export function ManagerLayout({ user, onLogout, onRefresh }) {
  const location = useLocation();
  const navigate = useNavigate();

  const activeLabel = navItems.find(i => location.pathname.startsWith(i.path))?.label || 'Overview';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%', backgroundColor: '#f8f9fa' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth - 24,
            boxSizing: 'border-box',
            backgroundColor: '#ffffff',
            borderRight: 'none',
            color: '#2f2f2f',
            padding: '24px 0',
            margin: '1.5rem 0 1.5rem 1.5rem',
            height: 'calc(100vh - 3rem)',
            borderRadius: '1rem',
            boxShadow: '0 4px 6px rgba(0,0,0,0.02), 0 2px 4px rgba(0,0,0,0.02)',
            overflowX: 'hidden',
            overflowY: 'auto',
            position: 'fixed',
            transition: 'all 0.3s ease'
          }
        }}
      >
        <Toolbar sx={{ minHeight: '70px !important', px: 3, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ 
              width: 32, 
              height: 32, 
              borderRadius: 1, 
              background: 'linear-gradient(310deg, #161616 0%, #4a4a4a 100%)',
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center' 
            }}>
               <Typography variant="h6" color="white" sx={{ fontSize: 14, fontWeight: 900 }}>M</Typography>
            </Box>
            <Typography variant="h6" sx={{ color: '#2f2f2f', fontSize: 13, fontWeight: 800, letterSpacing: 0.5, fontFamily: 'Uber Move' }}>ACEBUS MGR</Typography>
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
                    backgroundColor: '#ffffff',
                    backgroundImage: 'linear-gradient(310deg, #161616 0%, #4a4a4a 100%)',
                    color: '#ffffff',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
                    '&:hover': { backgroundColor: '#161616' },
                  },
                  '& .MuiListItemIcon-root': {
                    minWidth: 32,
                    height: 32,
                    width: 32,
                    borderRadius: '8px',
                    backgroundColor: active ? 'transparent' : '#ffffff',
                    color: active ? '#ffffff' : '#2f2f2f',
                    boxShadow: active ? 'none' : '0 2px 4px rgba(0,0,0,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 2
                  }
                }}
              >
                <ListItemIcon sx={{ fontSize: 18 }}>
                   {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.label} 
                  primaryTypographyProps={{ 
                    fontSize: '0.8rem', 
                    fontWeight: active ? 700 : 500,
                  }} 
                />
              </ListItemButton>
            );
          })}

          <Typography variant="caption" sx={{ px: 2, mt: 3, mb: 1.5, display: 'block', color: '#2f2f2f', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.65rem', opacity: 0.6 }}>Account Pages</Typography>
          
          {accountItems.map((item) => {
            const active = location.pathname === item.path;
            return (
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
                    backgroundColor: '#ffffff',
                    color: '#2f2f2f',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 2
                  }
                }}
              >
                <ListItemIcon sx={{ fontSize: 18 }}>
                   {item.icon}
                </ListItemIcon>
                <ListItemText 
                   primary={item.label} 
                   primaryTypographyProps={{ 
                     fontSize: '0.8rem', 
                     fontWeight: 500,
                   }} 
                />
              </ListItemButton>
            );
          })}
        </List>

        <Box sx={{ p: 3 }}>
          <Button 
            startIcon={<LogoutRoundedIcon />} 
            variant="contained" 
            sx={{ 
                background: 'linear-gradient(310deg, #161616 0%, #4a4a4a 100%)',
                color: '#ffffff', 
                fontSize: '0.7rem',
                fontWeight: 700,
                borderRadius: 2,
                py: 1.2,
                boxShadow: '0 4px 7px -1px rgba(0,0,0,0.11), 0 2px 4px -1px rgba(0,0,0,0.07)'
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
          overflowX: 'hidden'
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
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            borderRadius: 3,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.8)',
            position: 'sticky',
            top: '1.5rem',
            zIndex: 1100
        }}>
          <Box>
            <Breadcrumbs sx={{ mb: 0, '& .MuiBreadcrumbs-separator': { mx: 1, fontSize: 10 } }}>
              <Link underline="hover" sx={{ fontSize: 12, color: '#2f2f2f', opacity: 0.5, display: 'flex', alignItems: 'center' }}>
                <Box component="span" sx={{ mr: 0.5 }}>Manager</Box>
              </Link>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#2f2f2f' }}>{activeLabel}</Typography>
            </Breadcrumbs>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: 16, color: '#2f2f2f', fontFamily: 'Uber Move' }}>{activeLabel}</Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ position: 'relative', mr: 2, display: { xs: 'none', lg: 'block' } }}>
               <SearchRoundedIcon sx={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#6b7280' }} />
               <input 
                 placeholder="Type here..." 
                 style={{ 
                   padding: '10px 12px 10px 40px', 
                   borderRadius: 10, 
                   border: '1px solid #d2d6da', 
                   backgroundColor: '#ffffff',
                   fontFamily: 'inherit',
                   fontSize: 13,
                   outline: 'none',
                   width: 180,
                   color: '#495057'
                 }} 
               />
            </Box>
            <IconButton onClick={onRefresh} size="small" sx={{ color: '#6b7280' }}><RefreshRoundedIcon sx={{ fontSize: 18 }} /></IconButton>
            <IconButton size="small" sx={{ color: '#6b7280' }}><SettingsRoundedIcon sx={{ fontSize: 18 }} /></IconButton>
            <IconButton size="small" sx={{ color: '#6b7280' }}><NotificationsNoneRoundedIcon sx={{ fontSize: 18 }} /></IconButton>
            <Avatar sx={{ width: 32, height: 32, ml: 1, backgroundColor: '#2f2f2f', fontSize: 12, fontWeight: 800 }}>{user?.email?.[0].toUpperCase() || 'M'}</Avatar>
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

