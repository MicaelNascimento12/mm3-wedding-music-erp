from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import SessionLocal, engine
from seed import init_db_and_seed

UPLOADS_DIR = Path(__file__).resolve().parents[1] / "uploads"
(UPLOADS_DIR / "playbacks").mkdir(parents=True, exist_ok=True)
FRONTEND_DIST_DIR = Path(__file__).resolve().parents[2] / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicializa automaticamente as tabelas e o seed realista no startup do servidor."""
    with SessionLocal() as db:
        init_db_and_seed(db)
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "API RESTful completa para Gestão de Banda e Assessoria Musical de Casamentos "
        "(Músicos, Contratos, Conflito de Agenda, Escalas, Repertório, Sonorização e DRE Financeiro)."
    ),
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")


@app.get("/health", tags=["Healthcheck"])
def healthcheck():
    """Verifica a saúde do servidor e o dialeto de banco de dados ativo."""
    return {
        "status": "ok",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database_dialect": engine.dialect.name,
    }


@app.get("/baixar-apk", include_in_schema=False)
def baixar_apk():
    """Entrega o arquivo instalador Android (.apk) para o Tablet (Redmi Pad Pro) e Celular (Poco X6)."""
    apk_path = Path(__file__).resolve().parents[2] / "Gestao-de-Casamentos.apk"
    if apk_path.is_file():
        return FileResponse(
            str(apk_path),
            media_type="application/vnd.android.package-archive",
            filename="Gestao-de-Casamentos.apk",
        )
    return {"detail": "Arquivo Gestao-de-Casamentos.apk ainda não gerado."}


if FRONTEND_DIST_DIR.exists():
    assets_dir = FRONTEND_DIST_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="frontend_assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        candidate = FRONTEND_DIST_DIR / full_path
        if full_path and candidate.is_file():
            return FileResponse(str(candidate))
        return FileResponse(str(FRONTEND_DIST_DIR / "index.html"))
