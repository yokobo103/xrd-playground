/* Persistent 3D stage for Q1..Q5 (+ the planes section in the deep dive).
   ONE three.js scene/canvas lives in a container that is re-parented into
   the slot of whichever question section is currently centred in the
   viewport, so the crystal the learner dived into in Q0 stays on stage and
   morphs from question to question instead of being swapped for a new
   figure each time. The 2D toys in chain.js / origin.js remain as the
   supplements (charts, wave sums, ghosts) and as the fallback: if this
   module fails to load or WebGL is unavailable, nothing here activates and
   the 2D figures stay visible.
   Coordination:
     chain.js  -> Stage3D.q1({d, planes, jitter, twoTheta})
               -> Stage3D.q2({a})
               -> Stage3D.q3({groups, count, higher, mode})
               -> Stage3D.q4({a, center, escale})
               -> Stage3D.q5({a, center})
     origin.js -> Stage3D.origin({a, center, name})
   On activation this module dispatches 'stage3d-ready' so chain.js and
   origin.js can push their current state into the stage. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const XRD = window.XRD;
const TOYS = window.TOYS;

let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
} catch (e) {
  renderer = null; // WebGL unavailable: leave the 2D fallback untouched.
}

if (renderer && XRD && document.querySelector('[data-stage-slot]')) {
  try { init(renderer); }
  catch (e) { /* any failure: 2D fallback stays */ }
}

