import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Text, Boolean, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from .database import Base

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, unique=True)
    org_type = Column(String(100), default="Project Developer")
    contact_email = Column(String(150), nullable=False)
    country = Column(String(100), default="Global")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    users = relationship("User", back_populates="organization")
    projects = relationship("Project", back_populates="developer_org")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(150), unique=True, index=True, nullable=False)
    full_name = Column(String(150), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="Public User")  # Administrator, Project Developer, MRV Officer, Public User
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    organization = relationship("Organization", back_populates="users")
    projects = relationship("Project", back_populates="created_by")
    calculations = relationship("CarbonCalculation", back_populates="calculated_by")
    reports = relationship("MonitoringReport", back_populates="created_by")
    verifications = relationship("VerificationReview", back_populates="mrv_officer")
    audit_logs = relationship("AuditLog", back_populates="user")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    project_code = Column(String(50), unique=True, index=True, nullable=False) # e.g. BCR-2026-MG-001
    name = Column(String(255), nullable=False)
    developer_org_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    description = Column(Text, nullable=False)
    ecosystem_type = Column(String(100), nullable=False) # Mangrove restoration, Seagrass conservation or restoration, Tidal wetland conservation or restoration
    status = Column(String(50), default="Draft") # Draft, Submitted, Admin Approved, Active Monitoring, Verified, Rejected
    start_date = Column(String(20), nullable=False)
    duration_years = Column(Integer, default=20)
    country = Column(String(100), nullable=False)
    region = Column(String(100), nullable=False)
    district = Column(String(100), nullable=True)
    site_name = Column(String(150), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    total_area_ha = Column(Float, nullable=False)
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    developer_org = relationship("Organization", back_populates="projects")
    created_by = relationship("User", back_populates="projects")
    boundary = relationship("ProjectBoundary", uselist=False, back_populates="project", cascade="all, delete-orphan")
    baseline = relationship("BaselineAssessment", uselist=False, back_populates="project", cascade="all, delete-orphan")
    monitoring_events = relationship("MonitoringEvent", back_populates="project", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="project", cascade="all, delete-orphan")
    calculations = relationship("CarbonCalculation", back_populates="project", cascade="all, delete-orphan")
    reports = relationship("MonitoringReport", back_populates="project", cascade="all, delete-orphan")
    registry_record = relationship("RegistryRecord", uselist=False, back_populates="project", cascade="all, delete-orphan")


class ProjectBoundary(Base):
    __tablename__ = "project_boundaries"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, unique=True)
    geojson_geometry = Column(Text, nullable=False) # GeoJSON string (Polygon or MultiPolygon)
    area_ha = Column(Float, nullable=False)
    crs = Column(String(50), default="EPSG:4326")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", back_populates="boundary")


class BaselineAssessment(Base):
    __tablename__ = "baseline_assessments"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, unique=True)
    initial_condition = Column(String(255), nullable=False) # e.g. Degraded Aquaculture Pond, Barren Mudflat, Sparse Seagrass Meadow
    baseline_vegetation_pct = Column(Float, default=15.0)
    baseline_biomass_t_ha = Column(Float, default=12.5)
    baseline_soc_t_ha = Column(Float, default=85.0) # Soil organic carbon tC/ha
    measurement_date = Column(String(20), nullable=False)
    methodology_ref = Column(String(255), default="IPCC Wetlands Supplement (2013) Tier 2")
    verified_by = Column(String(150), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", back_populates="baseline")


class MonitoringEvent(Base):
    __tablename__ = "monitoring_events"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    event_code = Column(String(50), unique=True, index=True, nullable=False) # e.g. MTR-2026-001
    event_date = Column(String(20), nullable=False)
    responsible_person = Column(String(150), nullable=False)
    monitoring_type = Column(String(100), default="Field Survey & Drone Mapping") # Field Survey, Satellite Remote Sensing, Soil Coring, Drone UAV
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", back_populates="monitoring_events")
    measurements = relationship("MonitoringMeasurement", back_populates="monitoring_event", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="monitoring_event")


class MonitoringMeasurement(Base):
    __tablename__ = "monitoring_measurements"

    id = Column(Integer, primary_key=True, index=True)
    monitoring_event_id = Column(Integer, ForeignKey("monitoring_events.id"), nullable=False)
    canopy_cover_pct = Column(Float, nullable=True) # e.g. 68.5%
    survival_rate_pct = Column(Float, nullable=True) # e.g. 84.0%
    mean_dbh_cm = Column(Float, nullable=True) # Diameter at breast height for mangroves
    soc_depth_cm = Column(Float, nullable=True) # Depth of soil core
    salinity_ppt = Column(Float, nullable=True) # Water salinity in parts per thousand
    sediment_accretion_mm = Column(Float, nullable=True) # Annual sediment accretion
    restoration_progress_pct = Column(Float, nullable=False, default=50.0)
    carbon_stock_estimate_tco2e = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)

    monitoring_event = relationship("MonitoringEvent", back_populates="measurements")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    monitoring_event_id = Column(Integer, ForeignKey("monitoring_events.id"), nullable=True)
    file_name = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False) # pdf, csv, jpg, png
    file_path = Column(String(500), nullable=False)
    doc_category = Column(String(100), default="Monitoring Evidence") # Project Design Document, Site Authorization, Baseline Assessment, Monitoring Evidence, Drone Imagery
    upload_date = Column(DateTime, default=datetime.datetime.utcnow)
    uploaded_by = Column(String(150), nullable=False)
    is_public = Column(Boolean, default=True)
    file_size_kb = Column(Float, default=120.0)

    project = relationship("Project", back_populates="documents")
    monitoring_event = relationship("MonitoringEvent", back_populates="documents")


