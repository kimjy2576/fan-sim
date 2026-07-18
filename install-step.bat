@echo off
chcp 65001 >nul 2>&1
setlocal
cd /d "%~dp0"
title fan-sim - STEP 내보내기 설치

REM ============================================================
REM  STEP 파일 내보내기(선택 기능) 설치
REM
REM  cadquery(OCC 커널 포함, 약 500MB)를 .venv 에 추가 설치함.
REM  이 기능을 쓰지 않으면 설치할 필요 없음 — 나머지 기능은
REM  run.bat 만으로 모두 동작함.
REM ============================================================

echo.
echo  ============================================
echo    fan-sim  STEP 내보내기 설치 (선택)
echo  ============================================
echo.
echo    cadquery 를 설치함. 약 500MB, 수 분 소요될 수 있음.
echo    STEP 내보내기를 쓰지 않으면 취소해도 무방함.
echo.
choice /c YN /m "계속 진행할까요"
if errorlevel 2 (
    echo  취소됨.
    pause
    exit /b 0
)

set "VPY=%~dp0.venv\Scripts\python.exe"
if not exist "%VPY%" (
    echo.
    echo  [오류] 가상환경(.venv)이 없음. run.bat 를 먼저 한 번 실행할 것.
    echo.
    pause
    exit /b 1
)

echo.
echo  설치 중 ...
"%VPY%" -m pip install -r requirements-step.txt
if errorlevel 1 (
    echo.
    echo  [오류] 설치 실패.
    echo.
    pause
    exit /b 1
)

echo.
"%VPY%" -c "import cadquery; print('  cadquery', cadquery.__version__, '설치 완료')"
echo.
echo  이제 run.bat 로 서버를 실행하면 STEP 내보내기를 쓸 수 있음.
echo.
pause