function init(renderer) {
  const container = document.createElement('div');
  container.id = 'stage3d';
  container.innerHTML = '<div class="stage-chip" id="stage3d-chip">結晶の舞台</div><div class="stage-hint">ドラッグで回転</div>';
  const chip = container.querySelector('#stage3d-chip');
  const slots = {};
  document.querySelectorAll('[data-stage-slot]').forEach(s => { slots[s.dataset.stageSlot] = s; });
  (slots.q1 || document.body).appendChild(container);
  container.appendChild(renderer.domElement);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(40, 4 / 3, 0.1, 100);
  camera.position.set(4.6, 3.1, 5.8);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.minDistance = 3.4;
  controls.maxDistance = 13;
  controls.minPolarAngle = 0.15;
  controls.maxPolarAngle = 1.52;
  controls.enablePan = false;

  const key = new THREE.DirectionalLight(0xfff2df, 2.2);
  key.position.set(5, 9, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fdcec, 0.8);
  rim.position.set(-7, 4, -6);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0x33455e, 0.7));

  /* ---- shared building blocks ---- */
  const world = new THREE.Group();
  scene.add(world);
  const MAXATOMS = 512;
  const atomGeo = new THREE.SphereGeometry(1, 18, 12);
  const atomMat = new THREE.MeshStandardMaterial({ metalness: 0.12, roughness: 0.34 });
  const atoms = new THREE.InstancedMesh(atomGeo, atomMat, MAXATOMS);
  atoms.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  world.add(atoms);
  const centerMat = new THREE.MeshStandardMaterial({ color: 0xffc66b, metalness: 0.1, roughness: 0.35, transparent: true, opacity: 0 });
  const centerAtoms = new THREE.InstancedMesh(atomGeo, centerMat, 64);
  centerAtoms.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  world.add(centerAtoms);
  const sheetGroup = new THREE.Group();
  world.add(sheetGroup);
  const waveGroup = new THREE.Group();
  world.add(waveGroup);

  const MAT = {
    gold:  new THREE.MeshStandardMaterial({ color: 0xffc66b, emissive: 0x8a5a10, emissiveIntensity: 0.55, transparent: true, opacity: 0.34, roughness: 0.4, metalness: 0, side: THREE.DoubleSide, depthWrite: false }),
    cyan:  new THREE.MeshStandardMaterial({ color: 0x62e6e0, emissive: 0x0d4a4a, emissiveIntensity: 0.4, transparent: true, opacity: 0.13, roughness: 0.4, metalness: 0, side: THREE.DoubleSide, depthWrite: false }),
    faint: new THREE.MeshStandardMaterial({ color: 0x62e6e0, transparent: true, opacity: 0.07, roughness: 0.4, metalness: 0, side: THREE.DoubleSide, depthWrite: false })
  };
  const COL = {
    atom: new THREE.Color(0x62e6e0),
    atomB: new THREE.Color(0x9a86f0),
    atomBig: new THREE.Color(0xf2c979)
  };

  const dummy = new THREE.Object3D();
  const tmpColor = new THREE.Color();
  function setAtoms(list, mesh) {
    const n = Math.min(list.length, mesh === atoms ? MAXATOMS : 64);
    for (let i = 0; i < n; i++) {
      const p = list[i];
      dummy.position.set(p[0], p[1], p[2]);
      dummy.scale.setScalar(p[3] || 0.16);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      if (mesh === atoms) mesh.setColorAt(i, p[4] ? tmpColor.set(p[4]) : COL.atom);
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
  function clearGroup(g) {
    while (g.children.length) {
      const c = g.children.pop();
      if (c.geometry) c.geometry.dispose();
      if (c.userData.ownMat && c.material) c.material.dispose();
      g.remove(c);
    }
  }

  /* One plane-family's sheets inside a 2x2x2-cell block (extent E=2, cell
     coordinates 0..2 mapped to world (c-1)*ls). Returns sheet meshes. */
  function familySheets(hkl, ls, mat) {
    const E = 2, sum = hkl[0] + hkl[1] + hkl[2];
    const maxLevel = sum * E;
    let step = 1;
    if (maxLevel + 1 > 9) step = Math.ceil((maxLevel + 1) / 9);
    const out = [];
    for (let L = 0; L <= maxLevel; L += step) {
      const poly = XRD.planePolygon(hkl, L, E);
      if (poly.length < 3) continue;
      const pts = poly.map(p => new THREE.Vector3((p[0] - 1) * ls, (p[1] - 1) * ls, (p[2] - 1) * ls));
      // skip degenerate corner slivers
      let area = 0;
      for (let i = 1; i < pts.length - 1; i++) {
        const u = new THREE.Vector3().subVectors(pts[i], pts[0]);
        const v = new THREE.Vector3().subVectors(pts[i + 1], pts[0]);
        area += new THREE.Vector3().crossVectors(u, v).length() / 2;
      }
      if (area < 0.03 * ls * ls) continue;
      const ring = [];
      pts.forEach(p => ring.push(p.x, p.y, p.z));
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(ring, 3));
      const fan = [];
      for (let i = 1; i < pts.length - 1; i++) fan.push(0, i, i + 1);
      geo.setIndex(fan);
      geo.computeVertexNormals();
      out.push(new THREE.Mesh(geo, mat));
    }
    return out;
  }
  function addSheets(hkl, ls, mat) {
    familySheets(hkl, ls, mat).forEach(m => sheetGroup.add(m));
  }

  /* Cubic block: 3x3x3 corner atoms (+ optional checkerboard colours),
     2x2x2 centre atoms whose opacity follows the occupancy t. */
  function cubicAtoms(a, opts) {
    const ls = 0.62 * (a / 4), r = opts.r || 0.16;
    const corners = [], centres = [];
    for (let i = 0; i <= 2; i++) for (let j = 0; j <= 2; j++) for (let k = 0; k <= 2; k++) {
      const p = [(i - 1) * ls, (j - 1) * ls, (k - 1) * ls, r];
      if (opts.checker) p.push(((i + j + k) % 2 === 0) ? '#62e6e0' : '#9a86f0');
      else if (opts.color) p.push(opts.color);
      corners.push(p);
    }
    for (let i = 0; i <= 1; i++) for (let j = 0; j <= 1; j++) for (let k = 0; k <= 1; k++)
      centres.push([(i - 0.5) * ls, (j - 0.5) * ls, (k - 0.5) * ls, r * 1.15]);
    return { ls, corners, centres };
  }

  /* Q1 wave representation: NO drawn wavefronts. A geometric wave
     surface reads as a board skewering the lattice, so the wave is
     expressed ONLY as light: the phase front sweeps the stack as a
     travelling pulse of atom brightness (below), one thin beam line
     marks the incident direction, and the detector plate built in
     rebuild() lights with the measured intensity. */
  let q1fx = null;
  function updateQ1Fx(t) {
    if (!q1fx) return;
    /* Every atom's colour follows the total (incident - scattered) phase
       at its own height: the bright front travels down the stack, and
       at the aligning angle the layer-to-layer step is exactly 2pi, so
       the whole stack pulses as one; off it, the layers shimmer out of
       phase and cancel. Same phase law as the flow's wave beat. */
    const s = Math.sin(q1fx.twoTheta * Math.PI / 360);
    for (let i = 0; i < q1fx.ys.length; i++) {
      const phi = -(2 * Math.PI / XRD.wavelength) * 2 * s * (q1fx.ys[i] / q1fx.k) - t * 2.4;
      const m = 0.35 + 0.85 * (0.5 + 0.5 * Math.cos(phi));
      atoms.setColorAt(i, tmpColor.copy(COL.atom).multiplyScalar(m));
    }
    if (atoms.instanceColor) atoms.instanceColor.needsUpdate = true;
    /* The detector answers in the same rhythm: it pulses in step with
       the y = 0 layer, at a strength set by the very intensity the 2D
       detector panel prints — full on the aligning angle, dark off it.
       That synchrony is the scattered front arriving in unison. */
    if (q1fx.detMat) q1fx.detMat.emissiveIntensity = 2.4 * q1fx.glow * (0.6 + 0.4 * Math.cos(t * 2.4));
  }

  /* ---- per-question states (primed by chain.js / origin.js) ---- */
  const S = {
    q1: { d: 4, planes: 16, jitter: 0, twoTheta: 22.21 },
    q2: { a: 4 },
    q3: { groups: [], count: 1, higher: false, mode: 'cubic' },
    q4: { a: 4, center: 0, escale: 1 },
    origin: { a: 4, center: 0, name: '100' },
    q5: { a: 4, center: 0 }
  };
  const CHIP = {
    q1: '舞台：面の積み重なり',
    q2: '舞台：結晶格子（1組の面）',
    q3: '舞台：面の組が増えていく',
    q4: '舞台：結晶格子と、中央の原子',
    origin: '舞台：結晶格子と面の組',
    q5: '舞台：結晶格子の姿'
  };
  let mode = 'q1';

  function hklOf(label) { return String(label).split('').map(Number); }

  function rebuild() {
    q1fx = null;
    clearGroup(sheetGroup);
    clearGroup(waveGroup);
    centerMat.opacity = 0;
    setAtoms([], centerAtoms);
    const s = S[mode];
    if (mode === 'q1') {
      /* stack of planes: sheets + a row of atoms per plane, jittered */
      const offs = TOYS ? TOYS.planeOffsets(s.planes, s.d, s.jitter, 1234)
                         : Array.from({ length: s.planes }, (_, j) => j * s.d);
      let k = 0.155; // world units per Angstrom (0.62 at d = 4)
      const span = offs.length > 1 ? offs[offs.length - 1] : 0;
      if (span * k > 3.4) k = 3.4 / span;
      const mid = span / 2;
      const list = [];
      const zRows = s.planes > 16 ? [0] : [-0.62, 0, 0.62];
      offs.forEach(off => {
        const y = (off - mid) * k;
        for (let ix = -3; ix <= 3; ix++) for (const zz of zRows) list.push([ix * 0.62, y, zz, 0.15]);
        const geo = new THREE.PlaneGeometry(4.5, 2.3);
        const sh = new THREE.Mesh(geo, MAT.cyan);
        sh.rotation.x = -Math.PI / 2;
        sh.position.y = y;
        sheetGroup.add(sh);
      });
      setAtoms(list, atoms);
      /* No wavefront surfaces. One thin beam line marks the incident
         direction from the source side; the wave itself is the atoms'
         phase pulse (updateQ1Fx). The detector plate sits along the
         detector angle and lights with TOYS.sumWave's intensity — the
         exact number the 2D detector panel prints as 検出される強さ
         (the sum of the two neighbouring planes' waves), so the stage
         and the panel always agree: full at the aligning angle, ~zero
         at the cancelling angle. */
      const th = s.twoTheta * Math.PI / 360;
      const dirIn = new THREE.Vector3(Math.cos(th), -Math.sin(th), 0);
      const dirOut = new THREE.Vector3(Math.cos(th), Math.sin(th), 0);
      const topY = span * k / 2 + 0.1;
      const P = new THREE.Vector3(0.1, topY, 0);
      const glow = TOYS ? TOYS.sumWave(s.d, s.twoTheta).intensity : 0;
      const beamGeo = new THREE.BufferGeometry().setFromPoints([
        P.clone().addScaledVector(dirIn, -3.4), P.clone()
      ]);
      const beam = new THREE.Line(beamGeo, new THREE.LineBasicMaterial({ color: 0xffdf8a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
      beam.userData.ownMat = true;
      waveGroup.add(beam);
      const detMat = new THREE.MeshStandardMaterial({ color: 0x2a3440, emissive: 0xffc66b, emissiveIntensity: 2.4 * glow, metalness: 0.4, roughness: 0.5 });
      const det = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.1, 0.1), detMat);
      det.userData.ownMat = true;
      det.position.copy(P).addScaledVector(dirOut, 2.4);
      det.lookAt(P);
      waveGroup.add(det);
      q1fx = { P, dirIn, dirOut, ys: list.map(p => p[1]), k, twoTheta: s.twoTheta, detMat, glow };
    } else {
      /* cubic modes q2/q3/q4/origin/q5 */
      const a = mode === 'q3' ? (s.mode === 'nacl' ? 5.64 : 4) : (s.a != null ? s.a : 4);
      const center = (mode === 'q2' || mode === 'q3') ? 0 : (s.center || 0);
      const checker = mode === 'q3' && s.mode === 'nacl';
      const r = mode === 'q4' ? 0.16 * Math.min(1.2, Math.max(0.7, Math.sqrt(s.escale || 1))) : 0.16;
      const { ls, corners, centres } = cubicAtoms(a, { checker, r });
      setAtoms(corners, atoms);
      if (center > 0.001) { centerMat.opacity = center; setAtoms(centres, centerAtoms); }
      if (mode === 'q2') {
        addSheets([1, 0, 0], ls, MAT.gold);
      } else if (mode === 'q3') {
        const groups = s.groups || [];
        const inc = groups.slice(0, s.count);
        const q0 = groups.length ? groups[0].q : 0;
        inc.forEach((g, i) => {
          const ratio = q0 ? g.q / q0 : 1, n = Math.round(Math.sqrt(ratio));
          const isHigher = s.higher && n >= 1 && n * n === ratio;
          const mat = isHigher ? MAT.gold : (i === inc.length - 1 ? MAT.cyan : MAT.faint);
          addSheets(hklOf(g.labels[0]), ls, mat);
        });
      } else if (mode === 'q4') {
        addSheets([1, 0, 0], ls, MAT.gold);
      } else if (mode === 'origin') {
        addSheets(hklOf(s.name), ls, MAT.gold);
      }
      /* q5: bare lattice morph only */
    }
    chip.textContent = CHIP[mode] || '結晶の舞台';
  }

  /* ---- host tracking: the stage follows the centred section ---- */
  let host = 'q1';
  const ratios = {};
  function pickHost() {
    let best = null, bestR = 0.18;
    for (const id of Object.keys(slots)) {
      const r = ratios[id] || 0;
      if (r > bestR) { bestR = r; best = id; }
    }
    if (best && best !== host) {
      host = best;
      slots[best].appendChild(container);
      mode = best;
      resize();
      rebuild();
    }
  }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        const sec = e.target.closest('section');
        if (sec && slots[sec.id]) ratios[sec.id] = e.intersectionRatio;
      }
      pickHost();
    }, { rootMargin: '-40% 0px -40% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] });
    Object.values(slots).forEach(slot => { const sec = slot.closest('section'); if (sec) io.observe(sec); });
  }

  /* ---- public API ---- */
  window.Stage3D = {
    q1(st) { Object.assign(S.q1, st); if (mode === 'q1') rebuild(); },
    q2(st) { Object.assign(S.q2, st); if (mode === 'q2') rebuild(); },
    q3(st) { Object.assign(S.q3, st); if (mode === 'q3') rebuild(); },
    q4(st) { Object.assign(S.q4, st); if (mode === 'q4') rebuild(); },
    q5(st) { Object.assign(S.q5, st); if (mode === 'q5') rebuild(); },
    origin(st) { Object.assign(S.origin, st); if (mode === 'origin') rebuild(); }
  };

  /* ---- resize + render loop (paused while the stage is off-screen) ---- */
  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(container);
  window.addEventListener('resize', resize);

  let rafId = null;
  function loop(ts) {
    rafId = requestAnimationFrame(loop);
    if (mode === 'q1') updateQ1Fx((ts || 0) * 0.001);
    controls.update();
    renderer.render(scene, camera);
  }
  function startLoop() { if (rafId === null) rafId = requestAnimationFrame(loop); }
  function stopLoop() { if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; } }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      for (const e of entries) { if (e.isIntersecting) startLoop(); else stopLoop(); }
    }, { rootMargin: '120px' }).observe(container);
  } else startLoop();

  /* ---- activation: only now swap the 2D stage figures for the 3D stage ---- */
  document.body.classList.add('stage3d-on');
  rebuild();
  resize();
  window.dispatchEvent(new Event('stage3d-ready'));
}
