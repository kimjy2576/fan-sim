import { useState, useMemo } from "react";

const C = { bg:"#0a0e17", card:"#111827", border:"#1e2d4a", text:"#e2e8f0", dim:"#4a5568", muted:"#718096",
  blue:"#60a5fa", red:"#ef4444", green:"#4ade80", cyan:"#22d3ee", purple:"#a855f7", orange:"#f59e0b",
  pink:"#f472b6", amber:"#fbbf24", scroll:"#d4a44a" };

// ═══ MATERIAL DATABASE ═══
const MATERIALS = {
  SPCC: { name: "SPCC (냉연강판)", E: 200e9, rho: 7850, sigma_y: 220e6, color: "#94a3b8" },
  SGCC: { name: "SGCC (도금강판)", E: 200e9, rho: 7850, sigma_y: 200e6, color: "#a1a1aa" },
  SUS304: { name: "SUS304 (스테인리스)", E: 193e9, rho: 8000, sigma_y: 215e6, color: "#d4d4d8" },
  A5052: { name: "A5052 (알루미늄)", E: 70e9, rho: 2680, sigma_y: 195e6, color: "#60a5fa" },
  PP: { name: "PP (폴리프로필렌)", E: 1.5e9, rho: 900, sigma_y: 35e6, color: "#4ade80" },
  ABS: { name: "ABS", E: 2.3e9, rho: 1050, sigma_y: 45e6, color: "#fbbf24" },
};

