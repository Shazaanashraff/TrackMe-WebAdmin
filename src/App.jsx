import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordRequestPage } from './pages/ForgotPasswordRequestPage';
import { ForgotPasswordVerifyPage } from './pages/ForgotPasswordVerifyPage';
import { ForgotPasswordResetPage } from './pages/ForgotPasswordResetPage';
import { ActivateAccountPage } from './pages/ActivateAccountPage';
import { AppShell } from './layout/AppShell';
import { AppLoading } from './layout/AppLoading';
import { ErrorBoundary } from './layout/ErrorBoundary';
import { OfflineBanner } from './layout/OfflineBanner';
import { NotFoundPage } from './pages/NotFoundPage';
import { Toaster } from './components/ui/sonner';
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
import { ManagerRouteApprovalsPage } from './pages/ManagerRouteApprovalsPage';
import { ManagerPrivateRoutesPage } from './pages/ManagerPrivateRoutesPage';
import { adminApi } from './api';
import { clearStoredAuth, readStoredAuth, writeStoredAuth } from './lib/authSession';
import { useRefreshData } from './hooks/use-refresh';
import { StyleGuidePage } from './pages/StyleGuidePage';

function ProtectedShell({ auth, onLogout, triggerRefresh }) {
  const authToken = auth?.token || auth?.accessToken;
  const userRole = auth?.user?.role;
  const isSuperAdmin = userRole === 'super-admin';
  const isManager = userRole === 'admin';

  if (!authToken || (!isSuperAdmin && !isManager)) {
    return <Navigate to="/login" replace />;
  }

  const shell = <AppShell user={auth.user} onLogout={onLogout} onRefresh={triggerRefresh} />;

  if (isSuperAdmin) {
    return (
      <Routes>
        <Route element={shell}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/managers" element={<ManagersPage />} />
          <Route path="/operations" element={<OperationsPage />} />
          <Route path="/routes" element={<RoutesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage role="super-admin" />} />
        </Route>
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={shell}>
        <Route path="/manager/dashboard" element={<ManagerDashboardPage />} />
        <Route path="/manager/buses" element={<ManagerBusesPage />} />
        <Route path="/manager/tracking" element={<ManagerTrackingPage />} />
        <Route path="/manager/accounts" element={<ManagerAccountsPage />} />
        <Route path="/manager/route-approvals" element={<ManagerRouteApprovalsPage />} />
        <Route path="/manager/private-routes" element={<ManagerPrivateRoutesPage />} />
        <Route path="/manager/settings" element={<ManagerSettingsPage />} />
        <Route path="*" element={<NotFoundPage role="admin" />} />
      </Route>
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
  const refreshQueries = useRefreshData();

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
        } catch (err) {
          // Only a genuine rejection means the session is dead. A network error,
          // a timeout, or the backend restarting leaves `status` undefined — in
          // that case keep the stored session (the access token is still valid)
          // instead of logging the user out on every reload.
          const rejectedByServer = err?.status === 401 || err?.status === 403;

          if (rejectedByServer) {
            clearStoredAuth();
            if (!cancelled) {
              setAuth(null);
            }
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
    toast('Logged out successfully');
  };

  const triggerRefresh = () => {
    refreshQueries();
    toast('Data refreshed');
  };

  return (
    <>
      <OfflineBanner />
      <Toaster />
      {hydrating ? <AppLoading /> : null}
      {!hydrating ? (
        <Routes>
          {import.meta.env.DEV && <Route path="/styleguide" element={<StyleGuidePage />} />}
          <Route path="/login" element={<LoginShell auth={auth} setAuth={setAuth} />} />
          <Route path="/forgot-password" element={<ForgotPasswordRequestPage />} />
          <Route path="/forgot-password/verify" element={<ForgotPasswordVerifyPage />} />
          <Route path="/forgot-password/reset" element={<ForgotPasswordResetPage />} />
          <Route path="/activate" element={<ActivateAccountPage />} />
          <Route
            path="/*"
            element={
              <ErrorBoundary>
                <ProtectedShell
                  auth={auth}
                  onLogout={handleLogout}
                  triggerRefresh={triggerRefresh}
                />
              </ErrorBoundary>
            }
          />
        </Routes>
      ) : null}
    </>
  );
}
