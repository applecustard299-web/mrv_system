from pydantic import BaseModel, Field
from typing import Optional, List, Any
import datetime

# User & Auth
class UserBase(BaseModel):
    email: str
    full_name: str
    role: str
    organization_id: Optional[int] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime.datetime
    organization_name: Optional[str] = None

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: str
    password: str

class RoleSwitchRequest(BaseModel):
    role: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Organization
class OrganizationBase(BaseModel):
    name: str
    org_type: str = "Project Developer"
    contact_email: str
    country: str = "Global"

class OrganizationResponse(OrganizationBase):
    id: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# Project Boundary & Baseline
class ProjectBoundaryCreate(BaseModel):
    geojson_geometry: str
    area_ha: float

class ProjectBoundaryResponse(BaseModel):
    id: int
    geojson_geometry: str
    area_ha: float

    class Config:
        from_attributes = True

class BaselineAssessmentCreate(BaseModel):
    initial_condition: str
    baseline_vegetation_pct: float = 15.0
    baseline_biomass_t_ha: float = 12.0
    baseline_soc_t_ha: float = 85.0
    measurement_date: str
    methodology_ref: str = "IPCC Wetlands Supplement (2013)"
    notes: Optional[str] = None

class BaselineAssessmentResponse(BaselineAssessmentCreate):
    id: int
    project_id: int
    verified_by: Optional[str] = None

    class Config:
        from_attributes = True

# Project Registration
class ProjectRegistrationRequest(BaseModel):
    name: str
    description: str
    ecosystem_type: str
    start_date: str
    duration_years: int = 20
    country: str
    region: str
    district: Optional[str] = None
    site_name: str
    latitude: float
    longitude: float
    total_area_ha: float
    developer_org_name: Optional[str] = "Coastal Conservation Initiative"
    initial_condition: str
    baseline_vegetation_pct: float = 15.0
    baseline_biomass_t_ha: float = 10.0
    baseline_soc_t_ha: float = 80.0
    baseline_date: str
    methodology_ref: str = "IPCC Wetlands Supplement (2013)"
    geojson_polygon: Optional[str] = None

class ProjectStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

class ProjectResponse(BaseModel):
    id: int
    project_code: str
    name: str
    description: str
    ecosystem_type: str
    status: str
    start_date: str
    duration_years: int
    country: str
    region: str
    district: Optional[str]
    site_name: str
    latitude: float
    longitude: float
    total_area_ha: float
    is_public: bool
    created_at: datetime.datetime
    developer_org: Optional[OrganizationResponse] = None
    baseline: Optional[BaselineAssessmentResponse] = None
    boundary: Optional[ProjectBoundaryResponse] = None
    latest_net_tco2e: Optional[float] = 0.0

    class Config:
        from_attributes = True

# Carbon Factor & Calculation
class CarbonFactorBase(BaseModel):
    ecosystem_type: str
    factor_name: str
    factor_value: float
    soil_organic_carbon_rate: float
    biomass_accumulation_rate: float
    baseline_discount_pct: float = 5.0
    default_uncertainty_pct: float = 15.0
    source_reference: str
    version: str = "v2.1"
    effective_date: str = "2026-01-01"

class CarbonFactorUpdate(BaseModel):
    factor_value: float
    soil_organic_carbon_rate: float
    biomass_accumulation_rate: float
    baseline_discount_pct: float
    default_uncertainty_pct: float
    source_reference: str
    version: str

class CarbonFactorResponse(CarbonFactorBase):
    id: int
    unit: str
    is_active: bool
    updated_at: datetime.datetime

    class Config:
        from_attributes = True

class CarbonCalculationRequest(BaseModel):
    project_id: int
    ecosystem_type: str
    area_ha: float
    period_years: float
    custom_factor_value: Optional[float] = None
    baseline_discount_pct: Optional[float] = None
    uncertainty_pct: Optional[float] = None
    assumptions_notes: Optional[str] = None

