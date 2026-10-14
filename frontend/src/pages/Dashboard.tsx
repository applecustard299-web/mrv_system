import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { DashboardMetrics } from '../types';
import { MetricCard } from '../components/common/MetricCard';
import { ProjectMap } from '../components/map/ProjectMap';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { useAuth } from '../context/AuthContext';
import {
  Trees, Waves, Wind, ShieldCheck, Clock, FileCheck2,
  AlertCircle, ArrowUpRight, Plus, RefreshCw, ChevronRight, CheckCircle2
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, Legend
} from 'recharts';

interface DashboardProps {
  onNavigate: (tab: any, projectId?: number) => void;
}

const ECOSYSTEM_COLORS = ['#15803D', '#0284C7', '#D97706'];

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { role } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      const data = await api.getDashboardMetrics();
      setMetrics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Loading database statistics...</p>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center text-rose-800">
        <AlertCircle className="w-8 h-8 mx-auto text-rose-600 mb-2" />
        <p className="font-bold">Failed to load metrics</p>
        <p className="text-xs text-rose-600 mt-1">{error}</p>
        <button
          onClick={fetchMetrics}
          className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-navy-900 tracking-tight">
            Blue Carbon MRV Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time digital registry tracking restoration, carbon accumulation & third-party verification
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {['Administrator', 'Project Developer'].includes(role) && (
            <button
              onClick={() => onNavigate('register')}
              className="flex items-center gap-2 px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Register Project</span>
            </button>
          )}
          {['Administrator', 'MRV Officer'].includes(role) && (
            <button
              onClick={() => onNavigate('verification')}
              className="flex items-center gap-2 px-3.5 py-2 bg-ocean-600 hover:bg-ocean-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Verification Queue ({metrics.total_awaiting_verification})</span>
            </button>
          )}
          <button
            onClick={fetchMetrics}
            title="Refresh database records"
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          title="Total Projects"
          value={metrics.total_registered_projects}
          unit="sites"
          subtitle="Mangrove, Seagrass, Wetland"
          icon={<Trees className="w-5 h-5 text-teal-700" />}
          colorScheme="teal"
        />
        <MetricCard
          title="Mapped Area"
          value={metrics.total_mapped_area_ha.toLocaleString()}
          unit="ha"
          subtitle="Georeferenced boundaries"
          icon={<Waves className="w-5 h-5 text-ocean-600" />}
          colorScheme="ocean"
        />
        <MetricCard
          title="Est. Net Removals"
          value={metrics.total_estimated_carbon_removals_tco2e.toLocaleString()}
          unit="tCO₂e"
          subtitle="Tier-2 Net Accumulation"
          icon={<Wind className="w-5 h-5 text-mangrove-700" />}
          colorScheme="mangrove"
          trend="+18.4% yoy"
        />
        <MetricCard
          title="Awaiting Review"
          value={metrics.total_awaiting_verification}
          unit="reports"
          subtitle="Submitted MRV records"
          icon={<Clock className="w-5 h-5 text-amber-700" />}
          colorScheme="amber"
        />
        <MetricCard
          title="Independently Verified"
          value={metrics.total_approved_verified_projects}
          unit="projects"
          subtitle={`${metrics.total_rejected_projects} applications rejected`}
          icon={<ShieldCheck className="w-5 h-5 text-emerald-700" />}
          colorScheme="mangrove"
        />
        <MetricCard
          title="Under Monitoring"
          value={metrics.total_under_monitoring}
          unit="projects"
          subtitle="Field sensors & plots active"
          icon={<FileCheck2 className="w-5 h-5 text-slate-700" />}
          colorScheme="slate"
        />
      </div>

      {/* Interactive Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Projects by Ecosystem */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-navy-900 text-sm">Projects by Coastal Ecosystem</h3>
              <p className="text-xs text-slate-400">Distribution across Mangrove, Seagrass & Saltmarsh</p>
            </div>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
              Ecosystem Share
            </span>
          </div>
          <div className="h-60 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.ecosystem_distribution}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                  paddingAngle={4}
                  label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                >
                  {metrics.ecosystem_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={ECOSYSTEM_COLORS[index % ECOSYSTEM_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, name: any, item: any) => [
                    `${value} projects (${item.payload.area_ha.toLocaleString()} ha)`,
                    name
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center text-xs">
            {metrics.ecosystem_distribution.map((e, idx) => (
              <div key={e.name} className="p-1.5 rounded bg-slate-50">
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ECOSYSTEM_COLORS[idx % 3] }} />
                  {e.name.split(' ')[0]}
                </div>
                <div className="font-bold text-navy-900 text-xs mt-0.5">{e.count ?? 0} Projects</div>
                <div className="text-[10px] text-teal-700 font-semibold">{(e.area_ha ?? 0).toLocaleString()} ha</div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: Project Area by Region */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-navy-900 text-sm">Project Area by Coastal Jurisdiction</h3>
              <p className="text-xs text-slate-400">Total verified and mapped hectares per region</p>
            </div>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
              Hectares (ha)
            </span>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.regional_area_distribution} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="region" tick={{ fontSize: 10, fill: '#64748B' }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                <Tooltip formatter={(value: any) => [`${value} ha`, 'Total Area']} />
                <Bar dataKey="area_ha" fill="#0F766E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="pt-2 text-[11px] text-slate-400 italic text-right">
            Based on ground-truthed polygons recorded in registry records.
          </div>
        </div>

        {/* Chart 3: Estimated Carbon Removals Timeline */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-navy-900 text-sm">Cumulative Blue Carbon Removals (tCO₂e)</h3>
              <p className="text-xs text-slate-400">Net carbon accumulation trajectory across reporting intervals</p>
            </div>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200">
              Verified & Estimated
            </span>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.carbon_removals_timeline} margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCarbon" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#14B8A6" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip formatter={(val: any) => [`${val.toLocaleString()} tCO₂e`, 'Cumulative Removals']} />
                <Area type="monotone" dataKey="cumulative_tco2e" stroke="#0F766E" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCarbon)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Verification Funnel */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-navy-900 text-sm">MRV Workflow Progression Funnel</h3>
              <p className="text-xs text-slate-400">Project pipeline stages from registration to independent certification</p>
            </div>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
              Lifecycle Stage
            </span>
          </div>
          <div className="space-y-3 pt-2">
            {metrics.verification_status_funnel.map((item, idx) => {
              const maxCount = Math.max(...metrics.verification_status_funnel.map(i => i.count), 1);
              const pct = (item.count / maxCount) * 100;
              return (
                <div key={item.stage} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-navy-900 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      {item.stage}
                    </span>
                    <span className="text-teal-700">{item.count} projects</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-teal-600 to-ocean-500 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, 8)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Geospatial Map Snapshot */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-navy-900">Geospatial Project Distribution</h2>
            <p className="text-xs text-slate-500">Live global map of active restoration sites and polygons</p>
          </div>
          <button
            onClick={() => onNavigate('map')}
            className="flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900"
          >
            <span>Full Map Explorer</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <ErrorBoundary>
          <ProjectMap
            heightClass="h-[380px]"
            onSelectProject={(id) => onNavigate('registry', id)}
          />
        </ErrorBoundary>
      </div>

      {/* Recent Audit Activities */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-navy-900 text-sm">Recent Audit Activities</h3>
            <p className="text-xs text-slate-400">Immutable application-level audit logging of project changes</p>
          </div>
          <button
            onClick={() => onNavigate('audit')}
            className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1"
          >
            <span>View Full Audit Trail</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {metrics.recent_activities.map((act) => (
            <div key={act.id} className="py-2.5 flex items-center justify-between text-xs gap-4">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                  {act.action}
                </span>
                <span className="text-slate-800 font-medium">{act.change_summary}</span>
              </div>
              <div className="text-slate-400 text-[11px] shrink-0">
                {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
