import hashlib
from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import Optional, List
from .database import get_db
from .models import User, AuditLog

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

def get_current_user(
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    db: Session = Depends(get_db)
) -> User:
    """
    Retrieves current user. Supports direct demo role switching via header or query,
    defaulting to Administrator for full demo exploration if unspecified.
    """
    if x_user_email:
        user = db.query(User).filter(User.email == x_user_email).first()
        if user:
            return user
            
    if x_user_role:
        user = db.query(User).filter(User.role == x_user_role).first()
        if user:
            return user

    # Default fallback to Admin for demo ease
    user = db.query(User).filter(User.role == "Administrator").first()
    if not user:
        user = db.query(User).first()
    return user

def require_roles(allowed_roles: List[str]):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted for role '{current_user.role}'. Required: {allowed_roles}"
            )
        return current_user
    return role_checker

def log_audit_event(
    db: Session,
    action: str,
    entity_type: str,
    entity_id: str,
    change_summary: str,
    user: Optional[User] = None,
    ip_address: str = "127.0.0.1"
):
    user_id = user.id if user else None
    user_email = user.email if user else "system"
    log = AuditLog(
        user_id=user_id,
        user_email=user_email,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        change_summary=change_summary,
        ip_address=ip_address
    )
    db.add(log)
    db.commit()
    return log
