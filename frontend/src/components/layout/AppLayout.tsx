import React, { useState } from 'react';
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
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Search,
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

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
        return <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full px-1.5 py-0.2 flex items-center gap-0.5"><Shield className="h-2.5 w-2.5" />Admin</span>;
      case 'supervisor':
        return <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.2 flex items-center gap-0.5"><UserCheck className="h-2.5 w-2.5" />Supervisor</span>;
      default:
        return <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-1.5 py-0.2 flex items-center gap-0.5"><Bot className="h-2.5 w-2.5" />Agent</span>;
    }
  };

  const initials = (name?: string) => {
    if (!name) return 'SA';
    return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-app)' }}>
      {/* Sidebar matching Twenty CRM reference image */}
      <aside
        className={`flex flex-col shrink-0 border-r transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-56'
        }`}
        style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border)' }}
      >
        {/* Header matching reference image: user pill + search + collapse toggle */}
        <div
          className="h-13 px-3 flex items-center justify-between border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          {!collapsed ? (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="h-7 w-7 rounded-md flex items-center justify-center font-bold text-xs shrink-0"
                  style={{ background: 'var(--bg-muted)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                >
                  {initials(user?.full_name)}
                </div>
                <div className="min-w-0 flex items-center gap-1">
                  <span className="text-xs font-semibold truncate block" style={{ color: 'var(--text-primary)' }}>
                    {user?.full_name || 'Alex Morgan'}
                  </span>
                  <ChevronDown className="h-3 w-3 shrink-0" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  className="p-1.5 rounded hover:bg-slate-100 cursor-pointer transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  title="Quick search"
                >
                  <Search className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCollapsed(true)}
                  className="p-1.5 rounded hover:bg-slate-100 cursor-pointer transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  title="Collapse sidebar"
                >
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </button>
              </div>
            </>
          ) : (
            <div className="w-full flex items-center justify-center">
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                className="p-1.5 rounded hover:bg-slate-100 cursor-pointer transition-colors"
                style={{ color: 'var(--text-muted)' }}
                title="Expand sidebar"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4" aria-label="Main Navigation">
          {navGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p
                  className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      title={collapsed ? item.name : undefined}
                      className={({ isActive }) =>
                        `flex items-center ${
                          collapsed ? 'justify-center' : 'justify-between'
                        } px-2 py-1.5 rounded-lg text-sm font-medium transition-colors min-h-[34px] ${
                          isActive
                            ? 'text-indigo-700 bg-indigo-50 font-semibold'
                            : 'hover:bg-slate-50'
                        }`
                      }
                      style={({ isActive }) => ({
                        color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                      })}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        {!collapsed && <span className="text-[13px]">{item.name}</span>}
                      </div>
                      {!collapsed && item.badge && (
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
        <div className="p-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} p-1.5 rounded-lg`} style={{ background: 'var(--bg-muted)' }}>
            {!collapsed ? (
              <>
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="h-6 w-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0"
                    style={{ background: 'var(--accent)' }}
                  >
                    {initials(user?.full_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {user?.full_name || 'Alex Morgan'}
                    </p>
                    <div>{getRoleBadge(user?.role)}</div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  type="button"
                  className="p-1 rounded hover:bg-red-50 cursor-pointer transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <button
                onClick={handleLogout}
                type="button"
                className="p-1.5 rounded hover:bg-red-50 cursor-pointer transition-colors"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className="flex-1 overflow-y-auto"
        style={{ background: 'var(--bg-app)' }}
      >
        <div className="max-w-7xl mx-auto p-5 sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
