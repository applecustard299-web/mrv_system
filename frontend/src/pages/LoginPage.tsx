import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { Waves, ShieldCheck, UserCheck, Eye, Lock, Mail, ArrowRight } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { login, switchRole } = useAuth();
  const [email, setEmail] = useState('admin@bluecarbon.org');
  const [password, setPassword] = useState('admin123');

  const demoAccounts = [
    {
      role: 'Administrator' as UserRole,
      email: 'admin@bluecarbon.org',
      name: 'Dr. Eleanor Vance',
      icon: <ShieldCheck className="w-5 h-5 text-purple-600" />,
      color: 'hover:border-purple-300 hover:bg-purple-50/50'
    },
    {
      role: 'Project Developer' as UserRole,
      email: 'developer@oceanguardians.org',
      name: 'Marcus Lindqvist',
      icon: <UserCheck className="w-5 h-5 text-teal-600" />,
      color: 'hover:border-teal-300 hover:bg-teal-50/50'
    },
    {
      role: 'MRV Officer' as UserRole,
      email: 'mrv.officer@coastalverify.org',
      name: 'Amara Okafor',
      icon: <Waves className="w-5 h-5 text-blue-600" />,
      color: 'hover:border-blue-300 hover:bg-blue-50/50'
    },
    {
      role: 'Public User' as UserRole,
      email: 'public.observer@earthwatch.net',
      name: 'Sofia Chen',
      icon: <Eye className="w-5 h-5 text-emerald-600" />,
      color: 'hover:border-emerald-300 hover:bg-emerald-50/50'
    }
  ];

  const handleQuickLogin = (r: UserRole, mail: string) => {
    login(mail, r);
    switchRole(r);
    onLoginSuccess();
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email);
    onLoginSuccess();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-teal-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-500 to-ocean-500 mx-auto flex items-center justify-center shadow-xl shadow-teal-500/20">
          <Waves className="w-9 h-9 text-white" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Blue Carbon Registry & MRV
        </h2>
        <p className="text-xs text-slate-300 max-w-sm mx-auto">
          Centralized digital assurance platform for coastal mangrove, seagrass, and tidal wetland carbon restoration.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg px-4">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100 space-y-6">
          {/* Quick Demo Switcher */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-3 text-center">
              Quick 1-Click Demonstration Login
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => handleQuickLogin(acc.role, acc.email)}
                  className={`p-3 rounded-xl border border-slate-200 text-left transition-all ${acc.color}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {acc.icon}
                    <span className="font-bold text-xs text-navy-900">{acc.role}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium truncate">{acc.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono truncate">{acc.email}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-400">or custom credentials</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs"
            >
              <span>Sign In to Platform</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-[11px] text-slate-400 text-center italic">
            Evaluation Prototype Notice: For demonstration and academic review. Does not issue market-regulated carbon credits without formal audit.
          </p>
        </div>
      </div>
    </div>
  );
};