class CarbonCalculationResponse(BaseModel):
    id: int
    project_id: int
    calculation_date: datetime.datetime
    methodology_version: str
    ecosystem_type: str
    area_ha: float
    period_years: float
    factor_value_used: float
    gross_accumulation_tco2e: float
    baseline_deduction_tco2e: float
    uncertainty_deduction_tco2e: float
    net_removals_tco2e: float
    assumptions_notes: Optional[str] = None
    is_current: bool

    class Config:
        from_attributes = True

# Monitoring Events & Measurements
class MonitoringMeasurementCreate(BaseModel):
    canopy_cover_pct: Optional[float] = None
    survival_rate_pct: Optional[float] = None
    mean_dbh_cm: Optional[float] = None
    soc_depth_cm: Optional[float] = None
    salinity_ppt: Optional[float] = None
    sediment_accretion_mm: Optional[float] = None
    restoration_progress_pct: float = 50.0
    carbon_stock_estimate_tco2e: Optional[float] = None
    notes: Optional[str] = None

class MonitoringMeasurementResponse(MonitoringMeasurementCreate):
    id: int
    monitoring_event_id: int

    class Config:
        from_attributes = True

class MonitoringEventCreate(BaseModel):
    project_id: int
    event_date: str
    responsible_person: str
    monitoring_type: str
    notes: Optional[str] = None
    measurements: MonitoringMeasurementCreate

class MonitoringEventResponse(BaseModel):
    id: int
    project_id: int
    event_code: str
    event_date: str
    responsible_person: str
    monitoring_type: str
    notes: Optional[str]
    created_at: datetime.datetime
    measurements: List[MonitoringMeasurementResponse] = []
    documents: List[Any] = []

    class Config:
        from_attributes = True

# Document
class DocumentResponse(BaseModel):
    id: int
    project_id: int
    monitoring_event_id: Optional[int]
    file_name: str
    original_name: str
    file_type: str
    file_path: str
    doc_category: str
    upload_date: datetime.datetime
    uploaded_by: str
    is_public: bool
    file_size_kb: float

    class Config:
        from_attributes = True

# Monitoring Report
class MonitoringReportCreate(BaseModel):
    project_id: int
    reporting_period_start: str
    reporting_period_end: str
    summary: str
    calculated_net_tco2e: float

class VerificationReviewCreate(BaseModel):
    findings_summary: str
    correction_notes: Optional[str] = None
    decision: str # Approved, Rejected, Corrections Requested
    verification_statement: Optional[str] = None

class VerificationReviewResponse(BaseModel):
    id: int
    report_id: int
    mrv_officer_name: Optional[str] = None
    review_date: str
    findings_summary: str
    correction_notes: Optional[str]
    decision: str
    verification_statement: Optional[str]
    certificate_number: Optional[str]
    verified_net_removals_tco2e: float
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class MonitoringReportResponse(BaseModel):
    id: int
    project_id: int
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    report_code: str
    reporting_period_start: str
    reporting_period_end: str
    status: str
    summary: str
    calculated_net_tco2e: float
    submission_date: Optional[str]
    created_at: datetime.datetime
    verification_review: Optional[VerificationReviewResponse] = None

    class Config:
        from_attributes = True

# Registry Record
class RegistryRecordResponse(BaseModel):
    id: int
    project_id: int
    registry_code: str
    project_code: str
    project_name: str
    ecosystem_type: str
    location: str
    project_area: float
    developer: str
    project_status: str
    monitoring_period: str
    estimated_carbon_removals: float
    verification_status: str
    last_updated: str
    is_public: bool

# Audit Log
class AuditLogResponse(BaseModel):
    id: int
    user_email: str
    action: str
    entity_type: str
    entity_id: Optional[str]
    change_summary: str
    ip_address: str
    timestamp: datetime.datetime

    class Config:
        from_attributes = True

# Dashboard
class DashboardMetricsResponse(BaseModel):
    total_registered_projects: int
    total_mapped_area_ha: float
    total_estimated_carbon_removals_tco2e: float
    total_awaiting_verification: int
    total_approved_verified_projects: int
    total_rejected_projects: int
    total_under_monitoring: int
    ecosystem_distribution: List[dict]
    regional_area_distribution: List[dict]
    carbon_removals_timeline: List[dict]
    verification_status_funnel: List[dict]
    recent_activities: List[AuditLogResponse]
