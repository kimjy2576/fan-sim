import { useState, useEffect, useRef, useMemo } from "react";
import * as THREE from "three";

// ─── Theme ───
const C = {
  bg: "#0a0e17", card: "#111827", border: "#1e2d4a",
  text: "#e2e8f0", dim: "#4a5568", muted: "#718096",
  blade: "#60a5fa", shroud: "#94a3b8", hub: "#f59e0b",
  backplate: "#a78bfa", eye: "#34d399", accent: "#f472b6",
};

// ─── Slider ───
function S({ label, value, min, max, step, onChange, unit, color }) {
  return (
    <div className="flex items-center gap-1 py-0.5">
      <span className="w-10 text-right" style={{ color: color || C.muted, fontFamily: "monospace", fontSize: 10 }}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)}
        className="flex-1 h-1 appearance-none rounded cursor-pointer" style={{ background: C.border, accentColor: color || C.blade }} />
      <span className="w-14 text-right" style={{ color: C.text, fontFamily: "monospace", fontSize: 10 }}>{typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}{unit}</span>
    </div>
  );
}

// ─── Blade curve generator ───
function bladePoints(D1, D2, beta1, beta2, nPts = 20) {
  const r1 = D1 / 2, r2 = D2 / 2;
  const b1R = beta1 * Math.PI / 180, b2R = beta2 * Math.PI / 180;
  let theta = 0;
  const pts = [{ r: r1, theta: 0 }];
  for (let i = 1; i <= nPts; i++) {
    const t = i / nPts, tP = (i - 1) / nPts;
    const r = r1 + t * (r2 - r1), rP = r1 + tP * (r2 - r1);
    const rM = (r + rP) / 2, tM = (t + tP) / 2;
    const bM = b1R + tM * (b2R - b1R);
    if (Math.abs(Math.tan(bM)) > 0.001) theta += (-1 / (rM * Math.tan(bM))) * (r - rP);
    pts.push({ r, theta });
  }
  return pts;
}

// ─── 3D Mesh builders ───
function buildBackplate(Du, hubR, t) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, Du / 2, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, hubR, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false });
  geo.rotateX(Math.PI / 2);
  return geo;
}

function buildShroud(D2, Deye, t, zOffset) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, D2 / 2, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, Deye / 2, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, zOffset, 0);
  return geo;
}