class CarbonFactor(Base):
    __tablename__ = "carbon_factors"

    id = Column(Integer, primary_key=True, index=True)
    ecosystem_type = Column(String(100), unique=True, nullable=False) # Mangrove restoration, Seagrass conservation or restoration, Tidal wetland conservation or restoration
    factor_name = Column(String(150), nullable=False)
    factor_value = Column(Float, nullable=False) # tCO2e/ha/year total
    unit = Column(String(50), default="tCO2e/ha/year")
    soil_organic_carbon_rate = Column(Float, nullable=False) # tCO2e/ha/year
    biomass_accumulation_rate = Column(Float, nullable=False) # tCO2e/ha/year
    baseline_discount_pct = Column(Float, default=5.0) # default deduction %
    default_uncertainty_pct = Column(Float, default=15.0) # default uncertainty deduction %
    source_reference = Column(String(255), nullable=False)
    version = Column(String(50), default="v2.1 (2026)")
    effective_date = Column(String(20), default="2026-01-01")
    is_active = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class CarbonCalculation(Base):
    __tablename__ = "carbon_calculations"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    calculated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    calculation_date = Column(DateTime, default=datetime.datetime.utcnow)
    methodology_version = Column(String(100), default="Verra VM0033 / IPCC Wetlands 2013")
    ecosystem_type = Column(String(100), nullable=False)
    area_ha = Column(Float, nullable=False)
    period_years = Column(Float, nullable=False)
    factor_value_used = Column(Float, nullable=False) # tCO2e/ha/year
    gross_accumulation_tco2e = Column(Float, nullable=False)
    baseline_deduction_tco2e = Column(Float, default=0.0)
    uncertainty_deduction_tco2e = Column(Float, default=0.0)
    net_removals_tco2e = Column(Float, nullable=False)
    assumptions_notes = Column(Text, nullable=True)
    is_current = Column(Boolean, default=True)

    project = relationship("Project", back_populates="calculations")
    calculated_by = relationship("User", back_populates="calculations")


class MonitoringReport(Base):
    __tablename__ = "monitoring_reports"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    report_code = Column(String(50), unique=True, index=True, nullable=False) # e.g. RPT-2026-001
    reporting_period_start = Column(String(20), nullable=False)
    reporting_period_end = Column(String(20), nullable=False)
    status = Column(String(50), default="Draft") # Draft, Submitted, Under Review, Returned for Correction, Approved
    summary = Column(Text, nullable=False)
    calculated_net_tco2e = Column(Float, nullable=False, default=0.0)
    submission_date = Column(String(20), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    project = relationship("Project", back_populates="reports")
    created_by = relationship("User", back_populates="reports")
    verification_review = relationship("VerificationReview", uselist=False, back_populates="report", cascade="all, delete-orphan")


class VerificationReview(Base):
    __tablename__ = "verification_reviews"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("monitoring_reports.id"), nullable=False, unique=True)
    mrv_officer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    review_date = Column(String(20), nullable=False)
    findings_summary = Column(Text, nullable=False)
    correction_notes = Column(Text, nullable=True)
    decision = Column(String(50), nullable=False) # Approved, Rejected, Corrections Requested
    verification_statement = Column(Text, nullable=True)
    certificate_number = Column(String(100), nullable=True) # e.g. CERT-BCR-2026-0891
    verified_net_removals_tco2e = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    report = relationship("MonitoringReport", back_populates="verification_review")
    mrv_officer = relationship("User", back_populates="verifications")


class RegistryRecord(Base):
    __tablename__ = "registry_records"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, unique=True)
    registry_code = Column(String(50), unique=True, index=True, nullable=False) # e.g. REG-BC-0012
    listing_date = Column(String(20), nullable=False)
    verified_removals_total_tco2e = Column(Float, default=0.0)
    status = Column(String(50), default="Registered & Published")
    public_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", back_populates="registry_record")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_email = Column(String(150), default="system")
    action = Column(String(100), nullable=False) # Project Registered, Factor Updated, Monitoring Event Created, Verification Decision, etc.
    entity_type = Column(String(100), nullable=False) # Project, CarbonFactor, MonitoringReport, VerificationReview, etc.
    entity_id = Column(String(100), nullable=True)
    change_summary = Column(Text, nullable=False)
    ip_address = Column(String(50), default="127.0.0.1")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    user = relationship("User", back_populates="audit_logs")
