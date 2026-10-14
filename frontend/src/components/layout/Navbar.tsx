import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import {
  Waves, ShieldCheck, UserCheck, Eye, Info, ChevronDown, Check,
  AlertTriangle, RotateCcw
} from 'lucide-react';

interface NavbarProps {
  onResetData?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onResetData }) => {
  const { user, role, switchRole } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showNotice, setShowNotice] = useState(true);

  const rolesList: { role: UserRole; label: string; icon: React.ReactNode; desc: string }[] = [
    { role: 'Administrator', label: 'Administrator', icon: <ShieldCheck className="w-4 h-4 text-purple-600" />, desc: 'System controls, approval, factors & audit' },
    { role: 'Project Developer', label: 'Project Developer', icon: <UserCheck className="w-4 h-4 text-teal-600" />, desc: 'Register projects, submit reports & evidence' },
    { role: 'MRV Officer', label: 'MRV Officer', icon: <Waves className="w-4 h-4 text-blue-600" />, desc: 'Verify reports, inspect field data & certify' },
    { role: 'Public User', label: 'Public User', icon: <Eye className="w-4 h-4 text-emerald-600" />, desc: 'Explore public registry, map & estimates' },
  ];

  const handleSelectRole = (r: UserRole) => {
    switchRole(r);
    setDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-navy-900 border-b border-navy-800 text-white shadow-md">
      {showNotice && (
        <div className="bg-gradient-to-r from-teal-900 via-navy-900 to-ocean-900 px-4 py-1.5 text-xs text-slate-300 border-b border-teal-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span>
              <strong>Regulatory Notice:</strong> Prototype system for demonstration and MRV workflow simulation. Carbon estimates represent Tier-2 models and do not constitute registered market credits without accredited audit.
            </span>
          </div>
          <button
            onClick={() => setShowNotice(false)}
            className="text-slate-400 hover:text-white text-xs font-bold px-1.5 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-ocean-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Waves className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">Blue Carbon</span>
              <span className="text-xs uppercase tracking-widest bg-teal-500/20 text-teal-300 font-semibold px-2 py-0.5 rounded border border-teal-500/30">
                Registry & MRV
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Mangrove, Seagrass & Tidal Wetland Carbon Assurance
            </p>
          </div>
        </div>

        {/* Right Tools: Role Switcher & User Status */}
        <div className="flex items-center gap-4">
          {/* Quick Demo Role Selector */}
          <div className="relative">
            <div className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5 text-right hidden md:block">
              Active Demo Role
            </div>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 bg-navy-800 hover:bg-navy-700/80 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors shadow-inner"
            >
              <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></div>
              <span>{role}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-navy-900">Switch Demonstration Role</p>
                  <p className="text-[11px] text-slate-500">Test different view permissions and action workflows</p>
                </div>
                <div className="p-1 space-y-1">
                  {rolesList.map((item) => (
                    <button
                      key={item.role}
                      onClick={() => handleSelectRole(item.role)}
                      className={`w-full text-left p-2.5 rounded-lg text-xs flex items-start gap-2.5 transition-colors ${
                        role === item.role ? 'bg-teal-50 border border-teal-200 text-teal-900' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="mt-0.5">{item.icon}</div>
                      <div className="flex-1">
                        <div className="font-semibold flex items-center justify-between">
                          <span>{item.label}</span>
                          {role === item.role && <Check className="w-3.5 h-3.5 text-teal-600" />}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">{item.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Current User Pill */}
          <div className="hidden lg:flex items-center gap-2 border-l border-slate-800 pl-4 text-xs">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-teal-400">
              {user ? user.full_name.charAt(0) : 'U'}
            </div>
            <div>
              <p className="font-medium text-slate-200">{user?.full_name || 'Demo User'}</p>
              <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{user?.email || 'user@bluecarbon.org'}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
