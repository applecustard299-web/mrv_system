import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import (
    MonitoringReport, VerificationReview, Project, RegistryRecord, User
)
from ..schemas import (
    VerificationReviewCreate, VerificationReviewResponse, MonitoringReportResponse
)
from ..auth import get_current_user, require_roles, log_audit_event

router = APIRouter(prefix="/api/verification", tags=["Verification"])

def generate_certificate_number(db: Session) -> str:
    year = datetime.datetime.utcnow().year
    count = db.query(VerificationReview).filter(VerificationReview.decision == "Approved").count() + 1
    return f"CERT-BCR-{year}-{count:04d}"

@router.get("/queue", response_model=List[MonitoringReportResponse])
def get_verification_queue(db: Session = Depends(get_db)):
    reports = db.query(MonitoringReport).filter(
        MonitoringReport.status.in_(["Submitted", "Under Review", "Returned for Correction"])
    ).order_by(MonitoringReport.created_at.desc()).all()

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

@router.post("/reports/{report_id}/decision", response_model=VerificationReviewResponse)
def submit_verification_decision(
    report_id: int,
    req: VerificationReviewCreate,
    current_user: User = Depends(require_roles(["Administrator", "MRV Officer"])),
    db: Session = Depends(get_db)
):
    report = db.query(MonitoringReport).filter(MonitoringReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Monitoring report not found")

    project = report.project
    rev_date = datetime.datetime.utcnow().strftime("%Y-%m-%d")

    cert_num = None
    verified_tco2e = 0.0

    if req.decision == "Approved":
        report.status = "Approved"
        cert_num = generate_certificate_number(db)
        verified_tco2e = report.calculated_net_tco2e
        
        # Upgrade project status to Verified
        project.status = "Verified"

        # Update Registry Record
        if project.registry_record:
            project.registry_record.status = "Registered & Independently Verified"
            project.registry_record.verified_removals_total_tco2e = verified_tco2e
    elif req.decision == "Corrections Requested":
        report.status = "Returned for Correction"
    elif req.decision == "Rejected":
        report.status = "Rejected"

    # Create or update verification review
    review = db.query(VerificationReview).filter(VerificationReview.report_id == report_id).first()
    if not review:
        review = VerificationReview(
            report_id=report_id,
            mrv_officer_id=current_user.id,
            review_date=rev_date,
            findings_summary=req.findings_summary,
            correction_notes=req.correction_notes,
            decision=req.decision,
            verification_statement=req.verification_statement or (
                f"Verification audit concluded decision '{req.decision}' for report {report.report_code}."
            ),
            certificate_number=cert_num,
            verified_net_removals_tco2e=verified_tco2e
        )
        db.add(review)
    else:
        review.mrv_officer_id = current_user.id
        review.review_date = rev_date
        review.findings_summary = req.findings_summary
        review.correction_notes = req.correction_notes
        review.decision = req.decision
        review.verification_statement = req.verification_statement
        review.certificate_number = cert_num
        review.verified_net_removals_tco2e = verified_tco2e

    db.commit()

    log_audit_event(
        db=db,
        action="Verification Decision",
        entity_type="VerificationReview",
        entity_id=cert_num or str(review.id),
        change_summary=f"MRV Officer {current_user.full_name} issued decision '{req.decision}' for report {report.report_code}. Certified removals: {verified_tco2e:,.1f} tCO2e.",
        user=current_user
    )

    db.refresh(review)
    return VerificationReviewResponse(
        id=review.id,
        report_id=review.report_id,
        mrv_officer_name=current_user.full_name,
        review_date=review.review_date,
        findings_summary=review.findings_summary,
        correction_notes=review.correction_notes,
        decision=review.decision,
        verification_statement=review.verification_statement,
        certificate_number=review.certificate_number,
        verified_net_removals_tco2e=review.verified_net_removals_tco2e,
        created_at=review.created_at
    )

@router.get("/history", response_model=List[VerificationReviewResponse])
def get_verification_history(db: Session = Depends(get_db)):
    reviews = db.query(VerificationReview).order_by(VerificationReview.created_at.desc()).all()
    results = []
    for v in reviews:
        officer_name = v.mrv_officer.full_name if v.mrv_officer else "Accredited Officer"
        results.append(VerificationReviewResponse(
            id=v.id,
            report_id=v.report_id,
            mrv_officer_name=officer_name,
            review_date=v.review_date,
            findings_summary=v.findings_summary,
            correction_notes=v.correction_notes,
            decision=v.decision,
            verification_statement=v.verification_statement,
            certificate_number=v.certificate_number,
            verified_net_removals_tco2e=v.verified_net_removals_tco2e,
            created_at=v.created_at
        ))
    return results
