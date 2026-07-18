#!/usr/bin/env node
// 물리 3벌 동등성 검증
//   ① backend/fan_model.py   (run_backend.py 가 실행 → JSON)
//   ② frontend computeAero    (본 스크립트에서 로드)
//   ③ frontend computeAeroFit (본 스크립트에서 로드)
//
// tests/cases.json 의 모든 형상 × 계수 케이스에서 세 경로의 BEP(Q, Ps, eta)를 대조한다.
//
// 실행:  node tests/parity.js
// 종료코드: 불일치가 하나라도 있으면 1 (CI/커밋훅에서 활용 가능)

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { loadFrontendPhysics } = require('./_load_frontend');

const ROOT = path.join(__dirname, '..');
const spec = JSON.parse(fs.readFileSync(path.join(__dirname, 'cases.json'), 'utf8'));
const { computeAero, computeAeroFit } = loadFrontendPhysics(
  path.join(ROOT, 'frontend', 'impeller-3d-viewer.jsx')
);

// ── 허용 오차 ──
// ①↔③: computeAeroFit 은 N=100 스윕 + BEP 보간 미적용 → 스윕 해상도 차 허용.
//   특히 고RPM(가파른 곡선)에서 커짐. N=200 으로 올리면 backend 에 수렴함을 확인 (물리는 동일).
//   실시간 슬라이더 성능을 위해 N=100 유지 → 허용오차로 흡수.
const TOL_STRICT = { Ps: 0.05, Q: 0.005, eta: 0.0005 };   // Pa, m3/min, 절대eta
const TOL_FIT    = { Ps: 3.0,  Q: 0.15,  eta: 0.01 };

// 백엔드 실행
function runBackend() {
  const py = process.env.PYTHON || 'python3';
  const raw = execFileSync(py, [path.join(__dirname, 'run_backend.py')], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
  });
  return JSON.parse(raw);
}

function findGeom(name) {
  return spec.cases.find(c => c.name === name).geom;
}

const NEUTRAL = spec.fc_neutral;

let failures = 0;
const rows = [];

function check(label, be, feAero, feFit) {
  // be, feAero, feFit: {Q, Ps, eta}
  // Q 는 절대오차 대신 상대오차(스윕 간격은 유량 크기에 비례하므로 고유량일수록 절대차 커짐)
  const relQ = (x, y) => Math.abs(x - y) / Math.max(0.5, Math.abs(y));
  const d_ba = { Ps: Math.abs(be.Ps - feAero.Ps), Q: relQ(be.Q, feAero.Q), eta: Math.abs(be.eta - feAero.eta) };
  const d_bf = { Ps: Math.abs(be.Ps - feFit.Ps),  Q: relQ(be.Q, feFit.Q),  eta: Math.abs(be.eta - feFit.eta) };

  const ok_ba = d_ba.Ps <= TOL_STRICT.Ps && d_ba.Q <= 0.01 && d_ba.eta <= TOL_STRICT.eta;
  const ok_bf = d_bf.Ps <= TOL_FIT.Ps    && d_bf.Q <= 0.04 && d_bf.eta <= TOL_FIT.eta;

  if (!ok_ba || !ok_bf) failures++;

  rows.push({
    label,
    be, feAero, feFit,
    ba: ok_ba ? '✅' : '❌', bf: ok_bf ? '✅' : '❌',
    dPs_ba: d_ba.Ps, dPs_bf: d_bf.Ps,
  });
}

const backend = runBackend();

// ── 형상 스윕 (계수 기본값) ──
for (const item of backend.neutral) {
  const geom = findGeom(item.name);
  const a = computeAero(geom).bep;
  const f = computeAeroFit(geom, NEUTRAL).bep;
  check(item.name, item.bep, a, f);
}

// ── 계수 스윕 (기본 형상) ──
const baseGeom = spec.cases[0].geom;
for (const item of backend.fc) {
  const a = computeAero(baseGeom).bep;  // computeAero 는 계수 미적용(on-design) → 참고용, 여기선 ③만 계수반영
  const f = computeAeroFit(baseGeom, item.fc).bep;
  // 계수 케이스는 ①(backend, 계수반영) ↔ ③(computeAeroFit, 계수반영) 만 대조
  const relQ = Math.abs(item.bep.Q - f.Q) / Math.max(0.5, Math.abs(item.bep.Q));
  const ok_bf = Math.abs(item.bep.Ps - f.Ps) <= TOL_FIT.Ps && relQ <= 0.04 && Math.abs(item.bep.eta - f.eta) <= TOL_FIT.eta;
  if (!ok_bf) failures++;
  rows.push({
    label: 'fc:' + item.name, be: item.bep, feAero: null, feFit: f,
    ba: '—', bf: ok_bf ? '✅' : '❌', dPs_ba: null, dPs_bf: Math.abs(item.bep.Ps - f.Ps),
  });
}

// ── 출력 ──
const pad = (s, n) => String(s).padEnd(n);
const num = (v, w = 8, d = 2) => (v == null ? '—'.padStart(w) : v.toFixed(d).padStart(w));

console.log('');
console.log('  물리 3벌 동등성 검증  (①backend ②computeAero ③computeAeroFit)');
console.log('  ' + '─'.repeat(78));
console.log('  ' + pad('케이스', 14) + pad('①Ps', 9) + pad('②Ps', 9) + pad('③Ps', 9)
  + '  ①↔② ①↔③   ΔPs(②) ΔPs(③)');
console.log('  ' + '─'.repeat(78));
for (const r of rows) {
  console.log('  ' + pad(r.label, 14)
    + num(r.be.Ps, 8) + ' '
    + (r.feAero ? num(r.feAero.Ps, 8) : '—'.padStart(8)) + ' '
    + num(r.feFit.Ps, 8) + '   '
    + pad(r.ba, 4) + pad(r.bf, 5)
    + num(r.dPs_ba, 8, 3) + num(r.dPs_bf, 8, 3));
}
console.log('  ' + '─'.repeat(78));

if (failures === 0) {
  console.log('\n  ✅ 전체 통과 — 세 경로가 허용오차 내 일치');
  console.log(`     (엄격 ①↔②: Ps≤${TOL_STRICT.Ps}Pa,  피팅 ①↔③: Ps≤${TOL_FIT.Ps}Pa)\n`);
  process.exit(0);
} else {
  console.log(`\n  ❌ ${failures}개 케이스 불일치 — 물리 경로가 갈라져 있음\n`);
  process.exit(1);
}
