"""
Fan-Sim Pro — FastAPI Server
Serves React frontend + STEP generation API
"""
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
import json
import os
import tempfile
import subprocess
import sys

app = FastAPI(title="Fan-Sim Pro", description="시로코 팬 임펠러-스크롤 1D 시뮬레이터")

# Serve frontend
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "frontend")
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/", response_class=HTMLResponse)
async def root():
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    with open(index_path, "r", encoding="utf-8") as f:
        return f.read()


@app.get("/health")
async def health():
    return {"status": "ok", "version": "4.0"}


@app.post("/api/generate-step")
async def generate_step(request: Request):
    """Generate STEP file from impeller parameters."""
    try:
        params = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)

    # Validate required params
    required = ['D1', 'D2', 'beta1', 'beta2', 'Z']
    for key in required:
        if key not in params:
            return JSONResponse({"error": f"Missing: {key}"}, status_code=400)

    # Generate STEP in temp file
    try:
        with tempfile.NamedTemporaryFile(suffix=".step", delete=False) as tmp:
            tmp_path = tmp.name

        # Run generator script
        script_path = os.path.join(os.path.dirname(__file__), "backend", "impeller_step_gen.py")
        result = subprocess.run(
            [sys.executable, script_path, json.dumps(params), tmp_path],
            capture_output=True, text=True, timeout=60
        )

        if result.returncode != 0:
            return JSONResponse({
                "error": "STEP generation failed",
                "detail": result.stderr[-500:] if result.stderr else "Unknown error"
            }, status_code=500)

        if not os.path.exists(tmp_path) or os.path.getsize(tmp_path) == 0:
            return JSONResponse({"error": "Empty STEP file"}, status_code=500)

        # Return file
        filename = f"impeller_D{params['D2']}_Z{params['Z']}_b{params.get('beta2', 145)}.step"
        return FileResponse(
            tmp_path,
            media_type="application/step",
            filename=filename,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )

    except subprocess.TimeoutExpired:
        return JSONResponse({"error": "Generation timeout (>60s)"}, status_code=504)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
