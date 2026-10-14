export type UserRole = 'Administrator' | 'Project Developer' | 'MRV Officer' | 'Public User';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  organization_id?: number | null;
  organization_name?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Organization {
  id: number;
  name: string;
  org_type: string;
  contact_email: string;
  country: string;
  created_at: string;
}

export interface BaselineAssessment {
  id: number;
  project_id: number;
  initial_condition: string;
  baseline_vegetation_pct: number;
  baseline_biomass_t_ha: number;
  baseline_soc_t_ha: number;
  measurement_date: string;
  methodology_ref: string;
  verified_by?: string | null;
  notes?: string | null;
}

export interface ProjectBoundary {
  id: number;
  geojson_geometry: string;
  area_ha: number;
}

export interface Project {
  id: number;
  project_code: string;
  name: string;
  description: string;
  ecosystem_type: 'Mangrove restoration' | 'Seagrass conservation or restoration' | 'Tidal wetland conservation or restoration' | string;
  status: 'Draft' | 'Submitted' | 'Admin Approved' | 'Active Monitoring' | 'Verified' | 'Rejected' | string;
  start_date: string;
  duration_years: number;
  country: string;
  region: string;
  district?: string | null;
  site_name: string;
  latitude: number;
  longitude: number;
  total_area_ha: number;
  is_public: boolean;
  created_at: string;
  developer_org?: Organization | null;
  baseline?: BaselineAssessment | null;
  boundary?: ProjectBoundary | null;
  latest_net_tco2e?: number;
}

export interface CarbonFactor {
  id: number;
  ecosystem_type: string;
  factor_name: string;
  factor_value: number;
  unit: string;
  soil_organic_carbon_rate: number;
  biomass_accumulation_rate: number;
  baseline_discount_pct: number;
  default_uncertainty_pct: number;
  source_reference: string;
  version: string;
  effective_date: string;
  is_active: boolean;
  updated_at: string;
}

export interface CarbonCalculation {
  id: number;
  project_id: number;
  calculation_date: string;
  methodology_version: string;
  ecosystem_type: string;
  area_ha: number;
  period_years: number;
  factor_value_used: number;
  gross_accumulation_tco2e: number;
  baseline_deduction_tco2e: number;
  uncertainty_deduction_tco2e: number;
  net_removals_tco2e: number;
  assumptions_notes?: string | null;
  is_current: boolean;
}

export interface MonitoringMeasurement {
  id?: number;
  monitoring_event_id?: number;
  canopy_cover_pct?: number | null;
  survival_rate_pct?: number | null;
  mean_dbh_cm?: number | null;
  soc_depth_cm?: number | null;
  salinity_ppt?: number | null;
  sediment_accretion_mm?: number | null;
  restoration_progress_pct: number;
  carbon_stock_estimate_tco2e?: number | null;
  notes?: string | null;
}

export interface MonitoringEvent {
  id: number;
  project_id: number;
  event_code: string;
  event_date: string;
  responsible_person: string;
  monitoring_type: string;
  notes?: string | null;
  created_at: string;
  measurements: MonitoringMeasurement[];
  documents?: DocumentFile[];
}

export interface DocumentFile {
  id: number;
  project_id: number;
  monitoring_event_id?: number | null;
  file_name: string;
  original_name: string;
  file_type: string;
  file_path: string;
  doc_category: string;
  upload_date: string;
  uploaded_by: string;
  is_public: boolean;
  file_size_kb: number;
}

export interface VerificationReview {
  id: number;
  report_id: number;
  mrv_officer_name?: string | null;
  review_date: string;
  findings_summary: string;
  correction_notes?: string | null;
  decision: 'Approved' | 'Rejected' | 'Corrections Requested' | string;
  verification_statement?: string | null;
  certificate_number?: string | null;
  verified_net_removals_tco2e: number;
  created_at: string;
}

export interface MonitoringReport {
  id: number;
  project_id: number;
  project_name?: string;
  project_code?: string;
  report_code: string;
  reporting_period_start: string;
  reporting_period_end: string;
  status: 'Draft' | 'Submitted' | 'Under Review' | 'Returned for Correction' | 'Approved' | 'Rejected' | string;
  summary: string;
  calculated_net_tco2e: number;
  submission_date?: string | null;
  created_at: string;
  verification_review?: VerificationReview | null;
}

export interface RegistryRecord {
  id: number;
  project_id: number;
  registry_code: string;
  project_code: string;
  project_name: string;
  ecosystem_type: string;
  location: string;
  project_area: number;
  developer: string;
  project_status: string;
  monitoring_period: string;
  estimated_carbon_removals: number;
  verification_status: string;
  last_updated: string;
  is_public: boolean;
}

export interface AuditLogItem {
  id: number;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  change_summary: string;
  ip_address: string;
  timestamp: string;
}

export interface DashboardMetrics {
  total_registered_projects: number;
  total_mapped_area_ha: number;
  total_estimated_carbon_removals_tco2e: number;
  total_awaiting_verification: number;
  total_approved_verified_projects: number;
  total_rejected_projects: number;
  total_under_monitoring: number;
  ecosystem_distribution: Array<{
    name: string;
    count: number;
    area_ha: number;
    net_tco2e: number;
  }>;
  regional_area_distribution: Array<{
    region: string;
    area_ha: number;
  }>;
  carbon_removals_timeline: Array<{
    period: string;
    annual_tco2e: number;
    cumulative_tco2e: number;
  }>;
  verification_status_funnel: Array<{
    stage: string;
    count: number;
  }>;
  recent_activities: AuditLogItem[];
}
