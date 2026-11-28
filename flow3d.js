/* FLOW: one big stage, one continuous scroll-driven experience.
   The stage NEVER changes: the same Bruker-style instrument, the same
   salt sample, the same atoms stay the subject from the first frame to
   the last. Only the camera, the in-scene events (arms swing, wavefronts
   arrive, spacing breathes, centre atoms fade in) and the one-line
   captions move — driven by scroll progress through FLOW.state()
   (flowmath.js). There are no choices in here: sample switching and
   parameters live below, in the verify zone (the Q0..Q5 sections).
   Loaded lazily from index.html. If anything fails (CDN, WebGL), this
   module never activates: body.flow-on is never added, #flow stays
   hidden and the section version remains the page (the fallback). */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const $ = id => document.getElementById(id);
const FLOW = window.FLOW, XRD = window.XRD, TOYS = window.TOYS;
const flowEl = $('flow'), stage = $('flow-stage');
const captionEl = $('flow-caption'), scaleEl = $('flow-scale'), hintEl = $('flow-hint');
const fadeEl = $('flow-fade'), chartEl = $('flow-chart');
const tubeNote = $('flow-tube-note'), tubeClose = $('flow-tube-close');
const beatEls = Array.from(document.querySelectorAll('.flow-beat'));
const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
} catch (e) {
  renderer = null; // WebGL unavailable: leave the fallback untouched.
}

if (renderer && FLOW && XRD && TOYS && flowEl && stage && beatEls.length === FLOW.BEATS.length) {
  try { init(renderer); }
  catch (e) { /* any failure: the section version stays the page */ }
}

