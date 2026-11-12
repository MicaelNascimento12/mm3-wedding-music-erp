from fastapi import APIRouter

from app.api.v1.endpoints import auth, dashboard, eventos, musicos, playbacks

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(dashboard.router)
api_router.include_router(musicos.router)
api_router.include_router(eventos.router)
api_router.include_router(playbacks.router)
