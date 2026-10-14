import os
import json
import datetime
from sqlalchemy.orm import Session
from .database import engine, Base
from .models import (
    User, Organization, Project, ProjectBoundary, BaselineAssessment,
    MonitoringEvent, MonitoringMeasurement, Document, CarbonFactor,
    CarbonCalculation, MonitoringReport, VerificationReview, RegistryRecord,
    AuditLog
)
from .auth import hash_password

def seed_database(db: Session):
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    # If users exist, skip unless forced
    if db.query(User).count() > 0:
        return

    # 1. Create Indian Coastal Conservation Organizations
    org_mssrf = Organization(
        name="M.S. Swaminathan Research Foundation (MSSRF) Coastal Cell",
        org_type="Project Developer",
        contact_email="coastal@mssrf.res.in",
        country="India"
    )
    org_sundarbans = Organization(
        name="Sundarbans Biosphere Coastal Trust",
        org_type="Project Developer",
        contact_email="director@sundarbancoastal.org",
        country="India"
    )
    org_wti = Organization(
        name="Wildlife Trust of India (WTI) Marine Division",
        org_type="Project Developer",
        contact_email="marine@wti.org.in",
        country="India"
    )
    org_geer = Organization(
        name="Gujarat Ecological Education and Research (GEER) Foundation",
        org_type="Project Developer",
        contact_email="geer@gujarat.gov.in",
        country="India"
    )
    org_ncscm = Organization(
        name="National Centre for Sustainable Coastal Management (NCSCM)",
        org_type="Verification Body",
        contact_email="audit@ncscm.res.in",
        country="India"
    )
    db.add_all([org_mssrf, org_sundarbans, org_wti, org_geer, org_ncscm])
    db.commit()

    # 2. Create Users (4 Roles)
    admin_user = User(
        email="admin@bluecarbon.org",
        full_name="Dr. Eleanor Vance",
        hashed_password=hash_password("admin123"),
        role="Administrator",
        organization_id=org_ncscm.id
    )
    dev_user = User(
        email="developer@oceanguardians.org",
        full_name="Aarav Mukherjee",
        hashed_password=hash_password("dev123"),
        role="Project Developer",
        organization_id=org_sundarbans.id
    )
    mrv_user = User(
        email="mrv.officer@coastalverify.org",
        full_name="Dr. Sunita Ramanathan",
        hashed_password=hash_password("mrv123"),
        role="MRV Officer",
        organization_id=org_ncscm.id
    )
    public_user = User(
        email="public.observer@earthwatch.net",
        full_name="Rohan Verma",
        hashed_password=hash_password("public123"),
        role="Public User",
        organization_id=None
    )
    db.add_all([admin_user, dev_user, mrv_user, public_user])
    db.commit()

    # 3. Create Carbon Factors for 3 Ecosystems (India-specific IPCC Tier-2 calibration)
    factor_mangrove = CarbonFactor(
        ecosystem_type="Mangrove restoration",
        factor_name="Indian Subcontinent Mangrove Tier-2 Accumulation Factor",
        factor_value=9.40,
        unit="tCO2e/ha/year",
        soil_organic_carbon_rate=3.20,
        biomass_accumulation_rate=6.20,
        baseline_discount_pct=5.0,
        default_uncertainty_pct=15.0,
        source_reference="IPCC Wetlands Supplement (2013) & Alongi et al. Indo-Pacific Mangrove Stocks",
        version="v2.1 (2026)",
        effective_date="2026-01-01"
    )
    factor_seagrass = CarbonFactor(
        ecosystem_type="Seagrass conservation or restoration",
        factor_name="Tropical Indian Ocean Seagrass Meadow Sequestration Factor",
        factor_value=4.50,
        unit="tCO2e/ha/year",
        soil_organic_carbon_rate=3.70,
        biomass_accumulation_rate=0.80,
        baseline_discount_pct=3.0,
        default_uncertainty_pct=20.0,
        source_reference="Fourqurean et al. (2012) & Jagtap et al. Indian Seagrass Biomass (CSIR-NIO)",
        version="v1.8 (2025)",
        effective_date="2025-06-01"
    )
    factor_wetland = CarbonFactor(
        ecosystem_type="Tidal wetland conservation or restoration",
        factor_name="Indian Coastal Saltmarsh & Brackish Lagoon Sequestration Metric",
        factor_value=6.80,
        unit="tCO2e/ha/year",
        soil_organic_carbon_rate=4.50,
        biomass_accumulation_rate=2.30,
        baseline_discount_pct=4.0,
        default_uncertainty_pct=18.0,
        source_reference="Chmura et al. (2003) & Chilika Development Authority Carbon Stock Assessment",
        version="v2.0 (2026)",
        effective_date="2026-01-01"
    )
    db.add_all([factor_mangrove, factor_seagrass, factor_wetland])
    db.commit()

    # Ensure uploads folder and dummy files exist
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    uploads_dir = os.path.join(backend_dir, "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    
    sample_pdd_path = os.path.join(uploads_dir, "Project_Design_Document_Sundarbans.pdf")
    if not os.path.exists(sample_pdd_path):
        with open(sample_pdd_path, "wb") as f:
            f.write(b"%PDF-1.4 Demonstration Indian Blue Carbon PDD\n%%EOF")
            
    sample_csv_path = os.path.join(uploads_dir, "Field_Monitoring_Transect_Data.csv")
    if not os.path.exists(sample_csv_path):
        with open(sample_csv_path, "w", encoding="utf-8") as f:
            f.write("Plot_ID,Location,Canopy_Cover_Pct,Tree_Density_ha,Salinity_ppt,SOC_Pct\nIND-T1,Sundarbans-P1,74.5,1450,18.2,3.12\nIND-T1,Sundarbans-P2,69.0,1390,17.9,2.95\nIND-T2,PalkBay-SG1,82.0,2100,32.4,1.85\nIND-T3,Chilika-TW1,76.5,1600,12.5,2.78\n")

    # 4. Indian Blue Carbon Projects (All 3 Types Covered across Coastal India)
    # --------------------------------------------------------------------------
    # 1. Sundarbans Mangrove (West Bengal, India) - Type: Mangrove restoration
    p1 = Project(
        project_code="BCR-2026-MG-001",
        name="Sundarbans Biosphere Mangrove Delta Ecosystem Restoration",
        developer_org_id=org_sundarbans.id,
        created_by_user_id=dev_user.id,
        description="Community-led hydrological restoration and enrichment planting of native Avicennia marina and Rhizophora mucronata mangroves across 1,450 hectares of abandoned saline aquaculture bunds and eroded mudflats in the Gosaba and Basanti blocks of the Sundarbans Biosphere Reserve.",
        ecosystem_type="Mangrove restoration",
        status="Verified",
        start_date="2024-03-15",
        duration_years=25,
        country="India",
        region="West Bengal",
        district="South 24 Parganas",
        site_name="Gosaba & Basanti Intertidal Sector",
        latitude=21.9497,
        longitude=88.8920,
        total_area_ha=1450.0,
        is_public=True
    )
    db.add(p1)
    db.commit()

    poly1 = {
        "type": "Polygon",
        "coordinates": [[
            [88.860, 21.930],
            [88.920, 21.930],
            [88.925, 21.970],
            [88.865, 21.975],
            [88.860, 21.930]
        ]]
    }
    b1 = ProjectBoundary(project_id=p1.id, geojson_geometry=json.dumps(poly1), area_ha=1450.0)
    base1 = BaselineAssessment(
        project_id=p1.id,
        initial_condition="Hypersaline abandoned shrimp ponds with breached mud embankments",
        baseline_vegetation_pct=11.5,
        baseline_biomass_t_ha=8.4,
        baseline_soc_t_ha=74.2,
        measurement_date="2024-01-20",
        methodology_ref="IPCC Wetlands Supplement (2013) & VM0033",
        verified_by="National Centre for Sustainable Coastal Management (NCSCM)"
    )
    db.add_all([b1, base1])
    db.commit()

    # 2. Palk Bay & Gulf of Mannar Seagrass (Tamil Nadu, India) - Type: Seagrass conservation or restoration
    p2 = Project(
        project_code="BCR-2026-SG-002",
        name="Palk Bay & Gulf of Mannar Dugong Seagrass Meadow Conservation",
        developer_org_id=org_wti.id,
        created_by_user_id=dev_user.id,
        description="Assisted natural recovery and community co-management of 2,800 hectares of critical Cymodocea serrulata and Halodule uninervis seagrass meadows in Palk Bay, protecting high-capacity benthic carbon sinks and vital foraging habitat for endangered dugongs.",
        ecosystem_type="Seagrass conservation or restoration",
        status="Active Monitoring",
        start_date="2024-08-01",
        duration_years=30,
        country="India",
        region="Tamil Nadu",
        district="Ramanathapuram",
        site_name="Manamelkudi & Thondi Benthic Shoals",
        latitude=9.7200,
        longitude=79.0500,
        total_area_ha=2800.0,
        is_public=True
    )
    db.add(p2)
    db.commit()

    poly2 = {
        "type": "Polygon",
        "coordinates": [[
            [79.010, 9.690],
            [79.090, 9.690],
            [79.095, 9.750],
            [79.015, 9.750],
            [79.010, 9.690]
        ]]
    }
    b2 = ProjectBoundary(project_id=p2.id, geojson_geometry=json.dumps(poly2), area_ha=2800.0)
    base2 = BaselineAssessment(
        project_id=p2.id,
        initial_condition="Patchy benthic blowout areas degraded by bottom-trawling gear",
        baseline_vegetation_pct=18.5,
        baseline_biomass_t_ha=3.8,
        baseline_soc_t_ha=98.0,
        measurement_date="2024-06-15",
        methodology_ref="VM0033 Coastal Wetland & Seagrass Methodology",
        verified_by="MSSRF Marine Ecology Cell"
    )
    db.add_all([b2, base2])
    db.commit()

    # 3. Chilika Lake Coastal Tidal Wetland (Odisha, India) - Type: Tidal wetland conservation or restoration
    p3 = Project(
        project_code="BCR-2026-TW-003",
        name="Chilika Lagoon Brackish Tidal Marsh & Saltmarsh Rehabilitation",
        developer_org_id=org_mssrf.id,
        created_by_user_id=dev_user.id,
        description="Hydrological reconnection and eco-restoration of 1,850 hectares of degraded intertidal brackish saltmarshes and Phragmites karka wetland buffers along the southern sector of Chilika Lake Ramsar site, curbing siltation and maximizing sediment carbon sequestration.",
        ecosystem_type="Tidal wetland conservation or restoration",
        status="Verified",
        start_date="2023-11-10",
        duration_years=20,
        country="India",
        region="Odisha",
        district="Puri & Khurda",
        site_name="Satapada Outer Channel Reach",
        latitude=19.7200,
        longitude=85.3200,
        total_area_ha=1850.0,
        is_public=True
    )
    db.add(p3)
    db.commit()

    poly3 = {
        "type": "Polygon",
        "coordinates": [[
            [85.280, 19.690],
            [85.360, 19.690],
            [85.365, 19.750],
            [85.285, 19.750],
            [85.280, 19.690]
        ]]
    }
    b3 = ProjectBoundary(project_id=p3.id, geojson_geometry=json.dumps(poly3), area_ha=1850.0)
    base3 = BaselineAssessment(
        project_id=p3.id,
        initial_condition="Silted wetland edges with interrupted tidal flushing and macrophyte decay",
        baseline_vegetation_pct=24.0,
        baseline_biomass_t_ha=6.2,
        baseline_soc_t_ha=88.5,
        measurement_date="2023-09-12",
        methodology_ref="IPCC Wetlands Supplement (2013) Tier 2"
    )
    db.add_all([b3, base3])
    db.commit()

    # 4. Gulf of Kutch Mangrove Restoration (Gujarat, India) - Type: Mangrove restoration
    p4 = Project(
        project_code="BCR-2026-MG-004",
        name="Gulf of Kutch Marine National Park Arid Mangrove Restoration",
        developer_org_id=org_geer.id,
        created_by_user_id=dev_user.id,
        description="Afforestation of 1,120 hectares of hyper-saline mudflats using ridge-ditch fishbone canal planting with salt-tolerant Avicennia marina in the Marine National Park intertidal zone, providing vital coastal defense against cyclones.",
        ecosystem_type="Mangrove restoration",
        status="Active Monitoring",
        start_date="2024-05-20",
        duration_years=25,
        country="India",
        region="Gujarat",
        district="Jamnagar",
        site_name="Pirotan Island Coastal Mudflat",
        latitude=22.4707,
        longitude=70.0577,
        total_area_ha=1120.0,
        is_public=True
    )
    db.add(p4)
    db.commit()

    poly4 = {
        "type": "Polygon",
        "coordinates": [[
            [70.020, 22.440],
            [70.090, 22.440],
            [70.095, 22.500],
            [70.025, 22.500],
            [70.020, 22.440]
        ]]
    }
    b4 = ProjectBoundary(project_id=p4.id, geojson_geometry=json.dumps(poly4), area_ha=1120.0)
    base4 = BaselineAssessment(
        project_id=p4.id,
        initial_condition="Barren hyper-saline mudflat devoid of canopy vegetation",
        baseline_vegetation_pct=5.0,
        baseline_biomass_t_ha=2.1,
        baseline_soc_t_ha=45.0,
        measurement_date="2024-03-10",
        methodology_ref="IPCC Wetlands Tier 2 Arid Mangrove Models"
    )
    db.add_all([b4, base4])
    db.commit()

    # 5. Lakshadweep Atoll Seagrass (Lakshadweep, India) - Type: Seagrass conservation or restoration
    p5 = Project(
        project_code="BCR-2026-SG-005",
        name="Lakshadweep Coral Atoll Lagoon Seagrass Carbon Sink Initiative",
        developer_org_id=org_wti.id,
        created_by_user_id=dev_user.id,
        description="Protection and benthic stabilization of 950 hectares of dense Thalassia hemprichii seagrass beds in the shallow sheltered lagoons of Kavaratti and Agatti atolls, preventing coastal sand erosion and storing significant organic blue carbon.",
        ecosystem_type="Seagrass conservation or restoration",
        status="Admin Approved",
        start_date="2025-01-10",
        duration_years=20,
        country="India",
        region="Lakshadweep",
        district="Kavaratti",
        site_name="Agatti-Kavaratti Lagoon System",
        latitude=10.5667,
        longitude=72.6417,
        total_area_ha=950.0,
        is_public=True
    )
    db.add(p5)
    db.commit()

    poly5 = {
        "type": "Polygon",
        "coordinates": [[
            [72.610, 10.540],
            [72.670, 10.540],
            [72.675, 10.590],
            [72.615, 10.590],
            [72.610, 10.540]
        ]]
    }
    b5 = ProjectBoundary(project_id=p5.id, geojson_geometry=json.dumps(poly5), area_ha=950.0)
    base5 = BaselineAssessment(
        project_id=p5.id,
        initial_condition="Coral rubble and shallow sand flats with sparse seagrass rhizome mats",
        baseline_vegetation_pct=19.0,
        baseline_biomass_t_ha=3.2,
        baseline_soc_t_ha=82.0,
        measurement_date="2024-11-20",
        methodology_ref="VM0033"
    )
    db.add_all([b5, base5])
    db.commit()

    # 6. Pichavaram Mangrove (Tamil Nadu, India) - Type: Mangrove restoration
    p6 = Project(
        project_code="BCR-2026-MG-006",
        name="Pichavaram Estuarine Mangrove Forest Rehabilitation",
        developer_org_id=org_mssrf.id,
        created_by_user_id=dev_user.id,
        description="Restoration of 480 hectares of degraded mangrove wetlands between the Vellar and Coleroon estuaries in Cuddalore district using canal-bank re-vegetation techniques with Rhizophora apiculata and Bruguiera cylindrica.",
        ecosystem_type="Mangrove restoration",
        status="Verified",
        start_date="2023-10-01",
        duration_years=20,
        country="India",
        region="Tamil Nadu",
        district="Cuddalore",
        site_name="Pichavaram Estuary Reach",
        latitude=11.4286,
        longitude=79.7797,
        total_area_ha=480.0,
        is_public=True
    )
    db.add(p6)
    db.commit()

    poly6 = {
        "type": "Polygon",
        "coordinates": [[
            [79.750, 11.410],
            [79.810, 11.410],
            [79.815, 11.450],
            [79.755, 11.450],
            [79.750, 11.410]
        ]]
    }
    b6 = ProjectBoundary(project_id=p6.id, geojson_geometry=json.dumps(poly6), area_ha=480.0)
    base6 = BaselineAssessment(
        project_id=p6.id,
        initial_condition="Degraded saline blanks caused by reduced freshwater influx from dams",
        baseline_vegetation_pct=14.0,
        baseline_biomass_t_ha=6.5,
        baseline_soc_t_ha=68.0,
        measurement_date="2023-08-10",
        methodology_ref="IPCC Wetlands Supplement 2013"
    )
    db.add_all([b6, base6])
    db.commit()

    # 7. Vembanad-Kol Tidal Wetland (Kerala, India) - Type: Tidal wetland conservation or restoration
    p7 = Project(
        project_code="BCR-2026-TW-007",
        name="Vembanad-Kol Ramsar Tidal Wetland & Backwater Mangrove Buffer",
        developer_org_id=org_wti.id,
        created_by_user_id=dev_user.id,
        description="Regenerative coastal wetland habitat restoration across 740 hectares in the Vembanad estuarine backwaters, focusing on saltmarsh flora, Pokkali farming integration, and indigenous mangrove barriers.",
        ecosystem_type="Tidal wetland conservation or restoration",
        status="Active Monitoring",
        start_date="2024-07-01",
        duration_years=25,
        country="India",
        region="Kerala",
        district="Alappuzha & Kottayam",
        site_name="Kumarakom Tidal Estuary",
        latitude=9.6100,
        longitude=76.4300,
        total_area_ha=740.0,
        is_public=True
    )
    db.add(p7)
    db.commit()

    poly7 = {
        "type": "Polygon",
        "coordinates": [[
            [76.400, 9.580],
            [76.460, 9.580],
            [76.465, 9.640],
            [76.405, 9.640],
            [76.400, 9.580]
        ]]
    }
    b7 = ProjectBoundary(project_id=p7.id, geojson_geometry=json.dumps(poly7), area_ha=740.0)
    base7 = BaselineAssessment(
        project_id=p7.id,
        initial_condition="Polluted backwater marsh with water hyacinth invasion and bank erosion",
        baseline_vegetation_pct=21.0,
        baseline_biomass_t_ha=5.2,
        baseline_soc_t_ha=85.0,
        measurement_date="2024-04-12",
        methodology_ref="VM0033"
    )
    db.add_all([b7, base7])
    db.commit()

    # 8. Coringa Mangroves (Andhra Pradesh, India) - Type: Mangrove restoration
    p8 = Project(
        project_code="BCR-2026-MG-008",
        name="Coringa Wildlife Sanctuary & Godavari Delta Mangrove Conservation",
        developer_org_id=org_mssrf.id,
        created_by_user_id=dev_user.id,
        description="Conservation and assisted planting across 650 hectares in the Godavari mangrove estuary, restoring natural tidal creeks, protecting endangered fishing cats, and building climate resilience against storms.",
        ecosystem_type="Mangrove restoration",
        status="Submitted",
        start_date="2025-02-15",
        duration_years=25,
        country="India",
        region="Andhra Pradesh",
        district="Kakinada",
        site_name="Coringa River Estuary",
        latitude=16.8900,
        longitude=82.3200,
        total_area_ha=650.0,
        is_public=True
    )
    db.add(p8)
    db.commit()

    poly8 = {
        "type": "Polygon",
        "coordinates": [[
            [82.290, 16.860],
            [82.350, 16.860],
            [82.355, 16.920],
            [82.295, 16.920],
            [82.290, 16.860]
        ]]
    }
    b8 = ProjectBoundary(project_id=p8.id, geojson_geometry=json.dumps(poly8), area_ha=650.0)
    base8 = BaselineAssessment(
        project_id=p8.id,
        initial_condition="Degraded intertidal fringe affected by seasonal cyclone washouts",
        baseline_vegetation_pct=17.0,
        baseline_biomass_t_ha=7.8,
        baseline_soc_t_ha=66.0,
        measurement_date="2024-12-15",
        methodology_ref="IPCC Wetlands Supplement 2013"
    )
    db.add_all([b8, base8])
    db.commit()

    # 5. Monitoring Events & Measurements
    # Event 1 for Sundarbans (P1)
    m1 = MonitoringEvent(
        project_id=p1.id,
        event_code="MTR-2025-001",
        event_date="2025-04-12",
        responsible_person="Dr. A. Ghosh & West Bengal Forest Directorate",
        monitoring_type="Field Survey & Drone UAV Mapping",
        notes="Year-1 survival survey and sediment accretion pin measurements across 25 permanent plots in Gosaba."
    )
    db.add(m1)
    db.commit()

    meas1 = MonitoringMeasurement(
        monitoring_event_id=m1.id,
        canopy_cover_pct=66.8,
        survival_rate_pct=84.5,
        mean_dbh_cm=5.6,
        soc_depth_cm=100.0,
        salinity_ppt=18.5,
        sediment_accretion_mm=13.2,
        restoration_progress_pct=74.0,
        carbon_stock_estimate_tco2e=10850.0,
        notes="Vigorous prop root formation in Rhizophora; Avicennia pneumatophores established."
    )
    db.add(meas1)
    db.commit()

    # Event 2 for Palk Bay Seagrass (P2)
    m2 = MonitoringEvent(
        project_id=p2.id,
        event_code="MTR-2025-002",
        event_date="2025-05-18",
        responsible_person="K. Balakrishnan, Marine Biologist",
        monitoring_type="Underwater Quadrat Scuba & Drone Photogrammetry",
        notes="Benthic quadrat photo-transects assessing shoot density and sediment carbon core depths."
    )
    db.add(m2)
    db.commit()

    meas2 = MonitoringMeasurement(
        monitoring_event_id=m2.id,
        canopy_cover_pct=72.0,
        survival_rate_pct=88.0,
        mean_dbh_cm=None,
        soc_depth_cm=65.0,
        salinity_ppt=33.2,
        sediment_accretion_mm=7.4,
        restoration_progress_pct=68.0,
        carbon_stock_estimate_tco2e=9700.0,
        notes="Shoot density expanded to 340 shoots/m2; no evidence of active trawler damage."
    )
    db.add(meas2)
    db.commit()

    # Event 3 for Chilika Lagoon (P3)
    m3 = MonitoringEvent(
        project_id=p3.id,
        event_code="MTR-2025-003",
        event_date="2025-06-20",
        responsible_person="Dr. B. C. Panda, Wetland Ecologist",
        monitoring_type="RTK GPS Survey & Benthic Soil Coring",
        notes="Annual marsh elevation table (SET) recording and belowground root core collection."
    )
    db.add(m3)
    db.commit()

    meas3 = MonitoringMeasurement(
        monitoring_event_id=m3.id,
        canopy_cover_pct=78.5,
        survival_rate_pct=89.5,
        mean_dbh_cm=None,
        soc_depth_cm=85.0,
        salinity_ppt=12.2,
        sediment_accretion_mm=9.1,
        restoration_progress_pct=82.0,
        carbon_stock_estimate_tco2e=10200.0,
        notes="Saltmarsh vegetative accretion exceeds regional relative sea level rise by 3.8 mm/yr."
    )
    db.add(meas3)
    db.commit()

    # 6. Documents
    doc1 = Document(
        project_id=p1.id,
        monitoring_event_id=m1.id,
        file_name="Project_Design_Document_Sundarbans.pdf",
        original_name="Sundarbans_India_BlueCarbon_PDD.pdf",
        file_type="pdf",
        file_path="uploads/Project_Design_Document_Sundarbans.pdf",
        doc_category="Project Design Document",
        uploaded_by="developer@oceanguardians.org",
        is_public=True,
        file_size_kb=348.5
    )
    doc2 = Document(
        project_id=p1.id,
        monitoring_event_id=m1.id,
        file_name="Field_Monitoring_Transect_Data.csv",
        original_name="Indian_Coast_Field_Transects_2025.csv",
        file_type="csv",
        file_path="uploads/Field_Monitoring_Transect_Data.csv",
        doc_category="Monitoring Evidence",
        uploaded_by="developer@oceanguardians.org",
        is_public=True,
        file_size_kb=42.1
    )
    db.add_all([doc1, doc2])
    db.commit()

    # 7. Carbon Calculations
    # For P1 (Sundarbans: 1450 ha, factor 9.40, 2 yrs)
    # Gross = 1450 * 9.40 * 2 = 27,260 tCO2e
    # Baseline 5% = 1,363
    # Uncertainty 15% = 3,884.55
    # Net = 22,012.45 -> 22012.5 tCO2e
    calc1 = CarbonCalculation(
        project_id=p1.id,
        calculated_by_id=dev_user.id,
        methodology_version="IPCC Wetlands (2013) Tier 2 / VM0033",
        ecosystem_type="Mangrove restoration",
        area_ha=1450.0,
        period_years=2.0,
        factor_value_used=9.40,
        gross_accumulation_tco2e=27260.0,
        baseline_deduction_tco2e=1363.0,
        uncertainty_deduction_tco2e=3884.6,
        net_removals_tco2e=22012.4,
        assumptions_notes="Applied 15% methodological uncertainty buffer and 5% baseline degradation discount.",
        is_current=True
    )

    # For P2 (Palk Bay Seagrass: 2800 ha, factor 4.50, 1 yr)
    # Gross = 2800 * 4.50 * 1 = 12,600 tCO2e
    # Baseline 3% = 378
    # Uncertainty 20% = 2,444.4
    # Net = 9,777.6 tCO2e
    calc2 = CarbonCalculation(
        project_id=p2.id,
        calculated_by_id=dev_user.id,
        methodology_version="VM0033 v2.0",
        ecosystem_type="Seagrass conservation or restoration",
        area_ha=2800.0,
        period_years=1.0,
        factor_value_used=4.50,
        gross_accumulation_tco2e=12600.0,
        baseline_deduction_tco2e=378.0,
        uncertainty_deduction_tco2e=2444.4,
        net_removals_tco2e=9777.6,
        assumptions_notes="Tropical seagrass meadow shoot recovery rate with 20% conservative uncertainty buffer.",
        is_current=True
    )

    # For P3 (Chilika Lake Tidal Wetland: 1850 ha, factor 6.80, 2 yrs)
    # Gross = 1850 * 6.80 * 2 = 25,160 tCO2e
    # Baseline 4% = 1,006.4
    # Uncertainty 18% = 4,347.65
    # Net = 19,805.95 -> 19806.0 tCO2e
    calc3 = CarbonCalculation(
        project_id=p3.id,
        calculated_by_id=dev_user.id,
        methodology_version="IPCC Wetlands (2013) Tier 2",
        ecosystem_type="Tidal wetland conservation or restoration",
        area_ha=1850.0,
        period_years=2.0,
        factor_value_used=6.80,
        gross_accumulation_tco2e=25160.0,
        baseline_deduction_tco2e=1006.4,
        uncertainty_deduction_tco2e=4347.7,
        net_removals_tco2e=19805.9,
        assumptions_notes="Computed using continuous Chilika Development Authority tide datums and sediment accretion tables.",
        is_current=True
    )

    # For P6 (Pichavaram Mangrove: 480 ha, factor 9.40, 2 yrs)
    # Gross = 480 * 9.40 * 2 = 9,024 tCO2e
    # Baseline 5% = 451.2
    # Uncertainty 15% = 1,285.92
    # Net = 7,286.88 -> 7286.9 tCO2e
    calc6 = CarbonCalculation(
        project_id=p6.id,
        calculated_by_id=dev_user.id,
        methodology_version="IPCC Wetlands (2013) Tier 2",
        ecosystem_type="Mangrove restoration",
        area_ha=480.0,
        period_years=2.0,
        factor_value_used=9.40,
        gross_accumulation_tco2e=9024.0,
        baseline_deduction_tco2e=451.2,
        uncertainty_deduction_tco2e=1285.9,
        net_removals_tco2e=7286.9,
        assumptions_notes="Canal-bank estuarine mangrove accounting with 15% uncertainty buffer.",
        is_current=True
    )

    db.add_all([calc1, calc2, calc3, calc6])
    db.commit()

    # 8. Monitoring Reports
    rpt1 = MonitoringReport(
        project_id=p1.id,
        report_code="RPT-2025-MG-001",
        reporting_period_start="2024-03-15",
        reporting_period_end="2025-03-14",
        status="Approved",
        summary="Comprehensive Biennial MRV Report covering Year 1 and 2 of the Sundarbans Biosphere Mangrove Delta Restoration in West Bengal. High seedling survival rate (84.5%) and sediment accretion validate healthy carbon accumulation.",
        calculated_net_tco2e=22012.4,
        submission_date="2025-04-18",
        created_by_id=dev_user.id
    )
    rpt3 = MonitoringReport(
        project_id=p3.id,
        report_code="RPT-2025-TW-002",
        reporting_period_start="2023-11-10",
        reporting_period_end="2025-06-10",
        status="Approved",
        summary="Monitoring assessment covering 1,850 hectares of tidal saltmarsh rehabilitation in Chilika Lake, Odisha. Soil organic carbon cores indicate accretion rates of 9.1 mm/year.",
        calculated_net_tco2e=19805.9,
        submission_date="2025-07-02",
        created_by_id=dev_user.id
    )
    rpt2 = MonitoringReport(
        project_id=p2.id,
        report_code="RPT-2025-SG-003",
        reporting_period_start="2024-08-01",
        reporting_period_end="2025-07-31",
        status="Submitted",
        summary="First annual monitoring cycle for Palk Bay dugong seagrass meadow conservation in Tamil Nadu. Underwater quadrat surveys confirm significant shoot density gain.",
        calculated_net_tco2e=9777.6,
        submission_date="2025-08-20",
        created_by_id=dev_user.id
    )
    rpt6 = MonitoringReport(
        project_id=p6.id,
        report_code="RPT-2025-MG-004",
        reporting_period_start="2023-10-01",
        reporting_period_end="2025-09-30",
        status="Approved",
        summary="Biennial report for Pichavaram mangrove estuarine rehabilitation in Cuddalore, Tamil Nadu. Canal bank survival validated by drone orthomosaics.",
        calculated_net_tco2e=7286.9,
        submission_date="2025-10-05",
        created_by_id=dev_user.id
    )
    db.add_all([rpt1, rpt3, rpt2, rpt6])
    db.commit()

    # 9. Verification Reviews
    v1 = VerificationReview(
        report_id=rpt1.id,
        mrv_officer_id=mrv_user.id,
        review_date="2025-05-02",
        findings_summary="Independent field audit by NCSCM confirmed concordant ground plot GPS logs, high resolution drone imagery, and verified lab soil core spectrometry in the Sundarbans.",
        correction_notes=None,
        decision="Approved",
        verification_statement="The independent verifier confirms with high certainty that 22,012.4 tCO2e of net blue carbon removals occurred during the specified reporting interval.",
        certificate_number="CERT-BCR-2025-0109",
        verified_net_removals_tco2e=22012.4
    )
    v3 = VerificationReview(
        report_id=rpt3.id,
        mrv_officer_id=mrv_user.id,
        review_date="2025-07-20",
        findings_summary="Hydrological reconnectivity and RTK elevation metrics cross-referenced against Survey of India benchmark datums in Chilika Lake.",
        correction_notes=None,
        decision="Approved",
        verification_statement="The MRV body validates net blue carbon removals of 19,805.9 tCO2e across 1,850 hectares.",
        certificate_number="CERT-BCR-2025-0234",
        verified_net_removals_tco2e=19805.9
    )
    v6 = VerificationReview(
        report_id=rpt6.id,
        mrv_officer_id=mrv_user.id,
        review_date="2025-10-25",
        findings_summary="MSSRF canal fishbone planting audited; verified healthy canopy closure across 480 hectares of Pichavaram estuary.",
        correction_notes=None,
        decision="Approved",
        verification_statement="Independent MRV verification body approves 7,286.9 tCO2e net removals.",
        certificate_number="CERT-BCR-2025-0312",
        verified_net_removals_tco2e=7286.9
    )
    db.add_all([v1, v3, v6])
    db.commit()

    # 10. Registry Records
    reg1 = RegistryRecord(
        project_id=p1.id,
        registry_code="REG-IND-2025-001",
        listing_date="2025-05-10",
        verified_removals_total_tco2e=22012.4,
        status="Registered & Independently Verified",
        public_url="/registry/BCR-2026-MG-001"
    )
    reg2 = RegistryRecord(
        project_id=p2.id,
        registry_code="REG-IND-2025-002",
        listing_date="2024-09-01",
        verified_removals_total_tco2e=0.0,
        status="Listed - Active Monitoring",
        public_url="/registry/BCR-2026-SG-002"
    )
    reg3 = RegistryRecord(
        project_id=p3.id,
        registry_code="REG-IND-2025-003",
        listing_date="2025-08-01",
        verified_removals_total_tco2e=19805.9,
        status="Registered & Independently Verified",
        public_url="/registry/BCR-2026-TW-003"
    )
    reg4 = RegistryRecord(
        project_id=p4.id,
        registry_code="REG-IND-2025-004",
        listing_date="2024-06-01",
        verified_removals_total_tco2e=0.0,
        status="Listed - Active Monitoring",
        public_url="/registry/BCR-2026-MG-004"
    )
    reg5 = RegistryRecord(
        project_id=p5.id,
        registry_code="REG-IND-2025-005",
        listing_date="2025-02-01",
        verified_removals_total_tco2e=0.0,
        status="Admin Approved - Baseline Recorded",
        public_url="/registry/BCR-2026-SG-005"
    )
    reg6 = RegistryRecord(
        project_id=p6.id,
        registry_code="REG-IND-2025-006",
        listing_date="2025-11-01",
        verified_removals_total_tco2e=7286.9,
        status="Registered & Independently Verified",
        public_url="/registry/BCR-2026-MG-006"
    )
    reg7 = RegistryRecord(
        project_id=p7.id,
        registry_code="REG-IND-2025-007",
        listing_date="2024-08-15",
        verified_removals_total_tco2e=0.0,
        status="Listed - Active Monitoring",
        public_url="/registry/BCR-2026-TW-007"
    )
    reg8 = RegistryRecord(
        project_id=p8.id,
        registry_code="REG-IND-2025-008",
        listing_date="2025-02-25",
        verified_removals_total_tco2e=0.0,
        status="Under Administrative Review",
        public_url="/registry/BCR-2026-MG-008"
    )
    db.add_all([reg1, reg2, reg3, reg4, reg5, reg6, reg7, reg8])
    db.commit()

    # 11. Audit Logs
    logs = [
        AuditLog(user_id=admin_user.id, user_email=admin_user.email, action="System Initialized", entity_type="System", entity_id="ROOT", change_summary="Initialized India National Blue Carbon Registry with calibrated IPCC Tier-2 factors."),
        AuditLog(user_id=dev_user.id, user_email=dev_user.email, action="Project Registered", entity_type="Project", entity_id=p1.project_code, change_summary="Registered 1,450 ha Sundarbans Delta mangrove restoration project in West Bengal."),
        AuditLog(user_id=dev_user.id, user_email=dev_user.email, action="Project Registered", entity_type="Project", entity_id=p2.project_code, change_summary="Registered 2,800 ha Palk Bay & Gulf of Mannar seagrass meadow conservation in Tamil Nadu."),
        AuditLog(user_id=dev_user.id, user_email=dev_user.email, action="Project Registered", entity_type="Project", entity_id=p3.project_code, change_summary="Registered 1,850 ha Chilika Lagoon tidal wetland restoration project in Odisha."),
        AuditLog(user_id=dev_user.id, user_email=dev_user.email, action="Evidence Uploaded", entity_type="Document", entity_id="DOC-1", change_summary="Uploaded Project Design Document and Baseline Transect dataset for Indian coastal sites."),
        AuditLog(user_id=dev_user.id, user_email=dev_user.email, action="Carbon Recalculated", entity_type="CarbonCalculation", entity_id=str(calc1.id), change_summary="Estimated 22,012.4 tCO2e net removals for Sundarbans applying 15% uncertainty buffer."),
        AuditLog(user_id=dev_user.id, user_email=dev_user.email, action="Report Submitted", entity_type="MonitoringReport", entity_id=rpt1.report_code, change_summary="Submitted Biennial Monitoring Report for independent MRV evaluation."),
        AuditLog(user_id=mrv_user.id, user_email=mrv_user.email, action="Verification Decision", entity_type="VerificationReview", entity_id=v1.certificate_number, change_summary="NCSCM MRV Officer approved verification. Issued Certificate CERT-BCR-2025-0109.")
    ]
    db.add_all(logs)
    db.commit()

def reset_and_reseed_database(db: Session):
    """
    Clears all application data and recreates clean demonstration data.
    """
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_database(db)
