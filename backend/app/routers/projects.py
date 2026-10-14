import json
import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import (
    Project, ProjectBoundary, BaselineAssessment, CarbonCalculation,
    CarbonFactor, RegistryRecord, User, Organization
)
from ..schemas import (
    ProjectResponse, ProjectRegistrationRequest, ProjectStatusUpdate,
    BaselineAssessmentResponse, ProjectBoundaryResponse
)
from ..auth import get_current_user, require_roles, log_audit_event

router = APIRouter(prefix="/api/projects", tags=["Projects"])

def generate_project_code(db: Session, ecosystem_type: str) -> str:
    current_year = datetime.datetime.utcnow().year
    eco_prefix = "MG"
    if "seagrass" in ecosystem_type.lower():
        eco_prefix = "SG"
    elif "wetland" in ecosystem_type.lower():
        eco_prefix = "TW"

    count = db.query(Project).filter(Project.project_code.like(f"BCR-{current_year}-{eco_prefix}-%")).count() + 1
    return f"BCR-{current_year}-{eco_prefix}-{count:03d}"

@router.get("", response_model=List[ProjectResponse])
def get_projects(
    ecosystem: Optional[str] = None,
    region: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Project)
    if ecosystem and ecosystem != "All":
        query = query.filter(Project.ecosystem_type == ecosystem)
    if region and region != "All":
        query = query.filter(Project.region == region)
    if status and status != "All":
        query = query.filter(Project.status == status)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (Project.name.ilike(search_fmt)) |
            (Project.project_code.ilike(search_fmt)) |
            (Project.country.ilike(search_fmt)) |
            (Project.site_name.ilike(search_fmt))
        )
    
    projects = query.order_by(Project.id.desc()).all()
    results = []
    for p in projects:
        latest_calc = db.query(CarbonCalculation).filter(
            CarbonCalculation.project_id == p.id,
            CarbonCalculation.is_current == True
        ).first()
        latest_tco2e = latest_calc.net_removals_tco2e if latest_calc else 0.0

        p_dict = {
            "id": p.id,
            "project_code": p.project_code,
            "name": p.name,
            "description": p.description,
            "ecosystem_type": p.ecosystem_type,
            "status": p.status,
            "start_date": p.start_date,
            "duration_years": p.duration_years,
            "country": p.country,
            "region": p.region,
            "district": p.district,
            "site_name": p.site_name,
            "latitude": p.latitude,
            "longitude": p.longitude,
            "total_area_ha": p.total_area_ha,
            "is_public": p.is_public,
            "created_at": p.created_at,
            "developer_org": p.developer_org,
            "baseline": p.baseline,
            "boundary": p.boundary,
            "latest_net_tco2e": latest_tco2e
        }
        results.append(ProjectResponse(**p_dict))
    return results

