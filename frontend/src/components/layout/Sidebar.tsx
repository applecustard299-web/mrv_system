import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Database, Map, PlusCircle, Activity,
  FileText, CheckCircle2, Calculator, ShieldAlert, Users,
  Settings, LogOut, ChevronRight
} from 'lucide-react';

export type NavItemKey =
  | 'dashboard'
  | 'registry'
  | 'map'
  | 'register'
  | 'monitoring'
  | 'reports'
  | 'verification'
  | 'carbon'
  | 'audit'
  | 'users'
  | 'settings';

interface SidebarProps {
  currentTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const { role, logout } = useAuth();

  const allNavItems: {
    key: NavItemKey;
    label: string;
    icon: React.ReactNode;
    roles: string[];
    badge?: string;
  }[] = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
      roles: ['Administrator', 'Project Developer', 'MRV Officer', 'Public User']
    },
    {
      key: 'registry',
      label: 'Blue Carbon Registry',
      icon: <Database className="w-4 h-4" />,
      roles: ['Administrator', 'Project Developer', 'MRV Officer', 'Public User']
    },
    {
      key: 'map',
      label: 'Project Map',
      icon: <Map className="w-4 h-4" />,
      roles: ['Administrator', 'Project Developer', 'MRV Officer', 'Public User']
    },
    {
      key: 'register',
      label: 'Register Project',
      icon: <PlusCircle className="w-4 h-4" />,
      roles: ['Administrator', 'Project Developer'],
      badge: 'New'
    },
    {
      key: 'monitoring',
      label: 'Monitoring & Evidence',
      icon: <Activity className="w-4 h-4" />,
      roles: ['Administrator', 'Project Developer', 'MRV Officer']
    },
    {
      key: 'reports',
      label: 'Monitoring Reports',
      icon: <FileText className="w-4 h-4" />,
      roles: ['Administrator', 'Project Developer', 'MRV Officer']
    },
    {
      key: 'verification',
      label: 'Verification Portal',
      icon: <CheckCircle2 className="w-4 h-4" />,
      roles: ['Administrator', 'MRV Officer'],
      badge: 'Review'
    },
    {
      key: 'carbon',
      label: 'Carbon Estimator',
      icon: <Calculator className="w-4 h-4" />,
      roles: ['Administrator', 'Project Developer', 'MRV Officer', 'Public User']
    },
    {
      key: 'audit',
      label: 'Audit Log',
      icon: <ShieldAlert className="w-4 h-4" />,
      roles: ['Administrator', 'MRV Officer']
    },
    {
      key: 'users',
      label: 'User Management',
      icon: <Users className="w-4 h-4" />,
      roles: ['Administrator']
    },
    {
      key: 'settings',
      label: 'Settings & Demo Seed',
      icon: <Settings className="w-4 h-4" />,
      roles: ['Administrator']
    }
  ];

  const permittedItems = allNavItems.filter(item => item.roles.includes(role));

  return (
    <aside className="w-64 bg-white border-r border-slate-200 shrink-0 flex flex-col justify-between min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-6">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
            Navigation Menu
          </div>
          <nav className="space-y-1">
            {permittedItems.map((item) => {
              const isActive = currentTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => onSelectTab(item.key)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-teal-700 text-white shadow-sm shadow-teal-700/20'
                      : 'text-slate-600 hover:text-navy-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-teal-200' : 'text-slate-400'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isActive
                          ? 'bg-teal-800 text-teal-100'
                          : 'bg-teal-50 text-teal-700 border border-teal-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Role badge card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
          <p className="text-[11px] text-slate-400 uppercase font-semibold">Active Permissions</p>
          <p className="font-bold text-navy-900 mt-0.5">{role}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {role === 'Administrator' && 'Full administrative authority over registrations, factors & audits.'}
            {role === 'Project Developer' && 'Submit registrations, enter monitoring data & request verification.'}
            {role === 'MRV Officer' && 'Audit reported evidence and issue formal verification decisions.'}
            {role === 'Public User' && 'Read-only access to published registries and interactive map.'}
          </p>
        </div>
      </div>

      {/* Logout button */}
      <div className="p-4 border-t border-slate-100">
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Exit to Public User</span>
        </button>
      </div>
    </aside>
  );
};
