from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import csv
import io
from ..database import get_db
from ..models import (
    RegistryRecord, Project, CarbonCalculation, MonitoringReport,
    VerificationReview, Document, BaselineAssessment
)
from ..schemas import RegistryRecordResponse

router = APIRouter(prefix="/api/registry", tags=["Blue Carbon Registry"])

@router.get("", response_model=List[RegistryRecordResponse])
def get_registry_records(
    ecosystem: Optional[str] = None,
    region: Optional[str] = None,
    status: Optional[str] = None,
    verification: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(RegistryRecord).join(Project)

    if ecosystem and ecosystem != "All":
        query = query.filter(Project.ecosystem_type == ecosystem)
    if region and region != "All":
        query = query.filter(Project.region == region)
    if status and status != "All":
        query = query.filter(Project.status == status)
    if verification and verification != "All":
        if verification == "Verified":
            query = query.filter(RegistryRecord.verified_removals_total_tco2e > 0)
        elif verification == "Pending":
            query = query.filter(RegistryRecord.verified_removals_total_tco2e == 0)

    if search:
        s = f"%{search}%"
        query = query.filter(
            (Project.name.ilike(s)) |
            (Project.project_code.ilike(s)) |
            (RegistryRecord.registry_code.ilike(s)) |
            (Project.country.ilike(s))
        )

    records = query.order_by(RegistryRecord.id.asc()).all()
    results = []

    for r in records:
        p = r.project
        latest_calc = db.query(CarbonCalculation).filter(
            CarbonCalculation.project_id == p.id,
            CarbonCalculation.is_current == True
        ).first()
        est_removals = latest_calc.net_removals_tco2e if latest_calc else 0.0

        dev_name = p.developer_org.name if p.developer_org else "Independent Developer"
        mon_period = f"{p.start_date[:4]} - Present"
        
        results.append(RegistryRecordResponse(
            id=r.id,
            project_id=p.id,
            registry_code=r.registry_code,
            project_code=p.project_code,
            project_name=p.name,
            ecosystem_type=p.ecosystem_type,
            location=f"{p.site_name}, {p.region}, {p.country}",
            project_area=p.total_area_ha,
            developer=dev_name,
            project_status=p.status,
            monitoring_period=mon_period,
            estimated_carbon_removals=est_removals,
            verification_status=r.status,
            last_updated=p.updated_at.strftime("%Y-%m-%d") if p.updated_at else r.listing_date,
            is_public=p.is_public
        ))
    return results

@router.get("/export-csv")
def export_registry_csv(db: Session = Depends(get_db)):
    records = db.query(RegistryRecord).join(Project).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Registry Code", "Project Code", "Project Name", "Ecosystem Type",
        "Location", "Area (ha)", "Developer", "Project Status",
        "Estimated Removals (tCO2e)", "Verified Removals (tCO2e)", "Listing Date"
    ])

    for r in records:
        p = r.project
        latest_calc = db.query(CarbonCalculation).filter(
            CarbonCalculation.project_id == p.id,
            CarbonCalculation.is_current == True
        ).first()
        est = latest_calc.net_removals_tco2e if latest_calc else 0.0
        dev_name = p.developer_org.name if p.developer_org else "N/A"

        writer.writerow([
            r.registry_code,
            p.project_code,
            p.name,
            p.ecosystem_type,
            f"{p.site_name}, {p.region}, {p.country}",
            p.total_area_ha,
            dev_name,
            p.status,
            est,
            r.verified_removals_total_tco2e,
            r.listing_date
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="BlueCarbon_Registry_Export.csv"'}
    )

@router.get("/project-public/{project_code}")
def get_public_project_details(project_code: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    project = db.query(Project).filter(Project.project_code == project_code).first()
    if not project or not project.is_public:
        raise HTTPException(status_code=404, detail="Public project record not found")

    latest_calc = db.query(CarbonCalculation).filter(
        CarbonCalculation.project_id == project.id,
        CarbonCalculation.is_current == True
    ).first()

    public_docs = db.query(Document).filter(
        Document.project_id == project.id,
        Document.is_public == True
    ).all()

    reports = db.query(MonitoringReport).filter(
        MonitoringReport.project_id == project.id,
        MonitoringReport.status == "Approved"
    ).all()

    verifications = []
    for rep in reports:
        if rep.verification_review:
            verifications.append({
                "report_code": rep.report_code,
                "certificate_number": rep.verification_review.certificate_number,
                "review_date": rep.verification_review.review_date,
                "decision": rep.verification_review.decision,
                "statement": rep.verification_review.verification_statement,
                "verified_tco2e": rep.verification_review.verified_net_removals_tco2e
            })

    return {
        "project": {
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
            "site_name": project.site_name,
            "latitude": project.latitude,
            "longitude": project.longitude,
            "total_area_ha": project.total_area_ha,
            "developer_org": project.developer_org.name if project.developer_org else "Independent Developer"
        },
        "boundary_geojson": project.boundary.geojson_geometry if project.boundary else None,
        "baseline": {
            "initial_condition": project.baseline.initial_condition,
            "vegetation_pct": project.baseline.baseline_vegetation_pct,
            "biomass_t_ha": project.baseline.baseline_biomass_t_ha,
            "soc_t_ha": project.baseline.baseline_soc_t_ha,
            "measurement_date": project.baseline.measurement_date,
            "methodology_ref": project.baseline.methodology_ref
        } if project.baseline else None,
        "carbon_estimates": {
            "gross_tco2e": latest_calc.gross_accumulation_tco2e if latest_calc else 0.0,
            "net_removals_tco2e": latest_calc.net_removals_tco2e if latest_calc else 0.0,
            "factor_used": latest_calc.factor_value_used if latest_calc else 0.0,
            "methodology": latest_calc.methodology_version if latest_calc else "Tier 2",
            "assumptions": latest_calc.assumptions_notes if latest_calc else ""
        },
        "verified_certificates": verifications,
        "published_reports": [
            {
                "id": r.id,
                "report_code": r.report_code,
                "period": f"{r.reporting_period_start} to {r.reporting_period_end}",
                "summary": r.summary,
                "net_tco2e": r.calculated_net_tco2e,
                "status": r.status
            } for r in reports
        ],
        "public_documents": [
            {
                "id": d.id,
                "name": d.original_name,
                "category": d.doc_category,
                "file_type": d.file_type,
                "size_kb": d.file_size_kb,
                "upload_date": d.upload_date.strftime("%Y-%m-%d")
            } for d in public_docs
        ],
        "registry_listing": {
            "registry_code": project.registry_record.registry_code if project.registry_record else "Pending",
            "listing_date": project.registry_record.listing_date if project.registry_record else "N/A",
            "verified_removals_total": project.registry_record.verified_removals_total_tco2e if project.registry_record else 0.0,
            "status": project.registry_record.status if project.registry_record else project.status
        }
    }
