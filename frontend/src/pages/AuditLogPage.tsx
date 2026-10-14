import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { AuditLogItem } from '../types';
import { ShieldCheck, Search, Filter, RefreshCw, AlertCircle, Info, Lock } from 'lucide-react';

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [entityFilter, setEntityFilter] = useState('All');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAuditLogs({
        search: search || undefined,
        action: actionFilter !== 'All' ? actionFilter : undefined,
        entity_type: entityFilter !== 'All' ? entityFilter : undefined,
      });
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, entityFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-navy-900 tracking-tight">System Audit Trail & Data Integrity</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
              Traceability
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit logging of project creations, document uploads, carbon recalculations, and verification decisions.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition-colors shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Audit Logs</span>
        </button>
      </div>

      {/* Audit Distinction Notice Banner */}
      <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 text-xs flex items-start gap-3">
        <Lock className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-purple-300">Application-Level Audit Architecture</p>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            This log preserves non-repudiation and temporal accountability for all state mutations. Note: For this prototype, entries are managed via high-integrity relational constraints, which are distinguished from a decentralized cryptographically distributed blockchain ledger.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by user email, entity ID, or change summary..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter By:</span>
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-800"
          >
            <option value="All">All Actions</option>
            <option value="Project Registered">Project Registered</option>
            <option value="Project Status Updated">Project Status Updated</option>
            <option value="Evidence Uploaded">Evidence Uploaded</option>
            <option value="Monitoring Event Created">Monitoring Event Created</option>
            <option value="Carbon Recalculated">Carbon Recalculated</option>
            <option value="Report Submitted">Report Submitted</option>
            <option value="Verification Decision">Verification Decision</option>
            <option value="Carbon Factor Updated">Carbon Factor Updated</option>
          </select>

          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-800"
          >
            <option value="All">All Entities</option>
            <option value="Project">Project</option>
            <option value="Document">Document</option>
            <option value="MonitoringEvent">MonitoringEvent</option>
            <option value="CarbonCalculation">CarbonCalculation</option>
            <option value="MonitoringReport">MonitoringReport</option>
            <option value="VerificationReview">VerificationReview</option>
            <option value="CarbonFactor">CarbonFactor</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity Type</th>
                <th className="py-3 px-4">Entity ID</th>
                <th className="py-3 px-4">Change Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                    <span>Loading audit records...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {log.user_email}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {log.entity_type}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-navy-900">
                      {log.entity_id || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-slate-700 leading-relaxed">
                      {log.change_summary}
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