function init(renderer) {
  /* Beat spacer heights come from flowmath's weights (single source). */
  beatEls.forEach((el, i) => { el.style.height = (FLOW.BEATS[i].w * 100) + 'vh'; });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(40, 4 / 3, 0.1, 200);

  const key = new THREE.DirectionalLight(0xfff2df, 2.4);
  key.position.set(6, 11, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -8; key.shadow.camera.right = 8;
  key.shadow.camera.top = 8; key.shadow.camera.bottom = -8;
  key.shadow.camera.far = 32;
  key.shadow.bias = -0.0004;
  key.shadow.radius = 4;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fdcec, 0.7);
  rim.position.set(-8, 5, -7);
  scene.add(rim);

  /* ================= Device world (the instrument) ================= */
  const device = new THREE.Group();
  scene.add(device);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.ShadowMaterial({ opacity: 0.42 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  device.add(floor);

  function mulberry32(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ t >>> 15, 1 | t); r ^= r + Math.imul(r ^ r >>> 7, 61 | r); return ((r ^ r >>> 14) >>> 0) / 4294967296; }; }
  function powderTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#e9e2cf'; g.fillRect(0, 0, 256, 256);
    const rnd = mulberry32(1123);
    for (let i = 0; i < 9000; i++) {
      const x = rnd() * 256, y = rnd() * 256, r = rnd() * 1.3 + 0.3;
      g.fillStyle = rnd() < 0.5 ? 'rgba(120,105,80,0.20)' : 'rgba(255,252,240,0.25)';
      g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }
  const powderTex = powderTexture();
  const M = {
    enamel:  new THREE.MeshStandardMaterial({ color: 0xc7ccd2, metalness: 0.25, roughness: 0.46 }),
    enamel2: new THREE.MeshStandardMaterial({ color: 0xaeb6be, metalness: 0.3,  roughness: 0.52 }),
    resin:   new THREE.MeshStandardMaterial({ color: 0x22262c, metalness: 0.15, roughness: 0.82 }),
    resin2:  new THREE.MeshStandardMaterial({ color: 0x2e343c, metalness: 0.2,  roughness: 0.7 }),
    steel:   new THREE.MeshStandardMaterial({ color: 0x9aa4ad, metalness: 0.95, roughness: 0.3 }),
    steelD:  new THREE.MeshStandardMaterial({ color: 0x3a4149, metalness: 0.9,  roughness: 0.42 }),
    dark:    new THREE.MeshStandardMaterial({ color: 0x11151a, metalness: 0.4,  roughness: 0.6 }),
    accent:  new THREE.MeshStandardMaterial({ color: 0xff7a1a, metalness: 0.1,  roughness: 0.5 }),
    led:     new THREE.MeshStandardMaterial({ color: 0x0b2b26, emissive: 0x2fe8c8, emissiveIntensity: 2.2, roughness: 0.4 }),
    strip:   new THREE.MeshStandardMaterial({ color: 0x0a2027, emissive: 0x62e6e0, emissiveIntensity: 1.5, roughness: 0.5 }),
    powder:  new THREE.MeshStandardMaterial({ map: powderTex, bumpMap: powderTex, bumpScale: 0.3, metalness: 0, roughness: 1 }),
    beam:    new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }),
    beamHalo:new THREE.MeshBasicMaterial({ color: 0xffdf8a, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false }),
    diffr:   new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false }),
    diffrHalo:new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false })
  };
  function mesh(geo, mat, x = 0, y = 0, z = 0, parent = device) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function beamMesh(geo, mat, x, y, z, parent) {
    const m = mesh(geo, mat, x, y, z, parent);
    m.castShadow = false; m.receiveShadow = false;
    return m;
  }
  const CY = 2.02;      // goniometer centre height = powder surface height
  const R_ARM = 3.0;

  /* Cabinet & bench */
  mesh(new RoundedBoxGeometry(10.2, 1.06, 6.0, 4, 0.06), M.resin, 0.2, 0.53, 0);
  mesh(new RoundedBoxGeometry(10.4, 0.12, 6.2, 2, 0.04), M.resin2, 0.2, 1.12, 0);
  mesh(new THREE.BoxGeometry(9.6, 0.05, 0.06), M.strip, 0.2, 0.78, 3.02);
  mesh(new THREE.BoxGeometry(2.6, 0.5, 0.04), M.dark, -2.6, 0.52, 3.02);
  mesh(new THREE.BoxGeometry(1.4, 0.34, 0.04), M.dark, 2.9, 0.52, 3.02);
  for (const sx of [-4.4, 4.8]) for (const sz of [-2.6, 2.6])
    mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.12, 20), M.dark, sx, 0.06, sz);

  /* Vertical goniometer arc */
  const arcShape = new THREE.Shape();
  arcShape.absarc(0, 0, 3.62, -0.07, Math.PI + 0.07, false);
  arcShape.absarc(0, 0, 3.22, Math.PI + 0.07, -0.07, true);
  const arcBand = mesh(new THREE.ExtrudeGeometry(arcShape, { depth: 0.16, bevelEnabled: false }), M.steelD, 0, CY, -0.93);
  arcBand.castShadow = false;
  for (let d = 0; d <= 180; d += 5) {
    const a = d * Math.PI / 180, big = d % 15 === 0;
    const t = mesh(new THREE.BoxGeometry(big ? 0.24 : 0.14, 0.03, 0.05), M.steel,
      3.78 * Math.cos(a), CY + 3.78 * Math.sin(a), -0.85);
    t.rotation.z = a;
    t.castShadow = false;
  }
  for (const sx of [-3.35, 3.35])
    mesh(new THREE.BoxGeometry(0.18, 0.9, 0.2), M.steelD, sx, 1.6, -0.85);
  const hub = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.5, 28), M.steelD, 0, CY, -0.5);
  hub.rotation.x = Math.PI / 2;
  const hubCap = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 20), M.steel, 0, CY, -0.22);
  hubCap.rotation.x = Math.PI / 2;

  /* Sample stage + spinning circular holder (salt powder, always) */
  mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.62, 28), M.steelD, 0, 1.49, 0);
  mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.07, 36), M.steelD, 0, 1.83, 0);
  const spinner = new THREE.Group();
  device.add(spinner);
  mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.07, 40), M.steel, 0, 1.9, 0, spinner);
  mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.05, 40), M.steelD, 0, CY - 0.115, 0, spinner);
  mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.09, 40, 1, true), M.steel, 0, CY - 0.045, 0, spinner);
  const rimRing = mesh(new THREE.TorusGeometry(0.62, 0.028, 12, 48), M.steel, 0, CY - 0.005, 0, spinner);
  rimRing.rotation.x = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.565, 0.565, 0.03, 40), M.powder, 0, CY - 0.015, 0, spinner);

  /* Arms: theta-theta seesaw, driven by the scan coordinate */
  function buildArm(sign) {
    const arm = new THREE.Group();
    arm.position.set(0, CY, 0);
    device.add(arm);
    mesh(new THREE.BoxGeometry(2.6, 0.15, 0.26), M.steelD, sign * 1.55, 0, -0.32, arm);
    mesh(new THREE.BoxGeometry(0.45, 0.34, 0.55), M.steelD, sign * 2.9, 0, -0.12, arm);
    mesh(new THREE.BoxGeometry(0.7, 0.12, 0.65), M.steelD, sign * 3.15, 0, -0.55, arm);
    mesh(new THREE.BoxGeometry(0.5, 0.34, 0.3), M.steelD, sign * 3.42, 0, -0.85, arm);
    return arm;
  }
  const srcArm = buildArm(-1);
  const detArm = buildArm(1);

  /* X-ray tube housing (tubeHit: meshes for the tap-note raycast) */
  const tubeHit = [];
  tubeHit.push(mesh(new RoundedBoxGeometry(1.6, 1.25, 1.35, 4, 0.09), M.enamel, -R_ARM, 0.12, 0, srcArm));
  tubeHit.push(mesh(new THREE.BoxGeometry(1.62, 0.14, 1.37), M.accent, -R_ARM, -0.38, 0, srcArm));
  tubeHit.push(mesh(new RoundedBoxGeometry(0.9, 0.6, 0.9, 2, 0.05), M.enamel2, -R_ARM - 0.15, 0.95, 0, srcArm));
  const snout = mesh(new THREE.CylinderGeometry(0.17, 0.21, 0.62, 24), M.steelD, -1.95, 0, 0, srcArm);
  snout.rotation.z = Math.PI / 2;
  tubeHit.push(snout);
  const snoutTip = mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.3, 20), M.steel, -1.5, 0, 0, srcArm);
  snoutTip.rotation.z = Math.PI / 2;
  tubeHit.push(snoutTip);
  const tubeLed = mesh(new THREE.SphereGeometry(0.045, 12, 12), M.led, -R_ARM, 0.38, 0.7, srcArm);
  tubeLed.castShadow = false;
  tubeHit.push(mesh(new RoundedBoxGeometry(0.5, 0.8, 0.9, 2, 0.04), M.enamel2, -R_ARM - 1.0, 0.05, 0, srcArm));
  const inCore = beamMesh(new THREE.CylinderGeometry(0.02, 0.02, 1.33, 8), M.beam, -0.685, 0, 0, srcArm);
  inCore.rotation.z = Math.PI / 2;
  const inHalo = beamMesh(new THREE.CylinderGeometry(0.06, 0.06, 1.33, 12), M.beamHalo, -0.685, 0, 0, srcArm);
  inHalo.rotation.z = Math.PI / 2;

  /* Detector housing */
  mesh(new RoundedBoxGeometry(0.85, 1.0, 0.78, 4, 0.07), M.enamel, R_ARM, 0.05, 0, detArm);
  mesh(new THREE.BoxGeometry(0.87, 0.12, 0.8), M.accent, R_ARM, -0.42, 0, detArm);
  mesh(new RoundedBoxGeometry(0.5, 0.55, 0.55, 2, 0.04), M.enamel2, R_ARM, 0.78, 0, detArm);
  mesh(new THREE.BoxGeometry(0.24, 0.4, 0.34), M.steelD, R_ARM - 0.53, 0, 0, detArm);
  mesh(new THREE.BoxGeometry(0.03, 0.3, 0.055), M.dark, R_ARM - 0.66, 0, 0, detArm);
  const detLed = mesh(new THREE.SphereGeometry(0.04, 12, 12), M.led, R_ARM, 0.37, 0.4, detArm);
  detLed.castShadow = false;
  mesh(new RoundedBoxGeometry(0.45, 0.7, 0.7, 2, 0.04), M.enamel2, R_ARM + 0.65, 0, 0, detArm);
  const dfCore = beamMesh(new THREE.CylinderGeometry(0.013, 0.013, 2.27, 8), M.diffr, 1.19, 0, 0, detArm);
  dfCore.rotation.z = Math.PI / 2;
  const dfHalo = beamMesh(new THREE.CylinderGeometry(0.05, 0.05, 2.27, 12), M.diffrHalo, 1.19, 0, 0, detArm);
  dfHalo.rotation.z = Math.PI / 2;

  function setScan(twoTheta) {
    const r = (twoTheta / 2) * Math.PI / 180;
    srcArm.rotation.z = -r;
    detArm.rotation.z = r;
  }
  setScan(15);

  /* Enlarged grains on the powder surface; the dive aims at the hero grain. */
  function grainMesh(r, seed) {
    const g = new THREE.IcosahedronGeometry(r, 1);
    const pos = g.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const n = Math.sin(v.x * 53.7 + seed) * Math.sin(v.y * 47.3 + seed * 1.7) * Math.sin(v.z * 59.1 + seed * 0.6);
      v.multiplyScalar(1 + n * 0.16);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, M.powder);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  const heroGrain = grainMesh(0.085, 777);
  heroGrain.position.set(0.12, CY + 0.05, 0.08);
  spinner.add(heroGrain);
  const grain2 = grainMesh(0.05, 31); grain2.position.set(-0.2, CY + 0.03, -0.14); spinner.add(grain2);
  const grain3 = grainMesh(0.038, 97); grain3.position.set(0.3, CY + 0.022, -0.2); spinner.add(grain3);

  /* ================= Micro world (inside the same sample) =================
     The SAME salt, continued: the dive crosses from the device into this
     world without the subject ever changing. Built at y = -80 in the
     same scene; visibility swaps once, at the grain surface, under a
     fade. Everything below — atoms, plane sheets, centre atoms, family
     sheets, wavefronts — lives here for the rest of the flow. */
  const micro = new THREE.Group();
  micro.position.set(0, -80, 0);
  micro.visible = false;
  scene.add(micro);
  const microLight = new THREE.PointLight(0xcfe4ff, 90, 0, 1.6);
  microLight.position.set(5, 6, 4);
  micro.add(microLight);

  const latticeG = new THREE.Group();   // scaled by the spacing beat
  micro.add(latticeG);
  const LS = 0.55;                       // world units per half-cell (a/2)
  const WORLD_PER_ANG = LS / (FLOW.SALT_A / 2);
  const LAM_W = WORLD_PER_ANG * XRD.wavelength; // wavelength in world units

  /* Rock-salt lattice: two atom kinds alternating on a 6x6x6 grid (216). */
  const dummy = new THREE.Object3D();
  const latSets = [];
  {
    const A = [], B = [];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) for (let k = 0; k < 6; k++)
      ((i + j + k) % 2 === 0 ? A : B).push([(i - 2.5) * LS, (j - 2.5) * LS, (k - 2.5) * LS]);
    const defs = [
      { positions: A, color: 0x9a86f0, roughness: 0.32 },
      { positions: B, color: 0x86d68a, roughness: 0.38 }
    ];
    for (const def of defs) {
      const geo = new THREE.SphereGeometry(0.16, 20, 14);
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.05, roughness: def.roughness });
      const inst = new THREE.InstancedMesh(geo, mat, def.positions.length);
      const base = new THREE.Color(def.color);
      def.positions.forEach((p, i) => {
        dummy.position.set(p[0], p[1], p[2]);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
        inst.setColorAt(i, base);
      });
      inst.count = def.positions.length;
      latticeG.add(inst);
      latSets.push({ mesh: inst, ys: def.positions.map(p => p[1]), base });
    }
  }
  /* Translucent sheets on every atom layer (the plane stack itself). */
  {
    const sheetMat = new THREE.MeshStandardMaterial({ color: 0x8fdcec, transparent: true, opacity: 0.11, roughness: 0.4, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
    const sheetMatHi = new THREE.MeshStandardMaterial({ color: 0xaee6f5, transparent: true, opacity: 0.2, roughness: 0.4, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
    for (let j = 0; j < 6; j++) {
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.6), j === 5 ? sheetMatHi : sheetMat);
      sh.rotation.x = -Math.PI / 2;
      sh.position.y = (j - 2.5) * LS;
      latticeG.add(sh);
    }
  }
  /* Centre atoms (beat g): one at the centre of every cell, 5x5x5 = 125.
     They fade/scale in with the occupancy t; the all-odd families then
     cancel in the chart — the same model physics.js already uses. */
  const centerPos = [];
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) for (let k = 0; k < 5; k++)
    centerPos.push([(i - 2) * LS, (j - 2) * LS, (k - 2) * LS]);
  const centerMat = new THREE.MeshStandardMaterial({ color: 0xffd9a0, metalness: 0.1, roughness: 0.35, transparent: true, opacity: 0 });
  const centerMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.15, 18, 12), centerMat, centerPos.length);
  centerMesh.count = centerPos.length;
  latticeG.add(centerMesh);
  let lastCenterT = -1;
  function setCenter(t) {
    if (Math.abs(t - lastCenterT) < 0.004) return;
    lastCenterT = t;
    centerMat.opacity = t;
    const s = Math.max(t, 0.0001);
    centerPos.forEach((p, i) => {
      dummy.position.set(p[0], p[1], p[2]);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      centerMesh.setMatrixAt(i, dummy.matrix);
    });
    centerMesh.instanceMatrix.needsUpdate = true;
    centerMesh.visible = t > 0.004;
  }
  setCenter(0);

  /* Plane-family sheets (beat f): for each salt family, the set of planes
     through atom layers, built with XRD.planePolygon in grid coordinates
     (1 grid unit = a/2). Conventional all-even labels halve into grid
     indices; all-odd labels keep their indices and only even levels pass
     through atom layers. */
  const famGoldMat = new THREE.MeshStandardMaterial({ color: 0xffc66b, emissive: 0x8a5a10, emissiveIntensity: 0.55, transparent: true, opacity: 0.32, roughness: 0.4, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
  const famGroups = FLOW.saltGroups(FLOW.SALT_A, 0).map(g => {
    const label = g.labels[0];
    const digs = label.split('').map(Number);
    const allEven = digs.every(v => v % 2 === 0);
    const idx = allEven ? digs.map(v => v / 2) : digs;
    const E = 5, sum = idx[0] + idx[1] + idx[2], maxL = sum * E;
    let step = allEven ? 1 : 2;
    let levels = [];
    for (let L = 0; L <= maxL; L += step) levels.push(L);
    while (levels.length > 9) { step *= 2; levels = []; for (let L = 0; L <= maxL; L += step) levels.push(L); }
    const mat = new THREE.MeshStandardMaterial({ color: 0x62e6e0, emissive: 0x0d4a4a, emissiveIntensity: 0.4, transparent: true, opacity: 0.13, roughness: 0.4, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
    const grp = new THREE.Group();
    for (const L of levels) {
      const poly = XRD.planePolygon(idx, L, E);
      if (poly.length < 3) continue;
      const pts = poly.map(p => new THREE.Vector3((p[0] - 2.5) * LS, (p[1] - 2.5) * LS, (p[2] - 2.5) * LS));
      let area = 0;
      for (let i = 1; i < pts.length - 1; i++) {
        const u = new THREE.Vector3().subVectors(pts[i], pts[0]);
        const v = new THREE.Vector3().subVectors(pts[i + 1], pts[0]);
        area += new THREE.Vector3().crossVectors(u, v).length() / 2;
      }
      if (area < 0.03 * LS * LS) continue;
      const ring = [];
      pts.forEach(p => ring.push(p.x, p.y, p.z));
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(ring, 3));
      const fan = [];
      for (let i = 1; i < pts.length - 1; i++) fan.push(0, i, i + 1);
      geo.setIndex(fan);
      geo.computeVertexNormals();
      grp.add(new THREE.Mesh(geo, mat));
    }
    grp.visible = false;
    latticeG.add(grp);
    return { grp, mat, label };
  });
  let lastFamKey = '';
  function setFamilies(st) {
    const inF = st.beat === 5, inG = st.beat === 6;
    const key = (inF || inG) ? (inG ? 'g' : 'f' + st.famCount) : 'off';
    if (key === lastFamKey) return;
    lastFamKey = key;
    famGroups.forEach((f, i) => {
      if (key === 'off') { f.grp.visible = false; return; }
      f.grp.visible = i < st.famCount;
      const gold = inF && i === st.famCount - 1;
      f.grp.children.forEach(m => { m.material = gold ? famGoldMat : f.mat; });
    });
  }

  /* Wave system (beat d): WAVEFRONTS, not a ray at one atom.
     A few parallel planes sweep along the incident / scattered
     directions. Every atom's instance colour is driven by the total
     (incident - scattered) phase at its own position, so at the Bragg
     angle all 216 atoms pulse in unison and the outgoing fronts stand
     up bright; off that angle the layers shimmer out of phase and the
     outgoing fronts stay faint. The detector plate lights with the
     same stack intensity physics.js computes. */
  const waveG = new THREE.Group();
  micro.add(waveG);
  /* How many wavefronts to draw. The user's call: the original dense
     comb of ~25 fronts was too much here — 2-3 quiet fronts are
     enough. The comb is NOT deleted: set WAVE_MODE to 'comb' and the
     dense wavefront train returns unchanged (the technique may suit
     another scene later). One constant flips between the two. */
  const WAVE_MODE = 'few';        // 'few' (default) | 'comb' (preserved)
  const WAVE_FEW_COUNT = 3;       // fronts drawn in 'few' mode
  const WAVE_COMB_COUNT = 25;     // fronts in the preserved comb mode
  const WAVE_FEW_GAP = 8;         // 'few' spacing, in wavelengths
  function wavefronts(mat) {
    const g = new THREE.Group();
    const comb = WAVE_MODE === 'comb';
    const n = comb ? WAVE_COMB_COUNT : WAVE_FEW_COUNT;
    const gap = comb ? LAM_W : LAM_W * WAVE_FEW_GAP;
    const size = comb ? 7.6 : 5.4;
    const geo = new THREE.PlaneGeometry(size, size);
    const span = gap * (n - 1);
    for (let k = 0; k < n; k++) {
      const m = new THREE.Mesh(geo, mat);
      m.position.z = -span / 2 + k * gap;
      g.add(m);
    }
    g.userData.gap = gap;
    return g;
  }
  const inMat = new THREE.MeshBasicMaterial({ color: 0xffdf8a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const outMat = new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const inComb = wavefronts(inMat);
  const outComb = wavefronts(outMat);
  waveG.add(inComb); waveG.add(outComb);
  const detMat = new THREE.MeshStandardMaterial({ color: 0x2a3440, emissive: 0xffc66b, emissiveIntensity: 0, metalness: 0.4, roughness: 0.5 });
  const detPlate = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.9, 0.1), detMat);
  waveG.add(detPlate);
  waveG.visible = false;
  const _q = new THREE.Quaternion(), _zAxis = new THREE.Vector3(0, 0, 1);
  const _dir = new THREE.Vector3(), _tmpC = new THREE.Color();
  let pulseWasOn = false;
  function updateWave(st, tsec) {
    const on = st.waveAmp > 0.003 && st.det != null;
    waveG.visible = on;
    if (!on) {
      if (pulseWasOn) { // restore flat atom colours once
        for (const set of latSets) {
          set.ys.forEach((_, i) => set.mesh.setColorAt(i, set.base));
          set.mesh.instanceColor.needsUpdate = true;
        }
        pulseWasOn = false;
      }
      return;
    }
    pulseWasOn = true;
    const th = st.det * Math.PI / 360, s = Math.sin(th), c = Math.cos(th);
    const off = reduceMotion ? 0 : (tsec * 0.55) % inComb.userData.gap;
    _dir.set(c, -s, 0);
    inComb.quaternion.copy(_q.setFromUnitVectors(_zAxis, _dir));
    inComb.position.copy(_dir).multiplyScalar(off);
    _dir.set(c, s, 0);
    outComb.quaternion.copy(_q.setFromUnitVectors(_zAxis, _dir));
    outComb.position.copy(_dir).multiplyScalar(off);
    detPlate.position.copy(_dir).multiplyScalar(5.6);
    detPlate.quaternion.copy(_q.setFromUnitVectors(_zAxis, _dir.clone().negate()));
    inMat.opacity = 0.17 * st.waveAmp;
    outMat.opacity = (0.04 + 0.5 * st.hl) * st.waveAmp;
    detMat.emissiveIntensity = 2.4 * st.hl * st.waveAmp;
    /* per-atom total phase: phi = -(2pi/lambda) * 2 sin(theta) * y_Angstrom.
       Same layer -> same phase; at the Bragg angle the layer-to-layer
       step is exactly 2pi, so the WHOLE lattice blinks as one. */
    for (const set of latSets) {
      for (let i = 0; i < set.ys.length; i++) {
        const phi = -(2 * Math.PI / XRD.wavelength) * 2 * s * (set.ys[i] / WORLD_PER_ANG) - (reduceMotion ? 0 : tsec * 2.4);
        let m = 0.35 + 0.85 * (0.5 + 0.5 * Math.cos(phi));
        m = 1 + (m - 1) * st.waveAmp;
        set.mesh.setColorAt(i, _tmpC.copy(set.base).multiplyScalar(m));
      }
      set.mesh.instanceColor.needsUpdate = true;
    }
  }

  /* ================= Chart overlay (2D supplement) =================
     The pattern is a graph, so it stays 2D — drawn beside the stage,
     driven by the same scroll state. All peak data comes from
     flowmath (physics.js salt groups); nothing is invented here. */
  const groups0 = FLOW.chartGroups(FLOW.SALT_A, 0, null); // the 9 salt peaks
  const tracePts = (() => {
    const rand = mulberry32(7), pts = [], N = 1100;
    for (let i = 0; i <= N; i++) {
      const x = 15 + 75 * i / N, v = XRD.intensity(x, groups0);
      const amp = 0.006 + 0.085 * Math.sqrt(Math.max(v, 0));
      pts.push([x, Math.max(0, v + (rand() * 2 - 1) * amp)]);
    }
    return pts;
  })();
  const peak200 = groups0.find(g => g.labels.includes('200'));
  let lastChartKey = '';
  function drawChart(st) {
    const key = [st.scanning ? 's' + Math.round(st.scanX * 2) : 'c',
      Math.round(st.a * 200), Math.round(st.centerT * 40), st.famCount,
      (st.beat === 3 && st.hl > 0.85) ? 'H' : ''].join('|');
    if (key === lastChartKey) return;
    lastChartKey = key;
    const W = 440, H = 200, left = 40, right = 428, top = 18, bottom = 166, ymax = 1.15;
    const xx = x => left + (x - 15) / 75 * (right - left), yy = v => bottom - v / ymax * (bottom - top);
    const T = (x, y, s, extra = '') => `<text x="${x}" y="${y}" ${extra}>${s}</text>`;
    const SG = (a, b, color, extra = '') => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${color}" ${extra}/>`;
    let svg = `<defs><clipPath id="flow-clip"><rect x="${left}" y="${top}" width="${right - left}" height="${bottom - top}"/></clipPath></defs>`;
    svg += T(left, 13, '相対強度', 'style="font-size:11px;fill:#a8bbce"');
    svg += T(right, 13, '塩 NaCl', 'text-anchor="end" style="font-size:11px;fill:#a8bbce"');
    for (const v of [0, .5, 1]) svg += SG([left, yy(v)], [right, yy(v)], '#2c3e52') + T(left - 6, yy(v) + 4, v.toFixed(1), 'text-anchor="end" style="font-size:11px"');
    for (const t of [20, 40, 60, 80]) svg += T(xx(t), bottom + 17, String(t), 'text-anchor="middle" style="font-size:11px"');
    svg += T((left + right) / 2, H - 2, '検出器の角度 2θ（°）', 'text-anchor="middle" style="font-size:11px"');
    svg += '<g clip-path="url(#flow-clip)">';
    if (st.p < FLOW.BEATS[1].to) {
      let d = '';
      for (const pt of tracePts) { if (pt[0] > st.scanX + 1e-9) break; d += (d ? 'L' : 'M') + xx(pt[0]).toFixed(1) + ' ' + yy(pt[1]).toFixed(1); }
      if (d) svg += `<path d="${d}" fill="none" stroke="#62e6e0" stroke-width="1.8"/>`;
      if (st.scanning) svg += SG([xx(st.scanX), top], [xx(st.scanX), bottom], '#ffc66b', 'stroke-dasharray="3 4" opacity=".85"');
      if (!st.chartShow) svg += T((left + right) / 2, (top + bottom) / 2, 'まだ測っていません', 'text-anchor="middle" style="font-size:12px;fill:#a8bbce"');
    } else {
      const groups = FLOW.chartGroups(st.a, st.centerT, st.famCount);
      let d = '';
      for (let i = 0; i <= 700; i++) {
        const x = 15 + 75 * i / 700;
        d += (i ? 'L' : 'M') + xx(x).toFixed(1) + ' ' + yy(XRD.intensity(x, groups)).toFixed(1);
      }
      svg += `<path d="${d}" fill="none" stroke="#62e6e0" stroke-width="1.8"/>`;
      for (const g of groups) {
        if (g.area <= 1e-6) continue;
        svg += `<circle cx="${xx(g.x).toFixed(1)}" cy="${yy(XRD.intensity(g.x, [g])).toFixed(1)}" r="2.6" fill="#62e6e0"/>`;
      }
      for (const g of FLOW.saltGroups(st.a, st.centerT)) {
        if (g.area > 1e-6) continue;
        svg += SG([xx(g.x), top + 4], [xx(g.x), bottom], '#8fa3b8', 'stroke-dasharray="3 5" opacity=".55"');
        svg += T(xx(g.x), bottom + 30, '消', 'text-anchor="middle" style="font-size:10px;fill:#8fa3b8"');
      }
      if (st.beat === 3 && st.hl > 0.02 && peak200) {
        svg += `<circle cx="${xx(peak200.x).toFixed(1)}" cy="${yy(XRD.intensity(peak200.x, [peak200])).toFixed(1)}" r="6" fill="none" stroke="#ffc66b" stroke-width="2" opacity="${st.hl.toFixed(2)}"/>`;
      }
    }
    svg += '</g>';
    chartEl.innerHTML = svg;
  }

  /* ================= Camera path =================
     Poses only: the subject never changes. Device poses, then the dive,
     then slow orbits around the landed lattice for the later beats. */
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const DEV_HOME  = { pos: V3(5.4, 4.6, 10.4), tgt: V3(0, 1.95, 0) };
  const DEV_CLOSE = { pos: V3(4.0, 3.5, 8.4),  tgt: V3(0, 1.95, 0) };
  const SURF      = { pos: V3(1.7, CY + 1.15, 3.1), tgt: V3(0, CY, 0) };
  const GRAIN     = { pos: V3(0.5, CY + 0.25, 0.7), tgt: V3(0.12, CY + 0.05, 0.08) };
  const LAT_WIDE  = { pos: V3(8.5, -76.0, 10.5), tgt: V3(0, -80, 0) };
  const LAT_MID   = { pos: V3(5.6, -77.6, 7.4),  tgt: V3(0, -80, 0) };
  const LAND      = { pos: V3(3.1, -78.35, 3.6), tgt: V3(0, -80, 0) };
  const WAVE_VIEW = { pos: V3(4.8, -79.0, 6.6),  tgt: V3(0, -80, 0) };
  const WV2       = { pos: V3(6.6, -78.4, 4.6),  tgt: V3(0, -80, 0) };
  const ORBIT_A   = { pos: V3(2.4, -77.5, 6.9),  tgt: V3(0, -80, 0) };
  const ORBIT_B   = { pos: V3(-3.2, -78.3, 5.8), tgt: V3(0, -80, 0) };
  const ORBIT_C   = { pos: V3(-4.8, -77.6, 4.2), tgt: V3(0, -80, 0) };
  const WB = FLOW.BEATS[3];
  const POST = [
    [WB.from, LAND],
    [WB.from + 0.45 * (WB.to - WB.from), WAVE_VIEW],
    [FLOW.BEATS[4].from, WV2],
    [FLOW.BEATS[5].from, ORBIT_A],
    [FLOW.BEATS[6].from, ORBIT_B],
    [1, ORBIT_C]
  ];
  function smooth(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }
  function segT(p, a, b) { return smooth((p - a) / (b - a)); }
  const _pos = new THREE.Vector3(), _tgt = new THREE.Vector3();
  const _pose = { pos: new THREE.Vector3(), tgt: new THREE.Vector3() };
  let grainPos = null;
  function divePose(d) {
    if (d < 0.30) { const t = segT(d, 0, 0.30); _pose.pos.lerpVectors(DEV_CLOSE.pos, SURF.pos, t); _pose.tgt.lerpVectors(DEV_CLOSE.tgt, SURF.tgt, t); }
    else if (d < 0.52) { const t = segT(d, 0.30, 0.52); _pose.pos.lerpVectors(SURF.pos, GRAIN.pos, t); _pose.tgt.lerpVectors(SURF.tgt, GRAIN.tgt, t); }
    else if (d < 0.58) { _pose.pos.copy(GRAIN.pos); _pose.tgt.copy(GRAIN.tgt); }
    else if (d < 0.85) { const t = segT(d, 0.58, 0.85); _pose.pos.lerpVectors(LAT_WIDE.pos, LAT_MID.pos, t); _pose.tgt.lerpVectors(LAT_WIDE.tgt, LAT_MID.tgt, t); }
    else { const t = segT(d, 0.85, 1); _pose.pos.lerpVectors(LAT_MID.pos, LAND.pos, t); _pose.tgt.lerpVectors(LAT_MID.tgt, LAND.tgt, t); }
  }
  function postPose(p) {
    for (let i = 0; i < POST.length - 1; i++) {
      const p0 = POST[i][0], A = POST[i][1], p1 = POST[i + 1][0], Bp = POST[i + 1][1];
      if (p <= p1 || i === POST.length - 2) {
        const t = smooth((p - p0) / (p1 - p0));
        _pose.pos.lerpVectors(A.pos, Bp.pos, t);
        _pose.tgt.lerpVectors(A.tgt, Bp.tgt, t);
        return;
      }
    }
  }
  function applyCamera(st) {
    if (st.dive <= 0) {
      const t = smooth(st.pushIn);
      _pos.lerpVectors(DEV_HOME.pos, DEV_CLOSE.pos, t);
      _tgt.lerpVectors(DEV_HOME.tgt, DEV_CLOSE.tgt, t);
    } else if (st.dive < 1) {
      divePose(st.dive);
      _pos.copy(_pose.pos); _tgt.copy(_pose.tgt);
    } else {
      postPose(st.p);
      _pos.copy(_pose.pos); _tgt.copy(_pose.tgt);
    }
    camera.position.copy(_pos);
    camera.lookAt(_tgt);
  }

  /* ================= Scroll driver + per-frame apply ================= */
  function targetP() {
    const line = window.innerHeight * 0.5;
    let acc = 0, total = 0;
    const hs = beatEls.map(b => b.offsetHeight);
    total = hs.reduce((s, h) => s + h, 0);
    if (!total) return 0;
    for (let i = 0; i < beatEls.length; i++) {
      const r = beatEls[i].getBoundingClientRect();
      if (line <= r.bottom) {
        const loc = Math.max(0, Math.min(1, (line - r.top) / hs[i]));
        return (acc + loc * hs[i]) / total;
      }
      acc += hs[i];
    }
    return 1;
  }
  let pSmooth = 0, tsec = 0, lastCap = -1, curDive = 0;
  function scaleText(st) {
    if (st.dive > 0 && st.dive < 1) {
      const d = st.dive;
      if (d < 0.18) return 'いまの深さ：装置 ― 数十 cm';
      if (d < 0.40) return 'いまの深さ：試料面 ― mm';
      if (d < 0.58) return 'いまの深さ：粉の粒 ― µm';
      if (d < 0.85) return 'いまの深さ：結晶格子 ― nm';
      return 'いまの深さ：面の間隔 ― Å';
    }
    if (st.beat === 3) return 'いまの深さ：面の間隔 ― Å';
    return '';
  }
  function apply(st, dt) {
    curDive = st.dive;
    setScan(st.scanX);
    if (st.scanning && !reduceMotion) spinner.rotation.y -= dt * 1.4;
    /* capture the hero grain once the dive begins (spinner is parked) */
    if (st.dive > 0.02 && st.dive < 0.52 && !grainPos) {
      grainPos = new THREE.Vector3();
      heroGrain.getWorldPosition(grainPos);
      GRAIN.tgt.copy(grainPos);
      GRAIN.pos.copy(grainPos).add(new THREE.Vector3(0.36, 0.2, 0.6));
    }
    if (st.dive === 0) grainPos = null;
    /* one visibility swap, at the grain surface, under the fade */
    const wantMicro = st.dive >= 0.58;
    if (wantMicro !== micro.visible) { micro.visible = wantMicro; device.visible = !wantMicro; }
    let fo = 0;
    if (st.dive > 0.50 && st.dive < 0.66) fo = st.dive < 0.58 ? (st.dive - 0.50) / 0.08 : 1 - (st.dive - 0.58) / 0.08;
    fadeEl.style.opacity = fo.toFixed(3);
    applyCamera(st);
    latticeG.scale.setScalar(st.a / FLOW.SALT_A);
    setCenter(st.centerT);
    setFamilies(st);
    updateWave(st, tsec);
    chartEl.classList.toggle('on', st.chartShow);
    if (st.chartShow || st.p < FLOW.BEATS[1].to) drawChart(st);
    if (st.captionIdx !== lastCap) {
      lastCap = st.captionIdx;
      captionEl.textContent = FLOW.CAPTIONS[st.captionIdx];
    }
    const sc = scaleText(st);
    scaleEl.textContent = sc;
    scaleEl.style.display = sc ? 'block' : 'none';
    hintEl.style.opacity = st.p < 0.015 ? '1' : '0';
  }

  /* Tap the tube housing: the X-ray source note (an aside, kept from Q0). */
  if (tubeNote) {
    const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
    let downAt = 0, downX = 0, downY = 0;
    renderer.domElement.addEventListener('pointerdown', e => { downAt = performance.now(); downX = e.clientX; downY = e.clientY; });
    renderer.domElement.addEventListener('pointerup', e => {
      if (curDive > 0.05) return;
      if (performance.now() - downAt > 400 || Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
      const r = renderer.domElement.getBoundingClientRect();
      ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ptr, camera);
      if (ray.intersectObjects(tubeHit, false).length) tubeNote.hidden = !tubeNote.hidden;
    });
    if (tubeClose) tubeClose.addEventListener('click', () => { tubeNote.hidden = true; });
  }

  /* ================= Resize + render loop (paused off-screen) ================= */
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
  window.addEventListener('resize', resize);

  let rafId = null, lastTick = 0;
  function loop(now) {
    rafId = requestAnimationFrame(loop);
    const dt = lastTick ? Math.min(0.05, (now - lastTick) / 1000) : 0;
    lastTick = now;
    if (!reduceMotion) tsec += dt;
    const pT = targetP();
    pSmooth = reduceMotion ? pT : pSmooth + (pT - pSmooth) * Math.min(1, dt * 6.5 || 1);
    if (Math.abs(pT - pSmooth) < 0.0004) pSmooth = pT;
    apply(FLOW.state(pSmooth), dt);
    renderer.render(scene, camera);
  }
  function startLoop() { if (rafId === null) { lastTick = 0; rafId = requestAnimationFrame(loop); } }
  function stopLoop() { if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; } }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      for (const e of entries) { if (e.isIntersecting) startLoop(); else stopLoop(); }
    }, { rootMargin: '160px' }).observe(flowEl);
  } else startLoop();

  /* ================= Activation =================
     Only now — renderer created, scene built — reveal the flow. Any
     failure before this point leaves the fallback exactly as it was. */
  resize();
  captionEl.textContent = FLOW.CAPTIONS[0];
  apply(FLOW.state(0), 0);
  document.body.classList.add('flow-on');
  window.dispatchEvent(new Event('flow-ready'));
}
