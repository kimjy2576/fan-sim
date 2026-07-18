# 물리 동등성 검증 (parity)

fan-sim 은 같은 공력 물리를 **3벌**로 구현하고 있다:

| # | 위치 | 용도 |
|---|---|---|
| ① | `backend/fan_model.py` `compute_aero` | API `/api/fan/compute` |
| ② | `frontend` `computeAero` | On-design 실시간 계산 |
| ③ | `frontend` `computeAeroFit` | Semi-empirical 피팅 경로 |

세 벌은 반드시 같은 답을 내야 하지만, 물리를 수정할 때 한 벌만 고치면
**에러 없이 결과만 조용히 갈라진다**. 이 스크립트는 그걸 자동으로 잡는다.

## 실행

```bash
node tests/parity.js
```

- 종료코드 `0` = 통과, `1` = 불일치 (커밋 훅/CI 에서 활용 가능)
- Python(백엔드)과 Node(프론트) 둘 다 필요
- 파이썬 경로 지정: `PYTHON=.venv/bin/python node tests/parity.js`

## 구성

- `cases.json` — 검증 케이스 (형상 10종 × 계수 3종). 물리 수정 시 케이스를 늘리면 좋다.
- `run_backend.py` — 백엔드를 케이스에 대해 실행 → JSON 출력
- `_load_frontend.js` — JSX 에서 순수 물리 함수 2개를 추출해 Node 에서 로드
- `parity.js` — 위 둘을 대조

## 허용오차

- **①↔②** (backend vs computeAero): `Ps ≤ 0.05 Pa` — 같은 알고리즘·같은 스윕(N=200)이라 부동소수 수준까지 일치해야 함.
- **①↔③** (backend vs computeAeroFit): `Ps ≤ 3 Pa`, `Q ≤ 4% 상대` — computeAeroFit 은 스윕 N=100 + BEP 보간 미적용이라 해상도 차만큼 허용. 고RPM(가파른 곡선)에서 가장 큼. N 을 200 으로 올리면 backend 에 수렴함을 확인했다(물리는 동일).

## 물리를 수정할 때

1. 세 벌(①②③)을 **모두** 같이 고친다.
2. `node tests/parity.js` 로 여전히 통과하는지 확인.
3. 새 손실항·파라미터를 추가하면 `cases.json` 에 극단 케이스를 추가한다.

## 발견 이력

이 도구를 만드는 과정에서 다음을 잡았다:
- `computeAeroFit` 의 `Lb=10` 단위 버그 (마찰 296배 과대 → Semi-empirical 기본상태 붕괴)
- `Pt_fan` 의 jet-wake 이중차감 (3벌 전부)
- `computeAeroFit` 의 `diffAR` 조건 버그 (`diffLength` 미전달 시 디퓨저 회복 누락 → Ps 5~14 Pa 과소)
