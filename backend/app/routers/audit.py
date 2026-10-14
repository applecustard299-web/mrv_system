from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import AuditLog
from ..schemas import AuditLogResponse

router = APIRouter(prefix="/api/audit", tags=["Audit Log & Traceability"])

@router.get("", response_model=List[AuditLogResponse])
def get_audit_logs(
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    if action and action != "All":
        query = query.filter(AuditLog.action == action)
    if entity_type and entity_type != "All":
        query = query.filter(AuditLog.entity_type == entity_type)
    if search:
        s = f"%{search}%"
        query = query.filter(
            (AuditLog.change_summary.ilike(s)) |
            (AuditLog.user_email.ilike(s)) |
            (AuditLog.entity_id.ilike(s))
        )

    logs = query.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit).all()
    return logs
