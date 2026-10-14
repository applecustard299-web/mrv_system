import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { CarbonFactor, Project, CarbonCalculation } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Calculator, Sparkles, AlertCircle, Info, RefreshCw, CheckCircle2,
  Sliders, Settings, BookOpen, Clock, ShieldCheck, Save
} from 'lucide-react';

export const CarbonEstimatorPage: React.FC = () => {
  const { role } = useAuth();
  const [factors, setFactors] = useState<CarbonFactor[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [history, setHistory] = useState<CarbonCalculation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Calculator State
  const [selectedProjectId, setSelectedProjectId] = useState<number>(1);
  const [ecosystemType, setEcosystemType] = useState('Mangrove restoration');
  const [areaHa, setAreaHa] = useState<number>(1250);
  const [periodYears, setPeriodYears] = useState<number>(5);
  const [customFactor, setCustomFactor] = useState<number>(9.4);
  const [baselineDiscountPct, setBaselineDiscountPct] = useState<number>(5.0);
  const [uncertaintyPct, setUncertaintyPct] = useState<number>(15.0);
  const [assumptionsNotes, setAssumptionsNotes] = useState('Standard Tier-2 IPPC Wetlands Supplement parameters with 15% uncertainty buffer deduction.');

  // Factor Editor State (Admin only)
  const [editingFactor, setEditingFactor] = useState<CarbonFactor | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [fList, pList] = await Promise.all([
        api.getCarbonFactors(),
        api.getProjects()
      ]);
      setFactors(fList);
      setProjects(pList);

      if (pList.length > 0) {
        setSelectedProjectId(pList[0].id);
        const hist = await api.getCarbonHistory(pList[0].id);
        setHistory(hist);
      }
    } catch (err) {
      console.error('Failed to load carbon factors:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update calculator fields when ecosystem changes
  const handleEcosystemChange = (eco: string) => {
    setEcosystemType(eco);
    const matched = factors.find(f => f.ecosystem_type === eco);
    if (matched) {
      setCustomFactor(matched.factor_value);
      setBaselineDiscountPct(matched.baseline_discount_pct);
      setUncertaintyPct(matched.default_uncertainty_pct);
    }
  };

  // Update calculator when project selection changes
  const handleProjectChange = async (pId: number) => {
    setSelectedProjectId(pId);
    const proj = projects.find(p => p.id === pId);
    if (proj) {
      setAreaHa(proj.total_area_ha);
      handleEcosystemChange(proj.ecosystem_type);
    }
    try {
      const hist = await api.getCarbonHistory(pId);
      setHistory(hist);
    } catch (e) {
      console.error(e);
    }
  };

  // Live mathematical calculations
  const grossAccumulation = areaHa * customFactor * periodYears;
  const baselineDeduction = grossAccumulation * (baselineDiscountPct / 100.0);
  const uncertaintyDeduction = (grossAccumulation - baselineDeduction) * (uncertaintyPct / 100.0);
  const netEstimatedRemovals = grossAccumulation - baselineDeduction - uncertaintyDeduction;

  const handleSaveCalculation = async () => {
    setCalculating(true);
    setSaveSuccess(false);
    try {
      await api.calculateCarbon({
        project_id: selectedProjectId,
        ecosystem_type: ecosystemType,
        area_ha: areaHa,
        period_years: periodYears,
        custom_factor_value: customFactor,
        baseline_discount_pct: baselineDiscountPct,
        uncertainty_pct: uncertaintyPct,
        assumptions_notes: assumptionsNotes
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      const hist = await api.getCarbonHistory(selectedProjectId);
      setHistory(hist);
    } catch (err) {
      console.error('Failed to save calculation:', err);
    } finally {
      setCalculating(false);
    }
  };

  const handleUpdateFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFactor) return;
    try {
      await api.updateCarbonFactor(editingFactor.id, editingFactor);
      setEditingFactor(null);
      await fetchData();
    } catch (err) {
      console.error('Failed to update factor:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-navy-900 tracking-tight">Configurable Carbon Estimation Engine</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 font-semibold">
              Tier-2 IPCC Methodology
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent blue carbon calculation accounting for biomass, soil organic carbon, and conservative uncertainty deductions.
          </p>
        </div>
      </div>

      {/* Critical Scientific & Regulatory Distinctions Banner */}
      <div className="bg-navy-900 text-white p-5 rounded-2xl shadow-md border border-navy-800 space-y-3">
        <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
          <Info className="w-4 h-4" />
          <span>Fundamental Principles of Blue Carbon Accounting</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          The registry strictly distinguishes between four sequential tiers of carbon quantification:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1">
          <div className="bg-navy-800/80 p-3 rounded-xl border border-slate-700">
            <span className="text-[10px] uppercase font-bold text-teal-400">1. Gross Accumulation</span>
            <p className="font-semibold text-white mt-1">Biomass + SOC Stock Gain</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Area × Annual Ecosystem Factor × Years without deductions.</p>
          </div>
          <div className="bg-navy-800/80 p-3 rounded-xl border border-slate-700">
            <span className="text-[10px] uppercase font-bold text-ocean-400">2. Net GHG Removals</span>
            <p className="font-semibold text-white mt-1">Model-Estimated Net Gain</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Gross minus baseline degradation discounts & uncertainty buffers.</p>
          </div>
          <div className="bg-navy-800/80 p-3 rounded-xl border border-slate-700">
            <span className="text-[10px] uppercase font-bold text-amber-400">3. Verified Removals</span>
            <p className="font-semibold text-white mt-1">Audited MRV Statements</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Independently corroborated by an accredited third-party auditor.</p>
          </div>
          <div className="bg-navy-800/80 p-3 rounded-xl border border-slate-700">
            <span className="text-[10px] uppercase font-bold text-rose-400">4. Issued Carbon Credits</span>
            <p className="font-semibold text-white mt-1">Marketable Serialized Units</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Credits are <strong>never automatically issued</strong> merely from calculations.</p>
          </div>
        </div>
      </div>

      {/* Interactive Sandbox Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Input Sliders & Parameters */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-teal-700" />
              <h2 className="text-sm font-bold text-navy-900">Estimation Parameter Sandbox</h2>
            </div>
            <span className="text-[11px] text-slate-400">Live dynamic recalculation</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Registered Project</label>
              <select
                value={selectedProjectId}
                onChange={(e) => handleProjectChange(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500 font-medium"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ecosystem Model</label>
              <select
                value={ecosystemType}
                onChange={(e) => handleEcosystemChange(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500 font-medium"
              >
                <option value="Mangrove restoration">Mangrove restoration</option>
                <option value="Seagrass conservation or restoration">Seagrass conservation</option>
                <option value="Tidal wetland conservation or restoration">Tidal wetland</option>
              </select>
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-4 pt-2 text-xs">
            {/* Project Area Slider */}
            <div>
              <div className="flex items-center justify-between font-semibold mb-1">
                <span className="text-slate-700">Project Area (Hectares):</span>
                <span className="text-teal-800 font-bold font-mono">{areaHa.toLocaleString()} ha</span>
              </div>
              <input
                type="range"
                min={10}
                max={10000}
                step={10}
                value={areaHa}
                onChange={(e) => setAreaHa(parseFloat(e.target.value))}
                className="w-full accent-teal-700 cursor-pointer"
              />
            </div>

            {/* Crediting Period Slider */}
            <div>
              <div className="flex items-center justify-between font-semibold mb-1">
                <span className="text-slate-700">Measurement Period (Years):</span>
                <span className="text-teal-800 font-bold font-mono">{periodYears} Years</span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                step={1}
                value={periodYears}
                onChange={(e) => setPeriodYears(parseInt(e.target.value))}
                className="w-full accent-teal-700 cursor-pointer"
              />
            </div>

            {/* Annual Factor */}
            <div>
              <div className="flex items-center justify-between font-semibold mb-1">
                <span className="text-slate-700">Annual Accumulation Factor (tCO₂e/ha/yr):</span>
                <span className="text-teal-800 font-bold font-mono">{customFactor.toFixed(2)} tCO₂e</span>
              </div>
              <input
                type="range"
                min={1.0}
                max={25.0}
                step={0.1}
                value={customFactor}
                onChange={(e) => setCustomFactor(parseFloat(e.target.value))}
                className="w-full accent-teal-700 cursor-pointer"
              />
            </div>

            {/* Baseline Discount */}
            <div>
              <div className="flex items-center justify-between font-semibold mb-1">
                <span className="text-slate-700">Baseline Degradation Discount (%):</span>
                <span className="text-amber-700 font-bold font-mono">{baselineDiscountPct}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                step={0.5}
                value={baselineDiscountPct}
                onChange={(e) => setBaselineDiscountPct(parseFloat(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
            </div>

            {/* Uncertainty Buffer */}
            <div>
              <div className="flex items-center justify-between font-semibold mb-1">
                <span className="text-slate-700">Uncertainty Buffer Deduction (%):</span>
                <span className="text-rose-700 font-bold font-mono">{uncertaintyPct}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={30}
                step={1}
                value={uncertaintyPct}
                onChange={(e) => setUncertaintyPct(parseFloat(e.target.value))}
                className="w-full accent-rose-600 cursor-pointer"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Scientific Assumptions & Methodology Justification
              </label>
              <textarea
                rows={2}
                value={assumptionsNotes}
                onChange={(e) => setAssumptionsNotes(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2"
              />
            </div>

            {role !== 'Public User' && (
              <button
                type="button"
                onClick={handleSaveCalculation}
                disabled={calculating}
                className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                {calculating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving Calculation Record...</span>
                  </>
                ) : saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>Calculation Saved to Registry Audit!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Commit Calculation to Project Record</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Right: Step-by-Step Mathematical Calculation Result */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-gradient-to-br from-teal-900 to-navy-950 text-white p-6 rounded-2xl shadow-xl space-y-4 border border-teal-800/40">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-teal-300 tracking-wider">
                Preliminary Net Estimate
              </span>
              <Sparkles className="w-5 h-5 text-teal-400" />
            </div>

            <div className="space-y-1">
              <div className="text-4xl font-extrabold text-white tracking-tight">
                {Math.round(netEstimatedRemovals).toLocaleString()}
              </div>
              <div className="text-xs text-teal-200 font-medium">
                Net metric tonnes CO₂ equivalent (tCO₂e)
              </div>
            </div>

            {/* Formula Breakdown Table */}
            <div className="space-y-2 pt-3 border-t border-teal-800/50 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>1. Gross Estimated Accumulation:</span>
                <span className="font-mono font-bold text-white">+{Math.round(grossAccumulation).toLocaleString()} tCO₂e</span>
              </div>
              <div className="text-[10px] text-teal-400 pl-2">
                = {areaHa} ha × {customFactor} t/ha/yr × {periodYears} yrs
              </div>

              <div className="flex items-center justify-between text-slate-300 pt-1">
                <span>2. Baseline Deduction ({baselineDiscountPct}%):</span>
                <span className="font-mono text-amber-300">-{Math.round(baselineDeduction).toLocaleString()} tCO₂e</span>
              </div>

              <div className="flex items-center justify-between text-slate-300 pt-1">
                <span>3. Methodological Uncertainty Buffer ({uncertaintyPct}%):</span>
                <span className="font-mono text-rose-300">-{Math.round(uncertaintyDeduction).toLocaleString()} tCO₂e</span>
              </div>

              <div className="flex items-center justify-between text-teal-200 font-bold pt-2 border-t border-teal-800/80">
                <span>Net Estimated Removals:</span>
                <span className="font-mono text-teal-300 text-sm">{Math.round(netEstimatedRemovals).toLocaleString()} tCO₂e</span>
              </div>
            </div>

            <div className="p-3 bg-teal-950/60 rounded-xl border border-teal-800/40 text-[10px] text-slate-400 italic">
              <strong>Methodological Label:</strong> Preliminary estimate only. Independent MRV verification is mandatory before credit issuance.
            </div>
          </div>

          {/* Project Historical Calculations */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-xs space-y-3">
            <h3 className="font-bold text-navy-900 flex items-center justify-between">
              <span>Project Calculation History</span>
              <Clock className="w-4 h-4 text-slate-400" />
            </h3>

            {history.length === 0 ? (
              <p className="text-slate-400 text-center py-3">No previous calculations recorded.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {history.map((h) => (
                  <div key={h.id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-navy-900">{h.net_removals_tco2e.toLocaleString()} tCO₂e</p>
                      <p className="text-[10px] text-slate-400">{h.area_ha} ha • {h.period_years} yr • {h.methodology_version}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${h.is_current ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                      {h.is_current ? 'Current' : 'Archived'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Configurable Ecosystem Factors Table (for Administrators) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-navy-900">Configurable Coastal Ecosystem Emission & Accumulation Factors</h3>
            <p className="text-xs text-slate-400">Baseline parameters for biomass growth and soil organic carbon sequestration</p>
          </div>
          {role === 'Administrator' && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
              Admin Editable
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Ecosystem Type</th>
                <th className="py-2.5 px-3">Total Accumulation Factor</th>
                <th className="py-2.5 px-3">Biomass / SOC Rate</th>
                <th className="py-2.5 px-3">Default Deductions</th>
                <th className="py-2.5 px-3">Methodology Version</th>
                <th className="py-2.5 px-3">Scientific Source Reference</th>
                {role === 'Administrator' && <th className="py-2.5 px-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {factors.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50">
                  <td className="py-3 px-3 font-bold text-navy-900">{f.ecosystem_type}</td>
                  <td className="py-3 px-3 font-bold text-teal-800">{f.factor_value} {f.unit}</td>
                  <td className="py-3 px-3 text-slate-600">Bio: {f.biomass_accumulation_rate} • SOC: {f.soil_organic_carbon_rate}</td>
                  <td className="py-3 px-3 text-slate-600">Base: {f.baseline_discount_pct}% • Uncert: {f.default_uncertainty_pct}%</td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-500">{f.version} ({f.effective_date})</td>
                  <td className="py-3 px-3 text-slate-600 text-[11px] max-w-xs truncate" title={f.source_reference}>
                    {f.source_reference}
                  </td>
                  {role === 'Administrator' && (
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setEditingFactor(f)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 rounded font-semibold transition-colors"
                      >
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Edit Carbon Factor */}
      {editingFactor && (
        <div className="fixed inset-0 z-50 bg-navy-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-navy-900 text-base">Edit Ecosystem Carbon Factor</h3>
              <button onClick={() => setEditingFactor(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleUpdateFactor} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ecosystem</label>
                <input
                  type="text"
                  disabled
                  value={editingFactor.ecosystem_type}
                  className="w-full bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Total Factor Value (tCO₂e/ha/yr) *</label>
                <input
                  type="number"
                  step={0.01}
                  value={editingFactor.factor_value}
                  onChange={(e) => setEditingFactor(prev => prev ? ({ ...prev, factor_value: parseFloat(e.target.value) || 0 }) : null)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-bold text-navy-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Soil Carbon Rate</label>
                  <input
                    type="number"
                    step={0.01}
                    value={editingFactor.soil_organic_carbon_rate}
                    onChange={(e) => setEditingFactor(prev => prev ? ({ ...prev, soil_organic_carbon_rate: parseFloat(e.target.value) || 0 }) : null)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Biomass Rate</label>
                  <input
                    type="number"
                    step={0.01}
                    value={editingFactor.biomass_accumulation_rate}
                    onChange={(e) => setEditingFactor(prev => prev ? ({ ...prev, biomass_accumulation_rate: parseFloat(e.target.value) || 0 }) : null)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Baseline Discount %</label>
                  <input
                    type="number"
                    step={0.5}
                    value={editingFactor.baseline_discount_pct}
                    onChange={(e) => setEditingFactor(prev => prev ? ({ ...prev, baseline_discount_pct: parseFloat(e.target.value) || 0 }) : null)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Uncertainty %</label>
                  <input
                    type="number"
                    step={0.5}
                    value={editingFactor.default_uncertainty_pct}
                    onChange={(e) => setEditingFactor(prev => prev ? ({ ...prev, default_uncertainty_pct: parseFloat(e.target.value) || 0 }) : null)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Scientific Source Reference *</label>
                <textarea
                  rows={2}
                  value={editingFactor.source_reference}
                  onChange={(e) => setEditingFactor(prev => prev ? ({ ...prev, source_reference: e.target.value }) : null)}
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingFactor(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold"
                >
                  Save Factor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
