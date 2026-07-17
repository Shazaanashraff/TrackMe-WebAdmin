import { useState } from 'react';
import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, Button, IconButton, Avatar, Badge, Breadcrumbs, Link, Divider, Menu, MenuItem, useTheme } from '@mui/material';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const drawerWidth = 260;

/**
 * Shared sidebar + topbar shell for the super-admin and manager portals.
 * `notifications` is opt-in ({ count, onClick, testId? }) — omit it rather than
 * rendering a bell with nowhere real to go.
 */
export function AppShell({ brandLabel, navItems, accountItems, breadcrumbRoot, user, onLogout, onRefresh, notifications }) {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuAnchor, setMenuAnchor] = useState(null);

  const activeItem = [...navItems, ...accountItems]
    .filter((item) => location.pathname.startsWith(item.path))
    .sort((a, b) => b.path.length - a.path.length)[0];
  const activeLabel = activeItem?.label || navItems[0]?.label || '';

  const profilePath = accountItems[0]?.path;
  const menuOpen = Boolean(menuAnchor);

  const handleProfileClick = () => {
    setMenuAnchor(null);
    if (profilePath) navigate(profilePath);
  };

  const handleSignOutClick = () => {
    setMenuAnchor(null);
    onLogout();
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%', backgroundColor: theme.palette.background.default }}>
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
            <Typography variant="h6" sx={{ color: theme.palette.text.primary, fontSize: 13, fontWeight: 800, letterSpacing: 0.5, fontFamily: 'Uber Move' }}>{brandLabel}</Typography>
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
                <ListItemIcon sx={{ fontSize: 18 }}>
                  {item.badge > 0 ? (
                    <Badge badgeContent={item.badge} color="error" overlap="circular">
                      {item.icon}
                    </Badge>
                  ) : item.icon}
                </ListItemIcon>
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
              key={item.path}
              selected={location.pathname === item.path}
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
          zIndex: 1100,
        }}>
          <Box>
            <Breadcrumbs sx={{ mb: 0, '& .MuiBreadcrumbs-separator': { mx: 1, fontSize: 10 } }}>
              <Link underline="hover" sx={{ fontSize: 12, color: theme.palette.text.primary, opacity: 0.5, display: 'flex', alignItems: 'center' }}>
                <Box component="span" sx={{ mr: 0.5 }}>{breadcrumbRoot}</Box>
              </Link>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: theme.palette.text.primary }}>{activeLabel}</Typography>
            </Breadcrumbs>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: 16, color: theme.palette.text.primary, fontFamily: 'Uber Move' }}>{activeLabel}</Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={onRefresh} size="small" sx={{ color: theme.palette.text.secondary }}><RefreshRoundedIcon sx={{ fontSize: 18 }} /></IconButton>
            {notifications ? (
              <IconButton
                onClick={notifications.onClick}
                size="small"
                sx={{ color: theme.palette.text.secondary }}
                data-testid={notifications.testId || 'notifications-bell'}
              >
                <Badge badgeContent={notifications.count} color="error" overlap="circular">
                  <NotificationsNoneRoundedIcon sx={{ fontSize: 18 }} />
                </Badge>
              </IconButton>
            ) : null}
            <IconButton
              size="small"
              onClick={(event) => setMenuAnchor(event.currentTarget)}
              aria-haspopup="true"
              aria-expanded={menuOpen ? 'true' : undefined}
              aria-label="Account menu"
              sx={{ ml: 1 }}
            >
              <Avatar sx={{ width: 32, height: 32, backgroundColor: theme.palette.primary.main, fontSize: 12, fontWeight: 800 }}>
                {user?.email?.[0]?.toUpperCase() || 'A'}
              </Avatar>
            </IconButton>
            <Menu anchorEl={menuAnchor} open={menuOpen} onClose={() => setMenuAnchor(null)}>
              <MenuItem onClick={handleProfileClick} disabled={!profilePath}>
                <ListItemIcon><PersonRoundedIcon fontSize="small" /></ListItemIcon>
                Profile
              </MenuItem>
              <MenuItem onClick={handleSignOutClick}>
                <ListItemIcon><LogoutRoundedIcon fontSize="small" /></ListItemIcon>
                Sign out
              </MenuItem>
            </Menu>
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
