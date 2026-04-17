/* ═══════════════════════════════════════════════════════════════
 * Fan-Sim v5.0 — HPWD Standard Layout
 * Structure: Header | Sidebar (290px) | Main (Tabs + Viewport + KPI bar)
 * Theme: Light (with dark mode via prefers-color-scheme)
 * Font: Noto Sans KR
 * Matches compressor-sim UI/UX
 * ═══════════════════════════════════════════════════════════════ */

const { useState, useMemo, useCallback, useEffect, useRef } = React;

// ═══ STYLES (inline to match compressor-sim) ═══
const CSS_TOKENS = {
  // Light theme tokens (same variable names as compressor-sim)
  bg: "var(--bg)", bg2: "var(--bg2)", bg3: "var(--bg3)",
  tx: "var(--tx)", tx2: "var(--tx2)", tx3: "var(--tx3)",
  bd: "var(--bd)", bd2: "var(--bd2)",
  accent: "var(--accent)", purple: "var(--purple)",
  ok: "var(--ok)", okBg: "var(--ok-bg)",
  warn: "var(--warn)", warnBg: "var(--warn-bg)",
  err: "var(--err)", errBg: "var(--err-bg)",
};

// Inject compressor-sim-compatible CSS
const STYLE_CSS = `
.app{display:flex;flex-direction:column;height:100vh;background:var(--bg);overflow:hidden;font-family:var(--font)}
.hdr{display:flex;align-items:center;gap:16px;padding:10px 24px;border-bottom:1px solid var(--bd);background:var(--bg2);flex-shrink:0}
.hdr-back{font-size:14px;color:var(--accent);cursor:pointer;text-decoration:none}
.hdr-name{font-weight:500;font-size:16px;color:var(--tx)}
.mode-grp{display:flex;gap:4px;margin-left:auto;background:var(--bg3);border-radius:8px;padding:4px}
.mode-btn{font-size:13px;padding:7px 18px;border:none;background:transparent;color:var(--tx2);cursor:pointer;border-radius:6px;transition:all .15s;font-family:var(--font)}
.mode-btn.on{background:var(--bg);color:var(--tx);font-weight:500;box-shadow:0 0 0 1px var(--bd2)}
.hdr-icons{display:flex;gap:8px;margin-left:16px}
.hdr-icons button{font-size:14px;width:36px;height:36px;border:1px solid var(--bd);background:transparent;border-radius:8px;cursor:pointer;color:var(--tx2);display:flex;align-items:center;justify-content:center}
.hdr-icons button:hover{background:var(--bg3);color:var(--tx)}

.bdy{display:flex;flex:1;min-height:0}

.side{width:290px;min-width:290px;border-right:1px solid var(--bd);display:flex;flex-direction:column;overflow-y:auto;background:var(--bg)}
.ss{padding:16px 18px 12px}
.st{font-size:11px;font-weight:600;color:var(--tx2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px}
.ir{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.il{font-size:13px;color:var(--tx2)}
.il .u{font-size:11px;color:var(--tx3);margin-left:2px}
.nf{width:96px;text-align:right;font-size:13px;padding:6px 10px;border:1px solid var(--bd);border-radius:6px;background:var(--bg2);color:var(--tx);font-family:var(--font)}
.nf:focus{outline:none;border-color:var(--accent)}
.sl{width:114px;font-size:13px;padding:6px 10px;border:1px solid var(--bd);border-radius:6px;background:var(--bg2);color:var(--tx);font-family:var(--font)}
.dv{height:1px;background:var(--bd);margin:6px 0}

.sr{margin-bottom:10px}
.sr-t{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}
.sr-l{font-size:13px;color:var(--tx2)}
.sr-l .u{font-size:11px;color:var(--tx3)}
.sr-i{width:72px;text-align:right;font-size:12px;padding:4px 8px;border:1px solid var(--bd);border-radius:5px;background:var(--bg2);color:var(--tx);font-family:var(--font)}
.sr-i:focus{outline:none;border-color:var(--accent)}
.sr input[type=range]{width:100%;cursor:pointer}

.sb{padding:14px 18px;border-top:1px solid var(--bd);margin-top:auto}
.wn{font-size:12px;padding:8px 10px;border-radius:8px;margin-bottom:10px;display:flex;align-items:center;gap:8px}
.wn.ok{background:var(--ok-bg);color:var(--ok)}
.wn.wr{background:var(--warn-bg);color:var(--warn)}
.wn.er{background:var(--err-bg);color:var(--err)}
.dot{width:7px;height:7px;border-radius:50%;background:currentColor;flex-shrink:0}
.solve-btn{width:100%;padding:11px 0;font-size:14px;font-weight:500;border:none;background:var(--accent);color:#fff;border-radius:8px;cursor:pointer;font-family:var(--font)}
.solve-btn:hover{filter:brightness(1.1)}

.mn{flex:1;display:flex;flex-direction:column;min-width:0}
.tabs{display:flex;align-items:center;border-bottom:1px solid var(--bd);padding:0 24px;gap:6px;background:var(--bg2);flex-shrink:0}
.tab{font-size:14px;padding:13px 20px;border:none;background:transparent;color:var(--tx2);cursor:pointer;border-bottom:2px solid transparent;transition:color .15s;font-family:var(--font)}
.tab.on{color:var(--tx);font-weight:500;border-bottom-color:var(--accent)}
.tab:hover:not(.on){color:var(--tx)}
.tab-r{margin-left:auto;display:flex;gap:8px}
.tab-r button{font-size:13px;padding:7px 14px;border:1px solid var(--bd);background:transparent;border-radius:8px;cursor:pointer;color:var(--tx2);font-family:var(--font)}
.tab-r button:hover{background:var(--bg3);color:var(--tx)}

.vp{flex:1;padding:20px 24px;overflow-y:auto}
.vg{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.vc{border:1px solid var(--bd);border-radius:12px;padding:16px;background:var(--bg2)}
.vt{font-size:13px;font-weight:500;color:var(--tx2);margin-bottom:12px}
.vt .sub{font-weight:400;color:var(--tx3);font-size:12px}
.cp{min-height:200px;border-radius:8px;background:var(--bg3);display:flex;align-items:center;justify-content:center;color:var(--tx3);font-size:13px}
.full{grid-column:1/-1}

.kpi-bar{display:flex;border-top:1px solid var(--bd);background:var(--bg2);flex-shrink:0}
.kpi{flex:1;text-align:center;padding:10px 8px;border-right:1px solid var(--bd)}
.kpi:last-child{border-right:none}
.kpi-l{font-size:11px;color:var(--tx3);margin-bottom:3px}
.kpi-v{font-size:16px;font-weight:500;font-family:var(--mono);color:var(--tx)}
.kpi-u{font-size:12px;font-weight:400;color:var(--tx2)}

.sbar{font-size:12px;color:var(--tx3);padding:6px 24px;border-top:1px solid var(--bd);background:var(--bg2);display:flex;gap:20px;flex-shrink:0}

.dtbl{width:100%;font-size:13px;border-collapse:collapse}
.dtbl td{padding:6px 0}
.dtbl .lb{color:var(--tx2)}.dtbl .vl{text-align:right;font-family:var(--mono);color:var(--tx)}
.dtbl tr{border-bottom:1px solid var(--bd)}.dtbl tr:last-child{border-bottom:none}
`;