@router.get("/{id_or_code}", response_model=ProjectResponse)
def get_project_by_id_or_code(id_or_code: str, db: Session = Depends(get_db)):
    if id_or_code.isdigit():
        p = db.query(Project).filter(Project.id == int(id_or_code)).first()
    else:
        p = db.query(Project).filter(Project.project_code == id_or_code).first()

    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    latest_calc = db.query(CarbonCalculation).filter(
        CarbonCalculation.project_id == p.id,
        CarbonCalculation.is_current == True
    ).first()
    latest_tco2e = latest_calc.net_removals_tco2e if latest_calc else 0.0

    p_dict = {
        "id": p.id,
        "project_code": p.project_code,
        "name": p.name,
        "description": p.description,
        "ecosystem_type": p.ecosystem_type,
        "status": p.status,
        "start_date": p.start_date,
        "duration_years": p.duration_years,
        "country": p.country,
        "region": p.region,
        "district": p.district,
        "site_name": p.site_name,
        "latitude": p.latitude,
        "longitude": p.longitude,
        "total_area_ha": p.total_area_ha,
        "is_public": p.is_public,
        "created_at": p.created_at,
        "developer_org": p.developer_org,
        "baseline": p.baseline,
        "boundary": p.boundary,
        "latest_net_tco2e": latest_tco2e
    }
    return ProjectResponse(**p_dict)

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def register_project(
    req: ProjectRegistrationRequest,
    current_user: User = Depends(require_roles(["Administrator", "Project Developer"])),
    db: Session = Depends(get_db)
):
    # Developer Organization Lookup or Creation
    org = None
    if req.developer_org_name:
        org = db.query(Organization).filter(Organization.name == req.developer_org_name).first()
        if not org:
            org = Organization(
                name=req.developer_org_name,
                org_type="Project Developer",
                contact_email=current_user.email,
                country=req.country
            )
            db.add(org)
            db.commit()

    org_id = org.id if org else current_user.organization_id
    project_code = generate_project_code(db, req.ecosystem_type)

    project = Project(
        project_code=project_code,
        name=req.name.strip(),
        developer_org_id=org_id,
        created_by_user_id=current_user.id,
        description=req.description.strip(),
        ecosystem_type=req.ecosystem_type,
        status="Submitted", # Initial state awaiting Admin review
        start_date=req.start_date,
        duration_years=req.duration_years,
        country=req.country.strip(),
        region=req.region.strip(),
        district=req.district.strip() if req.district else "",
        site_name=req.site_name.strip(),
        latitude=req.latitude,
        longitude=req.longitude,
        total_area_ha=req.total_area_ha,
        is_public=True
    )
    db.add(project)
    db.commit()

    # Create Boundary
    geojson_data = req.geojson_polygon
    if not geojson_data:
        # Generate representative polygon around lat/lng
        delta = 0.015
        poly = {
            "type": "Polygon",
            "coordinates": [[
                [req.longitude - delta, req.latitude - delta],
                [req.longitude + delta, req.latitude - delta],
                [req.longitude + delta, req.latitude + delta],
                [req.longitude - delta, req.latitude + delta],
                [req.longitude - delta, req.latitude - delta]
            ]]
        }
        geojson_data = json.dumps(poly)

    boundary = ProjectBoundary(
        project_id=project.id,
        geojson_geometry=geojson_data,
        area_ha=req.total_area_ha
    )
    db.add(boundary)

    # Create Baseline Assessment
    baseline = BaselineAssessment(
        project_id=project.id,
        initial_condition=req.initial_condition,
        baseline_vegetation_pct=req.baseline_vegetation_pct,
        baseline_biomass_t_ha=req.baseline_biomass_t_ha,
        baseline_soc_t_ha=req.baseline_soc_t_ha,
        measurement_date=req.baseline_date,
        methodology_ref=req.methodology_ref,
        verified_by=None
    )
    db.add(baseline)

    # Initial Preliminary Carbon Calculation
    factor = db.query(CarbonFactor).filter(CarbonFactor.ecosystem_type == req.ecosystem_type).first()
    factor_val = factor.factor_value if factor else 8.0
    discount = factor.baseline_discount_pct if factor else 5.0
    uncertainty = factor.default_uncertainty_pct if factor else 15.0

    gross = req.total_area_ha * factor_val * 1.0 # 1-year initial projection
    base_deduct = gross * (discount / 100.0)
    uncert_deduct = (gross - base_deduct) * (uncertainty / 100.0)
    net_removals = gross - base_deduct - uncert_deduct

    calc = CarbonCalculation(
        project_id=project.id,
        calculated_by_id=current_user.id,
        methodology_version=factor.version if factor else "IPCC Wetlands Tier 2",
        ecosystem_type=req.ecosystem_type,
        area_ha=req.total_area_ha,
        period_years=1.0,
        factor_value_used=factor_val,
        gross_accumulation_tco2e=round(gross, 2),
        baseline_deduction_tco2e=round(base_deduct, 2),
        uncertainty_deduction_tco2e=round(uncert_deduct, 2),
        net_removals_tco2e=round(net_removals, 2),
        assumptions_notes="Preliminary registration estimate based on default ecosystem tier 2 factor.",
        is_current=True
    )
    db.add(calc)

    # Registry Record
    current_year = datetime.datetime.utcnow().year
    reg_count = db.query(RegistryRecord).count() + 1
    registry = RegistryRecord(
        project_id=project.id,
        registry_code=f"REG-BC-{current_year}-{reg_count:03d}",
        listing_date=datetime.datetime.utcnow().strftime("%Y-%m-%d"),
        verified_removals_total_tco2e=0.0,
        status="Under Administrative Review",
        public_url=f"/registry/{project.project_code}"
    )
    db.add(registry)
    db.commit()

    # Log Audit
    log_audit_event(
        db=db,
        action="Project Registered",
        entity_type="Project",
        entity_id=project.project_code,
        change_summary=f"Project '{project.name}' ({req.total_area_ha} ha) registered under '{req.ecosystem_type}'.",
        user=current_user
    )

    db.refresh(project)
    p_dict = {
        "id": project.id,
        "project_code": project.project_code,
        "name": project.name,
        "description": project.description,
        "ecosystem_type": project.ecosystem_type,
        "status": project.status,
        "start_date": project.start_date,
        "duration_years": project.duration_years,
        "country": project.country,
        "region": project.region,
        "district": project.district,
        "site_name": project.site_name,
        "latitude": project.latitude,
        "longitude": project.longitude,
        "total_area_ha": project.total_area_ha,
        "is_public": project.is_public,
        "created_at": project.created_at,
        "developer_org": project.developer_org,
        "baseline": project.baseline,
        "boundary": project.boundary,
        "latest_net_tco2e": round(net_removals, 2)
    }
    return ProjectResponse(**p_dict)

