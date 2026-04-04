import { useState, useEffect, useRef, useMemo } from "react";
import * as THREE from "three";

const C = {
  bg: "#0a0e17", card: "#111827", border: "#1e2d4a",
  text: "#e2e8f0", dim: "#4a5568", muted: "#718096",
  blade: "#60a5fa", shroud: "#94a3b8", hub: "#f59e0b",
  backplate: "#a78bfa", eye: "#34d399", accent: "#f472b6",
  red: "#ef4444", green: "#4ade80", cyan: "#22d3ee", purple: "#a855f7",
};

function S({ label, value, min, max, step, onChange, unit, color }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const startEdit = () => { setEditing(true); setText(String(value)); };
  const endEdit = () => { setEditing(false); const v = parseFloat(text); if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v))); };
  const onKey = (e) => { if (e.key === 'Enter') endEdit(); if (e.key === 'Escape') setEditing(false); };
  return (
    <div className="flex items-center gap-1 py-0.5">
      <span className="w-10 text-right" style={{ color: color || C.muted, fontFamily: "monospace", fontSize: 10 }}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)}
        className="flex-1 h-1 appearance-none rounded cursor-pointer" style={{ background: C.border, accentColor: color || C.blade }} />
      {editing ? (
        <input type="number" value={text} onChange={e => setText(e.target.value)} onBlur={endEdit} onKeyDown={onKey} autoFocus
          className="w-14 text-right rounded px-0.5" style={{ background: C.bg, color: C.text, fontFamily: "monospace", fontSize: 10, border: `1px solid ${color || C.blade}`, outline: "none" }} />
      ) : (
        <span className="w-14 text-right cursor-pointer" onDoubleClick={startEdit} title="더블클릭: 직접 입력"
          style={{ color: C.text, fontFamily: "monospace", fontSize: 10, borderBottom: `1px dashed ${C.border}` }}>
          {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}{unit}
        </span>
      )}
    </div>
  );
}

// ─── Blade profiles (3 types) ───
function bladeLinear(D1, D2, beta1, beta2, n = 20) {
  const r1 = D1 / 2, r2 = D2 / 2, b1R = beta1 * Math.PI / 180, b2R = beta2 * Math.PI / 180;
  let theta = 0; const pts = [{ r: r1, theta: 0 }];
  for (let i = 1; i <= n; i++) {
    const t = i / n, r = r1 + t * (r2 - r1), rP = r1 + (i - 1) / n * (r2 - r1);
    const rM = (r + rP) / 2, tM = (t + (i - 1) / n) / 2, bM = b1R + tM * (b2R - b1R);
    if (Math.abs(Math.tan(bM)) > 0.001) theta += (-1 / (rM * Math.tan(bM))) * (r - rP);
    pts.push({ r, theta });
  }
  return pts;
}

function bladeSFS(D1, D2, beta1, beta2, Rfillet, bendPos, n = 50) {
  const r1 = D1 / 2, r2 = D2 / 2, b1R = beta1 * Math.PI / 180, b2R = beta2 * Math.PI / 180;
  const blendW = Math.min(0.9, Math.max(0.05, Rfillet / 50));
  const tMid = Math.max(0.1, Math.min(0.9, bendPos));
  const tStart = Math.max(0.02, tMid - blendW / 2), tEnd = Math.min(0.98, tMid + blendW / 2);
  let theta = 0; const pts = [{ r: r1, theta: 0 }];
  for (let i = 1; i <= n; i++) {
    const t = i / n, r = r1 + t * (r2 - r1), rP = r1 + (i - 1) / n * (r2 - r1);
    const rM = (r + rP) / 2, tM_pt = (t + (i - 1) / n) / 2;
    let beta;
    if (tM_pt <= tStart) beta = b1R;
    else if (tM_pt >= tEnd) beta = b2R;
    else { const s = (tM_pt - tStart) / (tEnd - tStart); beta = b1R + 0.5 * (1 - Math.cos(s * Math.PI)) * (b2R - b1R); }
    if (Math.abs(Math.tan(beta)) > 0.001) theta += (-1 / (rM * Math.tan(beta))) * (r - rP);
    pts.push({ r, theta });
  }
  return pts;
}

