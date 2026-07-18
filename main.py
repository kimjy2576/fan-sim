"""
Fan-Sim Pro — FastAPI Server
Serves React frontend + STEP generation API
"""
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import json
import os
import tempfile
import subprocess
import sys

app = FastAPI(title="Fan-Sim Pro", description="시로코 팬 임펠러-스크롤 1D 시뮬레이터")

# No-cache for JSX/HTML
class NoCacheMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        path = request.url.path
        if path.endswith('.jsx') or path.endswith('.html') or path == '/':
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
        return response

app.add_middleware(NoCacheMiddleware)

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
    return {"status": "ok", "version": "5.0", "hpwd": True}


# ═══ HPWD Standard API ═══

@app.post("/api/fan/compute")
async def fan_compute(request: Request):
    """
    HPWD Standard Fan Compute Endpoint.
    
    Input:
    {
        "mode": "on_design" | "semi_empirical" | "off_design",
        "inlet": { "T": 25, "omega": 0.010, "P": 101325, "RH": null },
        "geometry": { "D1": 120, "D2": 175, ... },
        "fit_coeffs": { ... },       // semi_empirical only
        "pq_map": { "data": [...] }, // off_design only
        "system_curve": { "coeffs": [a, b, c] }  // optional: ΔP = aQ² + bQ + c
    }
    
    Output:
    {
        "inlet_state": { T, omega, P, rho, mu, cp, RH },
        "outlet_state": { T, omega, P, m_dot, Q_m3s, dT_fan, Ps, W_shaft, eta },
        "performance": { bep: {...}, pts: [...], BPF, SPL, Ns },
        "operating_point": { Q, Ps, eta, W } // if system_curve provided
    }
    """
    from backend.air_properties import compute_inlet_state
    from backend.fan_model import compute_aero, compute_outlet_state
    
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)
    
    mode = body.get("mode", "on_design")
    inlet_raw = body.get("inlet", {})
    geometry = body.get("geometry", {})
    fit_coeffs = body.get("fit_coeffs", None)
    pq_map = body.get("pq_map", None)
    sys_curve = body.get("system_curve", None)
    
    # 1. Compute inlet air state
    inlet = compute_inlet_state(
        T=inlet_raw.get("T", 25.0),
        omega=inlet_raw.get("omega", 0.010),
        P=inlet_raw.get("P", 101325.0),
        RH=inlet_raw.get("RH", None),
    )
    
    # 2. Compute fan performance
    air = {"rho": inlet["rho"], "mu": inlet["mu"]}
    try:
        result = compute_aero(geometry, air=air, mode=mode,
                              fit_coeffs=fit_coeffs, pq_map=pq_map)
    except Exception as e:
        return JSONResponse({"error": f"Computation failed: {str(e)}"}, status_code=500)
    
    # 3. Compute outlet state
    outlet = compute_outlet_state(inlet, result)
    
    # 4. Operating point (if system curve given)
    op_point = None
    if sys_curve and result.get("pts"):
        op_point = _find_operating_point(result["pts"], sys_curve)
    
    # 5. Trim pts for JSON (keep every 5th point)
    pts_trimmed = result["pts"][::5] if len(result.get("pts", [])) > 40 else result.get("pts", [])
    
    return {
        "inlet_state": inlet,
        "outlet_state": outlet,
        "performance": {
            "bep": result.get("bep", {}),
            "pts": pts_trimmed,
            "BPF": result.get("BPF"),
            "SPL": result.get("SPL"),
            "Ns": result.get("Ns"),
            # 수축 임펠러 요약 (hasHub / A_eye_eff / blockRatio / b1_eff_mm / lambda_hub)
            "hub": result.get("hub"),
        },
        "operating_point": op_point,
        "mode": mode,
    }


def _find_operating_point(pts, sys_curve):
    """Find PQ curve × system resistance curve intersection."""
    coeffs = sys_curve.get("coeffs", [0.1, 0, 0])  # ΔP = aQ² + bQ + c
    a = coeffs[0] if len(coeffs) > 0 else 0.1
    b = coeffs[1] if len(coeffs) > 1 else 0
    c = coeffs[2] if len(coeffs) > 2 else 0
    
    # Find where Ps_fan(Q) = ΔP_sys(Q)
    best_diff = float('inf')
    best_pt = None
    for pt in pts:
        Q = pt.get("Q", 0)  # m³/min
        dP_sys = a * Q ** 2 + b * Q + c
        diff = abs(pt.get("Ps", 0) - dP_sys)
        if diff < best_diff:
            best_diff = diff
            best_pt = pt
    
    if best_pt:
        Q_op = best_pt["Q"]
        return {
            "Q": Q_op,
            "Ps": best_pt.get("Ps", 0),
            "eta": best_pt.get("eta", 0),
            "W_shaft": best_pt.get("Pshaft", 0),
            "dP_sys": a * Q_op ** 2 + b * Q_op + c,
        }
    return None


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
            stderr = result.stderr or ""
            # cadquery 는 선택 의존성(requirements-step.txt). 미설치를 명확히 구분해서 안내.
            if "ModuleNotFoundError" in stderr and "cadquery" in stderr:
                return JSONResponse({
                    "error": "STEP 내보내기 미설치",
                    "detail": "cadquery 가 설치되지 않았습니다. install-step.bat 를 실행하면 "
                              "STEP 내보내기를 사용할 수 있습니다 (설치 ~500MB, 수 분 소요). "
                              "다른 기능은 설치 없이 그대로 동작합니다."
                }, status_code=501)
            return JSONResponse({
                "error": "STEP generation failed",
                "detail": stderr[-500:] if stderr else "Unknown error"
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
    # HOST 기본값은 0.0.0.0 (컨테이너/원격 배포용).
    # 로컬 실행(run.bat)은 HOST=127.0.0.1 로 설정 → 루프백만 바인딩하여
    # Windows 방화벽 허용 팝업을 피함. LAN 공유가 필요하면 run.bat --lan.
    host = os.environ.get("HOST", "0.0.0.0")

    # 로컬 실행 시 서버가 뜬 직후 브라우저 자동 오픈
    if os.environ.get("OPEN_BROWSER") == "1":
        import threading
        import webbrowser

        shown = "127.0.0.1" if host in ("0.0.0.0", "127.0.0.1") else host
        threading.Timer(1.5, lambda: webbrowser.open(f"http://{shown}:{port}")).start()

    print(f"  fan-sim  ->  http://{'127.0.0.1' if host == '0.0.0.0' else host}:{port}")
    uvicorn.run(app, host=host, port=port)
