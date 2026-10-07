from fastapi import FastAPI

from .config import settings
from .logger import logger
from .routers.health import router as health_router

# apiforge:app-imports:start
from apps.sample_app.routers import router as sample_app_router

# apiforge:app-imports:end

app = FastAPI(title="apiforge", version="1.0.0")

app.include_router(health_router)

# apiforge:app-mounts:start
app.include_router(sample_app_router, prefix="/app/py/sample-app/api")
# apiforge:app-mounts:end

logger.info(f"apiforge python server configured (env={settings.env})")
