# Blue Carbon Registry & MRV System

A modern, fully functional digital registry and Monitoring, Reporting, and Verification (MRV) web platform prototype designed for coastal blue carbon restoration and conservation projects across **Mangroves**, **Seagrasses**, and **Tidal Wetlands**.

---

## 1. System Overview

The Blue Carbon Registry and MRV System provides a centralized digital platform where:
- **Project Developers** register coastal restoration sites, record baseline conditions, upload field observations, and submit structured monitoring reports.
- **MRV Officers** audit submitted evidence (transect logs, drone imagery, soil cores), execute verification checklists, and issue formal verification statements and certificates.
- **Administrators** govern project approvals, manage user roles, configure Tier-2 ecosystem emission factors, review the audit trail, and manage demonstration datasets.
- **Public Observers** explore registered project boundaries on an interactive Leaflet map, inspect published baseline data, view carbon estimates, and download official verification reports.

---

## 2. Core Architecture & Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18 (TypeScript) + Vite | High-performance reactive user interface |
| **Styling** | Tailwind CSS | Modern environmental theme (Navy `#0B192C`, Deep Teal `#0F766E`, Mangrove Green `#15803D`) |
| **UI Components** | Lucide Icons + Custom Badges | Consistent iconography, status indicators, and modal dialogs |
| **Geospatial Maps** | Leaflet + OpenStreetMap | Interactive boundary polygons, color-coded ecosystem markers, and point picker |
| **Analytics & Charts** | Recharts | Dynamic donut charts, regional area bars, and cumulative removals timelines |
| **Backend API** | Python 3.10 + FastAPI | Fast asynchronous RESTful API with automated Swagger docs at `/docs` |
| **Database** | SQLite + SQLAlchemy 2.0 | Portable relational storage with GeoJSON geometries and foreign-key constraints |
| **PDF Generation** | ReportLab | Programmatic generation of audit-ready PDF monitoring and verification reports |

---

## 3. Four User Roles & Demonstration Credentials

The application includes pre-configured demo accounts. You can log in using either the credentials below or the **1-click Role Switcher** in the top navigation bar:

| Role | Email | Password | Primary Permissions |
|---|---|---|---|
| **Administrator** | `admin@bluecarbon.org` | `admin123` | System-wide statistics, project approval/rejection, factor management, audit log, user management, and demo data reset |
| **Project Developer** | `developer@oceanguardians.org` | `dev123` | Multi-step project registration, location/map selection, field monitoring logs, evidence upload, and report generation |
| **MRV Officer** | `mrv.officer@coastalverify.org` | `mrv123` | Review queue inspection, evidence cross-examination, verification checklist, certificate issuance (`CERT-BCR-XXXX`) |
| **Public User** | `public.observer@earthwatch.net` | `public123` | Read-only exploration of published projects, interactive Leaflet map, registry table, and public report downloads |

---

## 4. Key Functional Features

### A. Dynamic Analytics Dashboard
- Summary cards computed live from database records:
  - Total Registered Projects
  - Total Mapped Area (ha)
  - Estimated Net Carbon Removals (tCO₂e)
  - Projects Awaiting Verification
  - Independently Verified Projects
  - Projects Under Active Monitoring
- Interactive Recharts:
  - Projects by Ecosystem Type (Donut chart)
  - Project Area by Coastal Jurisdiction (Bar chart)
  - Cumulative Net Removals Trajectory (Area chart)
  - MRV Progression Funnel (Lifecycle stages)

### B. Multi-Step Project Registration Wizard
1. **General Information**: Project name, developer organization, ecosystem type, start date, duration.
2. **Geographic Location & Map**: Interactive Leaflet point picker + manual coordinate inputs, representative polygon generation, and area computation.
3. **Ecosystem & Baseline Assessment**: Initial degradation condition, baseline canopy cover %, biomass t/ha, soil organic carbon (SOC) tC/ha, measurement date, and methodology reference.
4. **Supporting Documents**: PDD attachment, land concession authorization, and baseline survey CSV data.
5. **Review & Preliminary Carbon Projection**: Auto-generates unique project codes (e.g. `BCR-2026-MG-001`).

