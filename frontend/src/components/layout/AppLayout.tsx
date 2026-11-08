import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Tag,
  Users,
  LogOut,
  Shield,
  Bot,
  UserCheck,
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
  Clock,
  CheckSquare,
  MessageSquare,
  Building,
  Diamond,
  Plus,
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full px-1.5 py-0.2 flex items-center gap-0.5">
            <Shield className="h-2.5 w-2.5" />Admin
          </span>
        );
      case 'supervisor':
        return (
          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.2 flex items-center gap-0.5">
            <UserCheck className="h-2.5 w-2.5" />Supervisor
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-1.5 py-0.2 flex items-center gap-0.5">
            <Bot className="h-2.5 w-2.5" />Agent
          </span>
        );
    }
  };

  const initials = (name?: string) => {
    if (!name) return 'AM';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden" style={{ background: 'var(--bg-app)' }}>
      {/* Sidebar matching Twenty CRM reference image 1-to-1 */}
      <aside
        className={`flex flex-col shrink-0 border-r transition-all duration-200 select-none ${
          collapsed ? 'w-14' : 'w-56'
        }`}
        style={{
          background: 'var(--bg-sidebar)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Profile Header: [AM] Alex Morgan ∨    🔍 « */}
        <div
          className="h-12 px-3 flex items-center justify-between border-b shrink-0"
          style={{ borderColor: 'var(--border)' }}
        >
          {!collapsed ? (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="h-6 w-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0"
                  style={{
                    background: '#F1F5F9',
                    color: '#334155',
                    border: '1px solid var(--border)',
                  }}
                >
                  {initials(user?.full_name)}
                </div>
                <div className="min-w-0 flex items-center gap-1 cursor-pointer">
                  <span
                    className="text-[13px] font-semibold truncate block"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {user?.full_name || 'Alex Morgan'}
                  </span>
                  <ChevronDown className="h-3 w-3 shrink-0 text-slate-400" />
                </div>
              </div>

              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => navigate('/tickets')}
                  className="p-1 rounded hover:bg-slate-100 cursor-pointer text-slate-400 hover:text-slate-700 transition-colors"
                  title="Search"
                >
                  <Search className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCollapsed(true)}
                  className="p-1 rounded hover:bg-slate-100 cursor-pointer text-slate-400 hover:text-slate-700 transition-colors"
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
                className="p-1.5 rounded hover:bg-slate-100 cursor-pointer text-slate-400 hover:text-slate-700 transition-colors"
                title="Expand sidebar"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 overflow-y-auto py-2.5 px-2 space-y-4" aria-label="Main Navigation">
          {/* Top Primary Items */}
          <div className="space-y-0.5">
            <NavLink
              to="/tickets"
              title={collapsed ? 'Up next' : undefined}
              className={({ isActive }) =>
                `flex items-center ${
                  collapsed ? 'justify-center' : 'justify-between'
                } px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors min-h-[32px] ${
                  isActive && location.search.includes('upnext')
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <Clock className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                {!collapsed && <span>Up next</span>}
              </div>
            </NavLink>

            <NavLink
              to="/approvals"
              title={collapsed ? 'Tasks' : undefined}
              className={({ isActive }) =>
                `flex items-center ${
                  collapsed ? 'justify-center' : 'justify-between'
                } px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors min-h-[32px] ${
                  isActive
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <CheckSquare className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                {!collapsed && <span>Tasks</span>}
              </div>

            </NavLink>
          </div>

          {/* Group: Chats */}
          <div>
            {!collapsed && (
              <p className="px-2.5 mb-1 text-[11px] font-medium text-slate-400">Chats</p>
            )}
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => navigate('/tickets')}
                className={`w-full flex items-center ${
                  collapsed ? 'justify-center' : 'gap-2'
                } px-2.5 py-1.5 rounded-lg text-[13px] text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer`}
                title="New chat"
              >
                <Plus className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                {!collapsed && <span>New chat</span>}
              </button>

              <NavLink
                to="/tickets"
                title={collapsed ? 'Q4 late-stage pipeline' : undefined}
                className="flex items-center gap-2 px-2.5 py-1 rounded-lg text-[13px] text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors truncate"
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                {!collapsed && <span className="truncate">Q4 late-stage pipeline r...</span>}
              </NavLink>
            </div>
          </div>

          {/* Group: Records (Accounts, Contacts, Opportunities) */}
          <div>
            {!collapsed && (
              <p className="px-2.5 mb-1 text-[11px] font-medium text-slate-400">Records</p>
            )}
            <div className="space-y-0.5">
              <NavLink
                to="/customers"
                title={collapsed ? 'Accounts' : undefined}
                className={({ isActive }) =>
                  `flex items-center ${
                    collapsed ? 'justify-center' : 'gap-2.5'
                  } px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors min-h-[32px] ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <Building className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                {!collapsed && <span>Accounts</span>}
              </NavLink>

              <NavLink
                to="/customers"
                title={collapsed ? 'Contacts' : undefined}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors min-h-[32px]"
              >
                <Users className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                {!collapsed && <span>Contacts</span>}
              </NavLink>

              <NavLink
                to="/tickets"
                title={collapsed ? 'Tickets' : undefined}
                className={({ isActive }) =>
                  `flex items-center ${
                    collapsed ? 'justify-center' : 'gap-2.5'
                  } px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors min-h-[32px] ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <Tag className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                {!collapsed && <span>Tickets</span>}
              </NavLink>

              <NavLink
                to="/orders"
                title={collapsed ? 'Orders' : undefined}
                className={({ isActive }) =>
                  `flex items-center ${
                    collapsed ? 'justify-center' : 'gap-2.5'
                  } px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors min-h-[32px] ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <Package className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                {!collapsed && <span>Orders</span>}
              </NavLink>

              <NavLink
                to="/knowledge"
                title={collapsed ? 'Knowledge Base' : undefined}
                className={({ isActive }) =>
                  `flex items-center ${
                    collapsed ? 'justify-center' : 'gap-2.5'
                  } px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors min-h-[32px] ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <BookOpen className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                {!collapsed && <span>Knowledge</span>}
              </NavLink>
            </div>
          </div>

          {/* Group: Lists */}
          <div>
            {!collapsed && (
              <p className="px-2.5 mb-1 text-[11px] font-medium text-slate-400">Lists</p>
            )}
            <div className="space-y-0.5">
              <button
                type="button"
                className={`w-full flex items-center ${
                  collapsed ? 'justify-center' : 'gap-2'
                } px-2.5 py-1.5 rounded-lg text-[13px] text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer`}
                title="New list"
              >
                <Plus className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                {!collapsed && <span>New list</span>}
              </button>

              <NavLink
                to="/customers"
                title={collapsed ? 'Champions' : undefined}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors min-h-[30px]"
              >
                <Users className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                {!collapsed && <span>Champions</span>}
              </NavLink>

              <NavLink
                to="/orders"
                title={collapsed ? 'Q4 commit' : undefined}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors min-h-[30px]"
              >
                <Diamond className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                {!collapsed && <span>Q4 commit</span>}
              </NavLink>

              <NavLink
                to="/customers"
                title={collapsed ? 'Strategic accounts' : undefined}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors min-h-[30px]"
              >
                <Building className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                {!collapsed && <span>Strategic accounts</span>}
              </NavLink>
            </div>
          </div>

          {/* Group: Intelligence & System */}
          <div>
            {!collapsed && (
              <p className="px-2.5 mb-1 text-[11px] font-medium text-slate-400">Intelligence</p>
            )}
            <div className="space-y-0.5">
              <NavLink
                to="/dashboard"
                title={collapsed ? 'Dashboard' : undefined}
                className={({ isActive }) =>
                  `flex items-center ${
                    collapsed ? 'justify-center' : 'gap-2.5'
                  } px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors min-h-[30px] ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <BarChart3 className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                {!collapsed && <span>Overview</span>}
              </NavLink>

              <NavLink
                to="/analytics"
                title={collapsed ? 'Analytics' : undefined}
                className={({ isActive }) =>
                  `flex items-center ${
                    collapsed ? 'justify-center' : 'gap-2.5'
                  } px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors min-h-[30px] ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <BarChart3 className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                {!collapsed && <span>Analytics</span>}
              </NavLink>

              <NavLink
                to="/evals"
                title={collapsed ? 'Agent Evals' : undefined}
                className={({ isActive }) =>
                  `flex items-center ${
                    collapsed ? 'justify-center' : 'gap-2.5'
                  } px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors min-h-[30px] ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                {!collapsed && <span>Agent Evals</span>}
              </NavLink>

              <NavLink
                to="/automations"
                title={collapsed ? 'Automations' : undefined}
                className={({ isActive }) =>
                  `flex items-center ${
                    collapsed ? 'justify-center' : 'gap-2.5'
                  } px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors min-h-[30px] ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <Zap className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                {!collapsed && <span>Automations</span>}
              </NavLink>

              <NavLink
                to="/settings"
                title={collapsed ? 'Settings' : undefined}
                className={({ isActive }) =>
                  `flex items-center ${
                    collapsed ? 'justify-center' : 'gap-2.5'
                  } px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors min-h-[30px] ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <Sliders className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                {!collapsed && <span>Settings</span>}
              </NavLink>
            </div>
          </div>
        </nav>

        {/* User Footer matching reference */}
        <div className="p-2 border-t shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div
            className={`flex items-center ${
              collapsed ? 'justify-center' : 'justify-between'
            } p-1.5 rounded-lg hover:bg-slate-50 transition-colors`}
          >
            {!collapsed ? (
              <>
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="h-6 w-6 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0"
                    style={{
                      background: '#F1F5F9',
                      color: '#334155',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {initials(user?.full_name)}
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-[11px] font-semibold truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {user?.full_name || 'Alex Morgan'}
                    </p>
                    <div>{getRoleBadge(user?.role)}</div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  type="button"
                  className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 cursor-pointer transition-colors"
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
                className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 cursor-pointer transition-colors"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Workspace: Full Bleed Minimal Layout */}
      <main
        className="flex-1 h-screen overflow-hidden flex flex-col min-w-0"
        style={{ background: 'var(--bg-app)' }}
      >
        {location.pathname.startsWith('/tickets') ? (
          <Outlet />
        ) : (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 max-w-7xl w-full mx-auto">
            <Outlet />
          </div>
        )}
      </main>
    </div>
  );
};

export default AppLayout;
