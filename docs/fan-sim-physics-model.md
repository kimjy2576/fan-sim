# Fan-Sim 물리 모델 정리

## 1. 입력 변수

### 임펠러
| 변수 | 기호 | 단위 | 설명 |
|---|---|---|---|
| D_eye | D_eye | mm | 측판(shroud) eye 직경 |
| D₁ | D1 | mm | 블레이드 입구 직경 |
| D₂ | D2 | mm | 블레이드 출구 직경 |
| D_u | Du | mm | 주판(backplate) 외경 |
| b₁ | b1 | mm | 블레이드 입구 폭 |
| b₂ | b2 | mm | 블레이드 출구 폭 |
| β₁ | beta1 | ° | 블레이드 입구각 |
| β₂ | beta2 | ° | 블레이드 출구각 (>90°: 전곡, =90°: 방사, <90°: 후곡) |
| Z | Z | - | 블레이드 매수 |
| t | tBlade | mm | 블레이드 두께 |
| RPM | RPM | rpm | 회전수 |
| Lean | bladeLean | ° | 블레이드 경사각 (축방향 기울기) |

### 스크롤
| 변수 | 기호 | 설명 |
|---|---|---|
| scrollType | cv/fv | 등속팽창(Archimedes) / 자유와류(Log spiral) |
| wrapAngle | ° | 나선 감김각 (180~360°) |
| scrollExpRate | - | 팽창률 k/r₂ (기본 0.12) |
| bScroll | mm | 스크롤 축방향 폭 |
| scrollGapF/B | mm | 측판/주판 간극 |

### Tongue
| 변수 | 기호 | 설명 |
|---|---|---|
| cutoffGap (δ) | mm | D₂ 면 ~ scroll 내면 시작점 거리 |
| cutoffAngle (θ_cut) | ° | tongue 절대 위치 (0°=→, 90°=↑) |
| Rtongue | mm | tip round 반경 |
| tongueOutLen | mm | 외면(디퓨저 내벽) 길이 |
| tongueOutAngle (α_out) | ° | 외면 각도 (θ_exit 기준 상대) |
| exitAngle (θ_exit) | ° | 출구 방향 절대각 |

### 디퓨저
| 변수 | 기호 | 설명 |
|---|---|---|
| diffAngle | ° | 확대 반각 (θ_exit 기준 상대) |
| diffLength | mm | 디퓨저 길이 |
| diffType | - | 단일/단계/Round |
| diffInnerWall | bool | 내벽 유무 |

---

## 2. 유체역학 모델 (computeAero)

### 2.1 기본 속도 삼각형

**주변속도:**
```
U₁ = ω × r₁ ,   U₂ = ω × r₂ ,   ω = 2π × RPM/60
```

**슬립 계수 (Wiesner):**
```
σ = 1 - (π × sinβ₂) / Z
```

**유량 Q에서의 절대·상대 속도 (200점 계산):**
```
Cr₁ = Q / (π × D₁ × b₁)          — 입구 반경방향 속도
Cr₂ = Q / (π × D₂ × b₂)          — 출구 반경방향 속도
Ct₂ = σ × U₂ - Cr₂ / tan(β₂)    — 출구 접선방향 속도 (슬립 포함)
C₂  = √(Cr₂² + Ct₂²)             — 출구 절대속도
W₁  = √(Cr₁² + U₁²)              — 입구 상대속도
W₂  = √(Cr₂² + (Ct₂ - U₂)²)     — 출구 상대속도
```

**오일러 전압:**
```
Pt_euler = ρ × U₂ × Ct₂
```

### 2.2 임펠러 손실 모델

#### (1) Incidence Loss — NASA SP-36
```
α_inc = atan(Cr₁/U₁) - β₁
k_inc = 1 - (t / pitch₁)²
ΔP_inc = k_inc × 0.5ρ × (W₁ × sin(α_inc))²
```
유량이 설계점에서 벗어나면 입사각 불일치로 손실 발생.

#### (2) Passage Friction — Colebrook-White
```
D_h = 2 × pitch₂ × b₂ / (pitch₂ + b₂)       — 수력직경
W_avg = (W₁ + W₂) / 2
Re = ρ × W_avg × D_h / μ
f = Colebrook-White(Re, ε/D_h = 5×10⁻⁵)       — 마찰계수
ΔP_fric = f × (L_blade / D_h) × 0.5ρ × W_avg²
```
블레이드 통로 내 벽면 마찰 손실. 조도 반영.

#### (3) Recirculation — Oh(1997) Diffusion Ratio
```
DR = 1 - W₂/W₁ + |Ct₂| / (2Z × W₁/π)
ΔP_rec = (DR > 0.5) ? 0.0085 × (DR - 0.5)² × ρ × U₂² : 0
```
확산비가 임계값 초과 시 역류/와류 발생.

#### (4) Disk Friction — Daily & Nece
```
Re_disk = ρ × ω × r₂² / μ
C_m = 0.0622 / Re_disk^0.2
P_disk_friction = 2 × 0.5 × C_m × ρ × ω³ × r₂⁵    — 양면(주판+측판)
ΔP_disk = P_disk / Q
```
회전 디스크(주판/측판)와 케이싱 사이 유체 마찰.

