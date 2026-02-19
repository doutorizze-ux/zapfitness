import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TutorialProvider } from './contexts/TutorialContext';
import { Login } from './pages/Login';
import { LandingPage } from './pages/LandingPage';
import { AdminLogin } from './pages/AdminLogin';
import { Dashboard } from './pages/Dashboard';
import { PaymentPage } from './pages/PaymentPage';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { ThemeHandler } from './components/ThemeHandler';

import api from './api';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, login, loading: authLoading } = useAuth();
  const [checking, setChecking] = React.useState(!!user);

  React.useEffect(() => {
    const token = localStorage.getItem('token');
    if (user && token) {
      api.get('/me')
        .then(res => {
          const { primary_color, logo_url, enable_scheduling } = res.data;

          // Only update if there's actually a change to avoid infinite loops or excessive renders
          if (user.primary_color !== primary_color || user.logo_url !== logo_url || user.enable_scheduling !== enable_scheduling) {
            login(token, { ...user, primary_color, logo_url, enable_scheduling });
          }
        })
        .catch((err) => {
          console.error("[PrivateRoute] Session sync failed:", err);
          // If it's a 401, the api interceptor will handle it and redirect.
          // For other errors (network), we stay logged in but mark checking as false.
        })
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, [user, login]);

  if (authLoading || checking) return <div className="min-h-screen flex items-center justify-center text-primary">Verificando acesso...</div>;

  if (!user) return <Navigate to="/login" />;

  return <>{children}</>;
};

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { PublicWorkout } from './pages/PublicWorkout';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeHandler />
        <TutorialProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Login initialMode="register" />} />
            <Route path="/w/:id" element={<PublicWorkout />} />
            <Route path="/payment" element={<PrivateRoute><PaymentPage /></PrivateRoute>} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<SuperAdminDashboard />} />
            <Route path="/dashboard/*" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          <ToastContainer />
        </TutorialProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
