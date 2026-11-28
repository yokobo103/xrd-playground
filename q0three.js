/* Q0 3D instrument (three.js): Bruker-style reflection geometry, theta-theta
   arm swing, spinning circular holder, and the dive into the sample
   (powder grain -> crystal lattice -> plane stack).
   Loaded lazily by the inline loader in index.html only when Q0 nears the
   viewport. If anything here fails (CDN, WebGL), this module never activates
   and the 2D Q0 in chain.js remains as the fallback.
   Coordination with chain.js (which owns samples / scan / chart / status):
     chain.js -> Q0Three.setScan(2theta)   arms follow the scan every frame
     chain.js -> Q0Three.setSample(key)    lattice + powder follow the sample
     chain.js -> Q0Three.setScanBusy(bool) dive button disabled while scanning
     Q0Three.isDiving()                    chain.js blocks scan start mid-dive
   While diving / landed, this module disables #q0-start and the sample
   buttons directly, and writes dive progress into #q0-status. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const $ = id => document.getElementById(id);
const stage = $('q0-stage'), wrap = $('q0-3d');
const statusEl = $('q0-status');
const diveBtn = $('q0-dive'), backBtn = $('q0-back');
const scaleChip = $('q0-scale'), landEl = $('q0-land'), fadeEl = $('q0-fade');
const SCAN_FROM = 15;
const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
} catch (e) {
  renderer = null; // WebGL unavailable: leave the 2D fallback untouched.
}

if (renderer && stage && wrap && diveBtn && backBtn) {
  init(renderer);
}

function init(renderer) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(40, 4 / 3, 0.1, 120);
  camera.position.set(5.4, 4.6, 10.4);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.95, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 6;
  controls.maxDistance = 18;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = 1.52;
  controls.minAzimuthAngle = -1.05;
  controls.maxAzimuthAngle = 1.05;
  controls.enablePan = false;

  /* Lights: one key light with soft shadows + faint cool fill. */
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

  /* Floor: shadow catcher only, so the CSS room gradient stays the backdrop. */
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(30, 48),
    new THREE.ShadowMaterial({ opacity: 0.42 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  /* ---------------- Materials (PBR) ---------------- */
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
  function mesh(geo, mat, x = 0, y = 0, z = 0, parent = scene) {
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
  const R_ARM = 3.0;    // distance from centre to each housing centre

  /* ---------------- Cabinet & bench ---------------- */
  mesh(new RoundedBoxGeometry(10.2, 1.06, 6.0, 4, 0.06), M.resin, 0.2, 0.53, 0);
  mesh(new RoundedBoxGeometry(10.4, 0.12, 6.2, 2, 0.04), M.resin2, 0.2, 1.12, 0);
  mesh(new THREE.BoxGeometry(9.6, 0.05, 0.06), M.strip, 0.2, 0.78, 3.02);
  mesh(new THREE.BoxGeometry(2.6, 0.5, 0.04), M.dark, -2.6, 0.52, 3.02);
  mesh(new THREE.BoxGeometry(1.4, 0.34, 0.04), M.dark, 2.9, 0.52, 3.02);
  for (const sx of [-4.4, 4.8]) for (const sz of [-2.6, 2.6])
    mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.12, 20), M.dark, sx, 0.06, sz);

  /* ---------------- Vertical goniometer arc (behind the arms) ---------------- */
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

  /* ---------------- Sample stage + spinning circular holder ---------------- */
  mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.62, 28), M.steelD, 0, 1.49, 0);
  mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.07, 36), M.steelD, 0, 1.83, 0);
  const spinner = new THREE.Group();
  scene.add(spinner);
  mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.07, 40), M.steel, 0, 1.9, 0, spinner);
  mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.05, 40), M.steelD, 0, CY - 0.115, 0, spinner);
  mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.09, 40, 1, true), M.steel, 0, CY - 0.045, 0, spinner);
  const rimRing = mesh(new THREE.TorusGeometry(0.62, 0.028, 12, 48), M.steel, 0, CY - 0.005, 0, spinner);
  rimRing.rotation.x = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.565, 0.565, 0.03, 40), M.powder, 0, CY - 0.015, 0, spinner);

  /* ---------------- Arms (pivot at the goniometer centre) ---------------- */
  function buildArm(sign) {
    const arm = new THREE.Group();
    arm.position.set(0, CY, 0);
    scene.add(arm);
    mesh(new THREE.BoxGeometry(2.6, 0.15, 0.26), M.steelD, sign * 1.55, 0, -0.32, arm);
    mesh(new THREE.BoxGeometry(0.45, 0.34, 0.55), M.steelD, sign * 2.9, 0, -0.12, arm);
    mesh(new THREE.BoxGeometry(0.7, 0.12, 0.65), M.steelD, sign * 3.15, 0, -0.55, arm);
    mesh(new THREE.BoxGeometry(0.5, 0.34, 0.3), M.steelD, sign * 3.42, 0, -0.85, arm);
    return arm;
  }
  const srcArm = buildArm(-1);
  const detArm = buildArm(1);

  /* X-ray tube housing on the source arm (snout toward the centre). */
  mesh(new RoundedBoxGeometry(1.6, 1.25, 1.35, 4, 0.09), M.enamel, -R_ARM, 0.12, 0, srcArm);
  mesh(new THREE.BoxGeometry(1.62, 0.14, 1.37), M.accent, -R_ARM, -0.38, 0, srcArm);
  mesh(new RoundedBoxGeometry(0.9, 0.6, 0.9, 2, 0.05), M.enamel2, -R_ARM - 0.15, 0.95, 0, srcArm);
  const snout = mesh(new THREE.CylinderGeometry(0.17, 0.21, 0.62, 24), M.steelD, -1.95, 0, 0, srcArm);
  snout.rotation.z = Math.PI / 2;
  const snoutTip = mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.3, 20), M.steel, -1.5, 0, 0, srcArm);
  snoutTip.rotation.z = Math.PI / 2;
  const tubeLed = mesh(new THREE.SphereGeometry(0.045, 12, 12), M.led, -R_ARM, 0.38, 0.7, srcArm);
  tubeLed.castShadow = false;
  mesh(new RoundedBoxGeometry(0.5, 0.8, 0.9, 2, 0.04), M.enamel2, -R_ARM - 1.0, 0.05, 0, srcArm);
  const inCore = beamMesh(new THREE.CylinderGeometry(0.02, 0.02, 1.33, 8), M.beam, -0.685, 0, 0, srcArm);
  inCore.rotation.z = Math.PI / 2;
  const inHalo = beamMesh(new THREE.CylinderGeometry(0.06, 0.06, 1.33, 12), M.beamHalo, -0.685, 0, 0, srcArm);
  inHalo.rotation.z = Math.PI / 2;

  /* Detector housing on the detector arm (slit toward the centre). */
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

  /* ---------------- theta-theta linkage ----------------
     Scan coordinate is 2theta. Each arm swings by theta = twoTheta / 2:
     source arm rotation.z = -theta, detector arm rotation.z = +theta — a
     seesaw in the vertical plane. The sample stays horizontal and only spins.
     chain.js drives this via Q0Three.setScan() on every rendered frame. */
  let currentScan = SCAN_FROM;
  function setScan(twoTheta) {
    currentScan = twoTheta;
    const r = (twoTheta / 2) * Math.PI / 180;
    srcArm.rotation.z = -r;
    detArm.rotation.z = r;
  }
  setScan(SCAN_FROM);

  /* ---------------- Micro world: inside the powder grain ----------------
     Built far below the device (y = -80) in the same scene. The dive fades
     the device out at the grain surface and continues inside this world.
     The lattice is rebuilt per sample (see SAMPLES / buildLattice). */
  const deviceChildren = scene.children.filter(o => o.type === 'Mesh' || o.type === 'Group');
  const micro = new THREE.Group();
  micro.position.set(0, -80, 0);
  micro.visible = false;
  scene.add(micro);
  const microLight = new THREE.PointLight(0xcfe4ff, 90, 0, 1.6);
  microLight.position.set(5, 6, 4);
  micro.add(microLight);

  const waveInMat = new THREE.MeshBasicMaterial({ color: 0xffdf8a, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
  const waveOutMat = new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false });

  /* Builds one lattice (atoms + translucent plane sheets + a hint of the
     incoming/diffracted wave grazing the top layer) as a Group centred on
     the origin. `layers` are the Y levels that carry atoms, topmost last. */
  function latticeGroup(build) {
    const g = new THREE.Group();
    const disposables = [];
    const dummy = new THREE.Object3D();
    for (const set of build.sets) {
      const geo = new THREE.SphereGeometry(set.r, 20, 14);
      const mat = new THREE.MeshStandardMaterial({ color: set.color, metalness: set.metalness, roughness: set.roughness });
      const inst = new THREE.InstancedMesh(geo, mat, set.positions.length);
      set.positions.forEach((p, i) => {
        dummy.position.set(p[0], p[1], p[2]);
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
      });
      inst.count = set.positions.length;
      g.add(inst);
      disposables.push(geo, mat);
    }
    const sheetMat = new THREE.MeshStandardMaterial({ color: 0x8fdcec, transparent: true, opacity: 0.11, roughness: 0.4, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
    const sheetMatHi = new THREE.MeshStandardMaterial({ color: 0xaee6f5, transparent: true, opacity: 0.2, roughness: 0.4, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
    disposables.push(sheetMat, sheetMatHi);
    build.layers.forEach((y, i) => {
      const geo = new THREE.PlaneGeometry(build.sheetSize, build.sheetSize);
      const sh = new THREE.Mesh(geo, i === build.layers.length - 1 ? sheetMatHi : sheetMat);
      sh.rotation.x = -Math.PI / 2;
      sh.position.y = y;
      g.add(sh);
      disposables.push(geo);
    });
    /* Wave hint: sine tubes grazing the top layer at 18 degrees. */
    const GRAZE = 18 * Math.PI / 180, GC = Math.cos(GRAZE), GS = Math.sin(GRAZE);
    const topY = build.layers[build.layers.length - 1] + build.topR;
    function waveTube(x0, y0, dx, dy, len, mat) {
      const pts = [];
      const px = -dy, py = dx;
      for (let i = 0; i <= 60; i++) {
        const t = i / 60, s = Math.sin(t * Math.PI * 2 * 6) * 0.085;
        pts.push(new THREE.Vector3(x0 + dx * len * t + px * s, y0 + dy * len * t + py * s, 0));
      }
      const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 72, 0.02, 6, false);
      const tube = new THREE.Mesh(geo, mat);
      g.add(tube);
      disposables.push(geo);
    }
    waveTube(0.2 - 4.1 * GC, topY + 4.1 * GS, GC, -GS, 4.1, waveInMat);
    waveTube(0.2, topY, GC, GS, 4.1, waveOutMat);
    g.userData.disposables = disposables;
    return g;
  }

  function gridPositions(n, ls, offset) {
    const half = (n - 1) * ls / 2, out = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++)
      out.push([i * ls - half + offset[0], j * ls - half + offset[1], k * ls - half + offset[2]]);
    return out;
  }
  function layersOf(n, ls) {
    const half = (n - 1) * ls / 2, out = [];
    for (let j = 0; j < n; j++) out.push(j * ls - half);
    return out;
  }

  const LATTICES = {
    /* Salt: rock-salt-like alternation of two atom kinds (6x6x6 = 216). */
    rocksalt() {
      const n = 6, ls = 0.55, A = [], B = [];
      const half = (n - 1) * ls / 2;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++)
        ((i + j + k) % 2 === 0 ? A : B).push([i * ls - half, j * ls - half, k * ls - half]);
      return latticeGroup({
        sets: [
          { positions: A, r: 0.16, color: 0x9a86f0, metalness: 0.05, roughness: 0.32 },
          { positions: B, r: 0.16, color: 0x86d68a, metalness: 0.05, roughness: 0.38 }
        ],
        layers: layersOf(n, ls), sheetSize: 4.6, topR: 0.16
      });
    },
    /* Metal: body-centred — corner atoms plus one at each cell centre (91). */
    bcc() {
      const cells = 3, ls = 0.8;
      const corners = gridPositions(cells + 1, ls, [0, 0, 0]);
      const centres = gridPositions(cells, ls, [ls / 2, ls / 2, ls / 2]);
      const layers = [];
      for (let j = 0; j <= cells * 2; j++) layers.push(j * ls / 2 - cells * ls / 2);
      return latticeGroup({
        sets: [{ positions: corners.concat(centres), r: 0.17, color: 0x8fb4d8, metalness: 0.35, roughness: 0.3 }],
        layers, sheetSize: 3.6, topR: 0.17
      });
    },
    /* Big cell: simple lattice with wide spacing (4x4x4 = 64). */
    simple() {
      const n = 4, ls = 0.95;
      return latticeGroup({
        sets: [{ positions: gridPositions(n, ls, [0, 0, 0]), r: 0.19, color: 0xf2c979, metalness: 0.1, roughness: 0.38 }],
        layers: layersOf(n, ls), sheetSize: 4.4, topR: 0.19
      });
    }
  };
  const SAMPLES = {
    salt:  { lattice: 'rocksalt', powder: 0xffffff },
    metal: { lattice: 'bcc',      powder: 0xaeb6bd },
    big:   { lattice: 'simple',   powder: 0xf2e7cf }
  };
  let lattice = null, currentSample = null;
  function setSample(keyName) {
    const s = SAMPLES[keyName];
    if (!s || keyName === currentSample) return;
    currentSample = keyName;
    M.powder.color.set(s.powder);
    if (lattice) {
      micro.remove(lattice);
      lattice.userData.disposables.forEach(d => d.dispose && d.dispose());
    }
    lattice = LATTICES[s.lattice]();
    micro.add(lattice);
  }

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

  /* ---------------- Dive: device -> grain -> lattice -> plane stack ---------------- */
  let viewState = 'device'; // device | diving | micro | returning
  let scanBusy = false;
  let diveStart = 0, diveSwapped = false;
  const DIVE_MS = 9500;
  const camHome = { pos: new THREE.Vector3(5.4, 4.6, 10.4), tgt: new THREE.Vector3(0, 1.95, 0) };
  const K0 = { pos: new THREE.Vector3(), tgt: new THREE.Vector3() };
  const K1 = { pos: new THREE.Vector3(1.7, CY + 1.15, 3.1), tgt: new THREE.Vector3(0, CY, 0) };
  const K2 = { pos: new THREE.Vector3(), tgt: new THREE.Vector3() }; // set from the hero grain at dive start
  const K3 = { pos: new THREE.Vector3(8.5, -76.0, 10.5), tgt: new THREE.Vector3(0, -80, 0) };
  const K4 = { pos: new THREE.Vector3(4.2, -78.1, 5.2), tgt: new THREE.Vector3(0, -80, 0) };
  const LAND = { pos: new THREE.Vector3(3.1, -78.35, 3.6), tgt: new THREE.Vector3(0, -80, 0) };
  const DEVICE_LIMITS = { minD: 6, maxD: 18, minP: 0.35, maxP: 1.52, minA: -1.05, maxA: 1.05 };
  function smooth(t) { return t * t * (3 - 2 * t); }
  function segT(p, a, b) { return smooth(Math.max(0, Math.min(1, (p - a) / (b - a)))); }
  function lerpV(out, A, B, t) { out.set(A.x + (B.x - A.x) * t, A.y + (B.y - A.y) * t, A.z + (B.z - A.z) * t); }
  const _dp = new THREE.Vector3(), _dt = new THREE.Vector3();
  function scaleLabel(p) {
    if (p < 0.16) return 'いまの深さ：装置 ― 数十 cm';
    if (p < 0.36) return 'いまの深さ：試料面 ― mm';
    if (p < 0.545) return 'いまの深さ：粉の粒 ― µm';
    if (p < 0.82) return 'いまの深さ：結晶格子 ― nm';
    return 'いまの深さ：面の間隔 ― Å';
  }
  function setMeasureEnabled(on) {
    const start = $('q0-start');
    if (start) start.disabled = !on;
    document.querySelectorAll('[data-q0-sample]').forEach(b => { b.disabled = !on; });
  }
  function updateDive(now) {
    const p = Math.min(1, (now - diveStart) / DIVE_MS);
    scaleChip.textContent = scaleLabel(p);
    if (statusEl) statusEl.textContent =
      p < 0.30 ? '潜行中… 試料面に近づいています' :
      p < 0.545 ? '潜行中… 粉の粒の中へ入っていきます' :
      p < 0.86 ? '潜行中… 結晶格子が見えてきました' :
                  '潜行中… 面の積み重なりに着地します';
    if (!diveSwapped) {
      if (p < 0.30) { const t = segT(p, 0, 0.30); lerpV(_dp, K0.pos, K1.pos, t); lerpV(_dt, K0.tgt, K1.tgt, t); }
      else if (p < 0.50) { const t = segT(p, 0.30, 0.50); lerpV(_dp, K1.pos, K2.pos, t); lerpV(_dt, K1.tgt, K2.tgt, t); }
      else { _dp.copy(K2.pos); _dt.copy(K2.tgt); }
    } else {
      if (p < 0.86) { const t = segT(p, 0.56, 0.86); lerpV(_dp, K3.pos, K4.pos, t); lerpV(_dt, K3.tgt, K4.tgt, t); }
      else { const t = segT(p, 0.86, 1); lerpV(_dp, K4.pos, LAND.pos, t); lerpV(_dt, K4.tgt, LAND.tgt, t); }
    }
    let fo = 0;
    if (p > 0.47 && p < 0.62) fo = p < 0.545 ? (p - 0.47) / 0.075 : 1 - (p - 0.545) / 0.075;
    fadeEl.style.opacity = fo.toFixed(3);
    if (!diveSwapped && p >= 0.545) {
      diveSwapped = true;
      deviceChildren.forEach(o => { o.visible = false; });
      micro.visible = true;
      _dp.copy(K3.pos); _dt.copy(K3.tgt);
    }
    camera.position.copy(_dp);
    camera.lookAt(_dt);
    if (p >= 1) landMicro();
  }
  function landMicro() {
    viewState = 'micro';
    fadeEl.style.opacity = '0';
    landEl.style.display = 'block';
    scaleChip.textContent = 'いまの深さ：面の間隔 ― Å';
    if (statusEl) statusEl.textContent = '原子レベルに着地 — 格子をドラッグで少し回せます';
    backBtn.style.display = '';
    controls.target.copy(LAND.tgt);
    camera.position.copy(LAND.pos);
    controls.minDistance = 3.2; controls.maxDistance = 7.5;
    const az = Math.atan2(LAND.pos.x - LAND.tgt.x, LAND.pos.z - LAND.tgt.z);
    controls.minAzimuthAngle = az - 0.55; controls.maxAzimuthAngle = az + 0.55;
    const pol = Math.acos((LAND.pos.y - LAND.tgt.y) / LAND.pos.distanceTo(LAND.tgt));
    controls.minPolarAngle = Math.max(0.15, pol - 0.3);
    controls.maxPolarAngle = Math.min(1.5, pol + 0.3);
    controls.enabled = true;
  }
  diveBtn.addEventListener('click', () => {
    if (viewState !== 'device' || scanBusy) return;
    viewState = 'diving';
    diveSwapped = false;
    K0.pos.copy(camera.position); K0.tgt.copy(controls.target);
    heroGrain.getWorldPosition(K2.tgt);
    K2.pos.copy(K2.tgt).add(new THREE.Vector3(0.36, 0.2, 0.6));
    controls.enabled = false;
    setMeasureEnabled(false);
    diveBtn.disabled = true;
    scaleChip.style.display = 'block';
    if (reduceMotion) { // jump straight to the atomic level
      diveSwapped = true;
      deviceChildren.forEach(o => { o.visible = false; });
      micro.visible = true;
      landMicro();
      return;
    }
    diveStart = performance.now();
    if (statusEl) statusEl.textContent = '潜行中… 試料面に近づいています';
  });
  backBtn.addEventListener('click', () => {
    if (viewState !== 'micro') return;
    viewState = 'returning';
    controls.enabled = false;
    backBtn.disabled = true;
    fadeEl.style.transition = 'opacity .45s ease';
    fadeEl.style.opacity = '1';
    setTimeout(() => {
      micro.visible = false;
      deviceChildren.forEach(o => { o.visible = true; });
      camera.position.copy(camHome.pos);
      controls.target.copy(camHome.tgt);
      controls.minDistance = DEVICE_LIMITS.minD; controls.maxDistance = DEVICE_LIMITS.maxD;
      controls.minPolarAngle = DEVICE_LIMITS.minP; controls.maxPolarAngle = DEVICE_LIMITS.maxP;
      controls.minAzimuthAngle = DEVICE_LIMITS.minA; controls.maxAzimuthAngle = DEVICE_LIMITS.maxA;
      landEl.style.display = 'none';
      scaleChip.style.display = 'none';
      fadeEl.style.opacity = '0';
      viewState = 'device';
      backBtn.style.display = 'none';
      backBtn.disabled = false;
      setMeasureEnabled(true);
      diveBtn.disabled = scanBusy;
      if (statusEl) statusEl.textContent = '装置ビューに戻りました';
      controls.enabled = true;
      setTimeout(() => { fadeEl.style.transition = 'none'; }, 500);
    }, 480);
  });

  /* ---------------- Public API for chain.js ---------------- */
  function setScanBusy(b) {
    scanBusy = !!b;
    if (viewState === 'device') diveBtn.disabled = scanBusy;
  }
  function isDiving() { return viewState !== 'device'; }
  window.Q0Three = { setScan, setSample, setScanBusy, isDiving };

  /* ---------------- Resize + render loop (paused while Q0 is off-screen) ---------------- */
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
  function tick(now) {
    const dt = lastTick ? Math.min(0.05, (now - lastTick) / 1000) : 0;
    lastTick = now;
    if (scanBusy) spinner.rotation.y -= dt * 1.4; // holder spins while measuring
    if (viewState === 'diving') updateDive(now);
    if (micro.visible) {
      const pu = 0.3 + 0.07 * Math.sin(now * 0.0022);
      waveInMat.opacity = pu;
      waveOutMat.opacity = pu * 0.75;
    }
    if (viewState !== 'diving' && viewState !== 'returning') controls.update();
    renderer.render(scene, camera);
  }
  function loop(now) {
    rafId = requestAnimationFrame(loop);
    tick(now);
  }
  function startLoop() { if (rafId === null) { lastTick = 0; rafId = requestAnimationFrame(loop); } }
  function stopLoop() { if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; } }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) startLoop(); else stopLoop();
      }
    }, { rootMargin: '120px' }).observe($('q0') || stage);
  } else {
    startLoop();
  }

  /* ---------------- Activation ----------------
     Only now — renderer created, scene built — swap the 2D instrument for
     the 3D stage. Any failure before this point leaves the fallback as-is. */
  wrap.hidden = false;
  const inst2d = $('q0-instrument');
  if (inst2d) inst2d.style.display = 'none';
  const lab = $('q0-inst-label');
  if (lab) lab.textContent = '装置（反射法・円形ホルダーのBruker式）';
  const sub = $('q0-inst-sub');
  if (sub) sub.textContent = 'ドラッグで回せます／アームの動きは右のグラフと連動';
  const pressed = document.querySelector('[data-q0-sample][aria-pressed="true"]');
  setSample(pressed ? pressed.dataset.q0Sample : 'salt');
  setScan(currentScan);
  resize();
}