// ═══ AERODYNAMIC MODEL (simplified from fan-sim-pro) ═══
function computeAero(p) {
  const { D1, D2, Deye, b1, b2, beta1, beta2, Z, RPM, T_in = 25, RH = 50 } = p;
  const T = T_in + 273.15;
  const Psat = 610.94 * Math.exp(17.625 * T_in / (T_in + 243.04));
  const Pw = Psat * RH / 100;
  const rho = (101325 - Pw) / (287.058 * T) + Pw / (461.495 * T);
  const mu = 1.716e-5 * Math.pow(T / 273.15, 1.5) * (273.15 + 110.4) / (T + 110.4);
  const omega = 2 * Math.PI * RPM / 60;
  const r1 = D1 / 2000, r2 = D2 / 2000, b1m = b1 / 1000, b2m = b2 / 1000;
  const b1R = beta1 * Math.PI / 180, b2R = beta2 * Math.PI / 180;
  const U1 = omega * r1, U2 = omega * r2;
  const sigma = 1 - (Math.PI * Math.sin(b2R)) / Z;
  const QmaxM3s = Math.PI * (D2 / 1000) * b2m * U2 * 1.2;
  const Cr1_des = U1 * Math.tan(b1R);
  const Q_des = Cr1_des * Math.PI * (D1 / 1000) * b1m;
  const pitch2 = Math.PI * (D2 / 1000) / Z;
  const Dh = 2 * pitch2 * b2m / (pitch2 + b2m);
  const tBlade = p.tBlade || 1.0;
  const tBladeM = tBlade / 1000;
  const k_inc = 1 - (tBladeM / (Math.PI * (D1/1000) / Z)) ** 2;
  const roughness = 0.00005;
  const eD = roughness / Dh;

  // Blade path length
  let Lb = 0, prevX = r1, prevY = 0, th = 0;
  for (let i = 1; i <= 20; i++) {
    const t = i/20, r = r1+t*(r2-r1), rP = r1+(i-1)/20*(r2-r1);
    const rM=(r+rP)/2, tM=(t+(i-1)/20)/2, bM=b1R+tM*(b2R-b1R);
    if(Math.abs(Math.tan(bM))>0.001) th+=(-1/(rM*Math.tan(bM)))*(r-rP);
    const x=r*Math.cos(th), y=r*Math.sin(th);
    Lb+=Math.sqrt((x-prevX)**2+(y-prevY)**2); prevX=x; prevY=y;
  }

  const nPts = 40;
  let bestEta = 0, bep = null;
  const pqSample = [];

  for (let i = 0; i <= nPts; i++) {
    const Qm3s = (i / nPts) * QmaxM3s, Q = Qm3s * 60;
    const Cr1 = Qm3s / (Math.PI * (D1/1000) * b1m);
    const Cr2 = Qm3s / (Math.PI * (D2/1000) * b2m);
    const Ct2 = sigma * U2 - Cr2 / Math.tan(b2R);
    const C2 = Math.sqrt(Cr2**2 + Ct2**2);
    const W1 = Math.sqrt(Cr1**2 + U1**2), W2 = Math.sqrt(Cr2**2 + (Ct2-U2)**2);
    const Pt_e = rho * U2 * Ct2;

    const incA = Math.atan2(Cr1, U1) - b1R;
    const dPinc = k_inc * 0.5 * rho * (W1 * Math.sin(incA))**2;
    const Wa = (W1+W2)/2, Re = rho*Wa*Dh/mu;
    const f = Re > 2300 ? 1/Math.pow(-1.8*Math.log10(6.9/Re+(eD/3.7)**1.11),2) : (Re>0?64/Re:0.02);
    const dPfric = f * (Lb/Dh) * 0.5 * rho * Wa**2;
    const DR = W1>0 ? 1-W2/W1+Math.abs(Ct2)/(2*Z*W1/Math.PI) : 0;
    const dPrec = DR>0.5 ? 0.0085*(DR-0.5)**2*rho*U2**2 : 0;
    const diskGapM = (p.diskGap||5)/1000, sR = diskGapM/Math.max(0.001,r2);
    const ReDisk = rho*omega*r2**2/mu;
    const Cm = ReDisk>0?(sR<0.05?0.0622/Math.pow(ReDisk,0.2):3.7*sR**0.1/Math.pow(ReDisk,0.5)):0.005;
    const Pdf = 2*0.5*Cm*rho*omega**3*r2**5;
    const dPdisk = Qm3s>1e-6 ? Pdf/Qm3s : Pdf/1e-6;
    const epsilon = 0.12+0.5*tBladeM/pitch2;
    const dPjw = 0.5*rho*C2**2*epsilon**2;

    const dPtot = dPinc+dPfric+dPrec+Math.min(dPdisk,Pt_e*0.5)+dPjw;
    const Pt = Math.max(0, Pt_e - dPtot);
    const Pdyn = 0.5*rho*C2**2;
    const Ps = Pt - Pdyn;
    const Pshaft = Qm3s>1e-6 ? Pt_e*Qm3s+Pdf : Pdf;
    const eta = Pshaft>0 ? Math.max(0,Ps*Qm3s)/Pshaft : 0;

    const pt = { Q, Qm3s, Pt_e, Pt, Ps, Pdyn, eta, C2, W1, W2, Ct2, Cr2, dPinc, dPfric, dPrec, dPjw };
    pqSample.push(pt);
    if (eta > bestEta) { bestEta = eta; bep = pt; }
  }

  if (!bep) bep = pqSample[20];
  const BPF = Z * RPM / 60;
  const Ns = bep.Qm3s > 0 ? RPM * Math.sqrt(bep.Qm3s) / Math.pow(Math.max(1,bep.Pt)/rho, 0.75) : 0;

  // BPF SPL (Neise)
  const deltaR2 = (p.tGap||8)/(D2/2);
  const Lw = bep.Qm3s>0&&bep.Pt>0 ? 10*Math.log10(bep.Pt**2*bep.Qm3s/(rho*343**3))+56 : 30;
  const bpfCorr = -20*Math.log10(Math.max(0.03,deltaR2)/0.10) - 5*Math.log10(1+(p.Rtongue||5)/Math.max(1,p.tGap||8));
  const SPL = Lw + bpfCorr;

  // Broadband noise estimate (Sharland-type)
  const SPL_broad = 10*Math.log10(rho**2 * U2**6 * (D2/1000)**2 * b2m / (343**4)) + 55;

  return { bep, BPF, SPL, SPL_broad, Ns, rho, mu, U1, U2, sigma, Lb, omega, pqSample };
}

