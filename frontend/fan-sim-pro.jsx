import { useState, useMemo, useRef } from "react";

// ─── Theme ───
const C = {
  bg: "#0B1120", card: "#131C31", border: "#1E2D4A",
  text: "#E2E8F0", muted: "#64748B", dim: "#475569",
  blue: "#60A5FA", green: "#34D399", red: "#F87171",
  amber: "#FBBF24", purple: "#A78BFA", cyan: "#22D3EE",
  orange: "#FB923C", pink: "#F472B6",
  blade: "#3B82F6", bladeFill: "rgba(59,130,246,0.12)",
  shroud: "#94A3B8", hub: "#64748B",
  scroll: "#FBBF24", scrollFill: "rgba(251,191,36,0.06)",
};

// ─── Slider ───
function S({ label, value, min, max, step, onChange, color = C.muted, unit = "" }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex items-center gap-1.5 py-0.5">
      <span className="text-xs font-bold w-8 text-right shrink-0" style={{ color, fontFamily: "monospace" }}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, ${color} ${pct}%, ${C.border} ${pct}%)` }} />
      <span className="text-xs w-14 text-right shrink-0" style={{ color: C.text, fontFamily: "monospace" }}>{value}{unit}</span>
    </div>
  );
}

function Stat({ label, value, unit = "", color = C.text, sub }) {
  return (
    <div className="text-center px-1 py-0.5">
      <div style={{ color: C.dim, fontFamily: "monospace", fontSize: 9 }}>{label}</div>
      <div className="font-bold" style={{ color, fontFamily: "monospace", fontSize: 12 }}>{value}<span style={{ color: C.dim, fontSize: 9 }}> {unit}</span></div>
      {sub && <div style={{ color: sub.startsWith("⚠") ? C.amber : C.green, fontFamily: "monospace", fontSize: 8 }}>{sub}</div>}
    </div>
  );
}

function Tab({ active, onClick, children, color }) {
  return (
    <button onClick={onClick} className="px-2 py-1 text-xs font-semibold rounded-t whitespace-nowrap"
      style={{ fontFamily: "monospace", color: active ? color || C.text : C.dim,
        background: active ? C.card : "transparent",
        borderBottom: active ? `2px solid ${color || C.blue}` : "2px solid transparent" }}>
      {children}
    </button>
  );
}

// ─── SVG Chart ───
function Chart({ data, xKey, lines, w = 320, h = 150, xLabel = "", yLabel = "", yRange, markers = [] }) {
  if (!data || data.length < 2) return null;
  const pad = { t: 10, r: 10, b: 26, l: 40 };
  const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
  const xs = data.map(d => d[xKey]);
  const allY = lines.flatMap(l => data.map(d => d[l.key]).filter(v => isFinite(v)));
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = yRange ? yRange[0] : Math.min(0, Math.min(...allY));
  const yMax = yRange ? yRange[1] : Math.max(...allY) * 1.1 || 1;
  const sx = v => pad.l + ((v - xMin) / (xMax - xMin || 1)) * cw;
  const sy = v => pad.t + ch - ((v - yMin) / (yMax - yMin || 1)) * ch;
  return (
    <svg width={w} height={h}>
      {[0, 1, 2, 3, 4].map(i => {
        const val = yMin + (yMax - yMin) * i / 4;
        return <g key={i}><line x1={pad.l} y1={sy(val)} x2={w - pad.r} y2={sy(val)} stroke={C.border} strokeWidth={0.5} />
          <text x={pad.l - 3} y={sy(val) + 3} fill={C.dim} fontSize={7} textAnchor="end" fontFamily="monospace">{val < 10 ? val.toFixed(2) : val.toFixed(0)}</text></g>;
      })}
      {lines.map(l => <polyline key={l.key} points={data.map(d => `${sx(d[xKey])},${sy(d[l.key])}`).join(" ")}
        fill="none" stroke={l.color} strokeWidth={l.w || 1.5} strokeDasharray={l.dash || "none"} />)}
      {markers.map((m, i) => <g key={i}><line x1={sx(m.x)} y1={pad.t} x2={sx(m.x)} y2={pad.t + ch} stroke={m.color || C.amber} strokeWidth={1} strokeDasharray="4,3" opacity={0.6} />
        <circle cx={sx(m.x)} cy={sy(m.y)} r={3} fill={m.color || C.amber} />
        {m.label && <text x={sx(m.x) + 4} y={sy(m.y) - 5} fill={m.color || C.amber} fontSize={7} fontFamily="monospace">{m.label}</text>}</g>)}
      <text x={pad.l + cw / 2} y={h - 3} fill={C.dim} fontSize={8} textAnchor="middle" fontFamily="monospace">{xLabel}</text>
      <text x={3} y={pad.t + ch / 2} fill={C.dim} fontSize={8} textAnchor="middle" fontFamily="monospace" transform={`rotate(-90,3,${pad.t + ch / 2})`}>{yLabel}</text>
    </svg>
  );
}

// ─── Arrow for velocity triangle ───
function Arrow({ x1, y1, x2, y2, color, label, dashed, lside = "left", sw = 2.2 }) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy);
  if (len < 2) return null;
  const a = Math.atan2(dy, dx), hl = Math.min(8, len * 0.18);
  const lx = x2 - hl * Math.cos(a - 0.4), ly = y2 - hl * Math.sin(a - 0.4);
  const rx = x2 - hl * Math.cos(a + 0.4), ry = y2 - hl * Math.sin(a + 0.4);
  const nx = -dy / len, ny = dx / len, s = lside === "right" ? -1 : 1;
  const mx = (x1 + x2) / 2 + nx * 12 * s, my = (y1 + y2) / 2 + ny * 12 * s;
  return <g>
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={sw} strokeDasharray={dashed ? "6,4" : "none"} opacity={dashed ? 0.6 : 1} strokeLinecap="round" />
    <polygon points={`${x2},${y2} ${lx},${ly} ${rx},${ry}`} fill={color} opacity={dashed ? 0.5 : 0.85} />
    {label && <text x={mx} y={my} fill={color} fontSize={11} fontWeight="700" textAnchor="middle" dominantBaseline="central" fontFamily="monospace">{label}</text>}
  </g>;
}

// ═══ PHYSICS ENGINE (All physics-based, no arbitrary coefficients) ═══

// Blade path length from geometry (numerical arc length)
function calcBladeLength(D1, D2, beta1, beta2) {
  const r1 = D1 / 2000, r2 = D2 / 2000;
  const b1R = beta1 * Math.PI / 180, b2R = beta2 * Math.PI / 180;
  const n = 30;
  let Lb = 0, prevX = r1, prevY = 0, theta = 0;
  for (let i = 1; i <= n; i++) {
    const t = i / n, tP = (i - 1) / n;
    const r = r1 + t * (r2 - r1), rP = r1 + tP * (r2 - r1);
    const rM = (r + rP) / 2, tM = (t + tP) / 2;
    const bM = b1R + tM * (b2R - b1R);
    if (Math.abs(Math.tan(bM)) > 0.001) theta += (-1 / (rM * Math.tan(bM))) * (r - rP);
    const x = r * Math.cos(theta), y = r * Math.sin(theta);
    Lb += Math.sqrt((x - prevX) ** 2 + (y - prevY) ** 2);
    prevX = x; prevY = y;
  }
  return Lb;
}

function compute(p) {
  const { D1, D2, Deye: Deye_raw, b1, b2, beta1, beta2, Z, RPM, T_in,
          etaScroll = 0.5, tGap = 8, diffuserAR = 1.0, etaDiffuser = 0.7, scrollOn = true,
          Rtongue = 5, wrapAngle = 360, tAngle = 30,
          crossSection = 'rect', bScroll = 55, scrollMethod = 'cv',
          tBlade = 0.001, sealLen = 0.005, diskGap = 0.005,
          roughness = 0.00005, cSound = 343, airProps } = p;

  const Deye = Deye_raw || D1;
  // Use pre-computed humid air properties (or fallback)
  const rho = airProps ? airProps.rho : 1.225 * 293.15 / (T_in + 273.15);
  const mu = airProps ? airProps.mu : 1.81e-5;
  const omega = 2 * Math.PI * RPM / 60;
  const r_eye = Deye / 2000;
  const r1 = D1 / 2000, r2 = D2 / 2000, b1m = b1 / 1000, b2m = b2 / 1000;
  const tBladeM = (typeof tBlade === 'number' && tBlade > 0.1) ? tBlade / 1000 : tBlade; // handle mm or m
  const sealLenM = (typeof sealLen === 'number' && sealLen > 0.1) ? sealLen / 1000 : sealLen;
  const diskGapM = (typeof diskGap === 'number' && diskGap > 0.1) ? diskGap / 1000 : diskGap;
  const beta1R = beta1 * Math.PI / 180;
  const beta2R = beta2 * Math.PI / 180;
  const U1 = omega * r1, U2 = omega * r2;
  const sigma = 1 - (Math.PI * Math.sin(beta2R)) / Z;
  const nPts = 60;
  const QmaxM3s = Math.PI * (D2 / 1000) * b2m * U2 * 1.2;
  const deltaR2 = tGap / (D2 / 2);
  const wrapFrac = wrapAngle / 360;
  const wrapRad = wrapAngle * Math.PI / 180;
  const bScrollM = bScroll / 1000;

  // [1] Blade path length from actual geometry
  const Lb = calcBladeLength(D1, D2, beta1, beta2);

  // [2] k_inc from blade geometry (cascade shock model)
  const pitch1 = Math.PI * (D1 / 1000) / Z;
  const k_inc = 1 - (tBladeM / pitch1) ** 2;

  // Passage hydraulics
  const pitch2 = Math.PI * (D2 / 1000) / Z;
  const Dh = 2 * pitch2 * b2m / (pitch2 + b2m);

  // Design point from beta1
  const Cr1_design = U1 * Math.tan(beta1R);
  const Q_design = Cr1_design * Math.PI * (D1 / 1000) * b1m;

  // BPF frequency
  const BPF = Z * RPM / 60;

  // Scroll geometry
  const r_scroll_mean = r2 + tGap / 1000 / 2;
  const L_scroll = wrapRad * r_scroll_mean;

  // Leakage seal at EYE (not blade inlet)
  const gapM = tGap / 1000;
  const LgapRatio = sealLenM / Math.max(0.0005, gapM);
  const Cd_leak = LgapRatio < 2 ? 0.65 : 0.65 * Math.pow(2 / LgapRatio, 0.3);

  // Vaneless space: r_eye → r1
  const hasVaneless = r1 > r_eye + 0.001;
  const vanelessDr = Math.max(0, r1 - r_eye);

  const pq = [];
  for (let i = 0; i <= nPts; i++) {
    const Qm3s = (i / nPts) * QmaxM3s, Q = Qm3s * 60;
    const Cr_eye = Qm3s / (Math.PI * (Deye / 1000) * b1m);
    const Cr1 = Qm3s / (Math.PI * (D1 / 1000) * b1m);
    const Cr2 = Qm3s / (Math.PI * (D2 / 1000) * b2m);
    const Ct2 = sigma * U2 - Cr2 / Math.tan(beta2R);
    const C2 = Math.sqrt(Cr2 ** 2 + Ct2 ** 2);
    const W1 = Math.sqrt(Cr1 ** 2 + U1 ** 2);
    const W2 = Math.sqrt(Cr2 ** 2 + (Ct2 - U2) ** 2);
    const Pt_e = rho * U2 * Ct2;

    // === LOSSES ===

    // Vaneless space loss (eye → blade inlet)
    let dP_vaneless = 0;
    if (hasVaneless && vanelessDr > 0) {
      const C_avg_vl = (Cr_eye + Cr1) / 2;
      const Dh_vl = 2 * b1m; // parallel plates → Dh = 2×gap
      const Re_vl = rho * C_avg_vl * Dh_vl / mu;
      const f_vl = Re_vl > 2300
        ? 1 / Math.pow(-1.8 * Math.log10(6.9 / Re_vl + (roughness / Dh_vl / 3.7) ** 1.11), 2)
        : (Re_vl > 0 ? 64 / Re_vl : 0.02);
      dP_vaneless = f_vl * (vanelessDr / Dh_vl) * 0.5 * rho * C_avg_vl ** 2 * 2; // ×2 both walls
    }

    // [1] Incidence (at blade inlet D1)
    const flowAngle1 = Math.atan2(Cr1, U1);
    const incAngle = flowAngle1 - beta1R;
    const dPinc = k_inc * 0.5 * rho * (W1 * Math.sin(incAngle)) ** 2;

    // [2] Friction — Colebrook-White with roughness
    const Wa = (W1 + W2) / 2;
    const Re_p = rho * Wa * Dh / mu;
    const eD = roughness / Dh;
    const f_turb = Re_p > 2300
      ? 1 / Math.pow(-1.8 * Math.log10(6.9 / Re_p + (eD / 3.7) ** 1.11), 2)
      : (Re_p > 0 ? 64 / Re_p : 0.02);
    const dPfric = f_turb * (Lb / Dh) * 0.5 * rho * Wa ** 2;

    // [3] Recirculation — Oh(1997) diffusion ratio
    const DR = W1 > 0 ? 1 - W2 / W1 + Math.abs(Ct2) / (2 * Z * W1 / Math.PI) : 0;
    const DR_crit = 0.5;
    const dPrec_dr = DR > DR_crit ? 0.0085 * (DR - DR_crit) ** 2 * rho * U2 ** 2 : 0;
    const Qr = Q_design > 0 ? Qm3s / Q_design : 1;
    const dPrec_ex = Qr < 0.5 ? 0.005 * rho * U2 ** 2 * (1 - 2 * Qr) ** 2 : 0;
    const dPrec = dPrec_dr + dPrec_ex;

    // Disk friction — Daily & Nece with gap ratio
    const sR = diskGapM / Math.max(0.001, r2);
    const ReDisk = rho * omega * r2 ** 2 / mu;
    const Cm_disk = ReDisk > 0
      ? (sR < 0.05 ? 0.0622 / Math.pow(ReDisk, 0.2) : 3.7 * sR ** 0.1 / Math.pow(ReDisk, 0.5))
      : 0.005;
    const Pdf = 0.5 * Cm_disk * rho * omega ** 3 * r2 ** 5;
    const dPdisk = Qm3s > 1e-6 ? Pdf / Qm3s : Pdf / 1e-6;

    // [4] Leakage at EYE
    const Ag = Math.PI * (Deye / 1000) * gapM;
    const dPav = Math.max(0, Pt_e - dPfric);
    const Qleak = Cd_leak * Ag * Math.sqrt(2 * Math.max(0, dPav) / rho);
    const leakFrac = Qm3s > 1e-6 ? Qleak / Qm3s : 0;
    const dPleak = leakFrac * Pt_e;

    const dPtotImp = dP_vaneless + dPinc + dPfric + dPrec + Math.min(dPdisk, Pt_e * 0.5) + dPleak;
    const Pt_imp = Math.max(0, Pt_e - dPtotImp);
    const Pdyn_imp = 0.5 * rho * C2 ** 2;
    const Ps_imp = Pt_imp - Pdyn_imp;

    // === SCROLL (friction integral) ===
    const scrollCapture = scrollOn ? wrapFrac : 0;
    const Pdyn_captured = Pdyn_imp * scrollCapture;
    const Pdyn_uncaptured = Pdyn_imp * (1 - scrollCapture);

    let dPs_scroll = 0, dP_scroll_fric = 0, eta_scroll_calc = 0;
    if (scrollOn && Pdyn_captured > 0) {
      // [5] Scroll hydraulic friction integral
      const A_sc_exit = Qm3s > 0 ? Qm3s / Math.max(1, C2 * 0.5) : bScrollM * 0.02;
      const D_h_sc = crossSection === 'circular'
        ? Math.sqrt(4 * A_sc_exit / Math.PI)
        : 2 * A_sc_exit / (Math.sqrt(A_sc_exit / bScrollM) + bScrollM);
      const C_sc_avg = Qm3s > 0 ? Qm3s / Math.max(0.0001, A_sc_exit) * 0.7 : C2 * 0.5;
      const Re_sc = rho * Math.abs(C_sc_avg) * Math.max(0.005, D_h_sc) / mu;
      const f_sc = Re_sc > 2300 ? 0.316 / Math.pow(Re_sc, 0.25) : (Re_sc > 0 ? 64 / Re_sc : 0.02);
      dP_scroll_fric = f_sc * (L_scroll / Math.max(0.005, D_h_sc)) * 0.5 * rho * C_sc_avg ** 2;
      const mixFactor = scrollMethod === 'fv' ? 0.03 : 0.06;
      const dP_sc_mix = mixFactor * Pdyn_captured;
      const scLossTotal = dP_scroll_fric + dP_sc_mix;
      dPs_scroll = Math.max(0, Pdyn_captured - scLossTotal);
      eta_scroll_calc = Pdyn_captured > 0 ? dPs_scroll / Pdyn_captured : 0;
    }

    // [6] Tongue — orifice model
    const dP_across_tongue = scrollOn ? Math.max(0, dPs_scroll * 0.3) : 0;
    const A_tongue_gap = 2 * Math.PI * r2 * gapM * 0.1;
    const Cd_tongue = 0.5 + 0.1 * Math.min(1, Rtongue / 5);
    const Q_t_recirc = scrollOn ? Cd_tongue * A_tongue_gap * Math.sqrt(2 * Math.max(0.1, dP_across_tongue) / rho) : 0;
    const dP_tongue = Qm3s > 1e-6 ? dP_across_tongue * (Q_t_recirc / Qm3s) : 0;

    // [7] Wrap — Borda-Carnot
    const V_unc = C2 * Math.sqrt(Math.max(0, 1 - scrollCapture));
    const V_down = Qm3s > 0 ? Qm3s / Math.max(0.001, bScrollM * 0.05) * 0.1 : 0;
    const dP_uncaptured = 0.5 * rho * (Math.max(0, V_unc - V_down)) ** 2 * (1 - scrollCapture);

    const Pdyn_scroll_exit = Math.max(0, Pdyn_captured - dPs_scroll);

    // Diffuser
    const CpIdeal = diffuserAR > 1 ? 1 - 1 / (diffuserAR ** 2) : 0;
    const dPs_diff = scrollOn ? etaDiffuser * CpIdeal * Pdyn_scroll_exit : 0;
    const Pdyn_fan_exit = Math.max(0, Pdyn_scroll_exit - dPs_diff + Pdyn_uncaptured * 0.15);

    // Fan total
    const Ps_fan = Ps_imp + dPs_scroll - dP_scroll_fric - dP_tongue - dP_uncaptured + dPs_diff;
    const Pt_fan = Ps_fan + Pdyn_fan_exit;

    // [9] Radial Force — Stepanoff(1957) + Lorett correction
    const Q_ratio = Q_design > 0 ? Qm3s / Q_design : 1;
    const Kr = 0.36 * Math.abs(1 - Q_ratio ** 2);
    const theta_factor = 1 + 0.15 * Math.abs(Math.sin(tAngle * Math.PI / 180));
    const Fr = scrollOn ? Kr * theta_factor * rho * U2 ** 2 * (D2 / 1000) * b2m : 0;

    // Efficiencies
    const Pshaft = Qm3s > 1e-6 ? Pt_e * Qm3s + Pdf : Pdf;
    const eta_imp_t = Pshaft > 0 ? Math.max(0, Pt_imp * Qm3s) / Pshaft : 0;
    const eta_imp_s = Pshaft > 0 ? Math.max(0, Ps_imp * Qm3s) / Pshaft : 0;
    const eta_fan_t = Pshaft > 0 ? Math.max(0, Pt_fan * Qm3s) / Pshaft : 0;
    const eta_fan_s = Pshaft > 0 ? Math.max(0, Ps_fan * Qm3s) / Pshaft : 0;

    const deH = W1 > 0 ? W2 / W1 : 1;
    const reaction = U2 > 0 ? 1 - Ct2 / (2 * U2) : 0.5;

    pq.push({
      Q, Qm3s,
      Pt_e, Pt_imp, Ps_imp: Math.max(-100, Ps_imp), Pdyn_imp,
      dP_vaneless, dPinc, dPfric, dPrec, dPdisk: Math.min(dPdisk, Pt_e * 0.5), dPleak,
      eta_imp_t: Math.max(0, Math.min(1, eta_imp_t)),
      eta_imp_s: Math.max(0, Math.min(1, eta_imp_s)),
      dPs_scroll, dP_scroll_loss: dP_scroll_fric, dP_tongue, dPs_diff, dP_uncaptured,
      Pdyn_scroll_exit, Pdyn_fan_exit,
      Pt_fan: Math.max(0, Pt_fan), Ps_fan: Math.max(-100, Ps_fan),
      eta_fan_t: Math.max(0, Math.min(1, eta_fan_t)),
      eta_fan_s: Math.max(0, Math.min(1, eta_fan_s)),
      Pt: Math.max(0, Pt_fan), Ps: Math.max(-100, Ps_fan), Pdyn: Pdyn_imp,
      eta_t: Math.max(0, Math.min(1, eta_fan_t)),
      eta_s: Math.max(0, Math.min(1, eta_fan_s)),
      deH: Math.max(0, Math.min(3, deH)), reaction, W1, W2, C2, Cr1, Cr2, Ct2,
      C2U2: C2 / (U2 || 1), W2W1: W1 > 0 ? W2 / W1 : 1,
      incidenceAngle: incAngle * 180 / Math.PI,
      Fr, Q_ratio, DR, eta_scroll_calc,
    });
  }

  // BEP
  const bI = pq.reduce((b, d, i) => d.eta_fan_s > (pq[b]?.eta_fan_s || 0) ? i : b, 0);
  const bep = pq[bI] || pq[30];

  // [8] BPF SPL — Neise(1992)
  const Ns = bep.Qm3s > 0 ? RPM * Math.sqrt(bep.Qm3s) / Math.pow(Math.max(1, bep.Pt_fan) / rho, 0.75) : 0;
  const Ds_val = bep.Qm3s > 0 ? (D2 / 1000) * Math.pow(Math.max(1, bep.Pt_fan) / rho, 0.25) / Math.sqrt(bep.Qm3s) : 0;
  const Lw_broad = bep.Qm3s > 0 && bep.Pt_fan > 0
    ? 10 * Math.log10(bep.Pt_fan ** 2 * bep.Qm3s / (rho * cSound ** 3)) + 56 : 30;
  const bpf_gap_corr = -20 * Math.log10(Math.max(0.03, deltaR2) / 0.10);
  const bpf_tongue_corr = -5 * Math.log10(1 + Rtongue / Math.max(1, tGap));
  const bpfSPL = Lw_broad + bpf_gap_corr + bpf_tongue_corr;

  return {
    pq, bep, bI, sigma, rho, U1, U2, Ns, Ds: Ds_val, omega,
    bpfSPL, BPF, Q_design_beta: Q_design * 60, Lb,
    k_inc, Cd_leak, DR_bep: bep.DR,
  };
}

// ═══ BLADE GEOMETRY ═══

// Helper: convert Cartesian points to polar {r, theta} relative to first point's angle
function cartToPolarRel(xyPts) {
  if (!xyPts.length) return [];
  const theta0 = Math.atan2(xyPts[0].y, xyPts[0].x);
  return xyPts.map(p => {
    const r = Math.sqrt(p.x ** 2 + p.y ** 2);
    let theta = Math.atan2(p.y, p.x) - theta0;
    return { r, theta };
  });
}

// Helper: blade tangent direction at a point on circle of radius r at polar angle alpha
// Returns unit vector {tx, ty} pointing outward along blade
function bladeTangent(alpha, betaRad) {
  const er_x = Math.cos(alpha), er_y = Math.sin(alpha);     // radial outward
  const et_x = -Math.sin(alpha), et_y = Math.cos(alpha);    // circumferential CCW
  // Blade tangent = sin(beta)*e_r + cos(beta)*(-e_theta)
  // (from -e_theta direction, rotate by beta toward e_r)
  const tx = Math.sin(betaRad) * er_x - Math.cos(betaRad) * et_x;
  const ty = Math.sin(betaRad) * er_y - Math.cos(betaRad) * et_y;
  return { tx, ty };
}

// Type 1: Linear beta interpolation (numerical dθ/dr integration)
function bladeLinear(D1, D2, beta1, beta2) {
  const r1 = D1 / 2, r2 = D2 / 2;
  const b1R = beta1 * Math.PI / 180, b2R = beta2 * Math.PI / 180;
  const n = 40;
  let theta = 0;
  const pts = [{ r: r1, theta: 0 }];
  for (let i = 1; i <= n; i++) {
    const t = i / n, tP = (i - 1) / n;
    const r = r1 + t * (r2 - r1), rP = r1 + tP * (r2 - r1);
    const rM = (r + rP) / 2, tM = (t + tP) / 2;
    const bM = b1R + tM * (b2R - b1R);
    if (Math.abs(Math.tan(bM)) > 0.001) theta += (-1 / (rM * Math.tan(bM))) * (r - rP);
    pts.push({ r, theta });
  }
  return pts;
}

// Type 2: Single circular arc
// Arc from P1(r1,0) to P2(r2,?) matching tangent beta1 at inlet, beta2 at outlet
function bladeArc(D1, D2, beta1, beta2) {
  const r1 = D1 / 2, r2 = D2 / 2;
  const b1R = beta1 * Math.PI / 180, b2R = beta2 * Math.PI / 180;
  // P1 = (r1, 0), tangent at P1: t1
  const { tx: t1x, ty: t1y } = bladeTangent(0, b1R);
  // Normal perpendicular to t1, pointing toward arc center (CCW side for forward-curved)
  const n1x = -t1y, n1y = t1x;

  // Arc center: C = P1 + R*n1 = (r1 + R*n1x, R*n1y)
  // Find R by bisection: at the intersection of arc circle and r2 circle,
  // the blade tangent must make angle beta2 with radial.
  let Rlo = 1, Rhi = r2 * 10, Rbest = r2;
  for (let iter = 0; iter < 60; iter++) {
    const R = (Rlo + Rhi) / 2;
    const Cx = r1 + R * n1x, Cy = R * n1y;
    // Intersection of |P-C|=R and |P|=r2
    // (x-Cx)^2 + (y-Cy)^2 = R^2 and x^2+y^2 = r2^2
    // Expanding: r2^2 - 2*Cx*x - 2*Cy*y + Cx^2+Cy^2 = R^2
    // 2*Cx*x + 2*Cy*y = r2^2 + Cx^2 + Cy^2 - R^2
    const D_val = (r2 ** 2 + Cx ** 2 + Cy ** 2 - R ** 2) / 2;
    // Cx*x + Cy*y = D_val → parametric on r2 circle: x=r2*cos(a), y=r2*sin(a)
    // Cx*r2*cos(a) + Cy*r2*sin(a) = D_val
    // r2*(Cx*cos(a)+Cy*sin(a)) = D_val
    // Cx*cos(a)+Cy*sin(a) = D_val/r2
    const amp = Math.sqrt(Cx ** 2 + Cy ** 2);
    const rhs = D_val / r2;
    if (amp < 1e-10 || Math.abs(rhs / amp) > 1) { Rlo = R; continue; }
    const phase = Math.atan2(Cy, Cx);
    const cosA = rhs / amp;
    const a2 = phase + Math.acos(Math.max(-1, Math.min(1, cosA))); // take the solution with positive angle
    // Check beta at P2
    const p2x = r2 * Math.cos(a2), p2y = r2 * Math.sin(a2);
    // Tangent to arc at P2: perpendicular to (P2 - C), direction along blade
    const dx = p2x - Cx, dy = p2y - Cy;
    const arcTanX = -dy, arcTanY = dx; // rotate radius by 90 CCW → tangent
    // This tangent should match blade tangent at beta2
    const { tx: t2x, ty: t2y } = bladeTangent(a2, b2R);
    // Compare directions (dot product sign)
    const dot = arcTanX * t2x + arcTanY * t2y;
    // We want them aligned → dot > 0 and angle match
    // Use cross product to determine which way to adjust R
    const cross = arcTanX * t2y - arcTanY * t2x;
    if (cross > 0) Rhi = R; else Rlo = R;
    Rbest = R;
  }
  const R = Rbest;
  const Cx = r1 + R * n1x, Cy = R * n1y;
  // Generate arc points
  const angStart = Math.atan2(0 - Cy, r1 - Cx);
  // Find P2 on r2 circle
  const D_val = (r2 ** 2 + Cx ** 2 + Cy ** 2 - R ** 2) / 2;
  const amp = Math.sqrt(Cx ** 2 + Cy ** 2);
  const phase = Math.atan2(Cy, Cx);
  const cosA = Math.max(-1, Math.min(1, D_val / (r2 * amp)));
  const a2 = phase + Math.acos(cosA);
  const p2x = r2 * Math.cos(a2), p2y = r2 * Math.sin(a2);
  const angEnd = Math.atan2(p2y - Cy, p2x - Cx);

  const n = 40;
  const xyPts = [];
  // Determine arc sweep direction
  let sweep = angEnd - angStart;
  if (sweep > Math.PI) sweep -= 2 * Math.PI;
  if (sweep < -Math.PI) sweep += 2 * Math.PI;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const ang = angStart + t * sweep;
    xyPts.push({ x: Cx + R * Math.cos(ang), y: Cy + R * Math.sin(ang) });
  }
  return cartToPolarRel(xyPts);
}

// Type 3: Straight-Fillet-Straight via β profile
// β₁ constant at inlet → smooth transition → β₂ constant at outlet
// Rfillet controls transition width, bendPos controls radial position of bend
function bladeSFS(D1, D2, beta1, beta2, Rfillet, bendPos) {
  const r1 = D1 / 2, r2 = D2 / 2;
  const b1R = beta1 * Math.PI / 180, b2R = beta2 * Math.PI / 180;
  const n = 50;

  // Rfillet (1~50mm) mapped to blend width (0.05~0.9 of span)
  const blendW = Math.min(0.9, Math.max(0.05, Rfillet / 50));
  // bendPos (0.2~0.8): radial position of transition as fraction of span
  // 0.2 = bend near inlet (long β₂ section), 0.8 = bend near outlet (long β₁ section)
  const tMid = Math.max(0.1, Math.min(0.9, bendPos));
  const tStart = Math.max(0.02, tMid - blendW / 2);
  const tEnd = Math.min(0.98, tMid + blendW / 2);

  // Actual bend radius in mm (for display)
  const rBend = r1 + tMid * (r2 - r1);

  let theta = 0;
  const pts = [{ r: r1, theta: 0 }];
  for (let i = 1; i <= n; i++) {
    const t = i / n, tP = (i - 1) / n;
    const r = r1 + t * (r2 - r1), rP = r1 + tP * (r2 - r1);
    const rM = (r + rP) / 2, tM_pt = (t + tP) / 2;

    // β profile: constant β₁ → smooth blend → constant β₂
    let beta;
    if (tM_pt <= tStart) {
      beta = b1R; // inlet straight
    } else if (tM_pt >= tEnd) {
      beta = b2R; // outlet straight
    } else {
      // Smooth transition (cosine blend for G1 continuity)
      const s = (tM_pt - tStart) / (tEnd - tStart);
      const blend = 0.5 * (1 - Math.cos(s * Math.PI)); // 0→1 smooth
      beta = b1R + blend * (b2R - b1R);
    }

    if (Math.abs(Math.tan(beta)) > 0.001) {
      theta += (-1 / (rM * Math.tan(beta))) * (r - rP);
    }
    pts.push({ r, theta });
  }
  return pts;
}

function bladeShape(D1, D2, beta1, beta2, Z, type, Rfillet, bendPos) {
  let pts;
  try {
    if (type === 'arc') pts = bladeArc(D1, D2, beta1, beta2);
    else if (type === 'sfs') pts = bladeSFS(D1, D2, beta1, beta2, Rfillet, bendPos);
  } catch (e) {}
  // Validate: all points must have finite r and theta
  if (!pts || pts.length < 3 || pts.some(p => !isFinite(p.r) || !isFinite(p.theta))) {
    pts = bladeLinear(D1, D2, beta1, beta2);
  }
  return pts;
}

function scrollPath(r2, gap, tongueAngleDeg, cx, cy, sc, scrollCfg) {
  const { method = 'cv', crossSection = 'rect', bScroll = 50, Qdes = 0.001, Ct2 = 10, C2 = 15, rho = 1.2, Rtongue = 3, wrapAngle = 360 } = scrollCfg || {};
  const r2m = r2 / 1000;
  const bSm = bScroll / 1000;
  const tR = tongueAngleDeg * Math.PI / 180;
  const wrapRad = wrapAngle * Math.PI / 180;
  const Cavg = method === 'cv' ? C2 * 0.55 : Ct2;

  const nPts = 120;
  const pts = [];

  for (let i = 0; i <= nPts; i++) {
    const t = i / nPts;
    const theta = t * wrapRad; // 0 to wrapAngle (not always 2π)

    let Atheta;
    if (method === 'fv') {
      Atheta = Qdes * theta / (2 * Math.PI * r2m * Math.max(1, Ct2));
    } else {
      Atheta = Qdes * theta / (2 * Math.PI * Math.max(1, Cavg));
    }

    let h;
    if (crossSection === 'circular') {
      h = Math.sqrt(4 * Atheta / Math.PI) * 1000;
    } else {
      h = (Atheta / bSm) * 1000;
    }

    const rOuter = r2 + gap + Math.max(r2 * 0.02 * (i / nPts), h); // min growth for visibility
    const angle = tR + theta;
    pts.push({
      x: cx + rOuter * Math.cos(angle) * sc,
      y: cy - rOuter * Math.sin(angle) * sc,
      rOuter, theta, Atheta, h,
    });
  }

  const tongueR = r2 + gap;
  const tx = cx + tongueR * Math.cos(tR) * sc;
  const ty = cy - tongueR * Math.sin(tR) * sc;

  // Outlet duct direction: tangent to scroll curve at end point, pointing away from center
  const endAngle = tR + wrapRad;
  // Tangent direction at end of spiral (perpendicular to radial, in scroll-growth direction)
  const lastPt = pts[nPts];
  const prevPt = pts[Math.max(0, nPts - 1)];
  // Use actual curve direction from last two points
  const tdx = lastPt.x - prevPt.x, tdy = lastPt.y - prevPt.y;
  const tlen = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
  const odx = tdx / tlen, ody = tdy / tlen;
  const dl = r2 * 0.6 * sc; // duct length in SVG pixels

  // Inner wall of outlet at scroll end angle (at impeller outer radius + gap)
  const innerEndX = cx + tongueR * Math.cos(endAngle) * sc;
  const innerEndY = cy - tongueR * Math.sin(endAngle) * sc;

  return {
    outer: pts,
    tongue: { x: tx, y: ty, R: Rtongue },
    // Outlet: two parallel lines extending from scroll end
    out1: { x: lastPt.x + dl * odx, y: lastPt.y + dl * ody },
    out2: { x: innerEndX + dl * odx, y: innerEndY + dl * ody },
    innerEnd: { x: innerEndX, y: innerEndY },
    wrapAngle,
    maxH: Math.max(...pts.map(p => p.h)),
  };
}

// ═══ MAIN ═══
export default function FanSimPro() {
  const [D1, setD1] = useState(120); // blade inner diameter
  const [Deye, setDeye] = useState(110); // shroud eye opening diameter
  const [D2, setD2] = useState(175);
  const [b1, setB1] = useState(60);
  const [b2, setB2] = useState(50);
  const [beta1, setBeta1] = useState(30);
  const [beta2, setBeta2] = useState(145);
  const [Z, setZ] = useState(36);
  const [RPM, setRPM] = useState(1400);
  const [T_in, setTin] = useState(25);
  const [tab, setTab] = useState(0);
  const [scrollOn, setScrollOn] = useState(true);
  const [tGap, setTGap] = useState(8);
  const [tAngle, setTAngle] = useState(30);
  const [showSlip, setShowSlip] = useState(true);
  const [paramsOpen, setParamsOpen] = useState(true);
  const [bladeType, setBladeType] = useState('arc');
  const [Rfillet, setRfillet] = useState(15);
  const [bendPos, setBendPos] = useState(0.5); // SFS bend radial position (0.2~0.8)
  // Scroll design parameters
  const [etaScroll, setEtaScroll] = useState(0.50);
  const [scrollMethod, setScrollMethod] = useState('cv'); // 'fv'=free vortex, 'cv'=const velocity
  const [crossSection, setCrossSection] = useState('rect'); // 'rect', 'circular', 'trapezoid'
  const [bScroll, setBScroll] = useState(55); // scroll width mm
  const [tongueShape, setTongueShape] = useState('round');
  const [Rtongue, setRtongue] = useState(5); // tongue tip radius mm
  const [wrapAngle, setWrapAngle] = useState(360); // scroll wrap angle degrees
  const [diffuserAR, setDiffuserAR] = useState(1.0);
  const [etaDiffuser, setEtaDiffuser] = useState(0.7);
  // Category 1: Humid air
  const [RH, setRH] = useState(50); // relative humidity %
  // Category 2: Design geometry details
  const [tBlade, setTBlade] = useState(1.0); // blade thickness mm
  const [sealLen, setSealLen] = useState(5); // seal axial length mm
  const [diskGap, setDiskGap] = useState(5); // disk-to-casing gap mm
  // Category 3: Physical constants (adjustable in settings)
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [P_atm, setPAtm] = useState(101325); // atmospheric pressure Pa
  const [cSound, setCSound] = useState(343); // speed of sound m/s
  const [roughness, setRoughness] = useState(0.05); // surface roughness mm
  const [saveOpen, setSaveOpen] = useState(false);
  const [saves, setSaves] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fansim_saves') || '{}'); } catch { return {}; }
  });
  const fileInputRef = useRef(null);

  // ─── Save/Load System ───
  const collectState = () => ({
    _version: '4.0', _timestamp: new Date().toISOString(),
    D1, Deye, D2, b1, b2, beta1, beta2, Z, RPM, T_in, RH,
    scrollOn, tGap, tAngle, bladeType, Rfillet, bendPos,
    scrollMethod, crossSection, bScroll, Rtongue, wrapAngle,
    diffuserAR, etaDiffuser, tBlade, sealLen, diskGap,
    P_atm, cSound, roughness,
  });

  const restoreState = (d) => {
    if (!d || typeof d !== 'object') return false;
    if (d.D1 != null) setD1(d.D1);
    if (d.Deye != null) setDeye(d.Deye);
    if (d.D2 != null) setD2(d.D2);
    if (d.b1 != null) setB1(d.b1);
    if (d.b2 != null) setB2(d.b2);
    if (d.beta1 != null) setBeta1(d.beta1);
    if (d.beta2 != null) setBeta2(d.beta2);
    if (d.Z != null) setZ(d.Z);
    if (d.RPM != null) setRPM(d.RPM);
    if (d.T_in != null) setTin(d.T_in);
    if (d.RH != null) setRH(d.RH);
    if (d.scrollOn != null) setScrollOn(d.scrollOn);
    if (d.tGap != null) setTGap(d.tGap);
    if (d.tAngle != null) setTAngle(d.tAngle);
    if (d.bladeType != null) setBladeType(d.bladeType);
    if (d.Rfillet != null) setRfillet(d.Rfillet);
    if (d.bendPos != null) setBendPos(d.bendPos);
    if (d.scrollMethod != null) setScrollMethod(d.scrollMethod);
    if (d.crossSection != null) setCrossSection(d.crossSection);
    if (d.bScroll != null) setBScroll(d.bScroll);
    if (d.Rtongue != null) setRtongue(d.Rtongue);
    if (d.wrapAngle != null) setWrapAngle(d.wrapAngle);
    if (d.diffuserAR != null) setDiffuserAR(d.diffuserAR);
    if (d.etaDiffuser != null) setEtaDiffuser(d.etaDiffuser);
    if (d.tBlade != null) setTBlade(d.tBlade);
    if (d.sealLen != null) setSealLen(d.sealLen);
    if (d.diskGap != null) setDiskGap(d.diskGap);
    if (d.P_atm != null) setPAtm(d.P_atm);
    if (d.cSound != null) setCSound(d.cSound);
    if (d.roughness != null) setRoughness(d.roughness);
    return true;
  };

  const exportJSON = () => {
    const data = collectState();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fansim_D${D2}_Z${Z}_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (restoreState(data)) {
          alert(`로드 완료: ${file.name}`);
        } else {
          alert('파일 형식 오류');
        }
      } catch { alert('JSON 파싱 실패'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const saveSlot = (slot) => {
    const data = collectState();
    data._name = `Slot ${slot} — D₂=${D2} Z=${Z} β₂=${beta2}°`;
    const next = { ...saves, [slot]: data };
    setSaves(next);
    try { localStorage.setItem('fansim_saves', JSON.stringify(next)); } catch {}
  };

  const loadSlot = (slot) => {
    const data = saves[slot];
    if (data) { restoreState(data); }
  };

  const deleteSlot = (slot) => {
    const next = { ...saves };
    delete next[slot];
    setSaves(next);
    try { localStorage.setItem('fansim_saves', JSON.stringify(next)); } catch {}
  };

  // ─── Humid air properties ───
  const airProps = useMemo(() => {
    const T = T_in + 273.15;
    // Saturation pressure: Antoine eq (water, 1-100°C)
    const Psat = 610.94 * Math.exp(17.625 * T_in / (T_in + 243.04)); // Pa
    const Pw = Psat * RH / 100; // partial pressure of water vapor
    // Density: humid air (Dalton's law)
    const Rd = 287.058; // dry air gas constant
    const Rv = 461.495; // water vapor gas constant
    const rho = (P_atm - Pw) / (Rd * T) + Pw / (Rv * T);
    // Viscosity: Sutherland's law for air
    const mu_ref = 1.716e-5; // Pa·s at T_ref=273.15K
    const T_ref = 273.15;
    const S_const = 110.4; // Sutherland constant for air
    const mu = mu_ref * Math.pow(T / T_ref, 1.5) * (T_ref + S_const) / (T + S_const);
    return { rho, mu, Psat, Pw };
  }, [T_in, RH, P_atm]);

  // Auto-estimate η_scroll from cross-section shape
  const etaScrollAuto = useMemo(() => {
    const baseEta = crossSection === 'circular' ? 0.58 : crossSection === 'rect' ? 0.48 : 0.43;
    const bFactor = Math.min(1.15, Math.max(0.85, bScroll / 50));
    const gapRatio = tGap / (D2 / 2);
    const gapFactor = 1 - 2 * Math.abs(gapRatio - 0.10);
    const methodFactor = scrollMethod === 'fv' ? 1.05 : 1.0;
    const wrapFactor = Math.min(1.0, wrapAngle / 360);
    return Math.min(0.75, Math.max(0.25, baseEta * bFactor * Math.max(0.8, gapFactor) * methodFactor * wrapFactor));
  }, [crossSection, bScroll, tGap, D2, scrollMethod, wrapAngle]);

  const params = useMemo(() => ({
    D1, D2, Deye, b1, b2, beta1, beta2, Z, RPM, T_in, RH,
    etaScroll: etaScrollAuto, tGap, diffuserAR, etaDiffuser, scrollOn,
    Rtongue, scrollMethod, crossSection, bScroll, wrapAngle, tAngle,
    tBlade, sealLen, diskGap, P_atm, cSound, roughness: roughness / 1000, // mm→m
    airProps,
  }), [D1, D2, Deye, b1, b2, beta1, beta2, Z, RPM, T_in, RH,
    etaScrollAuto, tGap, diffuserAR, etaDiffuser, scrollOn,
    Rtongue, scrollMethod, crossSection, bScroll, wrapAngle, tAngle,
    tBlade, sealLen, diskGap, P_atm, cSound, roughness, airProps]);
  const res = useMemo(() => compute(params), [params]);
  const { pq, bep, sigma, rho, U1, U2, Ns, Ds, bpfSPL, Q_design_beta } = res;
  const BPF = Z * RPM / 60;

  const tabs = ["형상", "속도삼각형", "PQ/효율", "손실 분해", "Passage", "비속도", "안정성"];
  const tabColors = [C.blade, C.red, C.blue, C.red, C.green, C.cyan, C.amber];

  // ─── Geometry SVG data ───
  const blades = useMemo(() => bladeShape(D1, D2, beta1, beta2, Z, bladeType, Rfillet, bendPos), [D1, D2, beta1, beta2, Z, bladeType, Rfillet, bendPos]);
  const r1 = D1 / 2, r2 = D2 / 2;

  // ─── Velocity Triangle data ───
  const vtData = useMemo(() => {
    const Qm3s = bep.Qm3s;
    const Cr1 = Qm3s / (Math.PI * (D1 / 1000) * (b1 / 1000));
    const Cr2 = Qm3s / (Math.PI * (D2 / 1000) * (b2 / 1000));
    const Ct2_ideal = U2 - Cr2 / Math.tan(beta2 * Math.PI / 180);
    const Ct2_slip = sigma * U2 - Cr2 / Math.tan(beta2 * Math.PI / 180);
    return { Cr1, Cr2, Ct2_ideal, Ct2_slip };
  }, [bep, D1, D2, b1, b2, beta2, U1, U2, sigma]);

  const cW = 340, cH = 160;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text }} className="font-sans">
      {/* Header */}
      <div className="px-3 pt-3 pb-1 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold" style={{ fontFamily: "monospace" }}>
            <span style={{ color: C.red }}>◆</span> Fan-Sim Pro — 시로코 팬 통합 설계 도구
          </h1>
          <p style={{ color: C.dim, fontFamily: "monospace", fontSize: 9 }}>Geometry + Physics + Performance</p>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setSaveOpen(!saveOpen)} className="text-xs px-2 py-1 rounded"
            style={{ background: C.card, color: C.cyan, border: `1px solid ${C.border}`, fontFamily: "monospace", fontSize: 10 }}>
            {saveOpen ? "✕" : "💾"}
          </button>
          <button onClick={() => setParamsOpen(!paramsOpen)} className="text-xs px-2 py-1 rounded"
            style={{ background: C.card, color: C.muted, border: `1px solid ${C.border}`, fontFamily: "monospace" }}>
            {paramsOpen ? "▲ 접기" : "▼ 파라미터"}
          </button>
        </div>
      </div>

      {/* ─── Save/Load Panel ─── */}
      {saveOpen && (
        <div className="px-3 pb-1">
          <div className="rounded-lg p-2" style={{ background: C.card, border: `1px solid ${C.cyan}44` }}>
            <div style={{ color: C.cyan, fontFamily: "monospace", fontSize: 9, fontWeight: 700, marginBottom: 4 }}>SAVE / LOAD</div>
            {/* JSON file export/import */}
            <div className="flex gap-1 mb-2">
              <button onClick={exportJSON} className="flex-1 py-1 rounded text-xs"
                style={{ background: C.bg, color: C.green, border: `1px solid ${C.green}44`, fontFamily: "monospace", fontSize: 9 }}>
                📥 JSON 내보내기
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-1 rounded text-xs"
                style={{ background: C.bg, color: C.orange, border: `1px solid ${C.orange}44`, fontFamily: "monospace", fontSize: 9 }}>
                📤 JSON 불러오기
              </button>
              <input ref={fileInputRef} type="file" accept=".json" onChange={importJSON} style={{ display: 'none' }} />
            </div>
            {/* Save slots */}
            <div style={{ color: C.dim, fontFamily: "monospace", fontSize: 8, marginBottom: 3 }}>SAVE SLOTS</div>
            <div className="flex flex-col gap-1">
              {[1, 2, 3, 4, 5].map(slot => {
                const s = saves[slot];
                const isEmpty = !s;
                return (
                  <div key={slot} className="flex items-center gap-1" style={{ fontFamily: "monospace", fontSize: 9 }}>
                    <span className="w-4" style={{ color: C.dim }}>{slot}.</span>
                    <div className="flex-1 py-0.5 px-1.5 rounded truncate" style={{
                      background: C.bg, color: isEmpty ? C.dim : C.text, fontSize: 8,
                      border: `1px solid ${isEmpty ? C.border : C.cyan}33`,
                    }}>
                      {isEmpty ? "— 비어 있음 —" : (
                        <span>{s._name || `D₂=${s.D2} Z=${s.Z}`} <span style={{ color: C.dim }}>{s._timestamp?.slice(5, 16)}</span></span>
                      )}
                    </div>
                    <button onClick={() => saveSlot(slot)} className="px-1.5 py-0.5 rounded"
                      style={{ background: C.bg, color: C.green, border: `1px solid ${C.green}33`, fontSize: 8 }}>저장</button>
                    <button onClick={() => loadSlot(slot)} disabled={isEmpty} className="px-1.5 py-0.5 rounded"
                      style={{ background: C.bg, color: isEmpty ? C.dim : C.cyan, border: `1px solid ${isEmpty ? C.border : C.cyan}33`, fontSize: 8, opacity: isEmpty ? 0.4 : 1 }}>로드</button>
                    {!isEmpty && (
                      <button onClick={() => deleteSlot(slot)} className="px-1 py-0.5 rounded"
                        style={{ background: C.bg, color: C.red, border: `1px solid ${C.red}33`, fontSize: 8 }}>✕</button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-1" style={{ color: C.dim, fontFamily: "monospace", fontSize: 7 }}>
              JSON: 파일로 내보내기/불러오기. Slot: 브라우저 내 저장 (Railway 배포 시 유지됨).
            </div>
          </div>
        </div>
      )}

      {/* ─── Parameters ─── */}
      {paramsOpen && (
        <div className="px-3 pb-1">
          <div className="rounded-lg p-2" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="grid grid-cols-2 gap-x-3">
              <div>
                <div style={{ color: C.dim, fontFamily: "monospace", fontSize: 9, marginBottom: 2 }}>IMPELLER</div>
                <S label="D_eye" value={Deye} min={40} max={200} step={1} onChange={setDeye} unit="mm" color={C.green} />
                <S label="D₁" value={D1} min={50} max={220} step={1} onChange={setD1} unit="mm" color={C.cyan} />
                <S label="D₂" value={D2} min={80} max={320} step={1} onChange={setD2} unit="mm" color={C.blue} />
                <S label="b₁" value={b1} min={15} max={120} step={1} onChange={setB1} unit="mm" />
                <S label="b₂" value={b2} min={15} max={120} step={1} onChange={setB2} unit="mm" color={C.orange} />
              </div>
              <div>
                <div style={{ color: C.dim, fontFamily: "monospace", fontSize: 9, marginBottom: 2 }}>CONDITION</div>
                <S label="β₁" value={beta1} min={10} max={60} step={1} onChange={setBeta1} unit="°" color={C.green} />
                <S label="β₂" value={beta2} min={95} max={170} step={1} onChange={setBeta2} unit="°" color={C.red} />
                <S label="Z" value={Z} min={16} max={48} step={1} onChange={setZ} unit="" color={C.purple} />
                <S label="RPM" value={RPM} min={400} max={3000} step={10} onChange={setRPM} unit="" color={C.green} />
                <S label="T" value={T_in} min={10} max={80} step={1} onChange={setTin} unit="°C" color={C.orange} />
                <S label="RH" value={RH} min={0} max={100} step={1} onChange={setRH} unit="%" color={C.cyan} />
              </div>
            </div>
            {/* Detail Geometry */}
            <div className="mt-1 pt-1" style={{ borderTop: `1px solid ${C.border}` }}>
              <div className="grid grid-cols-3 gap-x-2">
                <div>
                  <div style={{ color: C.dim, fontFamily: "monospace", fontSize: 8, marginBottom: 1 }}>BLADE</div>
                  <S label="t" value={tBlade} min={0.3} max={3.0} step={0.1} onChange={setTBlade} unit="mm" color={C.blade} />
                </div>
                <div>
                  <div style={{ color: C.dim, fontFamily: "monospace", fontSize: 8, marginBottom: 1 }}>SEAL</div>
                  <S label="L_s" value={sealLen} min={1} max={15} step={0.5} onChange={setSealLen} unit="mm" color={C.muted} />
                </div>
                <div>
                  <div style={{ color: C.dim, fontFamily: "monospace", fontSize: 8, marginBottom: 1 }}>DISK</div>
                  <S label="s" value={diskGap} min={1} max={15} step={0.5} onChange={setDiskGap} unit="mm" color={C.muted} />
                </div>
              </div>
            </div>
            {/* Scroll parameters */}
            {scrollOn && (
              <div className="mt-1 pt-1" style={{ borderTop: `1px solid ${C.border}` }}>
                <div className="grid grid-cols-2 gap-x-3">
                  <div>
                    <div style={{ color: C.scroll, fontFamily: "monospace", fontSize: 9, marginBottom: 2 }}>SCROLL</div>
                    <div className="flex gap-1 mb-1">
                      {[{k:'cv',l:'등속'},{k:'fv',l:'자유와류'}].map(m =>
                        <button key={m.k} onClick={() => setScrollMethod(m.k)} className="flex-1 py-0.5 rounded"
                          style={{fontFamily:"monospace",fontSize:8,
                            background:scrollMethod===m.k?C.card:"transparent",
                            color:scrollMethod===m.k?C.scroll:C.dim,
                            border:`1px solid ${scrollMethod===m.k?C.scroll:C.border}`}}>{m.l}</button>)}
                    </div>
                    <div className="flex gap-1 mb-1">
                      {[{k:'rect',l:'사각'},{k:'circular',l:'원형'}].map(m =>
                        <button key={m.k} onClick={() => setCrossSection(m.k)} className="flex-1 py-0.5 rounded"
                          style={{fontFamily:"monospace",fontSize:8,
                            background:crossSection===m.k?C.card:"transparent",
                            color:crossSection===m.k?C.scroll:C.dim,
                            border:`1px solid ${crossSection===m.k?C.scroll:C.border}`}}>{m.l}</button>)}
                    </div>
                    <S label="b_sc" value={bScroll} min={20} max={120} step={1} onChange={setBScroll} unit="mm" color={C.scroll} />
                    <S label="Gap" value={tGap} min={2} max={25} step={0.5} onChange={setTGap} unit="mm" color={C.scroll} />
                  </div>
                  <div>
                    <div style={{ color: C.pink, fontFamily: "monospace", fontSize: 9, marginBottom: 2 }}>TONGUE & DIFFUSER</div>
                    <S label="Wrap" value={wrapAngle} min={180} max={360} step={5} onChange={setWrapAngle} unit="°" color={C.scroll} />
                    <S label="R_t" value={Rtongue} min={0} max={15} step={0.5} onChange={setRtongue} unit="mm" color={C.amber} />
                    <S label="θ_cut" value={tAngle} min={0} max={90} step={1} onChange={setTAngle} unit="°" color={C.amber} />
                    <S label="AR" value={diffuserAR} min={1.0} max={2.5} step={0.05} onChange={setDiffuserAR} unit="" color={C.pink} />
                    <S label="η_df" value={etaDiffuser} min={0.3} max={0.9} step={0.01} onChange={setEtaDiffuser} unit="" color={C.pink} />
                  </div>
                </div>
                <div className="mt-1 p-1 rounded" style={{background:C.bg,fontSize:8,fontFamily:"monospace",color:C.muted}}>
                  <span style={{color:C.scroll}}>η_scroll(물리계산)={bep.eta_scroll_calc?.toFixed(3)||"—"}</span> ← {crossSection==='circular'?'원형':'사각'} + {scrollMethod==='fv'?'자유와류':'등속'} + b={bScroll}mm + wrap={wrapAngle}° + Lb={res.Lb ? (res.Lb*1000).toFixed(1)+"mm" : "—"}
                  {" | "}<span style={{color:C.amber}}>R_tongue={Rtongue}mm ({Rtongue<2?'sharp':'round'})</span>
                </div>
              </div>
            )}
            <div className="flex flex-wrap justify-around mt-1 pt-1" style={{ borderTop: `1px solid ${C.border}` }}>
              <Stat label="σ" value={sigma.toFixed(3)} color={C.amber} />
              <Stat label="U₂" value={U2.toFixed(1)} unit="m/s" color={C.blue} sub={U2 > 30 ? "⚠ >30" : "✓"} />
              <Stat label="Ns" value={Ns.toFixed(2)} color={C.cyan} sub={Ns >= 0.8 && Ns <= 2.5 ? "✓ 시로코" : "⚠"} />
              <Stat label="η_fan" value={(bep.eta_fan_s * 100).toFixed(1)} unit="%" color={C.green} />
              <Stat label="BPF" value={BPF.toFixed(0)} unit="Hz" color={C.purple} sub={BPF > 1000 && BPF < 4000 ? "⚠ 민감" : "✓"} />
              <Stat label="ρ" value={airProps.rho.toFixed(3)} unit="kg/m³" color={C.orange} sub={`T${T_in}°C RH${RH}%`} />
              <Stat label="μ" value={(airProps.mu * 1e6).toFixed(2)} unit="×10⁻⁶" color={C.muted} />
            </div>
            {/* Settings toggle */}
            <div className="mt-1 pt-1" style={{ borderTop: `1px solid ${C.border}` }}>
              <button onClick={() => setSettingsOpen(!settingsOpen)}
                className="w-full text-left text-xs py-0.5 flex items-center gap-1"
                style={{ color: C.dim, fontFamily: "monospace", fontSize: 8 }}>
                <span style={{ transform: settingsOpen ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block", transition: "0.15s" }}>▶</span>
                물리 상수 설정
              </button>
              {settingsOpen && (
                <div className="grid grid-cols-3 gap-x-2 mt-1">
                  <div>
                    <S label="P_atm" value={P_atm} min={80000} max={110000} step={100} onChange={setPAtm} unit="Pa" color={C.dim} />
                  </div>
                  <div>
                    <S label="c" value={cSound} min={300} max={380} step={1} onChange={setCSound} unit="m/s" color={C.dim} />
                  </div>
                  <div>
                    <S label="ε" value={roughness} min={0.01} max={0.5} step={0.01} onChange={setRoughness} unit="mm" color={C.dim} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Tabs ─── */}
      <div className="px-3 flex gap-0.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {tabs.map((t, i) => <Tab key={i} active={tab === i} onClick={() => setTab(i)} color={tabColors[i]}>{t}</Tab>)}
      </div>

      {/* ─── Content ─── */}
      <div className="px-3 py-2">
        <div className="rounded-lg p-2" style={{ background: C.card, border: `1px solid ${C.border}` }}>

          {/* ══ TAB 0: Geometry ══ */}
          {tab === 0 && (() => {
            const svgW = 340, svgH = 320;
            const cx = svgW / 2, cy = svgH / 2 - 10;
            // Pre-compute scroll to get actual max radius for scaling
            const scrollCfg = {
              method: scrollMethod, crossSection, bScroll,
              Qdes: bep.Qm3s || 0.001, Ct2: bep.Ct2 || 10, C2: bep.C2 || 15, rho, Rtongue, wrapAngle,
            };
            // Estimate max scroll outer radius (in mm)
            const Cavg = scrollCfg.method === 'cv' ? (scrollCfg.C2 * 0.55) : scrollCfg.Ct2;
            const Amax = (scrollCfg.Qdes || 0.001) * (wrapAngle * Math.PI / 180) / (2 * Math.PI * Math.max(1, Cavg));
            const hMax = crossSection === 'circular'
              ? Math.sqrt(4 * Amax / Math.PI) * 1000
              : (Amax / (bScroll / 1000)) * 1000;
            const scrollMaxR = r2 + tGap + Math.max(hMax, r2 * 0.15); // min 15% growth for visibility
            const maxR = scrollOn ? Math.max(r2 * 1.3, scrollMaxR * 1.1) : r2 * 1.3;
            const sc = (Math.min(svgW, svgH) / 2 - 30) / maxR;
            const scrl = scrollOn ? scrollPath(r2, tGap, tAngle, cx, cy, sc, scrollCfg) : null;
            return <div>
              <div style={{color:C.dim,fontFamily:"monospace",fontSize:8,fontWeight:700,marginBottom:2}}>FRONT VIEW (정면도)</div>
              <div className="flex justify-center">
                <svg width={svgW} height={svgH}>
                  {scrl && <>
                    {/* Scroll outer wall */}
                    <path d={scrl.outer.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")} fill="none" stroke={C.scroll} strokeWidth={1.5} opacity={0.4} />
                    {/* Outlet duct: outer wall → out1, inner wall → out2 */}
                    <line x1={scrl.outer[scrl.outer.length-1].x} y1={scrl.outer[scrl.outer.length-1].y} x2={scrl.out1.x} y2={scrl.out1.y} stroke={C.scroll} strokeWidth={1.5} opacity={0.4} />
                    <line x1={scrl.innerEnd.x} y1={scrl.innerEnd.y} x2={scrl.out2.x} y2={scrl.out2.y} stroke={C.scroll} strokeWidth={1.5} opacity={0.4} />
                    {/* Tongue */}
                    <circle cx={scrl.tongue.x} cy={scrl.tongue.y} r={Math.max(1.5, Rtongue * sc * 0.3)} fill={C.scroll} opacity={0.7} />
                    <text x={scrl.tongue.x + 6} y={scrl.tongue.y - 4} fill={C.scroll} fontSize={8} fontFamily="monospace" opacity={0.6}>tongue</text>
                    {/* Wrap angle label */}
                    {wrapAngle < 360 && <text x={scrl.outer[scrl.outer.length-1].x + 4} y={scrl.outer[scrl.outer.length-1].y - 4}
                      fill={C.scroll} fontSize={7} fontFamily="monospace" opacity={0.5}>{wrapAngle}°</text>}
                  </>}
                  <circle cx={cx} cy={cy} r={r2 * sc} fill="none" stroke={C.shroud} strokeWidth={1.2} />
                  <circle cx={cx} cy={cy} r={r1 * sc} fill="none" stroke={C.cyan} strokeWidth={0.8} />
                  {/* Eye opening */}
                  <circle cx={cx} cy={cy} r={Deye / 2 * sc} fill="none" stroke={C.green} strokeWidth={0.8} strokeDasharray="4,3" opacity={0.6} />
                  {/* Vaneless space shading */}
                  {Deye < D1 && <path d={`M ${cx + Deye/2*sc} ${cy} A ${Deye/2*sc} ${Deye/2*sc} 0 1 0 ${cx - Deye/2*sc} ${cy} A ${Deye/2*sc} ${Deye/2*sc} 0 1 0 ${cx + Deye/2*sc} ${cy}`}
                    fill="none" stroke="none" />}
                  <circle cx={cx} cy={cy} r={r1 * sc * 0.35} fill={C.border} stroke={C.hub} strokeWidth={0.8} />
                  {Array.from({ length: Z }).map((_, bi) => {
                    const ba = (2 * Math.PI * bi) / Z;
                    const pts = blades.map(p => ({ x: cx + p.r * Math.cos(ba + p.theta) * sc, y: cy - p.r * Math.sin(ba + p.theta) * sc }));
                    return <path key={bi} d={pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")}
                      fill="none" stroke={C.blade} strokeWidth={1} opacity={0.65} strokeLinecap="round" />;
                  })}
                  {/* SFS bend radius indicator */}
                  {bladeType === 'sfs' && (() => {
                    const rBend = r1 + bendPos * (r2 - r1);
                    return <circle cx={cx} cy={cy} r={rBend * sc} fill="none" stroke={C.pink} strokeWidth={0.7} strokeDasharray="4,4" opacity={0.5} />;
                  })()}
                  <text x={cx} y={cy + r2 * sc + 22} fill={C.blue} fontSize={8} fontFamily="monospace" textAnchor="middle">D₂={D2}mm</text>
                  <text x={cx} y={cy + r2 * sc + 34} fill={C.cyan} fontSize={8} fontFamily="monospace" textAnchor="middle">D₁={D1}mm (blade)</text>
                  <text x={cx} y={cy + r2 * sc + 46} fill={C.green} fontSize={8} fontFamily="monospace" textAnchor="middle">D_eye={Deye}mm</text>
                  <text x={10} y={14} fill={C.purple} fontSize={9} fontFamily="monospace">Z={Z}</text>
                </svg>
              </div>
              {/* ─── Section View (단면도) ─── */}
              {(() => {
                const sW = 340, sH = 150, sCx = sW / 2, sCy = sH / 2 + 5;
                const sSc = (sH - 50) / (D2 * 0.6);
                const rEs = Deye / 2 * sSc; // eye radius in SVG
                const r1s = r1 * sSc, r2s = r2 * sSc;
                const b1s = b1 * sSc * 0.5, b2s = b2 * sSc * 0.5;
                const hubR = rEs * 0.4;
                const hasVL = D1 > Deye;
                return <div className="mt-2 rounded-lg overflow-hidden" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
                  <div style={{ color: C.dim, fontFamily: "monospace", fontSize: 8, padding: "4px 8px", fontWeight: 700 }}>SECTION VIEW (단면도)</div>
                  <div className="flex justify-center">
                    <svg width={sW} height={sH}>
                      {/* Center axis */}
                      <line x1={sCx} y1={8} x2={sCx} y2={sH - 8} stroke={C.dim} strokeWidth={0.5} strokeDasharray="5,4" opacity={0.4} />
                      <text x={sCx + 3} y={14} fill={C.dim} fontSize={7} fontFamily="monospace">CL</text>
                      {/* Both sides */}
                      {[1, -1].map(side => {
                        const s = side;
                        return <g key={side}>
                          {/* Front Shroud: eye opening → D₁ (if vaneless) → D₂ */}
                          {/* Eye bellmouth curve */}
                          <path d={`M ${sCx + s * rEs * 0.85} ${sCy - b1s / 2 - 10} Q ${sCx + s * rEs * 0.93} ${sCy - b1s / 2 - 3} ${sCx + s * rEs} ${sCy - b1s / 2}`}
                            fill="none" stroke={C.green} strokeWidth={1.5} />
                          {/* Shroud from eye to blade inlet (vaneless top wall) */}
                          {hasVL && <line x1={sCx + s * rEs} y1={sCy - b1s / 2}
                            x2={sCx + s * r1s} y2={sCy - b1s / 2}
                            stroke={C.shroud} strokeWidth={1.2} strokeDasharray="3,2" opacity={0.5} />}
                          {/* Shroud from blade inlet to D₂ */}
                          <line x1={sCx + s * r1s} y1={sCy - b1s / 2}
                            x2={sCx + s * r2s} y2={sCy - b2s / 2}
                            stroke={C.shroud} strokeWidth={1.8} />
                          {/* Back Plate: D₂ → D₁ → hub */}
                          <path d={`M ${sCx + s * r2s} ${sCy + b2s / 2} L ${sCx + s * r1s} ${sCy + b1s / 2} L ${sCx + s * rEs} ${sCy + b1s / 2} L ${sCx + s * hubR} ${sCy + b1s / 2}`}
                            fill="none" stroke={C.hub} strokeWidth={1.8} />
                          {/* Vaneless space fill */}
                          {hasVL && <rect x={Math.min(sCx + s * rEs, sCx + s * r1s)} y={sCy - b1s / 2}
                            width={Math.abs(r1s - rEs)} height={b1s}
                            fill={C.green} opacity={0.06} />}
                          {/* Blade region: D₁ → D₂ */}
                          <line x1={sCx + s * r2s} y1={sCy - b2s / 2} x2={sCx + s * r2s} y2={sCy + b2s / 2}
                            stroke={C.blade} strokeWidth={1.5} opacity={0.6} />
                          <line x1={sCx + s * r1s} y1={sCy - b1s / 2} x2={sCx + s * r1s} y2={sCy + b1s / 2}
                            stroke={C.cyan} strokeWidth={1} opacity={0.4} strokeDasharray="2,2" />
                          {/* Eye edge marker */}
                          <line x1={sCx + s * rEs} y1={sCy - b1s / 2 - 2} x2={sCx + s * rEs} y2={sCy - b1s / 2 + 4}
                            stroke={C.green} strokeWidth={1.5} opacity={0.7} />
                          {/* Air flow arrow through eye */}
                          <line x1={sCx + s * rEs * 0.6} y1={sCy - b1s / 2 - 22} x2={sCx + s * rEs * 0.6} y2={sCy - b1s / 2 - 8}
                            stroke={C.green} strokeWidth={1.2} opacity={0.5} />
                          <polygon points={`${sCx + s * rEs * 0.6},${sCy - b1s / 2 - 6} ${sCx + s * rEs * 0.6 - 3},${sCy - b1s / 2 - 12} ${sCx + s * rEs * 0.6 + 3},${sCy - b1s / 2 - 12}`}
                            fill={C.green} opacity={0.5} />
                        </g>;
                      })}
                      {/* Blade passage fill */}
                      <rect x={sCx - r2s} y={sCy - b2s / 2} width={r2s * 2} height={b2s} fill={C.bladeFill} opacity={0.3} rx={1} />
                      {/* Hub */}
                      <rect x={sCx - hubR} y={sCy + b1s / 2} width={hubR * 2} height={5} fill={C.border} stroke={C.hub} strokeWidth={0.8} rx={1} />
                      {/* Dimensions */}
                      <line x1={sCx + r1s + 10} y1={sCy - b1s / 2} x2={sCx + r1s + 10} y2={sCy + b1s / 2} stroke={C.cyan} strokeWidth={0.7} />
                      <text x={sCx + r1s + 16} y={sCy + 3} fill={C.cyan} fontSize={7} fontFamily="monospace">b₁={b1}</text>
                      <line x1={sCx + r2s + 10} y1={sCy - b2s / 2} x2={sCx + r2s + 10} y2={sCy + b2s / 2} stroke={C.orange} strokeWidth={0.7} />
                      <text x={sCx + r2s + 16} y={sCy + 3} fill={C.orange} fontSize={7} fontFamily="monospace">b₂={b2}</text>
                      {/* Labels */}
                      <text x={sCx} y={sCy - b1s / 2 - 26} fill={C.green} fontSize={7} fontFamily="monospace" textAnchor="middle" opacity={0.5}>AIR IN (eye)</text>
                      {hasVL && <text x={sCx + (rEs + r1s) / 2} y={sCy - b1s / 2 - 4} fill={C.green} fontSize={6} fontFamily="monospace" textAnchor="middle" opacity={0.4}>vaneless</text>}
                    </svg>
                  </div>
                </div>;
              })()}

              {/* Scroll controls */}
              <div className="flex gap-3 mt-1 items-center flex-wrap">
                <label className="flex items-center gap-1"><input type="checkbox" checked={scrollOn} onChange={e => setScrollOn(e.target.checked)} /><span className="text-xs" style={{ color: C.scroll, fontFamily: "monospace" }}>Scroll</span></label>
                {scrollOn && <>
                  <div className="flex items-center gap-1"><span className="text-xs" style={{ color: C.dim, fontFamily: "monospace" }}>Gap</span>
                    <input type="range" min={2} max={30} value={tGap} onChange={e => setTGap(+e.target.value)} className="w-16 h-1 appearance-none rounded" style={{ background: C.border }} />
                    <span className="text-xs" style={{ color: C.text, fontFamily: "monospace" }}>{tGap}mm</span></div>
                </>}
              </div>
              {/* Blade type selection */}
              <div className="mt-2 p-2 rounded-lg" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
                <div style={{ color: C.dim, fontFamily: "monospace", fontSize: 8, fontWeight: 700, marginBottom: 4 }}>BLADE PROFILE</div>
                <div className="flex gap-1 mb-1">
                  {[
                    { key: 'arc', label: '단일 원호', desc: 'Single Arc' },
                    { key: 'sfs', label: '직선-필렛-직선', desc: 'Str-Fillet-Str' },
                    { key: 'linear', label: '선형 β 보간', desc: 'Linear β' },
                  ].map(bt => (
                    <button key={bt.key} onClick={() => setBladeType(bt.key)}
                      className="flex-1 py-1 px-1 rounded text-center"
                      style={{
                        fontFamily: "monospace", fontSize: 9,
                        background: bladeType === bt.key ? C.card : "transparent",
                        color: bladeType === bt.key ? C.blade : C.dim,
                        border: `1px solid ${bladeType === bt.key ? C.blade : C.border}`,
                      }}>
                      <div className="font-bold">{bt.label}</div>
                      <div style={{ fontSize: 7, color: C.dim }}>{bt.desc}</div>
                    </button>
                  ))}
                </div>
                {bladeType === 'sfs' && (() => {
                  const r1mm = D1 / 2, r2mm = D2 / 2;
                  const rBendMm = r1mm + bendPos * (r2mm - r1mm);
                  const dBendMm = rBendMm * 2;
                  return <div className="mt-1">
                    <S label="R" value={Rfillet} min={1} max={50} step={1} onChange={setRfillet} unit="mm" color={C.pink} />
                    <S label="Bend" value={bendPos} min={0.15} max={0.85} step={0.01} onChange={setBendPos} unit="" color={C.cyan} />
                    <div style={{ color: C.dim, fontFamily: "monospace", fontSize: 7, marginTop: 2 }}>
                      R={Rfillet}mm (전환 폭) | 절곡 위치: r={rBendMm.toFixed(1)}mm (D={dBendMm.toFixed(0)}mm) = span의 {(bendPos*100).toFixed(0)}%
                    </div>
                    <div style={{ color: C.muted, fontFamily: "monospace", fontSize: 7, marginTop: 1 }}>
                      Bend↓(0.2): β₁ 짧고 β₂ 길음 | Bend↑(0.8): β₁ 길고 β₂ 짧음
                    </div>
                  </div>;
                })()}
                {bladeType === 'arc' && (
                  <div style={{ color: C.dim, fontFamily: "monospace", fontSize: 8, marginTop: 2 }}>
                    β₁, β₂ 접선 조건을 만족하는 유일한 원호. 판금 프레스 1회 성형.
                  </div>
                )}
                {bladeType === 'linear' && (
                  <div style={{ color: C.dim, fontFamily: "monospace", fontSize: 8, marginTop: 2 }}>
                    β가 r1→r2에서 선형 변화. 교과서적 기준선.
                  </div>
                )}
              </div>
              {/* Design ratios */}
              <div className="grid grid-cols-3 gap-1 mt-2">
                {[
                  { l: "D_eye/D₁", v: (Deye/D1).toFixed(2), c: Deye<=D1?C.green:C.amber, s: Deye<D1?"vaneless":"eye≥blade" },
                  { l: "D₁/D₂", v: (D1/D2).toFixed(3), c: D1/D2>=0.65&&D1/D2<=0.8?C.green:C.amber, s: "ref:0.65~0.80" },
                  { l: "b₁/b₂", v: (b1/b2).toFixed(2), c: b1>=b2?C.green:C.amber, s: b1>=b2?"✓ b₁≥b₂":"⚠ b₁<b₂" },
                  { l: "δ/r₂", v: scrollOn?(tGap/(D2/2)).toFixed(3):"—", c: scrollOn?(tGap/(D2/2)>=0.08&&tGap/(D2/2)<=0.12?C.green:C.amber):C.dim, s: "ref:0.08~0.12" },
                  { l: "Tip U₂", v: U2.toFixed(1)+"m/s", c: U2>30?C.red:C.green, s: U2>30?"⚠ 소음":"✓ OK" },
                  { l: "반동도", v: (bep.reaction*100).toFixed(0)+"%", c: bep.reaction<0.3?C.amber:C.green, s: bep.reaction<0.3?"동압↑":"" },
                ].map(m => <div key={m.l} className="text-center py-1 rounded" style={{ background: C.bg }}>
                  <div style={{ color: C.dim, fontFamily: "monospace", fontSize: 8 }}>{m.l}</div>
                  <div className="font-bold" style={{ color: m.c, fontFamily: "monospace", fontSize: 11 }}>{m.v}</div>
                  <div style={{ color: C.dim, fontFamily: "monospace", fontSize: 7 }}>{m.s}</div>
                </div>)}
              </div>
            </div>;
          })()}

          {/* ══ TAB 1: Velocity Triangles ══ */}
          {tab === 1 && (() => {
            const { Cr1, Cr2, Ct2_ideal, Ct2_slip } = vtData;
            const drawTri = (title, U, Cr, Ct, CtSlip, w, h) => {
              const pad = 35;
              const pts = [[0,0],[U,0],[Ct,Cr]];
              if (CtSlip !== undefined) pts.push([CtSlip, Cr]);
              const xs = pts.map(p=>p[0]), ys = pts.map(p=>p[1]);
              const xMn = Math.min(...xs), xMx = Math.max(...xs), yMn = Math.min(...ys), yMx = Math.max(...ys);
              const rX = xMx-xMn||1, rY = yMx-yMn||1;
              const sc = Math.min((w-2*pad)/rX, (h-2*pad)/rY)*0.8;
              const cx = w/2-((xMn+xMx)/2)*sc, cy = h/2+((yMn+yMx)/2)*sc;
              const toS = (x,y) => [cx+x*sc, cy-y*sc];
              const [ox,oy]=toS(0,0),[ax,ay]=toS(U,0),[bx,by]=toS(Ct,Cr);
              return <div className="flex flex-col items-center">
                <div style={{ color: C.muted, fontFamily: "monospace", fontSize: 9, fontWeight: 700 }}>{title}</div>
                <svg width={w} height={h}>
                  <line x1={ox-10} y1={oy} x2={Math.max(ax,bx)+10} y2={oy} stroke={C.border} strokeWidth={0.5} strokeDasharray="3,3" opacity={0.4} />
                  <Arrow x1={ox} y1={oy} x2={ax} y2={ay} color={C.blue} label="U" lside="right" />
                  <Arrow x1={ox} y1={oy} x2={bx} y2={by} color={C.red} label="C" />
                  <Arrow x1={ax} y1={ay} x2={bx} y2={by} color={C.green} label="W" lside="right" />
                  {showSlip && CtSlip !== undefined && (() => {
                    const [sx,sy]=toS(CtSlip,Cr);
                    return <><Arrow x1={ox} y1={oy} x2={sx} y2={sy} color={C.amber} label="C'" dashed lside="left" sw={1.8} />
                      <Arrow x1={ax} y1={ay} x2={sx} y2={sy} color={C.amber} label="W'" dashed lside="right" sw={1.8} /></>;
                  })()}
                  <circle cx={ox} cy={oy} r={3} fill={C.text} /><circle cx={ax} cy={ay} r={3} fill={C.blue} /><circle cx={bx} cy={by} r={3} fill={C.red} />
                  <text x={w-4} y={14} fill={C.muted} fontSize={8} textAnchor="end" fontFamily="monospace">|C|={Math.sqrt(Cr**2+Ct**2).toFixed(1)}</text>
                  <text x={w-4} y={24} fill={C.green} fontSize={8} textAnchor="end" fontFamily="monospace" opacity={0.8}>|W|={Math.sqrt(Cr**2+(Ct-U)**2).toFixed(1)}</text>
                </svg>
              </div>;
            };
            return <div>
              <div className="flex flex-col md:flex-row gap-0">
                {drawTri("INLET (입구)", U1, Cr1, 0, undefined, 340, 180)}
                {drawTri("OUTLET (출구)", U2, Cr2, Ct2_ideal, showSlip ? Ct2_slip : undefined, 340, 180)}
              </div>
              <div className="flex justify-center gap-3 mt-1 flex-wrap">
                {[{c:C.blue,l:"U"},{c:C.red,l:"C"},{c:C.green,l:"W"},{c:C.amber,l:"C'/W' (slip)"}].map(x =>
                  <div key={x.l} className="flex items-center gap-1"><div className="w-3 h-0.5" style={{background:x.c}} /><span className="text-xs" style={{color:x.c,fontFamily:"monospace"}}>{x.l}</span></div>)}
              </div>
              <label className="flex items-center gap-1 justify-center mt-1"><input type="checkbox" checked={showSlip} onChange={e=>setShowSlip(e.target.checked)} />
                <span className="text-xs" style={{color:C.amber,fontFamily:"monospace"}}>Slip 보정 (σ={sigma.toFixed(3)})</span></label>
              {/* Key values */}
              <div className="grid grid-cols-4 gap-1 mt-2">
                <Stat label="C_θ2" value={Ct2_ideal.toFixed(1)} unit="m/s" color={C.red} />
                <Stat label="C_θ2'" value={Ct2_slip.toFixed(1)} unit="m/s" color={C.amber} />
                <Stat label="동압비" value={bep.Pt > 0 ? (bep.Pdyn / bep.Pt * 100).toFixed(0) + "%" : "—"} color={C.orange} />
                <Stat label="반동도" value={(bep.reaction * 100).toFixed(0) + "%" } color={bep.reaction < 0.3 ? C.amber : C.green} sub={bep.reaction < 0.3 ? "⚠ 스크롤 중요" : ""} />
              </div>
            </div>;
          })()}

          {/* ══ TAB 2: PQ & Efficiency ══ */}
          {tab === 2 && <div>
            <div style={{color:C.dim,fontFamily:"monospace",fontSize:9,fontWeight:700,marginBottom:4}}>PRESSURE vs FLOW — 임펠러 + 팬</div>
            <div className="flex justify-center"><Chart data={pq} xKey="Q" w={cW} h={cH} xLabel="Q [m³/min]" yLabel="ΔP [Pa]"
              lines={[
                {key:"Pt_e",color:C.dim,w:1,dash:"4,3"},
                {key:"Pt_imp",color:C.blue,w:1,dash:"3,3"},
                {key:"Ps_imp",color:C.cyan,w:1,dash:"3,3"},
                {key:"Pt_fan",color:C.blue,w:2.5},
                {key:"Ps_fan",color:C.cyan,w:2.5},
              ]}
              markers={[{x:bep.Q,y:bep.Ps_fan,color:C.amber,label:"BEP"}]} /></div>
            <div className="flex justify-center gap-2 mt-1 flex-wrap">
              {[{c:C.dim,l:"Euler",d:true},{c:C.blue,l:"전압(임펠러)",d:true},{c:C.cyan,l:"정압(임펠러)",d:true},
                {c:C.blue,l:"전압(팬)"},{c:C.cyan,l:"정압(팬)"}].map(x=>
                <div key={x.l} className="flex items-center gap-1"><div className="w-3 h-0.5" style={{background:x.c,opacity:x.d?0.5:1}} /><span style={{color:x.c,fontFamily:"monospace",fontSize:8,opacity:x.d?0.6:1}}>{x.l}</span></div>)}
            </div>
            <div style={{color:C.dim,fontFamily:"monospace",fontSize:9,fontWeight:700,marginTop:8,marginBottom:4}}>EFFICIENCY</div>
            <div className="flex justify-center"><Chart data={pq} xKey="Q" w={cW} h={cH} xLabel="Q [m³/min]" yLabel="η" yRange={[0,1]}
              lines={[
                {key:"eta_imp_t",color:C.green,w:1,dash:"3,3"},
                {key:"eta_fan_t",color:C.green,w:2},
                {key:"eta_fan_s",color:C.cyan,w:2},
              ]}
              markers={[{x:bep.Q,y:bep.eta_fan_s,color:C.amber,label:`η_s=${(bep.eta_fan_s*100).toFixed(1)}%`}]} /></div>
            <div className="flex justify-center gap-3 mt-1 flex-wrap">
              {[{c:C.green,l:"η_t(임펠러)",d:true},{c:C.green,l:"η_t(팬)"},{c:C.cyan,l:"η_s(팬)"}].map(x=>
                <div key={x.l} className="flex items-center gap-1"><div className="w-3 h-0.5" style={{background:x.c,opacity:x.d?0.5:1}} /><span style={{color:x.c,fontFamily:"monospace",fontSize:8,opacity:x.d?0.6:1}}>{x.l}</span></div>)}
            </div>
            {/* BEP summary */}
            <div className="grid grid-cols-4 gap-1 mt-2" style={{borderTop:`1px solid ${C.border}`,paddingTop:6}}>
              <Stat label="BEP Q" value={bep.Q.toFixed(1)} unit="m³/min" color={C.amber} />
              <Stat label="Ps_fan" value={bep.Ps_fan.toFixed(0)} unit="Pa" color={C.cyan} />
              <Stat label="Pt_fan" value={bep.Pt_fan.toFixed(0)} unit="Pa" color={C.blue} />
              <Stat label="Ps_imp" value={bep.Ps_imp.toFixed(0)} unit="Pa" color={C.dim} />
            </div>
            <div className="grid grid-cols-4 gap-1 mt-1">
              <Stat label="η_fan_s" value={(bep.eta_fan_s*100).toFixed(1)} unit="%" color={C.green} />
              <Stat label="Scroll 회수" value={bep.dPs_scroll.toFixed(0)} unit="Pa" color={C.scroll} />
              <Stat label="Diff 회수" value={(bep.dPs_diff||0).toFixed(0)} unit="Pa" color={C.pink} />
              <Stat label="동압(출구)" value={bep.Pdyn_fan_exit.toFixed(0)} unit="Pa" color={C.orange} />
            </div>
            <div className="p-1.5 rounded mt-2" style={{background:C.bg,fontSize:9,color:C.muted}}>
              <span style={{color:C.cyan}}>Ps_fan</span> = Ps_imp + <span style={{color:C.scroll}}>η_scroll×Pdyn</span> - scroll loss - tongue loss + <span style={{color:C.pink}}>diffuser 회수</span>.
              η_scroll(물리)={bep.eta_scroll_calc?.toFixed(3)||"—"}, AR={diffuserAR.toFixed(1)}
            </div>
          </div>}

          {/* ══ TAB 3: Loss Breakdown ══ */}
          {tab === 3 && <div>
            <div style={{color:C.dim,fontFamily:"monospace",fontSize:9,fontWeight:700,marginBottom:4}}>IMPELLER LOSS vs FLOW</div>
            <div className="flex justify-center"><Chart data={pq} xKey="Q" w={cW} h={cH} xLabel="Q [m³/min]" yLabel="ΔP_loss [Pa]"
              lines={[{key:"dP_vaneless",color:C.green,w:1.5,dash:"3,3"},{key:"dPinc",color:C.red,w:1.5},{key:"dPfric",color:C.blue,w:1.5},{key:"dPrec",color:C.purple,w:1.5},{key:"dPdisk",color:C.orange,w:1,dash:"3,3"},{key:"dPleak",color:C.cyan,w:1,dash:"3,3"}]}
              markers={[{x:bep.Q,y:bep.dPfric,color:C.amber,label:"BEP"}]} /></div>
            <div className="flex justify-center gap-2 mt-1 flex-wrap">
              {[{c:C.green,l:"Vaneless"},{c:C.red,l:"Incidence"},{c:C.blue,l:"Friction"},{c:C.purple,l:"Recirc"},{c:C.orange,l:"Disk"},{c:C.cyan,l:"Leak"}].map(x=>
                <div key={x.l} className="flex items-center gap-1"><div className="w-3 h-0.5" style={{background:x.c}} /><span style={{color:x.c,fontFamily:"monospace",fontSize:9}}>{x.l}</span></div>)}
            </div>
            {/* Scroll + Diffuser losses at BEP */}
            <div style={{color:C.dim,fontFamily:"monospace",fontSize:9,fontWeight:700,marginTop:8,marginBottom:4}}>BEP PRESSURE BUDGET</div>
            {[
              {n:"Euler (이론)",v:bep.Pt_e,c:C.dim},
              {n:"Vaneless 손실",v:-(bep.dP_vaneless||0),c:C.green},
              {n:"임펠러 손실 합",v:bep.Pt_e-bep.Pt_imp,c:C.red},
              {n:"→ 임펠러 전압",v:bep.Pt_imp,c:C.blue},
              {n:"→ 임펠러 정압",v:bep.Ps_imp,c:C.cyan},
              {n:"Scroll 정압 회수",v:bep.dPs_scroll,c:C.scroll},
              {n:"Scroll 손실",v:-(bep.dP_scroll_loss+bep.dP_tongue),c:C.amber},
              {n:"Wrap 미커버 손실",v:-(bep.dP_uncaptured||0),c:C.orange},
              {n:"Diffuser 회수",v:bep.dPs_diff||0,c:C.pink},
              {n:"→ 팬 정압",v:bep.Ps_fan,c:C.green},
            ].map(l =>
              <div key={l.n} className="flex items-center gap-1 py-0.5" style={{fontFamily:"monospace",fontSize:9}}>
                <span className="w-28" style={{color:l.c}}>{l.n}</span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{background:C.bg}}>
                  <div className="h-full rounded-full" style={{width:`${bep.Pt_e>0?Math.abs(l.v)/bep.Pt_e*100:0}%`,background:l.c,opacity:0.6}} /></div>
                <span className="w-14 text-right" style={{color:C.text}}>{l.v.toFixed(1)} Pa</span>
              </div>
            )}
            <div className="text-xs mt-2 p-1.5 rounded" style={{background:C.bg,color:C.muted,fontSize:9}}>
              Euler({bep.Pt_e.toFixed(0)}) → 임펠러 손실(-{(bep.Pt_e-bep.Pt_imp).toFixed(0)}) → <b style={{color:C.scroll}}>Scroll(+{bep.dPs_scroll.toFixed(0)})</b> → <b style={{color:C.pink}}>Diff(+{(bep.dPs_diff||0).toFixed(0)})</b> → <b style={{color:C.green}}>Ps_fan={bep.Ps_fan.toFixed(0)}Pa</b>
            </div>
          </div>}

          {/* ══ TAB 4: Passage Flow ══ */}
          {tab === 4 && <div>
            <div style={{color:C.dim,fontFamily:"monospace",fontSize:9,fontWeight:700,marginBottom:4}}>de Haller (W₂/W₁)</div>
            <div className="flex justify-center"><Chart data={pq} xKey="Q" w={cW} h={cH} xLabel="Q [m³/min]" yLabel="W₂/W₁" yRange={[0,2]}
              lines={[{key:"deH",color:C.green,w:2}]} markers={[{x:bep.Q,y:bep.deH,color:C.amber,label:bep.deH.toFixed(2)}]} /></div>
            <div className="text-xs p-1.5 rounded mt-1" style={{background:C.bg,color:C.muted,fontSize:9}}>
              후곡 팬: W₂{"<"}W₁ (passage 내 감속=확산), de Haller{"<"}1, 0.72 이하면 박리 위험.<br/>
              <b style={{color:C.amber}}>시로코</b>: W₂{">"}W₁ 가능 (passage 내 가속). <b style={{color:C.red}}>출구 후 스크롤에서의 감속</b>이 핵심 문제.
            </div>
            <div style={{color:C.dim,fontFamily:"monospace",fontSize:9,fontWeight:700,marginTop:8,marginBottom:4}}>C₂/U₂ & W₂/W₁</div>
            <div className="flex justify-center"><Chart data={pq} xKey="Q" w={cW} h={cH} xLabel="Q [m³/min]" yLabel="ratio" yRange={[0,2]}
              lines={[{key:"C2U2",color:C.red,w:2},{key:"W2W1",color:C.green,w:1.5,dash:"4,3"}]} /></div>
            <div className="text-xs p-1.5 rounded mt-1" style={{background:C.bg,color:C.muted,fontSize:9}}>
              <b style={{color:C.red}}>C₂/U₂ {">"}1</b>: 시로코 특유. 출구 절대속도가 원주속도보다 큼. 이 운동에너지를 스크롤에서 회수해야 함.
            </div>
          </div>}

          {/* ══ TAB 5: Specific Speed ══ */}
          {tab === 5 && <div>
            <div style={{color:C.dim,fontFamily:"monospace",fontSize:9,fontWeight:700,marginBottom:4}}>비속도 영역</div>
            <div className="relative h-8 rounded-lg overflow-hidden" style={{background:C.bg}}>
              {[{l:"후곡",x0:0,x1:25,c:C.blue},{l:"시로코",x0:25,x1:55,c:C.red},{l:"사류",x0:55,x1:75,c:C.green},{l:"축류",x0:75,x1:100,c:C.purple}].map(z=>
                <div key={z.l} className="absolute top-0 h-full flex items-center justify-center" style={{left:`${z.x0}%`,width:`${z.x1-z.x0}%`,background:z.c,opacity:0.15}}>
                  <span style={{color:z.c,fontFamily:"monospace",fontSize:9,fontWeight:700}}>{z.l}</span></div>)}
              {Ns > 0 && <div className="absolute top-0 h-full w-0.5" style={{left:`${Math.min(95,Math.max(2,(Ns/6)*100))}%`,background:C.amber}}>
                <div style={{color:C.amber,fontFamily:"monospace",fontSize:9,fontWeight:700,marginTop:2,whiteSpace:"nowrap"}}>Ns={Ns.toFixed(2)}</div></div>}
            </div>
            <div className="text-center mt-1" style={{color:C.dim,fontFamily:"monospace",fontSize:8}}>0 ── 1.0 ── 2.0 ── 3.0 ── 4.0 ── 5.0 ── 6.0</div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Stat label="Ns (비속도)" value={Ns.toFixed(3)} color={C.cyan} />
              <Stat label="Ds (비직경)" value={Ds.toFixed(3)} color={C.pink} />
            </div>
            <div className="text-xs p-1.5 rounded mt-2" style={{background:C.bg,color:C.muted,fontSize:9}}>
              <b style={{color:C.cyan}}>Ns = N·√Q / (ΔP/ρ)^0.75</b><br/>
              비속도는 팬의 형상 DNA. 건조기(Q~2~6, ΔP~100~300)는 시로코 영역(0.8~2.5)에 위치.<br/>
              <b style={{color:C.pink}}>Ds = D₂·(ΔP/ρ)^0.25 / √Q</b><br/>
              Cordier 선도: Ns↑→Ds↓. 시로코: Ds~2~5.
            </div>
          </div>}

          {/* ══ TAB 6: Stability ══ */}
          {tab === 6 && (() => {
            const slopeData = pq.map((d,i) => {
              if(i===0) return {...d, slope:0};
              const dP = d.Pt - pq[i-1].Pt, dQ = d.Q - pq[i-1].Q;
              return {...d, slope: dQ!==0? dP/dQ : 0};
            });
            const unstable = slopeData.filter(d=>d.slope>0).length > 3;
            return <div>
              <div style={{color:C.dim,fontFamily:"monospace",fontSize:9,fontWeight:700,marginBottom:4}}>PQ SLOPE (dP/dQ)</div>
              <div className="flex justify-center"><Chart data={slopeData.slice(1)} xKey="Q" w={cW} h={cH} xLabel="Q [m³/min]" yLabel="dP/dQ"
                lines={[{key:"slope",color:C.amber,w:2}]} markers={[{x:bep.Q,y:slopeData[res.bI]?.slope||0,color:C.green,label:"BEP"}]} /></div>
              <div className="p-1.5 rounded mt-1 text-xs" style={{background:unstable?"rgba(248,113,113,0.1)":"rgba(52,211,153,0.1)",
                border:`1px solid ${unstable?C.red:C.green}`,color:C.text,fontSize:9}}>
                {unstable ? <><b style={{color:C.red}}>⚠ 불안정 영역 존재</b> — dP/dQ {">"} 0 구간. Surge/hunting 위험.</>
                  : <><b style={{color:C.green}}>✓ 안정적 PQ</b> — 단조 감소. 운전점 고유 결정.</>}
              </div>
              <div style={{color:C.dim,fontFamily:"monospace",fontSize:9,fontWeight:700,marginTop:8,marginBottom:4}}>BPF 소음 (정량 모델)</div>
              <div className="grid grid-cols-4 gap-1">
                <Stat label="BPF" value={BPF.toFixed(0)} unit="Hz" color={C.purple} sub={BPF>1000&&BPF<4000?"⚠ 민감":"✓"} />
                <Stat label="SPL_BPF" value={bpfSPL.toFixed(1)} unit="dB" color={bpfSPL>70?C.red:bpfSPL>60?C.amber:C.green}
                  sub={bpfSPL>70?"⚠ 높음":bpfSPL>60?"주의":"✓ OK"} />
                <Stat label="δ/r₂" value={(tGap/(D2/2)).toFixed(3)} color={(tGap/(D2/2))>=0.08&&(tGap/(D2/2))<=0.12?C.green:C.amber} />
                <Stat label="R_tongue" value={Rtongue.toFixed(1)} unit="mm" color={C.amber} sub={Rtongue<2?"sharp":"round"} />
              </div>
              <div className="p-1.5 rounded mt-1" style={{background:C.bg,fontSize:8,color:C.muted}}>
                SPL_BPF = f(U₂, δ/r₂, R_tongue). δ↓ or R_tongue↓ → SPL↑. Gap={tGap}mm→δ/r₂={(tGap/(D2/2)).toFixed(3)}, R_t={Rtongue}mm
              </div>

              <div style={{color:C.dim,fontFamily:"monospace",fontSize:9,fontWeight:700,marginTop:8,marginBottom:4}}>Radial Force (반경 방향 하중)</div>
              <div className="flex justify-center"><Chart data={pq} xKey="Q" w={cW} h={cH} xLabel="Q [m³/min]" yLabel="Fr [N]"
                lines={[{key:"Fr",color:C.pink,w:2}]}
                markers={[
                  {x:bep.Q,y:bep.Fr,color:C.amber,label:`BEP ${bep.Fr.toFixed(1)}N`},
                  ...(Q_design_beta > 0 ? [{x:Q_design_beta,y:pq.find(d=>Math.abs(d.Q-Q_design_beta)<0.5)?.Fr||0,color:C.green,label:"β₁ 설계점"}] : []),
                ]} /></div>
              <div className="grid grid-cols-3 gap-1 mt-1">
                <Stat label="Fr(BEP)" value={bep.Fr.toFixed(2)} unit="N" color={C.pink} />
                <Stat label="θ_cutoff" value={tAngle.toFixed(0)} unit="°" color={C.amber} />
                <Stat label="Q_des(β₁)" value={Q_design_beta.toFixed(1)} unit="m³/min" color={C.green} />
              </div>
              <div className="text-xs p-1.5 rounded mt-2" style={{background:C.bg,color:C.muted,fontSize:9}}>
                <b style={{color:C.pink}}>Radial Force:</b> 스크롤 내 θ별 정압 불균일 → 임펠러에 반경 하중. Off-design에서 급증. θ_cutoff 위치가 압력 비대칭에 영향.
                <br/><b style={{color:C.green}}>β₁ 설계점:</b> Q={Q_design_beta.toFixed(1)} m³/min (β₁={beta1}°에서 incidence=0). 이 점에서 incidence loss 최소.
                <br/><b>안정성:</b> β₂{">"}90° Euler 우상향. 응축수/린트 → 저항↑ → 운전점 좌측 → 불안정+Fr↑ → 진동.
              </div>
            </div>;
          })()}

        </div>
      </div>

      <div className="text-center pb-3" style={{color:C.border,fontFamily:"monospace",fontSize:9}}>Fan-Sim Pro v4.0 — Humid Air + Full Physics</div>
    </div>
  );
}