### C. Configurable Carbon Estimation Engine
- Configurable Tier-2 IPCC Wetland factors for Mangroves, Seagrasses, and Tidal Wetlands.
- Step-by-step mathematical transparency:
  $$\text{Gross Accumulation} = \text{Area (ha)} \times \text{Factor (tCO}_2\text{e/ha/yr)} \times \text{Years}$$
  $$\text{Baseline Deduction} = \text{Gross} \times (\text{Baseline Discount \%} / 100)$$
  $$\text{Uncertainty Buffer} = (\text{Gross} - \text{Baseline Deduction}) \times (\text{Uncertainty \%} / 100)$$
  $$\text{Net Estimated Removals} = \text{Gross} - \text{Baseline Deduction} - \text{Uncertainty Buffer}$$
- Dynamic slider sandbox allowing authorized users to test parameters in real-time.
- Stores full calculation history and records assumptions.

### D. Complete MRV Workflow
1. **Monitoring**: Log field events with quantitative measurements (canopy cover %, survival rate %, DBH, sediment accretion mm, soil core depth, salinity).
2. **Evidence Management**: Upload and link field photographs, CSV transect sheets, and drone survey files.
3. **Reporting**: Compile structured monitoring reports, preview them in-browser, and export downloadable PDFs.
4. **Verification**: Dedicated MRV officer workspace with verification checklists, correction requests, and formal certificate issuance.

### E. Public Registry & Map Explorer
- Searchable and filterable registry table (by ecosystem, region, status, and verification stage).
- One-click CSV export of the full registry.
- Detailed public project profile page with embedded Leaflet polygon boundary and verified certificate timeline.

### F. Application-Level Audit Trail
- Comprehensive audit log tracking every project creation, document upload, carbon recalculation, status change, factor update, and verification decision.

---

## 5. Five Pre-Loaded Demonstration Projects

1. **Sundarbans Delta Mangrove Restoration** (West Bengal, India — Mangrove, 1,250 ha, *Verified Year 2*)
2. **Shark Bay Posidonia Seagrass Meadow Recovery** (Western Australia — Seagrass, 3,400 ha, *Active Monitoring*)
3. **Chesapeake Bay Tidal Saltmarsh Rehabilitation** (Maryland, USA — Tidal Wetland, 820 ha, *Verified Year 1*)
4. **Kilifi Creek Community Mangrove & Estuary Conservation** (Kilifi, Kenya — Mangrove, 450 ha, *Submitted / Under Review*)
5. **Tampa Bay Submerged Aquatic Vegetation Restoration** (Florida, USA — Seagrass, 610 ha, *Admin Approved*)

---

## 6. Local Quickstart Guide

### Prerequisites
- Python 3.10+
- Node.js v18+ and npm

### One-Click Startup (Windows)
Double-click `start_all.bat` or run:
```powershell
.\start_all.bat
```

### Manual Startup

#### Step 1: Start Backend API
```powershell
cd backend
python -m pip install -r requirements.txt
python run.py
```
*The FastAPI backend will start at `http://127.0.0.1:8000`. Swagger API documentation is available at `http://127.0.0.1:8000/docs`.*

#### Step 2: Start Frontend Application
```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```
*The React application will launch at `http://localhost:5173`.*

---

## 7. Running the Automated Test Suite

An end-to-end verification script testing all 12 platform workflows is included:
```powershell
cd backend
python test_system.py
```

---

## 8. Scientific & Regulatory Disclaimers

1. **Carbon Quantification Tiers**: The system strictly distinguishes between:
   - *Estimated Carbon Accumulation*
   - *Estimated Net Greenhouse Gas Removals*
   - *Independently Verified Removals*
   - *Issued Carbon Credits*
   Carbon credits are **never automatically generated or issued** merely because a project has an estimated model calculation. Formal credit issuance requires third-party auditing under accredited standards (e.g., Verra VCS, Plan Vivo, or Gold Standard).
2. **Geospatial Mapping**: Polygon boundaries and coordinates are for registry visualization on OpenStreetMap. The prototype does not claim live satellite monitoring feeds without real-time orbital API integration.
3. **Audit Trail**: The system audit log is maintained at the application database level with foreign-key referential integrity, distinct from a cryptographically decentralized blockchain ledger.