#### (5) Jet-Wake Mixing Loss
```
ε = 0.12 + 0.5 × (t / pitch₂)       — wake 분율
ΔP_jw = 0.5ρ × C₂² × ε²
```
블레이드 후류의 jet-wake 혼합 손실.

#### 임펠러 전압:
```
Pt_imp = max(0, Pt_euler - ΔP_inc - ΔP_fric - ΔP_rec - min(ΔP_disk, 0.5×Pt_e) - ΔP_jw)
```

### 2.3 스크롤 손실 모델

#### (6) Scroll Friction — Darcy-Weisbach θ-적분
```
L_scroll = 2π × r₂ × wrapFrac
r_exit = r₂ + r₂ × expRate × wrapFrac × 2π
A_sc = max(b_sc × (r_exit - r₂),  Q / (0.5 × C₂))
D_h_sc = 2A_sc / (√(A_sc/b_sc) + b_sc)
C_sc = 0.7 × Q / A_sc
f_sc = Blasius(Re_sc)
ΔP_sc_fric = f_sc × (L_scroll / D_h_sc) × 0.5ρ × C_sc²
```

#### (7) Scroll Mixing Loss
```
ΔP_sc_mix = 0.20 × Pdyn_captured
Pdyn_captured = 0.5ρC₂² × wrapFrac
```
임펠러→스크롤 유입 시 속도장 혼합 손실 (20%).

#### (8) Tongue Recirculation — 체적효율 모델
```
ε_leak = min(0.25, 0.82 × (δ/D₂)^0.7 / (1 + R_tongue/δ))
Q_recirc = ε_leak × Q_impeller
Q_delivered = (1 - ε_leak) × Q_impeller
ΔP_tongue = ε_leak × Pt_imp × 0.3
```
- δ/D₂ ↑ → ε_leak ↑ → Q_delivered ↓ (재순환 증가)
- R_tongue ↑ → ε_leak ↓ (유동 전환 부드러움)
- δ와 R_tongue 독립 (기준점: scroll 내면 시작)

#### (9) Wrap 미커버 — Borda-Carnot
```
ΔP_uncap = 0.5ρ × (C₂ × √(1 - wrapFrac))² × (1 - wrapFrac)
```
wrapAngle < 360° 시 포획되지 않는 유동 에너지 손실.

### 2.4 디퓨저 모델

```
AR = 1 + 2 × L_diff × tan(α_diff) / √A_sc     — 면적비
Cp_ideal = 1 - 1/AR²                             — 이상 압력회복계수
η_diff = 0.75 (α ≤ 7°),  0.60 (≤ 12°),  0.40 (> 12°)
ΔPs_diff = η_diff × Cp_ideal × 0.5ρ × C_sc²    — 정압 회복
A_exit = A_sc × max(1, AR)                       — 출구 면적
```

### 2.5 팬 종합 성능

```
Pt_fan = max(0, Pt_imp - ΔP_jw - ΔP_scroll - ΔP_tongue - ΔP_uncap)

V_exit = Q_delivered / A_exit
Pdyn_exit = 0.5ρ × V_exit²

Ps = Pt_fan - Pdyn_exit                 ← Pt = Ps + Pdyn 항상 성립

P_shaft = Pt_euler × Q_impeller + P_disk
η = Ps × Q_delivered / P_shaft          ← 전달 유량 기준
```

### 2.6 소음 모델 — Neise(1992)

```
SPL_base = 10 × log₁₀(Pt² × Q / (ρ × c³)) + 56      — c = 343 m/s
SPL_gap = -20 × log₁₀((δ/r₂) / 0.10)                  — δ/D₂ ratio 보정
SPL_R = -5 × log₁₀(1 + R_tongue / δ)                   — R_tongue 보정
SPL = SPL_base + SPL_gap + SPL_R
BPF = Z × RPM / 60
```
- δ ↓ → SPL ↑ (gap 소음 증가)
- R_tongue ↑ → SPL ↓ (유동 전환 부드러움)

### 2.7 BEP 탐색

- 200점 PQ 루프 (Q = 0 ~ 1.2 × Q_max)
- Q > 10% Q_max 이후에서 η 최대 탐색 (shutoff artifact 방지)
- 포물선 보간 (3점) → BEP 좌표 정밀화
- 보간 시 pts에서 직접 lerp (Ps/Pdyn 일관성 유지)

---

## 3. 구조 모델 (computeStructure)

### 3.1 원심 응력
```
σ_c = ρ_mat × ω² × (r₂² - r₁²) / 2
```

### 3.2 굽힘 응력 (외팔보)
```
F_aero = Pt / Z × b_avg × L_blade       — 공력 하중
S = t² × b_avg / 6                       — 단면 계수
σ_b = F_aero × L_blade / (2 × S)
```

### 3.3 안전율
```
σ_total = σ_c + σ_b
SF = σ_yield / σ_total
```
- 금속: SF > 4 권장 (피로 한도 ≈ 0.4~0.5 × σ_y)
- 플라스틱: SF > 5~6 (고온 σ_y 감소)

