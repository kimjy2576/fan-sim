import { useState, useEffect, useRef, useMemo } from "react";
import * as THREE from "three";

// Light theme colors (compressor-sim compatible palette)
const C = {
  bg: "#ffffff", card: "#f8f9fa", border: "#e5e7eb", text: "#1a1a1a", dim: "#9ca3af", muted: "#6b7280",
  blade: "#2563eb", shroud: "#6b7280", hub: "#d97706",
  backplate: "#7c3aed", eye: "#059669", accent: "#ec4899",
  red: "#dc2626", green: "#059669", cyan: "#2563eb", purple: "#7c3aed", orange: "#ea580c", amber: "#d97706", pink: "#ec4899",
};

// ═══ MATERIAL DATABASE ═══
const MATERIALS = {
  SPCC: { name:"SPCC (냉연강판)", E:200e9, rho:7850, sigma_y:220e6, color:"#94a3b8" },
  SGCC: { name:"SGCC (도금강판)", E:200e9, rho:7850, sigma_y:200e6, color:"#a1a1aa" },
  SUS304: { name:"SUS304", E:193e9, rho:8000, sigma_y:215e6, color:"#d4d4d8" },
  A5052: { name:"A5052 (알루미늄)", E:70e9, rho:2680, sigma_y:195e6, color:"#60a5fa" },
  PP: { name:"PP", E:1.5e9, rho:900, sigma_y:35e6, color:"#4ade80" },
  ABS: { name:"ABS", E:2.3e9, rho:1050, sigma_y:45e6, color:"#fbbf24" },
};

// ═══ CHART COMPONENT ═══
function PQChart({ data, xKey, lines, w = 320, h = 150, xLabel = "", yLabel = "", yRange, markers = [] }) {
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
  return <svg width={w} height={h}>
    {[0,1,2,3,4].map(i => {const v=yMin+(yMax-yMin)*i/4; return <g key={i}>
      <line x1={pad.l} y1={sy(v)} x2={w-pad.r} y2={sy(v)} stroke={C.border} strokeWidth={0.5}/>
      <text x={pad.l-3} y={sy(v)+3} fill={C.dim} fontSize={7} textAnchor="end" fontFamily="'Noto Sans KR', sans-serif">{v<10?v.toFixed(2):v.toFixed(0)}</text></g>;})}
    {lines.map(l => <polyline key={l.key} points={data.map(d=>`${sx(d[xKey])},${sy(d[l.key])}`).join(" ")}
      fill="none" stroke={l.color} strokeWidth={l.w||1.5} strokeDasharray={l.dash||"none"}/>)}
    {markers.map((m,i) => <g key={i}><line x1={sx(m.x)} y1={pad.t} x2={sx(m.x)} y2={pad.t+ch} stroke={m.color||C.amber} strokeWidth={1} strokeDasharray="4,3" opacity={0.6}/>
      <circle cx={sx(m.x)} cy={sy(m.y)} r={3} fill={m.color||C.amber}/>
      {m.label && <text x={sx(m.x)+4} y={sy(m.y)-5} fill={m.color||C.amber} fontSize={7} fontFamily="'Noto Sans KR', sans-serif">{m.label}</text>}</g>)}
    <text x={pad.l+cw/2} y={h-3} fill={C.dim} fontSize={8} textAnchor="middle" fontFamily="'Noto Sans KR', sans-serif">{xLabel}</text>
    <text x={3} y={pad.t+ch/2} fill={C.dim} fontSize={8} textAnchor="middle" fontFamily="'Noto Sans KR', sans-serif" transform={`rotate(-90,3,${pad.t+ch/2})`}>{yLabel}</text>
  </svg>;
}

function VArrow({ x1,y1,x2,y2,color,label,dashed,sw=2 }) {
  const dx=x2-x1,dy=y2-y1,len=Math.sqrt(dx*dx+dy*dy);
  if(len<2) return null;
  const a=Math.atan2(dy,dx),hl=Math.min(7,len*0.18);
  const lx=x2-hl*Math.cos(a-0.4),ly=y2-hl*Math.sin(a-0.4);
  const rx=x2-hl*Math.cos(a+0.4),ry=y2-hl*Math.sin(a+0.4);
  const mx=(x1+x2)/2-dy/len*10,my=(y1+y2)/2+dx/len*10;
  return <g>
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={sw} strokeDasharray={dashed?"5,3":"none"} opacity={dashed?0.6:1}/>
    <polygon points={`${x2},${y2} ${lx},${ly} ${rx},${ry}`} fill={color} opacity={dashed?0.5:0.85}/>
    {label && <text x={mx} y={my} fill={color} fontSize={10} fontWeight="700" textAnchor="middle" fontFamily="'Noto Sans KR', sans-serif">{label}</text>}
  </g>;
}

// ═══ AERO COMPUTE ═══
function computeAero(p) {
  const { D1,D2,b1,b2,beta1,beta2,Z,RPM,tBlade=1,
    cutoffGap=8, Rtongue=5, wrapAngle=360, scrollExpRate=0.12, diffAngle=7, diffLength=40,
    tongueOutLen=35, tongueOutAngle=5, scrollExpMode='uniform', scrollExpPts=null } = p;
  const T=298.15, rho=1.184, mu=1.85e-5;
  const omega=2*Math.PI*RPM/60, r1=D1/2000, r2=D2/2000, b1m=b1/1000, b2m=b2/1000;
  const b1R=beta1*Math.PI/180, b2R=beta2*Math.PI/180;
  const U1=omega*r1, U2=omega*r2;
  const sigma=1-(Math.PI*Math.sin(b2R))/Z;
  const QmaxM3s=Math.PI*(D2/1000)*b2m*U2*1.2;
  const pitch2=Math.PI*(D2/1000)/Z, Dh=2*pitch2*b2m/(pitch2+b2m);
  const tBladeM=tBlade/1000, k_inc=1-(tBladeM/(Math.PI*(D1/1000)/Z))**2;
  const gapM=cutoffGap/1000;
  const wrapFrac=Math.min(1,wrapAngle/360);
  let Lb=0,px=r1,py=0,th=0;
  for(let i=1;i<=20;i++){const t=i/20,r=r1+t*(r2-r1),rP=r1+(i-1)/20*(r2-r1),rM=(r+rP)/2,tM=(t+(i-1)/20)/2,bM=b1R+tM*(b2R-b1R);if(Math.abs(Math.tan(bM))>0.001)th+=(-1/(rM*Math.tan(bM)))*(r-rP);const x=r*Math.cos(th),y=r*Math.sin(th);Lb+=Math.sqrt((x-px)**2+(y-py)**2);px=x;py=y;}
  let bestEta=0, bep=null, bestIdx=0;
  const N=200, pts=[];
  const minBepIdx = Math.floor(N * 0.1); // skip first 10% (shutoff region)
  for(let i=0;i<=N;i++){
    const Qm3s=(i/N)*QmaxM3s,Q=Qm3s*60;
    const Cr1=Qm3s/(Math.PI*(D1/1000)*b1m),Cr2=Qm3s/(Math.PI*(D2/1000)*b2m);
    const Ct2=sigma*U2-Cr2/Math.tan(b2R),C2=Math.sqrt(Cr2**2+Ct2**2);
    const W1=Math.sqrt(Cr1**2+U1**2),W2=Math.sqrt(Cr2**2+(Ct2-U2)**2);
    const Pt_e=rho*U2*Ct2;
    // Impeller losses
    const incA=Math.atan2(Cr1,U1)-b1R; const dPinc=k_inc*0.5*rho*(W1*Math.sin(incA))**2;
    const Wa=(W1+W2)/2,Re=rho*Wa*Dh/mu,f=Re>2300?1/Math.pow(-1.8*Math.log10(6.9/Re+(0.00005/Dh/3.7)**1.11),2):(Re>0?64/Re:0.02);
    const dPfric=f*(Lb/Dh)*0.5*rho*Wa**2;
    const DR=W1>0?1-W2/W1+Math.abs(Ct2)/(2*Z*W1/Math.PI):0;
    const dPrec=DR>0.5?0.0085*(DR-0.5)**2*rho*U2**2:0;
    const ReDisk=rho*omega*r2**2/mu,Cm=ReDisk>0?0.0622/Math.pow(ReDisk,0.2):0.005;
    const Pdf=2*0.5*Cm*rho*omega**3*r2**5,dPdisk=Qm3s>1e-6?Pdf/Qm3s:Pdf/1e-6;
    const eps=0.12+0.5*tBladeM/pitch2,dPjw=0.5*rho*C2**2*eps**2;
    const dPtotImp=dPinc+dPfric+dPrec+Math.min(dPdisk,Pt_e*0.5)+dPjw;
    const Pt_imp=Math.max(0,Pt_e-dPtotImp);
    const Pdyn_imp=0.5*rho*C2**2;

    // Scroll losses
    const Pdyn_cap=Pdyn_imp*wrapFrac;
    const L_scroll=2*Math.PI*r2*wrapFrac;
    const bScrollM=b2m*1.1;
    // Scroll exit radius — depends on expansion mode
    let rExit;
    if (scrollExpMode === 'variable' && scrollExpPts && scrollExpPts.length >= 2) {
      // Integrate variable k(θ) to get exit radius
      const wrapRad = wrapAngle * Math.PI / 180;
      let rAcc = r2 + cutoffGap/1000;
      const nInteg = 20;
      for (let j = 1; j <= nInteg; j++) {
        const dTh = (j / nInteg) * wrapRad;
        const kLocal = interpExpRate(dTh, scrollExpPts, wrapRad);
        rAcc += kLocal * r2 * (wrapRad / nInteg);
      }
      rExit = rAcc;
    } else {
      rExit = r2 + r2 * scrollExpRate * wrapFrac * 2 * Math.PI;
    }
    const A_sc_exit = bScrollM * (rExit - r2); // exit cross-section area
    const A_sc=Math.max(A_sc_exit, Qm3s>0?Qm3s/Math.max(1,C2*0.5):bScrollM*0.02);
    const D_h_sc=2*A_sc/(Math.sqrt(A_sc/bScrollM)+bScrollM);
    const C_sc=Qm3s>0?Qm3s/Math.max(0.0001,A_sc)*0.7:C2*0.5;
    const Re_sc=rho*Math.abs(C_sc)*Math.max(0.005,D_h_sc)/mu;
    const f_sc=Re_sc>2300?0.316/Math.pow(Re_sc,0.25):(Re_sc>0?64/Re_sc:0.02);
    const dP_sc_fric=f_sc*(L_scroll/Math.max(0.005,D_h_sc))*0.5*rho*C_sc**2;
    const dP_sc_mix=0.20*Pdyn_cap;
    const dP_scroll=dP_sc_fric+dP_sc_mix;

    // Tongue recirculation — volumetric efficiency model
    // ε_leak = f(gap/D₂, R_tongue) — fraction of Q that recirculates
    // gap↑ → ε_leak↑ → Q_delivered↓, η↓ | R_tongue↑ → ε_leak↓ (smoother turn)
    const gapRatio = gapM / (2*r2); // δ/D₂
    const eps_leak = Math.min(0.25, 0.82 * Math.pow(gapRatio, 0.7) / (1 + Rtongue/cutoffGap));
    const Q_recirc = Qm3s * eps_leak;
    const Q_delivered = Qm3s * (1 - eps_leak);
    const Q_del_m3min = Q_delivered * 60;
    const dP_tongue = eps_leak * Pt_imp * 0.3; // mixing loss from recirculated flow

    // Diffuser recovery
    const diffAR=diffLength>0?1+2*(diffLength/1000)*Math.tan(Math.abs(diffAngle)*Math.PI/180)/Math.max(0.01,Math.sqrt(A_sc)):1;
    const CpIdeal=diffAR>1?1-1/(diffAR**2):0;
    const etaDiff=Math.abs(diffAngle)<=7?0.75:(Math.abs(diffAngle)<=12?0.6:0.4);
    const dPs_diff=etaDiff*CpIdeal*0.5*rho*C_sc**2;

    // Uncaptured (wrap < 360°)
    const dP_uncap=0.5*rho*(C2*Math.sqrt(1-wrapFrac))**2*(1-wrapFrac);

    // Fan totals
    const Pt_fan=Math.max(0,Pt_imp-dPjw-dP_scroll-dP_tongue-dP_uncap);
    // Exit dynamic pressure: V_exit = Q / A_exit (actual duct velocity)
    // Diffuser increases A_exit → reduces V_exit → reduces Pdyn → increases Ps
    const A_exit = Math.max(0.001, A_sc * Math.max(1, diffAR));
    const V_exit = Q_delivered > 0 ? Q_delivered / A_exit : 0;
    const Pdyn_exit = 0.5 * rho * V_exit**2;
    const Ps = Pt_fan - Pdyn_exit; // Pt = Ps + Pdyn always
    const Pshaft=Qm3s>1e-6?Pt_e*Qm3s+Pdf:Pdf; // shaft sees full Q_impeller
    const eta=Pshaft>0?Math.max(0,Ps*Q_delivered)/Pshaft:0; // η based on Q_delivered
    pts.push({Q:Q_del_m3min,Qm3s:Q_delivered,Pt:Pt_fan,Ps,Pdyn:Pdyn_exit,eta,C2,W1,W2,Ct2,Pt_e,
      dPinc,dPfric,dPrec,dPdisk:Math.min(dPdisk,Pt_e*0.5),dPjw,dP_scroll,dP_tongue,dPs_diff,dP_uncap,Q_recirc,
      Pt_imp, deH:W1>0?W2/W1:1, C2U2:U2>0?C2/U2:0});
    if(i >= minBepIdx && eta>bestEta){bestEta=eta;bestIdx=i;}
  }
  // Parabolic interpolation around peak for smooth BEP
  if(bestIdx>0 && bestIdx<N){
    const a=pts[bestIdx-1].eta, b=pts[bestIdx].eta, c=pts[bestIdx+1].eta;
    const denom=2*(a-2*b+c);
    if(Math.abs(denom)>1e-12){
      const shift=(a-c)/denom;
      // Interpolate from pts
      const lerp = (k) => pts[bestIdx][k] + (shift>0 ? (pts[bestIdx+1][k]-pts[bestIdx][k])*shift : (pts[bestIdx][k]-pts[bestIdx-1][k])*shift);
      const Q = lerp('Q'), Qm3s = lerp('Qm3s'), Pt = lerp('Pt'), Ps = lerp('Ps'), Pdyn = lerp('Pdyn');
      const C2 = lerp('C2'), Ct2 = lerp('Ct2');
      const etaI = b - denom*shift*shift/4;
      bep={...pts[bestIdx], Q,Qm3s,Pt,Ps,Pdyn,eta:Math.max(0,etaI),C2,W1:pts[bestIdx].W1,W2:pts[bestIdx].W2,Ct2};
    } else bep=pts[bestIdx];
  } else bep=pts[bestIdx]||pts[0];

  const sigma_val=sigma;
  const Cr1_bep=bep.Qm3s/(Math.PI*(D1/1000)*b1m), Cr2_bep=bep.Qm3s/(Math.PI*(D2/1000)*b2m);
  const BPF=Z*RPM/60, Ns=bep.Qm3s>0?RPM*Math.sqrt(bep.Qm3s)/Math.pow(Math.max(1,bep.Pt)/rho,0.75):0;
  const dR=cutoffGap/(D2/2);
  const SPL=(bep.Qm3s>0&&bep.Pt>0?10*Math.log10(bep.Pt**2*bep.Qm3s/(rho*343**3))+56:30)-20*Math.log10(Math.max(0.03,dR)/0.10)-5*Math.log10(1+Rtongue/Math.max(1,cutoffGap));
  return { bep,pts,BPF,SPL,Ns,U1,U2,omega,Lb,rho,sigma:sigma_val,Cr1_bep,Cr2_bep };
}

// ═══ STRUCTURAL MODEL ═══
function computeStructure(p, aero, mat) {
  const { D1,D2,b1,b2,Z,tBlade=1 } = p;
  const { omega,bep,Lb } = aero;
  const r1=D1/2000,r2=D2/2000,b_avg=(b1+b2)/2/1000,t=tBlade/1000;
  const sigma_c=mat.rho*omega**2*(r2**2-r1**2)/2;
  const F_aero=bep.Pt>0?bep.Pt/Z*b_avg*Lb:0;
  const S_sec=t**2*b_avg/6;
  const sigma_b=S_sec>0?F_aero*Lb/2/S_sec:0;
  const sigma_total=sigma_c+sigma_b;
  const SF=sigma_total>0?mat.sigma_y/sigma_total:999;
  const I_blade=t**3*b_avg/12, A_blade=t*b_avg;
  const f_n=Lb>0?(1.8751**2)/(2*Math.PI*Lb**2)*Math.sqrt(mat.E*I_blade/(mat.rho*A_blade)):0;
  const BPF=aero.BPF;
  const resMargin=BPF>0?Math.abs(f_n-BPF)/BPF:1;
  const bladeMass=mat.rho*t*b_avg*Lb*Z;
  return { sigma_c:sigma_c/1e6, sigma_b:sigma_b/1e6, sigma_total:sigma_total/1e6, SF, f_n, resMargin, bladeMass:bladeMass*1000, SF_ok:SF>2, res_ok:resMargin>0.15 };
}

// ═══ SWEEP VARS ═══
const SWEEP_VARS = [
  {key:'D2',label:'D₂',unit:'mm',min:100,max:300,step:5},
  {key:'D1',label:'D₁',unit:'mm',min:60,max:200,step:5},
  {key:'Deye',label:'D_eye',unit:'mm',min:60,max:180,step:5},
  {key:'b1',label:'b₁',unit:'mm',min:15,max:120,step:5},
  {key:'b2',label:'b₂',unit:'mm',min:20,max:100,step:5},
  {key:'beta2',label:'β₂',unit:'°',min:20,max:180,step:5},
  {key:'beta1',label:'β₁',unit:'°',min:5,max:85,step:5},
  {key:'Z',label:'Z',unit:'',min:16,max:48,step:2},
  {key:'RPM',label:'RPM',unit:'',min:400,max:3000,step:100},
  {key:'tBlade',label:'t',unit:'mm',min:0.3,max:3.0,step:0.1},
  {key:'cutoffGap',label:'δ',unit:'mm',min:2,max:30,step:1},
  {key:'cutoffAngle',label:'θ_cut',unit:'°',min:0,max:360,step:10},
  {key:'Rtongue',label:'R_tongue',unit:'mm',min:1,max:20,step:1},
  {key:'exitAngle',label:'θ_exit',unit:'°',min:0,max:360,step:10},
  {key:'tongueOutLen',label:'외면 L',unit:'mm',min:0,max:200,step:5},
  {key:'tongueOutAngle',label:'외면 α',unit:'°',min:-90,max:90,step:5},
  {key:'scrollEndAngle',label:'θ_end',unit:'°',min:0,max:720,step:10},
  {key:'scrollExpRate',label:'팽창률',unit:'',min:0.02,max:0.3,step:0.01},
  {key:'bScroll',label:'폭',unit:'mm',min:30,max:120,step:5},
  {key:'diffAngle',label:'Diff α',unit:'°',min:0,max:30,step:1},
  {key:'diffLength',label:'Diff L',unit:'mm',min:0,max:300,step:10},
];

// ═══ MINI CHART ═══
function MiniChart({data,xKey,yKey,w=160,h=100,color=C.blade,label,yUnit=''}){
  if(!data||data.length<2) return null;
  const xs=data.map(d=>d[xKey]),ys=data.map(d=>d[yKey]).filter(isFinite);
  const xMin=Math.min(...xs),xMax=Math.max(...xs),yMin=Math.min(...ys),yMax=Math.max(...ys);
  const big=w>200;
  const p={l:big?42:32,r:big?12:6,t:big?20:14,b:big?22:16},pw=w-p.l-p.r,ph=h-p.t-p.b;
  const sx=v=>p.l+(v-xMin)/((xMax-xMin)||1)*pw, sy=v=>p.t+ph-(v-yMin)/((yMax-yMin)||1)*ph;
  const pts=data.map(d=>`${sx(d[xKey])},${sy(d[yKey])}`).join(' ');
  const fs=big?9:7, dotR=big?2.5:1.5, lw=big?2:1.5;
  // Grid lines
  const gridY = big ? 4 : 2;
  return <svg width={w} height={h} style={{display:"block",margin:"0 auto"}}>
    <text x={w/2} y={big?14:10} fill={C.muted} fontSize={big?10:7} fontFamily="'Noto Sans KR', sans-serif" textAnchor="middle" fontWeight={big?"bold":"normal"}>{label}</text>
    {Array.from({length:gridY+1}).map((_,i) => {
      const y = p.t + (ph/gridY)*i;
      const val = yMax - (yMax-yMin)*(i/gridY);
      return <g key={i}><line x1={p.l} y1={y} x2={p.l+pw} y2={y} stroke={C.border} strokeWidth={0.3}/>
        <text x={p.l-3} y={y+3} fill={C.dim} fontSize={fs-2} fontFamily="'Noto Sans KR', sans-serif" textAnchor="end">{val.toFixed(yMax-yMin>10?0:1)}</text></g>;
    })}
    <line x1={p.l} y1={p.t} x2={p.l} y2={p.t+ph} stroke={C.border} strokeWidth={0.5}/>
    <line x1={p.l} y1={p.t+ph} x2={p.l+pw} y2={p.t+ph} stroke={C.border} strokeWidth={0.5}/>
    <polyline points={pts} fill="none" stroke={color} strokeWidth={lw}/>
    {data.map((d,i)=><circle key={i} cx={sx(d[xKey])} cy={sy(d[yKey])} r={dotR} fill={color} opacity={0.8}/>)}
    <text x={p.l} y={h-3} fill={C.dim} fontSize={fs-1} fontFamily="'Noto Sans KR', sans-serif">{xMin}</text>
    <text x={p.l+pw} y={h-3} fill={C.dim} fontSize={fs-1} fontFamily="'Noto Sans KR', sans-serif" textAnchor="end">{xMax}</text>
  </svg>;
}

function S({ label, value, min, max, step, onChange, unit, color }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const startEdit = () => { setEditing(true); setText(String(value)); };
  const endEdit = () => { setEditing(false); const v = parseFloat(text); if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v))); };
  const onKey = (e) => { if (e.key === 'Enter') endEdit(); if (e.key === 'Escape') setEditing(false); };
  // compressor-sim 'sr' structure: label + number input on top, range slider below
  return (
    <div className="sr">
      <div className="sr-t">
        <span className="sr-l">{label}{unit ? <span style={{fontSize:13,color:'var(--tx3)',marginLeft:2}}> [{unit}]</span> : ''}</span>
        <input className="sr-i" type="number" value={value} step={step}
          onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v))); }} />
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)}
        style={{accentColor: color || 'var(--accent)', width:'100%'}} />
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