// ═══ STRUCTURAL MODEL ═══
function computeStructure(p, aero, mat) {
  const { D1, D2, b1, b2, Z, tBlade = 1.0 } = p;
  const { omega, bep, U2 } = aero;
  const r1 = D1 / 2000, r2 = D2 / 2000;
  const b_avg = ((b1 + b2) / 2) / 1000; // avg blade height [m]
  const t = tBlade / 1000; // blade thickness [m]
  const L_blade = aero.Lb; // blade path length [m]

  // 1. Centrifugal stress on blade
  const sigma_c = mat.rho * omega ** 2 * (r2 ** 2 - r1 ** 2) / 2;

  // 2. Aerodynamic bending stress
  const dP_blade = bep.Pt > 0 ? bep.Pt / Z : 0; // pressure load per blade [Pa] (simplified)
  const F_aero = dP_blade * b_avg * L_blade; // force on blade [N]
  const M_bend = F_aero * L_blade / 2; // bending moment (cantilever, load at midpoint)
  const I_blade = t ** 3 * b_avg / 12; // 2nd moment of area [m⁴]
  const S_section = t ** 2 * b_avg / 6; // section modulus [m³]
  const sigma_b = S_section > 0 ? M_bend / S_section : 0;

  // 3. Combined stress & safety factor
  const sigma_total = sigma_c + sigma_b;
  const SF = sigma_total > 0 ? mat.sigma_y / sigma_total : 999;

  // 4. Natural frequency (cantilever beam, 1st mode)
  const A_blade = t * b_avg; // cross-section area
  const lambda1 = 1.8751; // 1st mode eigenvalue for cantilever
  const f_n = L_blade > 0
    ? (lambda1 ** 2) / (2 * Math.PI * L_blade ** 2) * Math.sqrt(mat.E * I_blade / (mat.rho * A_blade))
    : 0;

  // 5. Resonance check
  const BPF = aero.BPF;
  const resonanceMargin = BPF > 0 ? Math.abs(f_n - BPF) / BPF : 1;
  const resonance2x = BPF > 0 ? Math.abs(f_n - 2 * BPF) / (2 * BPF) : 1;

  // 6. Blade mass
  const bladeMass = mat.rho * t * b_avg * L_blade; // single blade [kg]
  const totalBladeMass = bladeMass * Z;

  // 7. Hub/disc stress (rotating disc, simplified)
  const sigma_disc = mat.rho * omega ** 2 * r2 ** 2 * (3 + 0.3) / 8; // Poisson ≈ 0.3

  return {
    sigma_c, sigma_b, sigma_total, SF,
    f_n, resonanceMargin, resonance2x,
    bladeMass, totalBladeMass, sigma_disc,
    sigma_c_MPa: sigma_c / 1e6, sigma_b_MPa: sigma_b / 1e6,
    sigma_total_MPa: sigma_total / 1e6, sigma_disc_MPa: sigma_disc / 1e6,
    f_n_Hz: f_n, SF_ok: SF > 2, resonance_ok: resonanceMargin > 0.15,
  };
}

// ═══ SWEEP ENGINE ═══
const SWEEP_VARS = [
  { key: 'D2', label: 'D₂ (외경)', unit: 'mm', min: 100, max: 300, step: 5, default: 175 },
  { key: 'D1', label: 'D₁ (내경)', unit: 'mm', min: 60, max: 200, step: 5, default: 120 },
  { key: 'beta2', label: 'β₂ (출구각)', unit: '°', min: 90, max: 180, step: 5, default: 145 },
  { key: 'beta1', label: 'β₁ (입구각)', unit: '°', min: 5, max: 85, step: 5, default: 30 },
  { key: 'Z', label: 'Z (날개 수)', unit: '', min: 16, max: 48, step: 2, default: 36 },
  { key: 'b2', label: 'b₂ (출구 폭)', unit: 'mm', min: 20, max: 100, step: 5, default: 50 },
  { key: 'RPM', label: 'RPM', unit: '', min: 600, max: 2400, step: 100, default: 1400 },
  { key: 'tBlade', label: 't (두께)', unit: 'mm', min: 0.5, max: 3.0, step: 0.5, default: 1.0 },
];

