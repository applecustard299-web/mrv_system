import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import CarbonFactor, CarbonCalculation, Project, User
from ..schemas import (
    CarbonFactorResponse, CarbonFactorUpdate, CarbonCalculationRequest,
    CarbonCalculationResponse
)
from ..auth import get_current_user, require_roles, log_audit_event

router = APIRouter(prefix="/api/carbon", tags=["Carbon Estimation Module"])

@router.get("/factors", response_model=List[CarbonFactorResponse])
def get_carbon_factors(db: Session = Depends(get_db)):
    return db.query(CarbonFactor).all()

@router.put("/factors/{factor_id}", response_model=CarbonFactorResponse)
def update_carbon_factor(
    factor_id: int,
    req: CarbonFactorUpdate,
    current_user: User = Depends(require_roles(["Administrator"])),
    db: Session = Depends(get_db)
):
    factor = db.query(CarbonFactor).filter(CarbonFactor.id == factor_id).first()
    if not factor:
        raise HTTPException(status_code=404, detail="Carbon factor not found")

    old_val = factor.factor_value
    factor.factor_value = req.factor_value
    factor.soil_organic_carbon_rate = req.soil_organic_carbon_rate
    factor.biomass_accumulation_rate = req.biomass_accumulation_rate
    factor.baseline_discount_pct = req.baseline_discount_pct
    factor.default_uncertainty_pct = req.default_uncertainty_pct
    factor.source_reference = req.source_reference
    factor.version = req.version
    factor.updated_at = datetime.datetime.utcnow()
    db.commit()

    log_audit_event(
        db=db,
        action="Carbon Factor Updated",
        entity_type="CarbonFactor",
        entity_id=str(factor.id),
        change_summary=f"Updated factor for '{factor.ecosystem_type}' from {old_val} to {req.factor_value} tCO2e/ha/yr. Ref: {req.source_reference}",
        user=current_user
    )

    db.refresh(factor)
    return factor

@router.post("/calculate", response_model=CarbonCalculationResponse)
def calculate_carbon_estimate(
    req: CarbonCalculationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == req.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    factor_record = db.query(CarbonFactor).filter(CarbonFactor.ecosystem_type == req.ecosystem_type).first()
    
    factor_used = req.custom_factor_value if req.custom_factor_value is not None else (factor_record.factor_value if factor_record else 8.0)
    baseline_pct = req.baseline_discount_pct if req.baseline_discount_pct is not None else (factor_record.baseline_discount_pct if factor_record else 5.0)
    uncert_pct = req.uncertainty_pct if req.uncertainty_pct is not None else (factor_record.default_uncertainty_pct if factor_record else 15.0)
    method_version = factor_record.version if factor_record else "IPCC Wetlands Tier 2"

    # Calculations
    gross = req.area_ha * factor_used * req.period_years
    base_deduct = gross * (baseline_pct / 100.0)
    uncert_deduct = (gross - base_deduct) * (uncert_pct / 100.0)
    net_removals = gross - base_deduct - uncert_deduct

    # Set prior calculations for this project to is_current = False
    db.query(CarbonCalculation).filter(
        CarbonCalculation.project_id == req.project_id,
        CarbonCalculation.is_current == True
    ).update({"is_current": False})

    calc = CarbonCalculation(
        project_id=req.project_id,
        calculated_by_id=current_user.id,
        calculation_date=datetime.datetime.utcnow(),
        methodology_version=method_version,
        ecosystem_type=req.ecosystem_type,
        area_ha=req.area_ha,
        period_years=req.period_years,
        factor_value_used=round(factor_used, 3),
        gross_accumulation_tco2e=round(gross, 2),
        baseline_deduction_tco2e=round(base_deduct, 2),
        uncertainty_deduction_tco2e=round(uncert_deduct, 2),
        net_removals_tco2e=round(net_removals, 2),
        assumptions_notes=req.assumptions_notes or f"Calculated using {factor_used} tCO2e/ha/yr factor, {baseline_pct}% baseline discount, and {uncert_pct}% uncertainty buffer.",
        is_current=True
    )
    db.add(calc)
    db.commit()

    log_audit_event(
        db=db,
        action="Carbon Recalculated",
        entity_type="CarbonCalculation",
        entity_id=str(calc.id),
        change_summary=f"Project {project.project_code}: Calculated {round(net_removals, 1)} tCO2e net removals for {req.period_years} years across {req.area_ha} ha.",
        user=current_user
    )

    db.refresh(calc)
    return calc

@router.get("/history/{project_id}", response_model=List[CarbonCalculationResponse])
def get_project_calculation_history(project_id: int, db: Session = Depends(get_db)):
    return db.query(CarbonCalculation).filter(
        CarbonCalculation.project_id == project_id
    ).order_by(CarbonCalculation.calculation_date.desc()).all()