function buildBlade(pts, b1, b2, D1, D2, angle, leanDeg = 0) {
  const r1 = D1 / 2, r2 = D2 / 2, v = [], idx = [];
  const leanRad = leanDeg * Math.PI / 180; // circumferential lean
  for (let i = 0; i < pts.length; i++) {
    const r = pts[i].r;
    const thBot = pts[i].theta + angle; // bottom edge (backplate)
    const tf = Math.max(0, Math.min(1, (r - r1) / (r2 - r1)));
    const h = b1 + tf * (b2 - b1);
    const thTop = thBot + leanRad; // top edge (shroud) shifted by lean
    const xBot = r * Math.cos(thBot), zBot = r * Math.sin(thBot);
    const xTop = r * Math.cos(thTop), zTop = r * Math.sin(thTop);
    v.push(xBot, 0, zBot); // bottom vertex
    v.push(xTop, h, zTop); // top vertex (leaned)
  }
  for (let i = 0; i < pts.length - 1; i++) { const a = i * 2; idx.push(a, a + 2, a + 3); idx.push(a, a + 3, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

// ═══ SCROLL GEOMETRY ═══
// Monotone cubic interpolation for k(θ)
function interpExpRate(dTheta, expPts, wrapRad) {
  if (!expPts || expPts.length < 2) return 0.12;
  // Sort by angle, normalize to 0~wrapRad
  const sorted = [...expPts].sort((a,b) => a.a - b.a);
  const xs = sorted.map(p => p.a * Math.PI / 180); // control angles in rad
  const ys = sorted.map(p => p.k); // k values
  // Clamp
  if (dTheta <= xs[0]) return ys[0];
  if (dTheta >= xs[xs.length-1]) return ys[ys.length-1];
  // Find segment
  let seg = 0;
  for (let i = 0; i < xs.length - 1; i++) { if (dTheta >= xs[i] && dTheta <= xs[i+1]) { seg = i; break; } }
  // Linear interp (simple, stable)
  const t = (dTheta - xs[seg]) / (xs[seg+1] - xs[seg] || 1);
  // Smoothstep for C1 continuity
  const s = t * t * (3 - 2 * t);
  return ys[seg] + s * (ys[seg+1] - ys[seg]);
}

function scrollProfile(r2, wrapDeg, type, bScroll, startDeg = 0, cutoffGap = 8, Rtongue = 5, expRate = 0.12, nSeg = 72, expMode = 'uniform', expPts = null) {
  const rStart = r2 + cutoffGap;
  const wrapRad = wrapDeg * Math.PI / 180;
  const startRad = startDeg * Math.PI / 180;
  const pts = [];

  if (type === 'cv') {
    if (expMode === 'variable' && expPts && expPts.length >= 2) {
      // Variable expansion: integrate k(θ) along θ
      let r = rStart;
      for (let i = 0; i <= nSeg; i++) {
        const dTheta = (i / nSeg) * wrapRad;
        const theta = startRad + dTheta;
        if (i > 0) {
          const dTh = wrapRad / nSeg;
          const kLocal = interpExpRate(dTheta, expPts, wrapRad) * r2;
          r += kLocal * dTh;
        }
        pts.push({ theta, r });
      }
    } else {
      // Uniform expansion
      const k = r2 * expRate;
      for (let i = 0; i <= nSeg; i++) {
        const dTheta = (i / nSeg) * wrapRad;
        const theta = startRad + dTheta;
        const r = rStart + k * dTheta;
        pts.push({ theta, r });
      }
    }
  } else {
    if (expMode === 'variable' && expPts && expPts.length >= 2) {
      let r = rStart;
      for (let i = 0; i <= nSeg; i++) {
        const dTheta = (i / nSeg) * wrapRad;
        const theta = startRad + dTheta;
        if (i > 0) {
          const dTh = wrapRad / nSeg;
          const alphaLocal = interpExpRate(dTheta, expPts, wrapRad) * 50 * Math.PI / 180;
          r *= Math.exp(dTh * Math.tan(alphaLocal));
        }
        pts.push({ theta, r });
      }
    } else {
      const alpha = expRate * 50 * Math.PI / 180;
      for (let i = 0; i <= nSeg; i++) {
        const dTheta = (i / nSeg) * wrapRad;
        const theta = startRad + dTheta;
        const r = rStart * Math.exp(dTheta * Math.tan(alpha));
        pts.push({ theta, r });
      }
    }
  }
  return pts;
}

function buildScrollMesh(scrollPts, bScroll, scrollGapF, scrollGapB, crossSection) {
  // Build 3D scroll casing as a series of connected quads
  const n = scrollPts.length;
  if (n < 2) return null;

  const wallThick = 2; // mm
  const yBot = -scrollGapB - wallThick; // bottom of casing wall
  const yTop = bScroll + scrollGapF + wallThick; // top of casing wall

  const verts = [];
  const idx = [];

  for (let i = 0; i < n; i++) {
    const { theta, r } = scrollPts[i];
    const rOuter = r + wallThick;
    const cosT = Math.cos(theta), sinT = Math.sin(theta);

    if (crossSection === 'rect') {
      // 4 corners per section: bottom-inner, bottom-outer, top-outer, top-inner
      verts.push(r * cosT, yBot, r * sinT);       // 0: bot inner
      verts.push(rOuter * cosT, yBot, rOuter * sinT); // 1: bot outer
      verts.push(rOuter * cosT, yTop, rOuter * sinT); // 2: top outer
      verts.push(r * cosT, yTop, r * sinT);       // 3: top inner
    } else {
      // Circular: approximate with 8 points around semicircle
      const cx_r = (r + rOuter) / 2;
      const cy = (yBot + yTop) / 2;
      const rx = (rOuter - r) / 2;
      const ry = (yTop - yBot) / 2;
      for (let j = 0; j < 8; j++) {
        const a = (j / 7) * Math.PI * 2;
        const pr = cx_r + rx * Math.cos(a);
        const py = cy + ry * Math.sin(a);
        verts.push(pr * cosT, py, pr * sinT);
      }
    }
  }

  const ppSec = crossSection === 'rect' ? 4 : 8; // points per section

  // Connect adjacent sections with quads
  for (let i = 0; i < n - 1; i++) {
    const base = i * ppSec, next = (i + 1) * ppSec;
    for (let j = 0; j < ppSec; j++) {
      const j2 = (j + 1) % ppSec;
      const a = base + j, b = base + j2, c = next + j2, d = next + j;
      idx.push(a, d, c); idx.push(a, c, b);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function Tab({ active, onClick, children, color }) {
  return <button onClick={onClick} className="px-3 py-1 text-xs rounded-t" style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize:13,
    background: active ? C.card : "transparent", color: active ? (color || C.text) : C.dim,
    borderBottom: active ? `2px solid ${color || C.blade}` : "2px solid transparent" }}>{children}</button>;
}

function FrontView({ Deye, D1, D2, Du, bladePts, Z, bladeType, bendPos, showScroll, scrollType, wrapAngle, cutoffGap, cutoffAngle, Rtongue, tongueOutLen, tongueOutAngle, diffAngle, diffLength, diffType, diffInnerWall, showCasing, casingW, casingH, casingCX, casingCY, scrollExpRate, exitAngle, scrollExpMode, scrollExpPts }) {
  const w = 340, h = 280;
  const sPts = showScroll ? scrollProfile(D2/2, wrapAngle, scrollType, 55, cutoffAngle, cutoffGap, Rtongue, scrollExpRate, 72, scrollExpMode, scrollExpPts) : [];
  const scrollMaxR = showScroll && sPts.length > 0 ? Math.max(Du/2, ...sPts.map(p=>p.r)) + 10 : Math.max(D2, Du) / 2;
  const maxR = showCasing ? Math.max(scrollMaxR, casingW/2, casingH/2) : scrollMaxR;
  const sc = (Math.min(w, h) / 2 - 25) / maxR;
  // Impeller center position (offset by casing center)
  const cx = w / 2 + casingCX * sc * (showCasing ? 1 : 0);
  const cy = h / 2 + 10 - casingCY * sc * (showCasing ? 1 : 0);
  const rBend = D1/2 + bendPos * (D2/2 - D1/2);
  const tongueTheta = cutoffAngle * Math.PI / 180;
  const rTongue = D2/2 + cutoffGap + Rtongue; // tip center = r₂ + δ + R
  return <svg width={w} height={h} style={{ display: "block", margin: "0 auto" }}>
    <text x={w/2} y={16} fill={C.dim} fontSize={9} fontFamily="'Noto Sans KR', sans-serif" textAnchor="middle">정면도 (Front — Eye 방향에서 본 모습)</text>
    {/* Casing box */}
    {showCasing && <rect x={w/2 - casingW/2*sc} y={h/2+10 - casingH/2*sc} width={casingW*sc} height={casingH*sc}
      fill="none" stroke="#4488aa" strokeWidth={1.5} opacity={0.5} rx={2} />}
    {showCasing && <>
      <text x={w/2} y={h/2+10 + casingH/2*sc + 12} fill="#4488aa" fontSize={7} fontFamily="'Noto Sans KR', sans-serif" textAnchor="middle">{casingW}×{casingH}mm</text>
      {/* Center crosshair */}
      <line x1={cx-4} y1={cy} x2={cx+4} y2={cy} stroke="#4488aa" strokeWidth={0.5} opacity={0.3} />
      <line x1={cx} y1={cy-4} x2={cx} y2={cy+4} stroke="#4488aa" strokeWidth={0.5} opacity={0.3} />
    </>}
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
    <text x={cx} y={cy + 3} fill={C.green} fontSize={8} fontFamily="'Noto Sans KR', sans-serif" textAnchor="middle" opacity={0.5}>AIR IN ⊙</text>
    {/* Axis lines: θ_cut and θ_exit */}
    {showScroll && (() => {
      const cutRad = cutoffAngle * Math.PI / 180;
      const exitRad = exitAngle * Math.PI / 180;
      const axLen = maxR * sc * 0.95;
      return <>
        {/* θ_exit axis */}
        <line x1={cx} y1={cy} x2={cx + axLen * Math.cos(exitRad)} y2={cy - axLen * Math.sin(exitRad)}
          stroke="#d4a44a" strokeWidth={1} strokeDasharray="6,3" opacity={0.4} />
        <text x={cx + (axLen+8) * Math.cos(exitRad)} y={cy - (axLen+8) * Math.sin(exitRad)}
          fill="#d4a44a" fontSize={6} fontFamily="'Noto Sans KR', sans-serif" textAnchor="middle" opacity={0.6}>θ_exit={exitAngle}°</text>
        {/* θ_cut axis */}
        <line x1={cx} y1={cy} x2={cx + axLen * 0.5 * Math.cos(cutRad)} y2={cy - axLen * 0.5 * Math.sin(cutRad)}
          stroke={C.red} strokeWidth={0.8} strokeDasharray="4,3" opacity={0.3} />
      </>;
    })()}
    {/* Scroll spiral */}
    {showScroll && sPts.length > 1 && <path d={sPts.map((p,i) => {
      const x = cx + p.r * Math.cos(p.theta) * sc, y = cy - p.r * Math.sin(p.theta) * sc;
      return `${i===0?'M':'L'} ${x} ${y}`;
    }).join(' ')} fill="none" stroke="#d4a44a" strokeWidth={1.5} opacity={0.6} />}
    {/* Diffuser */}
    {showScroll && sPts.length > 1 && (() => {
      const endPt = sPts[sPts.length - 1];
      // Diffuser direction = user-defined exitAngle (absolute axis)
      const exitDir = exitAngle * Math.PI / 180;
      const exitTheta = endPt.theta; // scroll endpoint angle (for positioning)
      // Scroll exit opening: inner wall (tongue) to outer wall (spiral end)
      const rInner = rTongue;
      const rOuter = endPt.r;
      const innerX = cx + rInner * Math.cos(exitTheta) * sc;
      const innerY = cy - rInner * Math.sin(exitTheta) * sc;
      const outerX = cx + rOuter * Math.cos(exitTheta) * sc;
      const outerY = cy - rOuter * Math.sin(exitTheta) * sc;
      const exitW = (rOuter - rInner) * sc;
      const dL = diffLength * sc;
      const halfA = diffAngle * Math.PI / 180;
      // Diffuser walls along exitDir
      const dx = Math.cos(exitDir), dy = -Math.sin(exitDir);
      const nx = Math.cos(exitDir - Math.PI/2), ny = -Math.sin(exitDir - Math.PI/2); // perpendicular
      // Inner wall end
      const iEndX = innerX + dL * dx - (diffType !== 'single' ? 0 : dL * Math.tan(halfA) * nx * 0.5);
      const iEndY = innerY + dL * dy - (diffType !== 'single' ? 0 : dL * Math.tan(halfA) * ny * 0.5);
      // Outer wall end
      const oEndX = outerX + dL * dx + dL * Math.tan(halfA) * nx;
      const oEndY = outerY + dL * dy + dL * Math.tan(halfA) * ny;

      if (diffType === 'round') {
        return <g opacity={0.5}>
          {diffInnerWall && <path d={`M${innerX} ${innerY} Q${innerX + dL*0.5*dx} ${innerY + dL*0.5*dy} ${iEndX} ${iEndY}`} fill="none" stroke="#d4a44a" strokeWidth={1.2} />}
          <path d={`M${outerX} ${outerY} Q${outerX + dL*0.5*dx + dL*0.3*Math.tan(halfA)*nx} ${outerY + dL*0.5*dy + dL*0.3*Math.tan(halfA)*ny} ${oEndX} ${oEndY}`} fill="none" stroke="#d4a44a" strokeWidth={1.2} />
          <line x1={diffInnerWall?iEndX:innerX} y1={diffInnerWall?iEndY:innerY} x2={oEndX} y2={oEndY} stroke="#d4a44a" strokeWidth={1} strokeDasharray="3,2" />
          {!diffInnerWall && <text x={(innerX+outerX)/2-10} y={(innerY+outerY)/2} fill="#d4a44a" fontSize={5} fontFamily="'Noto Sans KR', sans-serif">개방</text>}
        </g>;
      }
      if (diffType === 'stepped') {
        const midL = dL * 0.5;
        const stepX = halfA > 0 ? dL * Math.tan(halfA) * nx * 0.5 : 0;
        const stepY = halfA > 0 ? dL * Math.tan(halfA) * ny * 0.5 : 0;
        return <g opacity={0.5}>
          <path d={`M${outerX} ${outerY} L${outerX + midL*dx} ${outerY + midL*dy} L${outerX + midL*dx + stepX} ${outerY + midL*dy + stepY} L${oEndX} ${oEndY}`} fill="none" stroke="#d4a44a" strokeWidth={1.2} />
          {diffInnerWall && <line x1={innerX} y1={innerY} x2={iEndX} y2={iEndY} stroke="#d4a44a" strokeWidth={1.2} />}
          <line x1={diffInnerWall?iEndX:innerX} y1={diffInnerWall?iEndY:innerY} x2={oEndX} y2={oEndY} stroke="#d4a44a" strokeWidth={1} strokeDasharray="3,2" />
          {!diffInnerWall && <text x={(innerX+outerX)/2-10} y={(innerY+outerY)/2} fill="#d4a44a" fontSize={5} fontFamily="'Noto Sans KR', sans-serif">개방</text>}
        </g>;
      }
      // Single
      return <g opacity={0.5}>
        {diffInnerWall && <line x1={innerX} y1={innerY} x2={iEndX} y2={iEndY} stroke="#d4a44a" strokeWidth={1.2} />}
        <line x1={outerX} y1={outerY} x2={oEndX} y2={oEndY} stroke="#d4a44a" strokeWidth={1.2} />
        <line x1={diffInnerWall?iEndX:innerX} y1={diffInnerWall?iEndY:innerY} x2={oEndX} y2={oEndY} stroke="#d4a44a" strokeWidth={1} strokeDasharray="3,2" />
        <text x={(oEndX)+6} y={(oEndY)} fill="#d4a44a" fontSize={5} fontFamily="'Noto Sans KR', sans-serif">출구</text>
        {!diffInnerWall && <text x={(innerX+outerX)/2-10} y={(innerY+outerY)/2} fill="#d4a44a" fontSize={5} fontFamily="'Noto Sans KR', sans-serif">개방</text>}
      </g>;
    })()}
    {/* Tongue — inner face → tip round arc → outer face */}
    {showScroll && (() => {
      // Tip center position
      const tipX = cx + rTongue * Math.cos(tongueTheta) * sc;
      const tipY = cy - rTongue * Math.sin(tongueTheta) * sc;
      const R = Math.max(2, Rtongue * sc); // tip round radius in SVG
      const endPt = sPts.length > 0 ? sPts[sPts.length - 1] : null;
      const endX = endPt ? cx + endPt.r * Math.cos(endPt.theta) * sc : tipX;
      const endY = endPt ? cy - endPt.r * Math.sin(endPt.theta) * sc : tipY;
      const d2X = cx + (D2/2) * Math.cos(tongueTheta) * sc;
      const d2Y = cy - (D2/2) * Math.sin(tongueTheta) * sc;

      // Radial direction (outward from impeller center)
      const radOut = tongueTheta; // toward outer
      const radIn = tongueTheta + Math.PI; // toward impeller center

      // Inner face: on impeller-side of tip, going tangentially into scroll
      const inDir = tongueTheta + Math.PI / 2;
      const inStartX = tipX + R * Math.cos(radIn); // offset by R toward impeller
      const inStartY = tipY - R * Math.sin(radIn);
      const inLen = 22 * sc;
      const inEndX = inStartX + inLen * Math.cos(inDir);
      const inEndY = inStartY - inLen * Math.sin(inDir);

      // Outer face direction = exitAngle + tongueOutAngle (relative to exit axis)
      const outFaceDir = (exitAngle + tongueOutAngle) * Math.PI / 180;

      // Outer face: on outer-side of tip, going toward diffuser exit
      const outStartX = tipX + R * Math.cos(radOut); // offset by R toward outside
      const outStartY = tipY - R * Math.sin(radOut);
      const outLen = tongueOutLen * sc;
      const outEndX = outStartX + outLen * Math.cos(outFaceDir);
      const outEndY = outStartY + outLen * Math.sin(outFaceDir);

      // Arc from inner start → outer start (around tip center)
      const arcAngIn = Math.atan2(inStartY - tipY, inStartX - tipX);
      const arcAngOut = Math.atan2(outStartY - tipY, outStartX - tipX);
      let arcSweep = arcAngOut - arcAngIn;
      // Go the short way around (should be ~180° for typical geometry)
      if (arcSweep > Math.PI) arcSweep -= 2 * Math.PI;
      if (arcSweep < -Math.PI) arcSweep += 2 * Math.PI;
      const nArc = 16;
      const arcPath = Array.from({length: nArc + 1}, (_, i) => {
        const a = arcAngIn + (i / nArc) * arcSweep;
        return `${i === 0 ? 'M' : 'L'} ${tipX + R * Math.cos(a)} ${tipY + R * Math.sin(a)}`;
      }).join(' ');

      return <>
        {/* Closing wall: scroll end → tongue */}
        <line x1={endX} y1={endY} x2={outStartX} y2={outStartY} stroke="#d4a44a" strokeWidth={1} opacity={0.5} />

        {/* Inner face (scroll side) — starts R away from tip center */}
        <line x1={inStartX} y1={inStartY} x2={inEndX} y2={inEndY}
          stroke={C.red} strokeWidth={1.5} opacity={0.7} />

        {/* Tip round arc — connects inner to outer */}
        <path d={arcPath} fill="none" stroke={C.red} strokeWidth={1.5} opacity={0.8} />

        {/* Outer face (diffuser side) — starts R away from tip center */}
        <line x1={outStartX} y1={outStartY} x2={outEndX} y2={outEndY}
          stroke={C.red} strokeWidth={1.5} opacity={0.7} />

        {/* Cutoff gap */}
        <line x1={d2X} y1={d2Y} x2={tipX} y2={tipY} stroke={C.red} strokeWidth={0.5} strokeDasharray="2,2" opacity={0.4} />
        {/* Tip center dot */}
        <circle cx={tipX} cy={tipY} r={1.5} fill={C.red} opacity={0.4} />

        {/* Labels */}
        <text x={(d2X+tipX)/2+6} y={(d2Y+tipY)/2-4} fill={C.red} fontSize={6} fontFamily="'Noto Sans KR', sans-serif" opacity={0.7}>δ={cutoffGap}</text>
        <text x={tipX+R+3} y={tipY-R-2} fill={C.red} fontSize={5} fontFamily="'Noto Sans KR', sans-serif" opacity={0.5}>R={Rtongue}</text>
        <text x={inEndX+4} y={inEndY} fill={C.red} fontSize={5} fontFamily="'Noto Sans KR', sans-serif" opacity={0.4}>내면</text>
        <text x={outEndX+4} y={outEndY} fill={C.red} fontSize={5} fontFamily="'Noto Sans KR', sans-serif" opacity={0.4}>외면</text>
      </>;
    })()}
    <text x={cx} y={cy + D2/2*sc + 18} fill={C.blade} fontSize={8} fontFamily="'Noto Sans KR', sans-serif" textAnchor="middle">D₂={D2}mm</text>
    <text x={cx} y={cy + D2/2*sc + 30} fill={C.eye} fontSize={8} fontFamily="'Noto Sans KR', sans-serif" textAnchor="middle">D_eye={Deye}mm</text>
    {bladeType==='sfs' && <text x={cx} y={cy - rBend*sc - 4} fill={C.accent} fontSize={7} fontFamily="'Noto Sans KR', sans-serif" textAnchor="middle" opacity={0.6}>Bend D={rBend*2|0}mm</text>}
    {Du > D2 && <text x={cx} y={cy - Du/2*sc - 6} fill={C.accent} fontSize={7} fontFamily="'Noto Sans KR', sans-serif" textAnchor="middle">D_u={Du}mm (+{Du-D2})</text>}
  </svg>;
}

function SectionView({ Deye, D1, D2, Du, b1, b2, eyeRise, showScroll, scrollGapF, scrollGapB, bScroll, hubDepth, hubFillet }) {
  const w = 340, h = 200, cx = w / 2, cy = h / 2 + 10;
  const maxR = Math.max(D2, Du) / 2; const sc = (w / 2 - 30) / maxR;
  const bSc = (h - 70) / Math.max(b1, b2, b1 + eyeRise);
  const rE = Deye/2*sc, r1s = D1/2*sc, r2s = D2/2*sc, rU = Du/2*sc;
  const h1 = b1*bSc*0.5, h2 = b2*bSc*0.5, hubR = rE*0.4;
  const eyeH = eyeRise * bSc * 0.5; // eye rise in SVG units
  // Eye curve control point offset
  const eyeCurveR = eyeRise * 0.8 * sc; // radial spread of curve
  return <svg width={w} height={h} style={{ display: "block", margin: "0 auto" }}>
    <text x={w/2} y={14} fill={C.dim} fontSize={9} fontFamily="'Noto Sans KR', sans-serif" textAnchor="middle">단면도 (Section View)</text>
    <line x1={cx} y1={22} x2={cx} y2={h-8} stroke={C.dim} strokeWidth={0.5} strokeDasharray="4,3" opacity={0.3} />
    <text x={cx+3} y={26} fill={C.dim} fontSize={7} fontFamily="'Noto Sans KR', sans-serif">CL</text>
    {[1, -1].map(s => <g key={s}>
      <path d={`M${cx+s*rE} ${cy-h1-eyeH} Q${cx+s*(rE+eyeCurveR*0.5)} ${cy-h1-eyeH*0.2} ${cx+s*(rE+eyeCurveR)} ${cy-h1} L${cx+s*r2s} ${cy-h2}`} fill="none" stroke={C.shroud} strokeWidth={1.5} />
      <line x1={cx+s*rU} y1={cy+h2} x2={cx+s*hubR} y2={cy+h1} stroke={C.backplate} strokeWidth={1.5} />
      {Du>D2 && <line x1={cx+s*rU} y1={cy+h2} x2={cx+s*r2s} y2={cy+h2} stroke={C.accent} strokeWidth={1.5} strokeDasharray="3,2" />}
      <line x1={cx+s*r2s} y1={cy-h2} x2={cx+s*r2s} y2={cy+h2} stroke={C.blade} strokeWidth={1} opacity={0.5} />
      <line x1={cx+s*r1s} y1={cy-h1} x2={cx+s*r1s} y2={cy+h1} stroke={C.cyan} strokeWidth={0.7} opacity={0.3} strokeDasharray="2,2" />
      <line x1={cx+s*rE*0.6} y1={cy-h1-eyeH-15} x2={cx+s*rE*0.6} y2={cy-h1-eyeH+2} stroke={C.green} strokeWidth={1.5} opacity={0.6} markerEnd="url(#aS)" />
      <line x1={cx+s*(r2s+6)} y1={cy} x2={cx+s*(r2s+18)} y2={cy} stroke={C.green} strokeWidth={1} opacity={0.4} markerEnd="url(#aS)" />
      {/* Scroll casing walls */}
      {showScroll && (() => {
        const gF = scrollGapF * bSc * 0.5; // front gap in SVG
        const gB = scrollGapB * bSc * 0.5; // back gap in SVG
        const wt = 3; // wall thickness SVG
        const rScr = r2s + 8; // scroll outer wall
        return <>
          {/* Top wall */}
          <line x1={cx+s*rE} y1={cy-h2-gF} x2={cx+s*rScr} y2={cy-h2-gF} stroke="#d4a44a" strokeWidth={1.5} opacity={0.5} />
          {/* Bottom wall */}
          <line x1={cx+s*hubR} y1={cy+h2+gB} x2={cx+s*rScr} y2={cy+h2+gB} stroke="#d4a44a" strokeWidth={1.5} opacity={0.5} />
          {/* Outer wall */}
          <line x1={cx+s*rScr} y1={cy-h2-gF} x2={cx+s*rScr} y2={cy+h2+gB} stroke="#d4a44a" strokeWidth={1.5} opacity={0.5} />
          {/* Gap arrows */}
          {gF > 2 && <text x={cx+s*(r2s+rScr)/2} y={cy-h2-gF/2+3} fill="#d4a44a" fontSize={5} fontFamily="'Noto Sans KR', sans-serif" textAnchor="middle">δ_f={scrollGapF}</text>}
          {gB > 2 && <text x={cx+s*(r2s+rScr)/2} y={cy+h2+gB/2+3} fill="#d4a44a" fontSize={5} fontFamily="'Noto Sans KR', sans-serif" textAnchor="middle">δ_b={scrollGapB}</text>}
        </>;
      })()}
    </g>)}
    <defs><marker id="aS" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={5} markerHeight={5} orient="auto"><path d="M0 0L10 5L0 10z" fill={C.green} opacity={0.5} /></marker></defs>
    <rect x={cx-r2s} y={cy-h2} width={r2s*2} height={h2+h1} fill={C.blade} opacity={0.06} rx={1} />
    <rect x={cx-hubR} y={cy+h1} width={hubR*2} height={4} fill={C.border} stroke={C.hub} strokeWidth={0.8} rx={1} />
    {/* Inlet hub depth */}
    {hubDepth > 0 && (() => {
      const hD = hubDepth * bSc * 0.5;
      const hTopR = hubR * 0.3;
      const fR = hubFillet * bSc * 0.5;
      return <>
        {[-1,1].map(s => <path key={s} d={`M${cx+s*hubR} ${cy+h1} L${cx+s*hubR} ${cy+h1-hD+fR} Q${cx+s*hubR} ${cy+h1-hD} ${cx+s*(hubR-fR)} ${cy+h1-hD} L${cx+s*hTopR} ${cy+h1-hD}`}
          fill="none" stroke={C.hub} strokeWidth={1.2} />)}
        <line x1={cx-hTopR} y1={cy+h1-hD} x2={cx+hTopR} y2={cy+h1-hD} stroke={C.hub} strokeWidth={1} />
        <text x={cx+hubR+4} y={cy+h1-hD/2} fill={C.hub} fontSize={6} fontFamily="'Noto Sans KR', sans-serif" opacity={0.6}>Hub {hubDepth}mm</text>
      </>;
    })()}
    <text x={cx} y={cy-h1-eyeH-18} fill={C.green} fontSize={8} fontFamily="'Noto Sans KR', sans-serif" textAnchor="middle" opacity={0.6}>↓ AIR IN ↓</text>
    <text x={10} y={cy} fill={C.green} fontSize={7} fontFamily="'Noto Sans KR', sans-serif" opacity={0.4}>→ AIR OUT</text>
    <text x={cx+r2s+8} y={cy-4} fill={C.blade} fontSize={7} fontFamily="'Noto Sans KR', sans-serif">D₂</text>
    <text x={cx+rU+4} y={cy+h2+14} fill={C.backplate} fontSize={7} fontFamily="'Noto Sans KR', sans-serif">D_u={Du}</text>
    {Deye < D1 && <text x={cx+(rE+r1s)/2} y={cy-h1-3} fill={C.eye} fontSize={6} fontFamily="'Noto Sans KR', sans-serif" textAnchor="middle" opacity={0.5}>vaneless</text>}
    {eyeRise > 0 && <>
      <line x1={cx-rE-6} y1={cy-h1} x2={cx-rE-6} y2={cy-h1-eyeH} stroke={C.shroud} strokeWidth={0.5} />
      <text x={cx-rE-10} y={cy-h1-eyeH/2+3} fill={C.shroud} fontSize={6} fontFamily="'Noto Sans KR', sans-serif" textAnchor="end">{eyeRise}mm</text>
    </>}
    <line x1={cx+r1s+8} y1={cy-h1} x2={cx+r1s+8} y2={cy+h1} stroke={C.cyan} strokeWidth={0.5} />
    <text x={cx+r1s+12} y={cy+3} fill={C.cyan} fontSize={7} fontFamily="'Noto Sans KR', sans-serif">b₁={b1}</text>
    <line x1={cx+r2s+8} y1={cy-h2} x2={cx+r2s+8} y2={cy+h2} stroke={C.hub} strokeWidth={0.5} />
    <text x={cx+r2s+12} y={cy+14} fill={C.hub} fontSize={7} fontFamily="'Noto Sans KR', sans-serif">b₂={b2}</text>
  </svg>;
}

function BottomView({ D2, Du, Deye }) {
  const w = 340, h = 240, cx = w/2, cy = h/2+5;
  const maxR = Math.max(D2, Du)/2; const sc = (Math.min(w, h)/2 - 25) / maxR;
  const hubR = Deye * 0.2;
  return <svg width={w} height={h} style={{ display: "block", margin: "0 auto" }}>
    <text x={w/2} y={14} fill={C.dim} fontSize={9} fontFamily="'Noto Sans KR', sans-serif" textAnchor="middle">저면도 (Bottom — 주판 방향에서 본 모습)</text>
    <circle cx={cx} cy={cy} r={Du/2*sc} fill={C.backplate} fillOpacity={0.06} stroke={C.backplate} strokeWidth={1.5} />
    <circle cx={cx} cy={cy} r={D2/2*sc} fill="none" stroke={C.blade} strokeWidth={0.8} strokeDasharray="3,3" opacity={0.4} />
    <circle cx={cx} cy={cy} r={hubR*sc} fill={C.border} stroke={C.hub} strokeWidth={1.2} />
    <circle cx={cx} cy={cy} r={hubR*0.3*sc} fill={C.hub} opacity={0.7} />
    <text x={cx} y={cy+3} fill={C.bg} fontSize={8} fontFamily="'Noto Sans KR', sans-serif" textAnchor="middle" fontWeight="bold">◎</text>
    <text x={cx} y={cy+Du/2*sc+16} fill={C.backplate} fontSize={9} fontFamily="'Noto Sans KR', sans-serif" textAnchor="middle">D_u = {Du}mm</text>
    {Du>D2 && <text x={cx} y={cy+Du/2*sc+28} fill={C.accent} fontSize={8} fontFamily="'Noto Sans KR', sans-serif" textAnchor="middle">주판 돌출: +{Du-D2}mm</text>}
    <text x={cx+D2/2*sc+6} y={cy+4} fill={C.blade} fontSize={7} fontFamily="'Noto Sans KR', sans-serif" opacity={0.5}>D₂</text>
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
  const [bladeLean, setBladeLean] = useState(0); // blade axial lean angle degrees (+ = forward lean)
  const [eyeRise, setEyeRise] = useState(10); // shroud eye curve height mm
  const [hubDepth, setHubDepth] = useState(15); // inlet hub depth mm (how far hub protrudes)
  const [hubFillet, setHubFillet] = useState(5); // inlet hub fillet radius mm
  const [showShroud, setShowShroud] = useState(true);
  const [showBackplate, setShowBackplate] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [explode, setExplode] = useState(0);
  const [viewTab, setViewTab] = useState(0);
  // compressor-sim style 4-tab: 0=Visualization, 1=Results, 2=Fitting, 3=Analysis
  const [activeTab, setActiveTab] = useState(0);
  // Visualization sub-tab: 0=3D, 1=Top view, 2=Front view, 3=Bottom view
  const [vizSub, setVizSub] = useState(0);
  // Resizable sidebar
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try { const v = localStorage.getItem('fansim_sidebar_w'); return v ? +v : 320; }
    catch { return 320; }
  });
  const resizingRef = useRef(false);
  const startResize = (e) => {
    resizingRef.current = true;
    e.currentTarget.classList.add('dragging');
    const onMove = (ev) => {
      if (!resizingRef.current) return;
      const x = ev.clientX || ev.touches?.[0]?.clientX;
      if (x == null) return;
      const w = Math.max(260, Math.min(600, x));
      setSidebarWidth(w);
    };
    const onUp = () => {
      resizingRef.current = false;
      document.querySelectorAll('.hpwd-resizer.dragging').forEach(el => el.classList.remove('dragging'));
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onUp);
  };
  useEffect(() => {
    try { localStorage.setItem('fansim_sidebar_w', String(sidebarWidth)); } catch {}
  }, [sidebarWidth]);
  const [RPM, setRPM] = useState(1400);
  // Scroll
  const [showScroll, setShowScroll] = useState(true);
  const [scrollType, setScrollType] = useState('cv'); // 'cv'=const velocity (Archimedes), 'fv'=free vortex (log spiral)
  const [scrollEndAngle, setScrollEndAngle] = useState(360); // absolute angle where scroll ends
  const [scrollGapF, setScrollGapF] = useState(3); // front (shroud side) gap mm
  const [scrollGapB, setScrollGapB] = useState(3); // back (backplate side) gap mm
  const [bScroll, setBScroll] = useState(55); // scroll axial width (폭) mm
  const [scrollExpRate, setScrollExpRate] = useState(0.12); // uniform mode expansion rate
  const [scrollExpMode, setScrollExpMode] = useState('uniform'); // 'uniform' or 'variable'
  const [scrollExpPts, setScrollExpPts] = useState([{a:0,k:0.08},{a:180,k:0.15},{a:360,k:0.12}]); // variable mode: [{a:angle°, k:rate}]
  const [scrollCross, setScrollCross] = useState('rect'); // 'rect' or 'circular'
  // Tongue
  const [cutoffGap, setCutoffGap] = useState(8); // mm, gap between D₂ and tongue tip
  const [cutoffAngle, setCutoffAngle] = useState(0); // degrees, tongue position (absolute: 0=right, 90=up, 180=left, 270=down)
  const wrapAngle = Math.max(30, ((scrollEndAngle - cutoffAngle) % 360 + 360) % 360 || 360); // auto from θ_end - θ_cut
  const [Rtongue, setRtongue] = useState(5); // mm, tongue tip radius
  const [exitAngle, setExitAngle] = useState(90); // degrees, duct exit direction (absolute: 0=right, 90=up)
  const [tongueOutLen, setTongueOutLen] = useState(35); // mm, tongue outer face length
  const [tongueOutAngle, setTongueOutAngle] = useState(5); // degrees, tongue outer face divergence angle
  // Diffuser
  const [diffAngle, setDiffAngle] = useState(7); // half-angle degrees
  const [diffLength, setDiffLength] = useState(40); // mm
  const [diffType, setDiffType] = useState('single'); // 'single', 'stepped', 'round'
  const [diffInnerWall, setDiffInnerWall] = useState(true); // inner wall on/off
  // Casing box
  const [showCasing, setShowCasing] = useState(false);
  const [casingW, setCasingW] = useState(250); // width mm (plan view X)
  const [casingH, setCasingH] = useState(250); // height mm (plan view Y)
  const [casingD, setCasingD] = useState(80); // depth mm (axial)
  const [casingCX, setCasingCX] = useState(0); // impeller center X offset from box center
  const [casingCY, setCasingCY] = useState(0); // impeller center Y offset from box center
  const [casingFace, setCasingFace] = useState('top'); // 'top'=XY plane, 'front'=XZ, 'side'=YZ
  const [matKey, setMatKey] = useState('SPCC');
  // Save/Load
  const [saveOpen, setSaveOpen] = useState(false);
  const [saves, setSaves] = useState(() => { try { if(typeof localStorage!=='undefined') return JSON.parse(localStorage.getItem('fansim3d_saves') || '{}'); } catch {} return {}; });
  const fileRef = useRef(null);

  const collectState = () => ({
    _v: '2.0', _t: new Date().toISOString(),
    Deye,D1,D2,Du,b1,b2,beta1,beta2,Z,tBlade,bladeType,Rfillet,bendPos,bladeLean,eyeRise,hubDepth,hubFillet,RPM,matKey,
    scrollType,scrollEndAngle,scrollGapF,scrollGapB,bScroll,scrollExpRate,scrollExpMode,scrollExpPts,scrollCross,
    cutoffGap,cutoffAngle,Rtongue,exitAngle,tongueOutLen,tongueOutAngle,
    diffAngle,diffLength,diffType,diffInnerWall,
    showCasing,casingW,casingH,casingD,casingCX,casingCY,casingFace,
    fanMode,expData,fitCoeffs,showSysCurve,sysA,sysB,sysC,sysCurveData,
    qsShow,qsDuration,qsSteps,qsAStart,qsAEnd,qsCStart,qsCEnd,
  });
  const restore = (d) => {
    if (!d || typeof d !== 'object') return false;
    const s = (k,fn) => { if (d[k] != null) fn(d[k]); };
    s('Deye',setDeye);s('D1',setD1);s('D2',setD2);s('Du',setDu);
    s('b1',setB1);s('b2',setB2);s('beta1',setBeta1);s('beta2',setBeta2);
    s('Z',setZ);s('tBlade',setTBlade);s('bladeType',setBladeType);
    s('Rfillet',setRfillet);s('bendPos',setBendPos);s('bladeLean',setBladeLean);
    s('eyeRise',setEyeRise);s('hubDepth',setHubDepth);s('hubFillet',setHubFillet);
    s('RPM',setRPM);s('matKey',setMatKey);
    s('scrollType',setScrollType);s('scrollEndAngle',setScrollEndAngle);
    s('scrollGapF',setScrollGapF);s('scrollGapB',setScrollGapB);
    s('bScroll',setBScroll);s('scrollExpRate',setScrollExpRate);s('scrollExpMode',setScrollExpMode);
    if(d.scrollExpPts)setScrollExpPts(d.scrollExpPts);s('scrollCross',setScrollCross);
    s('cutoffGap',setCutoffGap);s('cutoffAngle',setCutoffAngle);
    s('Rtongue',setRtongue);s('exitAngle',setExitAngle);s('tongueOutLen',setTongueOutLen);s('tongueOutAngle',setTongueOutAngle);
    s('diffAngle',setDiffAngle);s('diffLength',setDiffLength);s('diffType',setDiffType);s('diffInnerWall',setDiffInnerWall);
    s('showCasing',setShowCasing);s('casingW',setCasingW);s('casingH',setCasingH);s('casingD',setCasingD);
    s('casingCX',setCasingCX);s('casingCY',setCasingCY);s('casingFace',setCasingFace);
    s('fanMode',setFanMode);if(d.expData)setExpData(d.expData);if(d.fitCoeffs)setFitCoeffs(d.fitCoeffs);
    s('showSysCurve',setShowSysCurve);s('sysA',setSysA);s('sysB',setSysB);s('sysC',setSysC);if(d.sysCurveData)setSysCurveData(d.sysCurveData);
    s('qsShow',setQsShow);s('qsDuration',setQsDuration);s('qsSteps',setQsSteps);
    s('qsAStart',setQsAStart);s('qsAEnd',setQsAEnd);s('qsCStart',setQsCStart);s('qsCEnd',setQsCEnd);
    return true;
  };
  const exportJSON = () => {
    const d = collectState(); const blob = new Blob([JSON.stringify(d,null,2)],{type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `fansim3d_D${D2}_Z${Z}_${new Date().toISOString().slice(0,10)}.json`; a.click();
  };
  const importJSON = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader(); r.onload = (ev) => { try { if(restore(JSON.parse(ev.target.result))) alert('로드 완료'); else alert('형식 오류'); } catch { alert('JSON 파싱 실패'); } };
    r.readAsText(f); e.target.value = '';
  };
  const saveSlot = (n) => { const d = collectState(); d._name = `Slot${n} D₂=${D2} β₂=${beta2}° Z=${Z}`; const nxt = {...saves,[n]:d}; setSaves(nxt); try{localStorage.setItem('fansim3d_saves',JSON.stringify(nxt));}catch{} };
  const loadSlot = (n) => { if(saves[n]) restore(saves[n]); };
  const delSlot = (n) => { const nxt = {...saves}; delete nxt[n]; setSaves(nxt); try{localStorage.setItem('fansim3d_saves',JSON.stringify(nxt));}catch{} };

  // ═══ OPTIMIZATION ═══
  const OPT_VARS = [
    {key:'D2',label:'D₂',unit:'mm',min:100,max:300,step:5,def:175},
    {key:'D1',label:'D₁',unit:'mm',min:60,max:200,step:5,def:120},
    {key:'Deye',label:'D_eye',unit:'mm',min:60,max:180,step:5,def:110},
    {key:'Du',label:'D_u',unit:'mm',min:80,max:350,step:5,def:180},
    {key:'b1',label:'b₁',unit:'mm',min:15,max:120,step:5,def:60},
    {key:'b2',label:'b₂',unit:'mm',min:20,max:100,step:5,def:50},
    {key:'beta2',label:'β₂',unit:'°',min:20,max:180,step:2,def:145},
    {key:'beta1',label:'β₁',unit:'°',min:5,max:85,step:2,def:30},
    {key:'Z',label:'Z',unit:'',min:16,max:48,step:2,def:36},
    {key:'RPM',label:'RPM',unit:'',min:400,max:3000,step:50,def:1400},
    {key:'tBlade',label:'t',unit:'mm',min:0.3,max:3,step:0.1,def:1},
    {key:'bladeLean',label:'Lean',unit:'°',min:-15,max:15,step:1,def:0},
    {key:'cutoffGap',label:'δ',unit:'mm',min:2,max:30,step:1,def:8},
    {key:'cutoffAngle',label:'θ_cut',unit:'°',min:0,max:360,step:5,def:0},
    {key:'Rtongue',label:'R_tongue',unit:'mm',min:1,max:20,step:1,def:5},
    {key:'exitAngle',label:'θ_exit',unit:'°',min:0,max:360,step:5,def:90},
    {key:'tongueOutLen',label:'외면 L',unit:'mm',min:0,max:200,step:5,def:35},
    {key:'tongueOutAngle',label:'외면 α',unit:'°',min:-90,max:90,step:5,def:5},
    {key:'scrollEndAngle',label:'θ_end',unit:'°',min:0,max:720,step:5,def:360},
    {key:'scrollExpRate',label:'팽창률',unit:'',min:0.02,max:0.3,step:0.01,def:0.12},
    {key:'bScroll',label:'폭',unit:'mm',min:30,max:120,step:5,def:55},
    {key:'diffAngle',label:'Diff α',unit:'°',min:0,max:30,step:1,def:7},
    {key:'diffLength',label:'Diff L',unit:'mm',min:0,max:200,step:5,def:40},
  ];
  const OBJ_LIST = [
    {key:'eta',label:'η 효율 ↑',dir:1,color:C.green},
    {key:'Ps',label:'Ps 정압 ↑',dir:1,color:C.cyan},
    {key:'Q',label:'Q 유량 ↑',dir:1,color:C.amber},
    {key:'SPL',label:'SPL 소음 ↓',dir:-1,color:C.purple},
    {key:'SF',label:'SF 안전율 ↑',dir:1,color:C.orange},
    {key:'power',label:'소비전력 ↓',dir:-1,color:C.red},
    {key:'f_n',label:'f_n 고유진동수 ↑',dir:1,color:C.cyan},
  ];

  const [optEnabled, setOptEnabled] = useState(() => {
    const m = {}; OPT_VARS.forEach(v => { m[v.key] = false; }); m.beta2 = true; m.Z = true; return m;
  });
  const [optRange, setOptRange] = useState(() => {
    const m = {}; OPT_VARS.forEach(v => { m[v.key] = { min: v.min, max: v.max, step: v.step }; }); return m;
  });
  const [optMode, setOptMode] = useState('single'); // 'single' or 'multi'
  const [optObj1, setOptObj1] = useState('eta');
  const [optObj2, setOptObj2] = useState('SPL');
  const [optSamples, setOptSamples] = useState(200);
  const [optResults, setOptResults] = useState(null);
  const [optRunning, setOptRunning] = useState(false);
  // Experimental PQ data (Off-design)
  const [expData, setExpData] = useState([]); // [{Q, Ps, Pt, eta, RPM, W}, ...]
  const [fanMode, setFanMode] = useState('on_design'); // 'on_design' | 'semi_empirical' | 'off_design'
  const [fitCoeffs, setFitCoeffs] = useState(null); // {k_inc, k_fric, DR_crit, k_rec, k_disk, k_jw, k_sc_mix, k_tongue_a, k_tongue_b}
  const [fitRunning, setFitRunning] = useState(false);
  const [fitResult, setFitResult] = useState(null); // {coeffs, rmse_before, rmse_after, iterations}
  // System resistance curve: ΔP = aQ² + bQ + c
  const [showSysCurve, setShowSysCurve] = useState(false);
  const [sysA, setSysA] = useState(1.5);  // Pa/(m³/min)²
  const [sysB, setSysB] = useState(0);    // Pa/(m³/min)
  const [sysC, setSysC] = useState(5);    // Pa (static loss)
  const [sysCurveData, setSysCurveData] = useState([]); // [{Q, dP}] experimental system curve
  const sysCurveFileRef = useRef(null);
  const parseSysCurveCSV = (text) => {
    const lines = text.trim().split('\n').filter(l => l.trim() && !l.startsWith('#'));
    if (lines.length < 2) return;
    const hdr = lines[0].split(/[,\t]/).map(h => h.trim().toLowerCase());
    const qIdx = hdr.findIndex(h => h==='q' || h.includes('flow'));
    const dpIdx = hdr.findIndex(h => h==='dp' || h==='ps' || h.includes('pressure') || h.includes('저항'));
    if (qIdx < 0 || dpIdx < 0) { alert('CSV에 Q, dP 열이 필요합니다'); return; }
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(/[,\t]/).map(v => parseFloat(v.trim()));
      if (!isNaN(vals[qIdx]) && !isNaN(vals[dpIdx])) data.push({ Q: vals[qIdx], dP: vals[dpIdx] });
    }
    if (data.length >= 2) {
      setSysCurveData(data);
      // Auto-fit quadratic: dP = aQ² + bQ + c
      const n = data.length;
      const sQ = data.reduce((s,d)=>s+d.Q,0), sQ2 = data.reduce((s,d)=>s+d.Q**2,0);
      const sQ3 = data.reduce((s,d)=>s+d.Q**3,0), sQ4 = data.reduce((s,d)=>s+d.Q**4,0);
      const sP = data.reduce((s,d)=>s+d.dP,0), sQP = data.reduce((s,d)=>s+d.Q*d.dP,0), sQ2P = data.reduce((s,d)=>s+d.Q**2*d.dP,0);
      const det = n*(sQ2*sQ4-sQ3**2) - sQ*(sQ*sQ4-sQ2*sQ3) + sQ2*(sQ*sQ3-sQ2**2);
      if (Math.abs(det) > 1e-10) {
        const a_fit = (sP*(sQ2*sQ4-sQ3**2) - sQ*(sQP*sQ4-sQ2P*sQ3) + sQ2*(sQP*sQ3-sQ2P*sQ2)) / det;
        const b_fit = (n*(sQP*sQ4-sQ2P*sQ3) - sP*(sQ*sQ4-sQ2*sQ3) + sQ2*(sQ*sQ2P-sQ2*sQP)) / det;
        const c_fit = (n*(sQ2*sQ2P-sQ3*sQP) - sQ*(sQ*sQ2P-sQ3*sP) + sP*(sQ*sQ3-sQ2**2)) / det;
        setSysA(Math.round(c_fit*1000)/1000); setSysB(Math.round(b_fit*1000)/1000); setSysC(Math.round(a_fit*1000)/1000);
      }
    }
  };

  // Nelder-Mead simplex optimizer (JS)
  const nelderMead = (fn, x0, maxIter=300, tol=1e-6) => {
    const n = x0.length;
    const alpha=1, gamma=2, rho_nm=0.5, sigma_nm=0.5;
    let simplex = [x0.map(v=>v)];
    for (let i = 0; i < n; i++) {
      const p = [...x0]; p[i] *= 1.05; if (Math.abs(p[i]) < 0.001) p[i] = 0.01;
      simplex.push(p);
    }
    let vals = simplex.map(p => fn(p));
    for (let iter = 0; iter < maxIter; iter++) {
      const order = vals.map((_,i)=>i).sort((a,b)=>vals[a]-vals[b]);
      simplex = order.map(i=>simplex[i]); vals = order.map(i=>vals[i]);
      const centroid = Array(n).fill(0);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) centroid[j] += simplex[i][j] / n;
      // Reflect
      const xr = centroid.map((c,j) => c + alpha*(c - simplex[n][j]));
      const fr = fn(xr);
      if (fr < vals[0]) {
        const xe = centroid.map((c,j) => c + gamma*(xr[j] - c));
        const fe = fn(xe);
        simplex[n] = fe < fr ? xe : xr; vals[n] = Math.min(fe, fr);
      } else if (fr < vals[n-1]) {
        simplex[n] = xr; vals[n] = fr;
      } else {
        const xc = centroid.map((c,j) => c + rho_nm*(simplex[n][j] - c));
        const fc = fn(xc);
        if (fc < vals[n]) { simplex[n] = xc; vals[n] = fc; }
        else { for (let i = 1; i <= n; i++) { simplex[i] = simplex[i].map((v,j) => simplex[0][j] + sigma_nm*(v - simplex[0][j])); vals[i] = fn(simplex[i]); } }
      }
      if (Math.abs(vals[n] - vals[0]) < tol) break;
    }
    const best = vals.indexOf(Math.min(...vals));
    return { x: simplex[best], fval: vals[best] };
  };

  const runFitting = () => {
    if (expData.length < 3) { alert('최소 3개 이상의 실험 데이터가 필요합니다'); return; }
    setFitRunning(true);
    setTimeout(() => {
      // Objective: minimize RMSE(Ps) + weight*RMSE(η)
      const coeffNames = ['k_inc','k_fric','DR_crit','k_rec','k_disk','k_jw','k_sc_mix','k_tongue_a','k_tongue_b'];
      const x0 = [1.0, 1.0, 0.5, 0.0085, 1.0, 1.0, 0.20, 0.82, 0.7];
      const bounds_lo = [0.2, 0.2, 0.2, 0.001, 0.2, 0.2, 0.05, 0.1, 0.3];
      const bounds_hi = [3.0, 3.0, 0.8, 0.05, 3.0, 3.0, 0.50, 2.0, 1.2];

      // RMSE before fitting (default coeffs)
      const baseGeom = { D1,D2,Deye:Deye,b1,b2,beta1,beta2,Z,RPM,tBlade,cutoffGap,Rtongue,wrapAngle,scrollExpRate,diffAngle,diffLength,tongueOutLen,tongueOutAngle };
      const evalRMSE = (coeffArr) => {
        const fc = {};
        coeffNames.forEach((k,i) => { fc[k] = Math.max(bounds_lo[i], Math.min(bounds_hi[i], coeffArr[i])); });
        try {
          const r = computeAeroFit(baseGeom, fc);
          if (!r || !r.pts || r.pts.length < 10) return 1e6;
          let sse_ps = 0, sse_eta = 0, nPs = 0, nEta = 0;
          expData.forEach(d => {
            let best = r.pts[0], bestD = 999;
            for (const p of r.pts) { const dd = Math.abs(p.Q - d.Q); if (dd < bestD) { bestD = dd; best = p; } }
            if (d.Ps > 0) { sse_ps += (best.Ps - d.Ps)**2; nPs++; }
            if (d.eta > 0) { sse_eta += (best.eta - d.eta)**2; nEta++; }
          });
          const rmse_ps = nPs > 0 ? Math.sqrt(sse_ps / nPs) : 0;
          const rmse_eta = nEta > 0 ? Math.sqrt(sse_eta / nEta) * 500 : 0; // weight η higher
          return rmse_ps + rmse_eta;
        } catch { return 1e6; }
      };

      const rmse_before = evalRMSE(x0);
      const result = nelderMead(evalRMSE, x0, 500);
      const rmse_after = result.fval;

      const fitted = {};
      coeffNames.forEach((k,i) => { fitted[k] = Math.max(bounds_lo[i], Math.min(bounds_hi[i], result.x[i])); });
      // Round to 4 decimal places
      Object.keys(fitted).forEach(k => { fitted[k] = Math.round(fitted[k] * 10000) / 10000; });

      setFitCoeffs(fitted);
      setFitResult({ coeffs: fitted, rmse_before, rmse_after });
      setFitRunning(false);
    }, 50);
  };

  // computeAero with fit coefficients (lightweight — reuses frontend logic)
  const computeAeroFit = (geom, fc) => {
    // Clone baseParams with fit coefficients applied via loss multipliers
    const p = { ...geom };
    const rho=1.184, mu=1.85e-5;
    const omega=2*Math.PI*p.RPM/60, r1=p.D1/2000, r2=p.D2/2000, b1m=p.b1/1000, b2m=p.b2/1000;
    const b1R=p.beta1*Math.PI/180, b2R=p.beta2*Math.PI/180;
    const U1=omega*r1, U2=omega*r2;
    const sigma=1-(Math.PI*Math.sin(b2R))/p.Z;
    const QmaxM3s=Math.PI*(p.D2/1000)*b2m*U2*1.2;
    const pitch2=Math.PI*(p.D2/1000)/p.Z, Dh=2*pitch2*b2m/(pitch2+b2m);
    const tBladeM=(p.tBlade||1)/1000;
    const k_inc_base=1-(tBladeM/(Math.PI*(p.D1/1000)/p.Z))**2;
    const gapM=(p.cutoffGap||8)/1000;
    const wrapFrac=Math.min(1,(p.wrapAngle||360)/360);
    const bScrollM=b2m*1.1;
    const N=100, pts=[];
    let bestEta=0, bestIdx=0;
    for(let i=0;i<=N;i++){
      const Qm3s=(i/N)*QmaxM3s;
      const Cr2=Qm3s/(Math.PI*(p.D2/1000)*b2m);
      const Ct2=sigma*U2-Cr2/Math.tan(b2R);
      const C2=Math.sqrt(Cr2**2+Ct2**2);
      const Cr1=Qm3s/(Math.PI*(p.D1/1000)*b1m);
      const W1=Math.sqrt(Cr1**2+U1**2), W2=Math.sqrt(Cr2**2+(Ct2-U2)**2);
      const Pt_e=rho*U2*Ct2;
      const incA=Math.atan2(Cr1,U1)-b1R;
      const dPinc=fc.k_inc*k_inc_base*0.5*rho*(W1*Math.sin(incA))**2;
      const Wa=(W1+W2)/2,Re=rho*Wa*Dh/mu;
      const f=Re>2300?1/(-1.8*Math.log10(6.9/Re+(5e-5/Dh/3.7)**1.11))**2:(Re>0?64/Re:0.02);
      const dPfric=fc.k_fric*f*(10/Dh)*0.5*rho*Wa**2; // Lb ≈ 10mm approx
      const DR=W1>0?1-W2/W1+Math.abs(Ct2)/(2*p.Z*W1/Math.PI):0;
      const dPrec=DR>fc.DR_crit?fc.k_rec*(DR-fc.DR_crit)**2*rho*U2**2:0;
      const ReDisk=rho*omega*r2**2/mu, Cm=ReDisk>0?0.0622/Math.pow(ReDisk,0.2):0.005;
      const Pdf=fc.k_disk*2*0.5*Cm*rho*omega**3*r2**5;
      const dPdisk=Qm3s>1e-6?Pdf/Qm3s:Pdf/1e-6;
      const eps_jw=0.12+0.5*tBladeM/pitch2;
      const dPjw=fc.k_jw*0.5*rho*C2**2*eps_jw**2;
      const Pt_imp=Math.max(0,Pt_e-dPinc-dPfric-dPrec-Math.min(dPdisk,Pt_e*0.5)-dPjw);
      const Pdyn_cap=0.5*rho*C2**2*wrapFrac;
      const L_sc=2*Math.PI*r2*wrapFrac;
      const rExit=r2+r2*(p.scrollExpRate||0.12)*wrapFrac*2*Math.PI;
      const A_sc=Math.max(bScrollM*(rExit-r2),Qm3s>0?Qm3s/Math.max(1,C2*0.5):bScrollM*0.02);
      const D_h_sc=2*A_sc/(Math.sqrt(A_sc/bScrollM)+bScrollM);
      const C_sc=Qm3s>0?Qm3s/Math.max(1e-4,A_sc)*0.7:C2*0.5;
      const Re_sc=rho*Math.abs(C_sc)*Math.max(0.005,D_h_sc)/mu;
      const f_sc=Re_sc>2300?0.316/Math.pow(Re_sc,0.25):(Re_sc>0?64/Re_sc:0.02);
      const dP_scroll=f_sc*(L_sc/Math.max(0.005,D_h_sc))*0.5*rho*C_sc**2+fc.k_sc_mix*Pdyn_cap;
      const gapRatio=gapM/(2*r2);
      const eps_leak=Math.min(0.25,fc.k_tongue_a*Math.pow(gapRatio,fc.k_tongue_b)/(1+(p.Rtongue||5)/(p.cutoffGap||8)));
      const Q_delivered=Qm3s*(1-eps_leak);
      const dP_tongue=eps_leak*Pt_imp*0.3;
      const dP_uncap=0.5*rho*(C2*Math.sqrt(1-wrapFrac))**2*(1-wrapFrac);
      const Pt_fan=Math.max(0,Pt_imp-dPjw-dP_scroll-dP_tongue-dP_uncap);
      const diffAR=(p.diffLength||0)>0?1+2*((p.diffLength||40)/1000)*Math.tan(Math.abs(p.diffAngle||7)*Math.PI/180)/Math.max(0.01,Math.sqrt(A_sc)):1;
      const A_exit=Math.max(0.001,A_sc*Math.max(1,diffAR));
      const V_exit=Q_delivered>0?Q_delivered/A_exit:0;
      const Pdyn_exit=0.5*rho*V_exit**2;
      const Ps=Pt_fan-Pdyn_exit;
      const Pshaft=Qm3s>1e-6?Pt_e*Qm3s+Pdf:Pdf;
      const eta=Pshaft>0?Math.max(0,Ps*Q_delivered)/Pshaft:0;
      pts.push({Q:Q_delivered*60,Qm3s:Q_delivered,Pt:Pt_fan,Ps,Pdyn:Pdyn_exit,eta});
      if(i>=N/10&&eta>bestEta){bestEta=eta;bestIdx=i;}
    }
    return {bep:pts[bestIdx]||pts[0],pts};
  };
  const expFileRef = useRef(null);
  const parseExpCSV = (text) => {
    const lines = text.trim().split('\n').filter(l => l.trim() && !l.startsWith('#'));
    if (lines.length < 2) return;
    const hdr = lines[0].split(/[,\t]/).map(h => h.trim().toLowerCase());
    const qIdx = hdr.findIndex(h => h==='q' || h.includes('flow') || h.includes('유량'));
    const psIdx = hdr.findIndex(h => h==='ps' || h.includes('static') || h.includes('정압'));
    const ptIdx = hdr.findIndex(h => h==='pt' || h.includes('total') || h.includes('전압'));
    const etaIdx = hdr.findIndex(h => h==='eta' || h.includes('효율') || h.includes('eff'));
    const rpmIdx = hdr.findIndex(h => h==='rpm' || h.includes('speed'));
    const wIdx = hdr.findIndex(h => h==='w' || h.includes('power') || h.includes('전력'));
    if (qIdx < 0 || (psIdx < 0 && ptIdx < 0)) { alert('CSV에 Q, Ps(또는 Pt) 열이 필요합니다'); return; }
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(/[,\t]/).map(v => parseFloat(v.trim()));
      if (isNaN(vals[qIdx])) continue;
      data.push({
        Q: vals[qIdx], Ps: psIdx >= 0 ? vals[psIdx] : 0, Pt: ptIdx >= 0 ? vals[ptIdx] : (psIdx >= 0 ? vals[psIdx] : 0),
        eta: etaIdx >= 0 ? vals[etaIdx] : 0, RPM: rpmIdx >= 0 ? vals[rpmIdx] : RPM,
        W: wIdx >= 0 ? vals[wIdx] : 0,
      });
    }
    if (data.length > 0) setExpData(data);
  };

  const runOptimization = () => {
    setOptRunning(true);
    setTimeout(() => {
      const activeVars = OPT_VARS.filter(v => optEnabled[v.key]);
      if (activeVars.length === 0) { setOptRunning(false); alert('최적화 변수를 선택하세요'); return; }
      const base = { ...baseParams };
      const mat = MATERIALS[matKey];

      // Latin Hypercube Sampling
      const N = optSamples;
      const samples = [];
      for (let i = 0; i < N; i++) {
        const params = { ...base };
        activeVars.forEach(v => {
          const r = optRange[v.key];
          const t = (i + Math.random()) / N; // stratified random
          params[v.key] = r.min + t * (r.max - r.min);
          const st = r.step || v.step || 1;
          params[v.key] = Math.round(params[v.key] / st) * st;
        });
        // Recompute wrapAngle from absolute angles
        const ca = params.cutoffAngle != null ? params.cutoffAngle : cutoffAngle;
        const ea = params.scrollEndAngle != null ? params.scrollEndAngle : scrollEndAngle;
        params.wrapAngle = Math.max(30, ((ea - ca) % 360 + 360) % 360 || 360);
        try {
          const aero = computeAero(params);
          const struc = computeStructure(params, aero, mat);
          const Pshaft = aero.bep.Qm3s > 0 ? aero.bep.Pt * aero.bep.Qm3s / Math.max(0.01, aero.bep.eta) : 0;
          samples.push({
            params: { ...params },
            eta: aero.bep.eta, Ps: aero.bep.Ps, Q: aero.bep.Q,
            SPL: aero.SPL, SF: struc.SF, f_n: struc.f_n,
            power: Pshaft, sigma: struc.sigma_total,
          });
        } catch {}
      }

      if (optMode === 'single') {
        // Sort by objective
        const obj = OBJ_LIST.find(o => o.key === optObj1);
        samples.sort((a, b) => (b[obj.key] - a[obj.key]) * obj.dir);
        setOptResults({ mode: 'single', obj: obj, best: samples[0], top10: samples.slice(0, 10), all: samples });
      } else {
        // Multi-objective: Pareto front
        const obj1 = OBJ_LIST.find(o => o.key === optObj1);
        const obj2 = OBJ_LIST.find(o => o.key === optObj2);
        // Find non-dominated solutions
        const pareto = [];
        for (const s of samples) {
          let dominated = false;
          for (const p of samples) {
            if (p === s) continue;
            const b1 = (p[obj1.key] - s[obj1.key]) * obj1.dir >= 0;
            const b2 = (p[obj2.key] - s[obj2.key]) * obj2.dir >= 0;
            const s1 = (p[obj1.key] - s[obj1.key]) * obj1.dir > 0;
            const s2 = (p[obj2.key] - s[obj2.key]) * obj2.dir > 0;
            if (b1 && b2 && (s1 || s2)) { dominated = true; break; }
          }
          if (!dominated) pareto.push(s);
        }
        pareto.sort((a, b) => a[obj1.key] - b[obj1.key]);
        setOptResults({ mode: 'multi', obj1, obj2, pareto, all: samples });
      }
      setOptRunning(false);
    }, 50);
  };

  const applyOptResult = (r) => {
    const p = r.params;
    if(p.D1!=null)setD1(p.D1);if(p.D2!=null)setD2(p.D2);if(p.Deye!=null)setDeye(p.Deye);if(p.Du!=null)setDu(p.Du);
    if(p.b1!=null)setB1(p.b1);if(p.b2!=null)setB2(p.b2);
    if(p.beta1!=null)setBeta1(p.beta1);if(p.beta2!=null)setBeta2(p.beta2);if(p.Z!=null)setZ(p.Z);
    if(p.RPM!=null)setRPM(p.RPM);if(p.tBlade!=null)setTBlade(p.tBlade);if(p.bladeLean!=null)setBladeLean(p.bladeLean);
    if(p.cutoffGap!=null)setCutoffGap(p.cutoffGap);if(p.cutoffAngle!=null)setCutoffAngle(p.cutoffAngle);
    if(p.Rtongue!=null)setRtongue(p.Rtongue);if(p.exitAngle!=null)setExitAngle(p.exitAngle);
    if(p.tongueOutLen!=null)setTongueOutLen(p.tongueOutLen);if(p.tongueOutAngle!=null)setTongueOutAngle(p.tongueOutAngle);
    if(p.scrollEndAngle!=null)setScrollEndAngle(p.scrollEndAngle);if(p.scrollExpRate!=null)setScrollExpRate(p.scrollExpRate);
    if(p.bScroll!=null)setBScroll(p.bScroll);
    if(p.diffAngle!=null)setDiffAngle(p.diffAngle);if(p.diffLength!=null)setDiffLength(p.diffLength);
  };
  const [sweepVar, setSweepVar] = useState('beta2');
  const [sweepMin, setSweepMin] = useState(100);
  const [sweepMax, setSweepMax] = useState(170);
  const [sweepSteps, setSweepSteps] = useState(15);
  const [sweepOut, setSweepOut] = useState('eta'); // selected output chart

  const mat = MATERIALS[matKey];
  const baseParams = { D1, D2, Du, Deye, b1, b2, beta1, beta2, Z, RPM, tBlade, bladeLean,
    cutoffGap, cutoffAngle, Rtongue, exitAngle, tongueOutLen, tongueOutAngle,
    wrapAngle, scrollEndAngle, scrollExpRate, scrollExpMode, scrollExpPts, bScroll, diffAngle, diffLength };

  // Auto-fit: calculate max scroll that fits within casing box
  const autoFitScroll = () => {
    if (!showCasing) return;
    const halfW = casingW / 2, halfH = casingH / 2;
    // Available space from impeller center to each wall
    const rRight = halfW - casingCX;
    const rLeft = halfW + casingCX;
    const rTop = halfH - casingCY;
    const rBot = halfH + casingCY;
    const rMin = Math.min(rRight, rLeft, rTop, rBot);
    // Max scroll radius that fits
    const rMax = rMin - 5; // 5mm wall clearance
    const r2 = D2 / 2;
    const rTip = r2 + cutoffGap;
    const rStart = rTip - Rtongue;
    if (rMax <= rStart) return; // can't fit
    // For Archimedes: r(θ) = rStart + k*θ, solve for wrap where r = rMax
    const k = r2 * scrollExpRate;
    if (k > 0) {
      const maxWrapRad = (rMax - rStart) / k;
      const maxWrapDeg = Math.min(360, Math.max(180, Math.round(maxWrapRad * 180 / Math.PI)));
      setScrollEndAngle((cutoffAngle + maxWrapDeg) % 360);
    }
    // Auto-set diffuser length to fill remaining space toward exit wall
    const exitDir = exitAngle * Math.PI / 180;
    const exitDx = Math.cos(exitDir), exitDy = Math.sin(exitDir);
    // Distance from impeller center to wall in exit direction
    const tWall = Math.min(
      exitDx > 0 ? rRight / exitDx : (exitDx < 0 ? rLeft / (-exitDx) : 999),
      exitDy > 0 ? rTop / exitDy : (exitDy < 0 ? rBot / (-exitDy) : 999)
    );
    const exitR = rMax; // scroll exit radius
    const remainingLen = Math.max(0, tWall - exitR);
    if (remainingLen > 0 && remainingLen < 300) {
      setDiffLength(Math.round(remainingLen * 0.8));
    }
  };

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
    if (activeTab !== 0) return;
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
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 0) return;
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
    // Inlet hub — protrudes into eye
    if (hubDepth > 0) {
      const hDepth = hubDepth;
      const hR = hubR * 0.95;
      const hGeo = new THREE.CylinderGeometry(hR * 0.3, hR, hDepth, 24);
      hGeo.translate(0, b2 + hDepth / 2 + ex, 0);
      const hMat = new THREE.MeshPhongMaterial({ color: 0xf59e0b, shininess: 100 });
      grp.add(new THREE.Mesh(hGeo, hMat));
      // Fillet torus at hub base
      if (hubFillet > 1) {
        const fGeo = new THREE.TorusGeometry(hR - hubFillet * 0.5, hubFillet * 0.5, 8, 32);
        fGeo.rotateX(Math.PI / 2);
        const fMesh = new THREE.Mesh(fGeo, new THREE.MeshPhongMaterial({ color: 0xf59e0b, shininess: 80, transparent: true, opacity: 0.8 }));
        fMesh.position.y = b2 + ex;
        grp.add(fMesh);
      }
    }
    const bMat=new THREE.MeshPhongMaterial({color:0x60a5fa,side:THREE.DoubleSide,shininess:60,transparent:true,opacity:0.85});
    for(let i=0;i<Z;i++) grp.add(new THREE.Mesh(buildBlade(bladePts,b1,b2,D1,D2,(2*Math.PI*i)/Z,bladeLean),bMat));
    for(let i=0;i<8;i++){const a=(2*Math.PI*i)/8,r=Deye*0.3; const f=new THREE.Vector3(r*Math.cos(a),b2+50+ex,r*Math.sin(a)), t=new THREE.Vector3(r*Math.cos(a),b2+5+ex,r*Math.sin(a)); grp.add(new THREE.ArrowHelper(new THREE.Vector3().subVectors(t,f).normalize(),f,f.distanceTo(t),0x34d399,5,3));}
    grp.add(new THREE.ArrowHelper(new THREE.Vector3(0,-1,0),new THREE.Vector3(0,b2+65+ex,0),55,0x4ade80,7,4));
    const eyeR=new THREE.Mesh(new THREE.RingGeometry(Deye/2-1,Deye/2+0.5,64),new THREE.MeshBasicMaterial({color:0x34d399,transparent:true,opacity:0.5,side:THREE.DoubleSide})); eyeR.rotation.x=-Math.PI/2; eyeR.position.y=b2+3+ex; grp.add(eyeR);

    // Scroll casing
    if (showScroll) {
      const sPts = scrollProfile(D2/2, wrapAngle, scrollType, bScroll, cutoffAngle, cutoffGap, Rtongue, scrollExpRate, 72, scrollExpMode, scrollExpPts);
      const sGeo = buildScrollMesh(sPts, bScroll, scrollGapF, scrollGapB, scrollCross);
      if (sGeo) {
        const sMat = new THREE.MeshPhongMaterial({ color: 0xd4a44a, transparent: true, opacity: 0.2, side: THREE.DoubleSide, shininess: 40 });
        const sMesh = new THREE.Mesh(sGeo, sMat);
        sMesh.position.y = -scrollGapB;
        grp.add(sMesh);
      }
      // Tongue — inner face → tip round → outer face (offset by R)
      const tTheta = cutoffAngle * Math.PI / 180;
      const rTip = D2/2 + cutoffGap + Rtongue; // tip center = r₂ + δ + R
      const tongueH = bScroll + scrollGapF + scrollGapB + 4;
      const tY = tongueH / 2 - scrollGapB - 2;
      const tipCX = rTip * Math.cos(tTheta), tipCZ = rTip * Math.sin(tTheta);

      // Tip cylinder
      const tGeo = new THREE.CylinderGeometry(Rtongue, Rtongue, tongueH, 16);
      const tMat = new THREE.MeshPhongMaterial({ color: 0xef4444, transparent: true, opacity: 0.6, shininess: 80 });
      const tMesh = new THREE.Mesh(tGeo, tMat);
      tMesh.position.set(tipCX, tY, tipCZ);
      grp.add(tMesh);

      // Inner face: offset R toward impeller center, then extend tangentially
      const inDir = tTheta + Math.PI / 2;
      const inOffX = tipCX - Rtongue * Math.cos(tTheta); // R toward impeller
      const inOffZ = tipCZ - Rtongue * Math.sin(tTheta);
      const inLen = 25, wallThick = 2;
      const inGeo = new THREE.BoxGeometry(inLen, tongueH, wallThick);
      const wallMat = new THREE.MeshPhongMaterial({ color: 0xef4444, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
      const inMesh = new THREE.Mesh(inGeo, wallMat);
      inMesh.position.set(inOffX + inLen / 2 * Math.cos(inDir), tY, inOffZ + inLen / 2 * Math.sin(inDir));
      inMesh.rotation.y = -inDir;
      grp.add(inMesh);

      // Outer face: offset R away from impeller center, then extend toward diffuser exit
      let outDirA = (exitAngle + tongueOutAngle) * Math.PI / 180;
      const outOffX = tipCX + Rtongue * Math.cos(tTheta); // R away from impeller
      const outOffZ = tipCZ + Rtongue * Math.sin(tTheta);
      const outLen = tongueOutLen;
      const outGeo = new THREE.BoxGeometry(outLen, tongueH, wallThick);
      const outMesh = new THREE.Mesh(outGeo, wallMat.clone());
      outMesh.material.opacity = 0.25;
      outMesh.position.set(outOffX + outLen / 2 * Math.cos(outDirA), tY, outOffZ + outLen / 2 * Math.sin(outDirA));
      outMesh.rotation.y = -outDirA;
      grp.add(outMesh);

      // Diffuser — extends from scroll exit toward exitAngle
      if (diffLength > 0) {
        const exitTheta = tTheta + wrapAngle * Math.PI / 180; // scroll end position
        const exitDir = exitAngle * Math.PI / 180; // user-defined exit direction
        const rInner = rTip;
        const rOuter = sPts.length > 0 ? sPts[sPts.length - 1].r : rTip + 20;
        const exitW = rOuter - rInner;
        const halfA = diffAngle * Math.PI / 180;
        const exitMidR = (rInner + rOuter) / 2;
        const dL = diffLength;
        // Diffuser as a box, positioned at scroll exit, rotated to tangent direction
        const outW = exitW + 2 * dL * Math.tan(halfA);
        const dGeo = new THREE.BufferGeometry();
        const dVerts = [];
        const nSteps = diffType === 'round' ? 8 : (diffType === 'stepped' ? 3 : 2);
        for (let i = 0; i <= nSteps; i++) {
          const t = i / nSteps;
          const along = t * dL;
          let wHalf;
          if (diffType === 'round') { wHalf = exitW / 2 + (outW - exitW) / 2 * (1 - Math.cos(t * Math.PI / 2)); }
          else if (diffType === 'stepped') { wHalf = exitW / 2 + (outW - exitW) / 2 * (t > 0.5 ? 1 : 0); }
          else { wHalf = exitW / 2 + (outW - exitW) / 2 * t; }
          const px = exitMidR * Math.cos(exitTheta) + along * Math.cos(exitDir);
          const pz = exitMidR * Math.sin(exitTheta) + along * Math.sin(exitDir);
          const nx = Math.cos(exitTheta), nz = Math.sin(exitTheta);
          dVerts.push(px - wHalf * nx, 0, pz - wHalf * nz);
          dVerts.push(px + wHalf * nx, 0, pz + wHalf * nz);
          dVerts.push(px + wHalf * nx, tongueH, pz + wHalf * nz);
          dVerts.push(px - wHalf * nx, tongueH, pz - wHalf * nz);
        }
        const dIdx = [];
        for (let i = 0; i < nSteps; i++) {
          const b = i * 4, n = (i + 1) * 4;
          for (let j = 0; j < 4; j++) {
            if (!diffInnerWall && j === 3) continue; // skip inner wall face
            const j2 = (j + 1) % 4; dIdx.push(b+j, n+j, n+j2); dIdx.push(b+j, n+j2, b+j2);
          }
        }
        dGeo.setAttribute('position', new THREE.Float32BufferAttribute(dVerts, 3));
        dGeo.setIndex(dIdx); dGeo.computeVertexNormals();
        const dMat = new THREE.MeshPhongMaterial({ color: 0xd4a44a, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
        const dMesh = new THREE.Mesh(dGeo, dMat);
        dMesh.position.y = -scrollGapB - 2;
        grp.add(dMesh);
      }
    }

    // Casing box
    if (showCasing) {
      const bH = casingD; // box height (axial = y direction)
      const geo = new THREE.BoxGeometry(casingW, bH, casingH);
      const mat = new THREE.MeshPhongMaterial({ color: 0x4488aa, transparent: true, opacity: 0.08, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(casingCX, bH / 2 - scrollGapB - 2, -casingCY);
      grp.add(mesh);
      // Wireframe
      const wire = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({ color: 0x4488aa, transparent: true, opacity: 0.3 })
      );
      wire.position.copy(mesh.position);
      grp.add(wire);
    }
  }, [Deye,D1,D2,Du,b1,b2,bladePts,Z,tBlade,bladeLean,eyeRise,hubDepth,hubFillet,showShroud,showBackplate,showScroll,explode,viewTab,
      scrollType,wrapAngle,scrollGapF,scrollGapB,bScroll,scrollCross,scrollExpRate,scrollExpMode,scrollExpPts,cutoffGap,cutoffAngle,scrollEndAngle,Rtongue,tongueOutLen,tongueOutAngle,exitAngle,
      diffAngle,diffLength,diffType,diffInnerWall,showCasing,casingW,casingH,casingD,casingCX,casingCY]);

  const ratios = useMemo(() => ({ D1D2:(D1/D2).toFixed(3), DeyeD1:(Deye/D1).toFixed(3), DuD2:(Du/D2).toFixed(3), b2D2:(b2/D2).toFixed(3), b1b2:(b1/b2).toFixed(2) }), [D1,D2,Deye,Du,b1,b2]);

  // Base case performance + structure
  const baseAero = useMemo(() => computeAero(baseParams), [D1,D2,Deye,b1,b2,beta1,beta2,Z,RPM,tBlade,cutoffGap,Rtongue,scrollEndAngle,cutoffAngle,scrollExpRate,scrollExpMode,scrollExpPts,diffAngle,diffLength,tongueOutLen,tongueOutAngle]);
  const baseStruc = useMemo(() => computeStructure(baseParams, baseAero, mat), [baseAero, matKey, tBlade, b1, b2, D1, D2, Z]);

  // Find operating point: fan Ps(Q) = system dP(Q)
  const operatingPoint = useMemo(() => {
    if (!showSysCurve || !baseAero?.pts?.length) return null;
    const pts = baseAero.pts.filter(p => p.Q > 0);
    let bestDiff = Infinity, bestPt = null;
    for (const p of pts) {
      const dP_sys = sysA * p.Q**2 + sysB * p.Q + sysC;
      const diff = Math.abs(p.Ps - dP_sys);
      if (diff < bestDiff) { bestDiff = diff; bestPt = { ...p, dP_sys }; }
    }
    if (bestPt && pts.length > 2) {
      const idx = pts.findIndex(p => Math.abs(p.Q - bestPt.Q) < 0.01);
      if (idx > 0 && idx < pts.length - 1) {
        const p1 = pts[idx], s1 = p1.Ps - (sysA*p1.Q**2 + sysB*p1.Q + sysC);
        for (const pn of [pts[idx-1], pts[idx+1]]) {
          const sn = pn.Ps - (sysA*pn.Q**2 + sysB*pn.Q + sysC);
          if (s1 * sn < 0) {
            const t = Math.abs(s1) / (Math.abs(s1) + Math.abs(sn));
            const Q_op = p1.Q + t * (pn.Q - p1.Q);
            bestPt = { Q: Q_op, Ps: p1.Ps + t*(pn.Ps-p1.Ps), eta: p1.eta + t*(pn.eta-p1.eta),
              dP_sys: sysA*Q_op**2 + sysB*Q_op + sysC, Pshaft: (p1.Pshaft||0) + t*((pn.Pshaft||0)-(p1.Pshaft||0)) };
            break;
          }
        }
      }
    }
    return bestPt;
  }, [showSysCurve, sysA, sysB, sysC, baseAero]);

  // Quasi-steady state
  const [qsShow, setQsShow] = useState(false);
  const [qsDuration, setQsDuration] = useState(90);
  const [qsSteps, setQsSteps] = useState(30);
  const [qsAStart, setQsAStart] = useState(1.5);
  const [qsAEnd, setQsAEnd] = useState(3.0);
  const [qsCStart, setQsCStart] = useState(5);
  const [qsCEnd, setQsCEnd] = useState(15);
  const [qsResults, setQsResults] = useState(null);

  const runQuasiSteady = () => {
    if (!baseAero?.pts?.length) return;
    const pts = baseAero.pts.filter(p => p.Q > 0);
    const results = [];
    for (let step = 0; step <= qsSteps; step++) {
      const frac = step / qsSteps, t_min = frac * qsDuration;
      const a_t = qsAStart + frac*(qsAEnd-qsAStart), c_t = qsCStart + frac*(qsCEnd-qsCStart);
      let bestDiff = Infinity, bestPt = null;
      for (const p of pts) { const d = Math.abs(p.Ps - (a_t*p.Q**2 + sysB*p.Q + c_t)); if (d < bestDiff) { bestDiff=d; bestPt=p; } }
      if (bestPt) results.push({ t:t_min, a:a_t, c:c_t, Q:bestPt.Q, Ps:bestPt.Ps, eta:bestPt.eta, W:bestPt.Pshaft||0 });
    }
    setQsResults(results);
  };

  // Sweep results
  const sweepResults = useMemo(() => {
    const sv = SWEEP_VARS.find(v => v.key === sweepVar);
    if (!sv) return [];
    const results = [], step = (sweepMax - sweepMin) / Math.max(1, sweepSteps);
    for (let i = 0; i <= sweepSteps; i++) {
      const val = sweepMin + i * step;
      const params = { ...baseParams, [sweepVar]: val };
      // Recompute wrapAngle for angle sweeps
      if (sweepVar === 'scrollEndAngle' || sweepVar === 'cutoffAngle') {
        const ca = params.cutoffAngle != null ? params.cutoffAngle : cutoffAngle;
        const ea = params.scrollEndAngle != null ? params.scrollEndAngle : scrollEndAngle;
        params.wrapAngle = Math.max(30, ((ea - ca) % 360 + 360) % 360 || 360);
      }
      try {
        const aero = computeAero(params);
        const struc = computeStructure(params, aero, mat);
        results.push({ x: val, Q: aero.bep.Q, Ps: aero.bep.Ps, eta: aero.bep.eta, SPL: aero.SPL, BPF: aero.BPF,
          SF: struc.SF, sigma: struc.sigma_total, f_n: struc.f_n, res: struc.resMargin, mass: struc.bladeMass });
      } catch {}
    }
    return results;
  }, [D1,D2,Deye,b1,b2,beta1,beta2,Z,RPM,tBlade,matKey,sweepVar,sweepMin,sweepMax,sweepSteps,
      cutoffGap,Rtongue,tongueOutLen,tongueOutAngle,scrollEndAngle,cutoffAngle,scrollExpRate,exitAngle,diffAngle,diffLength]);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text }} className="font-sans">
      {/* ═══ HPWD Standard Header (compressor-sim 동일) ═══ */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16, padding: "10px 24px",
        borderBottom: `1px solid ${C.border}`, background: C.card, flexShrink: 0,
        flexWrap: "nowrap", overflowX: "auto",
        fontFamily: "'Noto Sans KR', sans-serif"
      }}>
        <a href="#" onClick={e => e.preventDefault()} style={{
          fontSize: 14, color: C.cyan, textDecoration: "none", cursor: "pointer",
          whiteSpace: "nowrap", fontFamily: "'Noto Sans KR', sans-serif"
        }}>← System</a>
        <span style={{
          fontSize: 16, fontWeight: 500, color: C.text, whiteSpace: "nowrap",
          fontFamily: "'Noto Sans KR', sans-serif"
        }}>
          <span style={{ color: C.accent, marginRight: 6 }}>◆</span>Fan
        </span>
        <div style={{
          display: "flex", gap: 4, marginLeft: "auto",
          background: C.bg, borderRadius: 8, padding: 4, flexShrink: 0
        }}>
          {[{k:'off_design',n:'Off-design'},{k:'semi_empirical',n:'Semi-empirical'},{k:'on_design',n:'On-design'}].map(m =>
            <button key={m.k} onClick={() => setFanMode(m.k)} style={{
              fontSize: 13, padding: "7px 18px", border: "none",
              background: fanMode===m.k ? C.card : "transparent",
              color: fanMode===m.k ? C.text : C.muted,
              fontWeight: fanMode===m.k ? 500 : 400,
              cursor: "pointer", borderRadius: 6, whiteSpace: "nowrap",
              boxShadow: fanMode===m.k ? `0 0 0 1px ${C.border}` : "none",
              fontFamily: "'Noto Sans KR', sans-serif",
              transition: "all .15s"
            }}>{m.n}</button>)}
        </div>
        <div style={{ display: "flex", gap: 8, marginLeft: 16, flexShrink: 0 }}>
          <button onClick={() => setSaveOpen(!saveOpen)} title="Save/Load" style={{
            fontSize: 14, width: 36, height: 36, border: `1px solid ${C.border}`,
            background: saveOpen ? C.bg : "transparent", borderRadius: 8,
            cursor: "pointer", color: C.muted, display: "flex",
            alignItems: "center", justifyContent: "center",
            fontFamily: "'Noto Sans KR', sans-serif"
          }}>💾</button>
          <button title="STEP Export" onClick={() => {
            const body = { D1, D2, beta1, beta2, Z, b1, b2, tBlade, bladeType };
            fetch('/api/generate-step', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
              .then(r => r.blob()).then(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `fan_D${D2}_Z${Z}.step`; a.click(); })
              .catch(() => alert('STEP 생성 실패'));
          }} style={{
            fontSize: 14, width: 36, height: 36, border: `1px solid ${C.border}`,
            background: "transparent", borderRadius: 8,
            cursor: "pointer", color: C.muted, display: "flex",
            alignItems: "center", justifyContent: "center",
            fontFamily: "'Noto Sans KR', sans-serif"
          }}>⚙</button>
        </div>
      </div>
      {/* Save/Load Panel */}
      {saveOpen && <div className="px-3 pb-1 pt-2">
        <div className="rounded-lg p-2" style={{ background:C.card, border:`1px solid ${C.cyan}44` }}>
          <div style={{ color:C.cyan, fontFamily: "'Noto Sans KR', sans-serif", fontSize:12, fontWeight:700, marginBottom:4 }}>SAVE / LOAD</div>
          <div className="flex gap-1 mb-2">
            <button onClick={exportJSON} className="flex-1 py-1 rounded text-xs"
              style={{ background:C.bg, color:C.green, border:`1px solid ${C.green}44`, fontFamily: "'Noto Sans KR', sans-serif", fontSize:12 }}>📥 JSON 내보내기</button>
            <button onClick={() => fileRef.current?.click()} className="flex-1 py-1 rounded text-xs"
              style={{ background:C.bg, color:C.orange, border:`1px solid ${C.orange}44`, fontFamily: "'Noto Sans KR', sans-serif", fontSize:12 }}>📤 JSON 불러오기</button>
            <input ref={fileRef} type="file" accept=".json" onChange={importJSON} style={{display:'none'}} />
          </div>
          <div style={{ color:C.dim, fontFamily: "'Noto Sans KR', sans-serif", fontSize:12, marginBottom:3 }}>SAVE SLOTS</div>
          <div className="flex flex-col gap-1">
            {[1,2,3,4,5].map(n => {
              const sv = saves[n], empty = !sv;
              return <div key={n} className="flex items-center gap-1" style={{fontFamily: "'Noto Sans KR', sans-serif",fontSize:12}}>
                <span className="w-4" style={{color:C.dim}}>{n}.</span>
                <div className="flex-1 py-0.5 px-1.5 rounded truncate" style={{ background:C.bg, color:empty?C.dim:C.text, fontSize:12,
                  border:`1px solid ${empty?C.border:C.cyan}33` }}>
                  {empty ? "— 비어 있음 —" : <span>{sv._name} <span style={{color:C.dim}}>{sv._t?.slice(5,16)}</span></span>}
                </div>
                <button onClick={() => saveSlot(n)} className="px-3 py-1.5 rounded" style={{background:C.bg,color:C.green,border:`1px solid ${C.green}33`,fontSize:12}}>저장</button>
                <button onClick={() => loadSlot(n)} disabled={empty} className="px-3 py-1.5 rounded" style={{background:C.bg,color:empty?C.dim:C.cyan,border:`1px solid ${empty?C.border:C.cyan}33`,fontSize:12,opacity:empty?0.4:1}}>로드</button>
                {!empty && <button onClick={() => delSlot(n)} className="px-3 py-1.5 rounded" style={{background:C.bg,color:C.red,border:`1px solid ${C.red}33`,fontSize:12}}>✕</button>}
              </div>;
            })}
          </div>
          <div className="mt-1" style={{color:C.dim,fontFamily: "'Noto Sans KR', sans-serif",fontSize:11}}>
            전체 설계변수 저장 (임펠러+스크롤+Tongue+디퓨저+케이싱+재질)
          </div>
        </div>
      </div>}
      {/* ═══ HPWD Sidebar Layout (flex on desktop, stack on mobile) ═══ */}
      <div className="hpwd-body">
      <div className="hpwd-main">
      {/* ═══ compressor-sim 4-tab structure ═══ */}
      <div className="tabs">
        {['Visualization','Results','Fitting','Analysis'].map((t,i) => {
          const isOn = activeTab === i;
          return <button key={t} className={`tab ${isOn?'on':''}`}
            onClick={() => {
              setActiveTab(i);
              // Auto-select internal viewTab for each tab
              if (i === 0) setViewTab(0); // Visualization → 3D
              if (i === 1) setViewTab(6); // Results → PQ
              if (i === 3) setViewTab(4); // Analysis → Sweep
            }}>{t}</button>;
        })}
      </div>

      {/* Analysis sub-tabs (only inside Tab 3) */}
      {activeTab === 3 && <div className="px-3 py-2 flex items-center gap-1" style={{borderBottom:`1px solid var(--bd)`,background:'var(--bg2)'}}>
        <span style={{fontSize:13,color:'var(--tx3)',marginRight:8}}>Tool:</span>
        {[{i:4,l:'Sweep'},{i:5,l:'Optimizer'}].map(t =>
          <button key={t.i} onClick={()=>setViewTab(t.i)}
            style={{padding:'4px 12px',fontSize:13,border:`1px solid ${viewTab===t.i?'var(--accent)':'var(--bd)'}`,
              borderRadius:6,background:viewTab===t.i?'var(--accent)':'transparent',
              color:viewTab===t.i?'#fff':'var(--tx2)',cursor:'pointer'}}>{t.l}</button>)}
      </div>}

      {/* Fitting tab placeholder */}
      {activeTab === 2 && <div className="vp">
        <div className="vc full">
          <div className="vt">Fitting — Semi-empirical 계수 피팅</div>
          <div style={{padding:16,color:'var(--tx2)',fontSize:13,lineHeight:1.6}}>
            <p>실험 데이터를 업로드하면 9개 손실 계수를 자동 피팅합니다.</p>
            <p style={{marginTop:8,fontSize:13,color:'var(--tx3)'}}>현재 피팅 기능은 헤더의 <strong>Semi-empirical</strong> 모드에서 사용할 수 있습니다.</p>
            <p style={{marginTop:8,fontSize:13,color:'var(--tx3)'}}>→ 향후 이 탭으로 분리 예정</p>
          </div>
        </div>
      </div>}

      {/* ═══ TAB 0: VISUALIZATION with sub-tabs (one view at a time, large) ═══ */}
      {activeTab === 0 && <div className="vp">
        {/* Sub-tab selector */}
        <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>
          {[{i:0,l:'3D Model'},{i:1,l:'Top view'},{i:2,l:'Front view'},{i:3,l:'Bottom view'}].map(t =>
            <button key={t.i} onClick={()=>setVizSub(t.i)}
              style={{padding:'8px 18px',fontSize:13,
                border:`1px solid ${vizSub===t.i?'var(--accent)':'var(--bd)'}`,
                borderRadius:'var(--r)',
                background:vizSub===t.i?'var(--accent)':'transparent',
                color:vizSub===t.i?'#fff':'var(--tx2)',
                cursor:'pointer',fontFamily:"'Noto Sans KR', sans-serif",fontWeight:vizSub===t.i?500:400,
                transition:'all .15s'}}>{t.l}</button>)}
        </div>

        {/* Sub-tab 0: 3D Model (full size) */}
        {vizSub === 0 && <div className="vc">
          <div className="vt">3D Model <span className="sub">— drag to rotate, scroll to zoom</span></div>
          <div ref={mountRef} style={{ width:"100%", height:500, borderRadius:8, background:'var(--bg3)' }} />
          <div style={{padding:'10px 0 0',display:'flex',gap:12,flexWrap:'wrap',fontSize:13,color:'var(--tx2)',borderTop:'1px solid var(--bd)',marginTop:10}}>
            <label style={{display:'flex',alignItems:'center',gap:4,cursor:'pointer'}}><input type="checkbox" checked={showShroud} onChange={e=>setShowShroud(e.target.checked)} />측판</label>
            <label style={{display:'flex',alignItems:'center',gap:4,cursor:'pointer'}}><input type="checkbox" checked={showBackplate} onChange={e=>setShowBackplate(e.target.checked)} />주판</label>
            <label style={{display:'flex',alignItems:'center',gap:4,cursor:'pointer'}}><input type="checkbox" checked={showScroll} onChange={e=>setShowScroll(e.target.checked)} />스크롤</label>
            <label style={{display:'flex',alignItems:'center',gap:4,cursor:'pointer'}}><input type="checkbox" checked={showCasing} onChange={e=>setShowCasing(e.target.checked)} />케이싱</label>
            <label style={{display:'flex',alignItems:'center',gap:4,cursor:'pointer'}}><input type="checkbox" checked={autoRotate} onChange={e=>setAutoRotate(e.target.checked)} />자동회전</label>
            <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:13,color:'var(--tx3)'}}>분해</span>
              <input type="range" min={0} max={30} step={1} value={explode} onChange={e=>setExplode(+e.target.value)} style={{width:120}} />
              <span style={{fontSize:13,fontFamily:'var(--mono)',color:'var(--tx2)',minWidth:24}}>{explode}</span>
            </div>
          </div>
        </div>}

        {/* Sub-tab 1: Top view (full size) */}
        {vizSub === 1 && <div className="vc">
          <div className="vt">Top view <span className="sub">— plan view with scroll housing</span></div>
          <div style={{minHeight:480,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <FrontView {...{Deye,D1,D2,Du,b1,b2,bladePts,Z,bladeType,bendPos,showScroll,scrollType,wrapAngle,cutoffGap,cutoffAngle,Rtongue,tongueOutLen,tongueOutAngle,diffAngle,diffLength,diffType,diffInnerWall,showCasing,casingW,casingH,casingCX,casingCY,scrollExpRate,exitAngle,scrollExpMode,scrollExpPts}} />
          </div>
        </div>}

        {/* Sub-tab 2: Front view (full size) */}
        {vizSub === 2 && <div className="vc">
          <div className="vt">Front view <span className="sub">— axial cross section</span></div>
          <div style={{minHeight:480,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <SectionView {...{Deye,D1,D2,Du,b1,b2,eyeRise,showScroll,scrollGapF,scrollGapB,bScroll,hubDepth,hubFillet}} />
          </div>
        </div>}

        {/* Sub-tab 3: Bottom view (full size) */}
        {vizSub === 3 && <div className="vc">
          <div className="vt">Bottom view <span className="sub">— from below (hub side)</span></div>
          <div style={{minHeight:480,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <BottomView {...{D2,Du,Deye}} />
          </div>
        </div>}
      </div>}

      {/* ═══ Legacy hidden pass-through (renders chosen viewTab content for non-Viz tabs) ═══ */}
      <div style={{display: activeTab === 2 || activeTab === 0 ? 'none' : 'block'}}>
        <div className="px-4 py-2">
        <div className="rounded-lg overflow-hidden" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
          {viewTab===0 && <>
            <div style={{display:'none'}} />
            <div className="px-2 py-1 flex gap-2 flex-wrap" style={{ borderTop:`1px solid ${C.border}` }}>
              <label className="flex items-center gap-1 text-xs" style={{ fontFamily: "'Noto Sans KR', sans-serif",color:C.dim }}><input type="checkbox" checked={showShroud} onChange={e=>setShowShroud(e.target.checked)} /><span style={{color:C.shroud}}>측판</span></label>
              <label className="flex items-center gap-1 text-xs" style={{ fontFamily: "'Noto Sans KR', sans-serif",color:C.dim }}><input type="checkbox" checked={showBackplate} onChange={e=>setShowBackplate(e.target.checked)} /><span style={{color:C.backplate}}>주판</span></label>
              <label className="flex items-center gap-1 text-xs" style={{ fontFamily: "'Noto Sans KR', sans-serif",color:C.dim }}><input type="checkbox" checked={showScroll} onChange={e=>setShowScroll(e.target.checked)} /><span style={{color:"#d4a44a"}}>스크롤</span></label>
              <label className="flex items-center gap-1 text-xs" style={{ fontFamily: "'Noto Sans KR', sans-serif",color:C.dim }}><input type="checkbox" checked={showCasing} onChange={e=>setShowCasing(e.target.checked)} /><span style={{color:"#4488aa"}}>케이싱</span></label>
              <label className="flex items-center gap-1 text-xs" style={{ fontFamily: "'Noto Sans KR', sans-serif",color:C.dim }}><input type="checkbox" checked={autoRotate} onChange={e=>setAutoRotate(e.target.checked)} />회전</label>
              <div className="flex items-center gap-1 ml-auto"><span style={{fontFamily: "'Noto Sans KR', sans-serif",fontSize:12,color:C.dim}}>분해</span>
                <input type="range" min={0} max={30} step={1} value={explode} onChange={e=>setExplode(+e.target.value)} className="w-16 h-1" style={{accentColor:C.accent}} /></div>
            </div>
          </>}
          {viewTab===1 && <div className="py-2"><FrontView {...{Deye,D1,D2,Du,b1,b2,bladePts,Z,bladeType,bendPos,showScroll,scrollType,wrapAngle,cutoffGap,cutoffAngle,Rtongue,tongueOutLen,tongueOutAngle,diffAngle,diffLength,diffType,diffInnerWall,showCasing,casingW,casingH,casingCX,casingCY,scrollExpRate,exitAngle,scrollExpMode,scrollExpPts}} /></div>}
          {viewTab===2 && <div className="py-2"><SectionView {...{Deye,D1,D2,Du,b1,b2,eyeRise,showScroll,scrollGapF,scrollGapB,bScroll,hubDepth,hubFillet}} /></div>}
          {viewTab===3 && <div className="py-2"><BottomView {...{D2,Du,Deye}} /></div>}
          <div style={{display:viewTab===4?'block':'none'}}>
          {(() => {
            const sv = SWEEP_VARS.find(v => v.key === sweepVar);
            return <div className="p-2">
              <div style={{ color: C.pink, fontFamily: "'Noto Sans KR', sans-serif", fontSize:12, marginBottom: 3 }}>SWEEP 변수 선택</div>
              <div className="flex gap-1 flex-wrap mb-2">
                {SWEEP_VARS.map(v => <button key={v.key} onClick={() => { setSweepVar(v.key); setSweepMin(v.min); setSweepMax(v.max); }}
                  className="px-3 py-1.5 rounded" style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize:11,
                    background:sweepVar===v.key?C.card:"transparent", color:sweepVar===v.key?C.pink:C.dim,
                    border:`1px solid ${sweepVar===v.key?C.pink:C.border}` }}>{v.label}</button>)}
              </div>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <S label="Min" value={sweepMin} min={sv?.min||0} max={sv?.max||999} step={sv?.step||1} onChange={setSweepMin} unit={sv?.unit||''} color={C.pink} />
                <S label="Max" value={sweepMax} min={sv?.min||0} max={sv?.max||999} step={sv?.step||1} onChange={setSweepMax} unit={sv?.unit||''} color={C.pink} />
                <S label="Steps" value={sweepSteps} min={3} max={30} step={1} onChange={setSweepSteps} unit="" color={C.dim} />
              </div>
              {sweepResults.length > 0 && <>
                <div style={{ color: C.dim, fontFamily: "'Noto Sans KR', sans-serif", fontSize:12, marginBottom: 3 }}>출력 변수</div>
                <div className="flex gap-1 flex-wrap mb-2">
                  {[{k:'eta',l:'η 효율',c:C.green},{k:'Ps',l:'Ps 정압',c:C.cyan},{k:'Q',l:'Q 유량',c:C.amber},
                    {k:'SPL',l:'SPL 소음',c:C.purple},{k:'SF',l:'SF 안전율',c:C.orange},{k:'f_n',l:'f_n 고유진동수',c:C.cyan}
                  ].map(v => <button key={v.k} onClick={() => setSweepOut(v.k)} className="px-3 py-1.5 rounded"
                    style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize:12, background:sweepOut===v.k?C.card:"transparent",
                      color:sweepOut===v.k?v.c:C.dim, border:`1px solid ${sweepOut===v.k?v.c:C.border}` }}>{v.l}</button>)}
                </div>
                {(() => {
                  const outMap = {eta:{c:C.green,l:'η 효율',u:''},Ps:{c:C.cyan,l:'Ps 정압 [Pa]',u:'Pa'},Q:{c:C.amber,l:'Q_BEP [m³/min]',u:''},
                    SPL:{c:C.purple,l:'SPL [dB]',u:'dB'},SF:{c:C.orange,l:'안전율 SF',u:''},f_n:{c:C.cyan,l:'f_n [Hz]',u:'Hz'}};
                  const o = outMap[sweepOut] || outMap.eta;
                  return <MiniChart data={sweepResults} xKey="x" yKey={sweepOut} w={340} h={200} color={o.c} label={`${o.l}  vs  ${sv?.label||sweepVar}`} yUnit={o.u} />;
                })()}
                <div style={{ overflowX:"auto", maxHeight:200 }}>
                  <table style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize:11, borderCollapse:"collapse", width:"100%" }}>
                    <thead><tr style={{ borderBottom:`1px solid ${C.border}` }}>
                      {[sv?.label||'X','Q','Ps','η%','SPL','σ','SF','f_n','f/B'].map(h => <th key={h} className="px-3 py-1.5 text-right" style={{color:C.dim}}>{h}</th>)}
                    </tr></thead>
                    <tbody>{sweepResults.map((r,i) => {
                      const fnB = r.BPF>0?r.f_n/r.BPF:0;
                      const best = r.eta===Math.max(...sweepResults.map(d=>d.eta));
                      return <tr key={i} style={{ borderBottom:`1px solid ${C.border}11`, background:best?`${C.green}11`:"transparent" }}>
                        <td className="px-3 py-1.5 text-right" style={{color:C.pink}}>{r.x.toFixed(sv?.step<1?1:0)}</td>
                        <td className="px-3 py-1.5 text-right" style={{color:C.amber}}>{r.Q.toFixed(1)}</td>
                        <td className="px-3 py-1.5 text-right" style={{color:C.cyan}}>{r.Ps.toFixed(0)}</td>
                        <td className="px-3 py-1.5 text-right" style={{color:C.green}}>{(r.eta*100).toFixed(1)}</td>
                        <td className="px-3 py-1.5 text-right" style={{color:r.SPL>70?C.red:C.purple}}>{r.SPL.toFixed(1)}</td>
                        <td className="px-3 py-1.5 text-right" style={{color:C.orange}}>{r.sigma.toFixed(1)}</td>
                        <td className="px-3 py-1.5 text-right" style={{color:r.SF>2?C.green:C.red}}>{r.SF.toFixed(1)}</td>
                        <td className="px-3 py-1.5 text-right" style={{color:C.cyan}}>{r.f_n.toFixed(0)}</td>
                        <td className="px-3 py-1.5 text-right" style={{color:Math.abs(fnB-1)<0.15?C.red:C.dim}}>{fnB.toFixed(2)}</td>
                      </tr>;})}</tbody>
                  </table>
                </div>
                <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize:11, color:C.dim, marginTop:4 }}>
                  <span style={{color:C.green}}>■</span> 최고효율 | <span style={{color:C.red}}>■</span> SF{"<"}2 / 공진위험 | 재질: {mat.name}
                </div>
              </>}
            </div>;
          })()}
          </div>
          <div style={{display:viewTab===5?'block':'none'}}><div className="p-2">
            <div className="flex items-center gap-2 mb-2">
              <span style={{ color:C.green, fontFamily: "'Noto Sans KR', sans-serif", fontSize:13, fontWeight:700 }}>OPTIMIZER</span>
              <div className="flex gap-1 ml-auto">
                {[{k:'single',l:'단일 목적'},{k:'multi',l:'다목적 (Pareto)'}].map(m =>
                  <button key={m.k} onClick={() => setOptMode(m.k)} className="px-3 py-1.5 rounded"
                    style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize:11, background:optMode===m.k?C.card:"transparent",
                      color:optMode===m.k?C.green:C.dim, border:`1px solid ${optMode===m.k?C.green:C.border}` }}>{m.l}</button>)}
              </div>
            </div>
            {/* Objectives */}
            <div className="mb-2 p-1.5 rounded" style={{ background:C.bg }}>
              <div style={{ color:C.dim, fontFamily: "'Noto Sans KR', sans-serif", fontSize:12, marginBottom:3 }}>①목표함수</div>
              <div className="flex gap-1 flex-wrap">
                {OBJ_LIST.map(o => <button key={o.key} onClick={() => setOptObj1(o.key)} className="px-3 py-1.5 rounded"
                  style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize:11, background:optObj1===o.key?C.card:"transparent",
                    color:optObj1===o.key?o.color:C.dim, border:`1px solid ${optObj1===o.key?o.color:C.border}` }}>{o.label}</button>)}
              </div>
              {optMode==='multi' && <><div className="mt-1" style={{ color:C.dim, fontFamily: "'Noto Sans KR', sans-serif", fontSize:12 }}>②목표함수</div>
                <div className="flex gap-1 flex-wrap mt-1">
                  {OBJ_LIST.filter(o=>o.key!==optObj1).map(o => <button key={o.key} onClick={() => setOptObj2(o.key)} className="px-3 py-1.5 rounded"
                    style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize:11, background:optObj2===o.key?C.card:"transparent",
                      color:optObj2===o.key?o.color:C.dim, border:`1px solid ${optObj2===o.key?o.color:C.border}` }}>{o.label}</button>)}
                </div></>}
            </div>
            {/* Variables */}
            <div className="mb-2 p-1.5 rounded" style={{ background:C.bg }}>
              <div style={{ color:C.dim, fontFamily: "'Noto Sans KR', sans-serif", fontSize:12, marginBottom:3 }}>설계변수 (☑최적화 / ☐고정)</div>
              {OPT_VARS.map(v => <div key={v.key} className="flex items-center gap-1 py-px" style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize:12 }}>
                <label className="flex items-center gap-1 w-16">
                  <input type="checkbox" checked={optEnabled[v.key]} onChange={e => setOptEnabled({...optEnabled,[v.key]:e.target.checked})} />
                  <span style={{ color:optEnabled[v.key]?C.green:C.dim }}>{v.label}</span>
                </label>
                {optEnabled[v.key] ? <>
                  <input type="number" value={optRange[v.key].min} onChange={e => setOptRange({...optRange,[v.key]:{...optRange[v.key],min:+e.target.value}})}
                    className="w-11 px-0.5 rounded text-right" style={{ background:C.card,color:C.text,fontSize:12,border:`1px solid ${C.border}`,fontFamily: "'Noto Sans KR', sans-serif" }} />
                  <span style={{color:C.dim}}>~</span>
                  <input type="number" value={optRange[v.key].max} onChange={e => setOptRange({...optRange,[v.key]:{...optRange[v.key],max:+e.target.value}})}
                    className="w-11 px-0.5 rounded text-right" style={{ background:C.card,color:C.text,fontSize:12,border:`1px solid ${C.border}`,fontFamily: "'Noto Sans KR', sans-serif" }} />
                  <span style={{color:C.dim,fontSize:11}}>Δ</span>
                  <input type="number" value={optRange[v.key].step} onChange={e => setOptRange({...optRange,[v.key]:{...optRange[v.key],step:+e.target.value}})}
                    className="w-9 px-0.5 rounded text-right" style={{ background:C.card,color:C.amber,fontSize:12,border:`1px solid ${C.border}33`,fontFamily: "'Noto Sans KR', sans-serif" }} />
                  <span style={{color:C.dim,fontSize:11}}>{v.unit}</span>
                </> : <span style={{color:C.dim,fontSize:11}}>고정</span>}
              </div>)}
            </div>
            {/* Run */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1"><S label="샘플" value={optSamples} min={50} max={1000} step={50} onChange={setOptSamples} unit="" color={C.green} /></div>
              <button onClick={runOptimization} disabled={optRunning} className="px-4 py-1.5 rounded font-bold"
                style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize:13, background:optRunning?C.dim:C.green, color:C.bg }}>
                {optRunning?"계산 중...":"▶ 실행"}</button>
            </div>
            {/* Single result */}
            {optResults?.mode==='single' && <div className="p-1.5 rounded" style={{ background:C.bg }}>
              <div style={{ color:C.green, fontFamily: "'Noto Sans KR', sans-serif", fontSize:12, marginBottom:4 }}>최적 결과 — {optResults.obj.label} ({optResults.all.length}샘플)</div>
              {/* Chart: objective vs first active variable */}
              {(() => {
                const activeVars = OPT_VARS.filter(v=>optEnabled[v.key]);
                const xVar = activeVars[0];
                if (!xVar || !optResults.all.length) return null;
                const all = optResults.all, top = optResults.top10, best = optResults.best;
                const objKey = optResults.obj.key;
                const xKey = xVar.key;
                const xVals = all.map(s=>s.params[xKey]).filter(isFinite);
                const yVals = all.map(s=>objKey==='eta'?s[objKey]*100:s[objKey]).filter(isFinite);
                if (!xVals.length) return null;
                const x1=Math.min(...xVals),x2=Math.max(...xVals),y1=Math.min(...yVals),y2=Math.max(...yVals);
                const W=320,H=160,p={l:36,r:10,t:8,b:20},pw=W-p.l-p.r,ph=H-p.t-p.b;
                const sx=v=>p.l+(v-x1)/((x2-x1)||1)*pw, sy=v=>p.t+ph-(v-y1)/((y2-y1)||1)*ph;
                return <svg width={W} height={H} style={{display:"block",margin:"0 auto 4px",background:C.card,borderRadius:4}}>
                  <line x1={p.l} y1={p.t} x2={p.l} y2={p.t+ph} stroke={C.border} strokeWidth={0.5}/>
                  <line x1={p.l} y1={p.t+ph} x2={p.l+pw} y2={p.t+ph} stroke={C.border} strokeWidth={0.5}/>
                  {all.map((s,i)=>{const yv=objKey==='eta'?s[objKey]*100:s[objKey]; return <circle key={i} cx={sx(s.params[xKey])} cy={sy(yv)} r={1.5} fill={C.dim} opacity={0.15}/>;})}
                  {top.map((s,i)=>{const yv=objKey==='eta'?s[objKey]*100:s[objKey]; return <circle key={'t'+i} cx={sx(s.params[xKey])} cy={sy(yv)} r={3} fill={i===0?C.green:C.cyan} opacity={0.8}
                    style={{cursor:'pointer'}} onClick={()=>applyOptResult(s)}/>;})}
                  <text x={p.l+pw/2} y={H-2} fill={C.dim} fontSize={7} fontFamily="'Noto Sans KR', sans-serif" textAnchor="middle">{xVar.label} ({xVar.unit})</text>
                  <text x={4} y={p.t+ph/2} fill={C.dim} fontSize={6} fontFamily="'Noto Sans KR', sans-serif" textAnchor="middle" transform={`rotate(-90,4,${p.t+ph/2})`}>{optResults.obj.label.split(' ')[0]}</text>
                  <text x={p.l-2} y={p.t+6} fill={C.dim} fontSize={6} fontFamily="'Noto Sans KR', sans-serif" textAnchor="end">{y2.toFixed(1)}</text>
                  <text x={p.l-2} y={p.t+ph} fill={C.dim} fontSize={6} fontFamily="'Noto Sans KR', sans-serif" textAnchor="end">{y1.toFixed(1)}</text>
                  <text x={p.l} y={p.t+ph+10} fill={C.dim} fontSize={6} fontFamily="'Noto Sans KR', sans-serif">{x1.toFixed(0)}</text>
                  <text x={p.l+pw} y={p.t+ph+10} fill={C.dim} fontSize={6} fontFamily="'Noto Sans KR', sans-serif" textAnchor="end">{x2.toFixed(0)}</text>
                </svg>;
              })()}
              {/* Multi-variable: show small charts for each active var */}
              {(() => {
                const activeVars = OPT_VARS.filter(v=>optEnabled[v.key]);
                if (activeVars.length <= 1) return null;
                const all = optResults.all, objKey = optResults.obj.key;
                return <div className="flex gap-1 flex-wrap mb-2">
                  {activeVars.slice(1).map(xVar => {
                    const xVals=all.map(s=>s.params[xVar.key]).filter(isFinite);
                    const yVals=all.map(s=>objKey==='eta'?s[objKey]*100:s[objKey]).filter(isFinite);
                    if(!xVals.length) return null;
                    const x1=Math.min(...xVals),x2=Math.max(...xVals),y1=Math.min(...yVals),y2=Math.max(...yVals);
                    const W=150,H=90,p={l:24,r:4,t:4,b:14},pw=W-p.l-p.r,ph=H-p.t-p.b;
                    const sx=v=>p.l+(v-x1)/((x2-x1)||1)*pw, sy=v=>p.t+ph-(v-y1)/((y2-y1)||1)*ph;
                    return <svg key={xVar.key} width={W} height={H} style={{background:C.card,borderRadius:3}}>
                      {all.map((s,i)=>{const yv=objKey==='eta'?s[objKey]*100:s[objKey]; return <circle key={i} cx={sx(s.params[xVar.key])} cy={sy(yv)} r={1} fill={C.dim} opacity={0.15}/>;})}
                      {optResults.top10.slice(0,3).map((s,i)=>{const yv=objKey==='eta'?s[objKey]*100:s[objKey]; return <circle key={'t'+i} cx={sx(s.params[xVar.key])} cy={sy(yv)} r={2.5} fill={i===0?C.green:C.cyan} opacity={0.8}/>;})}
                      <text x={p.l+pw/2} y={H-2} fill={C.dim} fontSize={6} fontFamily="'Noto Sans KR', sans-serif" textAnchor="middle">{xVar.label}</text>
                    </svg>;
                  })}
                </div>;
              })()}
              <div className="p-2 rounded mb-2" style={{ background:C.card, border:`1px solid ${C.green}44` }}>
                <div className="grid grid-cols-4 gap-1 mb-1">
                  {[{l:'η',v:(optResults.best.eta*100).toFixed(1)+'%',c:C.green},{l:'Ps',v:optResults.best.Ps.toFixed(0)+'Pa',c:C.cyan},
                    {l:'SPL',v:optResults.best.SPL.toFixed(1)+'dB',c:C.purple},{l:'SF',v:optResults.best.SF.toFixed(1),c:C.orange},
                    {l:'Q',v:optResults.best.Q.toFixed(1),c:C.amber},{l:'W',v:optResults.best.power.toFixed(1)+'W',c:C.red},
                    {l:'f_n',v:optResults.best.f_n.toFixed(0)+'Hz',c:C.cyan},{l:'σ',v:optResults.best.sigma.toFixed(1),c:C.orange},
                  ].map(m => <div key={m.l} className="text-center" style={{fontSize:12,fontFamily: "'Noto Sans KR', sans-serif"}}>
                    <div style={{color:C.dim,fontSize:11}}>{m.l}</div><div style={{color:m.c}}>{m.v}</div></div>)}
                </div>
                <div style={{ fontSize:11, fontFamily: "'Noto Sans KR', sans-serif", color:C.muted }}>
                  {OPT_VARS.filter(v=>optEnabled[v.key]).map(v=>`${v.label}=${optResults.best.params[v.key]}`).join(' | ')}</div>
                <button onClick={() => applyOptResult(optResults.best)} className="mt-1 px-3 py-0.5 rounded w-full"
                  style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize:12, background:C.green+'22', color:C.green, border:`1px solid ${C.green}44` }}>🔧 적용</button>
              </div>
              <div style={{ overflowX:"auto", maxHeight:140 }}>
                <table style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize:11, borderCollapse:"collapse", width:"100%" }}>
                  <thead><tr style={{ borderBottom:`1px solid ${C.border}` }}>
                    <th className="px-1" style={{color:C.dim}}>#</th>
                    {OPT_VARS.filter(v=>optEnabled[v.key]).map(v=><th key={v.key} className="px-1 text-right" style={{color:C.dim}}>{v.label}</th>)}
                    <th className="px-1 text-right" style={{color:C.dim}}>η%</th><th className="px-1 text-right" style={{color:C.dim}}>SPL</th>
                    <th className="px-1 text-right" style={{color:C.dim}}>SF</th><th className="px-1" style={{color:C.dim}}></th>
                  </tr></thead>
                  <tbody>{optResults.top10.map((r,i)=><tr key={i} style={{borderBottom:`1px solid ${C.border}11`,background:i===0?`${C.green}11`:'transparent'}}>
                    <td className="px-1" style={{color:C.dim}}>{i+1}</td>
                    {OPT_VARS.filter(v=>optEnabled[v.key]).map(v=><td key={v.key} className="px-1 text-right" style={{color:C.text}}>{typeof r.params[v.key]==='number'&&r.params[v.key]%1!==0?r.params[v.key].toFixed(1):r.params[v.key]}</td>)}
                    <td className="px-1 text-right" style={{color:C.green}}>{(r.eta*100).toFixed(1)}</td>
                    <td className="px-1 text-right" style={{color:C.purple}}>{r.SPL.toFixed(1)}</td>
                    <td className="px-1 text-right" style={{color:r.SF>2?C.green:C.red}}>{r.SF.toFixed(1)}</td>
                    <td><button onClick={()=>applyOptResult(r)} style={{color:C.cyan,fontSize:11}}>적용</button></td>
                  </tr>)}</tbody>
                </table>
              </div>
            </div>}
            {/* Multi-objective Pareto */}
            {optResults?.mode==='multi' && <div className="p-1.5 rounded" style={{ background:C.bg }}>
              <div style={{ color:C.green, fontFamily: "'Noto Sans KR', sans-serif", fontSize:12, marginBottom:4 }}>
                Pareto Front — {optResults.obj1.label} vs {optResults.obj2.label} ({optResults.pareto.length}개)
              </div>
              {(() => {
                const pts=optResults.pareto,all=optResults.all;
                if(!pts.length) return <div style={{color:C.dim,fontSize:12}}>비지배해 없음</div>;
                const k1=optResults.obj1.key,k2=optResults.obj2.key;
                const v1=all.map(s=>s[k1]).filter(isFinite),v2=all.map(s=>s[k2]).filter(isFinite);
                const x1=Math.min(...v1),x2=Math.max(...v1),y1=Math.min(...v2),y2=Math.max(...v2);
                const W=320,H=180,p={l:40,r:10,t:10,b:22},pw=W-p.l-p.r,ph=H-p.t-p.b;
                const sx=v=>p.l+(v-x1)/((x2-x1)||1)*pw, sy=v=>p.t+ph-(v-y1)/((y2-y1)||1)*ph;
                return <svg width={W} height={H} style={{display:"block",margin:"0 auto"}}>
                  <line x1={p.l} y1={p.t} x2={p.l} y2={p.t+ph} stroke={C.border} strokeWidth={0.5}/>
                  <line x1={p.l} y1={p.t+ph} x2={p.l+pw} y2={p.t+ph} stroke={C.border} strokeWidth={0.5}/>
                  {all.map((s,i)=><circle key={i} cx={sx(s[k1])} cy={sy(s[k2])} r={1.5} fill={C.dim} opacity={0.15}/>)}
                  {pts.map((s,i)=><circle key={'p'+i} cx={sx(s[k1])} cy={sy(s[k2])} r={3.5} fill={C.green} opacity={0.8}
                    style={{cursor:'pointer'}} onClick={()=>applyOptResult(s)}/>)}
                  <text x={p.l+pw/2} y={H-3} fill={C.dim} fontSize={8} fontFamily="'Noto Sans KR', sans-serif" textAnchor="middle">{optResults.obj1.label}</text>
                  <text x={8} y={p.t+ph/2} fill={C.dim} fontSize={7} fontFamily="'Noto Sans KR', sans-serif" textAnchor="middle" transform={`rotate(-90,8,${p.t+ph/2})`}>{optResults.obj2.label}</text>
                </svg>;
              })()}
              <div style={{color:C.dim,fontFamily: "'Noto Sans KR', sans-serif",fontSize:11,marginTop:2}}>● Pareto 최적해 (클릭→적용) | ● 전체 샘플</div>
              <div style={{ overflowX:"auto", maxHeight:110, marginTop:4 }}>
                <table style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize:11, borderCollapse:"collapse", width:"100%" }}>
                  <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>
                    <th className="px-1" style={{color:C.dim}}>#</th>
                    <th className="px-1 text-right" style={{color:optResults.obj1.color}}>{optResults.obj1.label.split(' ')[0]}</th>
                    <th className="px-1 text-right" style={{color:optResults.obj2.color}}>{optResults.obj2.label.split(' ')[0]}</th>
                    {OPT_VARS.filter(v=>optEnabled[v.key]).map(v=><th key={v.key} className="px-1 text-right" style={{color:C.dim}}>{v.label}</th>)}
                    <th className="px-1" style={{color:C.dim}}></th>
                  </tr></thead>
                  <tbody>{optResults.pareto.slice(0,15).map((r,i)=><tr key={i} style={{borderBottom:`1px solid ${C.border}11`}}>
                    <td className="px-1" style={{color:C.dim}}>{i+1}</td>
                    <td className="px-1 text-right" style={{color:optResults.obj1.color}}>{(optResults.obj1.key==='eta'?r[optResults.obj1.key]*100:r[optResults.obj1.key]).toFixed(1)}</td>
                    <td className="px-1 text-right" style={{color:optResults.obj2.color}}>{(optResults.obj2.key==='eta'?r[optResults.obj2.key]*100:r[optResults.obj2.key]).toFixed(1)}</td>
                    {OPT_VARS.filter(v=>optEnabled[v.key]).map(v=><td key={v.key} className="px-1 text-right" style={{color:C.text}}>{typeof r.params[v.key]==='number'&&r.params[v.key]%1!==0?r.params[v.key].toFixed(1):r.params[v.key]}</td>)}
                    <td><button onClick={()=>applyOptResult(r)} style={{color:C.cyan,fontSize:11}}>적용</button></td>
                  </tr>)}</tbody>
                </table>
              </div>
            </div>}
          </div></div>
          <div style={{display:viewTab===6?'block':'none'}}><div className="p-2">
            <div className="flex items-center gap-2 mb-2">
              <span style={{ color:C.cyan, fontFamily: "'Noto Sans KR', sans-serif", fontSize:13, fontWeight:700 }}>PQ ANALYSIS</span>
              <div className="flex gap-0.5 ml-auto">
                {[{k:'on_design',l:'On-design'},{k:'semi_empirical',l:'Semi-emp'},{k:'off_design',l:'Off-design'}].map(m =>
                  <button key={m.k} onClick={() => setFanMode(m.k)} className="px-3 py-1.5 rounded"
                    style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize:11, background:fanMode===m.k?C.card:"transparent",
                      color:fanMode===m.k?C.cyan:C.dim, border:`1px solid ${fanMode===m.k?C.cyan:C.border}` }}>{m.l}</button>)}
              </div>
            </div>
            {/* Semi-empirical fitting panel */}
            {fanMode==='semi_empirical' && <div className="mb-2 p-1.5 rounded" style={{ background:C.bg, border:`1px solid ${C.green}33` }}>
              <div className="flex items-center gap-2 mb-2">
                <span style={{ color:C.green, fontFamily: "'Noto Sans KR', sans-serif", fontSize:12 }}>피팅 자동 최적화</span>
                <button onClick={runFitting} disabled={fitRunning || expData.length < 3} className="ml-auto px-3 py-0.5 rounded"
                  style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize:12, background:fitRunning?C.dim:C.green, color:C.bg, opacity:expData.length<3?0.4:1 }}>
                  {fitRunning?"최적화 중...":"▶ 피팅 실행"}</button>
              </div>
              {expData.length < 3 && <div style={{fontFamily: "'Noto Sans KR', sans-serif",fontSize:11,color:C.red}}>⚠ 실험 데이터 3개 이상 필요 (Off-design에서 업로드)</div>}
              {expData.length >= 3 && !fitCoeffs && <div style={{fontFamily: "'Noto Sans KR', sans-serif",fontSize:11,color:C.dim}}>실험 데이터 {expData.length}점 로드됨. 피팅을 실행하세요.</div>}
              {fitCoeffs && <>
                <div style={{fontFamily: "'Noto Sans KR', sans-serif",fontSize:11,color:C.dim,marginBottom:2}}>피팅된 손실 계수 (9개)</div>
                <div className="grid grid-cols-3 gap-1" style={{fontFamily: "'Noto Sans KR', sans-serif",fontSize:11}}>
                  {[
                    {k:'k_inc',l:'Incidence',def:1.0},
                    {k:'k_fric',l:'Friction',def:1.0},
                    {k:'DR_crit',l:'DR_crit',def:0.5},
                    {k:'k_rec',l:'Recirc',def:0.0085},
                    {k:'k_disk',l:'Disk',def:1.0},
                    {k:'k_jw',l:'Jet-wake',def:1.0},
                    {k:'k_sc_mix',l:'Sc.mix',def:0.20},
                    {k:'k_tongue_a',l:'Tng.a',def:0.82},
                    {k:'k_tongue_b',l:'Tng.b',def:0.70},
                  ].map(c => {
                    const v = fitCoeffs[c.k];
                    const changed = Math.abs(v - c.def) / Math.max(0.001, c.def) > 0.05;
                    return <div key={c.k}>
                      <span style={{color:C.dim}}>{c.l}: </span>
                      <span style={{color:changed?C.amber:C.text}}>{typeof v==='number'?v.toFixed(4):v}</span>
                      {changed && <span style={{color:C.dim,fontSize:11}}> ({c.def})</span>}
                    </div>;
                  })}
                </div>
                {fitResult && <div className="mt-2 flex gap-3" style={{fontFamily: "'Noto Sans KR', sans-serif",fontSize:11}}>
                  <div><span style={{color:C.dim}}>RMSE 전: </span><span style={{color:C.red}}>{fitResult.rmse_before.toFixed(1)}</span></div>
                  <div><span style={{color:C.dim}}>→ 후: </span><span style={{color:C.green}}>{fitResult.rmse_after.toFixed(1)}</span></div>
                  <div><span style={{color:C.dim}}>개선: </span><span style={{color:C.green}}>{((1-fitResult.rmse_after/Math.max(0.1,fitResult.rmse_before))*100).toFixed(0)}%</span></div>
                </div>}
                <div className="flex gap-1 mt-2">
                  <button onClick={() => { setFitCoeffs(null); setFitResult(null); }} className="flex-1 py-0.5 rounded"
                    style={{fontFamily: "'Noto Sans KR', sans-serif",fontSize:11,color:C.red,background:C.card,border:`1px solid ${C.red}33`}}>초기화</button>
                </div>
              </>}
            </div>}
            {/* Experimental data upload */}
            {(fanMode==='off_design' || fanMode==='semi_empirical') && <div className="mb-2 p-1.5 rounded" style={{ background:C.bg, border:`1px solid ${C.orange}33` }}>
              <div style={{ color:C.orange, fontFamily: "'Noto Sans KR', sans-serif", fontSize:12, marginBottom:3 }}>실험 PQ 데이터</div>
              <div className="flex gap-1 mb-1">
                <button onClick={() => expFileRef.current?.click()} className="flex-1 py-1 rounded"
                  style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize:12, background:C.card, color:C.orange, border:`1px solid ${C.orange}44` }}>📂 CSV 불러오기</button>
                <input ref={expFileRef} type="file" accept=".csv,.tsv,.txt" style={{display:'none'}}
                  onChange={e => { const f=e.target.files?.[0]; if(f){const r=new FileReader(); r.onload=ev=>parseExpCSV(ev.target.result); r.readAsText(f);} }} />
                <button onClick={() => {
                  const txt = prompt('CSV 데이터 붙여넣기 (Q,Ps 또는 Q,Ps,eta)\n예: Q,Ps,eta\\n1.5,120,0.55\\n2.0,115,0.60');
                  if (txt) parseExpCSV(txt);
                }} className="flex-1 py-1 rounded"
                  style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize:12, background:C.card, color:C.amber, border:`1px solid ${C.amber}44` }}>📋 붙여넣기</button>
                {expData.length > 0 && <button onClick={() => setExpData([])} className="px-2 py-1 rounded"
                  style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize:12, background:C.card, color:C.red, border:`1px solid ${C.red}44` }}>✕</button>}
              </div>
              {expData.length > 0 && <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize:11, color:C.dim }}>
                {expData.length}개 데이터 로드 | Q: {Math.min(...expData.map(d=>d.Q)).toFixed(1)}~{Math.max(...expData.map(d=>d.Q)).toFixed(1)} m³/min
                {expData[0].eta > 0 && ` | η: ${Math.max(...expData.map(d=>d.eta)).toFixed(1)}`}
              </div>}
              {expData.length === 0 && <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize:11, color:C.dim }}>
                CSV 형식: Q,Ps[,Pt,eta,RPM,W] (헤더 필수, 탭/콤마 구분)
              </div>}
            </div>}
            {/* System resistance curve */}
            <div className="mb-2 p-1.5 rounded" style={{ background:C.bg, border:`1px solid ${showSysCurve?'#f97316':'transparent'}33` }}>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1" style={{fontFamily: "'Noto Sans KR', sans-serif",fontSize:12}}>
                  <input type="checkbox" checked={showSysCurve} onChange={e=>setShowSysCurve(e.target.checked)} />
                  <span style={{color:showSysCurve?'#f97316':C.dim}}>시스템 저항 커브</span>
                </label>
                {showSysCurve && <button onClick={() => sysCurveFileRef.current?.click()} className="ml-auto px-2 py-0.5 rounded"
                  style={{fontFamily: "'Noto Sans KR', sans-serif",fontSize:11,color:'#f97316',background:C.card,border:`1px solid #f9731644`}}>📂 저항 CSV</button>}
                <input ref={sysCurveFileRef} type="file" accept=".csv,.tsv,.txt" style={{display:'none'}}
                  onChange={e => { const f=e.target.files?.[0]; if(f){const r=new FileReader(); r.onload=ev=>parseSysCurveCSV(ev.target.result); r.readAsText(f);} }} />
              </div>
              {showSysCurve && <div className="mt-1">
                <div style={{fontFamily: "'Noto Sans KR', sans-serif",fontSize:11,color:C.dim,marginBottom:2}}>ΔP = a·Q² + b·Q + c (Pa, m³/min)</div>
                <div className="grid grid-cols-3 gap-1">
                  <S label="a" value={sysA} min={0} max={20} step={0.1} onChange={setSysA} unit="" color="#f97316" />
                  <S label="b" value={sysB} min={-10} max={10} step={0.1} onChange={setSysB} unit="" color="#f97316" />
                  <S label="c" value={sysC} min={0} max={100} step={1} onChange={setSysC} unit="Pa" color="#f97316" />
                </div>
                {sysCurveData.length > 0 && <div style={{fontFamily: "'Noto Sans KR', sans-serif",fontSize:11,color:C.dim,marginTop:1}}>
                  저항 데이터 {sysCurveData.length}점 → 자동 피팅 완료</div>}
                {operatingPoint && <div className="mt-1 p-1 rounded" style={{background:C.card,border:`1px solid #f9731644`}}>
                  <div style={{fontFamily: "'Noto Sans KR', sans-serif",fontSize:12,color:'#f97316',marginBottom:2}}>▸ 운전점</div>
                  <div className="grid grid-cols-4 gap-1" style={{fontFamily: "'Noto Sans KR', sans-serif",fontSize:11}}>
                    <div><span style={{color:C.dim}}>Q=</span><span style={{color:C.amber}}>{operatingPoint.Q.toFixed(1)}</span></div>
                    <div><span style={{color:C.dim}}>Ps=</span><span style={{color:C.cyan}}>{operatingPoint.Ps.toFixed(0)}</span></div>
                    <div><span style={{color:C.dim}}>η=</span><span style={{color:C.green}}>{(operatingPoint.eta*100).toFixed(1)}%</span></div>
                    <div><span style={{color:C.dim}}>W=</span><span style={{color:C.red}}>{(operatingPoint.Pshaft||0).toFixed(1)}</span></div>
                  </div>
                </div>}
              </div>}
            </div>
            {/* Quasi-steady time-domain simulation */}
            {showSysCurve && <div className="mb-2 p-1.5 rounded" style={{ background:C.bg, border:`1px solid ${C.purple}33` }}>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1" style={{fontFamily: "'Noto Sans KR', sans-serif",fontSize:12}}>
                  <input type="checkbox" checked={qsShow} onChange={e=>setQsShow(e.target.checked)} />
                  <span style={{color:qsShow?C.purple:C.dim}}>Quasi-Steady 시간영역</span>
                </label>
                {qsShow && <button onClick={runQuasiSteady} className="ml-auto px-3 py-0.5 rounded"
                  style={{fontFamily: "'Noto Sans KR', sans-serif",fontSize:12,background:C.purple,color:C.bg}}>▶ 시뮬레이션</button>}
              </div>
              {qsShow && <div className="mt-1">
                <div style={{fontFamily: "'Noto Sans KR', sans-serif",fontSize:11,color:C.dim,marginBottom:2}}>건조 시간에 따른 시스템 저항 변화 → 운전점 이동</div>
                <div className="grid grid-cols-2 gap-1 mb-1">
                  <S label="시간" value={qsDuration} min={10} max={180} step={5} onChange={setQsDuration} unit="min" color={C.purple} />
                  <S label="스텝" value={qsSteps} min={10} max={60} step={5} onChange={setQsSteps} unit="" color={C.purple} />
                </div>
                <div style={{fontFamily: "'Noto Sans KR', sans-serif",fontSize:11,color:C.dim,marginBottom:1}}>저항 변화 (시작 → 종료)</div>
                <div className="grid grid-cols-2 gap-1">
                  <S label="a₀" value={qsAStart} min={0.1} max={10} step={0.1} onChange={setQsAStart} unit="" color={C.purple} />
                  <S label="a₁" value={qsAEnd} min={0.1} max={10} step={0.1} onChange={setQsAEnd} unit="" color={C.purple} />
                  <S label="c₀" value={qsCStart} min={0} max={50} step={1} onChange={setQsCStart} unit="Pa" color={C.purple} />
                  <S label="c₁" value={qsCEnd} min={0} max={50} step={1} onChange={setQsCEnd} unit="Pa" color={C.purple} />
                </div>
                <div style={{fontFamily: "'Noto Sans KR', sans-serif",fontSize:11,color:C.dim,marginTop:1}}>a₀→a₁: 2차항 변화 (필터 막힘), c₀→c₁: 정적 손실 변화</div>
                {qsResults && qsResults.length > 2 && (() => {
                  const W=310,H=120,p={l:34,r:28,t:8,b:16};
                  const pw=W-p.l-p.r,ph=H-p.t-p.b;
                  const tMax=qsResults[qsResults.length-1].t;
                  const qArr=qsResults.map(r=>r.Q), psArr=qsResults.map(r=>r.Ps), etaArr=qsResults.map(r=>r.eta);
                  const qMin=Math.min(...qArr),qMax=Math.max(...qArr);
                  const psMin=Math.min(...psArr),psMax=Math.max(...psArr);
                  const etaMin=Math.min(...etaArr),etaMax=Math.max(...etaArr);
                  const sx=t=>p.l+(t/tMax)*pw;
                  const syQ=q=>p.t+ph-(q-qMin)/((qMax-qMin)||1)*ph;
                  const syPs=v=>p.t+ph-(v-psMin)/((psMax-psMin)||1)*ph;
                  const syEta=e=>p.t+ph-(e-etaMin)/((etaMax-etaMin)||0.01)*ph;
                  return <div className="mt-2">
                    {/* Q vs time */}
                    <svg width={W} height={H} style={{display:"block",margin:"0 auto",background:C.card,borderRadius:3}}>
                      <line x1={p.l} y1={p.t} x2={p.l} y2={p.t+ph} stroke={C.dim} strokeWidth={0.3}/>
                      <line x1={p.l} y1={p.t+ph} x2={p.l+pw} y2={p.t+ph} stroke={C.dim} strokeWidth={0.3}/>
                      <path d={qsResults.map((r,i)=>`${i===0?'M':'L'}${sx(r.t)} ${syQ(r.Q)}`).join(' ')} fill="none" stroke={C.amber} strokeWidth={1.5}/>
                      <path d={qsResults.map((r,i)=>`${i===0?'M':'L'}${sx(r.t)} ${syPs(r.Ps)}`).join(' ')} fill="none" stroke={C.cyan} strokeWidth={1.5}/>
                      <path d={qsResults.map((r,i)=>`${i===0?'M':'L'}${sx(r.t)} ${syEta(r.eta)}`).join(' ')} fill="none" stroke={C.green} strokeWidth={1.5}/>
                      <text x={p.l+pw/2} y={H-2} fill={C.dim} fontSize={6} fontFamily="'Noto Sans KR', sans-serif" textAnchor="middle">시간 (min)</text>
                      {/* Left axis labels */}
                      <text x={p.l-2} y={p.t+5} fill={C.amber} fontSize={5} fontFamily="'Noto Sans KR', sans-serif" textAnchor="end">{qMax.toFixed(1)}</text>
                      <text x={p.l-2} y={p.t+ph} fill={C.amber} fontSize={5} fontFamily="'Noto Sans KR', sans-serif" textAnchor="end">{qMin.toFixed(1)}</text>
                      {/* Right axis labels */}
                      <text x={p.l+pw+2} y={p.t+5} fill={C.cyan} fontSize={5} fontFamily="'Noto Sans KR', sans-serif">{psMax.toFixed(0)}</text>
                      <text x={p.l+pw+2} y={p.t+ph} fill={C.cyan} fontSize={5} fontFamily="'Noto Sans KR', sans-serif">{psMin.toFixed(0)}</text>
                      {/* Time labels */}
                      <text x={p.l} y={H-8} fill={C.dim} fontSize={5} fontFamily="'Noto Sans KR', sans-serif">0</text>
                      <text x={p.l+pw} y={H-8} fill={C.dim} fontSize={5} fontFamily="'Noto Sans KR', sans-serif" textAnchor="end">{tMax}</text>
                      {/* Legend */}
                      <line x1={p.l+5} y1={p.t+3} x2={p.l+15} y2={p.t+3} stroke={C.amber} strokeWidth={1.5}/>
                      <text x={p.l+17} y={p.t+6} fill={C.amber} fontSize={5} fontFamily="'Noto Sans KR', sans-serif">Q</text>
                      <line x1={p.l+30} y1={p.t+3} x2={p.l+40} y2={p.t+3} stroke={C.cyan} strokeWidth={1.5}/>
                      <text x={p.l+42} y={p.t+6} fill={C.cyan} fontSize={5} fontFamily="'Noto Sans KR', sans-serif">Ps</text>
                      <line x1={p.l+55} y1={p.t+3} x2={p.l+65} y2={p.t+3} stroke={C.green} strokeWidth={1.5}/>
                      <text x={p.l+67} y={p.t+6} fill={C.green} fontSize={5} fontFamily="'Noto Sans KR', sans-serif">η</text>
                    </svg>
                    {/* Summary */}
                    <div className="mt-1 grid grid-cols-3 gap-1" style={{fontFamily: "'Noto Sans KR', sans-serif",fontSize:11}}>
                      <div style={{textAlign:"center"}}>
                        <div style={{color:C.dim}}>Q</div>
                        <div style={{color:C.amber}}>{qMax.toFixed(1)} → {qMin.toFixed(1)}</div>
                      </div>
                      <div style={{textAlign:"center"}}>
                        <div style={{color:C.dim}}>Ps</div>
                        <div style={{color:C.cyan}}>{psArr[0].toFixed(0)} → {psArr[psArr.length-1].toFixed(0)}</div>
                      </div>
                      <div style={{textAlign:"center"}}>
                        <div style={{color:C.dim}}>η</div>
                        <div style={{color:C.green}}>{(etaArr[0]*100).toFixed(1)} → {(etaArr[etaArr.length-1]*100).toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>;
                })()}
              </div>}
            </div>}
            {(() => {
              const aero = baseAero;
              if (!aero?.pts?.length) return <div style={{color:C.dim}}>데이터 없음</div>;
              const pts = aero.pts.filter(p => p.Q > 0);
              const bep = aero.bep;
              const bepIdx = pts.findIndex(p => Math.abs(p.Q - bep.Q) < 0.5);
              // Include experimental data in axis scaling
              const allQ = [...pts.map(p=>p.Q), ...expData.map(d=>d.Q)];
              const allP = [...pts.map(p=>Math.max(p.Pt,p.Ps,p.Pdyn)), ...expData.map(d=>Math.max(d.Ps||0,d.Pt||0)),
                ...(showSysCurve ? [sysA*Math.max(...allQ)**2 + sysB*Math.max(...allQ) + sysC] : [])];
              const allEta = [...pts.map(p=>p.eta), ...expData.filter(d=>d.eta>0).map(d=>d.eta)];
              const W = 320, H = 160, pad = {l:38,r:12,t:10,b:22};
              const pw = W-pad.l-pad.r, ph = H-pad.t-pad.b;
              const maxQ = Math.max(...allQ);
              const maxP = Math.max(...allP);
              const maxEta = Math.max(...allEta, 0.01);
              const sx = q => pad.l + (q/maxQ)*pw;
              const syP = p => pad.t + ph - (p/Math.max(1,maxP))*ph;
              const syE = e => pad.t + ph - (e/Math.max(0.01,maxEta))*ph;
              const mkPath = (arr, fn) => arr.map((p,i) => `${i===0?'M':'L'}${sx(p.Q)} ${fn(p)}`).join(' ');
              // Fitted curve (semi-empirical)
              const fitPts = (fitCoeffs && fanMode==='semi_empirical') ? (() => {
                try {
                  const geom = {D1,D2,Deye,b1,b2,beta1,beta2,Z,RPM,tBlade,cutoffGap,Rtongue,wrapAngle,scrollExpRate,diffAngle,diffLength,tongueOutLen,tongueOutAngle};
                  return computeAeroFit(geom, fitCoeffs).pts.filter(p=>p.Q>0);
                } catch { return []; }
              })() : [];

              // Loss at BEP
              const bepPt = bepIdx >= 0 ? pts[bepIdx] : pts[0];
              const losses = [
                {l:'Incidence',v:bepPt.dPinc,c:'#ef4444'},
                {l:'Friction',v:bepPt.dPfric,c:'#f97316'},
                {l:'Recirculation',v:bepPt.dPrec,c:'#eab308'},
                {l:'Disk friction',v:bepPt.dPdisk,c:'#84cc16'},
                {l:'Jet-wake',v:bepPt.dPjw,c:'#22d3ee'},
                {l:'Scroll',v:bepPt.dP_scroll,c:'#a855f7'},
                {l:'Tongue',v:bepPt.dP_tongue,c:'#ec4899'},
                {l:'Uncaptured',v:bepPt.dP_uncap,c:'#6366f1'},
              ].filter(l => l.v > 0.1);
              const totalLoss = losses.reduce((s,l) => s+l.v, 0);
              const diffRecov = bepPt.dPs_diff || 0;

              return <>
                {/* Chart 1: PQ curve */}
                <svg width={W} height={H} style={{display:"block",margin:"0 auto",background:C.bg,borderRadius:4}}>
                  {[0.25,0.5,0.75,1].map(f => <line key={f} x1={pad.l} y1={syP(maxP*f)} x2={pad.l+pw} y2={syP(maxP*f)} stroke={C.border} strokeWidth={0.3}/>)}
                  <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t+ph} stroke={C.dim} strokeWidth={0.5}/>
                  <line x1={pad.l} y1={pad.t+ph} x2={pad.l+pw} y2={pad.t+ph} stroke={C.dim} strokeWidth={0.5}/>
                  <path d={mkPath(pts, p=>syP(p.Pdyn))} fill="none" stroke={C.amber} strokeWidth={1} opacity={0.4}/>
                  <path d={mkPath(pts, p=>syP(p.Pt))} fill="none" stroke={C.blade} strokeWidth={1.5} opacity={0.7}/>
                  <path d={mkPath(pts, p=>syP(p.Ps))} fill="none" stroke={C.cyan} strokeWidth={2}/>
                  {/* Fitted curve overlay */}
                  {fitPts.length > 2 && <path d={mkPath(fitPts, p=>syP(p.Ps))} fill="none" stroke={C.green} strokeWidth={1.5} strokeDasharray="4,2"/>}
                  <circle cx={sx(bep.Q)} cy={syP(bep.Ps)} r={4} fill="none" stroke={C.green} strokeWidth={2}/>
                  <line x1={sx(bep.Q)} y1={pad.t} x2={sx(bep.Q)} y2={pad.t+ph} stroke={C.green} strokeWidth={0.5} strokeDasharray="3,3" opacity={0.3}/>
                  <text x={sx(bep.Q)+5} y={syP(bep.Ps)-5} fill={C.green} fontSize={7} fontFamily="'Noto Sans KR', sans-serif" fontWeight="bold">BEP</text>
                  <text x={pad.l+pw/2} y={H-3} fill={C.dim} fontSize={7} fontFamily="'Noto Sans KR', sans-serif" textAnchor="middle">Q (m³/min)</text>
                  <text x={4} y={pad.t+ph/2} fill={C.dim} fontSize={6} fontFamily="'Noto Sans KR', sans-serif" textAnchor="middle" transform={`rotate(-90,4,${pad.t+ph/2})`}>P (Pa)</text>
                  <text x={pad.l-2} y={pad.t+6} fill={C.dim} fontSize={6} fontFamily="'Noto Sans KR', sans-serif" textAnchor="end">{maxP.toFixed(0)}</text>
                  <text x={pad.l+pw} y={pad.t+ph+10} fill={C.dim} fontSize={6} fontFamily="'Noto Sans KR', sans-serif" textAnchor="end">{maxQ.toFixed(1)}</text>
                  {/* Legend */}
                  <line x1={pad.l+5} y1={pad.t+4} x2={pad.l+16} y2={pad.t+4} stroke={C.cyan} strokeWidth={2}/>
                  <text x={pad.l+18} y={pad.t+7} fill={C.cyan} fontSize={6} fontFamily="'Noto Sans KR', sans-serif">Ps</text>
                  <line x1={pad.l+38} y1={pad.t+4} x2={pad.l+49} y2={pad.t+4} stroke={C.blade} strokeWidth={1.5}/>
                  <text x={pad.l+51} y={pad.t+7} fill={C.blade} fontSize={6} fontFamily="'Noto Sans KR', sans-serif">Pt</text>
                  <line x1={pad.l+68} y1={pad.t+4} x2={pad.l+79} y2={pad.t+4} stroke={C.amber} strokeWidth={1} opacity={0.6}/>
                  <text x={pad.l+81} y={pad.t+7} fill={C.amber} fontSize={6} fontFamily="'Noto Sans KR', sans-serif">Pd</text>
                  {/* Experimental data overlay */}
                  {expData.length > 0 && <>
                    {expData.map((d,i) => <circle key={'ep'+i} cx={sx(d.Q)} cy={syP(d.Ps||d.Pt||0)} r={3.5}
                      fill="none" stroke={C.orange} strokeWidth={1.5} opacity={0.8}/>)}
                    {expData.filter(d=>d.Pt>0).map((d,i) => <circle key={'ept'+i} cx={sx(d.Q)} cy={syP(d.Pt)} r={2.5}
                      fill="none" stroke={C.orange} strokeWidth={1} strokeDasharray="2,1" opacity={0.5}/>)}
                    <circle cx={pad.l+105} cy={pad.t+4} r={3} fill="none" stroke={C.orange} strokeWidth={1.5}/>
                    <text x={pad.l+110} y={pad.t+7} fill={C.orange} fontSize={6} fontFamily="'Noto Sans KR', sans-serif">Exp</text>
                    {fitPts.length > 0 && <>
                      <line x1={pad.l+128} y1={pad.t+4} x2={pad.l+139} y2={pad.t+4} stroke={C.green} strokeWidth={1.5} strokeDasharray="4,2"/>
                      <text x={pad.l+141} y={pad.t+7} fill={C.green} fontSize={6} fontFamily="'Noto Sans KR', sans-serif">Fit</text>
                    </>}
                  </>}
                  {/* System resistance curve */}
                  {showSysCurve && (() => {
                    const sysPts = [];
                    for (let q = 0; q <= maxQ; q += maxQ/40) sysPts.push({ Q: q, dP: sysA*q**2 + sysB*q + sysC });
                    return <>
                      <path d={sysPts.map((p,i) => `${i===0?'M':'L'}${sx(p.Q)} ${syP(p.dP)}`).join(' ')}
                        fill="none" stroke="#f97316" strokeWidth={1.5} strokeDasharray="6,3"/>
                      {sysCurveData.map((d,i) => <circle key={'sc'+i} cx={sx(d.Q)} cy={syP(d.dP)} r={2.5} fill="#f97316" opacity={0.5}/>)}
                      {operatingPoint && <>
                        <circle cx={sx(operatingPoint.Q)} cy={syP(operatingPoint.Ps)} r={6} fill="none" stroke="#f97316" strokeWidth={2.5}/>
                        <circle cx={sx(operatingPoint.Q)} cy={syP(operatingPoint.Ps)} r={2} fill="#f97316"/>
                        <line x1={sx(operatingPoint.Q)} y1={pad.t} x2={sx(operatingPoint.Q)} y2={pad.t+ph} stroke="#f97316" strokeWidth={0.5} strokeDasharray="2,3" opacity={0.4}/>
                        <text x={sx(operatingPoint.Q)+5} y={syP(operatingPoint.Ps)+12} fill="#f97316" fontSize={7} fontFamily="'Noto Sans KR', sans-serif" fontWeight="bold">OP</text>
                      </>}
                      <line x1={pad.l+155} y1={pad.t+4} x2={pad.l+166} y2={pad.t+4} stroke="#f97316" strokeWidth={1.5} strokeDasharray="4,2"/>
                      <text x={pad.l+168} y={pad.t+7} fill="#f97316" fontSize={6} fontFamily="'Noto Sans KR', sans-serif">Sys</text>
                    </>;
                  })()}
                </svg>

                {/* Chart 2: Efficiency curve */}
                <svg width={W} height={120} style={{display:"block",margin:"4px auto 0",background:C.bg,borderRadius:4}}>
                  {[0.25,0.5,0.75,1].map(f => <line key={f} x1={pad.l} y1={10+100*(1-f)} x2={pad.l+pw} y2={10+100*(1-f)} stroke={C.border} strokeWidth={0.3}/>)}
                  <line x1={pad.l} y1={10} x2={pad.l} y2={110} stroke={C.dim} strokeWidth={0.5}/>
                  <line x1={pad.l} y1={110} x2={pad.l+pw} y2={110} stroke={C.dim} strokeWidth={0.5}/>
                  <path d={pts.map((p,i) => `${i===0?'M':'L'}${sx(p.Q)} ${10+100*(1-p.eta/Math.max(0.01,maxEta))}`).join(' ')} fill="none" stroke={C.green} strokeWidth={2}/>
                  <circle cx={sx(bep.Q)} cy={10+100*(1-bep.eta/Math.max(0.01,maxEta))} r={4} fill={C.green} opacity={0.8}/>
                  <line x1={sx(bep.Q)} y1={10} x2={sx(bep.Q)} y2={110} stroke={C.green} strokeWidth={0.5} strokeDasharray="3,3" opacity={0.3}/>
                  <text x={sx(bep.Q)+5} y={10+100*(1-bep.eta/Math.max(0.01,maxEta))-5} fill={C.green} fontSize={7} fontFamily="'Noto Sans KR', sans-serif" fontWeight="bold">{(bep.eta*100).toFixed(1)}%</text>
                  <text x={pad.l+pw/2} y={118} fill={C.dim} fontSize={7} fontFamily="'Noto Sans KR', sans-serif" textAnchor="middle">Q (m³/min)</text>
                  <text x={4} y={60} fill={C.dim} fontSize={6} fontFamily="'Noto Sans KR', sans-serif" textAnchor="middle" transform="rotate(-90,4,60)">η</text>
                  <text x={pad.l-2} y={16} fill={C.dim} fontSize={6} fontFamily="'Noto Sans KR', sans-serif" textAnchor="end">{(maxEta*100).toFixed(0)}%</text>
                  <text x={pad.l-2} y={110} fill={C.dim} fontSize={6} fontFamily="'Noto Sans KR', sans-serif" textAnchor="end">0</text>
                  {/* Experimental η overlay */}
                  {expData.filter(d=>d.eta>0).map((d,i) => <circle key={'ee'+i} cx={sx(d.Q)} cy={10+100*(1-d.eta/Math.max(0.01,maxEta))} r={3.5}
                    fill="none" stroke={C.orange} strokeWidth={1.5} opacity={0.8}/>)}
                  {/* Fitted η curve */}
                  {fitPts.length > 2 && <path d={fitPts.map((p,i) => `${i===0?'M':'L'}${sx(p.Q)} ${10+100*(1-p.eta/Math.max(0.01,maxEta))}`).join(' ')} fill="none" stroke={C.green} strokeWidth={1.5} strokeDasharray="4,2"/>}
                  {/* Operating point on η chart */}
                  {showSysCurve && operatingPoint && <>
                    <circle cx={sx(operatingPoint.Q)} cy={10+100*(1-operatingPoint.eta/Math.max(0.01,maxEta))} r={5} fill="none" stroke="#f97316" strokeWidth={2}/>
                    <line x1={sx(operatingPoint.Q)} y1={10} x2={sx(operatingPoint.Q)} y2={110} stroke="#f97316" strokeWidth={0.5} strokeDasharray="2,3" opacity={0.4}/>
                    <text x={sx(operatingPoint.Q)+5} y={10+100*(1-operatingPoint.eta/Math.max(0.01,maxEta))+10} fill="#f97316" fontSize={6} fontFamily="'Noto Sans KR', sans-serif">{(operatingPoint.eta*100).toFixed(1)}%</text>
                  </>}
                </svg>

                {/* BEP cards */}
                <div className="grid grid-cols-4 gap-1 mt-2">
                  {[
                    {l:'Q_BEP',v:bep.Q.toFixed(1),u:'m³/min',c:C.amber},
                    {l:'Ps',v:bep.Ps.toFixed(0),u:'Pa',c:C.cyan},
                    {l:'Pt',v:bep.Pt.toFixed(0),u:'Pa',c:C.blade},
                    {l:'η',v:(bep.eta*100).toFixed(1),u:'%',c:C.green},
                    {l:'SPL',v:aero.SPL.toFixed(1),u:'dB(A)',c:C.purple},
                    {l:'BPF',v:aero.BPF.toFixed(0),u:'Hz',c:C.pink},
                    {l:'Ns',v:aero.Ns.toFixed(0),u:'',c:C.dim},
                    {l:'W',v:(bep.Qm3s>0?bep.Pt*bep.Qm3s/Math.max(0.01,bep.eta):0).toFixed(1),u:'W',c:C.red},
                  ].map(m => <div key={m.l} className="text-center py-1 rounded" style={{background:C.card}}>
                    <div style={{color:C.dim,fontFamily: "'Noto Sans KR', sans-serif",fontSize:11}}>{m.l}</div>
                    <div style={{color:m.c,fontFamily: "'Noto Sans KR', sans-serif",fontSize:13,fontWeight:700}}>{m.v}</div>
                    <div style={{color:C.dim,fontFamily: "'Noto Sans KR', sans-serif",fontSize:11}}>{m.u}</div>
                  </div>)}
                </div>

                {/* Loss breakdown at BEP */}
                <div className="mt-2 p-1.5 rounded" style={{background:C.bg}}>
                  <div style={{color:C.dim,fontFamily: "'Noto Sans KR', sans-serif",fontSize:12,marginBottom:3}}>손실 분해 @BEP (총 {totalLoss.toFixed(1)} Pa)</div>
                  {/* Stacked bar */}
                  <div className="flex rounded overflow-hidden" style={{height:14,background:C.card}}>
                    {losses.map((l,i) => <div key={i} style={{width:`${l.v/totalLoss*100}%`,background:l.c,minWidth:1}} title={`${l.l}: ${l.v.toFixed(1)}Pa`}/>)}
                  </div>
                  {/* Loss items */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0 mt-1">
                    {losses.map((l,i) => <div key={i} className="flex items-center gap-1" style={{fontFamily: "'Noto Sans KR', sans-serif",fontSize:11}}>
                      <span style={{display:"inline-block",width:6,height:6,borderRadius:1,background:l.c}}/>
                      <span style={{color:C.dim,flex:1}}>{l.l}</span>
                      <span style={{color:C.text}}>{l.v.toFixed(1)}</span>
                      <span style={{color:C.dim}}>Pa</span>
                      <span style={{color:C.dim}}>({(l.v/totalLoss*100).toFixed(0)}%)</span>
                    </div>)}
                  </div>
                  {diffRecov > 0.1 && <div style={{fontFamily: "'Noto Sans KR', sans-serif",fontSize:11,color:C.green,marginTop:2}}>
                    + 디퓨저 회복: +{diffRecov.toFixed(1)} Pa
                  </div>}
                  {bepPt.Q_recirc > 0.0001 && <div style={{fontFamily: "'Noto Sans KR', sans-serif",fontSize:11,color:C.red,marginTop:1}}>
                    ↻ Tongue 재순환: {(bepPt.Q_recirc*60).toFixed(2)} m³/min ({(bepPt.Q_recirc/(bepPt.Qm3s+bepPt.Q_recirc)*100).toFixed(1)}%)
                  </div>}
                  <div style={{fontFamily: "'Noto Sans KR', sans-serif",fontSize:11,color:C.dim,marginTop:2}}>
                    Euler Pt_e={bepPt.Pt_e?.toFixed(0)||'—'}Pa → 손실 {totalLoss.toFixed(0)}Pa → Pt_fan={bep.Pt.toFixed(0)}Pa
                  </div>
                </div>

                {/* Experimental comparison metrics */}
                {expData.length >= 2 && <div className="mt-2 p-1.5 rounded" style={{background:C.bg, border:`1px solid ${C.orange}33`}}>
                  <div style={{color:C.orange,fontFamily: "'Noto Sans KR', sans-serif",fontSize:12,marginBottom:3}}>검증 프레임워크 — 실험 vs 모델</div>
                  {(() => {
                    // Compute errors for default model
                    const errors_Ps = [], errors_eta = [];
                    expData.forEach(d => {
                      let best = pts[0], bestD = Math.abs(pts[0].Q - d.Q);
                      for (const p of pts) { const dd = Math.abs(p.Q - d.Q); if (dd < bestD) { bestD = dd; best = p; } }
                      if (d.Ps > 0) errors_Ps.push({ Q: d.Q, exp: d.Ps, mod: best.Ps, err: best.Ps - d.Ps });
                      if (d.eta > 0) errors_eta.push({ Q: d.Q, exp: d.eta, mod: best.eta, err: best.eta - d.eta });
                    });
                    // Compute errors for fitted model (if exists)
                    let fit_errors_Ps = [];
                    if (fitCoeffs && fitPts.length > 2) {
                      expData.forEach(d => {
                        let best = fitPts[0], bestD = Math.abs(fitPts[0].Q - d.Q);
                        for (const p of fitPts) { const dd = Math.abs(p.Q - d.Q); if (dd < bestD) { bestD = dd; best = p; } }
                        if (d.Ps > 0) fit_errors_Ps.push({ Q: d.Q, exp: d.Ps, mod: best.Ps, err: best.Ps - d.Ps });
                      });
                    }
                    const calc = (errs) => {
                      if (errs.length < 1) return {};
                      const rmse = Math.sqrt(errs.reduce((s,e) => s + e.err**2, 0) / errs.length);
                      const mape = errs.reduce((s,e) => s + Math.abs(e.err/Math.max(1,e.exp)), 0) / errs.length * 100;
                      const maxErr = Math.max(...errs.map(e => Math.abs(e.err)));
                      const avg = errs.reduce((s,e) => s + e.exp, 0) / errs.length;
                      const ss_tot = errs.reduce((s,e) => s + (e.exp - avg)**2, 0);
                      const ss_res = errs.reduce((s,e) => s + e.err**2, 0);
                      const r2 = ss_tot > 0 ? 1 - ss_res / ss_tot : 0;
                      return { rmse, mape, maxErr, r2 };
                    };
                    const m_def = calc(errors_Ps);
                    const m_fit = fit_errors_Ps.length > 0 ? calc(fit_errors_Ps) : null;
                    const m_eta = calc(errors_eta);

                    // Residual chart
                    const resW=300, resH=80, rPad={l:32,r:8,t:6,b:14};
                    const rpw=resW-rPad.l-rPad.r, rph=resH-rPad.t-rPad.b;
                    const qMin=Math.min(...errors_Ps.map(e=>e.Q)), qMax=Math.max(...errors_Ps.map(e=>e.Q));
                    const eMax=Math.max(1, Math.max(...errors_Ps.map(e=>Math.abs(e.err))));
                    const rsx=q=>rPad.l+(q-qMin)/((qMax-qMin)||1)*rpw;
                    const rsy=e=>rPad.t+rph/2-e/eMax*(rph/2);

                    return <>
                      {/* Metrics table */}
                      <div className="grid grid-cols-2 gap-x-3 mb-2" style={{fontFamily: "'Noto Sans KR', sans-serif",fontSize:11}}>
                        <div>
                          <div style={{color:C.dim,marginBottom:1}}>정압 Ps — {m_fit?'기본':'모델'} ({errors_Ps.length}점)</div>
                          <div>RMSE: <span style={{color:m_def.rmse<10?C.green:m_def.rmse<20?C.amber:C.red}}>{m_def.rmse?.toFixed(1)} Pa</span></div>
                          <div>MAPE: <span style={{color:m_def.mape<5?C.green:m_def.mape<10?C.amber:C.red}}>{m_def.mape?.toFixed(1)}%</span></div>
                          <div>R²: <span style={{color:m_def.r2>0.95?C.green:m_def.r2>0.9?C.amber:C.red}}>{m_def.r2?.toFixed(3)}</span></div>
                          <div>MaxErr: <span style={{color:m_def.maxErr<15?C.green:C.amber}}>{m_def.maxErr?.toFixed(1)} Pa</span></div>
                        </div>
                        {m_fit ? <div>
                          <div style={{color:C.green,marginBottom:1}}>Ps — 피팅 모델</div>
                          <div>RMSE: <span style={{color:m_fit.rmse<10?C.green:m_fit.rmse<20?C.amber:C.red}}>{m_fit.rmse?.toFixed(1)} Pa</span></div>
                          <div>MAPE: <span style={{color:m_fit.mape<5?C.green:m_fit.mape<10?C.amber:C.red}}>{m_fit.mape?.toFixed(1)}%</span></div>
                          <div>R²: <span style={{color:m_fit.r2>0.95?C.green:m_fit.r2>0.9?C.amber:C.red}}>{m_fit.r2?.toFixed(3)}</span></div>
                          <div>개선: <span style={{color:C.green}}>{((1-m_fit.rmse/Math.max(0.1,m_def.rmse))*100).toFixed(0)}%</span></div>
                        </div> : (m_eta.rmse > 0 && <div>
                          <div style={{color:C.dim,marginBottom:1}}>효율 η ({errors_eta.length}점)</div>
                          <div>RMSE: <span style={{color:m_eta.rmse<0.03?C.green:C.amber}}>{(m_eta.rmse*100).toFixed(1)}%p</span></div>
                          <div>R²: <span style={{color:m_eta.r2>0.9?C.green:C.amber}}>{m_eta.r2?.toFixed(3)}</span></div>
                        </div>)}
                      </div>

                      {/* Residual plot */}
                      {errors_Ps.length >= 3 && <div>
                        <div style={{color:C.dim,fontFamily: "'Noto Sans KR', sans-serif",fontSize:11,marginBottom:2}}>잔차 플롯 (Ps_mod - Ps_exp)</div>
                        <svg width={resW} height={resH} style={{display:"block",margin:"0 auto",background:C.card,borderRadius:3}}>
                          <line x1={rPad.l} y1={rPad.t+rph/2} x2={rPad.l+rpw} y2={rPad.t+rph/2} stroke={C.dim} strokeWidth={0.5}/>
                          <line x1={rPad.l} y1={rPad.t} x2={rPad.l} y2={rPad.t+rph} stroke={C.dim} strokeWidth={0.3}/>
                          {/* ±RMSE band */}
                          <rect x={rPad.l} y={rsy(m_def.rmse)} width={rpw} height={rsy(-m_def.rmse)-rsy(m_def.rmse)}
                            fill={C.green} opacity={0.06}/>
                          {/* Default model residuals */}
                          {errors_Ps.map((e,i) => <circle key={'rd'+i} cx={rsx(e.Q)} cy={rsy(e.err)} r={3}
                            fill={Math.abs(e.err)<m_def.rmse?C.cyan:C.red} opacity={0.7}/>)}
                          {/* Fitted model residuals */}
                          {fit_errors_Ps.map((e,i) => <circle key={'rf'+i} cx={rsx(e.Q)} cy={rsy(e.err)} r={2}
                            fill={C.green} opacity={0.6} stroke={C.bg} strokeWidth={0.5}/>)}
                          <text x={rPad.l+rpw/2} y={resH-1} fill={C.dim} fontSize={6} fontFamily="'Noto Sans KR', sans-serif" textAnchor="middle">Q (m³/min)</text>
                          <text x={rPad.l-2} y={rPad.t+5} fill={C.dim} fontSize={5} fontFamily="'Noto Sans KR', sans-serif" textAnchor="end">+{eMax.toFixed(0)}</text>
                          <text x={rPad.l-2} y={rPad.t+rph} fill={C.dim} fontSize={5} fontFamily="'Noto Sans KR', sans-serif" textAnchor="end">-{eMax.toFixed(0)}</text>
                          <text x={rPad.l-2} y={rPad.t+rph/2+3} fill={C.dim} fontSize={5} fontFamily="'Noto Sans KR', sans-serif" textAnchor="end">0</text>
                        </svg>
                        <div style={{fontFamily: "'Noto Sans KR', sans-serif",fontSize:11,color:C.dim,textAlign:"center",marginTop:1}}>
                          <span style={{color:C.cyan}}>●</span> 기본 {m_fit && <><span style={{color:C.green}}>●</span> 피팅</>} | 녹색 대역 = ±RMSE
                        </div>
                      </div>}

                      {/* Parity plot */}
                      {errors_Ps.length >= 3 && <div className="mt-2">
                        <div style={{color:C.dim,fontFamily: "'Noto Sans KR', sans-serif",fontSize:11,marginBottom:2}}>패리티 플롯 (Ps_mod vs Ps_exp)</div>
                        {(() => {
                          const pW=140,pH=140,pPad={l:28,r:6,t:6,b:16};
                          const ppw=pW-pPad.l-pPad.r, pph=pH-pPad.t-pPad.b;
                          const pMin=Math.min(...errors_Ps.map(e=>Math.min(e.exp,e.mod)));
                          const pMax=Math.max(...errors_Ps.map(e=>Math.max(e.exp,e.mod)));
                          const ps=v=>pPad.l+(v-pMin)/((pMax-pMin)||1)*ppw;
                          const py=v=>pPad.t+pph-(v-pMin)/((pMax-pMin)||1)*pph;
                          return <svg width={pW} height={pH} style={{display:"block",margin:"0 auto",background:C.card,borderRadius:3}}>
                            <line x1={ps(pMin)} y1={py(pMin)} x2={ps(pMax)} y2={py(pMax)} stroke={C.dim} strokeWidth={0.5} strokeDasharray="4,3"/>
                            {errors_Ps.map((e,i) => <circle key={'pp'+i} cx={ps(e.exp)} cy={py(e.mod)} r={3} fill={C.cyan} opacity={0.7}/>)}
                            {fit_errors_Ps.map((e,i) => <circle key={'pf'+i} cx={ps(e.exp)} cy={py(e.mod)} r={2.5} fill={C.green} opacity={0.6}/>)}
                            <text x={pPad.l+ppw/2} y={pH-2} fill={C.dim} fontSize={6} fontFamily="'Noto Sans KR', sans-serif" textAnchor="middle">Ps_exp (Pa)</text>
                            <text x={4} y={pPad.t+pph/2} fill={C.dim} fontSize={6} fontFamily="'Noto Sans KR', sans-serif" textAnchor="middle" transform={`rotate(-90,4,${pPad.t+pph/2})`}>Ps_mod (Pa)</text>
                          </svg>;
                        })()}
                      </div>}
                    </>;
                  })()}
                  {/* Data table */}
                  <div style={{maxHeight:80,overflowY:'auto',marginTop:4}}>
                    <table style={{fontFamily: "'Noto Sans KR', sans-serif",fontSize:11,borderCollapse:"collapse",width:"100%"}}>
                      <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>
                        <th className="px-1 text-right" style={{color:C.dim}}>Q</th>
                        <th className="px-1 text-right" style={{color:C.dim}}>Ps_exp</th>
                        <th className="px-1 text-right" style={{color:C.dim}}>Ps_mod</th>
                        <th className="px-1 text-right" style={{color:C.dim}}>Err</th>
                        {expData[0]?.eta > 0 && <><th className="px-1 text-right" style={{color:C.dim}}>η_exp</th><th className="px-1 text-right" style={{color:C.dim}}>η_mod</th></>}
                      </tr></thead>
                      <tbody>{expData.map((d,i) => {
                        let best = pts[0], bestD = Math.abs(pts[0].Q - d.Q);
                        for (const p of pts) { const dd = Math.abs(p.Q - d.Q); if (dd < bestD) { bestD = dd; best = p; } }
                        const err = best.Ps - (d.Ps||0);
                        return <tr key={i} style={{borderBottom:`1px solid ${C.border}11`}}>
                          <td className="px-1 text-right" style={{color:C.text}}>{d.Q.toFixed(1)}</td>
                          <td className="px-1 text-right" style={{color:C.orange}}>{(d.Ps||0).toFixed(0)}</td>
                          <td className="px-1 text-right" style={{color:C.cyan}}>{best.Ps.toFixed(0)}</td>
                          <td className="px-1 text-right" style={{color:Math.abs(err)<10?C.green:C.red}}>{err>0?'+':''}{err.toFixed(0)}</td>
                          {d.eta > 0 && <><td className="px-1 text-right" style={{color:C.orange}}>{(d.eta*100).toFixed(1)}</td><td className="px-1 text-right" style={{color:C.green}}>{(best.eta*100).toFixed(1)}</td></>}
                        </tr>;
                      })}</tbody>
                    </table>
                  </div>
                </div>}
                <div className="mt-2 p-1.5 rounded" style={{background:C.bg}}>
                  <div style={{color:C.dim,fontFamily: "'Noto Sans KR', sans-serif",fontSize:12,marginBottom:2}}>속도 삼각형 + 구조</div>
                  <div className="grid grid-cols-4 gap-1" style={{fontFamily: "'Noto Sans KR', sans-serif",fontSize:12}}>
                    <div><span style={{color:C.dim}}>U₂=</span><span style={{color:C.text}}>{aero.U2.toFixed(1)}</span></div>
                    <div><span style={{color:C.dim}}>C₂=</span><span style={{color:C.text}}>{bep.C2.toFixed(1)}</span></div>
                    <div><span style={{color:C.dim}}>W₁=</span><span style={{color:C.text}}>{bep.W1.toFixed(1)}</span></div>
                    <div><span style={{color:C.dim}}>W₂=</span><span style={{color:C.text}}>{bep.W2.toFixed(1)}</span></div>
                    <div><span style={{color:C.dim}}>Ct₂=</span><span style={{color:C.text}}>{bep.Ct2.toFixed(1)}</span></div>
                    <div><span style={{color:C.dim}}>Slip=</span><span style={{color:C.text}}>{(1-Math.PI*Math.sin(beta2*Math.PI/180)/Z).toFixed(3)}</span></div>
                    <div><span style={{color:C.dim}}>SF=</span><span style={{color:baseStruc.SF>2?C.green:C.red,fontWeight:700}}>{baseStruc.SF.toFixed(1)}</span></div>
                    <div><span style={{color:C.dim}}>f_n=</span><span style={{color:baseStruc.res_ok?C.cyan:C.red}}>{baseStruc.f_n.toFixed(0)}</span></div>
                  </div>
                </div>
              </>;
            })()}
          </div></div>
        </div>
      </div>
      </div>{/* /legacy pass-through wrapper */}
      </div>{/* /hpwd-main */}
      <aside className="hpwd-side" style={{width: sidebarWidth + 'px'}}>
      <div className="hpwd-side-scroll">
      <div className="px-3 pb-2">
        <div className="rounded-lg p-2" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          {/* Material + RPM */}
          <div className="mb-2 pb-1" style={{ borderBottom: `1px solid ${C.border}` }}>
            <div className="flex items-center gap-1 mb-1">
              <span style={{ color: C.dim, fontFamily: "'Noto Sans KR', sans-serif", fontSize:12 }}>재질</span>
              <div className="flex gap-0.5 flex-wrap">
                {Object.entries(MATERIALS).map(([k,m]) =>
                  <button key={k} onClick={() => setMatKey(k)} className="px-3 py-1.5 rounded"
                    style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize:11, background:matKey===k?C.card:"transparent",
                      color:matKey===k?m.color:C.dim, border:`1px solid ${matKey===k?m.color:C.border}` }}>{k}</button>)}
              </div>
            </div>
            <S label="RPM" value={RPM} min={400} max={3000} step={10} onChange={setRPM} unit="" color={C.green} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
            <div>
              <div style={{ color: C.dim, fontFamily: "'Noto Sans KR', sans-serif", fontSize:12, marginBottom: 2 }}>DIAMETERS</div>
              <S label="D_eye" value={Deye} min={40} max={200} step={1} onChange={setDeye} unit="mm" color={C.eye} />
              <S label="D₁" value={D1} min={50} max={220} step={1} onChange={setD1} unit="mm" color={C.cyan} />
              <S label="D₂" value={D2} min={80} max={320} step={1} onChange={setD2} unit="mm" color={C.blade} />
              <S label="D_u" value={Du} min={80} max={350} step={1} onChange={setDu} unit="mm" color={C.backplate} />
              <div style={{ color: C.dim, fontFamily: "'Noto Sans KR', sans-serif", fontSize:12, marginTop: 4, marginBottom: 2 }}>WIDTH / SHAPE</div>
              <S label="b₁" value={b1} min={15} max={120} step={1} onChange={setB1} unit="mm" color={C.text} />
              <S label="b₂" value={b2} min={15} max={120} step={1} onChange={setB2} unit="mm" color={C.hub} />
              <S label="Eye R" value={eyeRise} min={0} max={25} step={1} onChange={setEyeRise} unit="mm" color={C.shroud} />
              <S label="Hub D" value={hubDepth} min={0} max={40} step={1} onChange={setHubDepth} unit="mm" color={C.hub} />
              <S label="Hub R" value={hubFillet} min={0} max={15} step={0.5} onChange={setHubFillet} unit="mm" color={C.hub} />
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <span style={{ color: C.dim, fontFamily: "'Noto Sans KR', sans-serif", fontSize:12 }}>BLADE</span>
                <div className="flex gap-0.5 ml-auto">
                  {[{k:'fc',l:'전곡',b2:145},{k:'rad',l:'방사',b2:90},{k:'bc',l:'후곡',b2:55}].map(m =>
                    <button key={m.k} onClick={() => setBeta2(m.b2)} className="px-3 py-1.5 rounded"
                      style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize:11,
                        background: (m.k==='fc'&&beta2>90)||(m.k==='rad'&&beta2===90)||(m.k==='bc'&&beta2<90) ? C.card : "transparent",
                        color: (m.k==='fc'&&beta2>90)||(m.k==='rad'&&beta2===90)||(m.k==='bc'&&beta2<90)
                          ? (m.k==='fc'?C.red:m.k==='rad'?C.amber:C.cyan) : C.dim,
                        border: `1px solid ${(m.k==='fc'&&beta2>90)||(m.k==='rad'&&beta2===90)||(m.k==='bc'&&beta2<90)
                          ? (m.k==='fc'?C.red:m.k==='rad'?C.amber:C.cyan) : C.border}` }}>{m.l}</button>)}
                </div>
              </div>
              <S label="β₁" value={beta1} min={0} max={90} step={1} onChange={setBeta1} unit="°" color={C.green} />
              <S label="β₂" value={beta2} min={20} max={180} step={1} onChange={setBeta2} unit="°" color={beta2>90?C.red:beta2===90?C.amber:C.cyan} />
              <div className="mb-1" style={{ color: C.dim, fontFamily: "'Noto Sans KR', sans-serif", fontSize:11 }}>
                {beta2 > 90 ? `전곡 (Forward-curved) β₂=${beta2}°` : beta2 === 90 ? '방사 (Radial) β₂=90°' : `후곡 (Backward-curved) β₂=${beta2}°`}
              </div>
              <S label="Z" value={Z} min={16} max={48} step={1} onChange={setZ} unit="" color={C.purple} />
              <S label="t" value={tBlade} min={0.3} max={3} step={0.1} onChange={setTBlade} unit="mm" color={C.blade} />
              <S label="Lean" value={bladeLean} min={-15} max={15} step={0.5} onChange={setBladeLean} unit="°" color={C.accent} />
              <div style={{ color: C.dim, fontFamily: "'Noto Sans KR', sans-serif", fontSize:12, marginTop: 4, marginBottom: 2 }}>PROFILE</div>
              <div className="flex gap-1 mb-1">
                {[{k:'sfs',l:'직선-필렛-직선'},{k:'arc',l:'단일 원호'},{k:'linear',l:'선형 β'}].map(m =>
                  <button key={m.k} onClick={() => setBladeType(m.k)} className="flex-1 py-0.5 rounded"
                    style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize:11,
                      background: bladeType===m.k ? C.card : "transparent",
                      color: bladeType===m.k ? C.blade : C.dim,
                      border: `1px solid ${bladeType===m.k ? C.blade : C.border}` }}>{m.l}</button>)}
              </div>
              {bladeType === 'sfs' && (() => {
                const r1mm = D1/2, r2mm = D2/2, rBend = r1mm + bendPos * (r2mm - r1mm);
                return <>
                  <S label="R" value={Rfillet} min={1} max={50} step={1} onChange={setRfillet} unit="mm" color={C.accent} />
                  <S label="Bend" value={bendPos} min={0.15} max={0.85} step={0.01} onChange={setBendPos} unit="" color={C.cyan} />
                  <div style={{ color: C.dim, fontFamily: "'Noto Sans KR', sans-serif", fontSize:11 }}>
                    절곡 r={rBend.toFixed(1)}mm (D={rBend*2|0}mm) span {(bendPos*100)|0}%
                  </div>
                </>;
              })()}
              {bladeType === 'arc' && <div style={{ color: C.dim, fontFamily: "'Noto Sans KR', sans-serif", fontSize:11 }}>β₁,β₂ 접선 유일 원호. 프레스 1회 성형.</div>}
              {bladeType === 'linear' && <div style={{ color: C.dim, fontFamily: "'Noto Sans KR', sans-serif", fontSize:11 }}>β가 r₁→r₂에서 선형 변화.</div>}
            </div>
          </div>

          {/* SCROLL parameters */}
          <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${C.border}` }}>
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: "#d4a44a", fontFamily: "'Noto Sans KR', sans-serif", fontSize:12, fontWeight: 700 }}>SCROLL</span>
              <div className="flex gap-1">
                {[{k:'cv',l:'등속팽창'},{k:'fv',l:'자유와류'}].map(m =>
                  <button key={m.k} onClick={() => setScrollType(m.k)} className="px-3 py-1.5 rounded"
                    style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize:11,
                      background: scrollType===m.k ? C.card : "transparent",
                      color: scrollType===m.k ? "#d4a44a" : C.dim,
                      border: `1px solid ${scrollType===m.k ? "#d4a44a" : C.border}` }}>{m.l}</button>)}
              </div>
              <div className="flex gap-1 ml-auto">
                {[{k:'rect',l:'사각'},{k:'circular',l:'원형'}].map(m =>
                  <button key={m.k} onClick={() => setScrollCross(m.k)} className="px-3 py-1.5 rounded"
                    style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize:11,
                      background: scrollCross===m.k ? C.card : "transparent",
                      color: scrollCross===m.k ? "#d4a44a" : C.dim,
                      border: `1px solid ${scrollCross===m.k ? "#d4a44a" : C.border}` }}>{m.l}</button>)}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
              <div>
                <S label="θ_end" value={scrollEndAngle} min={0} max={720} step={5} onChange={setScrollEndAngle} unit="°" color="#d4a44a" />
                <S label="폭" value={bScroll} min={30} max={120} step={1} onChange={setBScroll} unit="mm" color="#d4a44a" />
              </div>
              <div>
                <S label="δ_f" value={scrollGapF} min={1} max={15} step={0.5} onChange={setScrollGapF} unit="mm" color="#d4a44a" />
                <S label="δ_b" value={scrollGapB} min={1} max={15} step={0.5} onChange={setScrollGapB} unit="mm" color="#d4a44a" />
              </div>
            </div>
            {/* Expansion rate mode */}
            <div className="mt-1 p-1 rounded" style={{ background: C.bg }}>
              <div className="flex items-center gap-2 mb-1">
                <span style={{ color: "#d4a44a", fontFamily: "'Noto Sans KR', sans-serif", fontSize:11 }}>팽창률</span>
                <div className="flex gap-0.5 ml-auto">
                  {[{k:'uniform',l:'균일'},{k:'variable',l:'가변'}].map(m =>
                    <button key={m.k} onClick={() => setScrollExpMode(m.k)} className="px-3 py-1.5 rounded"
                      style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize:11,
                        background:scrollExpMode===m.k?C.card:"transparent", color:scrollExpMode===m.k?"#d4a44a":C.dim,
                        border:`1px solid ${scrollExpMode===m.k?"#d4a44a":C.border}` }}>{m.l}</button>)}
                </div>
              </div>
              {scrollExpMode==='uniform' && <S label="k" value={scrollExpRate} min={0.02} max={0.3} step={0.01} onChange={setScrollExpRate} unit="" color="#d4a44a" />}
              {scrollExpMode==='variable' && <>
                <div style={{ color:C.dim, fontFamily: "'Noto Sans KR', sans-serif", fontSize:11, marginBottom:2 }}>각도별 팽창률 제어점 (spline 보간)</div>
                {scrollExpPts.map((pt, i) => <div key={i} className="flex items-center gap-1 mb-0.5" style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize:12 }}>
                  <span style={{ color:C.dim, width:12 }}>{i+1}</span>
                  <input type="number" value={pt.a} onChange={e => { const nxt=[...scrollExpPts]; nxt[i]={...nxt[i],a:+e.target.value}; setScrollExpPts(nxt); }}
                    className="w-12 px-0.5 rounded text-right" style={{ background:C.card,color:C.text,fontSize:12,border:`1px solid ${C.border}`,fontFamily: "'Noto Sans KR', sans-serif" }} />
                  <span style={{color:C.dim,fontSize:11}}>°</span>
                  <input type="number" value={pt.k} step={0.01} onChange={e => { const nxt=[...scrollExpPts]; nxt[i]={...nxt[i],k:+e.target.value}; setScrollExpPts(nxt); }}
                    className="w-12 px-0.5 rounded text-right" style={{ background:C.card,color:C.amber,fontSize:12,border:`1px solid ${C.border}33`,fontFamily: "'Noto Sans KR', sans-serif" }} />
                  <span style={{color:C.dim,fontSize:11}}>k</span>
                  {scrollExpPts.length > 2 && <button onClick={() => { const nxt=[...scrollExpPts]; nxt.splice(i,1); setScrollExpPts(nxt); }}
                    style={{color:C.red,fontSize:12,fontFamily: "'Noto Sans KR', sans-serif"}}>✕</button>}
                </div>)}
                <button onClick={() => {
                  const last = scrollExpPts[scrollExpPts.length-1];
                  setScrollExpPts([...scrollExpPts, {a: Math.min(720, last.a + 90), k: last.k}]);
                }} className="mt-1 px-2 py-0.5 rounded w-full"
                  style={{fontFamily: "'Noto Sans KR', sans-serif",fontSize:11,color:"#d4a44a",background:C.card,border:`1px solid #d4a44a44`}}>+ 제어점 추가</button>
                {/* Mini preview of k(θ) */}
                {(() => {
                  const W=160,H=50,pad={l:20,r:4,t:4,b:12};
                  const sorted=[...scrollExpPts].sort((a,b)=>a.a-b.a);
                  const aMin=sorted[0]?.a||0,aMax=sorted[sorted.length-1]?.a||360;
                  const kMin=Math.min(...sorted.map(p=>p.k)),kMax=Math.max(...sorted.map(p=>p.k));
                  const pw=W-pad.l-pad.r,ph=H-pad.t-pad.b;
                  const sx=a=>pad.l+(a-aMin)/((aMax-aMin)||1)*pw;
                  const sy=k=>pad.t+ph-(k-kMin)/((kMax-kMin)||0.01)*ph;
                  const nPts=40;
                  const curvePts=Array.from({length:nPts+1},(_,i)=>{
                    const dTh=(aMin + i/nPts*(aMax-aMin))*Math.PI/180;
                    const kVal=interpExpRate(dTh,scrollExpPts,(aMax-aMin)*Math.PI/180);
                    return {x:sx(aMin+i/nPts*(aMax-aMin)),y:sy(kVal)};
                  });
                  return <svg width={W} height={H} style={{display:"block",margin:"4px auto 0",background:C.card,borderRadius:3}}>
                    <path d={curvePts.map((p,i)=>`${i===0?'M':'L'}${p.x} ${p.y}`).join(' ')} fill="none" stroke="#d4a44a" strokeWidth={1.5}/>
                    {sorted.map((p,i)=><circle key={i} cx={sx(p.a)} cy={sy(p.k)} r={3} fill="#d4a44a" stroke={C.bg} strokeWidth={1}/>)}
                    <text x={pad.l} y={H-1} fill={C.dim} fontSize={5} fontFamily="'Noto Sans KR', sans-serif">{aMin}°</text>
                    <text x={pad.l+pw} y={H-1} fill={C.dim} fontSize={5} fontFamily="'Noto Sans KR', sans-serif" textAnchor="end">{aMax}°</text>
                    <text x={pad.l-2} y={pad.t+5} fill={C.dim} fontSize={5} fontFamily="'Noto Sans KR', sans-serif" textAnchor="end">{kMax.toFixed(2)}</text>
                  </svg>;
                })()}
              </>}
            </div>
            {/* Tongue */}
            <div className="mt-1 pt-1" style={{ borderTop: `1px solid ${C.border}33` }}>
              <div style={{ color: C.red, fontFamily: "'Noto Sans KR', sans-serif", fontSize:12, marginBottom: 2 }}>TONGUE</div>
              <div className="grid grid-cols-3 gap-x-2">
                <S label="Gap" value={cutoffGap} min={2} max={30} step={0.5} onChange={setCutoffGap} unit="mm" color={C.red} />
                <S label="θ_cut" value={cutoffAngle} min={0} max={360} step={1} onChange={setCutoffAngle} unit="°" color={C.red} />
                <S label="R" value={Rtongue} min={1} max={20} step={0.5} onChange={setRtongue} unit="mm" color={C.red} />
              </div>
              <div style={{ color: C.dim, fontFamily: "'Noto Sans KR', sans-serif", fontSize:11, marginTop: 2 }}>θ_cut: 0°=→ 90°=↑ 180°=← 270°=↓</div>
              <div style={{ color: "#d4a44a", fontFamily: "'Noto Sans KR', sans-serif", fontSize:12, marginTop: 4, marginBottom: 1 }}>출구 방향 (절대축)</div>
              <S label="θ_exit" value={exitAngle} min={0} max={360} step={1} onChange={setExitAngle} unit="°" color="#d4a44a" />
              <div style={{ color: C.dim, fontFamily: "'Noto Sans KR', sans-serif", fontSize:11 }}>θ_exit: 출구 덕트 방향. α_out, Diff α는 이 축 기준</div>
              <div style={{ color: C.dim, fontFamily: "'Noto Sans KR', sans-serif", fontSize:11, marginTop: 2, marginBottom: 1 }}>외면 (θ_exit 기준 상대각)</div>
              <div className="grid grid-cols-2 gap-x-2">
                <S label="L_out" value={tongueOutLen} min={0} max={200} step={1} onChange={setTongueOutLen} unit="mm" color={C.red} />
                <S label="α_out" value={tongueOutAngle} min={-90} max={90} step={0.5} onChange={setTongueOutAngle} unit="°" color={C.red} />
              </div>
            </div>
            {/* Diffuser */}
            <div className="mt-1 pt-1" style={{ borderTop: `1px solid ${C.border}33` }}>
              <div className="flex items-center gap-2 mb-1">
                <span style={{ color: "#d4a44a", fontFamily: "'Noto Sans KR', sans-serif", fontSize:12 }}>DIFFUSER</span>
                <div className="flex gap-0.5 ml-auto">
                  {[{k:'single',l:'단일'},{k:'stepped',l:'단계'},{k:'round',l:'Round'}].map(m =>
                    <button key={m.k} onClick={() => setDiffType(m.k)} className="px-3 py-1.5 rounded"
                      style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize:11,
                        background:diffType===m.k?C.card:"transparent", color:diffType===m.k?"#d4a44a":C.dim,
                        border:`1px solid ${diffType===m.k?"#d4a44a":C.border}` }}>{m.l}</button>)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-2">
                <S label="Angle" value={diffAngle} min={-90} max={90} step={0.5} onChange={setDiffAngle} unit="°" color="#d4a44a" />
                <S label="Length" value={diffLength} min={0} max={300} step={1} onChange={setDiffLength} unit="mm" color="#d4a44a" />
              </div>
              <label className="flex items-center gap-1 mt-1" style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize:12, color:C.dim }}>
                <input type="checkbox" checked={diffInnerWall} onChange={e => setDiffInnerWall(e.target.checked)} />
                <span style={{ color: diffInnerWall ? "#d4a44a" : C.dim }}>내벽 {diffInnerWall ? "있음" : "없음 (개방)"}</span>
              </label>
            </div>
            <div style={{ color: C.dim, fontFamily: "'Noto Sans KR', sans-serif", fontSize:11, marginTop: 2 }}>
              {scrollType==='cv'?'아르키메데스':'로그나선'} | {scrollCross==='rect'?'사각':'원형'} | θ_cut={cutoffAngle}° → θ_end={scrollEndAngle}° (Wrap {wrapAngle}°) |
              Tongue δ={cutoffGap} R={Rtongue} 외면 L={tongueOutLen} α={tongueOutAngle}° |
              Diff {diffType} {diffAngle}° L={diffLength}mm {diffInnerWall?'':'(내벽 개방)'}
            </div>
          </div>

          {/* CASING */}
          <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${C.border}` }}>
            <div className="flex items-center gap-2 mb-1">
              <label className="flex items-center gap-1" style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize:12, color:"#4488aa" }}>
                <input type="checkbox" checked={showCasing} onChange={e=>setShowCasing(e.target.checked)} />
                CASING
              </label>
              {showCasing && <button onClick={autoFitScroll} className="px-3 py-1.5 rounded ml-auto"
                style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize:11, background:C.card, color:C.green,
                  border:`1px solid ${C.green}66` }}>🔧 Auto-Fit Scroll</button>}
            </div>
            {showCasing && <>
              <div className="grid grid-cols-3 gap-x-2">
                <S label="W" value={casingW} min={100} max={500} step={5} onChange={setCasingW} unit="mm" color="#4488aa" />
                <S label="H" value={casingH} min={100} max={500} step={5} onChange={setCasingH} unit="mm" color="#4488aa" />
                <S label="D" value={casingD} min={30} max={200} step={1} onChange={setCasingD} unit="mm" color="#4488aa" />
              </div>
              <div style={{ color: C.dim, fontFamily: "'Noto Sans KR', sans-serif", fontSize:12, marginTop: 2, marginBottom: 1 }}>임펠러 중심 오프셋</div>
              <div className="grid grid-cols-2 gap-x-2">
                <S label="X" value={casingCX} min={-100} max={100} step={1} onChange={setCasingCX} unit="mm" color="#4488aa" />
                <S label="Y" value={casingCY} min={-100} max={100} step={1} onChange={setCasingCY} unit="mm" color="#4488aa" />
              </div>
              <div style={{ color: C.dim, fontFamily: "'Noto Sans KR', sans-serif", fontSize:11, marginTop: 2 }}>
                케이싱 {casingW}×{casingH}×{casingD}mm | 중심 오프셋 ({casingCX},{casingCY})mm
                {' | '}Auto-Fit: 케이싱 내부에 맞게 Wrap/디퓨저 자동 조정
              </div>
            </>}
          </div>

          <div className="mt-2 pt-2 grid grid-cols-5 gap-1" style={{ borderTop: `1px solid ${C.border}` }}>
            {[{l:"D₁/D₂",v:ratios.D1D2,ok:D1/D2>=0.65&&D1/D2<=0.8},{l:"Deye/D₁",v:ratios.DeyeD1,ok:Deye<=D1},{l:"Du/D₂",v:ratios.DuD2,ok:Du>=D2},{l:"b₂/D₂",v:ratios.b2D2,ok:b2/D2>=0.2&&b2/D2<=0.5},{l:"b₁/b₂",v:ratios.b1b2,ok:b1>=b2}].map(m=>
              <div key={m.l} className="text-center py-1 rounded" style={{background:C.bg}}>
                <div style={{color:C.dim,fontFamily: "'Noto Sans KR', sans-serif",fontSize:11}}>{m.l}</div>
                <div className="font-bold" style={{color:m.ok?C.green:C.hub,fontFamily: "'Noto Sans KR', sans-serif",fontSize:13}}>{m.v}</div>
              </div>)}
          </div>

          {/* Performance + Structural results */}
          <div className="mt-2 pt-2 grid grid-cols-4 gap-1" style={{ borderTop: `1px solid ${C.border}` }}>
            {[
              { l:"Q_BEP", v:baseAero.bep.Q.toFixed(1), u:"m³/min", c:C.amber },
              { l:"Ps", v:baseAero.bep.Ps.toFixed(0), u:"Pa", c:C.cyan },
              { l:"η", v:(baseAero.bep.eta*100).toFixed(1), u:"%", c:C.green },
              { l:"SPL", v:baseAero.SPL.toFixed(1), u:"dB", c:baseAero.SPL>70?C.red:C.purple },
              { l:"σ_max", v:baseStruc.sigma_total.toFixed(1), u:"MPa", c:C.orange },
              { l:"SF", v:baseStruc.SF.toFixed(1), u:"", c:baseStruc.SF_ok?C.green:C.red },
              { l:"f_n", v:baseStruc.f_n.toFixed(0), u:"Hz", c:baseStruc.res_ok?C.cyan:C.red },
              { l:"BPF", v:baseAero.BPF.toFixed(0), u:"Hz", c:C.purple },
            ].map(m => <div key={m.l} className="text-center py-1 rounded" style={{background:C.bg}}>
              <div style={{color:C.dim,fontFamily: "'Noto Sans KR', sans-serif",fontSize:11}}>{m.l}</div>
              <div className="font-bold" style={{color:m.c,fontFamily: "'Noto Sans KR', sans-serif",fontSize:13}}>{m.v}<span style={{fontSize:11,color:C.dim}}>{m.u}</span></div>
            </div>)}
          </div>

          <div className="mt-1 p-1 rounded" style={{ background: C.bg, fontFamily: "'Noto Sans KR', sans-serif", fontSize:11, color: C.muted }}>
            {mat.name} | σ_c={baseStruc.sigma_c.toFixed(1)}+σ_b={baseStruc.sigma_b.toFixed(1)}={baseStruc.sigma_total.toFixed(1)}MPa |
            f_n/BPF={(baseAero.BPF>0?(baseStruc.f_n/baseAero.BPF).toFixed(2):"—")} {baseStruc.res_ok?"✓":"⚠공진"} |
            질량:{baseStruc.bladeMass.toFixed(1)}g |
            {bladeType==='sfs'?` SFS R=${Rfillet}`:bladeType==='arc'?' 원호':' 선형β'}
          </div>
        </div>
      </div>
      </div>{/* /hpwd-side-scroll */}
      </aside>{/* /hpwd-side */}
      <div className="hpwd-resizer" onMouseDown={startResize} onTouchStart={startResize} title="드래그하여 너비 조절"/>
      </div>{/* /hpwd-body */}
      {/* ═══ HPWD Standard KPI Bar (sticky bottom) ═══ */}
      <div style={{
        position: "sticky", bottom: 0,
        display: "flex", borderTop: `1px solid ${C.border}`,
        background: C.card, flexShrink: 0, zIndex: 50
      }}>
        {[
          { l: "Q_BEP", v: (baseAero?.bep?.Q ?? 0).toFixed(1), u: "m³/min" },
          { l: "Ps", v: (baseAero?.bep?.Ps ?? 0).toFixed(0), u: "Pa" },
          { l: "η", v: ((baseAero?.bep?.eta ?? 0)*100).toFixed(1), u: "%" },
          { l: "SPL", v: (baseAero?.SPL ?? 0).toFixed(1), u: "dB" },
          { l: "BPF", v: (baseAero?.BPF ?? 0).toFixed(0), u: "Hz" },
          { l: "SF", v: (baseStruc?.SF ?? 0).toFixed(1), u: "" },
        ].map((k, i, arr) => (
          <div key={k.l} style={{
            flex: 1, textAlign: "center", padding: "8px 6px",
            borderRight: i < arr.length - 1 ? `1px solid ${C.border}` : "none"
          }}>
            <div style={{ fontSize:13, color: C.dim, marginBottom: 2 }}>{k.l}</div>
            <div style={{ fontSize:14, fontWeight: 500, color: C.text, fontFamily: "'Noto Sans KR', sans-serif" }}>
              {k.v}{k.u && <span style={{ fontSize:13, fontWeight: 400, color: C.muted }}> {k.u}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Status bar */}
      <div style={{
        fontSize:13, color: C.dim, padding: "5px 20px",
        borderTop: `1px solid ${C.border}`, background: C.card,
        display: "flex", gap: 16, flexShrink: 0
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, display: "inline-block" }} />수렴
        </span>
        <span>Mode: {fanMode}</span>
        <span>RPM: {RPM}</span>
        <span>{mat.name}</span>
      </div>

      <div className="text-center pb-3 pt-2" style={{color:C.border,fontFamily: "'Noto Sans KR', sans-serif",fontSize:12}}>Fan · HPWD Integration v5.1</div>
    </div>
  );
}
