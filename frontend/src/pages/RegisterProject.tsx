import React, { useState } from 'react';
import { api } from '../api';
import { LocationPickerMap } from '../components/map/LocationPickerMap';
import { useAuth } from '../context/AuthContext';
import {
  Trees, Waves, Wind, MapPin, CheckCircle2, AlertCircle,
  FileText, Upload, ArrowRight, ArrowLeft, Sparkles, RefreshCw
} from 'lucide-react';

interface RegisterProjectProps {
  onSuccess: (projectId: number) => void;
  onCancel: () => void;
}

export const RegisterProject: React.FC<RegisterProjectProps> = ({ onSuccess, onCancel }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Project Information
    name: '',
    developer_org_name: user?.organization_name || 'Coastal Conservation Initiative',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    duration_years: 25,
    ecosystem_type: 'Mangrove restoration',

    // Step 2: Location Information (India Coastal)
    country: 'India',
    region: 'West Bengal',
    district: 'South 24 Parganas',
    site_name: 'Gosaba Coastal Mangrove Sector',
    latitude: 21.9497,
    longitude: 88.8920,
    total_area_ha: 750.0,
    geojson_polygon: '',

    // Step 3: Baseline Information
    initial_condition: 'Degraded aquaculture impoundments with hypersaline mudflats',
    baseline_vegetation_pct: 12.0,
    baseline_biomass_t_ha: 7.5,
    baseline_soc_t_ha: 72.0,
    baseline_date: new Date().toISOString().split('T')[0],
    methodology_ref: 'IPCC Wetlands Supplement (2013) Tier 2 / VM0033',

    // Step 4: Documents (Simulated file names)
    pdd_filename: 'Secanggang_Mangrove_PDD_v1.pdf',
    site_auth_filename: 'Provincial_Forestry_Authorization_Permit.pdf',
    baseline_survey_filename: 'Baseline_Soil_Carbon_Transects.csv'
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLocationPicked = (lat: number, lng: number, polygon: string) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      geojson_polygon: polygon
    }));
  };

  // Preview generated project ID
  const getProjectCodePreview = () => {
    const year = new Date().getFullYear();
    let prefix = 'MG';
    if (formData.ecosystem_type.toLowerCase().includes('seagrass')) prefix = 'SG';
    if (formData.ecosystem_type.toLowerCase().includes('wetland')) prefix = 'TW';
    return `BCR-${year}-${prefix}-AUTO`;
  };

  // Preliminary carbon calculation preview
  const factor = formData.ecosystem_type.includes('Mangrove') ? 9.4 : (formData.ecosystem_type.includes('Seagrass') ? 4.5 : 6.8);
  const grossEst = formData.total_area_ha * factor * 1.0;
  const netEst = grossEst * 0.8; // conservative after baseline and buffer

  const handleNext = () => {
    setError(null);
    if (currentStep === 1) {
      if (!formData.name.trim() || !formData.description.trim()) {
        setError('Please provide a project name and description.');
        return;
      }
    } else if (currentStep === 2) {
      if (!formData.country.trim() || !formData.region.trim() || !formData.site_name.trim() || formData.total_area_ha <= 0) {
        setError('Please fill all location fields and enter a valid area.');
        return;
      }
    } else if (currentStep === 3) {
      if (!formData.initial_condition.trim()) {
        setError('Please describe the initial baseline ecosystem condition.');
        return;
      }
    }
    setCurrentStep(prev => prev + 1);
  };

  const handlePrev = () => {
    setError(null);
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const created = await api.registerProject({
        name: formData.name,
        description: formData.description,
        ecosystem_type: formData.ecosystem_type,
        start_date: formData.start_date,
        duration_years: Number(formData.duration_years),
        country: formData.country,
        region: formData.region,
        district: formData.district,
        site_name: formData.site_name,
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        total_area_ha: Number(formData.total_area_ha),
        developer_org_name: formData.developer_org_name,
        initial_condition: formData.initial_condition,
        baseline_vegetation_pct: Number(formData.baseline_vegetation_pct),
        baseline_biomass_t_ha: Number(formData.baseline_biomass_t_ha),
        baseline_soc_t_ha: Number(formData.baseline_soc_t_ha),
        baseline_date: formData.baseline_date,
        methodology_ref: formData.methodology_ref,
        geojson_polygon: formData.geojson_polygon || undefined
      });
      onSuccess(created.id);
    } catch (err: any) {
      setError(err.message || 'Failed to submit project registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Wizard Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4 mb-4">
          <div>
            <h1 className="text-xl font-bold text-navy-900 tracking-tight">Register New Blue Carbon Project</h1>
            <p className="text-xs text-slate-500">Multi-step registration for coastal mangrove, seagrass, and tidal wetland sites</p>
          </div>
          <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-lg border border-teal-200">
            Project Code: {getProjectCodePreview()}
          </span>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-5 gap-2 text-center text-xs">
          {[
            { num: 1, label: 'General Info' },
            { num: 2, label: 'Location & Map' },
            { num: 3, label: 'Ecosystem & Baseline' },
            { num: 4, label: 'Documentation' },
            { num: 5, label: 'Review & Submit' },
          ].map((s) => (
            <div
              key={s.num}
              className={`p-2 rounded-lg border transition-all ${
                currentStep === s.num
                  ? 'bg-teal-700 text-white border-teal-700 font-bold shadow-sm'
                  : currentStep > s.num
                  ? 'bg-teal-50 text-teal-800 border-teal-200 font-semibold'
                  : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}
            >
              <div className="text-[10px] uppercase font-bold tracking-wider">Step {s.num}</div>
              <div className="truncate mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Wizard Step Content */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        {/* STEP 1: General Info */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-navy-900 border-b border-slate-100 pb-2">
              1. Project Information & Organization
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Project Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Secanggang Mangrove Coastal Buffer Restoration"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Developer / Proponent Organization
                </label>
                <input
                  type="text"
                  value={formData.developer_org_name}
                  onChange={(e) => handleInputChange('developer_org_name', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ecosystem Classification *
                </label>
                <select
                  value={formData.ecosystem_type}
                  onChange={(e) => handleInputChange('ecosystem_type', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
                >
                  <option value="Mangrove restoration">Mangrove restoration</option>
                  <option value="Seagrass conservation or restoration">Seagrass conservation or restoration</option>
                  <option value="Tidal wetland conservation or restoration">Tidal wetland conservation or restoration</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Project Description & Ecological Objective *
              </label>
              <textarea
                rows={4}
                placeholder="Describe baseline threats, community benefits, species to be planted, hydrological restoration, and planned monitoring..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Project Start Date *
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expected Crediting Duration (Years) *
                </label>
                <input
                  type="number"
                  min={5}
                  max={50}
                  value={formData.duration_years}
                  onChange={(e) => handleInputChange('duration_years', parseInt(e.target.value) || 20)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Location & Map */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-navy-900 border-b border-slate-100 pb-2">
              2. Geographic Location, Area & Boundary
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Country *</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">State / Province (India) *</label>
                <select
                  value={formData.region}
                  onChange={(e) => handleInputChange('region', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
                >
                  <option value="West Bengal">West Bengal</option>
                  <option value="Tamil Nadu">Tamil Nadu</option>
                  <option value="Odisha">Odisha</option>
                  <option value="Gujarat">Gujarat</option>
                  <option value="Kerala">Kerala</option>
                  <option value="Andhra Pradesh">Andhra Pradesh</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Goa">Goa</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Lakshadweep">Lakshadweep</option>
                  <option value="Andaman and Nicobar Islands">Andaman and Nicobar Islands</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">District / County</label>
                <input
                  type="text"
                  value={formData.district}
                  onChange={(e) => handleInputChange('district', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Site / Compartment Name *</label>
                <input
                  type="text"
                  value={formData.site_name}
                  onChange={(e) => handleInputChange('site_name', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Total Project Area (Hectares) *</label>
                <input
                  type="number"
                  min={1}
                  step={0.1}
                  value={formData.total_area_ha}
                  onChange={(e) => handleInputChange('total_area_ha', parseFloat(e.target.value) || 100)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold text-navy-900 focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Latitude & Longitude</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step={0.0001}
                    value={formData.latitude}
                    onChange={(e) => handleInputChange('latitude', parseFloat(e.target.value) || 0)}
                    className="w-1/2 px-2 py-2 text-xs border border-slate-300 rounded-lg"
                    placeholder="Lat"
                  />
                  <input
                    type="number"
                    step={0.0001}
                    value={formData.longitude}
                    onChange={(e) => handleInputChange('longitude', parseFloat(e.target.value) || 0)}
                    className="w-1/2 px-2 py-2 text-xs border border-slate-300 rounded-lg"
                    placeholder="Lng"
                  />
                </div>
              </div>
            </div>

            {/* Interactive Leaflet Picker */}
            <LocationPickerMap
              latitude={formData.latitude}
              longitude={formData.longitude}
              areaHa={formData.total_area_ha}
              onLocationChange={handleLocationPicked}
            />
          </div>
        )}

        {/* STEP 3: Ecosystem & Baseline Information */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-navy-900 border-b border-slate-100 pb-2">
              3. Baseline Ecological & Carbon Assessment
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Initial Pre-Project Degradation State *
              </label>
              <input
                type="text"
                placeholder="e.g. Abandoned shrimp aquaculture ponds with disrupted tidal flushing"
                value={formData.initial_condition}
                onChange={(e) => handleInputChange('initial_condition', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Baseline Canopy Cover (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={formData.baseline_vegetation_pct}
                  onChange={(e) => handleInputChange('baseline_vegetation_pct', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Baseline Biomass (t/ha)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={formData.baseline_biomass_t_ha}
                  onChange={(e) => handleInputChange('baseline_biomass_t_ha', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Baseline Soil Carbon (tC/ha)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={formData.baseline_soc_t_ha}
                  onChange={(e) => handleInputChange('baseline_soc_t_ha', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Baseline Measurement Date
                </label>
                <input
                  type="date"
                  value={formData.baseline_date}
                  onChange={(e) => handleInputChange('baseline_date', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Carbon Methodology Reference
                </label>
                <input
                  type="text"
                  value={formData.methodology_ref}
                  onChange={(e) => handleInputChange('methodology_ref', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Supporting Documents */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-navy-900 border-b border-slate-100 pb-2">
              4. Supporting Documents & Evidence
            </h2>
            <p className="text-xs text-slate-500">
              Attach mandatory Project Design Documents (PDD), land concession / tenure authorization, and baseline survey data.
            </p>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-dashed border-teal-300 bg-teal-50/40 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-teal-700" />
                  <div>
                    <span className="font-bold text-navy-900">Project Design Document (PDD) *</span>
                    <p className="text-[11px] text-slate-500">{formData.pdd_filename}</p>
                  </div>
                </div>
                <span className="text-[10px] bg-teal-100 text-teal-800 font-semibold px-2 py-0.5 rounded">
                  Ready for submission
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-slate-600" />
                  <div>
                    <span className="font-bold text-navy-900">Site Authorization / Tenure Agreement *</span>
                    <p className="text-[11px] text-slate-500">{formData.site_auth_filename}</p>
                  </div>
                </div>
                <span className="text-[10px] bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded">
                  Attached
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-slate-600" />
                  <div>
                    <span className="font-bold text-navy-900">Baseline Assessment Transect Logsheet (CSV)</span>
                    <p className="text-[11px] text-slate-500">{formData.baseline_survey_filename}</p>
                  </div>
                </div>
                <span className="text-[10px] bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded">
                  CSV Attached
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Review & Submit */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-navy-900 border-b border-slate-100 pb-2">
              5. Registration Review & Preliminary Carbon Estimate
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <p className="font-bold text-navy-900 uppercase text-[11px] tracking-wider text-slate-400">
                  Project Summary
                </p>
                <p><strong>Name:</strong> {formData.name}</p>
                <p><strong>Ecosystem:</strong> {formData.ecosystem_type}</p>
                <p><strong>Developer:</strong> {formData.developer_org_name}</p>
                <p><strong>Location:</strong> {formData.site_name}, {formData.region}, {formData.country}</p>
                <p><strong>Area:</strong> {formData.total_area_ha.toLocaleString()} ha</p>
                <p><strong>Coordinates:</strong> {formData.latitude}, {formData.longitude}</p>
              </div>

              <div className="bg-teal-50/60 p-4 rounded-xl border border-teal-200 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-teal-900 uppercase text-[11px] tracking-wider">
                    Preliminary 1-Yr Carbon Projection
                  </p>
                  <Sparkles className="w-4 h-4 text-teal-600" />
                </div>
                <div className="text-2xl font-bold text-teal-900">
                  {Math.round(netEst).toLocaleString()} <span className="text-xs font-normal">tCO₂e/yr</span>
                </div>
                <p className="text-[11px] text-teal-800">
                  Gross: {Math.round(grossEst).toLocaleString()} tCO₂e • Baseline & Buffer deduction: ~20%
                </p>
                <p className="text-[10px] text-slate-500 italic pt-1 border-t border-teal-200">
                  Disclaimer: Preliminary projection based on IPCC Wetlands Tier 2 defaults. Subject to third-party MRV audit prior to registry credit issuance.
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                By clicking <strong>Submit Project Registration</strong>, the project will be recorded in the registry with status <em>Submitted</em> and routed to the Administrator for initial eligibility review.
              </span>
            </div>
          </div>
        )}

        {/* Wizard Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrev}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
          )}

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md transition-colors"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Registering Project...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Project Registration</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
