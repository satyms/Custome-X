import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export const PublicRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" aria-hidden="true" />
        <span className="mt-4 text-sm font-medium text-slate-400">Loading application...</span>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default PublicRoute;
