from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .routers import upload_router, dataset_router, clean_router, analysis_router, chart_router

app = FastAPI(
    title="DataSense API",
    description="High-performance data analysis, cleaning, aggregation, and visualization engine powered by Pandas & FastAPI.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(upload_router)
app.include_router(dataset_router)
app.include_router(clean_router)
app.include_router(analysis_router)
app.include_router(chart_router)




@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint to verify backend service status."""
    return {
        "status": "healthy",
        "service": "DataSense Backend Engine",
        "version": "1.0.0",
        "engine": "FastAPI + Pandas",
    }


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "DataSense API is running.",
        "docs": "/docs",
        "health": "/health",
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"Internal server error: {str(exc)}"},
    )
