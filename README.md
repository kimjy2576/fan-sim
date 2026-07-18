# Fan-Sim: 시로코 팬 임펠러-스크롤 1D 시뮬레이터

**Sirocco (Forward-Curved) Centrifugal Fan — Impeller + Scroll Design & Simulation Tool**

건조기 선행 플랫폼 Task | 2026

---

## 개요

시로코 팬(전곡 원심 팬)의 임펠러-스크롤 1D 물리 시뮬레이션 및 형상 설계 도구.
설계 파라미터 입력 → PQ 커브, 효율, 손실 분해, 소음/진동 예측, 3D STEP 파일 생성까지 통합.

## 주요 기능

### 물리 모델 (하드코딩 계수 없는 순수 물리 기반)
- **Euler 터보기계 방정식** + Stodola slip factor
- **임펠러 손실 6종**: Vaneless space, Incidence (NASA SP-36), Friction (Colebrook-White), Recirculation (Oh 1997), Disk friction (Daily & Nece), Leakage (seal geometry Cd)
- **스크롤 모델**: A(θ) 기반 형상 + Darcy-Weisbach 마찰 적분 + mixing loss
- **Tongue**: Orifice 재순환 모델 + BPF 소음 (Neise 1992)
- **Diffuser**: Borda-Carnot / 확대관 Cp 모델
- **Radial Force**: Stepanoff(1957) + Lorett θ 보정
- **습공기 물성**: Antoine 포화증기압 + Dalton's law 밀도 + Sutherland 점도

### 설계 파라미터 (전체 조절 가능)
| 카테고리 | 파라미터 |
|---|---|
| **임펠러 기하** | D_eye, D₁(blade), D₂, b₁, b₂, β₁, β₂, Z |
| **블레이드 상세** | 프로파일(단일원호/직선필렛직선/선형β), R_fillet, Bend 위치, 두께 |
| **스크롤** | 설계방법(등속/자유와류), 단면(사각/원형), b_scroll, Wrap 각도 |
| **Tongue** | Gap(δ), R_tongue, θ_cutoff |
| **Diffuser** | AR, η_diffuser |
| **운전 조건** | RPM, T_in, RH(습도) |
| **물리 상세** | Seal 길이, Disk 간극, 표면 조도, P_atm, 음속 |

### 시각화 (7개 탭)
1. **형상**: 정면도(블레이드+스크롤) + 단면도(D_eye/vaneless/shroud/backplate)
2. **속도삼각형**: 입출구 + slip 보정 + 반동도
3. **PQ/효율**: 임펠러 vs 팬 레벨 분리 표시
4. **손실 분해**: 6종 손실 + Pressure Budget (Euler → 팬 정압)
5. **Passage 유동**: de Haller, C₂/U₂, 확산비
6. **비속도**: Ns 영역 판정 + Cordier Ds
7. **안정성**: PQ 기울기, BPF SPL(dB), Radial Force(N) vs Q

### 3D STEP Export
- CadQuery 기반 3D 솔리드 모델 생성
- Back plate + Front shroud (벨마우스) + Z개 블레이드 + Hub
- NX/SolidWorks/CATIA 호환 STEP AP214 포맷

---

## 프로젝트 구조

```
fan-sim/
├── frontend/
│   └── fan-sim-pro.jsx      # React 통합 설계 도구 (v4.0)
├── backend/
│   └── impeller_step_gen.py  # CadQuery STEP 파일 생성기
├── docs/
│   ├── 시로코팬_물리모델.docx
│   ├── 시로코팬_물리모델.pdf
│   └── 시로코팬_물리모델_정리.pdf
└── README.md
```

## 실행 방법 (로컬)

### Windows — `run.bat` 더블클릭

```
run.bat
```

최초 실행 시 가상환경(`.venv`) 생성 + 패키지 설치를 자동으로 하고,
서버가 뜨면 브라우저가 자동으로 열림.

| 명령 | 설명 |
|---|---|
| `run.bat` | 기본 실행 → http://127.0.0.1:8000 |
| `run.bat 8080` | 포트 지정 (8000이 사용 중일 때) |
| `run.bat --lan` | 같은 네트워크의 다른 기기(폰/노트북)에서도 접속 허용 |

- 종료: 실행 창에서 `Ctrl+C`
- 사전 준비: Python 3.10+ 설치 (설치 시 **"Add Python to PATH"** 체크 필수)
- 기본값은 `127.0.0.1`(루프백)만 바인딩하므로 Windows 방화벽 허용 팝업이 뜨지 않음.
  `--lan` 사용 시에만 외부 접속이 열림.

### 수동 실행 (Mac / Linux / 직접 제어)

```bash
python -m venv .venv
.venv/bin/pip install -r requirements.txt
HOST=127.0.0.1 PORT=8000 .venv/bin/python main.py
# → http://127.0.0.1:8000
```

FastAPI 하나가 프론트엔드(`/`, `/static/*`)와 API(`/api/*`)를 함께 서빙하므로
별도 프론트엔드 서버가 필요 없음.

---

## STEP 내보내기 (선택 기능)

STEP export 는 `cadquery`(OpenCascade 커널 포함, 약 500MB)가 필요함.
**서버 구동 및 나머지 모든 기능과는 무관**하므로, 필요할 때만 설치하면 됨.

```
install-step.bat
```

수동 설치:
```bash
.venv/bin/pip install -r requirements-step.txt
```

미설치 상태에서 STEP 내보내기를 누르면 `501` 과 함께 안내 메시지가 표시됨.

CLI 로 직접 생성:
```bash
python backend/impeller_step_gen.py '{"D_eye":110,"D1":120,"D2":175,"b1":60,"b2":50,"beta1":30,"beta2":145,"Z":36,"t_blade":1.0}' output.step
python backend/impeller_step_gen.py          # 기본 파라미터
```

---

## 환경변수

| 변수 | 기본값 | 설명 |
|---|---|---|
| `HOST` | `0.0.0.0` | 바인딩 주소. `run.bat` 는 `127.0.0.1` 로 설정 |
| `PORT` | `8000` | 포트 |
| `OPEN_BROWSER` | — | `1` 이면 기동 후 브라우저 자동 오픈 |

---

## 물리 모델 레퍼런스

| 모델 | 출처 |
|---|---|
| Slip Factor | Stodola (1927) |
| Incidence Loss | NASA SP-36 Cascade Shock |
| Passage Friction | Colebrook-White (표면 조도 반영) |
| Recirculation | Oh (1997) Diffusion Ratio |
| Disk Friction | Daily & Nece (1960) 간극비 regime |
| Leakage | Seal geometry Cd correlation |
| Scroll Friction | Darcy-Weisbach θ-적분 |
| BPF Noise | Neise (1992) Specific Speed correlation |
| Radial Force | Stepanoff (1957) + Lorett-Gopalakrishnan |
| Humid Air | Antoine + Dalton + Sutherland |

---

## 기술 스택
- **Frontend**: React + Tailwind + SVG (CDN 기반 단일 파일, 빌드 스텝 없음)
- **Backend**: FastAPI + Uvicorn (프론트/API 통합 서빙)
- **3D STEP**: CadQuery + OpenCascade (선택 설치)
- **실행**: 로컬 `run.bat` (Railway 설정 `Procfile`/`railway.json` 은 재배포용으로 남겨둠.
  단, `requirements.txt` 는 코어만 포함하므로 원격에서 STEP 이 필요하면
  `requirements-step.txt` 를 쓰도록 바꿀 것)

## 라이선스
Internal use only — LG Electronics 건조기 선행 플랫폼 Task