function buildBlade(bladePts, b1, b2, D1, D2, tBlade, angle) {
  const r1 = D1 / 2, r2 = D2 / 2;
  const vertices = [];
  const indices = [];

  for (let i = 0; i < bladePts.length; i++) {
    const p = bladePts[i];
    const r = p.r;
    const th = p.theta + angle;
    const x = r * Math.cos(th);
    const z = r * Math.sin(th);
    const tf = Math.max(0, Math.min(1, (r - r1) / (r2 - r1)));
    const h = b1 + tf * (b2 - b1);

    // Bottom point (y=0)
    vertices.push(x, 0, z);
    // Top point (y=h)
    vertices.push(x, h, z);
  }

  // Create quads between consecutive pairs
  for (let i = 0; i < bladePts.length - 1; i++) {
    const b0 = i * 2, t0 = i * 2 + 1;
    const b1i = (i + 1) * 2, t1 = (i + 1) * 2 + 1;
    indices.push(b0, b1i, t1);
    indices.push(b0, t1, t0);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildHub(hubR, depth) {
  const geo = new THREE.CylinderGeometry(hubR, hubR, depth, 32);
  geo.translate(0, -depth / 2, 0);
  return geo;
}

// ─── Main Component ───
export default function ImpellerViewer() {
  // Design parameters
  const [Deye, setDeye] = useState(110);
  const [D1, setD1] = useState(120);
  const [D2, setD2] = useState(175);
  const [Du, setDu] = useState(180); // Back plate OD (new)
  const [b1, setB1] = useState(60);
  const [b2, setB2] = useState(50);
  const [beta1, setBeta1] = useState(30);
  const [beta2, setBeta2] = useState(145);
  const [Z, setZ] = useState(36);
  const [tBlade, setTBlade] = useState(1.0);
  const [showShroud, setShowShroud] = useState(true);
  const [showBackplate, setShowBackplate] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [explode, setExplode] = useState(0); // explode view offset

  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const groupRef = useRef(null);
  const frameRef = useRef(null);
  const mouseRef = useRef({ isDown: false, x: 0, y: 0, rotX: 0.4, rotY: 0, dist: 300 });

  // Initialize Three.js scene
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const w = mount.clientWidth, h = mount.clientHeight || 400;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(C.bg);

    const camera = new THREE.PerspectiveCamera(45, w / h, 1, 2000);
    camera.position.set(0, 150, 300);
    camera.lookAt(0, 30, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // Lights
    const amb = new THREE.AmbientLight(0x404060, 1.5);
    scene.add(amb);
    const dir1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dir1.position.set(200, 300, 200);
    scene.add(dir1);
    const dir2 = new THREE.DirectionalLight(0x6688ff, 0.6);
    dir2.position.set(-200, 100, -100);
    scene.add(dir2);

    // Grid helper
    const grid = new THREE.GridHelper(400, 20, 0x1a2540, 0x111827);
    grid.position.y = -10;
    scene.add(grid);

    const group = new THREE.Group();
    scene.add(group);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    groupRef.current = group;

    // Mouse/touch controls
    const onPointerDown = (e) => {
      const m = mouseRef.current;
      m.isDown = true;
      m.x = e.clientX || e.touches?.[0]?.clientX || 0;
      m.y = e.clientY || e.touches?.[0]?.clientY || 0;
    };
    const onPointerMove = (e) => {
      const m = mouseRef.current;
      if (!m.isDown) return;
      const cx = e.clientX || e.touches?.[0]?.clientX || 0;
      const cy = e.clientY || e.touches?.[0]?.clientY || 0;
      m.rotY += (cx - m.x) * 0.01;
      m.rotX += (cy - m.y) * 0.01;
      m.rotX = Math.max(-1.2, Math.min(1.5, m.rotX));
      m.x = cx; m.y = cy;
    };
    const onPointerUp = () => { mouseRef.current.isDown = false; };
    const onWheel = (e) => {
      mouseRef.current.dist = Math.max(100, Math.min(800, mouseRef.current.dist + e.deltaY * 0.3));
      e.preventDefault();
    };

    const el = renderer.domElement;
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('wheel', onWheel, { passive: false });

    // Animate
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const m = mouseRef.current;
      if (autoRotate && !m.isDown) m.rotY += 0.005;
      const cam = cameraRef.current;
      cam.position.x = m.dist * Math.sin(m.rotY) * Math.cos(m.rotX);
      cam.position.y = m.dist * Math.sin(m.rotX) + 30;
      cam.position.z = m.dist * Math.cos(m.rotY) * Math.cos(m.rotX);
      cam.lookAt(0, b1 * 0.3, 0);
      renderer.render(scene, cam);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameRef.current);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('wheel', onWheel);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  // Update autoRotate ref
  useEffect(() => {
    // Just triggers re-render, autoRotate is read in animate loop via closure
  }, [autoRotate]);

  // Rebuild geometry when parameters change
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    // Clear old meshes
    while (group.children.length > 0) {
      const child = group.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
      group.remove(child);
    }

    const hubR = Deye * 0.2;
    const shroudT = 2, bpT = 2;
    const ex = explode; // explode offset

    // Back plate (y=0, extends downward)
    if (showBackplate) {
      const bpGeo = buildBackplate(Du, hubR, bpT);
      const bpMat = new THREE.MeshPhongMaterial({
        color: 0x8b5cf6, transparent: true, opacity: 0.7,
        side: THREE.DoubleSide, shininess: 60,
      });
      const bpMesh = new THREE.Mesh(bpGeo, bpMat);
      bpMesh.position.y = -ex;
      group.add(bpMesh);

      // Du ring indicator if Du > D2
      if (Du > D2 + 1) {
        const ringGeo = new THREE.RingGeometry(D2 / 2, Du / 2, 64);
        const ringMat = new THREE.MeshPhongMaterial({
          color: 0xf472b6, transparent: true, opacity: 0.3, side: THREE.DoubleSide,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = -Math.PI / 2;
        ringMesh.position.y = -ex + 0.5;
        group.add(ringMesh);
      }
    }

    // Front shroud
    if (showShroud) {
      const shGeo = buildShroud(D2, Deye, shroudT, b2);
      const shMat = new THREE.MeshPhongMaterial({
        color: 0x94a3b8, transparent: true, opacity: 0.35,
        side: THREE.DoubleSide, shininess: 80,
      });
      const shMesh = new THREE.Mesh(shGeo, shMat);
      shMesh.position.y = ex;
      group.add(shMesh);
    }

    // Hub
    const hubGeo = buildHub(hubR, bpT + 8);
    const hubMat = new THREE.MeshPhongMaterial({ color: 0xf59e0b, shininess: 100 });
    const hubMesh = new THREE.Mesh(hubGeo, hubMat);
    group.add(hubMesh);

    // Blades
    const bPts = bladePoints(D1, D2, beta1, beta2, 16);
    const bladeMat = new THREE.MeshPhongMaterial({
      color: 0x60a5fa, side: THREE.DoubleSide, shininess: 60,
      transparent: true, opacity: 0.85,
    });

    for (let i = 0; i < Z; i++) {
      const angle = (2 * Math.PI * i) / Z;
      const bladeGeo = buildBlade(bPts, b1, b2, D1, D2, tBlade, angle);
      const bladeMesh = new THREE.Mesh(bladeGeo, bladeMat);
      group.add(bladeMesh);
    }

    // Eye circle indicator
    const eyeRingGeo = new THREE.RingGeometry(Deye / 2 - 1, Deye / 2 + 0.5, 64);
    const eyeRingMat = new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    const eyeRing = new THREE.Mesh(eyeRingGeo, eyeRingMat);
    eyeRing.rotation.x = -Math.PI / 2;
    eyeRing.position.y = b2 + 3 + ex;
    group.add(eyeRing);

    // D1 circle indicator
    const d1RingGeo = new THREE.RingGeometry(D1 / 2 - 0.5, D1 / 2 + 0.5, 64);
    const d1RingMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
    const d1Ring = new THREE.Mesh(d1RingGeo, d1RingMat);
    d1Ring.rotation.x = -Math.PI / 2;
    d1Ring.position.y = b1 * 0.5;
    group.add(d1Ring);

  }, [Deye, D1, D2, Du, b1, b2, beta1, beta2, Z, tBlade, showShroud, showBackplate, explode]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      const mount = mountRef.current;
      if (!mount || !rendererRef.current) return;
      const w = mount.clientWidth, h = mount.clientHeight;
      rendererRef.current.setSize(w, h);
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Design ratios
  const ratios = useMemo(() => ({
    D1D2: (D1 / D2).toFixed(3),
    DeyeD1: (Deye / D1).toFixed(3),
    DuD2: (Du / D2).toFixed(3),
    b2D2: (b2 / D2).toFixed(3),
    b1b2: (b1 / b2).toFixed(2),
  }), [D1, D2, Deye, Du, b1, b2]);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text }} className="font-sans">
      {/* Header */}
      <div className="px-3 pt-3 pb-1">
        <h1 className="text-sm font-bold" style={{ fontFamily: "monospace" }}>
          <span style={{ color: C.accent }}>◆</span> Impeller 3D Parametric Study
        </h1>
        <p style={{ color: C.dim, fontFamily: "monospace", fontSize: 9 }}>
          13개 설계변수 | 마우스 드래그: 회전 | 스크롤: 줌
        </p>
      </div>

      {/* 3D Viewport */}
      <div ref={mountRef} style={{ width: "100%", height: 360, background: C.bg }} />

      {/* View controls */}
      <div className="px-3 py-1 flex gap-1 flex-wrap">
        <label className="flex items-center gap-1 text-xs" style={{ fontFamily: "monospace", color: C.dim }}>
          <input type="checkbox" checked={showShroud} onChange={e => setShowShroud(e.target.checked)} />
          <span style={{ color: C.shroud }}>측판</span>
        </label>
        <label className="flex items-center gap-1 text-xs" style={{ fontFamily: "monospace", color: C.dim }}>
          <input type="checkbox" checked={showBackplate} onChange={e => setShowBackplate(e.target.checked)} />
          <span style={{ color: C.backplate }}>주판</span>
        </label>
        <label className="flex items-center gap-1 text-xs" style={{ fontFamily: "monospace", color: C.dim }}>
          <input type="checkbox" checked={autoRotate} onChange={e => setAutoRotate(e.target.checked)} />
          자동회전
        </label>
        <div className="flex items-center gap-1 ml-2">
          <span style={{ fontFamily: "monospace", fontSize: 9, color: C.dim }}>분해</span>
          <input type="range" min={0} max={30} step={1} value={explode}
            onChange={e => setExplode(+e.target.value)}
            className="w-16 h-1" style={{ accentColor: C.accent }} />
        </div>
      </div>

      {/* Parameters */}
      <div className="px-3 pb-2">
        <div className="rounded-lg p-2" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="grid grid-cols-2 gap-x-3">
            {/* Left column: Geometry */}
            <div>
              <div style={{ color: C.dim, fontFamily: "monospace", fontSize: 9, marginBottom: 2 }}>DIAMETERS</div>
              <S label="D_eye" value={Deye} min={40} max={200} step={1} onChange={setDeye} unit="mm" color={C.eye} />
              <S label="D₁" value={D1} min={50} max={220} step={1} onChange={setD1} unit="mm" color="#22d3ee" />
              <S label="D₂" value={D2} min={80} max={320} step={1} onChange={setD2} unit="mm" color={C.blade} />
              <S label="D_u" value={Du} min={80} max={350} step={1} onChange={setDu} unit="mm" color={C.backplate} />
              <div style={{ color: C.dim, fontFamily: "monospace", fontSize: 9, marginTop: 4, marginBottom: 2 }}>WIDTH</div>
              <S label="b₁" value={b1} min={15} max={120} step={1} onChange={setB1} unit="mm" color="#e2e8f0" />
              <S label="b₂" value={b2} min={15} max={120} step={1} onChange={setB2} unit="mm" color="#f59e0b" />
            </div>
            {/* Right column: Blade */}
            <div>
              <div style={{ color: C.dim, fontFamily: "monospace", fontSize: 9, marginBottom: 2 }}>BLADE</div>
              <S label="β₁" value={beta1} min={10} max={60} step={1} onChange={setBeta1} unit="°" color="#4ade80" />
              <S label="β₂" value={beta2} min={95} max={170} step={1} onChange={setBeta2} unit="°" color="#ef4444" />
              <S label="Z" value={Z} min={16} max={48} step={1} onChange={setZ} unit="" color="#a855f7" />
              <S label="t" value={tBlade} min={0.3} max={3} step={0.1} onChange={setTBlade} unit="mm" color={C.blade} />
            </div>
          </div>

          {/* Design Ratios */}
          <div className="mt-2 pt-2 grid grid-cols-5 gap-1" style={{ borderTop: `1px solid ${C.border}` }}>
            {[
              { l: "D₁/D₂", v: ratios.D1D2, ok: D1/D2>=0.65&&D1/D2<=0.8 },
              { l: "D_eye/D₁", v: ratios.DeyeD1, ok: Deye<=D1 },
              { l: "D_u/D₂", v: ratios.DuD2, ok: Du>=D2 },
              { l: "b₂/D₂", v: ratios.b2D2, ok: b2/D2>=0.2&&b2/D2<=0.5 },
              { l: "b₁/b₂", v: ratios.b1b2, ok: b1>=b2 },
            ].map(m => (
              <div key={m.l} className="text-center py-1 rounded" style={{ background: C.bg }}>
                <div style={{ color: C.dim, fontFamily: "monospace", fontSize: 7 }}>{m.l}</div>
                <div className="font-bold" style={{ color: m.ok ? "#4ade80" : "#f59e0b", fontFamily: "monospace", fontSize: 11 }}>{m.v}</div>
              </div>
            ))}
          </div>

          {/* Parameter summary */}
          <div className="mt-2 p-1.5 rounded" style={{ background: C.bg, fontFamily: "monospace", fontSize: 8, color: C.muted }}>
            <span style={{ color: C.eye }}>D_eye={Deye}</span> → <span style={{ color: "#22d3ee" }}>D₁={D1}</span> → <span style={{ color: C.blade }}>D₂={D2}</span> | <span style={{ color: C.backplate }}>D_u={Du}</span>{Du > D2 ? ` (+${Du-D2}mm 돌출)` : Du < D2 ? " ⚠ D_u<D₂" : " = D₂"}
            <br/>b₁={b1}→b₂={b2}mm | β₁={beta1}°→β₂={beta2}° | Z={Z} | t={tBlade}mm
            {Deye < D1 && <><br/><span style={{ color: C.eye }}>Vaneless space: {((D1-Deye)/2).toFixed(1)}mm (r방향)</span></>}
          </div>
        </div>
      </div>

      <div className="text-center pb-3" style={{ color: C.border, fontFamily: "monospace", fontSize: 9 }}>
        Impeller 3D Viewer v1.0 — Parametric Study Tool
      </div>
    </div>
  );
}
