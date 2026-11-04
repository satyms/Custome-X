import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Ticket as TicketIcon,
  Users,
  LogOut,
  Shield,
  Bot,
  UserCheck,
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Tickets', path: '/tickets', icon: TicketIcon },
    { name: 'Customers', path: '/customers', icon: Users },
  ];

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-400 border border-rose-500/20">
            <Shield className="h-3 w-3" /> Admin
          </span>
        );
      case 'supervisor':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20">
            <UserCheck className="h-3 w-3" /> Supervisor
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
            <Bot className="h-3 w-3" /> Agent
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900/60 backdrop-blur-md flex flex-col justify-between shrink-0">
        <div>
          {/* Logo / Brand */}
          <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800/80">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white block">Custome-X</span>
              <span className="text-xs text-slate-400 font-mono tracking-wider">AI AGENTIC CORE</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1" aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-200 truncate">
                  {user?.full_name || 'Support Agent'}
                </p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
              {getRoleBadge(user?.role)}
            </div>

            <button
              onClick={handleLogout}
              type="button"
              className="mt-2 flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-medium text-slate-300 hover:text-rose-400 bg-slate-800 hover:bg-slate-750 border border-slate-700/60 rounded-lg transition-colors cursor-pointer min-h-[40px]"
              aria-label="Sign out of account"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-slate-950 p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
