const { useState, useEffect, useRef, useMemo } = React;

// ═══ HPWD STANDARD CSS INJECTION ═══
const HPWD_CSS = `
.app{display:flex;flex-direction:column;height:100vh;background:var(--bg);overflow:hidden;font-family:var(--font)}
.hdr{display:flex;align-items:center;gap:16px;padding:10px 24px;border-bottom:1px solid var(--bd);background:var(--bg2);flex-shrink:0}
.hdr-back{font-size:14px;color:var(--accent);cursor:pointer;text-decoration:none}
.hdr-name{font-weight:500;font-size:16px;color:var(--tx)}
.mode-grp{display:flex;gap:4px;margin-left:auto;background:var(--bg3);border-radius:8px;padding:4px}
.mode-btn{font-size:13px;padding:7px 18px;border:none;background:transparent;color:var(--tx2);cursor:pointer;border-radius:6px;transition:all .15s;font-family:var(--font)}
.mode-btn.on{background:var(--bg);color:var(--tx);font-weight:500;box-shadow:0 0 0 1px var(--bd2)}
.hdr-icons{display:flex;gap:8px;margin-left:16px}
.hdr-icons button{font-size:14px;width:36px;height:36px;border:1px solid var(--bd);background:transparent;border-radius:8px;cursor:pointer;color:var(--tx2);display:flex;align-items:center;justify-content:center}
.bdy{display:flex;flex:1;min-height:0}
.side{width:290px;min-width:290px;border-right:1px solid var(--bd);display:flex;flex-direction:column;overflow-y:auto;background:var(--bg)}
.ss{padding:14px 16px 10px}
.st{font-size:11px;font-weight:600;color:var(--tx2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px}
.ir{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.il{font-size:13px;color:var(--tx2)}
.il .u{font-size:11px;color:var(--tx3);margin-left:2px}
.nf{width:80px;text-align:right;font-size:13px;padding:5px 8px;border:1px solid var(--bd);border-radius:6px;background:var(--bg2);color:var(--tx);font-family:var(--font)}
.nf:focus{outline:none;border-color:var(--accent)}
input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}
input[type=number]{-moz-appearance:textfield}
.dv{height:1px;background:var(--bd);margin:4px 0}
.sr{margin-bottom:8px}
.sr-t{display:flex;align-items:center;justify-content:space-between;margin-bottom:2px}
.sr-l{font-size:12px;color:var(--tx2)}
.sr-l .u{font-size:10px;color:var(--tx3)}
.sr-i{width:64px;text-align:right;font-size:11px;padding:3px 6px;border:1px solid var(--bd);border-radius:4px;background:var(--bg2);color:var(--tx);font-family:var(--font)}
.sr input[type=range]{width:100%;cursor:pointer;height:16px}
.sb{padding:12px 16px;border-top:1px solid var(--bd);margin-top:auto}
.mn{flex:1;display:flex;flex-direction:column;min-width:0}
.tabs{display:flex;align-items:center;border-bottom:1px solid var(--bd);padding:0 20px;gap:4px;background:var(--bg2);flex-shrink:0}
.tab{font-size:13px;padding:11px 16px;border:none;background:transparent;color:var(--tx2);cursor:pointer;border-bottom:2px solid transparent;font-family:var(--font)}
.tab.on{color:var(--tx);font-weight:500;border-bottom-color:var(--accent)}
.tab-r{margin-left:auto;display:flex;gap:6px}
.tab-r button{font-size:12px;padding:6px 12px;border:1px solid var(--bd);background:transparent;border-radius:6px;cursor:pointer;color:var(--tx2);font-family:var(--font)}
.vp{flex:1;padding:16px 20px;overflow-y:auto}
.vg{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.vc{border:1px solid var(--bd);border-radius:10px;padding:14px;background:var(--bg2)}
.vt{font-size:12px;font-weight:500;color:var(--tx2);margin-bottom:10px}
.vt .sub{font-weight:400;color:var(--tx3);font-size:11px}
.cp{min-height:160px;border-radius:6px;background:var(--bg3);display:flex;align-items:center;justify-content:center;color:var(--tx3);font-size:12px}
.full{grid-column:1/-1}
.kpi-bar{display:flex;border-top:1px solid var(--bd);background:var(--bg2);flex-shrink:0}
.kpi{flex:1;text-align:center;padding:8px 6px;border-right:1px solid var(--bd)}
.kpi:last-child{border-right:none}
.kpi-l{font-size:10px;color:var(--tx3);margin-bottom:2px}
.kpi-v{font-size:15px;font-weight:500;font-family:var(--mono);color:var(--tx)}
.kpi-u{font-size:11px;font-weight:400;color:var(--tx2)}
.sbar{font-size:11px;color:var(--tx3);padding:5px 20px;border-top:1px solid var(--bd);background:var(--bg2);display:flex;gap:16px;flex-shrink:0}
.dtbl{width:100%;font-size:12px;border-collapse:collapse}
.dtbl td{padding:4px 0}
.dtbl .lb{color:var(--tx2)}.dtbl .vl{text-align:right;font-family:var(--mono);color:var(--tx)}
.dtbl tr{border-bottom:1px solid var(--bd)}.dtbl tr:last-child{border-bottom:none}
.wn{font-size:11px;padding:6px 8px;border-radius:6px;margin-bottom:8px;display:flex;align-items:center;gap:6px}
.wn.ok{background:var(--ok-bg);color:var(--ok)}
.dot{width:6px;height:6px;border-radius:50%;background:currentColor;flex-shrink:0}
.solve-btn{width:100%;padding:10px 0;font-size:14px;font-weight:500;border:none;background:var(--accent);color:#fff;border-radius:8px;cursor:pointer;font-family:var(--font)}
`;
if(typeof document!=='undefined'&&!document.getElementById('fs-css')){const s=document.createElement('style');s.id='fs-css';s.textContent=HPWD_CSS;document.head.appendChild(s);}

