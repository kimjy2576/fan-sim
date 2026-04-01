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

## 사용법

### React 앱 (Claude Artifact / Railway)
`frontend/fan-sim-pro.jsx`를 React 환경에서 실행.
Railway 배포 시 FastAPI 백엔드와 연동.

### STEP 파일 생성
```bash
pip install cadquery
python backend/impeller_step_gen.py '{"D_eye":110,"D1":120,"D2":175,"b1":60,"b2":50,"beta1":30,"beta2":145,"Z":36,"t_blade":1.0}' output.step
```

### 기본 파라미터로 실행
```bash
python backend/impeller_step_gen.py
```

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
- **Frontend**: React + Tailwind + SVG (인터랙티브 시각화)
- **Backend**: Python + CadQuery + OpenCascade (3D 모델링)
- **배포**: Railway (FastAPI + React)

## 라이선스
Internal use only — LG Electronics 건조기 선행 플랫폼 Task
