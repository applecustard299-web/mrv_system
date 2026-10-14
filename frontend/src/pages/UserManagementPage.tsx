import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { User, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Users, ShieldCheck, UserCheck, Eye, RefreshCw, AlertTriangle,
  RotateCcw, CheckCircle2, UserPlus, Info
} from 'lucide-react';

interface UserManagementPageProps {
  onDataReset?: () => void;
}

export const UserManagementPage: React.FC<UserManagementPageProps> = ({ onDataReset }) => {
  const { role } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const uList = await api.getUsers();
      setUsers(uList);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleResetData = async () => {
    if (!window.confirm("Are you sure you want to reset the database? This will restore the 5 original demonstration projects, sample MRV records, and initial Tier-2 factors.")) {
      return;
    }
    setResetting(true);
    setResetSuccess(false);
    try {
      await api.resetDemoData();
      setResetSuccess(true);
      await fetchUsers();
      if (onDataReset) onDataReset();
      setTimeout(() => setResetSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to reset data:', err);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-navy-900 tracking-tight">User Management & System Settings</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
              Admin Only
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage authenticated platform users, role assignments, and demonstration dataset states.
          </p>
        </div>
      </div>

      {/* Demo Seed Reset Card */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <RotateCcw className="w-4 h-4 text-amber-700" />
            <span>Reset Demonstration Dataset</span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed max-w-2xl">
            Need to restart testing from a pristine state? This will wipe temporary trial records and re-seed all 5 comprehensive projects across Mangroves, Seagrasses, and Tidal Wetlands with verified baselines and audit events.
          </p>
        </div>
        <button
          onClick={handleResetData}
          disabled={resetting}
          className="flex items-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold shadow-sm transition-all shrink-0"
        >
          {resetting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Resetting Database...</span>
            </>
          ) : resetSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Data Reset Complete!</span>
            </>
          ) : (
            <>
              <RotateCcw className="w-4 h-4" />
              <span>Reset to Clean Demo Data</span>
            </>
          )}
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-navy-900">Registered Platform Users ({users.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Role Permission</th>
                <th className="py-3 px-4">Affiliated Organization</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                    <span>Loading users...</span>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 font-bold text-navy-900">
                      {u.full_name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {u.email}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        u.role === 'Administrator' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                        u.role === 'MRV Officer' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        u.role === 'Project Developer' ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                        'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {u.organization_name || 'Independent / Public'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Active
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
