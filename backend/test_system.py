import sys
import os
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.seed_data import seed_database

client = TestClient(app)

def run_all_tests():
    print("==================================================")
    print("RUNNING BLUE CARBON REGISTRY & MRV SYSTEM TEST SUITE")
    print("==================================================")

    # 1. Health check
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("[PASS] 1. Backend API Health Check")

    # 2. Dashboard Metrics
    res = client.get("/api/dashboard/metrics")
    assert res.status_code == 200, f"Dashboard metrics failed: {res.text}"
    data = res.json()
    assert data["total_registered_projects"] >= 5, "Expected at least 5 demonstration projects"
    assert data["total_mapped_area_ha"] > 0, "Expected non-zero mapped area"
    assert data["total_estimated_carbon_removals_tco2e"] > 0, "Expected non-zero estimated carbon removals"
    print(f"[PASS] 2. Dashboard Live Metrics (Projects: {data['total_registered_projects']}, Area: {data['total_mapped_area_ha']} ha, Carbon: {data['total_estimated_carbon_removals_tco2e']} tCO2e)")

    # 3. List Projects
    res = client.get("/api/projects")
    assert res.status_code == 200
    projects = res.json()
    assert len(projects) >= 5
    p1 = projects[0]
    print(f"[PASS] 3. Projects Listing ({len(projects)} projects found, Latest: {p1['project_code']})")

    # 4. Project Registration Wizard
    new_proj_payload = {
        "name": "Mahakam Delta Mangrove Rehabilitation",
        "description": "Restoration of 500 hectares of degraded mangrove mudflats in East Kalimantan.",
        "ecosystem_type": "Mangrove restoration",
        "start_date": "2026-02-01",
        "duration_years": 25,
        "country": "Indonesia",
        "region": "East Kalimantan",
        "district": "Kutai Kartanegara",
        "site_name": "Samboja Estuary",
        "latitude": -0.9234,
        "longitude": 117.1245,
        "total_area_ha": 500.0,
        "developer_org_name": "Borneo Coastal Foundation",
        "initial_condition": "Abandoned shrimp ponds with saline acid soil",
        "baseline_vegetation_pct": 10.0,
        "baseline_biomass_t_ha": 5.0,
        "baseline_soc_t_ha": 70.0,
        "baseline_date": "2026-01-10",
        "methodology_ref": "IPCC Wetlands Tier 2"
    }
    res = client.post("/api/projects", json=new_proj_payload, headers={"X-User-Role": "Project Developer"})
    assert res.status_code == 201, f"Registration failed: {res.text}"
    new_proj = res.json()
    assert "BCR-2026-MG-" in new_proj["project_code"]
    print(f"[PASS] 4. Project Registration Wizard & Auto-Code Generation ({new_proj['project_code']})")

    # 5. Carbon Estimation Engine
    calc_payload = {
        "project_id": new_proj["id"],
        "ecosystem_type": "Mangrove restoration",
        "area_ha": 500.0,
        "period_years": 2.0,
        "custom_factor_value": 9.4,
        "baseline_discount_pct": 5.0,
        "uncertainty_pct": 15.0,
        "assumptions_notes": "Tier 2 factor with 15% uncertainty deduction."
    }
    res = client.post("/api/carbon/calculate", json=calc_payload, headers={"X-User-Role": "Project Developer"})
    assert res.status_code == 200, f"Calculation failed: {res.text}"
    calc = res.json()
    # Expected Gross: 500 * 9.4 * 2 = 9400
    # Expected Baseline: 9400 * 0.05 = 470
    # Expected Uncertainty: (9400 - 470) * 0.15 = 1339.5
    # Net: 9400 - 470 - 1339.5 = 7590.5
    assert abs(calc["gross_accumulation_tco2e"] - 9400.0) < 0.1
    assert abs(calc["net_removals_tco2e"] - 7590.5) < 0.1
    print(f"[PASS] 5. Carbon Estimation Engine Math (Gross: {calc['gross_accumulation_tco2e']} -> Net: {calc['net_removals_tco2e']} tCO2e)")

    # 6. Monitoring Event & Field Measurements
    event_payload = {
        "project_id": new_proj["id"],
        "event_date": "2026-05-15",
        "responsible_person": "Surya Pratama, Field Ecologist",
        "monitoring_type": "Permanent Vegetation Transect Plots",
        "notes": "Year-1 survival survey and seedling count.",
        "measurements": {
            "canopy_cover_pct": 62.5,
            "survival_rate_pct": 86.0,
            "mean_dbh_cm": 4.8,
            "soc_depth_cm": 95.0,
            "salinity_ppt": 17.2,
            "sediment_accretion_mm": 11.0,
            "restoration_progress_pct": 70.0,
            "carbon_stock_estimate_tco2e": 3800.0,
            "notes": "Excellent root establishment."
        }
    }
    res = client.post("/api/monitoring/events", json=event_payload, headers={"X-User-Role": "Project Developer"})
    assert res.status_code == 201, f"Event creation failed: {res.text}"
    event = res.json()
    assert "MTR-" in event["event_code"]
    print(f"[PASS] 6. Monitoring Event & Biometric Measurements ({event['event_code']})")

    # 7. Generate Monitoring Report
    report_payload = {
        "project_id": new_proj["id"],
        "reporting_period_start": "2026-02-01",
        "reporting_period_end": "2026-10-01",
        "summary": "Initial monitoring report confirming healthy seedling survival and sediment accretion.",
        "calculated_net_tco2e": 7590.5
    }
    res = client.post("/api/reports", json=report_payload, headers={"X-User-Role": "Project Developer"})
    assert res.status_code == 201, f"Report creation failed: {res.text}"
    report = res.json()
    assert report["status"] == "Submitted"
    print(f"[PASS] 7. Monitoring Report Generation ({report['report_code']}, Status: Submitted)")

    # 8. Report PDF Download
    res = client.get(f"/api/reports/{report['id']}/download-pdf")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert len(res.content) > 1000
    print(f"[PASS] 8. Official Report PDF Generation (Binary length: {len(res.content)} bytes)")

    # 9. MRV Verification Audit & Certificate Issuance
    verif_payload = {
        "decision": "Approved",
        "findings_summary": "Field plot drone orthomosaic imagery matches reported canopy and transect data.",
        "verification_statement": "The MRV assurance team verifies net blue carbon removals of 7,590.5 tCO2e."
    }
    res = client.post(f"/api/verification/reports/{report['id']}/decision", json=verif_payload, headers={"X-User-Role": "MRV Officer"})
    assert res.status_code == 200, f"Verification failed: {res.text}"
    review = res.json()
    assert review["decision"] == "Approved"
    assert review["certificate_number"].startswith("CERT-BCR-")
    print(f"[PASS] 9. Independent MRV Verification Audit ({review['certificate_number']})")

    # 10. Blue Carbon Registry & CSV Export
    res = client.get("/api/registry")
    assert res.status_code == 200
    records = res.json()
    assert len(records) >= 6
    res_csv = client.get("/api/registry/export-csv")
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]
    print(f"[PASS] 10. Public Blue Carbon Registry & CSV Export ({len(records)} entries)")

    # 11. Audit Log Traceability
    res = client.get("/api/audit")
    assert res.status_code == 200
    logs = res.json()
    assert len(logs) >= 8
    print(f"[PASS] 11. Audit Trail Logging ({len(logs)} audit events captured)")

    # 12. Reset Demo Data
    res = client.post("/api/users/reset-demo-data", headers={"X-User-Role": "Administrator"})
    assert res.status_code == 200
    print("[PASS] 12. Demonstration Dataset Reset & Reseed")

    print("==================================================")
    print("ALL 12 TEST SCENARIOS PASSED WITH ZERO ERRORS!")
    print("==================================================")

if __name__ == "__main__":
    run_all_tests()