function bladeArc(D1, D2, beta1, beta2) {
  // Helper functions
  const bladeTangent = (alpha, betaRad) => {
    const er_x = Math.cos(alpha), er_y = Math.sin(alpha);
    const et_x = -Math.sin(alpha), et_y = Math.cos(alpha);
    return { tx: Math.sin(betaRad) * er_x - Math.cos(betaRad) * et_x, ty: Math.sin(betaRad) * er_y - Math.cos(betaRad) * et_y };
  };
  const cartToPolar = (xyPts) => {
    if (!xyPts.length) return [];
    const theta0 = Math.atan2(xyPts[0].y, xyPts[0].x);
    return xyPts.map(p => ({ r: Math.sqrt(p.x ** 2 + p.y ** 2), theta: Math.atan2(p.y, p.x) - theta0 }));
  };

  const r1 = D1 / 2, r2 = D2 / 2;
  const b1R = beta1 * Math.PI / 180, b2R = beta2 * Math.PI / 180;
  const { tx: n1x, ty: n1y } = (() => { const t = bladeTangent(0, b1R); return { tx: -t.ty, ty: t.tx }; })();
  let Rlo = 1, Rhi = r2 * 10, Rbest = r2;
  for (let iter = 0; iter < 60; iter++) {
    const R = (Rlo + Rhi) / 2, Cx = r1 + R * n1x, Cy = R * n1y;
    const D_val = (r2 ** 2 + Cx ** 2 + Cy ** 2 - R ** 2) / 2;
    const amp = Math.sqrt(Cx ** 2 + Cy ** 2);
    if (amp < 1e-10 || Math.abs(D_val / (r2 * amp)) > 1) { Rlo = R; continue; }
    const phase = Math.atan2(Cy, Cx), a2 = phase + Math.acos(Math.max(-1, Math.min(1, D_val / (r2 * amp))));
    const p2x = r2 * Math.cos(a2), p2y = r2 * Math.sin(a2);
    const dx = p2x - Cx, dy = p2y - Cy;
    const { tx: t2x, ty: t2y } = bladeTangent(a2, b2R);
    const cross = (-dy) * t2y - dx * t2x;
    if (cross > 0) Rhi = R; else Rlo = R; Rbest = R;
  }
  const R = Rbest, Cx = r1 + R * n1x, Cy = R * n1y;
  const angStart = Math.atan2(-Cy, r1 - Cx);
  const D_val = (r2 ** 2 + Cx ** 2 + Cy ** 2 - R ** 2) / 2;
  const amp = Math.sqrt(Cx ** 2 + Cy ** 2), phase = Math.atan2(Cy, Cx);
  const a2 = phase + Math.acos(Math.max(-1, Math.min(1, D_val / (r2 * amp))));
  const angEnd = Math.atan2(r2 * Math.sin(a2) - Cy, r2 * Math.cos(a2) - Cx);
  let sweep = angEnd - angStart;
  if (sweep > Math.PI) sweep -= 2 * Math.PI; if (sweep < -Math.PI) sweep += 2 * Math.PI;
  const n = 40, xyPts = [];
  for (let i = 0; i <= n; i++) { const t = i / n; const ang = angStart + t * sweep; xyPts.push({ x: Cx + R * Math.cos(ang), y: Cy + R * Math.sin(ang) }); }
  return cartToPolar(xyPts);
}

function bladeShape(D1, D2, beta1, beta2, type, Rfillet, bendPos) {
  let pts;
  try {
    if (type === 'arc') pts = bladeArc(D1, D2, beta1, beta2);
    else if (type === 'sfs') pts = bladeSFS(D1, D2, beta1, beta2, Rfillet, bendPos);
  } catch (e) {}
  if (!pts || pts.length < 3 || pts.some(p => !isFinite(p.r) || !isFinite(p.theta))) pts = bladeLinear(D1, D2, beta1, beta2);
  return pts;
}

function buildDisc(outerR, innerR, t) {
  const s = new THREE.Shape(); s.absarc(0, 0, outerR, 0, Math.PI * 2, false);
  const h = new THREE.Path(); h.absarc(0, 0, innerR, 0, Math.PI * 2, true); s.holes.push(h);
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false }); g.rotateX(Math.PI / 2); return g;
}

