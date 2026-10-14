import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { RegistryRecord } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  Search, Filter, Download, ExternalLink, RefreshCw,
  Database, AlertCircle, FileSpreadsheet, Eye
} from 'lucide-react';

interface RegistryProps {
  onViewProject: (projectId: number) => void;
}

export const Registry: React.FC<RegistryProps> = ({ onViewProject }) => {
  const [records, setRecords] = useState<RegistryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ecosystem, setEcosystem] = useState('All');
  const [status, setStatus] = useState('All');
  const [verification, setVerification] = useState('All');

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const data = await api.getRegistry({
        search: search || undefined,
        ecosystem: ecosystem !== 'All' ? ecosystem : undefined,
        status: status !== 'All' ? status : undefined,
        verification: verification !== 'All' ? verification : undefined,
      });
      setRecords(data);
    } catch (err) {
      console.error('Failed to fetch registry records:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [ecosystem, status, verification]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecords();
  };

  const handleExportCsv = () => {
    window.open('/api/registry/export-csv', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-navy-900 tracking-tight">Blue Carbon Registry</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 font-semibold">
              Public Ledger
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Search, filter, and inspect registered coastal restoration projects and verified carbon records.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Export Registry (CSV)</span>
          </button>
          <button
            onClick={fetchRecords}
            title="Refresh"
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by project name, ID (e.g. BCR-2026), country or registry code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Ecosystem Filter */}
          <select
            value={ecosystem}
            onChange={(e) => setEcosystem(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-800 focus:ring-1 focus:ring-teal-500"
          >
            <option value="All">All Ecosystems</option>
            <option value="Mangrove restoration">Mangrove restoration</option>
            <option value="Seagrass conservation or restoration">Seagrass conservation</option>
            <option value="Tidal wetland conservation or restoration">Tidal wetland</option>
          </select>

          {/* Project Status */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-800 focus:ring-1 focus:ring-teal-500"
          >
            <option value="All">All Statuses</option>
            <option value="Verified">Verified</option>
            <option value="Active Monitoring">Active Monitoring</option>
            <option value="Admin Approved">Admin Approved</option>
            <option value="Submitted">Submitted</option>
          </select>

          {/* Verification Status */}
          <select
            value={verification}
            onChange={(e) => setVerification(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-800 focus:ring-1 focus:ring-teal-500"
          >
            <option value="All">All Verification Stages</option>
            <option value="Verified">Independently Verified Only</option>
            <option value="Pending">Pending Verification</option>
          </select>

          {(search || ecosystem !== 'All' || status !== 'All' || verification !== 'All') && (
            <button
              onClick={() => {
                setSearch('');
                setEcosystem('All');
                setStatus('All');
                setVerification('All');
              }}
              className="text-teal-700 hover:text-teal-900 font-semibold underline ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Registry Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                <th className="py-3 px-4">Registry Code</th>
                <th className="py-3 px-4">Project ID & Name</th>
                <th className="py-3 px-4">Ecosystem</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Area (ha)</th>
                <th className="py-3 px-4">Developer</th>
                <th className="py-3 px-4">Est. Removals</th>
                <th className="py-3 px-4">Verification Stage</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                    <span>Loading registry records...</span>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Database className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No registry records found matching criteria.</p>
                    <p className="text-[11px] mt-1">Try broadening your search or resetting filters.</p>
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-navy-900">
                      {r.registry_code}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-navy-900 hover:text-teal-700 cursor-pointer" onClick={() => onViewProject(r.project_id)}>
                        {r.project_name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">{r.project_code}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={r.ecosystem_type} type="ecosystem" size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {r.location}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-navy-900">
                      {r.project_area.toLocaleString()} ha
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {r.developer}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-700">
                      {r.estimated_carbon_removals.toLocaleString()} tCO₂e
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={r.verification_status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onViewProject(r.project_id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded font-semibold transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </button>
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
