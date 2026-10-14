import React, { useEffect, useState, useRef } from 'react';
import { api } from '../api';
import { Project, MonitoringEvent, MonitoringReport, DocumentFile } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, MapPin, Calendar, Trees, FileText, Download,
  CheckCircle2, AlertTriangle, ShieldCheck, Activity, RefreshCw, ExternalLink
} from 'lucide-react';
import L from 'leaflet';

interface ProjectDetailProps {
  projectId: number;
  onBack: () => void;
  onNavigateToMonitoring?: () => void;
  onNavigateToReports?: () => void;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({
  projectId,
  onBack,
  onNavigateToMonitoring,
  onNavigateToReports
}) => {
  const { role } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [events, setEvents] = useState<MonitoringEvent[]>([]);
  const [reports, setReports] = useState<MonitoringReport[]>([]);
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const proj = await api.getProject(projectId);
      setProject(proj);

      const [evts, rpts, docs] = await Promise.all([
        api.getMonitoringEvents(projectId),
        api.getReports(projectId),
        api.getDocuments(projectId)
      ]);
      setEvents(evts);
      setReports(rpts);
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load project details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  // Leaflet map initialization
  useEffect(() => {
    if (!project || !mapRef.current) return;

    if (!leafletMap.current) {
      const map = L.map(mapRef.current, {
        center: [project.latitude, project.longitude],
        zoom: 12,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      // Add center marker
      const marker = L.marker([project.latitude, project.longitude]).addTo(map);
      marker.bindPopup(`<b>${project.name}</b><br/>Area: ${project.total_area_ha} ha`).openPopup();

      // Add boundary if present
      if (project.boundary && project.boundary.geojson_geometry) {
        try {
          const geom = JSON.parse(project.boundary.geojson_geometry);
          const polyLayer = L.geoJSON({ type: "Feature", geometry: geom, properties: {} } as any, {
            style: {
              color: '#0F766E',
              weight: 2,
              fillColor: '#14B8A6',
              fillOpacity: 0.3,
            }
          }).addTo(map);
          map.fitBounds(polyLayer.getBounds());
        } catch (e) {
          console.warn("Could not parse boundary GeoJSON:", e);
        }
      }

      leafletMap.current = map;
    }
  }, [project]);

  const handleAdminApprove = async () => {
    if (!project) return;
    setActionLoading(true);
    try {
      await api.updateProjectStatus(project.id, 'Admin Approved', 'Administrative registration criteria verified.');
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdminReject = async () => {
    if (!project) return;
    setActionLoading(true);
    try {
      await api.updateProjectStatus(project.id, 'Rejected', 'Application does not meet initial eligibility criteria.');
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading || !project) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-navy-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Registry List</span>
      </button>

      {/* Hero Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200">
                {project.project_code}
              </span>
              <StatusBadge status={project.ecosystem_type} type="ecosystem" />
              <StatusBadge status={project.status} />
            </div>
            <h1 className="text-2xl font-bold text-navy-900 tracking-tight">{project.name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {project.site_name}, {project.region}, {project.country}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Started: {project.start_date} ({project.duration_years} yr duration)
              </span>
              <span className="font-semibold text-navy-900">
                Area: {project.total_area_ha.toLocaleString()} ha
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            {role === 'Administrator' && project.status === 'Submitted' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAdminApprove}
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                >
                  Approve Registration
                </button>
                <button
                  onClick={handleAdminReject}
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                >
                  Reject
                </button>
              </div>
            )}
            {['Administrator', 'Project Developer'].includes(role) && (
              <button
                onClick={onNavigateToMonitoring}
                className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg text-xs font-bold border border-teal-200 transition-colors"
              >
                + Log Monitoring Event
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
          {project.description}
        </p>
      </div>

      {/* Grid: Map & Baseline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leaflet Project Boundary Map */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="mb-3">
            <h3 className="text-sm font-bold text-navy-900">Project Boundary & Geographic Coordinates</h3>
            <p className="text-xs text-slate-400">Lat: {project.latitude}, Lng: {project.longitude}</p>
          </div>
          <div ref={mapRef} className="h-64 w-full rounded-xl border border-slate-200 overflow-hidden" />
          <p className="text-[11px] text-slate-400 mt-2">
            Polygon area: {project.boundary?.area_ha.toLocaleString() || project.total_area_ha} ha.
          </p>
        </div>

        {/* Baseline Assessment */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-navy-900">Baseline Assessment Data</h3>
            <p className="text-xs text-slate-400">Pre-project ecosystem state & reference values</p>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 text-xs">
            <div className="text-[11px] uppercase font-bold text-slate-400">Initial Degradation Condition:</div>
            <p className="font-semibold text-navy-900">
              {project.baseline?.initial_condition || 'Baseline survey recorded'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-100">
              <span className="text-[10px] text-slate-500 font-medium">Vegetation Cover</span>
              <p className="text-lg font-bold text-teal-800 mt-0.5">
                {project.baseline?.baseline_vegetation_pct || 15}%
              </p>
            </div>
            <div className="p-3 bg-ocean-50/60 rounded-xl border border-ocean-100">
              <span className="text-[10px] text-slate-500 font-medium">Biomass Density</span>
              <p className="text-lg font-bold text-ocean-700 mt-0.5">
                {project.baseline?.baseline_biomass_t_ha || 10} <span className="text-xs">t/ha</span>
              </p>
            </div>
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
              <span className="text-[10px] text-slate-500 font-medium">Soil Carbon (SOC)</span>
              <p className="text-lg font-bold text-emerald-800 mt-0.5">
                {project.baseline?.baseline_soc_t_ha || 80} <span className="text-xs">tC/ha</span>
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 space-y-1">
            <p><strong>Methodology Reference:</strong> {project.baseline?.methodology_ref || 'IPCC Wetlands Tier 2'}</p>
            <p><strong>Baseline Measurement Date:</strong> {project.baseline?.measurement_date || project.start_date}</p>
          </div>
        </div>
      </div>

      {/* Monitoring Events & Field Observations */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-navy-900">Monitoring Events & Field Logsheets</h3>
            <p className="text-xs text-slate-400">Permanent plot observations, vegetation canopy & survival rates</p>
          </div>
          {['Administrator', 'Project Developer'].includes(role) && (
            <button
              onClick={onNavigateToMonitoring}
              className="text-xs font-semibold text-teal-700 hover:text-teal-900"
            >
              Log New Event →
            </button>
          )}
        </div>

        {events.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            <Activity className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            No monitoring events recorded yet for this project.
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((evt) => {
              const m = evt.measurements[0];
              return (
                <div key={evt.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex flex-wrap items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-navy-900">{evt.event_code}</span>
                      <span className="text-slate-400">|</span>
                      <span className="text-slate-600 font-medium">{evt.monitoring_type}</span>
                    </div>
                    <span className="text-slate-500 font-medium">Date: {evt.event_date} (By {evt.responsible_person})</span>
                  </div>

                  {m && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-400">Canopy Cover:</span>
                        <p className="font-bold text-teal-800">{m.canopy_cover_pct || 'N/A'}%</p>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-400">Survival Rate:</span>
                        <p className="font-bold text-emerald-800">{m.survival_rate_pct || 'N/A'}%</p>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-400">Sediment Accretion:</span>
                        <p className="font-bold text-navy-900">{m.sediment_accretion_mm || 'N/A'} mm/yr</p>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-400">Restoration Progress:</span>
                        <p className="font-bold text-navy-900">{m.restoration_progress_pct}%</p>
                      </div>
                    </div>
                  )}

                  {evt.notes && <p className="text-xs text-slate-500 italic mt-1">{evt.notes}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Monitoring Reports & PDF Downloads */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-navy-900">Published Reports & Verification Records</h3>
            <p className="text-xs text-slate-400">Audit-ready MRV summaries with verifiable PDF download</p>
          </div>
        </div>

        {reports.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">
            No monitoring reports submitted for this project yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {reports.map((rep) => (
              <div key={rep.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-navy-900">{rep.report_code}</span>
                    <StatusBadge status={rep.status} size="sm" />
                    {rep.verification_review?.certificate_number && (
                      <span className="font-mono text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                        {rep.verification_review.certificate_number}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 line-clamp-1">{rep.summary}</p>
                  <p className="text-[11px] text-slate-400">
                    Period: {rep.reporting_period_start} to {rep.reporting_period_end} • Net Removals: {rep.calculated_net_tco2e.toLocaleString()} tCO₂e
                  </p>
                </div>
                <a
                  href={api.getReportPdfUrl(rep.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Report (PDF)</span>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Supporting Documents Gallery */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-navy-900">Supporting Project Evidence & Documentation</h3>
        {documents.length === 0 ? (
          <p className="text-xs text-slate-400">No public documents uploaded.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {documents.map((doc) => (
              <div key={doc.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 truncate">
                  <FileText className="w-5 h-5 text-teal-700 shrink-0" />
                  <div className="truncate">
                    <p className="font-semibold text-navy-900 truncate">{doc.original_name}</p>
                    <p className="text-[10px] text-slate-400">{doc.doc_category} • {doc.file_size_kb} KB</p>
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
    </div>
  );
};
