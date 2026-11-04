<<<<<<< HEAD
import { useState, useEffect } from "react";
import "./App.css";

interface HealthData {
  status: string;
  service: string;
  version: string;
  timestamp: string;
}

export default function App() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

  useEffect(() => {
    fetch(`${API_URL}/api/health`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data: HealthData) => {
        setHealth(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [API_URL]);

  return (
    <div style={{ fontFamily: "sans-serif", padding: "2rem", maxWidth: "600px", margin: "auto" }}>
      <h1>Custome-X Dashboard Skeleton</h1>
      <p>Testing Phase 1 Frontend-Backend Connection</p>

      <div style={{ padding: "1.5rem", borderRadius: "8px", border: "1px solid #ccc", marginTop: "1rem" }}>
        <h3>Backend API Connection Status</h3>

        {loading && <p style={{ color: "#888" }}>⏳ Pinging FastAPI backend...</p>}

        {error && (
          <div style={{ color: "#d32f2f" }}>
            <p>❌ <strong>Failed to connect:</strong> {error}</p>
            <small>Make sure Uvicorn is running on port 8000 and CORS is enabled.</small>
          </div>
        )}

        {health && (
          <div style={{ color: "#2e7d32" }}>
            <p>✅ <strong>Status:</strong> {health.status.toUpperCase()}</p>
            <p>📦 <strong>Service:</strong> {health.service} (v{health.version})</p>
            <p>🕒 <strong>Server Time (UTC):</strong> {new Date(health.timestamp).toLocaleTimeString()}</p>
          </div>
        )}
      </div>
    </div>
  );
}
=======
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
>>>>>>> backend
