import os
import shutil
import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import (
    MonitoringEvent, MonitoringMeasurement, Document, Project, User
)
from ..schemas import (
    MonitoringEventCreate, MonitoringEventResponse, DocumentResponse
)
from ..auth import get_current_user, require_roles, log_audit_event

router = APIRouter(prefix="/api/monitoring", tags=["Monitoring & Evidence"])

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOADS_DIR = os.path.join(BACKEND_DIR, "uploads")
ALLOWED_EXTENSIONS = {".pdf", ".csv", ".jpg", ".jpeg", ".png"}

def generate_event_code(db: Session, project_code: str) -> str:
    year = datetime.datetime.utcnow().year
    count = db.query(MonitoringEvent).count() + 1
    return f"MTR-{year}-{count:03d}"

@router.get("/events", response_model=List[MonitoringEventResponse])
def get_monitoring_events(project_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(MonitoringEvent)
    if project_id:
        query = query.filter(MonitoringEvent.project_id == project_id)
    return query.order_by(MonitoringEvent.event_date.desc()).all()

@router.get("/events/{event_id}", response_model=MonitoringEventResponse)
def get_monitoring_event_by_id(event_id: int, db: Session = Depends(get_db)):
    event = db.query(MonitoringEvent).filter(MonitoringEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Monitoring event not found")
    return event

@router.post("/events", response_model=MonitoringEventResponse, status_code=status.HTTP_201_CREATED)
def create_monitoring_event(
    req: MonitoringEventCreate,
    current_user: User = Depends(require_roles(["Administrator", "Project Developer", "MRV Officer"])),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == req.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    event_code = generate_event_code(db, project.project_code)
    
    event = MonitoringEvent(
        project_id=req.project_id,
        event_code=event_code,
        event_date=req.event_date,
        responsible_person=req.responsible_person,
        monitoring_type=req.monitoring_type,
        notes=req.notes
    )
    db.add(event)
    db.commit()

    # Add measurements
    m = req.measurements
    meas = MonitoringMeasurement(
        monitoring_event_id=event.id,
        canopy_cover_pct=m.canopy_cover_pct,
        survival_rate_pct=m.survival_rate_pct,
        mean_dbh_cm=m.mean_dbh_cm,
        soc_depth_cm=m.soc_depth_cm,
        salinity_ppt=m.salinity_ppt,
        sediment_accretion_mm=m.sediment_accretion_mm,
        restoration_progress_pct=m.restoration_progress_pct,
        carbon_stock_estimate_tco2e=m.carbon_stock_estimate_tco2e,
        notes=m.notes
    )
    db.add(meas)
    
    # Update project status to Active Monitoring if currently Approved
    if project.status == "Admin Approved":
        project.status = "Active Monitoring"
        if project.registry_record:
            project.registry_record.status = "Listed - Active Monitoring"

    db.commit()

    log_audit_event(
        db=db,
        action="Monitoring Event Created",
        entity_type="MonitoringEvent",
        entity_id=event.event_code,
        change_summary=f"Logged monitoring event '{event.event_code}' for {project.project_code} by {req.responsible_person}.",
        user=current_user
    )

    db.refresh(event)
    return event

@router.post("/upload-evidence", response_model=DocumentResponse)
def upload_evidence_file(
    project_id: int = Form(...),
    monitoring_event_id: Optional[int] = Form(None),
    doc_category: str = Form("Monitoring Evidence"),
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles(["Administrator", "Project Developer", "MRV Officer"])),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed: {list(ALLOWED_EXTENSIONS)}"
        )

    safe_name = f"{project.project_code}_{int(datetime.datetime.utcnow().timestamp())}_{file.filename.replace(' ', '_')}"
    dest_path = os.path.join(UPLOADS_DIR, safe_name)

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    size_kb = round(os.path.getsize(dest_path) / 1024.0, 1)

    doc = Document(
        project_id=project_id,
        monitoring_event_id=monitoring_event_id,
        file_name=safe_name,
        original_name=file.filename,
        file_type=ext.replace(".", ""),
        file_path=f"uploads/{safe_name}",
        doc_category=doc_category,
        uploaded_by=current_user.email,
        is_public=True,
        file_size_kb=size_kb
    )
    db.add(doc)
    db.commit()

    log_audit_event(
        db=db,
        action="Evidence Uploaded",
        entity_type="Document",
        entity_id=str(doc.id),
        change_summary=f"Uploaded '{file.filename}' ({size_kb} KB) for project {project.project_code}.",
        user=current_user
    )

    db.refresh(doc)
    return doc

@router.get("/documents", response_model=List[DocumentResponse])
def get_documents(project_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Document)
    if project_id:
        query = query.filter(Document.project_id == project_id)
    return query.order_by(Document.upload_date.desc()).all()
