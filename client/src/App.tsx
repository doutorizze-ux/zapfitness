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

const PrivateRoute = ({ children, requirePayment = true }: { children: React.ReactNode, requirePayment?: boolean }) => {
  const { user, login, loading: authLoading } = useAuth();
  const [isPaid, setIsPaid] = React.useState<boolean | null>(null);
  const [checking, setChecking] = React.useState(!!user); // Start checking if user is already there

  React.useEffect(() => {
    if (user) {
      // Instead of setChecking(true) here which causes a flash, we initialized it above
      api.get('/api/me')
        .then(res => {
          const { payment_status, is_free, primary_color, logo_url, enable_scheduling } = res.data;

          if (user.primary_color !== primary_color || user.logo_url !== logo_url) {
            login(localStorage.getItem('token') || '', { ...user, primary_color, logo_url, enable_scheduling });
          }

          if (payment_status === 'ACTIVE' || is_free) {
            setIsPaid(true);
          } else {
            setIsPaid(false);
          }
        })
        .catch((err) => {
          console.error("[PrivateRoute] Session invalid:", err);
          // If it's a 401, we might want to logout, but for persistence let's be careful
          if (err.response?.status === 401) {
            // logout(); // Optional: do we want to force logout on every 401?
          }
          setIsPaid(false);
        })
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, [user, login]);

  if (authLoading || checking) return <div className="min-h-screen flex items-center justify-center text-primary">Verificando acesso...</div>;

  if (!user) return <Navigate to="/login" />;

  // If we checked and they are not paid, AND this route requires payment, redirect to payment
  if (requirePayment && isPaid === false) return <Navigate to="/payment" />;

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
            <Route path="/payment" element={<PrivateRoute requirePayment={false}><PaymentPage /></PrivateRoute>} />
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
