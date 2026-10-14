from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import User, Organization
from ..schemas import UserResponse, UserCreate
from ..auth import get_current_user, require_roles, hash_password, log_audit_event
from ..seed_data import reset_and_reseed_database

router = APIRouter(prefix="/api/users", tags=["User Management & Settings"])

@router.get("", response_model=List[UserResponse])
def get_all_users(
    current_user: User = Depends(require_roles(["Administrator"])),
    db: Session = Depends(get_db)
):
    users = db.query(User).all()
    results = []
    for u in users:
        org_name = u.organization.name if u.organization else None
        results.append(UserResponse(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role=u.role,
            organization_id=u.organization_id,
            is_active=u.is_active,
            created_at=u.created_at,
            organization_name=org_name
        ))
    return results

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    req: UserCreate,
    current_user: User = Depends(require_roles(["Administrator"])),
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter(User.email == req.email.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="User email already registered")

    user = User(
        email=req.email.strip(),
        full_name=req.full_name.strip(),
        hashed_password=hash_password(req.password),
        role=req.role,
        organization_id=req.organization_id
    )
    db.add(user)
    db.commit()

    log_audit_event(
        db=db,
        action="User Created",
        entity_type="User",
        entity_id=str(user.id),
        change_summary=f"Admin created user '{user.email}' with role '{user.role}'.",
        user=current_user
    )

    db.refresh(user)
    org_name = user.organization.name if user.organization else None
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        organization_id=user.organization_id,
        is_active=user.is_active,
        created_at=user.created_at,
        organization_name=org_name
    )

@router.post("/reset-demo-data")
def reset_demo_data(
    current_user: User = Depends(require_roles(["Administrator"])),
    db: Session = Depends(get_db)
):
    reset_and_reseed_database(db)
    log_audit_event(
        db=db,
        action="Demo Data Reset",
        entity_type="System",
        entity_id="RESET",
        change_summary="Administrator reset database to default 5 demonstration projects with sample MRV evidence.",
        user=current_user
    )
    return {"message": "Database successfully reset and reseeded with demonstration data."}
