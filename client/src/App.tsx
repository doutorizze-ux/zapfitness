import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { LandingPage } from './pages/LandingPage';
import { AdminLogin } from './pages/AdminLogin';
import { Dashboard } from './pages/Dashboard';
import { PaymentPage } from './pages/PaymentPage';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';

import api from './api';

const PrivateRoute = ({ children, requirePayment = true }: { children: React.ReactNode, requirePayment?: boolean }) => {
  const { user, loading: authLoading } = useAuth();
  const [isPaid, setIsPaid] = React.useState<boolean | null>(null);
  const [checking, setChecking] = React.useState(false);

  React.useEffect(() => {
    if (user) { // Only check if user is authenticated
      setChecking(true);
      api.get('/me')
        .then(res => {
          const { payment_status } = res.data;
          // Allow if ACTIVE
          if (payment_status === 'ACTIVE') {
            setIsPaid(true);
          } else {
            setIsPaid(false);
          }
        })
        .catch(() => setIsPaid(false))
        .finally(() => setChecking(false));
    }
  }, [user]);

  if (authLoading || checking) return <div className="min-h-screen flex items-center justify-center text-primary">Verificando acesso...</div>;

  if (!user) return <Navigate to="/login" />;

  // If we checked and they are not paid, AND this route requires payment, redirect to payment
  if (requirePayment && isPaid === false) return <Navigate to="/payment" />;

  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />

          <Route path="/register" element={<Login initialMode="register" />} />
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
      </AuthProvider>
    </Router>
  );
}

export default App;
