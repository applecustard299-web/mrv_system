from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import User, Organization
from ..schemas import UserResponse, LoginRequest, TokenResponse, RoleSwitchRequest
from ..auth import verify_password, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.strip()).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    org_name = user.organization.name if user.organization else None
    user_resp = UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        organization_id=user.organization_id,
        is_active=user.is_active,
        created_at=user.created_at,
        organization_name=org_name
    )
    return TokenResponse(
        access_token=f"demo-token-{user.id}-{user.role}",
        token_type="bearer",
        user=user_resp
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    org_name = current_user.organization.name if current_user.organization else None
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        organization_id=current_user.organization_id,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        organization_name=org_name
    )

@router.get("/demo-users", response_model=List[UserResponse])
def get_demo_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    resp = []
    for u in users:
        org_name = u.organization.name if u.organization else None
        resp.append(UserResponse(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role=u.role,
            organization_id=u.organization_id,
            is_active=u.is_active,
            created_at=u.created_at,
            organization_name=org_name
        ))
    return resp

@router.post("/switch-role", response_model=UserResponse)
def switch_role(req: RoleSwitchRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.role == req.role).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No demonstration user found with role '{req.role}'"
        )
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
