@echo off
chcp 65001 >nul 2>&1
setlocal
cd /d "%~dp0"
title fan-sim - 물리 동등성 검증

REM ============================================================
REM  물리 3벌(backend / computeAero / computeAeroFit) 동등성 검증
REM  개발용. 서버 실행(run.bat)에는 필요 없음.
REM ============================================================

echo.
echo  ============================================
echo    fan-sim  물리 동등성 검증 (parity)
echo  ============================================
echo.

REM ---------- 1) Python venv (run.bat 이 만든 것 재사용) ----------
set "VPY=%~dp0.venv\Scripts\python.exe"
if not exist "%VPY%" (
    echo  [1/3] 가상환경(.venv)이 없음 -> 생성 중 ...
    where py >nul 2>&1 && (py -3 -m venv .venv) || (python -m venv .venv)
    if errorlevel 1 (
        echo  [오류] 가상환경 생성 실패. run.bat 를 먼저 실행해볼 것.
        pause & exit /b 1
    )
    "%VPY%" -m pip install -r requirements.txt --quiet
) else (
    echo  [1/3] 가상환경 확인 완료
)

REM ---------- 2) Node ----------
where node >nul 2>&1
if errorlevel 1 (
    echo.
    echo  [오류] Node.js 를 찾을 수 없음. https://nodejs.org 에서 LTS 설치 후 재실행할 것.
    echo         ^(parity 검증에만 필요. 서버 실행에는 불필요^)
    echo.
    pause & exit /b 1
)

REM ---------- 3) babel (parity 전용 devDependency) ----------
if not exist "%~dp0node_modules\@babel\core" (
    echo  [2/3] 검증 의존성 설치 중 ^(@babel, 최초 1회^) ...
    call npm install --silent
    if errorlevel 1 (
        echo  [오류] npm install 실패.
        pause & exit /b 1
    )
) else (
    echo  [2/3] 검증 의존성 확인 완료
)

REM ---------- 4) parity 실행 ----------
echo  [3/3] parity 실행 ...
echo.
set "PYTHON=%VPY%"
node tests\parity.js
set "RC=%ERRORLEVEL%"

echo.
if "%RC%"=="0" (
    echo  ============================================
    echo    통과 — 세 물리 경로가 일치함
    echo  ============================================
) else (
    echo  ============================================
    echo    불일치 발견 — 물리 경로가 갈라져 있음
    echo    (물리 수정 후 3벌을 모두 고쳤는지 확인)
    echo  ============================================
)
echo.
pause
