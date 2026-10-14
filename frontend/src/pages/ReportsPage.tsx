import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Project, MonitoringReport } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { useAuth } from '../context/AuthContext';
import {
  FileText, Download, Plus, Eye, CheckCircle2,
  AlertCircle, RefreshCw, Calendar, ArrowRight
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { user, role } = useAuth();
  const [reports, setReports] = useState<MonitoringReport[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [previewReport, setPreviewReport] = useState<MonitoringReport | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState({
    project_id: 1,
    reporting_period_start: '2025-01-01',
    reporting_period_end: '2025-12-31',
    summary: 'Comprehensive annual blue carbon monitoring report assessing vegetation canopy coverage, seedling survival rate, and sediment accretion over the reporting interval.',
    calculated_net_tco2e: 7850.0
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [rList, pList] = await Promise.all([
        api.getReports(),
        api.getProjects()
      ]);
      setReports(rList);
      setProjects(pList);
      if (pList.length > 0) {
        setForm(prev => ({ ...prev, project_id: pList[0].id }));
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update calculated net removals dynamically when project changes
  const handleProjectSelect = (projId: number) => {
    const proj = projects.find(p => p.id === projId);
    let net = 5000.0;
    if (proj) {
      const factor = proj.ecosystem_type.includes('Mangrove') ? 9.4 : (proj.ecosystem_type.includes('Seagrass') ? 4.5 : 6.8);
      net = Math.round(proj.total_area_ha * factor * 0.8);
    }
    setForm(prev => ({ ...prev, project_id: projId, calculated_net_tco2e: net }));
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.createReport({
        project_id: Number(form.project_id),
        reporting_period_start: form.reporting_period_start,
        reporting_period_end: form.reporting_period_end,
        summary: form.summary,
        calculated_net_tco2e: Number(form.calculated_net_tco2e)
      });
      setShowCreateModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to submit monitoring report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-navy-900 tracking-tight">Structured Monitoring Reports</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 font-semibold">
              MRV Pillar 2
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Compile field measurements into standardized MRV reports and export downloadable PDF summaries.
          </p>
        </div>

        {['Administrator', 'Project Developer'].includes(role) && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Monitoring Report</span>
          </button>
        )}
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                <th className="py-3 px-4">Report Code</th>
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4">Reporting Period</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Calculated Net Removals</th>
                <th className="py-3 px-4">Verification Audit</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                    <span>Loading reports...</span>
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No monitoring reports generated yet.</p>
                  </td>
                </tr>
              ) : (
                reports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-navy-900">
                      {r.report_code}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-navy-900">{r.project_name}</div>
                      <div className="text-[11px] font-mono text-slate-400">{r.project_code}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {r.reporting_period_start} to {r.reporting_period_end}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={r.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-700">
                      {r.calculated_net_tco2e.toLocaleString()} tCO₂e
                    </td>
                    <td className="py-3.5 px-4">
                      {r.verification_review ? (
                        <span className="font-mono text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                          {r.verification_review.certificate_number || 'Verified'}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Pending MRV Review</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => setPreviewReport(r)}
                          className="p-1.5 text-slate-600 hover:text-navy-900 hover:bg-slate-100 rounded"
                          title="Preview in Browser"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <a
                          href={api.getReportPdfUrl(r.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded font-semibold transition-colors"
                          title="Download Official PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Monitoring Report */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-navy-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-navy-900 text-base">Generate Structured MRV Monitoring Report</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-xs text-rose-700">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateReport} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Registered Project *</label>
                <select
                  value={form.project_id}
                  onChange={(e) => handleProjectSelect(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.project_code} - {p.name} ({p.total_area_ha} ha)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reporting Period Start *</label>
                  <input
                    type="date"
                    value={form.reporting_period_start}
                    onChange={(e) => setForm(prev => ({ ...prev, reporting_period_start: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reporting Period End *</label>
                  <input
                    type="date"
                    value={form.reporting_period_end}
                    onChange={(e) => setForm(prev => ({ ...prev, reporting_period_end: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Calculated Net Removals (tCO₂e) *</label>
                <input
                  type="number"
                  step={0.1}
                  value={form.calculated_net_tco2e}
                  onChange={(e) => setForm(prev => ({ ...prev, calculated_net_tco2e: parseFloat(e.target.value) || 0 }))}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-navy-900"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Autofilled from ecosystem carbon accumulation factor and ground project area minus conservative uncertainty buffer.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Monitoring Summary & Findings *</label>
                <textarea
                  rows={4}
                  value={form.summary}
                  onChange={(e) => setForm(prev => ({ ...prev, summary: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold shadow-sm"
                >
                  {submitting ? 'Generating Report...' : 'Submit to Verification Queue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: In-App Preview */}
      {previewReport && (
        <div className="fixed inset-0 z-50 bg-navy-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-teal-800">{previewReport.report_code}</span>
                <h3 className="font-bold text-navy-900 text-base mt-0.5">Report Preview</h3>
              </div>
              <button onClick={() => setPreviewReport(null)} className="text-slate-400 hover:text-slate-700 text-sm font-bold">✕</button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <p><strong>Project:</strong> {previewReport.project_name} ({previewReport.project_code})</p>
              <p><strong>Reporting Interval:</strong> {previewReport.reporting_period_start} to {previewReport.reporting_period_end}</p>
              <p><strong>Net Removals Claimed:</strong> {previewReport.calculated_net_tco2e.toLocaleString()} tCO₂e</p>
              <p><strong>Status:</strong> <StatusBadge status={previewReport.status} size="sm" /></p>
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-navy-900">Executive Summary & Field Observations</h4>
              <p className="text-slate-600 leading-relaxed bg-white p-3 rounded border border-slate-100">
                {previewReport.summary}
              </p>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <a
                href={api.getReportPdfUrl(previewReport.id)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold"
              >
                <Download className="w-4 h-4" />
                <span>Download Report PDF</span>
              </a>
              <button
                onClick={() => setPreviewReport(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