// ═══ COLORS — mapped to CSS variables (light/dark auto) ═══
const C = {
  bg:"var(--bg)", card:"var(--bg2)", border:"var(--bd)", text:"var(--tx)", dim:"var(--tx3)", muted:"var(--tx2)",
  blade:"var(--accent)", shroud:"var(--tx2)", hub:"#d97706",
  backplate:"var(--purple)", eye:"var(--ok)", accent:"#ec4899",
  red:"var(--err)", green:"var(--ok)", cyan:"var(--accent)", purple:"var(--purple)", orange:"#d97706", amber:"#b45309", pink:"#ec4899",
  surface:"var(--bg2)", surface2:"var(--bg3)", textSec:"var(--tx2)", textTer:"var(--tx3)",
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
      <text x={pad.l-3} y={sy(v)+3} fill={C.dim} fontSize={7} textAnchor="end" fontFamily="monospace">{v<10?v.toFixed(2):v.toFixed(0)}</text></g>;})}
    {lines.map(l => <polyline key={l.key} points={data.map(d=>`${sx(d[xKey])},${sy(d[l.key])}`).join(" ")}
      fill="none" stroke={l.color} strokeWidth={l.w||1.5} strokeDasharray={l.dash||"none"}/>)}
    {markers.map((m,i) => <g key={i}><line x1={sx(m.x)} y1={pad.t} x2={sx(m.x)} y2={pad.t+ch} stroke={m.color||C.amber} strokeWidth={1} strokeDasharray="4,3" opacity={0.6}/>
      <circle cx={sx(m.x)} cy={sy(m.y)} r={3} fill={m.color||C.amber}/>
      {m.label && <text x={sx(m.x)+4} y={sy(m.y)-5} fill={m.color||C.amber} fontSize={7} fontFamily="monospace">{m.label}</text>}</g>)}
    <text x={pad.l+cw/2} y={h-3} fill={C.dim} fontSize={8} textAnchor="middle" fontFamily="monospace">{xLabel}</text>
    <text x={3} y={pad.t+ch/2} fill={C.dim} fontSize={8} textAnchor="middle" fontFamily="monospace" transform={`rotate(-90,3,${pad.t+ch/2})`}>{yLabel}</text>
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
    {label && <text x={mx} y={my} fill={color} fontSize={10} fontWeight="700" textAnchor="middle" fontFamily="monospace">{label}</text>}
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
    <text x={w/2} y={big?14:10} fill={C.muted} fontSize={big?10:7} fontFamily="monospace" textAnchor="middle" fontWeight={big?"bold":"normal"}>{label}</text>
    {Array.from({length:gridY+1}).map((_,i) => {
      const y = p.t + (ph/gridY)*i;
      const val = yMax - (yMax-yMin)*(i/gridY);
      return <g key={i}><line x1={p.l} y1={y} x2={p.l+pw} y2={y} stroke={C.border} strokeWidth={0.3}/>
        <text x={p.l-3} y={y+3} fill={C.dim} fontSize={fs-2} fontFamily="monospace" textAnchor="end">{val.toFixed(yMax-yMin>10?0:1)}</text></g>;
    })}
    <line x1={p.l} y1={p.t} x2={p.l} y2={p.t+ph} stroke={C.border} strokeWidth={0.5}/>
    <line x1={p.l} y1={p.t+ph} x2={p.l+pw} y2={p.t+ph} stroke={C.border} strokeWidth={0.5}/>
    <polyline points={pts} fill="none" stroke={color} strokeWidth={lw}/>
    {data.map((d,i)=><circle key={i} cx={sx(d[xKey])} cy={sy(d[yKey])} r={dotR} fill={color} opacity={0.8}/>)}
    <text x={p.l} y={h-3} fill={C.dim} fontSize={fs-1} fontFamily="monospace">{xMin}</text>
    <text x={p.l+pw} y={h-3} fill={C.dim} fontSize={fs-1} fontFamily="monospace" textAnchor="end">{xMax}</text>
  </svg>;
}

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
  return <button onClick={onClick} className="px-3 py-1 text-xs rounded-t" style={{ fontFamily: "monospace", fontSize: 10,
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
    <text x={w/2} y={16} fill={C.dim} fontSize={9} fontFamily="monospace" textAnchor="middle">정면도 (Front — Eye 방향에서 본 모습)</text>
    {/* Casing box */}
    {showCasing && <rect x={w/2 - casingW/2*sc} y={h/2+10 - casingH/2*sc} width={casingW*sc} height={casingH*sc}
      fill="none" stroke="#4488aa" strokeWidth={1.5} opacity={0.5} rx={2} />}
    {showCasing && <>
      <text x={w/2} y={h/2+10 + casingH/2*sc + 12} fill="#4488aa" fontSize={7} fontFamily="monospace" textAnchor="middle">{casingW}×{casingH}mm</text>
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
    <text x={cx} y={cy + 3} fill={C.green} fontSize={8} fontFamily="monospace" textAnchor="middle" opacity={0.5}>AIR IN ⊙</text>
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
          fill="#d4a44a" fontSize={6} fontFamily="monospace" textAnchor="middle" opacity={0.6}>θ_exit={exitAngle}°</text>
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
          {!diffInnerWall && <text x={(innerX+outerX)/2-10} y={(innerY+outerY)/2} fill="#d4a44a" fontSize={5} fontFamily="monospace">개방</text>}
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
          {!diffInnerWall && <text x={(innerX+outerX)/2-10} y={(innerY+outerY)/2} fill="#d4a44a" fontSize={5} fontFamily="monospace">개방</text>}
        </g>;
      }
      // Single
      return <g opacity={0.5}>
        {diffInnerWall && <line x1={innerX} y1={innerY} x2={iEndX} y2={iEndY} stroke="#d4a44a" strokeWidth={1.2} />}
        <line x1={outerX} y1={outerY} x2={oEndX} y2={oEndY} stroke="#d4a44a" strokeWidth={1.2} />
        <line x1={diffInnerWall?iEndX:innerX} y1={diffInnerWall?iEndY:innerY} x2={oEndX} y2={oEndY} stroke="#d4a44a" strokeWidth={1} strokeDasharray="3,2" />
        <text x={(oEndX)+6} y={(oEndY)} fill="#d4a44a" fontSize={5} fontFamily="monospace">출구</text>
        {!diffInnerWall && <text x={(innerX+outerX)/2-10} y={(innerY+outerY)/2} fill="#d4a44a" fontSize={5} fontFamily="monospace">개방</text>}
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
        <text x={(d2X+tipX)/2+6} y={(d2Y+tipY)/2-4} fill={C.red} fontSize={6} fontFamily="monospace" opacity={0.7}>δ={cutoffGap}</text>
        <text x={tipX+R+3} y={tipY-R-2} fill={C.red} fontSize={5} fontFamily="monospace" opacity={0.5}>R={Rtongue}</text>
        <text x={inEndX+4} y={inEndY} fill={C.red} fontSize={5} fontFamily="monospace" opacity={0.4}>내면</text>
        <text x={outEndX+4} y={outEndY} fill={C.red} fontSize={5} fontFamily="monospace" opacity={0.4}>외면</text>
      </>;
    })()}
    <text x={cx} y={cy + D2/2*sc + 18} fill={C.blade} fontSize={8} fontFamily="monospace" textAnchor="middle">D₂={D2}mm</text>
    <text x={cx} y={cy + D2/2*sc + 30} fill={C.eye} fontSize={8} fontFamily="monospace" textAnchor="middle">D_eye={Deye}mm</text>
    {bladeType==='sfs' && <text x={cx} y={cy - rBend*sc - 4} fill={C.accent} fontSize={7} fontFamily="monospace" textAnchor="middle" opacity={0.6}>Bend D={rBend*2|0}mm</text>}
    {Du > D2 && <text x={cx} y={cy - Du/2*sc - 6} fill={C.accent} fontSize={7} fontFamily="monospace" textAnchor="middle">D_u={Du}mm (+{Du-D2})</text>}
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
          {gF > 2 && <text x={cx+s*(r2s+rScr)/2} y={cy-h2-gF/2+3} fill="#d4a44a" fontSize={5} fontFamily="monospace" textAnchor="middle">δ_f={scrollGapF}</text>}
          {gB > 2 && <text x={cx+s*(r2s+rScr)/2} y={cy+h2+gB/2+3} fill="#d4a44a" fontSize={5} fontFamily="monospace" textAnchor="middle">δ_b={scrollGapB}</text>}
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
        <text x={cx+hubR+4} y={cy+h1-hD/2} fill={C.hub} fontSize={6} fontFamily="monospace" opacity={0.6}>Hub {hubDepth}mm</text>
      </>;
    })()}
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

