@echo off
chcp 65001 >nul 2>&1
setlocal
cd /d "%~dp0"
title fan-sim (local server)

REM ============================================================
REM  fan-sim 로컬 서버 실행
REM
REM   run.bat              기본 실행 (http://127.0.0.1:8000)
REM   run.bat 8080         포트 지정
REM   run.bat 8000 --lan   같은 네트워크의 다른 기기에서도 접속 허용
REM ============================================================

REM 인자 파싱: 숫자 = 포트, --lan = LAN 허용 (순서 무관)
set "APP_PORT=8000"
set "APP_HOST=127.0.0.1"

:parse
if "%~1"=="" goto parsed
if /i "%~1"=="--lan" (
    set "APP_HOST=0.0.0.0"
) else (
    set "APP_PORT=%~1"
)
shift
goto parse
:parsed

echo.
echo  ============================================
echo    fan-sim  로컬 서버
echo  ============================================
echo.

REM ---------- 1) Python 확인 ----------
set "PY="
where py >nul 2>&1 && set "PY=py -3"
if not defined PY (
    where python >nul 2>&1 && set "PY=python"
)
if not defined PY (
    echo  [오류] Python 을 찾을 수 없음.
    echo.
    echo    https://www.python.org/downloads/ 에서 Python 3.10+ 설치 후
    echo    설치 화면에서 "Add Python to PATH" 를 반드시 체크할 것.
    echo.
    pause
    exit /b 1
)

REM ---------- 2) 가상환경 ----------
set "VPY=%~dp0.venv\Scripts\python.exe"
if not exist "%VPY%" (
    echo  [1/3] 가상환경 생성 중 ^(.venv^) ...
    %PY% -m venv .venv
    if errorlevel 1 (
        echo  [오류] 가상환경 생성 실패
        pause
        exit /b 1
    )
) else (
    echo  [1/3] 가상환경 확인 완료
)

REM ---------- 3) 패키지 ----------
"%VPY%" -c "import fastapi, uvicorn" >nul 2>&1
if errorlevel 1 (
    echo  [2/3] 패키지 설치 중 ... ^(최초 1회, 1~2분 소요^)
    "%VPY%" -m pip install --upgrade pip --quiet
    "%VPY%" -m pip install -r requirements.txt
    if errorlevel 1 (
        echo.
        echo  [오류] 패키지 설치 실패. 사내망 프록시 환경이면 아래를 시도할 것:
        echo         .venv\Scripts\pip install -r requirements.txt --proxy http://프록시주소:포트
        echo.
        pause
        exit /b 1
    )
) else (
    echo  [2/3] 패키지 확인 완료
)

REM ---------- 4) 실행 ----------
echo  [3/3] 서버 시작 ...
echo.
echo    주소 : http://127.0.0.1:%APP_PORT%
if /i "%APP_HOST%"=="0.0.0.0" (
    echo    LAN  : 같은 네트워크의 다른 기기에서 http://^<이 PC의 IP^>:%APP_PORT%
)
echo    종료 : 이 창에서 Ctrl+C
echo.
echo  --------------------------------------------
echo.

set "HOST=%APP_HOST%"
set "PORT=%APP_PORT%"
set "OPEN_BROWSER=1"
"%VPY%" main.py

if errorlevel 1 (
    echo.
    echo  [안내] 서버가 비정상 종료됨.
    echo         포트 %APP_PORT% 이 이미 사용 중일 수 있음 ^-^> 다른 포트로 실행:
    echo             run.bat 8080
)

echo.
echo  서버가 종료됨.
pause
