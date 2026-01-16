from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import get_settings
from .database import engine, Base
from .routes import registros, catalogos

settings = get_settings()

# Crear tablas (en producción usar Alembic)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Residuos API",
    description="API para gestión de transporte de residuos",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(registros.router, prefix="/residuos/api")
app.include_router(catalogos.router, prefix="/residuos/api")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "environment": settings.environment,
        "app": settings.app_name
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Residuos API - Sistema de Gestión de Transporte de Residuos",
        "version": "1.0.0",
        "docs": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
