import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicRoute } from './components/PublicRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TicketsPage } from './pages/TicketsPage';
import { TicketDetailPage } from './pages/TicketDetailPage';
import { CustomersPage } from './pages/CustomersPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Authentication Route */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          {/* Protected Application Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/tickets" element={<TicketsPage />} />
              <Route path="/tickets/:id" element={<TicketDetailPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>

          {/* Wildcard Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
