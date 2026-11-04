import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" aria-hidden="true" />
        <span className="mt-4 text-sm font-medium text-slate-400">Verifying session...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