function S({ label, value, min, max, step, onChange, unit, color }) {
  const [ed, setEd] = useState(false);
  const [txt, setTxt] = useState('');
  return <div className="flex items-center gap-1 py-0.5">
    <span className="w-12 text-right" style={{ color: color||C.muted, fontFamily:"monospace", fontSize:10 }}>{label}</span>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(+e.target.value)}
      className="flex-1 h-1 appearance-none rounded cursor-pointer" style={{ background:C.border, accentColor:color||C.blue }} />
    {ed ? <input type="number" value={txt} onChange={e=>setTxt(e.target.value)} autoFocus
      onBlur={()=>{setEd(false);const v=parseFloat(txt);if(!isNaN(v))onChange(Math.max(min,Math.min(max,v)));}}
      onKeyDown={e=>{if(e.key==='Enter'){setEd(false);const v=parseFloat(txt);if(!isNaN(v))onChange(Math.max(min,Math.min(max,v)));}}}
      className="w-14 text-right rounded px-0.5" style={{background:C.bg,color:C.text,fontFamily:"monospace",fontSize:10,border:`1px solid ${color||C.blue}`,outline:"none"}} />
    : <span className="w-14 text-right cursor-pointer" onDoubleClick={()=>{setEd(true);setTxt(String(value));}}
        style={{color:C.text,fontFamily:"monospace",fontSize:10,borderBottom:`1px dashed ${C.border}`}}>
        {typeof value==='number'&&value%1!==0?value.toFixed(1):value}{unit}</span>}
  </div>;
}

// ═══ MINI CHART ═══
function MiniChart({ data, xKey, yKey, w = 300, h = 120, color = C.blue, label, yUnit = '' }) {
  if (!data || data.length < 2) return null;
  const xs = data.map(d => d[xKey]), ys = data.map(d => d[yKey]);
  const xMin = Math.min(...xs), xMax = Math.max(...xs), yMin = Math.min(...ys.filter(isFinite)), yMax = Math.max(...ys.filter(isFinite));
  const pad = { l: 45, r: 10, t: 16, b: 24 };
  const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
  const sx = v => pad.l + (v - xMin) / ((xMax - xMin) || 1) * pw;
  const sy = v => pad.t + ph - (v - yMin) / ((yMax - yMin) || 1) * ph;
  const pts = data.map(d => `${sx(d[xKey])},${sy(d[yKey])}`).join(' ');
  return <svg width={w} height={h}>
    <text x={w/2} y={12} fill={C.dim} fontSize={8} fontFamily="monospace" textAnchor="middle">{label}</text>
    <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t+ph} stroke={C.border} strokeWidth={0.5} />
    <line x1={pad.l} y1={pad.t+ph} x2={pad.l+pw} y2={pad.t+ph} stroke={C.border} strokeWidth={0.5} />
    <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} />
    {data.map((d,i) => <circle key={i} cx={sx(d[xKey])} cy={sy(d[yKey])} r={2} fill={color} opacity={0.7} />)}
    <text x={pad.l-2} y={pad.t+6} fill={C.dim} fontSize={7} fontFamily="monospace" textAnchor="end">{yMax.toFixed(1)}{yUnit}</text>
    <text x={pad.l-2} y={pad.t+ph} fill={C.dim} fontSize={7} fontFamily="monospace" textAnchor="end">{yMin.toFixed(1)}</text>
    <text x={pad.l} y={h-2} fill={C.dim} fontSize={7} fontFamily="monospace">{xMin}</text>
    <text x={pad.l+pw} y={h-2} fill={C.dim} fontSize={7} fontFamily="monospace" textAnchor="end">{xMax}</text>
  </svg>;
}