// Inject styles once
if (typeof document !== 'undefined' && !document.getElementById('fansim-css')) {
  const s = document.createElement('style'); s.id = 'fansim-css'; s.textContent = STYLE_CSS;
  document.head.appendChild(s);
}

// ═══ SLIDER + INPUT ROW ═══
function SR({ label, unit, value, onChange, min, max, step }) {
  return React.createElement('div', { className: 'sr' },
    React.createElement('div', { className: 'sr-t' },
      React.createElement('span', { className: 'sr-l' }, label, unit && React.createElement('span', { className: 'u' }, ' [', unit, ']')),
      React.createElement('input', { className: 'sr-i', type: 'number', value: value, step: step,
        onChange: e => onChange(+e.target.value) })
    ),
    React.createElement('input', { type: 'range', min: min, max: max, step: step, value: value,
      onChange: e => onChange(+e.target.value) })
  );
}

// ═══ PHYSICS MODEL — simplified computeAero from existing ═══
function computeAero(p) {
  const { D1, D2, b1, b2, beta1, beta2, Z, RPM, cutoffGap = 8, Rtongue = 5,
    wrapAngle = 360, scrollExpRate = 0.12, diffAngle = 7, diffLength = 40,
    rho = 1.184, mu = 1.85e-5 } = p;
  const omega = 2 * Math.PI * RPM / 60;
  const r1 = D1 / 2000, r2 = D2 / 2000, b1m = b1 / 1000, b2m = b2 / 1000;
  const b2R = beta2 * Math.PI / 180;
  const U2 = omega * r2;
  const sigma = 1 - (Math.PI * Math.sin(b2R)) / Z;
  const QmaxM3s = Math.PI * (D2 / 1000) * b2m * U2 * 1.2;
  const gapM = cutoffGap / 1000;
  const wrapFrac = Math.min(1, wrapAngle / 360);
  const bScrollM = b2m * 1.1;

  const N = 100, pts = [];
  let bestEta = 0, bestIdx = 0;

  for (let i = 0; i <= N; i++) {
    const Qm3s = (i / N) * QmaxM3s;
    const Q = Qm3s * 60;
    const Cr2 = Qm3s / (Math.PI * (D2 / 1000) * b2m);
    const Ct2 = sigma * U2 - Cr2 / Math.tan(b2R);
    const C2 = Math.sqrt(Cr2 ** 2 + Ct2 ** 2);
    const Pt_e = rho * U2 * Ct2;

    // Simplified loss model (for new UI shell — full model will be ported later)
    const dP_inc = 0.5 * rho * Cr2 ** 2 * 0.15;
    const dP_fric = 0.08 * 0.5 * rho * C2 ** 2;
    const dP_disk = Qm3s > 1e-6 ? 2 * 0.005 * rho * omega ** 3 * r2 ** 5 / Qm3s : 0;
    const dP_jw = 0.5 * rho * C2 ** 2 * 0.14 ** 2;

    const Pt_imp = Math.max(0, Pt_e - dP_inc - dP_fric - Math.min(dP_disk, Pt_e * 0.5) - dP_jw);

    // Scroll
    const L_scroll = 2 * Math.PI * r2 * wrapFrac;
    const rExit = r2 + r2 * scrollExpRate * wrapFrac * 2 * Math.PI;
    const A_sc = Math.max(bScrollM * (rExit - r2), Qm3s > 0 ? Qm3s / Math.max(1, C2 * 0.5) : bScrollM * 0.02);
    const C_sc = Qm3s > 0 ? Qm3s / A_sc * 0.7 : C2 * 0.5;
    const dP_scroll = 0.04 * (L_scroll / 0.03) * 0.5 * rho * C_sc ** 2 + 0.20 * 0.5 * rho * C2 ** 2 * wrapFrac;

    // Tongue
    const gapRatio = gapM / (2 * r2);
    const eps_leak = Math.min(0.25, 0.82 * Math.pow(gapRatio, 0.7) / (1 + Rtongue / cutoffGap));
    const Q_delivered = Qm3s * (1 - eps_leak);
    const dP_tongue = eps_leak * Pt_imp * 0.3;

    // Diffuser
    const diffAR = diffLength > 0 ? 1 + 2 * (diffLength / 1000) * Math.tan(Math.abs(diffAngle) * Math.PI / 180) / Math.max(0.01, Math.sqrt(A_sc)) : 1;
    const A_exit = Math.max(0.001, A_sc * Math.max(1, diffAR));

    const dP_uncap = 0.5 * rho * (C2 * Math.sqrt(1 - wrapFrac)) ** 2 * (1 - wrapFrac);
    const Pt_fan = Math.max(0, Pt_imp - dP_jw - dP_scroll - dP_tongue - dP_uncap);
    const V_exit = Q_delivered > 0 ? Q_delivered / A_exit : 0;
    const Pdyn_exit = 0.5 * rho * V_exit ** 2;
    const Ps = Pt_fan - Pdyn_exit;
    const Pshaft = Qm3s > 1e-6 ? Pt_e * Qm3s + 2 * 0.005 * rho * omega ** 3 * r2 ** 5 : 2 * 0.005 * rho * omega ** 3 * r2 ** 5;
    const eta = Pshaft > 0 ? Math.max(0, Ps * Q_delivered) / Pshaft : 0;

    pts.push({ Q: Q_delivered * 60, Qm3s: Q_delivered, Pt: Pt_fan, Ps, Pdyn: Pdyn_exit, eta, Pshaft, C2 });
    if (i >= N / 10 && eta > bestEta) { bestEta = eta; bestIdx = i; }
  }

  const bep = pts[bestIdx] || pts[0];
  const dR = cutoffGap / (D2 / 2);
  const BPF = Z * RPM / 60;
  const SPL = (bep.Qm3s > 0 && bep.Pt > 0
    ? 10 * Math.log10(bep.Pt ** 2 * bep.Qm3s / (rho * 343 ** 3)) + 56 : 30)
    - 20 * Math.log10(Math.max(0.03, dR) / 0.10);

  return { bep, pts, BPF, SPL, sigma, U2 };
}

