import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { MonitoringReport, VerificationReview } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { useAuth } from '../context/AuthContext';
import {
  CheckCircle2, AlertTriangle, ShieldCheck, FileCheck, RefreshCw,
  Search, Eye, Clock, Check, X, RotateCcw, Download
} from 'lucide-react';

export const VerificationPortal: React.FC = () => {
  const { user, role } = useAuth();
  const [queue, setQueue] = useState<MonitoringReport[]>([]);
  const [history, setHistory] = useState<VerificationReview[]>([]);
  const [selectedReport, setSelectedReport] = useState<MonitoringReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Review Form State
  const [decision, setDecision] = useState<'Approved' | 'Corrections Requested' | 'Rejected'>('Approved');
  const [findings, setFindings] = useState('Field plot GPS transects and soil core spectrophotometry correlate with reported canopy cover and sediment accretion metrics. Conservative Tier-2 uncertainty buffers applied correctly.');
  const [correctionNotes, setCorrectionNotes] = useState('');
  const [statement, setStatement] = useState('The independent verification body certifies that the net blue carbon removals reported have occurred with acceptable scientific certainty according to VM0033 / IPCC Wetlands methodology.');

  // Checklist State
  const [checklist, setChecklist] = useState({
    boundaryMatches: true,
    canopyCoverVerified: true,
    uncertaintyBufferDeducted: true,
    baselineConsistent: true
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [q, h] = await Promise.all([
        api.getVerificationQueue(),
        api.getVerificationHistory()
      ]);
      setQueue(q);
      setHistory(h);
      if (q.length > 0 && !selectedReport) {
        setSelectedReport(q[0]);
      }
    } catch (err) {
      console.error('Failed to load verification queue:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmitDecision = async () => {
    if (!selectedReport) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.submitVerificationDecision(selectedReport.id, {
        decision,
        findings_summary: findings,
        correction_notes: decision === 'Corrections Requested' ? correctionNotes : undefined,
        verification_statement: decision === 'Approved' ? statement : undefined,
      });
      setSelectedReport(null);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to submit verification decision');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-navy-900 tracking-tight">Independent MRV Verification Portal</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
              MRV Pillar 3
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit submitted monitoring reports, cross-examine evidence, and issue official verification statements.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition-colors shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Queue ({queue.length})</span>
        </button>
      </div>

      {/* Main Review Section (Queue & Inspection Workbench) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Verification Queue List */}
        <div className="lg:col-span-5 space-y-3">
          <h2 className="text-sm font-bold text-navy-900 flex items-center justify-between">
            <span>Awaiting Review Queue ({queue.length})</span>
            <span className="text-[11px] text-slate-400 font-normal">Pending Officer Audit</span>
          </h2>

          {queue.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
              <p className="font-bold text-navy-900">Verification Queue is Clear</p>
              <p className="text-[11px] text-slate-500 mt-0.5">All submitted reports have been reviewed.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {queue.map((rep) => {
                const isSelected = selectedReport?.id === rep.id;
                return (
                  <div
                    key={rep.id}
                    onClick={() => setSelectedReport(rep)}
                    className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-teal-50/70 border-teal-500 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono font-bold text-navy-900">{rep.report_code}</span>
                      <StatusBadge status={rep.status} size="sm" />
                    </div>
                    <p className="font-bold text-navy-900 line-clamp-1">{rep.project_name}</p>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                      <span>Period: {rep.reporting_period_start.split('-')[0]}</span>
                      <span className="font-bold text-emerald-700">{rep.calculated_net_tco2e.toLocaleString()} tCO₂e</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Verification Inspection Workbench */}
        <div className="lg:col-span-7">
          {selectedReport ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    {selectedReport.report_code}
                  </span>
                  <h3 className="text-base font-bold text-navy-900 mt-1">
                    MRV Evidence Audit Workbench
                  </h3>
                </div>
                <a
                  href={api.getReportPdfUrl(selectedReport.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-teal-700 font-bold hover:underline"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Report Document</span>
                </a>
              </div>

              {/* Report Summary Details */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Project:</span>
                    <p className="font-bold text-navy-900">{selectedReport.project_name}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Net Carbon Removals Claimed:</span>
                    <p className="font-bold text-emerald-800 text-sm">{selectedReport.calculated_net_tco2e.toLocaleString()} tCO₂e</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Report Summary & Observations:</span>
                  <p className="text-slate-700 mt-0.5 leading-relaxed">{selectedReport.summary}</p>
                </div>
              </div>

              {/* Verification Checklist */}
              <div className="space-y-2.5">
                <span className="font-bold text-xs text-navy-900 uppercase tracking-wider text-slate-400 block">
                  Mandatory Verification Checklist
                </span>
                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.boundaryMatches}
                      onChange={(e) => setChecklist(prev => ({ ...prev, boundaryMatches: e.target.checked }))}
                      className="rounded text-teal-700 focus:ring-teal-500 w-4 h-4"
                    />
                    <span>Georeferenced field survey plots match GIS boundary polygon coordinates.</span>
                  </label>
                  <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.canopyCoverVerified}
                      onChange={(e) => setChecklist(prev => ({ ...prev, canopyCoverVerified: e.target.checked }))}
                      className="rounded text-teal-700 focus:ring-teal-500 w-4 h-4"
                    />
                    <span>Canopy cover and survival rates corroborated by field photo/drone evidence.</span>
                  </label>
                  <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.uncertaintyBufferDeducted}
                      onChange={(e) => setChecklist(prev => ({ ...prev, uncertaintyBufferDeducted: e.target.checked }))}
                      className="rounded text-teal-700 focus:ring-teal-500 w-4 h-4"
                    />
                    <span>Conservative uncertainty buffer deduction applied in accordance with Tier-2 methodology.</span>
                  </label>
                </div>
              </div>

              {/* Decision Selector */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-navy-900">
                  Verification Audit Determination:
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setDecision('Approved')}
                    className={`p-2.5 rounded-lg font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      decision === 'Approved'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve & Certify</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecision('Corrections Requested')}
                    className={`p-2.5 rounded-lg font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      decision === 'Corrections Requested'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50'
                    }`}
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Request Fixes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecision('Rejected')}
                    className={`p-2.5 rounded-lg font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      decision === 'Rejected'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-rose-50'
                    }`}
                  >
                    <X className="w-4 h-4" />
                    <span>Reject Report</span>
                  </button>
                </div>

                {/* Findings & Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Audit Findings & Technical Justification *
                  </label>
                  <textarea
                    rows={3}
                    value={findings}
                    onChange={(e) => setFindings(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>

                {decision === 'Approved' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Official Verification Statement
                    </label>
                    <textarea
                      rows={2}
                      value={statement}
                      onChange={(e) => setStatement(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-emerald-50/40"
                    />
                  </div>
                )}

                {decision === 'Corrections Requested' && (
                  <div>
                    <label className="block text-xs font-semibold text-rose-700 mb-1">
                      Required Corrections & Clarifications for Developer *
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Specify additional drone orthomosaic imagery or plot sample coordinates needed..."
                      value={correctionNotes}
                      onChange={(e) => setCorrectionNotes(e.target.value)}
                      className="w-full border border-amber-300 rounded-lg p-2 text-xs bg-amber-50/40"
                    />
                  </div>
                )}

                {error && (
                  <p className="text-xs text-rose-600">{error}</p>
                )}

                <button
                  type="button"
                  onClick={handleSubmitDecision}
                  disabled={submitting}
                  className="w-full py-2.5 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Recording Verification Audit...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-teal-400" />
                      <span>Execute Verification Decision</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
              <FileCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>Select a report from the queue to start verification inspection.</p>
            </div>
          )}
        </div>
      </div>

      {/* Verification History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-bold text-navy-900 text-sm">Formal Verification Audit Log & Issued Certificates</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                <th className="py-3 px-4">Certificate Number</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Reviewer</th>
                <th className="py-3 px-4">Decision</th>
                <th className="py-3 px-4">Verified Net Removals</th>
                <th className="py-3 px-4">Findings Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-mono font-bold text-navy-900">
                    {h.certificate_number || 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{h.review_date}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{h.mrv_officer_name}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={h.decision} size="sm" />
                  </td>
                  <td className="py-3 px-4 font-bold text-emerald-700">
                    {h.verified_net_removals_tco2e.toLocaleString()} tCO₂e
                  </td>
                  <td className="py-3 px-4 text-slate-600 line-clamp-2 max-w-xs">
                    {h.findings_summary}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
