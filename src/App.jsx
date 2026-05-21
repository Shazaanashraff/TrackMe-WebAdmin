import { useMemo, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Snackbar, Alert } from '@mui/material';
import { LoginPage } from './pages/LoginPage';
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

  const handleLogin = async ({ email, password }) => {
    setLoading(true);
    setError('');
    try {
      const response = await adminApi.login(email, password);
      if (!['super-admin', 'admin'].includes(response?.user?.role)) {
        throw new Error('Access denied. This portal is only for superAdmin and manager accounts.');
      }

      const normalizedAuth = {
        ...response,
        token: response?.token || response?.accessToken || null
      };

      localStorage.setItem('admin-auth', JSON.stringify(normalizedAuth));
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
      roleTitle="SuperAdmin / Manager Sign In"
      roleSubtitle="Secure access for software owner and bus organization managers."
      usernameLabel="Username (Email)"
      usernamePlaceholder="manager@company.com"
      submitLabel="Enter Workspace"
    />
  );
}

export default function App() {
  const [auth, setAuth] = useState(() => {
    try {
      const cached = localStorage.getItem('admin-auth');
      if (!cached) return null;
      const parsed = JSON.parse(cached);
      return {
        ...parsed,
        token: parsed?.token || parsed?.accessToken || null
      };
    } catch {
      return null;
    }
  });
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [toast, setToast] = useState('');

  const refreshSignal = useMemo(() => refreshCounter, [refreshCounter]);

  const handleLogout = () => {
    localStorage.removeItem('admin-auth');
    setAuth(null);
    setToast('Logged out successfully');
  };

  const triggerRefresh = () => {
    setRefreshCounter((prev) => prev + 1);
    setToast('Data refresh triggered');
  };

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginShell auth={auth} setAuth={setAuth} />} />
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

      <Snackbar open={Boolean(toast)} autoHideDuration={2200} onClose={() => setToast('')}>
        <Alert severity="info" variant="filled" onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>
    </>
  );
}
