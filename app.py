import os
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pipeline import run_research_pipeline_stream

app = FastAPI(
    title="ResearchMind API",
    description="Backend API for the multi-agent research pipeline.",
    version="1.0.0"
)

# Enable CORS for local development when running Vite dev server on another port
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ResearchRequest(BaseModel):
    topic: str
    config: dict

@app.post("/api/research")
async def run_research(request: ResearchRequest):
    """
    Spawns the research pipeline and streams back the progress logs
    and results in SSE format.
    """
    if not request.topic.strip():
        raise HTTPException(status_code=400, detail="Research topic cannot be empty.")
    
    generator = run_research_pipeline_stream(request.topic, request.config)
    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable buffering in reverse proxies (like Nginx)
        }
    )

# --- Serve Frontend Build Files ---
root_path = os.path.dirname(__file__)
dist_paths_to_check = [
    os.path.join(root_path, "dist"),
    os.path.join(root_path, "frontend", "dist")
]

frontend_dist_path = dist_paths_to_check[0]
for p in dist_paths_to_check:
    if os.path.exists(p):
        frontend_dist_path = p
        break

frontend_assets_path = os.path.join(frontend_dist_path, "assets")

if os.path.exists(frontend_assets_path):
    app.mount("/assets", StaticFiles(directory=frontend_assets_path), name="assets")

@app.get("/{rest_of_path:path}")
async def serve_spa(rest_of_path: str):
    """
    Serve static assets from the frontend/dist folder.
    Fallback to index.html for React SPA routing.
    """
    if not os.path.exists(frontend_dist_path):
        return {
            "status": "waiting_for_build",
            "message": "Frontend build files not found. Make sure you upload the 'dist' folder or 'frontend/dist' folder."
        }
    
    if rest_of_path == "" or rest_of_path is None:
        rest_of_path = "index.html"
        
    file_path = os.path.join(frontend_dist_path, rest_of_path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
        
    # SPA Fallback
    index_path = os.path.join(frontend_dist_path, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
        
    return {
        "status": "error",
        "message": f"index.html not found in {frontend_dist_path}."
    }

if __name__ == "__main__":
    # Get port from environment or default to 8000
    port = int(os.getenv("PORT", 8000))
    print(f"\nStarting ResearchMind Server on http://localhost:{port} ...")
    print(f"Open your browser and navigate to http://localhost:{port} to start researching.\n")
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)