// ═══ SIMPLE PQ CHART ═══
function PQChart({ result }) {
  if (!result || !result.pts) return React.createElement('div', { className: 'cp' }, '데이터 없음');
  const pts = result.pts.filter(p => p.Q > 0);
  const bep = result.bep;
  const W = 420, H = 280, pad = { l: 50, r: 20, t: 20, b: 36 };
  const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
  const maxQ = Math.max(...pts.map(p => p.Q));
  const maxP = Math.max(...pts.map(p => Math.max(p.Pt, p.Ps)));
  const sx = q => pad.l + (q / maxQ) * pw;
  const sy = p => pad.t + ph - (p / Math.max(1, maxP)) * ph;
  const mkPath = (arr, k) => arr.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.Q)} ${sy(p[k])}`).join(' ');

  return React.createElement('svg', { viewBox: `0 0 ${W} ${H}`, style: { width: '100%', maxWidth: 500, display: 'block', margin: '0 auto' } },
    [0.25, 0.5, 0.75, 1].map(f =>
      React.createElement('line', { key: f, x1: pad.l, y1: pad.t + ph * (1 - f), x2: pad.l + pw, y2: pad.t + ph * (1 - f),
        stroke: 'var(--bd)', strokeWidth: 0.5 })),
    React.createElement('line', { x1: pad.l, y1: pad.t, x2: pad.l, y2: pad.t + ph, stroke: 'var(--tx3)', strokeWidth: 1 }),
    React.createElement('line', { x1: pad.l, y1: pad.t + ph, x2: pad.l + pw, y2: pad.t + ph, stroke: 'var(--tx3)', strokeWidth: 1 }),
    React.createElement('path', { d: mkPath(pts, 'Pt'), fill: 'none', stroke: 'var(--purple)', strokeWidth: 2, opacity: 0.7 }),
    React.createElement('path', { d: mkPath(pts, 'Ps'), fill: 'none', stroke: 'var(--accent)', strokeWidth: 2.5 }),
    React.createElement('circle', { cx: sx(bep.Q), cy: sy(bep.Ps), r: 6, fill: 'var(--ok)', stroke: 'var(--bg)', strokeWidth: 2 }),
    React.createElement('text', { x: sx(bep.Q) + 10, y: sy(bep.Ps) - 8, fill: 'var(--ok)', fontSize: 11, fontWeight: 600 }, 'BEP'),
    React.createElement('text', { x: pad.l + pw / 2, y: H - 8, fill: 'var(--tx2)', fontSize: 12, textAnchor: 'middle' }, 'Q (m³/min)'),
    React.createElement('text', { x: 18, y: pad.t + ph / 2, fill: 'var(--tx2)', fontSize: 12, textAnchor: 'middle',
      transform: `rotate(-90, 18, ${pad.t + ph / 2})` }, 'P (Pa)'),
    React.createElement('text', { x: pad.l - 6, y: pad.t + 4, fill: 'var(--tx3)', fontSize: 10, textAnchor: 'end' }, maxP.toFixed(0)),
    React.createElement('text', { x: pad.l - 6, y: pad.t + ph, fill: 'var(--tx3)', fontSize: 10, textAnchor: 'end' }, '0'),
    React.createElement('text', { x: pad.l, y: pad.t + ph + 16, fill: 'var(--tx3)', fontSize: 10 }, '0'),
    React.createElement('text', { x: pad.l + pw, y: pad.t + ph + 16, fill: 'var(--tx3)', fontSize: 10, textAnchor: 'end' }, maxQ.toFixed(1)),
    // Legend
    React.createElement('line', { x1: pad.l + 10, y1: pad.t + 12, x2: pad.l + 24, y2: pad.t + 12, stroke: 'var(--accent)', strokeWidth: 2.5 }),
    React.createElement('text', { x: pad.l + 28, y: pad.t + 15, fill: 'var(--accent)', fontSize: 11 }, 'Ps'),
    React.createElement('line', { x1: pad.l + 56, y1: pad.t + 12, x2: pad.l + 70, y2: pad.t + 12, stroke: 'var(--purple)', strokeWidth: 2, opacity: 0.7 }),
    React.createElement('text', { x: pad.l + 74, y: pad.t + 15, fill: 'var(--purple)', fontSize: 11 }, 'Pt')
  );
}

// ═══ FRONT VIEW (simple 2D) ═══
function FrontView({ D1, D2, Deye, Z }) {
  const W = 320, H = 320, cx = W / 2, cy = H / 2;
  const sc = (W - 40) / (D2 * 1.3);
  const blades = [];
  for (let i = 0; i < Z; i++) {
    const a = (2 * Math.PI * i) / Z;
    const r1 = D1 / 2, r2 = D2 / 2;
    const x1 = cx + r1 * Math.cos(a) * sc, y1 = cy - r1 * Math.sin(a) * sc;
    const x2 = cx + r2 * Math.cos(a) * sc, y2 = cy - r2 * Math.sin(a) * sc;
    blades.push(React.createElement('line', { key: i, x1, y1, x2, y2, stroke: 'var(--accent)', strokeWidth: 1.2, opacity: 0.6 }));
  }
  return React.createElement('svg', { viewBox: `0 0 ${W} ${H}`, style: { width: '100%', maxWidth: 400, display: 'block', margin: '0 auto' } },
    React.createElement('circle', { cx, cy, r: D2 / 2 * sc, fill: 'none', stroke: 'var(--accent)', strokeWidth: 1.5 }),
    React.createElement('circle', { cx, cy, r: D1 / 2 * sc, fill: 'none', stroke: 'var(--tx2)', strokeWidth: 0.8, strokeDasharray: '3,3' }),
    React.createElement('circle', { cx, cy, r: Deye / 2 * sc, fill: 'none', stroke: 'var(--ok)', strokeWidth: 1.5 }),
    React.createElement('circle', { cx, cy, r: Deye * 0.2 * sc, fill: 'var(--bg3)', stroke: 'var(--warn)', strokeWidth: 1 }),
    ...blades,
    React.createElement('text', { x: cx, y: cy + 4, fill: 'var(--tx3)', fontSize: 10, textAnchor: 'middle' }, `D₂=${D2}`)
  );
}

// ═══ MAIN APP ═══
function App() {
  // Mode
  const [mode, setMode] = useState('on_design'); // 'on_design' | 'semi_empirical' | 'off_design'
  const [tab, setTab] = useState(0);

  // Geometry
  const [D1, setD1] = useState(120);
  const [D2, setD2] = useState(175);
  const [Deye, setDeye] = useState(110);
  const [b1, setB1] = useState(60);
  const [b2, setB2] = useState(50);
  const [beta1, setBeta1] = useState(30);
  const [beta2, setBeta2] = useState(145);
  const [Z, setZ] = useState(36);
  const [RPM, setRPM] = useState(1400);

  // Scroll / Tongue
  const [wrapAngle, setWrapAngle] = useState(360);
  const [scrollExpRate, setScrollExpRate] = useState(0.12);
  const [cutoffGap, setCutoffGap] = useState(8);
  const [Rtongue, setRtongue] = useState(5);

  // Diffuser
  const [diffAngle, setDiffAngle] = useState(7);
  const [diffLength, setDiffLength] = useState(40);

  // Inlet state (HPWD standard)
  const [T_in, setTIn] = useState(25);
  const [RH_in, setRHIn] = useState(0.5);

  // Experimental data
  const [expData, setExpData] = useState([]);
  const [fitCoeffs, setFitCoeffs] = useState(null);

  // Compute inlet air
  const airState = useMemo(() => {
    const T_K = T_in + 273.15;
    const Ps_sat = Math.exp(23.196 - 3816.44 / (T_K - 46.13));
    const omega = 0.62198 * (RH_in * Ps_sat) / Math.max(1, 101325 - RH_in * Ps_sat);
    const Pv = omega * 101325 / (0.62198 + omega);
    const Pda = 101325 - Pv;
    const rho = Pda / (287.058 * T_K) + Pv / (461.495 * T_K);
    const mu = 1.716e-5 * Math.pow(T_K / 273.15, 1.5) * (273.15 + 110.4) / (T_K + 110.4);
    return { T: T_in, omega, rho, mu, RH: RH_in };
  }, [T_in, RH_in]);

  // Compute fan
  const result = useMemo(() => {
    return computeAero({
      D1, D2, Deye, b1, b2, beta1, beta2, Z, RPM,
      wrapAngle, scrollExpRate, cutoffGap, Rtongue,
      diffAngle, diffLength,
      rho: airState.rho, mu: airState.mu,
    });
  }, [D1, D2, Deye, b1, b2, beta1, beta2, Z, RPM, wrapAngle, scrollExpRate, cutoffGap, Rtongue, diffAngle, diffLength, airState]);

  const bep = result?.bep || {};

  // ═══ UI RENDER ═══
  return React.createElement('div', { className: 'app' },
    // HEADER
    React.createElement('div', { className: 'hdr' },
      React.createElement('a', { className: 'hdr-back' }, '← System'),
      React.createElement('div', { className: 'hdr-name' }, 'Fan'),
      React.createElement('div', { className: 'mode-grp' },
        [{ id: 'off_design', n: 'Off-design' }, { id: 'semi_empirical', n: 'Semi-empirical' }, { id: 'on_design', n: 'On-design' }].map(m =>
          React.createElement('button', {
            key: m.id, className: `mode-btn ${mode === m.id ? 'on' : ''}`,
            onClick: () => setMode(m.id)
          }, m.n))
      ),
      React.createElement('div', { className: 'hdr-icons' },
        React.createElement('button', { title: 'Save / Load' }, '💾'),
        React.createElement('button', { title: 'Settings' }, '⚙')
      )
    ),

    // BODY
    React.createElement('div', { className: 'bdy' },
      // SIDEBAR
      React.createElement('aside', { className: 'side' },
        // Inlet conditions
        React.createElement('div', { className: 'ss' },
          React.createElement('div', { className: 'st' }, 'Inlet conditions'),
          React.createElement('div', { className: 'ir' },
            React.createElement('span', { className: 'il' }, 'T', React.createElement('span', { className: 'u' }, '[°C]')),
            React.createElement('input', { className: 'nf', type: 'number', value: T_in, onChange: e => setTIn(+e.target.value) })
          ),
          React.createElement('div', { className: 'ir' },
            React.createElement('span', { className: 'il' }, 'RH', React.createElement('span', { className: 'u' }, '[0-1]')),
            React.createElement('input', { className: 'nf', type: 'number', step: 0.05, value: RH_in, onChange: e => setRHIn(+e.target.value) })
          ),
          React.createElement('div', { style: { fontSize: 11, color: 'var(--tx3)', marginTop: 4 } },
            `ρ = ${airState.rho.toFixed(3)} kg/m³, ω = ${airState.omega.toFixed(4)}`)
        ),
        React.createElement('div', { className: 'dv' }),

        // Operating
        React.createElement('div', { className: 'ss' },
          React.createElement('div', { className: 'st' }, 'Operating'),
          React.createElement(SR, { label: 'RPM', value: RPM, onChange: setRPM, min: 400, max: 3000, step: 10 })
        ),
        React.createElement('div', { className: 'dv' }),

        // Geometry — on-design only shows full detail
        React.createElement('div', { className: 'ss' },
          React.createElement('div', { className: 'st' },
            ({ 'off_design': 'PQ map (upload)', 'semi_empirical': 'Loss coefficients', 'on_design': 'Impeller geometry' })[mode]),

          mode === 'on_design' && React.createElement('div', null,
            React.createElement(SR, { label: 'D₁', unit: 'mm', value: D1, onChange: setD1, min: 60, max: 200, step: 1 }),
            React.createElement(SR, { label: 'D₂', unit: 'mm', value: D2, onChange: setD2, min: 100, max: 300, step: 1 }),
            React.createElement(SR, { label: 'D_eye', unit: 'mm', value: Deye, onChange: setDeye, min: 60, max: 180, step: 1 }),
            React.createElement(SR, { label: 'b₁', unit: 'mm', value: b1, onChange: setB1, min: 15, max: 120, step: 1 }),
            React.createElement(SR, { label: 'b₂', unit: 'mm', value: b2, onChange: setB2, min: 20, max: 100, step: 1 }),
            React.createElement(SR, { label: 'β₁', unit: '°', value: beta1, onChange: setBeta1, min: 5, max: 85, step: 1 }),
            React.createElement(SR, { label: 'β₂', unit: '°', value: beta2, onChange: setBeta2, min: 20, max: 180, step: 1 }),
            React.createElement(SR, { label: 'Z', value: Z, onChange: setZ, min: 16, max: 48, step: 1 })
          ),

          mode === 'semi_empirical' && React.createElement('div', { style: { fontSize: 13, color: 'var(--tx3)', lineHeight: 1.7 } },
            '9개 손실 계수',
            React.createElement('br'),
            '실험 데이터 업로드 → 자동 피팅',
            fitCoeffs && React.createElement('div', { style: { marginTop: 8, color: 'var(--ok)', fontSize: 12 } }, '✓ 피팅 계수 적용 중')
          ),

          mode === 'off_design' && React.createElement('div', { style: { fontSize: 13, color: 'var(--tx3)', lineHeight: 1.7 } },
            '실험 PQ 맵 보간 모드',
            React.createElement('br'),
            'Fitting 탭에서 CSV 업로드',
            expData.length > 0 && React.createElement('div', { style: { marginTop: 8, color: 'var(--ok)', fontSize: 12 } }, `✓ ${expData.length}점 로드됨`)
          )
        ),
        React.createElement('div', { className: 'dv' }),

        // Scroll + Tongue + Diffuser (on-design, semi)
        mode !== 'off_design' && React.createElement('div', { className: 'ss' },
          React.createElement('div', { className: 'st' }, 'Scroll & Tongue'),
          React.createElement(SR, { label: 'Wrap', unit: '°', value: wrapAngle, onChange: setWrapAngle, min: 180, max: 360, step: 5 }),
          React.createElement(SR, { label: 'Exp rate', value: scrollExpRate, onChange: setScrollExpRate, min: 0.02, max: 0.3, step: 0.01 }),
          React.createElement(SR, { label: 'δ (gap)', unit: 'mm', value: cutoffGap, onChange: setCutoffGap, min: 2, max: 30, step: 0.5 }),
          React.createElement(SR, { label: 'R_tongue', unit: 'mm', value: Rtongue, onChange: setRtongue, min: 1, max: 20, step: 0.5 }),
          React.createElement(SR, { label: 'Diff α', unit: '°', value: diffAngle, onChange: setDiffAngle, min: 0, max: 30, step: 1 }),
          React.createElement(SR, { label: 'Diff L', unit: 'mm', value: diffLength, onChange: setDiffLength, min: 0, max: 200, step: 5 })
        ),

        // Bottom
        React.createElement('div', { className: 'sb' },
          React.createElement('div', { className: 'wn ok' },
            React.createElement('span', { className: 'dot' }),
            `수렴 | η = ${(bep.eta * 100).toFixed(1)}%`),
          React.createElement('button', { className: 'solve-btn' }, '▶ SOLVE')
        )
      ),

      // MAIN
      React.createElement('div', { className: 'mn' },
        React.createElement('div', { className: 'tabs' },
          ['Visualization', 'Results', 'Fitting', 'Analysis'].map((t, i) =>
            React.createElement('button', {
              key: t, className: `tab ${tab === i ? 'on' : ''}`, onClick: () => setTab(i)
            }, t)),
          React.createElement('div', { className: 'tab-r' },
            React.createElement('button', null, '📥 CSV'),
            React.createElement('button', null, '📄 Report')
          )
        ),

        React.createElement('div', { className: 'vp' },
          // Tab 0: Visualization
          tab === 0 && React.createElement('div', { className: 'vg' },
            React.createElement('div', { className: 'vc' },
              React.createElement('div', { className: 'vt' }, 'Front view ', React.createElement('span', { className: 'sub' }, '— 2D cross-section')),
              React.createElement(FrontView, { D1, D2, Deye, Z })
            ),
            React.createElement('div', { className: 'vc' },
              React.createElement('div', { className: 'vt' }, '3D model ', React.createElement('span', { className: 'sub' }, '— coming soon')),
              React.createElement('div', { className: 'cp' }, '3D 뷰는 다음 업데이트에 포함됩니다')
            )
          ),

          // Tab 1: Results
          tab === 1 && React.createElement('div', { className: 'vg' },
            React.createElement('div', { className: 'vc full' },
              React.createElement('div', { className: 'vt' }, 'PQ curve ', React.createElement('span', { className: 'sub' }, '— performance curve at current RPM')),
              React.createElement(PQChart, { result })
            ),
            React.createElement('div', { className: 'vc' },
              React.createElement('div', { className: 'vt' }, 'BEP details'),
              React.createElement('table', { className: 'dtbl' },
                React.createElement('tbody', null,
                  [
                    ['Q_BEP', `${bep.Q?.toFixed(2)} m³/min`],
                    ['Pt', `${bep.Pt?.toFixed(1)} Pa`],
                    ['Ps', `${bep.Ps?.toFixed(1)} Pa`],
                    ['Pdyn', `${bep.Pdyn?.toFixed(1)} Pa`],
                    ['η', `${(bep.eta * 100).toFixed(1)} %`],
                    ['Pshaft', `${bep.Pshaft?.toFixed(1)} W`],
                  ].map(([k, v]) => React.createElement('tr', { key: k },
                    React.createElement('td', { className: 'lb' }, k),
                    React.createElement('td', { className: 'vl' }, v)))
                )
              )
            ),
            React.createElement('div', { className: 'vc' },
              React.createElement('div', { className: 'vt' }, 'Aero properties'),
              React.createElement('table', { className: 'dtbl' },
                React.createElement('tbody', null,
                  [
                    ['U₂', `${result?.U2?.toFixed(1)} m/s`],
                    ['Slip σ', result?.sigma?.toFixed(3)],
                    ['SPL', `${result?.SPL?.toFixed(1)} dB(A)`],
                    ['BPF', `${result?.BPF?.toFixed(0)} Hz`],
                    ['C₂', `${bep.C2?.toFixed(1)} m/s`],
                  ].map(([k, v]) => React.createElement('tr', { key: k },
                    React.createElement('td', { className: 'lb' }, k),
                    React.createElement('td', { className: 'vl' }, v)))
                )
              )
            )
          ),

          // Tab 2: Fitting
          tab === 2 && React.createElement('div', { className: 'vg' },
            React.createElement('div', { className: 'vc full' },
              React.createElement('div', { className: 'vt' }, 'Experimental data & fitting'),
              React.createElement('div', { style: { color: 'var(--tx3)', fontSize: 13, lineHeight: 1.7 } },
                'CSV 업로드 / 붙여넣기로 실험 PQ 데이터 로드', React.createElement('br'),
                'Semi-empirical 모드에서 자동 피팅', React.createElement('br'),
                'RMSE, MAPE, R² 메트릭 자동 계산', React.createElement('br'),
                React.createElement('br'),
                React.createElement('span', { style: { color: 'var(--tx2)' } },
                  '(이 탭은 다음 업데이트에 포함됩니다. 현재는 레이아웃만 표시)'))
            )
          ),

          // Tab 3: Analysis
          tab === 3 && React.createElement('div', { className: 'vg' },
            React.createElement('div', { className: 'vc full' },
              React.createElement('div', { className: 'vt' }, 'Parameter sweep & optimization'),
              React.createElement('div', { style: { color: 'var(--tx3)', fontSize: 13, lineHeight: 1.7 } },
                'Sweep, 최적화, 시스템 커플링, Quasi-steady 시뮬레이션', React.createElement('br'),
                React.createElement('br'),
                React.createElement('span', { style: { color: 'var(--tx2)' } },
                  '(이 탭은 다음 업데이트에 포함됩니다. 현재는 레이아웃만 표시)'))
            )
          )
        )
      )
    ),

    // KPI BAR
    React.createElement('div', { className: 'kpi-bar' },
      [
        { l: 'Q_BEP', v: bep.Q?.toFixed(1), u: 'm³/min' },
        { l: 'Ps', v: bep.Ps?.toFixed(0), u: 'Pa' },
        { l: 'Pt', v: bep.Pt?.toFixed(0), u: 'Pa' },
        { l: 'η', v: ((bep.eta || 0) * 100).toFixed(1), u: '%' },
        { l: 'SPL', v: result?.SPL?.toFixed(1), u: 'dB' },
        { l: 'Pshaft', v: bep.Pshaft?.toFixed(1), u: 'W' },
      ].map(k => React.createElement('div', { key: k.l, className: 'kpi' },
        React.createElement('div', { className: 'kpi-l' }, k.l),
        React.createElement('div', { className: 'kpi-v' }, k.v || '—',
          k.u && React.createElement('span', { className: 'kpi-u' }, ' ', k.u))
      ))
    ),

    // STATUS BAR
    React.createElement('div', { className: 'sbar' },
      React.createElement('span', null, React.createElement('span', { className: 'dot' }), '수렴 완료'),
      React.createElement('span', null, `Mode: ${mode}`),
      React.createElement('span', null, `RPM: ${RPM}`),
      React.createElement('span', null, `Inlet: ${T_in}°C / ${(RH_in * 100).toFixed(0)}%`)
    )
  );
}

export default App;
