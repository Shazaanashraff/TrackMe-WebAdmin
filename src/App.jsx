import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Alert, Box, CircularProgress, Snackbar, Stack, Typography } from '@mui/material';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordRequestPage } from './pages/ForgotPasswordRequestPage';
import { ForgotPasswordVerifyPage } from './pages/ForgotPasswordVerifyPage';
import { ForgotPasswordResetPage } from './pages/ForgotPasswordResetPage';
import { SuperAdminLayout } from './layout/SuperAdminLayout';
import { ManagerLayout } from './layout/ManagerLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ManagersPage } from './pages/ManagersPage';
import { OperationsPage } from './pages/OperationsPage';
import { RoutesPage } from './pages/RoutesPage';
import { SettingsPage } from './pages/SettingsPage';
import { ManagerDashboardPage } from './pages/ManagerDashboardPage';
import { ManagerBusesPage } from './pages/ManagerBusesPage';
import { ManagerTrackingPage } from './pages/ManagerTrackingPage';
import { ManagerAccountsPage } from './pages/ManagerAccountsPage';
import { ManagerSettingsPage } from './pages/ManagerSettingsPage';
import { adminApi } from './api';
import { clearStoredAuth, readStoredAuth, writeStoredAuth } from './lib/authSession';

function AppLoading() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)' }}>
      <Stack spacing={1.5} alignItems="center">
        <CircularProgress />
        <Typography sx={{ color: '#6b7280', fontWeight: 600 }}>Restoring session...</Typography>
      </Stack>
    </Box>
  );
}

function ProtectedShell({ auth, onLogout, refreshSignal, triggerRefresh }) {
  const authToken = auth?.token || auth?.accessToken;
  const userRole = auth?.user?.role;
  const isSuperAdmin = userRole === 'super-admin';
  const isManager = userRole === 'admin';

  if (!authToken || (!isSuperAdmin && !isManager)) {
    return <Navigate to="/login" replace />;
  }

  if (isSuperAdmin) {
    return (
      <Routes>
        <Route
          element={<SuperAdminLayout user={auth.user} onLogout={onLogout} onRefresh={triggerRefresh} />}
        >
          <Route path="/dashboard" element={<DashboardPage refreshSignal={refreshSignal} />} />
          <Route path="/managers" element={<ManagersPage refreshSignal={refreshSignal} />} />
          <Route path="/operations" element={<OperationsPage refreshSignal={refreshSignal} />} />
          <Route path="/routes" element={<RoutesPage refreshSignal={refreshSignal} />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route
        element={<ManagerLayout user={auth.user} onLogout={onLogout} onRefresh={triggerRefresh} />}
      >
        <Route path="/manager/dashboard" element={<ManagerDashboardPage refreshSignal={refreshSignal} />} />
        <Route path="/manager/buses" element={<ManagerBusesPage refreshSignal={refreshSignal} />} />
        <Route path="/manager/tracking" element={<ManagerTrackingPage refreshSignal={refreshSignal} />} />
        <Route path="/manager/accounts" element={<ManagerAccountsPage refreshSignal={refreshSignal} />} />
        <Route path="/manager/settings" element={<ManagerSettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/manager/dashboard" replace />} />
    </Routes>
  );
}

function LoginShell({ auth, setAuth }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async ({ email, password, rememberMe }) => {
    setLoading(true);
    setError('');
    try {
      const response = await adminApi.login(email, password);
      if (!['super-admin', 'admin'].includes(response?.user?.role)) {
        throw new Error('Access denied. This portal is reserved for authorized TrackMe administrative accounts.');
      }

      const normalizedAuth = writeStoredAuth({
        ...response,
        token: response?.token || response?.accessToken || null,
        accessToken: response?.accessToken || response?.token || null
      }, rememberMe);

      setAuth(normalizedAuth);
      if (response?.user?.role === 'super-admin') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/manager/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  if ((auth?.token || auth?.accessToken) && ['super-admin', 'admin'].includes(auth?.user?.role)) {
    return <Navigate to={auth.user.role === 'super-admin' ? '/dashboard' : '/manager/dashboard'} replace />;
  }

  return (
    <LoginPage
      onLogin={handleLogin}
      loading={loading}
      error={error}
      roleTitle="Sign In"
      roleSubtitle="Secure access for TrackMe manager accounts."
      usernameLabel="Manager Email"
      usernamePlaceholder="manager@trackme.com"
      submitLabel="Sign In"
      onForgotPassword={() => navigate('/forgot-password')}
    />
  );
}

export default function App() {
  const [auth, setAuth] = useState(() => readStoredAuth());
  const [hydrating, setHydrating] = useState(true);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [toast, setToast] = useState('');
  const refreshSignal = refreshCounter;

  useEffect(() => {
    let cancelled = false;

    const restoreAuth = async () => {
      const storedAuth = readStoredAuth();

      if (!storedAuth) {
        if (!cancelled) {
          setAuth(null);
          setHydrating(false);
        }
        return;
      }

      if (!cancelled) {
        setAuth(storedAuth);
      }

      if (storedAuth.refreshToken) {
        try {
          const refreshedAuth = await adminApi.refreshToken(storedAuth.refreshToken);
          const normalizedAuth = writeStoredAuth({
            ...storedAuth,
            ...refreshedAuth,
            token: refreshedAuth?.token || refreshedAuth?.accessToken || null,
            accessToken: refreshedAuth?.accessToken || refreshedAuth?.token || null,
            refreshToken: refreshedAuth?.refreshToken || storedAuth.refreshToken
          }, storedAuth.rememberMe);

          if (!cancelled) {
            setAuth(normalizedAuth);
          }
        } catch {
          clearStoredAuth();
          if (!cancelled) {
            setAuth(null);
          }
        }
      }

      if (!cancelled) {
        setHydrating(false);
      }
    };

    restoreAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = () => {
    clearStoredAuth();
    setAuth(null);
    setToast('Logged out successfully');
  };

  const triggerRefresh = () => {
    setRefreshCounter((prev) => prev + 1);
    setToast('Data refresh triggered');
  };

  return (
    <>
      {hydrating ? <AppLoading /> : null}
      {!hydrating ? (
      <Routes>
        <Route path="/login" element={<LoginShell auth={auth} setAuth={setAuth} />} />
        <Route path="/forgot-password" element={<ForgotPasswordRequestPage />} />
        <Route path="/forgot-password/verify" element={<ForgotPasswordVerifyPage />} />
        <Route path="/forgot-password/reset" element={<ForgotPasswordResetPage />} />
        <Route
          path="/*"
          element={
            <ProtectedShell
              auth={auth}
              onLogout={handleLogout}
              refreshSignal={refreshSignal}
              triggerRefresh={triggerRefresh}
            />
          }
        />
      </Routes>
      ) : null}

      <Snackbar open={Boolean(toast)} autoHideDuration={2200} onClose={() => setToast('')}>
        <Alert severity="info" variant="filled" onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>
    </>
  );
}
