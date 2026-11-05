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
  ShieldAlert,
  BookOpen,
  Package,
  BarChart3,
  Sparkles,
  Zap,
  Sliders,
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navGroups = [
    {
      label: 'Workspace',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Tickets', path: '/tickets', icon: TicketIcon },
        { name: 'HITL Approvals', path: '/approvals', icon: ShieldAlert, badge: '4' },
      ],
    },
    {
      label: 'Resources',
      items: [
        { name: 'Knowledge Base', path: '/knowledge', icon: BookOpen },
        { name: 'Orders Registry', path: '/orders', icon: Package },
        { name: 'Customers 360', path: '/customers', icon: Users },
      ],
    },
    {
      label: 'Intelligence',
      items: [
        { name: 'Analytics', path: '/analytics', icon: BarChart3 },
        { name: 'Agent Evals', path: '/evals', icon: Sparkles },
        { name: 'Automations', path: '/automations', icon: Zap },
      ],
    },
    {
      label: 'System',
      items: [
        { name: 'Settings', path: '/settings', icon: Sliders },
      ],
    },
  ];

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5 flex items-center gap-1"><Shield className="h-2.5 w-2.5" />Admin</span>;
      case 'supervisor':
        return <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 flex items-center gap-1"><UserCheck className="h-2.5 w-2.5" />Supervisor</span>;
      default:
        return <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5 flex items-center gap-1"><Bot className="h-2.5 w-2.5" />Agent</span>;
    }
  };

  const initials = (name?: string) => {
    if (!name) return 'SA';
    return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-app)' }}>
      {/* Sidebar */}
      <aside
        className="w-56 flex flex-col shrink-0 border-r"
        style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border)' }}
      >
        {/* Logo */}
        <div
          className="h-14 px-4 flex items-center gap-2.5 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <div
            className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'var(--accent)' }}
          >
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <span
              className="text-sm font-semibold block leading-tight truncate"
              style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-primary)' }}
            >
              Custome-X
            </span>
            <span className="text-[10px] tracking-wider" style={{ color: 'var(--text-muted)' }}>
              AI SUPPORT
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4" aria-label="Main Navigation">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p
                className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-2.5 py-2 rounded-lg text-sm font-medium transition-colors min-h-[36px] ${
                          isActive
                            ? 'text-indigo-700 bg-indigo-50'
                            : 'hover:bg-slate-50'
                        }`
                      }
                      style={({ isActive }) => ({
                        color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                      })}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="text-[13px]">{item.name}</span>
                      </div>
                      {item.badge && (
                        <span
                          className="h-4 min-w-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
                          style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Footer */}
        <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2.5 p-2 rounded-lg" style={{ background: 'var(--bg-muted)' }}>
            <div
              className="h-7 w-7 rounded-full flex items-center justify-center text-white text-[11px] font-semibold shrink-0"
              style={{ background: 'var(--accent)' }}
            >
              {initials(user?.full_name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {user?.full_name || 'Support Agent'}
              </p>
              <div>{getRoleBadge(user?.role)}</div>
            </div>
            <button
              onClick={handleLogout}
              type="button"
              className="p-1.5 rounded-md hover:bg-red-50 cursor-pointer transition-colors"
              style={{ color: 'var(--text-muted)' }}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className="flex-1 overflow-y-auto"
        style={{ background: 'var(--bg-app)' }}
      >
        <div className="max-w-7xl mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
