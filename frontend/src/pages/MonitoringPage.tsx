import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Project, MonitoringEvent, DocumentFile } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Activity, Plus, Upload, FileText, Image as ImageIcon,
  CheckCircle2, AlertCircle, RefreshCw, Filter, Calendar, MapPin, Download
} from 'lucide-react';

export const MonitoringPage: React.FC = () => {
  const { user, role } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [events, setEvents] = useState<MonitoringEvent[]>([]);
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | 'All'>('All');
  const [isLoading, setIsLoading] = useState(true);

  // Modal State for New Event
  const [showEventModal, setShowEventModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Event Form State
  const [eventForm, setEventForm] = useState({
    project_id: 1,
    event_date: new Date().toISOString().split('T')[0],
    responsible_person: user?.full_name || 'Dr. Eleanor Vance',
    monitoring_type: 'Field Survey & Drone UAV Mapping',
    notes: '',
    canopy_cover_pct: 68.0,
    survival_rate_pct: 85.0,
    mean_dbh_cm: 6.2,
    soc_depth_cm: 90.0,
    salinity_ppt: 16.5,
    sediment_accretion_mm: 10.2,
    restoration_progress_pct: 75.0,
    carbon_stock_estimate_tco2e: 4500.0
  });

  // Upload Form State
  const [uploadProjectId, setUploadProjectId] = useState<number>(1);
  const [docCategory, setDocCategory] = useState('Monitoring Evidence');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const projList = await api.getProjects();
      setProjects(projList);
      if (projList.length > 0) {
        setEventForm(prev => ({ ...prev, project_id: projList[0].id }));
        setUploadProjectId(projList[0].id);
      }

      const pId = selectedProjectId !== 'All' ? selectedProjectId : undefined;
      const [evts, docs] = await Promise.all([
        api.getMonitoringEvents(pId),
        api.getDocuments(pId)
      ]);
      setEvents(evts);
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load monitoring data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedProjectId]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);
    try {
      await api.createMonitoringEvent({
        project_id: Number(eventForm.project_id),
        event_date: eventForm.event_date,
        responsible_person: eventForm.responsible_person,
        monitoring_type: eventForm.monitoring_type,
        notes: eventForm.notes,
        measurements: {
          canopy_cover_pct: Number(eventForm.canopy_cover_pct),
          survival_rate_pct: Number(eventForm.survival_rate_pct),
          mean_dbh_cm: Number(eventForm.mean_dbh_cm),
          soc_depth_cm: Number(eventForm.soc_depth_cm),
          salinity_ppt: Number(eventForm.salinity_ppt),
          sediment_accretion_mm: Number(eventForm.sediment_accretion_mm),
          restoration_progress_pct: Number(eventForm.restoration_progress_pct),
          carbon_stock_estimate_tco2e: Number(eventForm.carbon_stock_estimate_tco2e),
          notes: eventForm.notes
        }
      });
      setShowEventModal(false);
      fetchData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to create monitoring event');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setModalError('Please choose a file to upload.');
      return;
    }
    setSubmitting(true);
    setModalError(null);
    try {
      const formData = new FormData();
      formData.append('project_id', uploadProjectId.toString());
      formData.append('doc_category', docCategory);
      formData.append('file', selectedFile);

      await api.uploadEvidence(formData);
      setShowUploadModal(false);
      setSelectedFile(null);
      fetchData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to upload evidence file');
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
            <h1 className="text-xl font-bold text-navy-900 tracking-tight">Monitoring & Evidence Portal</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 font-semibold">
              MRV Pillar 1
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Log periodic ecological surveys, field measurements (canopy, survival, SOC), and upload verifiable evidence.
          </p>
        </div>

        {['Administrator', 'Project Developer', 'MRV Officer'].includes(role) && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition-colors"
            >
              <Upload className="w-4 h-4 text-teal-700" />
              <span>Upload Evidence</span>
            </button>
            <button
              onClick={() => setShowEventModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Log Field Survey</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-navy-900">Filter by Project:</span>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value === 'All' ? 'All' : Number(e.target.value))}
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-800 focus:ring-1 focus:ring-teal-500"
          >
            <option value="All">All Projects ({projects.length})</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={fetchData}
          className="p-1.5 text-slate-500 hover:bg-slate-100 rounded"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Monitoring Events List */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-navy-900">Field Monitoring Events ({events.length})</h2>

        {isLoading ? (
          <div className="text-center py-10 bg-white rounded-xl border border-slate-200">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
            <span className="text-xs text-slate-500">Loading monitoring logs...</span>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
            <Activity className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-600">No monitoring events recorded.</p>
            <p className="text-[11px] mt-1">Use the "Log Field Survey" button to enter field measurements.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {events.map((evt) => {
              const proj = projects.find(p => p.id === evt.project_id);
              const m = evt.measurements[0];
              return (
                <div key={evt.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded">
                        {evt.event_code}
                      </span>
                      <span className="font-bold text-sm text-navy-900">
                        {proj ? `${proj.project_code} • ${proj.name}` : `Project #${evt.project_id}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {evt.event_date}
                      </span>
                      <span>By: <strong>{evt.responsible_person}</strong></span>
                    </div>
                  </div>

                  {/* Quantitative Metrics Grid */}
                  {m && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs">
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
                        <span className="text-[10px] text-slate-400 font-medium">Canopy Cover</span>
                        <p className="text-sm font-bold text-teal-800 mt-0.5">{m.canopy_cover_pct || 'N/A'}%</p>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
                        <span className="text-[10px] text-slate-400 font-medium">Survival Rate</span>
                        <p className="text-sm font-bold text-emerald-800 mt-0.5">{m.survival_rate_pct || 'N/A'}%</p>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
                        <span className="text-[10px] text-slate-400 font-medium">Mean DBH</span>
                        <p className="text-sm font-bold text-navy-900 mt-0.5">{m.mean_dbh_cm ? `${m.mean_dbh_cm} cm` : 'N/A'}</p>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
                        <span className="text-[10px] text-slate-400 font-medium">SOC Depth</span>
                        <p className="text-sm font-bold text-navy-900 mt-0.5">{m.soc_depth_cm ? `${m.soc_depth_cm} cm` : 'N/A'}</p>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
                        <span className="text-[10px] text-slate-400 font-medium">Salinity</span>
                        <p className="text-sm font-bold text-ocean-600 mt-0.5">{m.salinity_ppt ? `${m.salinity_ppt} ppt` : 'N/A'}</p>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
                        <span className="text-[10px] text-slate-400 font-medium">Sediment Accr.</span>
                        <p className="text-sm font-bold text-amber-700 mt-0.5">{m.sediment_accretion_mm ? `${m.sediment_accretion_mm} mm` : 'N/A'}</p>
                      </div>
                      <div className="bg-teal-50 p-2.5 rounded-lg border border-teal-200 text-center">
                        <span className="text-[10px] text-teal-700 font-bold">Progress</span>
                        <p className="text-sm font-bold text-teal-900 mt-0.5">{m.restoration_progress_pct}%</p>
                      </div>
                    </div>
                  )}

                  {evt.notes && (
                    <p className="text-xs text-slate-600 italic bg-slate-50/70 p-2 rounded border border-slate-100">
                      <strong>Field Notes:</strong> {evt.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Uploaded Evidence Gallery */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-navy-900">Uploaded Monitoring Evidence & Files ({documents.length})</h2>
          <span className="text-[11px] text-slate-400">CSV, PDF, JPG, PNG formats supported</span>
        </div>

        {documents.length === 0 ? (
          <p className="text-xs text-slate-400">No evidence documents uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {documents.map((doc) => (
              <div key={doc.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 truncate">
                  <FileText className="w-6 h-6 text-teal-700 shrink-0" />
                  <div className="truncate">
                    <p className="font-semibold text-navy-900 truncate">{doc.original_name}</p>
                    <p className="text-[10px] text-slate-500">
                      {doc.doc_category} • {doc.file_size_kb} KB
                    </p>
                  </div>
                </div>
                <a
                  href={`/${doc.file_path}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-teal-700 hover:bg-teal-100 rounded"
                  title="Download File"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Log Field Survey */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 bg-navy-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-navy-900 text-base">Record New Field Monitoring Event</h3>
              <button onClick={() => setShowEventModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            {modalError && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-xs text-rose-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Registered Project *</label>
                  <select
                    value={eventForm.project_id}
                    onChange={(e) => setEventForm(prev => ({ ...prev, project_id: Number(e.target.value) }))}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Survey Date *</label>
                  <input
                    type="date"
                    value={eventForm.event_date}
                    onChange={(e) => setEventForm(prev => ({ ...prev, event_date: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Responsible Ecologist / Officer *</label>
                  <input
                    type="text"
                    value={eventForm.responsible_person}
                    onChange={(e) => setEventForm(prev => ({ ...prev, responsible_person: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Monitoring Methodology *</label>
                  <select
                    value={eventForm.monitoring_type}
                    onChange={(e) => setEventForm(prev => ({ ...prev, monitoring_type: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5"
                  >
                    <option value="Field Survey & Drone UAV Mapping">Field Survey & Drone UAV Mapping</option>
                    <option value="Benthic Soil Coring & RTK GPS Survey">Benthic Soil Coring & RTK GPS Survey</option>
                    <option value="Permanent Vegetation Transect Plots">Permanent Vegetation Transect Plots</option>
                    <option value="High-Res Satellite Multispectral Remote Sensing">High-Res Satellite Multispectral Remote Sensing</option>
                  </select>
                </div>
              </div>

              {/* Measurements */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="font-bold text-navy-900 block text-[11px] uppercase tracking-wider">
                  Quantitative Biometric Measurements
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Canopy Cover (%)</label>
                    <input
                      type="number"
                      step={0.1}
                      value={eventForm.canopy_cover_pct}
                      onChange={(e) => setEventForm(prev => ({ ...prev, canopy_cover_pct: parseFloat(e.target.value) || 0 }))}
                      className="w-full border border-slate-300 rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Survival Rate (%)</label>
                    <input
                      type="number"
                      step={0.1}
                      value={eventForm.survival_rate_pct}
                      onChange={(e) => setEventForm(prev => ({ ...prev, survival_rate_pct: parseFloat(e.target.value) || 0 }))}
                      className="w-full border border-slate-300 rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Mean DBH (cm)</label>
                    <input
                      type="number"
                      step={0.1}
                      value={eventForm.mean_dbh_cm}
                      onChange={(e) => setEventForm(prev => ({ ...prev, mean_dbh_cm: parseFloat(e.target.value) || 0 }))}
                      className="w-full border border-slate-300 rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Sediment Accretion (mm)</label>
                    <input
                      type="number"
                      step={0.1}
                      value={eventForm.sediment_accretion_mm}
                      onChange={(e) => setEventForm(prev => ({ ...prev, sediment_accretion_mm: parseFloat(e.target.value) || 0 }))}
                      className="w-full border border-slate-300 rounded px-2 py-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Soil Core Depth (cm)</label>
                    <input
                      type="number"
                      step={0.1}
                      value={eventForm.soc_depth_cm}
                      onChange={(e) => setEventForm(prev => ({ ...prev, soc_depth_cm: parseFloat(e.target.value) || 0 }))}
                      className="w-full border border-slate-300 rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Salinity (ppt)</label>
                    <input
                      type="number"
                      step={0.1}
                      value={eventForm.salinity_ppt}
                      onChange={(e) => setEventForm(prev => ({ ...prev, salinity_ppt: parseFloat(e.target.value) || 0 }))}
                      className="w-full border border-slate-300 rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Overall Restoration %</label>
                    <input
                      type="number"
                      step={1}
                      min={0}
                      max={100}
                      value={eventForm.restoration_progress_pct}
                      onChange={(e) => setEventForm(prev => ({ ...prev, restoration_progress_pct: parseFloat(e.target.value) || 0 }))}
                      className="w-full border border-slate-300 rounded px-2 py-1 font-bold text-teal-800"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Field Observations & Remarks</label>
                <textarea
                  rows={3}
                  value={eventForm.notes}
                  onChange={(e) => setEventForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Record tidal flow observations, wildlife recolonization, natural propagation, or seedling stress factors..."
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold shadow-sm"
                >
                  {submitting ? 'Saving Event...' : 'Save Monitoring Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Upload Evidence File */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-navy-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-navy-900 text-base">Upload Evidence File</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            {modalError && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-xs text-rose-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handleUploadFile} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Project *</label>
                <select
                  value={uploadProjectId}
                  onChange={(e) => setUploadProjectId(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Evidence Category *</label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5"
                >
                  <option value="Monitoring Evidence">Monitoring Evidence / Field Transects</option>
                  <option value="Drone Imagery">Drone Aerial Orthomosaic Survey</option>
                  <option value="Soil Core Spectrometry">Soil Core Laboratory Spectrometry</option>
                  <option value="Project Design Document">Project Design Document (PDD)</option>
                  <option value="Site Authorization">Land / Site Authorization Document</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select File (CSV, PDF, JPG, PNG) *</label>
                <input
                  type="file"
                  accept=".pdf,.csv,.jpg,.jpeg,.png"
                  onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedFile}
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold shadow-sm"
                >
                  {submitting ? 'Uploading...' : 'Upload Evidence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