@router.patch("/{id}/status", response_model=ProjectResponse)
def update_project_status(
    id: int,
    req: ProjectStatusUpdate,
    current_user: User = Depends(require_roles(["Administrator", "MRV Officer"])),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    old_status = project.status
    project.status = req.status
    db.commit()

    # Update Registry Record status if exists
    if project.registry_record:
        if req.status == "Admin Approved":
            project.registry_record.status = "Admin Approved - Baseline Recorded"
        elif req.status == "Active Monitoring":
            project.registry_record.status = "Listed - Active Monitoring"
        elif req.status == "Verified":
            project.registry_record.status = "Registered & Independently Verified"
        elif req.status == "Rejected":
            project.registry_record.status = "Application Rejected"
        db.commit()

    log_audit_event(
        db=db,
        action="Project Status Updated",
        entity_type="Project",
        entity_id=project.project_code,
        change_summary=f"Status changed from '{old_status}' to '{req.status}'. Notes: {req.notes or 'None'}",
        user=current_user
    )

    latest_calc = db.query(CarbonCalculation).filter(
        CarbonCalculation.project_id == project.id,
        CarbonCalculation.is_current == True
    ).first()
    latest_tco2e = latest_calc.net_removals_tco2e if latest_calc else 0.0

    p_dict = {
        "id": project.id,
        "project_code": project.project_code,
        "name": project.name,
        "description": project.description,
        "ecosystem_type": project.ecosystem_type,
        "status": project.status,
        "start_date": project.start_date,
        "duration_years": project.duration_years,
        "country": project.country,
        "region": project.region,
        "district": project.district,
        "site_name": project.site_name,
        "latitude": project.latitude,
        "longitude": project.longitude,
        "total_area_ha": project.total_area_ha,
        "is_public": project.is_public,
        "created_at": project.created_at,
        "developer_org": project.developer_org,
        "baseline": project.baseline,
        "boundary": project.boundary,
        "latest_net_tco2e": latest_tco2e
    }
    return ProjectResponse(**p_dict)
