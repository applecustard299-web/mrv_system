import os
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .database import engine, Base, SessionLocal
from .seed_data import seed_database
from .routers import (
    auth, projects, map as map_router, carbon, monitoring, reports,
    verification, registry, dashboard, audit, users
)

# Initialize Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Blue Carbon Registry & MRV System API",
    description="A centralized digital platform to register, monitor, report, and verify coastal blue carbon projects.",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(BASE_DIR)
PROJECT_DIR = os.path.dirname(BACKEND_DIR)
UPLOADS_DIR = os.path.join(BACKEND_DIR, "uploads")
FRONTEND_DIST = os.path.join(PROJECT_DIR, "frontend", "dist")
FRONTEND_ASSETS = os.path.join(FRONTEND_DIST, "assets")

os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

if os.path.exists(FRONTEND_ASSETS):
    app.mount("/assets", StaticFiles(directory=FRONTEND_ASSETS), name="assets")

# Include API Routers
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(map_router.router)
app.include_router(carbon.router)
app.include_router(monitoring.router)
app.include_router(reports.router)
app.include_router(verification.router)
app.include_router(registry.router)
app.include_router(dashboard.router)
app.include_router(audit.router)
app.include_router(users.router)

@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()

@app.get("/favicon.ico")
def favicon():
    svg_icon = """<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='#0F766E' stroke-width='2'><path d='M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z'/></svg>"""
    return Response(content=svg_icon, media_type="image/svg+xml")

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/info")
def api_info():
    return {
        "title": "Blue Carbon Registry and MRV Platform",
        "status": "online",
        "docs_url": "/docs",
        "disclaimer": "This is a working prototype for demonstration and academic evaluation."
    }

# Serve Frontend SPA from root or client routes
@app.get("/{full_path:path}")
def serve_frontend_spa(full_path: str):
    index_html = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.exists(index_html):
        return FileResponse(index_html)
    return {
        "title": "Blue Carbon Registry and MRV Platform",
        "status": "online",
        "frontend_dev_url": "http://localhost:5173",
        "docs_url": "/docs"
    }