function buildBlade(pts, b1, b2, D1, D2, angle) {
  const r1 = D1 / 2, r2 = D2 / 2, v = [], idx = [];
  for (let i = 0; i < pts.length; i++) {
    const th = pts[i].theta + angle, x = pts[i].r * Math.cos(th), z = pts[i].r * Math.sin(th);
    const tf = Math.max(0, Math.min(1, (pts[i].r - r1) / (r2 - r1))), h = b1 + tf * (b2 - b1);
    v.push(x, 0, z); v.push(x, h, z);
  }
  for (let i = 0; i < pts.length - 1; i++) { const a = i * 2; idx.push(a, a + 2, a + 3); idx.push(a, a + 3, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

function Tab({ active, onClick, children, color }) {
  return <button onClick={onClick} className="px-3 py-1 text-xs rounded-t" style={{ fontFamily: "monospace", fontSize: 10,
    background: active ? C.card : "transparent", color: active ? (color || C.text) : C.dim,
    borderBottom: active ? `2px solid ${color || C.blade}` : "2px solid transparent" }}>{children}</button>;
}

function FrontView({ Deye, D1, D2, Du, bladePts, Z, bladeType, bendPos }) {
  const w = 340, h = 280, cx = w / 2, cy = h / 2 + 10;
  const maxR = Math.max(D2, Du) / 2; const sc = (Math.min(w, h) / 2 - 25) / maxR;
  const rBend = D1/2 + bendPos * (D2/2 - D1/2);
  return <svg width={w} height={h} style={{ display: "block", margin: "0 auto" }}>
    <text x={w/2} y={16} fill={C.dim} fontSize={9} fontFamily="monospace" textAnchor="middle">정면도 (Front — Eye 방향에서 본 모습)</text>
    {Du > D2 && <circle cx={cx} cy={cy} r={Du/2*sc} fill="none" stroke={C.accent} strokeWidth={1} strokeDasharray="4,3" opacity={0.4} />}
    <circle cx={cx} cy={cy} r={D2/2*sc} fill="none" stroke={C.blade} strokeWidth={1.5} />
    <circle cx={cx} cy={cy} r={D1/2*sc} fill="none" stroke={C.cyan} strokeWidth={0.8} strokeDasharray="3,3" opacity={0.6} />
    <circle cx={cx} cy={cy} r={Deye/2*sc} fill="none" stroke={C.eye} strokeWidth={1.5} />
    {/* SFS bend radius indicator */}
    {bladeType === 'sfs' && <circle cx={cx} cy={cy} r={rBend*sc} fill="none" stroke={C.accent} strokeWidth={0.7} strokeDasharray="4,4" opacity={0.5} />}
    <circle cx={cx} cy={cy} r={Deye*0.2*sc} fill={C.border} stroke={C.hub} strokeWidth={1} />
    {Array.from({ length: Z }).map((_, i) => {
      const a = (2 * Math.PI * i) / Z;
      const d = bladePts.map(p => ({ x: cx + p.r * Math.cos(a + p.theta) * sc, y: cy - p.r * Math.sin(a + p.theta) * sc }));
      return <path key={i} d={d.map((p, j) => `${j === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")} fill="none" stroke={C.blade} strokeWidth={0.8} opacity={0.55} />;
    })}
    {[0, 72, 144, 216, 288].map(deg => {
      const a = deg * Math.PI / 180, r0 = Deye * 0.08, r1i = Deye * 0.28;
      return <line key={deg} x1={cx + r0*Math.cos(a)*sc} y1={cy - r0*Math.sin(a)*sc} x2={cx + r1i*Math.cos(a)*sc} y2={cy - r1i*Math.sin(a)*sc}
        stroke={C.green} strokeWidth={1.5} opacity={0.5} markerEnd="url(#aF)" />;
    })}
    <defs><marker id="aF" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={5} markerHeight={5} orient="auto"><path d="M0 0L10 5L0 10z" fill={C.green} opacity={0.5} /></marker></defs>
    <text x={cx} y={cy + 3} fill={C.green} fontSize={8} fontFamily="monospace" textAnchor="middle" opacity={0.5}>AIR IN ⊙</text>
    <text x={cx} y={cy + D2/2*sc + 18} fill={C.blade} fontSize={8} fontFamily="monospace" textAnchor="middle">D₂={D2}mm</text>
    <text x={cx} y={cy + D2/2*sc + 30} fill={C.eye} fontSize={8} fontFamily="monospace" textAnchor="middle">D_eye={Deye}mm</text>
    {bladeType==='sfs' && <text x={cx} y={cy - rBend*sc - 4} fill={C.accent} fontSize={7} fontFamily="monospace" textAnchor="middle" opacity={0.6}>Bend D={rBend*2|0}mm</text>}
    {Du > D2 && <text x={cx} y={cy - Du/2*sc - 6} fill={C.accent} fontSize={7} fontFamily="monospace" textAnchor="middle">D_u={Du}mm (+{Du-D2})</text>}
  </svg>;
}

function SectionView({ Deye, D1, D2, Du, b1, b2, eyeRise }) {
  const w = 340, h = 200, cx = w / 2, cy = h / 2 + 10;
  const maxR = Math.max(D2, Du) / 2; const sc = (w / 2 - 30) / maxR;
  const bSc = (h - 70) / Math.max(b1, b2, b1 + eyeRise);
  const rE = Deye/2*sc, r1s = D1/2*sc, r2s = D2/2*sc, rU = Du/2*sc;
  const h1 = b1*bSc*0.5, h2 = b2*bSc*0.5, hubR = rE*0.4;
  const eyeH = eyeRise * bSc * 0.5; // eye rise in SVG units
  // Eye curve control point offset
  const eyeCurveR = eyeRise * 0.8 * sc; // radial spread of curve
  return <svg width={w} height={h} style={{ display: "block", margin: "0 auto" }}>
    <text x={w/2} y={14} fill={C.dim} fontSize={9} fontFamily="monospace" textAnchor="middle">단면도 (Section View)</text>
    <line x1={cx} y1={22} x2={cx} y2={h-8} stroke={C.dim} strokeWidth={0.5} strokeDasharray="4,3" opacity={0.3} />
    <text x={cx+3} y={26} fill={C.dim} fontSize={7} fontFamily="monospace">CL</text>
    {[1, -1].map(s => <g key={s}>
      <path d={`M${cx+s*rE} ${cy-h1-eyeH} Q${cx+s*(rE+eyeCurveR*0.5)} ${cy-h1-eyeH*0.2} ${cx+s*(rE+eyeCurveR)} ${cy-h1} L${cx+s*r2s} ${cy-h2}`} fill="none" stroke={C.shroud} strokeWidth={1.5} />
      <line x1={cx+s*rU} y1={cy+h2} x2={cx+s*hubR} y2={cy+h1} stroke={C.backplate} strokeWidth={1.5} />
      {Du>D2 && <line x1={cx+s*rU} y1={cy+h2} x2={cx+s*r2s} y2={cy+h2} stroke={C.accent} strokeWidth={1.5} strokeDasharray="3,2" />}
      <line x1={cx+s*r2s} y1={cy-h2} x2={cx+s*r2s} y2={cy+h2} stroke={C.blade} strokeWidth={1} opacity={0.5} />
      <line x1={cx+s*r1s} y1={cy-h1} x2={cx+s*r1s} y2={cy+h1} stroke={C.cyan} strokeWidth={0.7} opacity={0.3} strokeDasharray="2,2" />
      <line x1={cx+s*rE*0.6} y1={cy-h1-eyeH-15} x2={cx+s*rE*0.6} y2={cy-h1-eyeH+2} stroke={C.green} strokeWidth={1.5} opacity={0.6} markerEnd="url(#aS)" />
      <line x1={cx+s*(r2s+6)} y1={cy} x2={cx+s*(r2s+18)} y2={cy} stroke={C.green} strokeWidth={1} opacity={0.4} markerEnd="url(#aS)" />
    </g>)}
    <defs><marker id="aS" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={5} markerHeight={5} orient="auto"><path d="M0 0L10 5L0 10z" fill={C.green} opacity={0.5} /></marker></defs>
    <rect x={cx-r2s} y={cy-h2} width={r2s*2} height={h2+h1} fill={C.blade} opacity={0.06} rx={1} />
    <rect x={cx-hubR} y={cy+h1} width={hubR*2} height={4} fill={C.border} stroke={C.hub} strokeWidth={0.8} rx={1} />
    <text x={cx} y={cy-h1-eyeH-18} fill={C.green} fontSize={8} fontFamily="monospace" textAnchor="middle" opacity={0.6}>↓ AIR IN ↓</text>
    <text x={10} y={cy} fill={C.green} fontSize={7} fontFamily="monospace" opacity={0.4}>→ AIR OUT</text>
    <text x={cx+r2s+8} y={cy-4} fill={C.blade} fontSize={7} fontFamily="monospace">D₂</text>
    <text x={cx+rU+4} y={cy+h2+14} fill={C.backplate} fontSize={7} fontFamily="monospace">D_u={Du}</text>
    {Deye < D1 && <text x={cx+(rE+r1s)/2} y={cy-h1-3} fill={C.eye} fontSize={6} fontFamily="monospace" textAnchor="middle" opacity={0.5}>vaneless</text>}
    {eyeRise > 0 && <>
      <line x1={cx-rE-6} y1={cy-h1} x2={cx-rE-6} y2={cy-h1-eyeH} stroke={C.shroud} strokeWidth={0.5} />
      <text x={cx-rE-10} y={cy-h1-eyeH/2+3} fill={C.shroud} fontSize={6} fontFamily="monospace" textAnchor="end">{eyeRise}mm</text>
    </>}
    <line x1={cx+r1s+8} y1={cy-h1} x2={cx+r1s+8} y2={cy+h1} stroke={C.cyan} strokeWidth={0.5} />
    <text x={cx+r1s+12} y={cy+3} fill={C.cyan} fontSize={7} fontFamily="monospace">b₁={b1}</text>
    <line x1={cx+r2s+8} y1={cy-h2} x2={cx+r2s+8} y2={cy+h2} stroke={C.hub} strokeWidth={0.5} />
    <text x={cx+r2s+12} y={cy+14} fill={C.hub} fontSize={7} fontFamily="monospace">b₂={b2}</text>
  </svg>;
}

function BottomView({ D2, Du, Deye }) {
  const w = 340, h = 240, cx = w/2, cy = h/2+5;
  const maxR = Math.max(D2, Du)/2; const sc = (Math.min(w, h)/2 - 25) / maxR;
  const hubR = Deye * 0.2;
  return <svg width={w} height={h} style={{ display: "block", margin: "0 auto" }}>
    <text x={w/2} y={14} fill={C.dim} fontSize={9} fontFamily="monospace" textAnchor="middle">저면도 (Bottom — 주판 방향에서 본 모습)</text>
    <circle cx={cx} cy={cy} r={Du/2*sc} fill={C.backplate} fillOpacity={0.06} stroke={C.backplate} strokeWidth={1.5} />
    <circle cx={cx} cy={cy} r={D2/2*sc} fill="none" stroke={C.blade} strokeWidth={0.8} strokeDasharray="3,3" opacity={0.4} />
    <circle cx={cx} cy={cy} r={hubR*sc} fill={C.border} stroke={C.hub} strokeWidth={1.2} />
    <circle cx={cx} cy={cy} r={hubR*0.3*sc} fill={C.hub} opacity={0.7} />
    <text x={cx} y={cy+3} fill={C.bg} fontSize={8} fontFamily="monospace" textAnchor="middle" fontWeight="bold">◎</text>
    <text x={cx} y={cy+Du/2*sc+16} fill={C.backplate} fontSize={9} fontFamily="monospace" textAnchor="middle">D_u = {Du}mm</text>
    {Du>D2 && <text x={cx} y={cy+Du/2*sc+28} fill={C.accent} fontSize={8} fontFamily="monospace" textAnchor="middle">주판 돌출: +{Du-D2}mm</text>}
    <text x={cx+D2/2*sc+6} y={cy+4} fill={C.blade} fontSize={7} fontFamily="monospace" opacity={0.5}>D₂</text>
  </svg>;
}

export default function ImpellerViewer() {
  const [Deye, setDeye] = useState(110);
  const [D1, setD1] = useState(120);
  const [D2, setD2] = useState(175);
  const [Du, setDu] = useState(180);
  const [b1, setB1] = useState(60);
  const [b2, setB2] = useState(50);
  const [beta1, setBeta1] = useState(30);
  const [beta2, setBeta2] = useState(145);
  const [Z, setZ] = useState(36);
  const [tBlade, setTBlade] = useState(1.0);
  const [bladeType, setBladeType] = useState('sfs'); // 'arc', 'sfs', 'linear'
  const [Rfillet, setRfillet] = useState(15);
  const [bendPos, setBendPos] = useState(0.5);
  const [eyeRise, setEyeRise] = useState(10); // shroud eye curve height mm
  const [showShroud, setShowShroud] = useState(true);
  const [showBackplate, setShowBackplate] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [explode, setExplode] = useState(0);
  const [viewTab, setViewTab] = useState(0);

  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const camRef = useRef(null);
  const rendRef = useRef(null);
  const grpRef = useRef(null);
  const frameRef = useRef(null);
  const autoRef = useRef(autoRotate);
  const mouseRef = useRef({ isDown: false, x: 0, y: 0, rotX: 0.4, rotY: 0, dist: 300 });
  useEffect(() => { autoRef.current = autoRotate; }, [autoRotate]);

  const bladePts = useMemo(() => bladeShape(D1, D2, beta1, beta2, bladeType, Rfillet, bendPos), [D1, D2, beta1, beta2, bladeType, Rfillet, bendPos]);

  useEffect(() => {
    if (viewTab !== 0) return;
    const mount = mountRef.current; if (!mount) return;
    const w = mount.clientWidth || 340, h = 360;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(C.bg);
    const cam = new THREE.PerspectiveCamera(45, w / h, 1, 2000);
    const rend = new THREE.WebGLRenderer({ antialias: true }); rend.setSize(w, h); rend.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.innerHTML = ''; mount.appendChild(rend.domElement);
    scene.add(new THREE.AmbientLight(0x404060, 1.5));
    const dl = new THREE.DirectionalLight(0xffffff, 1.2); dl.position.set(200, 300, 200); scene.add(dl);
    const dl2 = new THREE.DirectionalLight(0x6688ff, 0.6); dl2.position.set(-200, 100, -100); scene.add(dl2);
    const grid = new THREE.GridHelper(400, 20, 0x1a2540, 0x111827); grid.position.y = -10; scene.add(grid);
    const grp = new THREE.Group(); scene.add(grp);
    sceneRef.current = scene; camRef.current = cam; rendRef.current = rend; grpRef.current = grp;
    const el = rend.domElement;
    const onD = (e) => { const m = mouseRef.current; m.isDown = true; m.x = e.clientX||e.touches?.[0]?.clientX; m.y = e.clientY||e.touches?.[0]?.clientY; };
    const onM = (e) => { const m = mouseRef.current; if(!m.isDown) return; const cx=e.clientX||e.touches?.[0]?.clientX||0,cy=e.clientY||e.touches?.[0]?.clientY||0; m.rotY+=(cx-m.x)*0.01; m.rotX=Math.max(-1.2,Math.min(1.5,m.rotX+(cy-m.y)*0.01)); m.x=cx;m.y=cy; };
    const onU = () => { mouseRef.current.isDown = false; };
    const onW = (e) => { mouseRef.current.dist = Math.max(100, Math.min(800, mouseRef.current.dist + e.deltaY * 0.3)); e.preventDefault(); };
    el.addEventListener('pointerdown',onD); el.addEventListener('pointermove',onM); el.addEventListener('pointerup',onU); el.addEventListener('wheel',onW,{passive:false});
    const anim = () => { frameRef.current = requestAnimationFrame(anim); const m = mouseRef.current; if(autoRef.current&&!m.isDown) m.rotY+=0.005;
      cam.position.set(m.dist*Math.sin(m.rotY)*Math.cos(m.rotX), m.dist*Math.sin(m.rotX)+30, m.dist*Math.cos(m.rotY)*Math.cos(m.rotX)); cam.lookAt(0,25,0); rend.render(scene,cam); };
    anim();
    return () => { cancelAnimationFrame(frameRef.current); rend.dispose(); };
  }, [viewTab]);

  useEffect(() => {
    if (viewTab !== 0) return;
    const grp = grpRef.current; if (!grp) return;
    while(grp.children.length>0){const c=grp.children[0];if(c.geometry)c.geometry.dispose();if(c.material)c.material.dispose();grp.remove(c);}
    const hubR=Deye*0.2, sT=2, bpT=2, ex=explode;
    if(showBackplate){const g=buildDisc(Du/2,hubR,bpT); grp.add(new THREE.Mesh(g,new THREE.MeshPhongMaterial({color:0x8b5cf6,transparent:true,opacity:0.7,side:THREE.DoubleSide,shininess:60}))); grp.children[grp.children.length-1].position.y=-ex;
      if(Du>D2+1){const rg=new THREE.RingGeometry(D2/2,Du/2,64); const rm=new THREE.Mesh(rg,new THREE.MeshPhongMaterial({color:0xf472b6,transparent:true,opacity:0.25,side:THREE.DoubleSide})); rm.rotation.x=-Math.PI/2; rm.position.y=-ex+0.5; grp.add(rm);}}
    if(showShroud){
      // Flat shroud disc D_eye → D2
      const g=buildDisc(D2/2,Deye/2,sT); const m=new THREE.Mesh(g,new THREE.MeshPhongMaterial({color:0x94a3b8,transparent:true,opacity:0.3,side:THREE.DoubleSide,shininess:80})); m.position.y=b2+ex; grp.add(m);
      // Eye curve: revolved profile from eye lip down to blade inlet level
      if(eyeRise > 0) {
        const nCurve = 16;
        const curvePoints = [];
        for(let i = 0; i <= nCurve; i++) {
          const t = i / nCurve; // 0=top of lip, 1=blade inlet
          // Quadratic bezier: P0=(Deye/2, b1+eyeRise), P1=(Deye/2, b1), P2=(Deye/2+eyeRise*0.5, b1)
          // Parametric: smooth from vertical to horizontal
          const angle = t * Math.PI / 2; // 0 to 90°
          const r = Deye / 2 + eyeRise * 0.8 * Math.sin(angle); // radius grows with sine
          const y = b1 + eyeRise * Math.cos(angle); // height drops with cosine
          curvePoints.push(new THREE.Vector2(r, y));
        }
        // Add thickness
        const outerPts = curvePoints.map(p => new THREE.Vector2(p.x + sT * 0.5, p.y));
        const innerPts = [...curvePoints].reverse().map(p => new THREE.Vector2(p.x - sT * 0.5, p.y));
        const allPts = [...outerPts, ...innerPts];
        const curveShape = new THREE.Shape(allPts);
        const latheGeo = new THREE.LatheGeometry(curvePoints, 64);
        const curveMesh = new THREE.Mesh(latheGeo, new THREE.MeshPhongMaterial({
          color: 0x94a3b8, transparent: true, opacity: 0.35, side: THREE.DoubleSide, shininess: 80
        }));
        curveMesh.position.y = ex;
        grp.add(curveMesh);
      }
    }
    const hg=new THREE.CylinderGeometry(hubR,hubR,bpT+8,32); hg.translate(0,-(bpT+8)/2,0); grp.add(new THREE.Mesh(hg,new THREE.MeshPhongMaterial({color:0xf59e0b,shininess:100})));
    const bMat=new THREE.MeshPhongMaterial({color:0x60a5fa,side:THREE.DoubleSide,shininess:60,transparent:true,opacity:0.85});
    for(let i=0;i<Z;i++) grp.add(new THREE.Mesh(buildBlade(bladePts,b1,b2,D1,D2,(2*Math.PI*i)/Z),bMat));
    for(let i=0;i<8;i++){const a=(2*Math.PI*i)/8,r=Deye*0.3; const f=new THREE.Vector3(r*Math.cos(a),b2+50+ex,r*Math.sin(a)), t=new THREE.Vector3(r*Math.cos(a),b2+5+ex,r*Math.sin(a)); grp.add(new THREE.ArrowHelper(new THREE.Vector3().subVectors(t,f).normalize(),f,f.distanceTo(t),0x34d399,5,3));}
    grp.add(new THREE.ArrowHelper(new THREE.Vector3(0,-1,0),new THREE.Vector3(0,b2+65+ex,0),55,0x4ade80,7,4));
    const eyeR=new THREE.Mesh(new THREE.RingGeometry(Deye/2-1,Deye/2+0.5,64),new THREE.MeshBasicMaterial({color:0x34d399,transparent:true,opacity:0.5,side:THREE.DoubleSide})); eyeR.rotation.x=-Math.PI/2; eyeR.position.y=b2+3+ex; grp.add(eyeR);
  }, [Deye,D1,D2,Du,b1,b2,bladePts,Z,tBlade,eyeRise,showShroud,showBackplate,explode,viewTab]);

  const ratios = useMemo(() => ({ D1D2:(D1/D2).toFixed(3), DeyeD1:(Deye/D1).toFixed(3), DuD2:(Du/D2).toFixed(3), b2D2:(b2/D2).toFixed(3), b1b2:(b1/b2).toFixed(2) }), [D1,D2,Deye,Du,b1,b2]);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text }} className="font-sans">
      <div className="px-3 pt-3 pb-1">
        <h1 className="text-sm font-bold" style={{ fontFamily: "monospace" }}><span style={{ color: C.accent }}>◆</span> Impeller 3D Parametric Study</h1>
        <p style={{ color: C.dim, fontFamily: "monospace", fontSize: 9 }}>17개 설계변수 | 숫자 더블클릭: 직접 입력 | 드래그: 회전 | 스크롤: 줌</p>
      </div>
      <div className="px-3 flex gap-0.5">
        {[{l:"3D",c:C.blade},{l:"정면도",c:C.eye},{l:"단면도",c:C.shroud},{l:"저면도",c:C.backplate}].map((t,i)=>
          <Tab key={i} active={viewTab===i} onClick={()=>setViewTab(i)} color={t.c}>{t.l}</Tab>)}
      </div>
      <div className="px-3 py-1">
        <div className="rounded-lg overflow-hidden" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
          {viewTab===0 && <>
            <div ref={mountRef} style={{ width:"100%", height:360 }} />
            <div className="px-2 py-1 flex gap-2 flex-wrap" style={{ borderTop:`1px solid ${C.border}` }}>
              <label className="flex items-center gap-1 text-xs" style={{ fontFamily:"monospace",color:C.dim }}><input type="checkbox" checked={showShroud} onChange={e=>setShowShroud(e.target.checked)} /><span style={{color:C.shroud}}>측판</span></label>
              <label className="flex items-center gap-1 text-xs" style={{ fontFamily:"monospace",color:C.dim }}><input type="checkbox" checked={showBackplate} onChange={e=>setShowBackplate(e.target.checked)} /><span style={{color:C.backplate}}>주판</span></label>
              <label className="flex items-center gap-1 text-xs" style={{ fontFamily:"monospace",color:C.dim }}><input type="checkbox" checked={autoRotate} onChange={e=>setAutoRotate(e.target.checked)} />회전</label>
              <div className="flex items-center gap-1 ml-auto"><span style={{fontFamily:"monospace",fontSize:9,color:C.dim}}>분해</span>
                <input type="range" min={0} max={30} step={1} value={explode} onChange={e=>setExplode(+e.target.value)} className="w-16 h-1" style={{accentColor:C.accent}} /></div>
            </div>
          </>}
          {viewTab===1 && <div className="py-2"><FrontView {...{Deye,D1,D2,Du,b1,b2,bladePts,Z,bladeType,bendPos}} /></div>}
          {viewTab===2 && <div className="py-2"><SectionView {...{Deye,D1,D2,Du,b1,b2,eyeRise}} /></div>}
          {viewTab===3 && <div className="py-2"><BottomView {...{D2,Du,Deye}} /></div>}
        </div>
      </div>
      <div className="px-3 pb-2">
        <div className="rounded-lg p-2" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="grid grid-cols-2 gap-x-3">
            <div>
              <div style={{ color: C.dim, fontFamily: "monospace", fontSize: 9, marginBottom: 2 }}>DIAMETERS</div>
              <S label="D_eye" value={Deye} min={40} max={200} step={1} onChange={setDeye} unit="mm" color={C.eye} />
              <S label="D₁" value={D1} min={50} max={220} step={1} onChange={setD1} unit="mm" color={C.cyan} />
              <S label="D₂" value={D2} min={80} max={320} step={1} onChange={setD2} unit="mm" color={C.blade} />
              <S label="D_u" value={Du} min={80} max={350} step={1} onChange={setDu} unit="mm" color={C.backplate} />
              <div style={{ color: C.dim, fontFamily: "monospace", fontSize: 9, marginTop: 4, marginBottom: 2 }}>WIDTH / SHAPE</div>
              <S label="b₁" value={b1} min={15} max={120} step={1} onChange={setB1} unit="mm" color={C.text} />
              <S label="b₂" value={b2} min={15} max={120} step={1} onChange={setB2} unit="mm" color={C.hub} />
              <S label="Eye R" value={eyeRise} min={0} max={25} step={1} onChange={setEyeRise} unit="mm" color={C.shroud} />
            </div>
            <div>
              <div style={{ color: C.dim, fontFamily: "monospace", fontSize: 9, marginBottom: 2 }}>BLADE</div>
              <S label="β₁" value={beta1} min={10} max={60} step={1} onChange={setBeta1} unit="°" color={C.green} />
              <S label="β₂" value={beta2} min={95} max={170} step={1} onChange={setBeta2} unit="°" color={C.red} />
              <S label="Z" value={Z} min={16} max={48} step={1} onChange={setZ} unit="" color={C.purple} />
              <S label="t" value={tBlade} min={0.3} max={3} step={0.1} onChange={setTBlade} unit="mm" color={C.blade} />
              <div style={{ color: C.dim, fontFamily: "monospace", fontSize: 9, marginTop: 4, marginBottom: 2 }}>PROFILE</div>
              <div className="flex gap-1 mb-1">
                {[{k:'sfs',l:'직선-필렛-직선'},{k:'arc',l:'단일 원호'},{k:'linear',l:'선형 β'}].map(m =>
                  <button key={m.k} onClick={() => setBladeType(m.k)} className="flex-1 py-0.5 rounded"
                    style={{ fontFamily:"monospace", fontSize: 7,
                      background: bladeType===m.k ? C.card : "transparent",
                      color: bladeType===m.k ? C.blade : C.dim,
                      border: `1px solid ${bladeType===m.k ? C.blade : C.border}` }}>{m.l}</button>)}
              </div>
              {bladeType === 'sfs' && (() => {
                const r1mm = D1/2, r2mm = D2/2, rBend = r1mm + bendPos * (r2mm - r1mm);
                return <>
                  <S label="R" value={Rfillet} min={1} max={50} step={1} onChange={setRfillet} unit="mm" color={C.accent} />
                  <S label="Bend" value={bendPos} min={0.15} max={0.85} step={0.01} onChange={setBendPos} unit="" color={C.cyan} />
                  <div style={{ color: C.dim, fontFamily: "monospace", fontSize: 7 }}>
                    절곡 r={rBend.toFixed(1)}mm (D={rBend*2|0}mm) span {(bendPos*100)|0}%
                  </div>
                </>;
              })()}
              {bladeType === 'arc' && <div style={{ color: C.dim, fontFamily: "monospace", fontSize: 7 }}>β₁,β₂ 접선 유일 원호. 프레스 1회 성형.</div>}
              {bladeType === 'linear' && <div style={{ color: C.dim, fontFamily: "monospace", fontSize: 7 }}>β가 r₁→r₂에서 선형 변화.</div>}
            </div>
          </div>
          <div className="mt-2 pt-2 grid grid-cols-5 gap-1" style={{ borderTop: `1px solid ${C.border}` }}>
            {[{l:"D₁/D₂",v:ratios.D1D2,ok:D1/D2>=0.65&&D1/D2<=0.8},{l:"Deye/D₁",v:ratios.DeyeD1,ok:Deye<=D1},{l:"Du/D₂",v:ratios.DuD2,ok:Du>=D2},{l:"b₂/D₂",v:ratios.b2D2,ok:b2/D2>=0.2&&b2/D2<=0.5},{l:"b₁/b₂",v:ratios.b1b2,ok:b1>=b2}].map(m=>
              <div key={m.l} className="text-center py-1 rounded" style={{background:C.bg}}>
                <div style={{color:C.dim,fontFamily:"monospace",fontSize:7}}>{m.l}</div>
                <div className="font-bold" style={{color:m.ok?C.green:C.hub,fontFamily:"monospace",fontSize:11}}>{m.v}</div>
              </div>)}
          </div>
          <div className="mt-2 p-1.5 rounded" style={{ background: C.bg, fontFamily: "monospace", fontSize: 8, color: C.muted }}>
            <span style={{color:C.eye}}>D_eye={Deye}</span> → <span style={{color:C.cyan}}>D₁={D1}</span> → <span style={{color:C.blade}}>D₂={D2}</span> | <span style={{color:C.backplate}}>D_u={Du}</span>{Du>D2?` (+${Du-D2}mm)`:Du<D2?" ⚠":"=D₂"}
            <br/>b₁={b1}→b₂={b2} | β₁={beta1}°→β₂={beta2}° | Z={Z} | t={tBlade}mm | Eye곡면={eyeRise}mm
            <br/>프로파일: <span style={{color:C.blade}}>{bladeType==='sfs'?`직선-필렛-직선 (R=${Rfillet}, Bend=${(bendPos*100)|0}%)`:bladeType==='arc'?'단일 원호':'선형 β'}</span>
            {Deye<D1&&<><br/><span style={{color:C.eye}}>Vaneless: {((D1-Deye)/2).toFixed(1)}mm</span></>}
          </div>
        </div>
      </div>
      <div className="text-center pb-3" style={{color:C.border,fontFamily:"monospace",fontSize:9}}>Impeller 3D Viewer v1.3 — Blade Profile</div>
    </div>
  );
}