// ═══ MAIN ═══
export default function ParametricStudy() {
  // Base design
  const [D1, setD1] = useState(120);
  const [D2, setD2] = useState(175);
  const [Deye, setDeye] = useState(110);
  const [b1, setB1] = useState(60);
  const [b2, setB2] = useState(50);
  const [beta1, setBeta1] = useState(30);
  const [beta2, setBeta2] = useState(145);
  const [Z, setZ] = useState(36);
  const [RPM, setRPM] = useState(1400);
  const [tBlade, setTBlade] = useState(1.0);
  const [matKey, setMatKey] = useState('SPCC');

  // Sweep settings
  const [sweepVar, setSweepVar] = useState('beta2');
  const [sweepMin, setSweepMin] = useState(100);
  const [sweepMax, setSweepMax] = useState(170);
  const [sweepSteps, setSweepSteps] = useState(15);

  const mat = MATERIALS[matKey];
  const baseParams = { D1, D2, Deye, b1, b2, beta1, beta2, Z, RPM, tBlade };

  // Base case result
  const baseResult = useMemo(() => {
    const aero = computeAero(baseParams);
    const struc = computeStructure(baseParams, aero, mat);
    return { aero, struc };
  }, [D1, D2, Deye, b1, b2, beta1, beta2, Z, RPM, tBlade, matKey]);

  // Sweep results
  const sweepResults = useMemo(() => {
    const sv = SWEEP_VARS.find(v => v.key === sweepVar);
    if (!sv) return [];
    const results = [];
    const step = (sweepMax - sweepMin) / Math.max(1, sweepSteps);
    for (let i = 0; i <= sweepSteps; i++) {
      const val = sweepMin + i * step;
      const params = { ...baseParams, [sweepVar]: val };
      try {
        const aero = computeAero(params);
        const struc = computeStructure(params, aero, mat);
        results.push({
          x: val,
          Q_BEP: aero.bep.Q, Ps_BEP: aero.bep.Ps, Pt_BEP: aero.bep.Pt,
          eta: aero.bep.eta, SPL: aero.SPL, SPL_broad: aero.SPL_broad,
          BPF: aero.BPF, Ns: aero.Ns, U2: aero.U2,
          SF: struc.SF, sigma_MPa: struc.sigma_total_MPa,
          f_n: struc.f_n_Hz, resonance: struc.resonanceMargin,
          bladeMass: struc.totalBladeMass * 1000, // g
        });
      } catch (e) { /* skip invalid */ }
    }
    return results;
  }, [D1, D2, Deye, b1, b2, beta1, beta2, Z, RPM, tBlade, matKey, sweepVar, sweepMin, sweepMax, sweepSteps]);

  const sv = SWEEP_VARS.find(v => v.key === sweepVar);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text }} className="font-sans">
      <div className="px-3 pt-3 pb-1">
        <h1 className="text-sm font-bold" style={{ fontFamily: "monospace" }}>
          <span style={{ color: C.pink }}>◆</span> Parametric Study — 성능 · 소음 · 구조
        </h1>
        <p style={{ color: C.dim, fontFamily: "monospace", fontSize: 9 }}>설계변수 sweep → 유체/소음/구조 동시 평가</p>
      </div>

      <div className="px-3 pb-2">
        {/* Material selector */}
        <div className="rounded-lg p-2 mb-2" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div style={{ color: C.dim, fontFamily: "monospace", fontSize: 9, marginBottom: 3 }}>MATERIAL</div>
          <div className="flex gap-1 flex-wrap">
            {Object.entries(MATERIALS).map(([k, m]) =>
              <button key={k} onClick={() => setMatKey(k)} className="px-2 py-0.5 rounded text-xs"
                style={{ fontFamily: "monospace", fontSize: 8,
                  background: matKey === k ? C.card : "transparent",
                  color: matKey === k ? m.color : C.dim,
                  border: `1px solid ${matKey === k ? m.color : C.border}` }}>{m.name}</button>
            )}
          </div>
          <div className="mt-1 grid grid-cols-3 gap-1" style={{ fontFamily: "monospace", fontSize: 8, color: C.muted }}>
            <span>E = {(mat.E / 1e9).toFixed(0)} GPa</span>
            <span>ρ = {mat.rho} kg/m³</span>
            <span>σ_y = {(mat.sigma_y / 1e6).toFixed(0)} MPa</span>
          </div>
        </div>

        {/* Base design parameters */}
        <div className="rounded-lg p-2 mb-2" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div style={{ color: C.dim, fontFamily: "monospace", fontSize: 9, marginBottom: 2 }}>BASE DESIGN (기준 설계)</div>
          <div className="grid grid-cols-2 gap-x-3">
            <div>
              <S label="D₁" value={D1} min={50} max={200} step={1} onChange={setD1} unit="mm" color={C.cyan} />
              <S label="D₂" value={D2} min={80} max={300} step={1} onChange={setD2} unit="mm" color={C.blue} />
              <S label="b₁" value={b1} min={15} max={120} step={1} onChange={setB1} unit="mm" />
              <S label="b₂" value={b2} min={15} max={100} step={1} onChange={setB2} unit="mm" color={C.orange} />
            </div>
            <div>
              <S label="β₁" value={beta1} min={0} max={90} step={1} onChange={setBeta1} unit="°" color={C.green} />
              <S label="β₂" value={beta2} min={90} max={180} step={1} onChange={setBeta2} unit="°" color={C.red} />
              <S label="Z" value={Z} min={16} max={48} step={1} onChange={setZ} unit="" color={C.purple} />
              <S label="RPM" value={RPM} min={400} max={3000} step={10} onChange={setRPM} unit="" color={C.green} />
              <S label="t" value={tBlade} min={0.3} max={3} step={0.1} onChange={setTBlade} unit="mm" color={C.blue} />
            </div>
          </div>

          {/* Base case results */}
          <div className="mt-2 pt-2 grid grid-cols-4 gap-1" style={{ borderTop: `1px solid ${C.border}` }}>
            {[
              { l: "Q_BEP", v: baseResult.aero.bep.Q.toFixed(1), u: "m³/min", c: C.amber },
              { l: "Ps", v: baseResult.aero.bep.Ps.toFixed(0), u: "Pa", c: C.cyan },
              { l: "η", v: (baseResult.aero.bep.eta * 100).toFixed(1), u: "%", c: C.green },
              { l: "SPL", v: baseResult.aero.SPL.toFixed(1), u: "dB", c: baseResult.aero.SPL > 70 ? C.red : C.purple },
              { l: "σ_max", v: baseResult.struc.sigma_total_MPa.toFixed(1), u: "MPa", c: C.orange },
              { l: "SF", v: baseResult.struc.SF.toFixed(1), u: "", c: baseResult.struc.SF_ok ? C.green : C.red },
              { l: "f_n", v: baseResult.struc.f_n_Hz.toFixed(0), u: "Hz", c: baseResult.struc.resonance_ok ? C.cyan : C.red },
              { l: "BPF", v: baseResult.aero.BPF.toFixed(0), u: "Hz", c: C.purple },
            ].map(m => <div key={m.l} className="text-center py-1 rounded" style={{ background: C.bg }}>
              <div style={{ color: C.dim, fontFamily: "monospace", fontSize: 7 }}>{m.l}</div>
              <div className="font-bold" style={{ color: m.c, fontFamily: "monospace", fontSize: 11 }}>{m.v}<span style={{ fontSize: 7, color: C.dim }}>{m.u}</span></div>
            </div>)}
          </div>
          <div className="mt-1 p-1 rounded" style={{ background: C.bg, fontFamily: "monospace", fontSize: 7, color: C.muted }}>
            σ_c={baseResult.struc.sigma_c_MPa.toFixed(1)}(원심) + σ_b={baseResult.struc.sigma_b_MPa.toFixed(1)}(굽힘) = {baseResult.struc.sigma_total_MPa.toFixed(1)}MPa |
            {" "}f_n/BPF={(baseResult.struc.f_n_Hz/baseResult.aero.BPF).toFixed(2)} {baseResult.struc.resonance_ok ? "✓ 공진 회피" : "⚠ 공진 위험"} |
            {" "}블레이드 질량: {(baseResult.struc.totalBladeMass*1000).toFixed(1)}g
          </div>
        </div>

        {/* Sweep configuration */}
        <div className="rounded-lg p-2 mb-2" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div style={{ color: C.pink, fontFamily: "monospace", fontSize: 9, marginBottom: 3 }}>SWEEP 설정</div>
          <div className="flex gap-1 flex-wrap mb-2">
            {SWEEP_VARS.map(v =>
              <button key={v.key} onClick={() => { setSweepVar(v.key); setSweepMin(v.min); setSweepMax(v.max); }}
                className="px-2 py-0.5 rounded text-xs"
                style={{ fontFamily: "monospace", fontSize: 8,
                  background: sweepVar === v.key ? C.card : "transparent",
                  color: sweepVar === v.key ? C.pink : C.dim,
                  border: `1px solid ${sweepVar === v.key ? C.pink : C.border}` }}>{v.label}</button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <S label="Min" value={sweepMin} min={sv?.min||0} max={sv?.max||999} step={sv?.step||1} onChange={setSweepMin} unit={sv?.unit||''} color={C.pink} />
            <S label="Max" value={sweepMax} min={sv?.min||0} max={sv?.max||999} step={sv?.step||1} onChange={setSweepMax} unit={sv?.unit||''} color={C.pink} />
            <S label="Steps" value={sweepSteps} min={3} max={30} step={1} onChange={setSweepSteps} unit="" color={C.dim} />
          </div>
          <div style={{ color: C.dim, fontFamily: "monospace", fontSize: 8, marginTop: 2 }}>
            {sv?.label}: {sweepMin} → {sweepMax} ({sweepSteps+1}개 케이스)
          </div>
        </div>

        {/* Sweep results charts */}
        {sweepResults.length > 0 && (
          <div className="rounded-lg p-2 mb-2" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div style={{ color: C.pink, fontFamily: "monospace", fontSize: 9, marginBottom: 4 }}>SWEEP RESULTS — {sv?.label}</div>
            <div className="grid grid-cols-2 gap-1">
              <MiniChart data={sweepResults} xKey="x" yKey="eta" color={C.green} label="η (효율)" />
              <MiniChart data={sweepResults} xKey="x" yKey="Ps_BEP" color={C.cyan} label="Ps_BEP [Pa]" yUnit="Pa" />
              <MiniChart data={sweepResults} xKey="x" yKey="SPL" color={C.purple} label="SPL [dB]" yUnit="dB" />
              <MiniChart data={sweepResults} xKey="x" yKey="SF" color={C.orange} label="안전율 SF" />
              <MiniChart data={sweepResults} xKey="x" yKey="f_n" color={C.cyan} label="고유진동수 f_n [Hz]" yUnit="Hz" />
              <MiniChart data={sweepResults} xKey="x" yKey="Q_BEP" color={C.amber} label="Q_BEP [m³/min]" />
            </div>
          </div>
        )}

        {/* Results table */}
        {sweepResults.length > 0 && (
          <div className="rounded-lg p-2" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div style={{ color: C.pink, fontFamily: "monospace", fontSize: 9, marginBottom: 4 }}>DATA TABLE</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ fontFamily: "monospace", fontSize: 8, borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {[sv?.label||'X', 'Q', 'Ps', 'η%', 'SPL', 'σ', 'SF', 'f_n', 'f_n/BPF'].map(h =>
                      <th key={h} className="px-1 py-1 text-right" style={{ color: C.dim }}>{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {sweepResults.map((r, i) => {
                    const fnBpf = r.BPF > 0 ? r.f_n / r.BPF : 0;
                    const isBest = r.eta === Math.max(...sweepResults.map(d => d.eta));
                    return <tr key={i} style={{ borderBottom: `1px solid ${C.border}22`, background: isBest ? `${C.green}11` : "transparent" }}>
                      <td className="px-1 py-0.5 text-right" style={{ color: C.pink }}>{r.x.toFixed(sv?.step < 1 ? 1 : 0)}</td>
                      <td className="px-1 py-0.5 text-right" style={{ color: C.amber }}>{r.Q_BEP.toFixed(1)}</td>
                      <td className="px-1 py-0.5 text-right" style={{ color: C.cyan }}>{r.Ps_BEP.toFixed(0)}</td>
                      <td className="px-1 py-0.5 text-right" style={{ color: C.green }}>{(r.eta * 100).toFixed(1)}</td>
                      <td className="px-1 py-0.5 text-right" style={{ color: r.SPL > 70 ? C.red : C.purple }}>{r.SPL.toFixed(1)}</td>
                      <td className="px-1 py-0.5 text-right" style={{ color: C.orange }}>{r.sigma_MPa.toFixed(1)}</td>
                      <td className="px-1 py-0.5 text-right" style={{ color: r.SF > 2 ? C.green : C.red }}>{r.SF.toFixed(1)}</td>
                      <td className="px-1 py-0.5 text-right" style={{ color: C.cyan }}>{r.f_n.toFixed(0)}</td>
                      <td className="px-1 py-0.5 text-right" style={{ color: Math.abs(fnBpf - 1) < 0.15 ? C.red : C.dim }}>{fnBpf.toFixed(2)}</td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-1" style={{ fontFamily: "monospace", fontSize: 7, color: C.dim }}>
              <span style={{ color: C.green }}>■</span> 최고 효율 케이스 |
              <span style={{ color: C.red }}> ■</span> 안전율 {"<"} 2 또는 공진 위험 (f_n/BPF ≈ 1.0) |
              재질: {mat.name}
            </div>
          </div>
        )}
      </div>
      <div className="text-center pb-3" style={{ color: C.border, fontFamily: "monospace", fontSize: 9 }}>Parametric Study v1.0 — Performance · Noise · Structure</div>
    </div>
  );
}