function App() {
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


  // ═══ MAIN TAB STATE ═══
  const [mainTab, setMainTab] = useState(0); // 0:Viz 1:Results 2:Fitting 3:Analysis

  // ═══ INLET STATE ═══
  const [T_in, setTIn] = useState(25);
  const [RH_in, setRHIn] = useState(0.5);
  const airState = useMemo(() => {
    const TK = T_in + 273.15;
    const Ps_sat = Math.exp(23.196 - 3816.44 / (TK - 46.13));
    const omega = 0.62198 * (RH_in * Ps_sat) / Math.max(1, 101325 - RH_in * Ps_sat);
    const Pv = omega * 101325 / (0.62198 + omega);
    const rho = (101325 - Pv) / (287.058 * TK) + Pv / (461.495 * TK);
    const mu = 1.716e-5 * Math.pow(TK / 273.15, 1.5) * (273.15 + 110.4) / (TK + 110.4);
    return { T: T_in, omega, rho, mu, RH: RH_in };
  }, [T_in, RH_in]);

  // ═══ SR component (slider+input row) ═══
  const SR = ({ label, unit, value, onChange, min, max, step, color }) => (
    <div className="sr">
      <div className="sr-t">
        <span className="sr-l">{label}{unit && <span className="u"> [{unit}]</span>}</span>
        <input className="sr-i" type="number" value={value} step={step||1}
          onChange={e => onChange(+e.target.value)} />
      </div>
      <input type="range" min={min} max={max} step={step||1} value={value}
        onChange={e => onChange(+e.target.value)} />
    </div>
  );

  const bep = baseAero?.bep || {};
  const fmt = (v, d) => v != null ? v.toFixed(d) : '—';

  return (
    <div className="app">
      {/* ═══ HEADER ═══ */}
      <div className="hdr">
        <a className="hdr-back">← System</a>
        <div className="hdr-name">Fan</div>
        <div className="mode-grp">
          {[{k:'off_design',n:'Off-design'},{k:'semi_empirical',n:'Semi-empirical'},{k:'on_design',n:'On-design'}].map(m =>
            <button key={m.k} className={`mode-btn ${fanMode===m.k?'on':''}`}
              onClick={() => setFanMode(m.k)}>{m.n}</button>)}
        </div>
        <div className="hdr-icons">
          <button title="Save/Load" onClick={() => setSaveOpen(!saveOpen)}>💾</button>
          <button title="STEP Export" onClick={() => {
            const body = { D1, D2, beta1: beta1, beta2: beta2, Z, b1, b2, tBlade, bladeType };
            fetch('/api/generate-step', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
              .then(r => r.blob()).then(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `fan_D${D2}_Z${Z}.step`; a.click(); })
              .catch(() => alert('STEP 생성 실패'));
          }}>⚙</button>
        </div>
      </div>

      {/* ═══ SAVE/LOAD PANEL ═══ */}
      {saveOpen && <div style={{padding:'8px 16px',background:C.surface,borderBottom:`1px solid ${C.border}`}}>
        <div style={{display:'flex',gap:8,marginBottom:6}}>
          <button onClick={exportJSON} style={{flex:1,padding:'6px 0',fontSize:12,border:`1px solid ${C.border}`,borderRadius:6,background:C.card,color:C.green,cursor:'pointer'}}>📥 JSON 내보내기</button>
          <button onClick={() => fileRef.current?.click()} style={{flex:1,padding:'6px 0',fontSize:12,border:`1px solid ${C.border}`,borderRadius:6,background:C.card,color:C.orange,cursor:'pointer'}}>📤 JSON 불러오기</button>
          <input ref={fileRef} type="file" accept=".json" onChange={importJSON} style={{display:'none'}} />
        </div>
        <div style={{display:'flex',gap:4}}>
          {[0,1,2,3,4].map(i => {
            const key = `fansim_slot_${i}`;
            const saved = typeof localStorage !== 'undefined' && localStorage.getItem(key);
            return <div key={i} style={{flex:1,display:'flex',gap:2}}>
              <button onClick={() => { try{localStorage.setItem(key,JSON.stringify(collectState()))}catch(e){} }}
                style={{flex:1,padding:'4px',fontSize:10,border:`1px solid ${C.border}`,borderRadius:4,background:C.card,color:C.text,cursor:'pointer'}}
                title="저장">S{i+1}</button>
              {saved && <button onClick={() => { try{restore(JSON.parse(localStorage.getItem(key)))}catch(e){} }}
                style={{padding:'4px',fontSize:10,border:`1px solid ${C.green}`,borderRadius:4,background:C.card,color:C.green,cursor:'pointer'}}
                title="불러오기">L</button>}
            </div>;
          })}
        </div>
      </div>}

      {/* ═══ BODY ═══ */}
      <div className="bdy">
        {/* ═══ SIDEBAR ═══ */}
        <aside className="side">
          {/* Inlet */}
          <div className="ss">
            <div className="st">Inlet conditions</div>
            <div className="ir"><span className="il">T <span className="u">[°C]</span></span>
              <input className="nf" type="number" value={T_in} onChange={e=>setTIn(+e.target.value)}/></div>
            <div className="ir"><span className="il">RH <span className="u">[0-1]</span></span>
              <input className="nf" type="number" step="0.05" value={RH_in} onChange={e=>setRHIn(+e.target.value)}/></div>
            <div style={{fontSize:10,color:C.dim}}>ρ={airState.rho.toFixed(3)} kg/m³ ω={airState.omega.toFixed(4)}</div>
          </div>
          <div className="dv"/>

          {/* Operating */}
          <div className="ss">
            <div className="st">Operating</div>
            <SR label="RPM" value={RPM} onChange={setRPM} min={400} max={3000} step={10} />
            <div className="ir"><span className="il">재질</span>
              <select className="nf" style={{width:100}} value={matKey} onChange={e=>setMatKey(e.target.value)}>
                {Object.entries(MATERIALS).map(([k,m])=><option key={k} value={k}>{k}</option>)}
              </select></div>
          </div>
          <div className="dv"/>

          {/* Geometry */}
          <div className="ss">
            <div className="st">Impeller geometry</div>
            <SR label="D₁" unit="mm" value={D1} onChange={setD1} min={60} max={200} step={1} />
            <SR label="D₂" unit="mm" value={D2} onChange={setD2} min={100} max={300} step={1} />
            <SR label="D_eye" unit="mm" value={Deye} onChange={setDeye} min={60} max={200} step={1} />
            <SR label="b₁" unit="mm" value={b1} onChange={setB1} min={15} max={120} step={1} />
            <SR label="b₂" unit="mm" value={b2} onChange={setB2} min={20} max={100} step={1} />
            <SR label="β₁" unit="°" value={beta1} onChange={setBeta1} min={5} max={85} step={1} />
            <SR label="β₂" unit="°" value={beta2} onChange={setBeta2} min={20} max={180} step={1} />
            <SR label="Z" value={Z} onChange={setZ} min={16} max={48} step={1} />
            <SR label="t" unit="mm" value={tBlade} onChange={setTBlade} min={0.3} max={3} step={0.1} />
          </div>
          <div className="dv"/>

          {/* Scroll & Tongue */}
          <div className="ss">
            <div className="st">Scroll & Tongue</div>
            <SR label="θ_end" unit="°" value={scrollEndAngle} onChange={setScrollEndAngle} min={180} max={720} step={5} />
            <SR label="θ_cut" unit="°" value={cutoffAngle} onChange={setCutoffAngle} min={0} max={360} step={5} />
            <div style={{fontSize:10,color:C.dim,marginBottom:6}}>Wrap = {wrapAngle.toFixed(0)}° (자동)</div>
            <SR label="Exp rate" value={scrollExpRate} onChange={setScrollExpRate} min={0.02} max={0.3} step={0.01} />
            <SR label="δ (gap)" unit="mm" value={cutoffGap} onChange={setCutoffGap} min={2} max={30} step={0.5} />
            <SR label="R_tongue" unit="mm" value={Rtongue} onChange={setRtongue} min={1} max={20} step={0.5} />
            <SR label="Diff α" unit="°" value={diffAngle} onChange={setDiffAngle} min={0} max={30} step={1} />
            <SR label="Diff L" unit="mm" value={diffLength} onChange={setDiffLength} min={0} max={200} step={5} />
          </div>
          <div className="dv"/>

          {/* Status + SOLVE */}
          <div className="sb">
            <div className="wn ok"><span className="dot"/>수렴 | η = {(bep.eta*100).toFixed(1)}% | SF = {baseStruc?.SF?.toFixed(1)}</div>
            <button className="solve-btn" onClick={() => setMainTab(1)}>▶ RESULTS</button>
          </div>
        </aside>

        {/* ═══ MAIN ═══ */}
        <div className="mn">
          {/* Tab Bar */}
          <div className="tabs">
            {['Visualization','Results','Fitting','Analysis'].map((t,i) =>
              <button key={t} className={`tab ${mainTab===i?'on':''}`} onClick={()=>setMainTab(i)}>{t}</button>)}
            <div className="tab-r">
              <button onClick={() => {
                const pts = baseAero?.pts || [];
                const csv = 'Q,Ps,Pt,eta,Pshaft\n' + pts.filter(p=>p.Q>0).map(p=>`${p.Q.toFixed(2)},${p.Ps.toFixed(1)},${p.Pt.toFixed(1)},${(p.eta*100).toFixed(1)},${p.Pshaft.toFixed(1)}`).join('\n');
                const b = new Blob([csv],{type:'text/csv'}); const a = document.createElement('a'); a.href=URL.createObjectURL(b); a.download='fan_pq.csv'; a.click();
              }}>📥 CSV</button>
            </div>
          </div>

          {/* ═══ VIEWPORT ═══ */}
          <div className="vp">

            {/* ═══ TAB 0: VISUALIZATION ═══ */}
            {mainTab === 0 && <div>
              {/* Sub-tab selector */}
              <div style={{display:'flex',gap:4,marginBottom:12}}>
                {[{i:0,l:'3D'},{i:1,l:'정면'},{i:2,l:'단면'},{i:3,l:'스크롤'}].map(t =>
                  <button key={t.i} onClick={()=>setViewTab(t.i)}
                    style={{padding:'6px 14px',fontSize:12,border:`1px solid ${viewTab===t.i?'var(--accent)':'var(--bd)'}`,
                      borderRadius:6,background:viewTab===t.i?'var(--accent)':'transparent',
                      color:viewTab===t.i?'#fff':'var(--tx2)',cursor:'pointer',fontFamily:'var(--font)'}}>{t.l}</button>)}
              </div>

              <div className="vg">
                {/* 3D View */}
                {viewTab === 0 && <div className="vc full">
                  <div className="vt">3D Impeller Model <span className="sub">— drag to rotate, scroll to zoom</span></div>
                  <div ref={mountRef} style={{width:'100%',height:400,borderRadius:8,background:'var(--bg3)'}} />
                </div>}

                {/* Front View */}
                {viewTab === 1 && <div className="vc full">
                  <div className="vt">Front view — 2D cross-section</div>
                  {(() => {
                    const W=500,H=500,cx=W/2,cy=H/2;
                    const sc = (W-60)/(D2*1.3);
                    const blades=[];
                    for(let i=0;i<Z;i++){
                      const a0=(2*Math.PI*i)/Z;
                      const pts=[];
                      const n=20;
                      for(let j=0;j<=n;j++){
                        const t=j/n;
                        const r=D1/2+t*(D2/2-D1/2);
                        const bA=(beta1+(beta2-beta1)*t)*Math.PI/180;
                        const da=t>0?(-1/(r*Math.tan(bA)))*(r-(D1/2+(j-1)/n*(D2/2-D1/2))):0;
                        pts.push({r,a:a0+(pts.length>0?pts[pts.length-1].da+da:0),da:pts.length>0?pts[pts.length-1].da+da:0});
                      }
                      const d='M'+pts.map(p=>`${cx+p.r*sc*Math.cos(a0+p.da)} ${cy-p.r*sc*Math.sin(a0+p.da)}`).join('L');
                      blades.push(<path key={i} d={d} fill="none" stroke="var(--accent)" strokeWidth={1.2} opacity={0.7}/>);
                    }
                    return <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',maxWidth:500,display:'block',margin:'0 auto'}}>
                      <circle cx={cx} cy={cy} r={D2/2*sc} fill="none" stroke="var(--accent)" strokeWidth={1.5}/>
                      <circle cx={cx} cy={cy} r={D1/2*sc} fill="none" stroke="var(--tx2)" strokeWidth={0.8} strokeDasharray="4,4"/>
                      <circle cx={cx} cy={cy} r={Deye/2*sc} fill="none" stroke="var(--ok)" strokeWidth={1.5}/>
                      {blades}
                      <text x={cx} y={cy+4} fill="var(--tx3)" fontSize={12} textAnchor="middle">D₂={D2}mm Z={Z}</text>
                    </svg>;
                  })()}
                </div>}

                {/* Section View */}
                {viewTab === 2 && <div className="vc full">
                  <div className="vt">Section view — axial cross-section</div>
                  {(() => {
                    const W=500,H=300,cx=W/2,cy=H*0.6,sc=1.2;
                    const r1=D1/2*sc,r2=D2/2*sc,re=Deye/2*sc;
                    const h1=b1/2*sc,h2=b2/2*sc;
                    return <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',maxWidth:500,display:'block',margin:'0 auto'}}>
                      {/* Hub */}
                      <line x1={cx+r1} y1={cy} x2={cx+r2} y2={cy} stroke="var(--warn)" strokeWidth={2}/>
                      <line x1={cx-r1} y1={cy} x2={cx-r2} y2={cy} stroke="var(--warn)" strokeWidth={2}/>
                      {/* Shroud */}
                      <path d={`M${cx+re} ${cy-h1*1.3} Q${cx+r1} ${cy-h1*1.1} ${cx+r1} ${cy-h1} L${cx+r2} ${cy-h2}`} fill="none" stroke="var(--tx2)" strokeWidth={1.5}/>
                      <path d={`M${cx-re} ${cy-h1*1.3} Q${cx-r1} ${cy-h1*1.1} ${cx-r1} ${cy-h1} L${cx-r2} ${cy-h2}`} fill="none" stroke="var(--tx2)" strokeWidth={1.5}/>
                      {/* Blades */}
                      <rect x={cx+r1} y={cy-h1} width={r2-r1} height={h1} fill="var(--accent)" opacity={0.15} stroke="var(--accent)" strokeWidth={0.5}/>
                      <rect x={cx-r2} y={cy-h2} width={r2-r1} height={h2} fill="var(--accent)" opacity={0.15} stroke="var(--accent)" strokeWidth={0.5}/>
                      {/* Dims */}
                      <line x1={cx+r1} y1={cy+20} x2={cx+r2} y2={cy+20} stroke="var(--tx3)" strokeWidth={0.5} markerEnd="url(#arr)"/>
                      <text x={cx+(r1+r2)/2} y={cy+35} fill="var(--tx3)" fontSize={10} textAnchor="middle">b₁={b1} b₂={b2}mm</text>
                      <text x={cx} y={30} fill="var(--tx3)" fontSize={10} textAnchor="middle">D₁={D1} D₂={D2} D_eye={Deye}mm</text>
                    </svg>;
                  })()}
                </div>}

                {/* Scroll / Bottom View */}
                {viewTab === 3 && <div className="vc full">
                  <div className="vt">Scroll — plan view</div>
                  {(() => {
                    const W=500,H=500,cx=W/2,cy=H/2;
                    const sc=0.8, r2=D2/2000*sc*1000;
                    const gap=cutoffGap*sc;
                    const rStart=r2+gap;
                    const wrapRad=wrapAngle*Math.PI/180;
                    const cutRad=cutoffAngle*Math.PI/180;
                    // Scroll spiral
                    const nPts=100;
                    const scrollPath=[];
                    for(let i=0;i<=nPts;i++){
                      const f=i/nPts;
                      const theta=cutRad+f*wrapRad;
                      const rE=rStart+r2*scrollExpRate*f*wrapRad;
                      scrollPath.push(`${i===0?'M':'L'}${cx+rE*Math.cos(theta)} ${cy-rE*Math.sin(theta)}`);
                    }
                    // Tongue position
                    const tx=cx+rStart*Math.cos(cutRad), ty=cy-rStart*Math.sin(cutRad);
                    return <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',maxWidth:500,display:'block',margin:'0 auto'}}>
                      <circle cx={cx} cy={cy} r={r2} fill="none" stroke="var(--accent)" strokeWidth={1.5}/>
                      <circle cx={cx} cy={cy} r={D1/2*sc} fill="none" stroke="var(--bd)" strokeWidth={0.5} strokeDasharray="3,3"/>
                      <path d={scrollPath.join(' ')} fill="none" stroke="var(--warn)" strokeWidth={2}/>
                      <circle cx={tx} cy={ty} r={Rtongue*sc*0.5} fill="var(--err)" opacity={0.6}/>
                      <text x={tx+10} y={ty-5} fill="var(--err)" fontSize={10}>Tongue</text>
                      <text x={cx} y={cy} fill="var(--tx3)" fontSize={10} textAnchor="middle">Wrap={wrapAngle}°</text>
                      <text x={cx} y={cy+14} fill="var(--tx3)" fontSize={9} textAnchor="middle">δ={cutoffGap}mm R_t={Rtongue}mm</text>
                    </svg>;
                  })()}
                </div>}
              </div>
            </div>}

            {/* ═══ TAB 1: RESULTS ═══ */}
            {mainTab === 1 && <div className="vg">
              {/* PQ Chart */}
              <div className="vc full">
                <div className="vt">PQ curve — Fan {fanMode==='on_design'?'On-design':fanMode==='semi_empirical'?'Semi-empirical':'Off-design'}</div>
                {(() => {
                  const aero = baseAero;
                  if(!aero?.pts?.length) return <div className="cp">데이터 없음</div>;
                  const pts = aero.pts.filter(p=>p.Q>0);
                  const allQ=[...pts.map(p=>p.Q),...expData.map(d=>d.Q)];
                  const allP=[...pts.map(p=>Math.max(p.Pt,p.Ps)),...expData.map(d=>d.Ps||0)];
                  const W=540,H=260,pad={l:50,r:20,t:16,b:32};
                  const pw=W-pad.l-pad.r,ph=H-pad.t-pad.b;
                  const maxQ=Math.max(...allQ),maxP=Math.max(...allP);
                  const sx=q=>pad.l+(q/maxQ)*pw;
                  const syP=p=>pad.t+ph-(p/Math.max(1,maxP))*ph;
                  const mk=(arr,k)=>arr.map((p,i)=>`${i===0?'M':'L'}${sx(p.Q)} ${syP(p[k])}`).join(' ');
                  // Fitted curve
                  let fitPts=[];
                  if(fitCoeffs&&fanMode==='semi_empirical'){
                    try{const g={D1,D2,Deye,b1,b2,beta1,beta2,Z,RPM,tBlade,cutoffGap,Rtongue,wrapAngle,scrollExpRate,diffAngle,diffLength,tongueOutLen,tongueOutAngle};
                    fitPts=computeAeroFit(g,fitCoeffs).pts.filter(p=>p.Q>0);}catch(e){}
                  }
                  // System curve
                  const sysCurvePts=showSysCurve?Array.from({length:40},(v,i)=>{const q=i/39*maxQ;return{Q:q,dP:sysA*q**2+sysB*q+sysC};}):[];
                  return <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',display:'block',margin:'0 auto'}}>
                    {[0.25,0.5,0.75,1].map(f=><line key={f} x1={pad.l} y1={pad.t+ph*(1-f)} x2={pad.l+pw} y2={pad.t+ph*(1-f)} stroke="var(--bd)" strokeWidth={0.4}/>)}
                    <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t+ph} stroke="var(--tx3)" strokeWidth={0.8}/>
                    <line x1={pad.l} y1={pad.t+ph} x2={pad.l+pw} y2={pad.t+ph} stroke="var(--tx3)" strokeWidth={0.8}/>
                    <path d={mk(pts,'Pt')} fill="none" stroke="var(--purple)" strokeWidth={1.5} opacity={0.6}/>
                    <path d={mk(pts,'Ps')} fill="none" stroke="var(--accent)" strokeWidth={2.5}/>
                    {fitPts.length>2&&<path d={mk(fitPts,'Ps')} fill="none" stroke="var(--ok)" strokeWidth={2} strokeDasharray="6,3"/>}
                    {/* Experimental points */}
                    {expData.map((d,i)=><circle key={'e'+i} cx={sx(d.Q)} cy={syP(d.Ps||0)} r={4} fill="none" stroke="var(--warn)" strokeWidth={2}/>)}
                    {/* System curve */}
                    {sysCurvePts.length>0&&<path d={sysCurvePts.map((p,i)=>`${i===0?'M':'L'}${sx(p.Q)} ${syP(p.dP)}`).join(' ')} fill="none" stroke="var(--err)" strokeWidth={1.5} strokeDasharray="6,3"/>}
                    {/* Operating point */}
                    {operatingPoint&&<><circle cx={sx(operatingPoint.Q)} cy={syP(operatingPoint.Ps)} r={7} fill="none" stroke="var(--err)" strokeWidth={2.5}/>
                      <circle cx={sx(operatingPoint.Q)} cy={syP(operatingPoint.Ps)} r={2.5} fill="var(--err)"/>
                      <text x={sx(operatingPoint.Q)+10} y={syP(operatingPoint.Ps)+4} fill="var(--err)" fontSize={11} fontWeight={600}>OP</text></>}
                    {/* BEP */}
                    <circle cx={sx(bep.Q)} cy={syP(bep.Ps)} r={6} fill="var(--ok)" stroke="var(--bg)" strokeWidth={2}/>
                    <text x={sx(bep.Q)+10} y={syP(bep.Ps)-6} fill="var(--ok)" fontSize={11} fontWeight={600}>BEP</text>
                    {/* Labels */}
                    <text x={pad.l+pw/2} y={H-6} fill="var(--tx2)" fontSize={12} textAnchor="middle">Q (m³/min)</text>
                    <text x={14} y={pad.t+ph/2} fill="var(--tx2)" fontSize={12} textAnchor="middle" transform={`rotate(-90,14,${pad.t+ph/2})`}>P (Pa)</text>
                    <text x={pad.l-4} y={pad.t+6} fill="var(--tx3)" fontSize={10} textAnchor="end">{maxP.toFixed(0)}</text>
                    <text x={pad.l+pw} y={pad.t+ph+16} fill="var(--tx3)" fontSize={10} textAnchor="end">{maxQ.toFixed(1)}</text>
                    {/* Legend */}
                    <line x1={pad.l+10} y1={pad.t+8} x2={pad.l+24} y2={pad.t+8} stroke="var(--accent)" strokeWidth={2.5}/>
                    <text x={pad.l+28} y={pad.t+12} fill="var(--accent)" fontSize={10}>Ps</text>
                    <line x1={pad.l+50} y1={pad.t+8} x2={pad.l+64} y2={pad.t+8} stroke="var(--purple)" strokeWidth={1.5} opacity={0.6}/>
                    <text x={pad.l+68} y={pad.t+12} fill="var(--purple)" fontSize={10}>Pt</text>
                    {expData.length>0&&<><circle cx={pad.l+98} cy={pad.t+8} r={3.5} fill="none" stroke="var(--warn)" strokeWidth={1.5}/>
                      <text x={pad.l+106} y={pad.t+12} fill="var(--warn)" fontSize={10}>Exp</text></>}
                    {fitPts.length>0&&<><line x1={pad.l+132} y1={pad.t+8} x2={pad.l+146} y2={pad.t+8} stroke="var(--ok)" strokeWidth={2} strokeDasharray="4,2"/>
                      <text x={pad.l+150} y={pad.t+12} fill="var(--ok)" fontSize={10}>Fit</text></>}
                  </svg>;
                })()}
              </div>

              {/* BEP Details */}
              <div className="vc">
                <div className="vt">BEP performance</div>
                <table className="dtbl"><tbody>
                  {[['Q_BEP',`${fmt(bep.Q,2)} m³/min`],['Pt',`${fmt(bep.Pt,1)} Pa`],['Ps',`${fmt(bep.Ps,1)} Pa`],
                    ['Pdyn',`${fmt(bep.Pdyn,1)} Pa`],['η',`${fmt(bep.eta*100,1)} %`],['P_shaft',`${fmt(bep.Pshaft,1)} W`],
                  ].map(([k,v])=><tr key={k}><td className="lb">{k}</td><td className="vl">{v}</td></tr>)}
                </tbody></table>
              </div>

              {/* Aero + Structure */}
              <div className="vc">
                <div className="vt">Aerodynamic properties</div>
                <table className="dtbl"><tbody>
                  {[['U₂',`${fmt(baseAero?.U2,1)} m/s`],['Slip σ',fmt(baseAero?.sigma,3)],
                    ['SPL',`${fmt(baseAero?.SPL,1)} dB(A)`],['BPF',`${fmt(baseAero?.BPF,0)} Hz`],
                    ['C₂',`${fmt(bep.C2,1)} m/s`],['Ns',fmt(baseAero?.Ns,0)],
                    ['SF',`${fmt(baseStruc?.SF,1)} (${baseStruc?.SF>2?'✓ OK':'⚠ 위험'})`],
                    ['f_n',`${fmt(baseStruc?.f_n,0)} Hz`],
                  ].map(([k,v])=><tr key={k}><td className="lb">{k}</td><td className="vl">{v}</td></tr>)}
                </tbody></table>
              </div>

              {/* Loss Breakdown */}
              <div className="vc full">
                <div className="vt">Loss breakdown at BEP</div>
                {(() => {
                  const b = bep;
                  if(!b.Pt_e) return <div className="cp">데이터 없음</div>;
                  const losses=[
                    {l:'Incidence',v:b.dPinc||0,c:'#ef4444'},{l:'Friction',v:b.dPfric||0,c:'#f97316'},
                    {l:'Recirculation',v:b.dPrec||0,c:'#eab308'},{l:'Disk friction',v:b.dPdisk||0,c:'#84cc16'},
                    {l:'Jet-wake',v:b.dPjw||0,c:'#06b6d4'},{l:'Scroll',v:b.dP_scroll||0,c:'#8b5cf6'},
                    {l:'Tongue',v:b.dP_tongue||0,c:'#ec4899'},{l:'Uncaptured',v:b.dP_uncap||0,c:'#6366f1'},
                  ];
                  const total=losses.reduce((s,l)=>s+l.v,0);
                  return <div style={{display:'flex',flexDirection:'column',gap:4}}>
                    {losses.filter(l=>l.v>0.1).map(l=>
                      <div key={l.l} style={{display:'flex',alignItems:'center',gap:8,fontSize:12}}>
                        <span style={{width:90,color:'var(--tx2)'}}>{l.l}</span>
                        <div style={{flex:1,height:14,background:'var(--bg3)',borderRadius:4,overflow:'hidden'}}>
                          <div style={{width:`${(l.v/total*100).toFixed(0)}%`,height:'100%',background:l.c,borderRadius:4}}/>
                        </div>
                        <span style={{width:60,textAlign:'right',fontFamily:'var(--mono)',color:'var(--tx)'}}>{l.v.toFixed(1)} Pa</span>
                      </div>)}
                    <div style={{fontSize:11,color:'var(--tx3)',marginTop:4}}>총 손실: {total.toFixed(1)} Pa | Euler: {(b.Pt_e||0).toFixed(1)} Pa</div>
                  </div>;
                })()}
              </div>

              {/* System coupling */}
              {showSysCurve && operatingPoint && <div className="vc full">
                <div className="vt">Operating point — system coupling</div>
                <table className="dtbl"><tbody>
                  {[['Q_op',`${fmt(operatingPoint.Q,1)} m³/min`],['Ps_op',`${fmt(operatingPoint.Ps,0)} Pa`],
                    ['η_op',`${fmt(operatingPoint.eta*100,1)} %`],['W_op',`${fmt(operatingPoint.Pshaft,1)} W`],
                  ].map(([k,v])=><tr key={k}><td className="lb">{k}</td><td className="vl">{v}</td></tr>)}
                </tbody></table>
              </div>}
            </div>}

            {/* ═══ TAB 2: FITTING ═══ */}
            {mainTab === 2 && <div className="vg">
              {/* CSV Upload */}
              <div className="vc full">
                <div className="vt">Experimental data upload</div>
                <div style={{display:'flex',gap:8,marginBottom:8}}>
                  <button onClick={() => expFileRef.current?.click()} style={{flex:1,padding:'8px 0',fontSize:13,border:'1px solid var(--bd)',borderRadius:8,background:'var(--bg)',color:'var(--warn)',cursor:'pointer',fontFamily:'var(--font)'}}>📂 CSV 불러오기</button>
                  <input ref={expFileRef} type="file" accept=".csv,.tsv,.txt" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f){const r=new FileReader();r.onload=ev=>parseExpCSV(ev.target.result);r.readAsText(f);}}}/>
                  <button onClick={()=>{const t=prompt('CSV 붙여넣기 (Q,Ps,eta)');if(t)parseExpCSV(t);}}
                    style={{flex:1,padding:'8px 0',fontSize:13,border:'1px solid var(--bd)',borderRadius:8,background:'var(--bg)',color:'var(--accent)',cursor:'pointer',fontFamily:'var(--font)'}}>📋 붙여넣기</button>
                  {expData.length>0&&<button onClick={()=>setExpData([])} style={{padding:'8px 12px',fontSize:13,border:'1px solid var(--err)',borderRadius:8,background:'var(--bg)',color:'var(--err)',cursor:'pointer'}}>✕</button>}
                </div>
                {expData.length>0?<div style={{fontSize:12,color:'var(--ok)'}}>✓ {expData.length}개 데이터 로드 | Q: {Math.min(...expData.map(d=>d.Q)).toFixed(1)}~{Math.max(...expData.map(d=>d.Q)).toFixed(1)} m³/min</div>
                  :<div style={{fontSize:12,color:'var(--tx3)'}}>CSV 형식: Q,Ps[,Pt,eta,RPM,W] (헤더 필수)</div>}
              </div>

              {/* Semi-empirical fitting */}
              <div className="vc full">
                <div className="vt">Semi-empirical auto-fitting</div>
                <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
                  <button onClick={runFitting} disabled={fitRunning||expData.length<3}
                    style={{padding:'10px 24px',fontSize:14,fontWeight:500,border:'none',borderRadius:8,
                      background:expData.length<3?'var(--bd)':'var(--ok)',color:'#fff',cursor:expData.length<3?'not-allowed':'pointer',fontFamily:'var(--font)'}}>
                    {fitRunning?'최적화 중...':'▶ 피팅 실행'}</button>
                  {expData.length<3&&<span style={{fontSize:12,color:'var(--err)'}}>⚠ 실험 데이터 3개 이상 필요</span>}
                  {fitCoeffs&&<button onClick={()=>{setFitCoeffs(null);setFitResult(null);}} style={{padding:'8px 14px',fontSize:12,border:'1px solid var(--err)',borderRadius:6,background:'transparent',color:'var(--err)',cursor:'pointer'}}>초기화</button>}
                </div>
                {fitCoeffs&&<div>
                  <div style={{fontSize:12,color:'var(--tx2)',marginBottom:6}}>피팅된 손실 계수 (9개)</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,fontSize:12}}>
                    {[{k:'k_inc',l:'Incidence',d:1},{k:'k_fric',l:'Friction',d:1},{k:'DR_crit',l:'DR_crit',d:0.5},
                      {k:'k_rec',l:'Recirc',d:0.0085},{k:'k_disk',l:'Disk',d:1},{k:'k_jw',l:'Jet-wake',d:1},
                      {k:'k_sc_mix',l:'Sc.mix',d:0.2},{k:'k_tongue_a',l:'Tng.a',d:0.82},{k:'k_tongue_b',l:'Tng.b',d:0.7},
                    ].map(c=><div key={c.k}><span style={{color:'var(--tx2)'}}>{c.l}: </span>
                      <span style={{color:Math.abs(fitCoeffs[c.k]-c.d)/Math.max(0.001,c.d)>0.05?'var(--warn)':'var(--tx)',fontFamily:'var(--mono)'}}>{fitCoeffs[c.k]?.toFixed(4)}</span></div>)}
                  </div>
                  {fitResult&&<div style={{display:'flex',gap:16,fontSize:12,marginTop:8}}>
                    <span>RMSE 전: <span style={{color:'var(--err)'}}>{fitResult.rmse_before.toFixed(1)}</span></span>
                    <span>→ 후: <span style={{color:'var(--ok)'}}>{fitResult.rmse_after.toFixed(1)}</span></span>
                    <span>개선: <span style={{color:'var(--ok)'}}>{((1-fitResult.rmse_after/Math.max(0.1,fitResult.rmse_before))*100).toFixed(0)}%</span></span>
                  </div>}
                </div>}
              </div>

              {/* Error metrics */}
              {expData.length>=2&&<div className="vc full">
                <div className="vt">Verification — error metrics</div>
                {(() => {
                  const pts=baseAero?.pts?.filter(p=>p.Q>0)||[];
                  const errPs=[], errEta=[];
                  expData.forEach(d=>{
                    let best=pts[0],bd=999;
                    for(const p of pts){const dd=Math.abs(p.Q-d.Q);if(dd<bd){bd=dd;best=p;}}
                    if(d.Ps>0)errPs.push({Q:d.Q,exp:d.Ps,mod:best.Ps,err:best.Ps-d.Ps});
                    if(d.eta>0)errEta.push({Q:d.Q,exp:d.eta,mod:best.eta,err:best.eta-d.eta});
                  });
                  const rmse=errPs.length>0?Math.sqrt(errPs.reduce((s,e)=>s+e.err**2,0)/errPs.length):0;
                  const mape=errPs.length>0?errPs.reduce((s,e)=>s+Math.abs(e.err/Math.max(1,e.exp)),0)/errPs.length*100:0;
                  const maxE=errPs.length>0?Math.max(...errPs.map(e=>Math.abs(e.err))):0;
                  const avg=errPs.length>0?errPs.reduce((s,e)=>s+e.exp,0)/errPs.length:0;
                  const ssTot=errPs.reduce((s,e)=>s+(e.exp-avg)**2,0);
                  const ssRes=errPs.reduce((s,e)=>s+e.err**2,0);
                  const r2=ssTot>0?1-ssRes/ssTot:0;
                  return <div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,fontSize:13,marginBottom:12}}>
                      <div><div style={{color:'var(--tx2)',fontSize:11,marginBottom:4}}>정압 Ps ({errPs.length}점)</div>
                        <div>RMSE: <span style={{color:rmse<10?'var(--ok)':rmse<20?'var(--warn)':'var(--err)',fontFamily:'var(--mono)'}}>{rmse.toFixed(1)} Pa</span></div>
                        <div>MAPE: <span style={{fontFamily:'var(--mono)'}}>{mape.toFixed(1)}%</span></div>
                        <div>R²: <span style={{fontFamily:'var(--mono)'}}>{r2.toFixed(3)}</span></div>
                        <div>MaxErr: <span style={{fontFamily:'var(--mono)'}}>{maxE.toFixed(1)} Pa</span></div>
                      </div>
                      {errEta.length>0&&<div><div style={{color:'var(--tx2)',fontSize:11,marginBottom:4}}>효율 η ({errEta.length}점)</div>
                        <div>RMSE: <span style={{fontFamily:'var(--mono)'}}>{(Math.sqrt(errEta.reduce((s,e)=>s+e.err**2,0)/errEta.length)*100).toFixed(1)}%p</span></div>
                      </div>}
                    </div>
                    {/* Data table */}
                    <div style={{maxHeight:200,overflowY:'auto'}}>
                      <table className="dtbl"><thead><tr style={{borderBottom:'1px solid var(--bd)'}}>
                        <th style={{textAlign:'right',fontSize:11,color:'var(--tx3)'}}>Q</th>
                        <th style={{textAlign:'right',fontSize:11,color:'var(--tx3)'}}>Ps_exp</th>
                        <th style={{textAlign:'right',fontSize:11,color:'var(--tx3)'}}>Ps_mod</th>
                        <th style={{textAlign:'right',fontSize:11,color:'var(--tx3)'}}>Err</th>
                      </tr></thead><tbody>
                        {errPs.map((e,i)=><tr key={i}>
                          <td className="vl">{e.Q.toFixed(1)}</td>
                          <td className="vl" style={{color:'var(--warn)'}}>{e.exp.toFixed(0)}</td>
                          <td className="vl">{e.mod.toFixed(0)}</td>
                          <td className="vl" style={{color:Math.abs(e.err)<10?'var(--ok)':'var(--err)'}}>{e.err>0?'+':''}{e.err.toFixed(0)}</td>
                        </tr>)}
                      </tbody></table>
                    </div>
                  </div>;
                })()}
              </div>}
            </div>}

            {/* ═══ TAB 3: ANALYSIS ═══ */}
            {mainTab === 3 && <div className="vg">
              {/* System resistance coupling */}
              <div className="vc full">
                <div className="vt">System resistance coupling</div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                  <label style={{fontSize:13,color:'var(--tx2)',display:'flex',alignItems:'center',gap:6}}>
                    <input type="checkbox" checked={showSysCurve} onChange={e=>setShowSysCurve(e.target.checked)}/> 시스템 저항 커브</label>
                  {showSysCurve&&<button onClick={()=>sysCurveFileRef.current?.click()} style={{padding:'6px 12px',fontSize:12,border:'1px solid var(--bd)',borderRadius:6,background:'transparent',color:'var(--warn)',cursor:'pointer'}}>📂 저항 CSV</button>}
                  <input ref={sysCurveFileRef} type="file" accept=".csv" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f){const r=new FileReader();r.onload=ev=>parseSysCurveCSV(ev.target.result);r.readAsText(f);}}}/>
                </div>
                {showSysCurve&&<div>
                  <div style={{fontSize:12,color:'var(--tx3)',marginBottom:6}}>ΔP = a·Q² + b·Q + c</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                    <SR label="a" value={sysA} onChange={setSysA} min={0} max={20} step={0.1}/>
                    <SR label="b" value={sysB} onChange={setSysB} min={-10} max={10} step={0.1}/>
                    <SR label="c" unit="Pa" value={sysC} onChange={setSysC} min={0} max={100} step={1}/>
                  </div>
                  {operatingPoint&&<div style={{marginTop:8,padding:8,borderRadius:6,background:'var(--bg3)',fontSize:13}}>
                    ▸ 운전점: Q={operatingPoint.Q.toFixed(1)} m³/min | Ps={operatingPoint.Ps.toFixed(0)} Pa | η={((operatingPoint.eta||0)*100).toFixed(1)}%
                  </div>}
                </div>}
              </div>

              {/* Quasi-steady */}
              {showSysCurve&&<div className="vc full">
                <div className="vt">Quasi-steady time-domain simulation</div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                  <label style={{fontSize:13,color:'var(--tx2)',display:'flex',alignItems:'center',gap:6}}>
                    <input type="checkbox" checked={qsShow} onChange={e=>setQsShow(e.target.checked)}/> 시간영역 활성화</label>
                  {qsShow&&<button onClick={runQuasiSteady} style={{padding:'8px 16px',fontSize:13,fontWeight:500,border:'none',borderRadius:6,background:'var(--purple)',color:'#fff',cursor:'pointer',fontFamily:'var(--font)'}}>▶ 시뮬레이션</button>}
                </div>
                {qsShow&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <SR label="시간" unit="min" value={qsDuration} onChange={setQsDuration} min={10} max={180} step={5}/>
                  <SR label="스텝" value={qsSteps} onChange={setQsSteps} min={10} max={60} step={5}/>
                  <SR label="a₀" value={qsAStart} onChange={setQsAStart} min={0.1} max={10} step={0.1}/>
                  <SR label="a₁" value={qsAEnd} onChange={setQsAEnd} min={0.1} max={10} step={0.1}/>
                  <SR label="c₀" unit="Pa" value={qsCStart} onChange={setQsCStart} min={0} max={50} step={1}/>
                  <SR label="c₁" unit="Pa" value={qsCEnd} onChange={setQsCEnd} min={0} max={50} step={1}/>
                </div>}
                {qsResults&&qsResults.length>2&&(() => {
                  const W=500,H=180,p={l:40,r:34,t:12,b:22};
                  const pw=W-p.l-p.r,ph=H-p.t-p.b;
                  const tMax=qsResults[qsResults.length-1].t;
                  const qArr=qsResults.map(r=>r.Q),psArr=qsResults.map(r=>r.Ps),etaArr=qsResults.map(r=>r.eta);
                  const qMin=Math.min(...qArr),qMax=Math.max(...qArr),psMin=Math.min(...psArr),psMax=Math.max(...psArr);
                  const etaMin=Math.min(...etaArr),etaMax=Math.max(...etaArr);
                  const sx=t=>p.l+(t/tMax)*pw;
                  const syQ=q=>p.t+ph-(q-qMin)/((qMax-qMin)||1)*ph;
                  const syPs=v=>p.t+ph-(v-psMin)/((psMax-psMin)||1)*ph;
                  const syEta=e=>p.t+ph-(e-etaMin)/((etaMax-etaMin)||0.01)*ph;
                  return <div style={{marginTop:12}}>
                    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',display:'block',margin:'0 auto'}}>
                      <path d={qsResults.map((r,i)=>`${i===0?'M':'L'}${sx(r.t)} ${syQ(r.Q)}`).join(' ')} fill="none" stroke="var(--warn)" strokeWidth={2}/>
                      <path d={qsResults.map((r,i)=>`${i===0?'M':'L'}${sx(r.t)} ${syPs(r.Ps)}`).join(' ')} fill="none" stroke="var(--accent)" strokeWidth={2}/>
                      <path d={qsResults.map((r,i)=>`${i===0?'M':'L'}${sx(r.t)} ${syEta(r.eta)}`).join(' ')} fill="none" stroke="var(--ok)" strokeWidth={2}/>
                      <text x={p.l+pw/2} y={H-4} fill="var(--tx3)" fontSize={11} textAnchor="middle">시간 (min)</text>
                      <line x1={p.l+5} y1={p.t+5} x2={p.l+18} y2={p.t+5} stroke="var(--warn)" strokeWidth={2}/>
                      <text x={p.l+22} y={p.t+9} fill="var(--warn)" fontSize={9}>Q</text>
                      <line x1={p.l+40} y1={p.t+5} x2={p.l+53} y2={p.t+5} stroke="var(--accent)" strokeWidth={2}/>
                      <text x={p.l+57} y={p.t+9} fill="var(--accent)" fontSize={9}>Ps</text>
                      <line x1={p.l+75} y1={p.t+5} x2={p.l+88} y2={p.t+5} stroke="var(--ok)" strokeWidth={2}/>
                      <text x={p.l+92} y={p.t+9} fill="var(--ok)" fontSize={9}>η</text>
                    </svg>
                    <div style={{display:'flex',justifyContent:'space-around',fontSize:12,marginTop:4}}>
                      <span style={{color:'var(--warn)'}}>Q: {qMax.toFixed(1)}→{qMin.toFixed(1)}</span>
                      <span style={{color:'var(--accent)'}}>Ps: {psArr[0].toFixed(0)}→{psArr[psArr.length-1].toFixed(0)}</span>
                      <span style={{color:'var(--ok)'}}>η: {(etaArr[0]*100).toFixed(1)}→{(etaArr[etaArr.length-1]*100).toFixed(1)}%</span>
                    </div>
                  </div>;
                })()}
              </div>}

              {/* Sweep */}
              <div className="vc full">
                <div className="vt">Parameter sweep</div>
                <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
                  <select value={sweepVar} onChange={e=>setSweepVar(e.target.value)} style={{padding:'6px 10px',fontSize:13,border:'1px solid var(--bd)',borderRadius:6,background:'var(--bg2)',color:'var(--tx)',fontFamily:'var(--font)'}}>
                    {SWEEP_VARS.map(v=><option key={v.key} value={v.key}>{v.label} ({v.unit})</option>)}
                  </select>
                  <SR label="Min" value={sweepMin} onChange={setSweepMin} min={0} max={9999} step={1}/>
                  <SR label="Max" value={sweepMax} onChange={setSweepMax} min={0} max={9999} step={1}/>
                  <SR label="Steps" value={sweepSteps} onChange={setSweepSteps} min={3} max={30} step={1}/>
                </div>
                {sweepData.length>0&&(() => {
                  const W=500,H=200,pad={l:50,r:50,t:20,b:30};
                  const pw=W-pad.l-pad.r,ph=H-pad.t-pad.b;
                  const xArr=sweepData.map(d=>d.x),psArr=sweepData.map(d=>d.Ps),etaArr=sweepData.map(d=>d.eta*100);
                  const xMin=Math.min(...xArr),xMax=Math.max(...xArr);
                  const psMin=Math.min(...psArr),psMax=Math.max(...psArr);
                  const etaMin=Math.min(...etaArr),etaMax=Math.max(...etaArr);
                  const sx=x=>pad.l+(x-xMin)/((xMax-xMin)||1)*pw;
                  const syPs=p=>pad.t+ph-(p-psMin)/((psMax-psMin)||1)*ph;
                  const syEta=e=>pad.t+ph-(e-etaMin)/((etaMax-etaMin)||1)*ph;
                  return <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',display:'block',margin:'0 auto'}}>
                    <path d={sweepData.map((d,i)=>`${i===0?'M':'L'}${sx(d.x)} ${syPs(d.Ps)}`).join(' ')} fill="none" stroke="var(--accent)" strokeWidth={2}/>
                    <path d={sweepData.map((d,i)=>`${i===0?'M':'L'}${sx(d.x)} ${syEta(d.eta*100)}`).join(' ')} fill="none" stroke="var(--ok)" strokeWidth={2}/>
                    <text x={pad.l+pw/2} y={H-4} fill="var(--tx2)" fontSize={11} textAnchor="middle">{sweepVar}</text>
                    <text x={pad.l-6} y={pad.t+8} fill="var(--accent)" fontSize={9} textAnchor="end">{psMax.toFixed(0)}</text>
                    <text x={pad.l+pw+6} y={pad.t+8} fill="var(--ok)" fontSize={9}>{etaMax.toFixed(0)}%</text>
                    <line x1={pad.l+5} y1={pad.t+6} x2={pad.l+18} y2={pad.t+6} stroke="var(--accent)" strokeWidth={2}/>
                    <text x={pad.l+22} y={pad.t+10} fill="var(--accent)" fontSize={9}>Ps</text>
                    <line x1={pad.l+50} y1={pad.t+6} x2={pad.l+63} y2={pad.t+6} stroke="var(--ok)" strokeWidth={2}/>
                    <text x={pad.l+67} y={pad.t+10} fill="var(--ok)" fontSize={9}>η</text>
                  </svg>;
                })()}
              </div>
            </div>}

          </div>
        </div>
      </div>

      {/* ═══ KPI BAR ═══ */}
      <div className="kpi-bar">
        {[
          {l:'Q_BEP',v:fmt(bep.Q,1),u:'m³/min'},
          {l:'Ps',v:fmt(bep.Ps,0),u:'Pa'},
          {l:'η',v:fmt((bep.eta||0)*100,1),u:'%'},
          {l:'SPL',v:fmt(baseAero?.SPL,1),u:'dB'},
          {l:'P_shaft',v:fmt(bep.Pshaft,1),u:'W'},
          {l:'SF',v:fmt(baseStruc?.SF,1),u:''},
        ].map(k=><div key={k.l} className="kpi">
          <div className="kpi-l">{k.l}</div>
          <div className="kpi-v">{k.v||'—'}{k.u&&<span className="kpi-u"> {k.u}</span>}</div>
        </div>)}
      </div>

      {/* ═══ STATUS BAR ═══ */}
      <div className="sbar">
        <span><span className="dot" style={{background:'var(--ok)',display:'inline-block',marginRight:4}}/>수렴</span>
        <span>Mode: {fanMode}</span>
        <span>RPM: {RPM}</span>
        <span>ρ: {airState.rho.toFixed(3)} kg/m³</span>
        <span>{MATERIALS[matKey]?.name}</span>
      </div>
    </div>
  );
}

export default App;
