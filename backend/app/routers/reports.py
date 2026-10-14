import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import (
    MonitoringReport, Project, CarbonCalculation, VerificationReview, User
)
from ..schemas import (
    MonitoringReportCreate, MonitoringReportResponse
)
from ..auth import get_current_user, require_roles, log_audit_event
from ..pdf_service import generate_monitoring_report_pdf

router = APIRouter(prefix="/api/reports", tags=["Monitoring Reports"])

def generate_report_code(db: Session, project_code: str) -> str:
    year = datetime.datetime.utcnow().year
    count = db.query(MonitoringReport).count() + 1
    return f"RPT-{year}-{count:03d}"

@router.get("", response_model=List[MonitoringReportResponse])
def get_reports(project_id: Optional[int] = None, status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(MonitoringReport)
    if project_id:
        query = query.filter(MonitoringReport.project_id == project_id)
    if status and status != "All":
        query = query.filter(MonitoringReport.status == status)

    reports = query.order_by(MonitoringReport.created_at.desc()).all()
    results = []
    for r in reports:
        p = r.project
        results.append(MonitoringReportResponse(
            id=r.id,
            project_id=r.project_id,
            project_name=p.name if p else "N/A",
            project_code=p.project_code if p else "N/A",
            report_code=r.report_code,
            reporting_period_start=r.reporting_period_start,
            reporting_period_end=r.reporting_period_end,
            status=r.status,
            summary=r.summary,
            calculated_net_tco2e=r.calculated_net_tco2e,
            submission_date=r.submission_date,
            created_at=r.created_at,
            verification_review=r.verification_review
        ))
    return results

@router.get("/{report_id}", response_model=MonitoringReportResponse)
def get_report_by_id(report_id: int, db: Session = Depends(get_db)):
    r = db.query(MonitoringReport).filter(MonitoringReport.id == report_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Monitoring report not found")
    p = r.project
    return MonitoringReportResponse(
        id=r.id,
        project_id=r.project_id,
        project_name=p.name if p else "N/A",
        project_code=p.project_code if p else "N/A",
        report_code=r.report_code,
        reporting_period_start=r.reporting_period_start,
        reporting_period_end=r.reporting_period_end,
        status=r.status,
        summary=r.summary,
        calculated_net_tco2e=r.calculated_net_tco2e,
        submission_date=r.submission_date,
        created_at=r.created_at,
        verification_review=r.verification_review
    )

@router.post("", response_model=MonitoringReportResponse, status_code=status.HTTP_201_CREATED)
def create_report(
    req: MonitoringReportCreate,
    current_user: User = Depends(require_roles(["Administrator", "Project Developer"])),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == req.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    report_code = generate_report_code(db, project.project_code)
    sub_date = datetime.datetime.utcnow().strftime("%Y-%m-%d")

    report = MonitoringReport(
        project_id=req.project_id,
        report_code=report_code,
        reporting_period_start=req.reporting_period_start,
        reporting_period_end=req.reporting_period_end,
        status="Submitted", # submitted to MRV Officer queue
        summary=req.summary,
        calculated_net_tco2e=req.calculated_net_tco2e,
        submission_date=sub_date,
        created_by_id=current_user.id
    )
    db.add(report)
    db.commit()

    log_audit_event(
        db=db,
        action="Report Submitted",
        entity_type="MonitoringReport",
        entity_id=report.report_code,
        change_summary=f"Monitoring Report '{report.report_code}' submitted for project {project.project_code} ({req.calculated_net_tco2e} tCO2e).",
        user=current_user
    )

    db.refresh(report)
    return MonitoringReportResponse(
        id=report.id,
        project_id=report.project_id,
        project_name=project.name,
        project_code=project.project_code,
        report_code=report.report_code,
        reporting_period_start=report.reporting_period_start,
        reporting_period_end=report.reporting_period_end,
        status=report.status,
        summary=report.summary,
        calculated_net_tco2e=report.calculated_net_tco2e,
        submission_date=report.submission_date,
        created_at=report.created_at,
        verification_review=None
    )

@router.get("/{report_id}/download-pdf")
def download_report_pdf(report_id: int, db: Session = Depends(get_db)):
    report = db.query(MonitoringReport).filter(MonitoringReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Monitoring report not found")

    project = report.project
    verification = report.verification_review

    pdf_stream = generate_monitoring_report_pdf(report, project, verification)
    
    filename = f"BlueCarbon_{report.report_code}.pdf"
    return Response(
        content=pdf_stream.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