### 3.4 고유진동수 (Euler-Bernoulli 외팔보)
```
I = t³ × b_avg / 12                      — 단면 2차 모멘트
A = t × b_avg                            — 단면적
f_n = λ₁² / (2π × L²) × √(EI / ρA)      — λ₁ = 1.8751
```

### 3.5 공진 판정
```
BPF = Z × RPM / 60
공진 마진 = |f_n - BPF| / BPF
```
- 마진 < 15% → ⚠ 공진 위험
- SF 무관하게 공진이면 위험

---

## 4. 블레이드 형상 모델

### 4.1 선형β (Linear β)
```
β(r) = β₁ + t × (β₂ - β₁)       t = (r - r₁) / (r₂ - r₁)
dθ/dr = -1 / (r × tanβ)          — 나선 미분방정식
```
r₁→r₂에서 β가 선형 변화.

### 4.2 SFS (직선-필렛-직선)
```
t < t_start: β = β₁ (직선 구간)
t_start ~ t_end: β = β₁ + 0.5(1 - cos(s×π)) × (β₂-β₁)   — 코사인 블렌드
t > t_end: β = β₂ (직선 구간)
```
- bendPos: 절곡 위치 (0~1)
- R_fillet: 블렌드 폭 제어

### 4.3 단일 원호 (Arc)
```
β₁, β₂ 접선 조건을 만족하는 유일한 원호
```
- 이분법 60회 반복으로 원호 반경 R 수렴
- 프레스 1회 성형 가능

### 4.4 블레이드 Lean
```
θ_top = θ_bottom + leanDeg × π/180
```
top vertex(shroud)가 bottom(backplate) 대비 원주방향으로 편향.

---

## 5. 스크롤 나선 모델

### 기준점 정의
```
D₂ ───── δ ─────○───── R ─────●───── R ─────○
                scroll        tip           outer face
                start         center        start
                = r₂ + δ      = r₂ + δ + R   = r₂ + δ + 2R
```
δ와 R_tongue 독립. δ → gap 효과, R → round 효과.

### 등속팽창 (Archimedes)
```
r(θ) = r_start + k × θ
k = r₂ × scrollExpRate
```

### 자유와류 (Log spiral)
```
r(θ) = r_start × e^(θ × tan α)
α = scrollExpRate × 50°
```

### 회전 방향
```
θ = θ_start + dθ     (CCW — 전곡 팬 표준, eye 방향에서 반시계)
```

---

## 6. 에너지 수지 요약

```
┌─────────────────────────────────────────┐
│           Euler Head (Pt_euler)          │
│         = ρ × U₂ × Ct₂                 │
├─────────────────────────────────────────┤
│  - ΔP_incidence    (입사각 불일치)      │
│  - ΔP_friction     (통로 벽면 마찰)     │
│  - ΔP_recirculation (확산비 과대)       │
│  - ΔP_disk         (디스크 마찰)        │
│  - ΔP_jet-wake     (후류 혼합)          │
├─────────────────────────────────────────┤
│  = Pt_impeller                          │
├─────────────────────────────────────────┤
│  - ΔP_jet-wake     (출구 혼합)          │
│  - ΔP_scroll       (마찰 + 혼합)        │
│  - ΔP_tongue       (재순환 혼합)        │
│  - ΔP_uncaptured   (미커버 손실)        │
├─────────────────────────────────────────┤
│  = Pt_fan                               │
├─────────────────────────────────────────┤
│  - Pdyn_exit       (= 0.5ρV²_exit)     │
│  + ΔPs_diffuser    (정압 회복)          │
├─────────────────────────────────────────┤
│  = Ps (정압)                            │
│                                         │
│  Pt = Ps + Pdyn   (항상 성립)           │
│  Q_delivered = Q_imp × (1 - ε_leak)     │
│  η = Ps × Q_delivered / P_shaft         │
│  P_shaft = Pt_euler × Q_imp + P_disk    │
└─────────────────────────────────────────┘
```

---

## 7. 재질 데이터베이스

| 재질 | E (GPa) | ρ (kg/m³) | σ_y (MPa) |
|---|---|---|---|
| SPCC | 200 | 7850 | 220 |
| SGCC | 200 | 7850 | 200 |
| SUS304 | 193 | 8000 | 215 |
| A5052 | 70 | 2680 | 195 |
| PP | 1.5 | 900 | 35 |
| ABS | 2.3 | 1050 | 45 |

---

## 8. 참고 문헌

| 모델 | 출처 |
|---|---|
| Slip factor | Wiesner correlation |
| Incidence | NASA SP-36 |
| Passage friction | Colebrook-White / Darcy-Weisbach |
| Recirculation | Oh(1997) Diffusion Ratio |
| Disk friction | Daily & Nece |
| SPL | Neise(1992) + δ/r₂ + R_tongue 보정 |
| Euler beam f_n | Euler-Bernoulli 외팔보 |
| Blade profile | Bleier(1997), Eck(1973) |
| Scroll | Archimedes/Log spiral (Bleier) |
| Diffuser Cp | Sovran & Klomp |
