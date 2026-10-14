import json
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from ..database import get_db
from ..models import Project, ProjectBoundary, CarbonCalculation

router = APIRouter(prefix="/api/map", tags=["Geospatial Map"])

ECOSYSTEM_COLORS = {
    "Mangrove restoration": "#15803D", # Forest/Mangrove Green
    "Seagrass conservation or restoration": "#0284C7", # Ocean Blue / Cyan
    "Tidal wetland conservation or restoration": "#D97706" # Warm Wetland Amber
}

@router.get("/geojson")
def get_map_geojson(
    ecosystem: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    query = db.query(Project)
    if ecosystem and ecosystem != "All":
        query = query.filter(Project.ecosystem_type == ecosystem)
    if status and status != "All":
        query = query.filter(Project.status == status)

    projects = query.all()
    features = []

    for p in projects:
        latest_calc = db.query(CarbonCalculation).filter(
            CarbonCalculation.project_id == p.id,
            CarbonCalculation.is_current == True
        ).first()
        removals = latest_calc.net_removals_tco2e if latest_calc else 0.0

        marker_color = ECOSYSTEM_COLORS.get(p.ecosystem_type, "#0F766E")

        # 1. Point Feature for Marker
        point_feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [p.longitude, p.latitude]
            },
            "properties": {
                "id": p.id,
                "project_code": p.project_code,
                "name": p.name,
                "ecosystem_type": p.ecosystem_type,
                "status": p.status,
                "country": p.country,
                "region": p.region,
                "site_name": p.site_name,
                "total_area_ha": p.total_area_ha,
                "net_tco2e": removals,
                "color": marker_color,
                "featureType": "marker"
            }
        }
        features.append(point_feature)

        # 2. Polygon Feature for Boundary (if available)
        if p.boundary and p.boundary.geojson_geometry:
            try:
                geom = json.loads(p.boundary.geojson_geometry)
                poly_feature = {
                    "type": "Feature",
                    "geometry": geom,
                    "properties": {
                        "id": p.id,
                        "project_code": p.project_code,
                        "name": f"{p.name} (Boundary)",
                        "ecosystem_type": p.ecosystem_type,
                        "color": marker_color,
                        "area_ha": p.boundary.area_ha,
                        "featureType": "boundary"
                    }
                }
                features.append(poly_feature)
            except Exception:
                pass

    return {
        "type": "FeatureCollection",
        "features": features,
        "disclaimer": "Project locations and boundaries are for demonstration and registry representation. Real-time satellite validation requires accredited sensor feeds."
    }
