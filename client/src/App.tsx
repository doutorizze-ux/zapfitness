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

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [isPaid, setIsPaid] = React.useState<boolean | null>(null);
  const [checking, setChecking] = React.useState(false);

  React.useEffect(() => {
    if (user) { // Only check if user is authenticated
      setChecking(true);
      api.get('/me')
        .then(res => {
          const { payment_status, payment_method } = res.data;
          // Allow if ACTIVE, or if PENDING but Credit Card (optimistic - can change policy later)
          // Actually, for consistency with User request "so libera... ao fazer pagamento", let's be strict for PIX.
          // But if Plan is Free/Trial (not implemented yet), we might need logic. Assuming all paid plans now.

          if (payment_status === 'ACTIVE') {
            setIsPaid(true);
          } else if (payment_status === 'PENDING' && payment_method === 'CREDIT_CARD') {
            // Allow optimistic access for CC processing if needed, OR block. 
            // Let's block to be safe and ensure they see if it failed.
            // Actually Asaas returns failures quickly. PENDING usually means waiting approval or webhook.
            // Let's redirect to payment so they can see the "Pending" status or "Success" message there.
            setIsPaid(false);
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

  // If we checked and they are not paid, redirect to payment
  // Explicitly check for isPaid === false to avoid redirecting during initial null state
  if (isPaid === false) return <Navigate to="/payment" />;

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
      </AuthProvider>
    </Router>
  );
}

export default App;
