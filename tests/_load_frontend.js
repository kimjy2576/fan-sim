// 프론트엔드 JSX 에서 순수 물리 함수(computeAero, computeAeroFit)만
// 추출해 Node 에서 실행 가능한 형태로 반환한다.
//
// 두 함수는 모두 React 컴포넌트 상태에 의존하지 않는 순수 함수임을 확인했으므로
// 본문만 잘라내어 eval 로 로드해도 브라우저와 동일하게 동작한다.
// (검증: tests/parity.js 가 backend 와 대조)

const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

function extractBlock(lines, startIdx) {
  // startIdx 부터 중괄호 균형이 0 이 되는 지점까지를 한 블록으로 잘라낸다.
  let depth = 0;
  for (let i = startIdx; i < lines.length; i++) {
    for (const c of lines[i]) {
      if (c === '{') depth++;
      else if (c === '}') depth--;
    }
    if (depth === 0 && i > startIdx) return lines.slice(startIdx, i + 1).join('\n');
  }
  throw new Error(`중괄호 블록 종료를 찾지 못함 (시작 줄 ${startIdx + 1})`);
}

function loadFrontendPhysics(jsxPath) {
  const src = fs.readFileSync(jsxPath, 'utf8');
  const lines = src.split('\n');

  const aeroStart = lines.findIndex(l => l.includes('function computeAero(p)'));
  if (aeroStart < 0) throw new Error('computeAero 선언을 찾지 못함');
  const aeroSrc = extractBlock(lines, aeroStart);

  const fitStart = lines.findIndex(l => l.includes('const computeAeroFit = (geom, fc) =>'));
  if (fitStart < 0) throw new Error('computeAeroFit 선언을 찾지 못함');
  // 화살표 → 일반 함수 선언으로 치환하여 top-level 로 노출
  const fitSrc = extractBlock(lines, fitStart)
    .replace('const computeAeroFit = (geom, fc) => {', 'function computeAeroFit(geom, fc) {')
    .replace(/;\s*$/, '');

  const combined = aeroSrc + '\n' + fitSrc + '\nmodule.exports = { computeAero, computeAeroFit };';
  const { code } = babel.transformSync(combined, { presets: ['@babel/preset-react'] });

  const m = { exports: {} };
  new Function('module', 'exports', code)(m, m.exports);
  return m.exports;
}

module.exports = { loadFrontendPhysics };

// 직접 실행 시: 두 함수가 정상 로드되는지만 확인
if (require.main === module) {
  const jsx = path.join(__dirname, '..', 'frontend', 'impeller-3d-viewer.jsx');
  const { computeAero, computeAeroFit } = loadFrontendPhysics(jsx);
  const g = { D1: 120, D2: 175, b1: 60, b2: 50, beta1: 30, beta2: 145, Z: 36, RPM: 1400, Deye: 110 };
  const fc = { k_inc: 1, k_fric: 1, k_rec: 0.0085, DR_crit: 0.5, k_disk: 1, k_jw: 1,
               k_sc_mix: 0.20, k_tongue_a: 0.82, k_tongue_b: 0.7, k_hub: 1 };
  console.log('computeAero    BEP Ps =', computeAero(g).bep.Ps.toFixed(2));
  console.log('computeAeroFit BEP Ps =', computeAeroFit(g, fc).bep.Ps.toFixed(2));
  console.log('로더 정상 ✅');
}
