// Escritório Venus em 3D — cena, móveis, personagens animados e câmera.
// Modelos: Kenney (kenney.nl), licença CC0. Motor: three.js (MIT).
import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {clone as cloneSkinned} from './vendor/SkeletonUtils.js';

const O = window.OFFICE, U = 0.5, FS = 1.3, CS = 1.22;
const V = window.V3D = {ready: false, error: false, update() {}, resize() {}, project: () => ({x: 0, y: 0, behind: true}), portrait: () => null};

try {
  const canvas = document.getElementById('gl');
  const renderer = new THREE.WebGLRenderer({canvas, antialias: true, powerPreference: 'high-performance'});
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const BG_DAY = new THREE.Color('#14111f'), BG_NIGHT = new THREE.Color('#0a0912');
  scene.background = BG_DAY.clone();
  const CX = O.COLS * U / 2, CZ = O.ROWS * U / 2 + .4;
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 200);
  camera.position.set(CX, 17, CZ + 15.5);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(CX, 0, CZ); controls.enableDamping = true; controls.dampingFactor = .08;
  controls.minPolarAngle = .25; controls.maxPolarAngle = 1.3; controls.minDistance = 5; controls.maxDistance = 34;
  controls.screenSpacePanning = false; controls.zoomSpeed = .8; controls.rotateSpeed = .6;
  controls.addEventListener('change', () => { const t = controls.target; t.x = Math.min(O.COLS * U, Math.max(0, t.x)); t.z = Math.min(O.ROWS * U, Math.max(0, t.z)); t.y = 0; });
  let touched = false; controls.addEventListener('start', () => { touched = true; });
  function frameAll(aspect) {
    const v = THREE.MathUtils.degToRad(camera.fov) / 2, el = THREE.MathUtils.degToRad(52);
    const dist = Math.max(10.7 / (Math.tan(v) * aspect), 7 / Math.tan(v)) + 1.2;
    controls.target.set(CX, 0, CZ); camera.position.set(CX, Math.sin(el) * dist, CZ + Math.cos(el) * dist);
  }
  const dbg = /[?&]cam=([-\d.,]+)/.exec(location.search);
  controls.update();

  /* ---------- luz ---------- */
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8f84b0, 1.25); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0dc, 2.6);
  sun.position.set(CX - 7, 16, CZ + 9); sun.target.position.set(CX, 0, CZ); scene.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0004; sun.shadow.normalBias = .03;
  Object.assign(sun.shadow.camera, {left: -13, right: 13, top: 10, bottom: -10, near: 1, far: 50}); sun.shadow.camera.updateProjectionMatrix();
  const lamps = [[3.5, 3.4], [10, 3.4], [16.5, 3.4], [5.5, 10], [15, 10], [10, 6.6]].map(([x, z]) => {
    const l = new THREE.PointLight(0xffc98a, 0, 9, 1.6); l.position.set(x, 1.9, z); scene.add(l); return l;
  });

  /* ---------- pisos ---------- */
  function tex(draw, rep) {
    const c = document.createElement('canvas'); c.width = c.height = 128; draw(c.getContext('2d'));
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.userData.rep = rep; return t;
  }
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const planks = (base, line, tones) => x => { x.fillStyle = base; x.fillRect(0, 0, 128, 128); for (let r = 0; r < 4; r++) { let px = -(r % 2) * 40; while (px < 128) { const w = 50 + rnd() * 40; x.fillStyle = tones[(rnd() * tones.length) | 0]; x.fillRect(px + 1, r * 32 + 1, w - 2, 30); px += w; } x.fillStyle = line; x.fillRect(0, r * 32, 128, 1.5); } };
  const carpet = (base, a, b) => x => { x.fillStyle = base; x.fillRect(0, 0, 128, 128); for (let i = 0; i < 1400; i++) { x.fillStyle = rnd() > .5 ? a : b; x.fillRect(rnd() * 128, rnd() * 128, 1.5, 1.5); } };
  const tiles = (base, line, alt) => x => { x.fillStyle = base; x.fillRect(0, 0, 128, 128); x.fillStyle = alt; x.fillRect(0, 0, 64, 64); x.fillRect(64, 64, 64, 64); x.fillStyle = line; for (const p of [0, 64]) { x.fillRect(p, 0, 2, 128); x.fillRect(0, p, 128, 2); } };
  const FLOOR = {
    rec: tex(planks('#d9ab78', '#b98b5b', ['#dcb080', '#d4a572', '#e0b688', '#cf9f6b']), 1),
    copa: tex(planks('#c98b55', '#a36c3d', ['#cc8f59', '#c4854e', '#d19560', '#bd7f49']), 1),
    mkt: tex(carpet('#b9a3d6', '#c3aede', '#ae97cc'), 1),
    meet: tex(carpet('#4d6da3', '#567ab0', '#456296'), 1),
    dev: tex(tiles('#4a5263', '#3a4150', '#505969'), 1),
    cor: tex(tiles('#e3dccd', '#c9c0ae', '#dcd4c3'), 1)
  };
  const base = new THREE.Mesh(new THREE.BoxGeometry(O.COLS * U + .6, .3, (O.ROWS - 2) * U + .6), new THREE.MeshStandardMaterial({color: '#221c33', roughness: .9}));
  base.position.set(CX, -.16, (O.ROWS + 2) * U / 2); base.receiveShadow = true; scene.add(base);
  for (const f of O.FLOORS) {
    const w = (f.x2 - f.x1 + 1) * U, d = (f.y2 - f.y1 + 1) * U, t = FLOOR[f.f].clone(); t.needsUpdate = true; t.repeat.set(w / 2, d / 2);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({map: t, roughness: .85}));
    m.rotation.x = -Math.PI / 2; m.position.set(f.x1 * U + w / 2, 0, f.y1 * U + d / 2); m.receiveShadow = true; scene.add(m);
  }

  /* ---------- paredes ---------- */
  const cells = [];
  for (let y = 2; y < O.ROWS; y++) for (let x = 0; x < O.COLS; x++) if (!O.grid[y][x]) cells.push([x, y, y === 2 ? 1.55 : .5]);
  const wallMat = new THREE.MeshStandardMaterial({color: '#efe9f5', roughness: .95});
  const capMat = new THREE.MeshStandardMaterial({color: '#cdc3dd', roughness: .8});
  const walls = new THREE.InstancedMesh(new THREE.BoxGeometry(U, 1, U), wallMat, cells.length);
  const caps = new THREE.InstancedMesh(new THREE.BoxGeometry(U, .06, U), capMat, cells.length);
  const M = new THREE.Matrix4();
  cells.forEach(([x, y, h], i) => {
    M.makeScale(1, h, 1).setPosition(x * U + U / 2, h / 2, y * U + U / 2); walls.setMatrixAt(i, M);
    M.makeScale(1, 1, 1).setPosition(x * U + U / 2, h + .03, y * U + U / 2); caps.setMatrixAt(i, M);
  });
  walls.castShadow = walls.receiveShadow = caps.receiveShadow = true; scene.add(walls, caps);
  // janelas na parede do fundo
  const glass = new THREE.MeshStandardMaterial({color: '#bfe1ff', emissive: '#9fd0ff', emissiveIntensity: .9, roughness: .2});
  const frameMat = new THREE.MeshStandardMaterial({color: '#8a6a4c', roughness: .7});
  for (const r of O.ROOMS) for (const cx of r.desks) {
    const fr = new THREE.Mesh(new THREE.BoxGeometry(1.25, .62, .05), frameMat); fr.position.set(cx * U, 1.02, 3 * U + .01); scene.add(fr);
    for (const dx of [-.3, .3]) { const gl = new THREE.Mesh(new THREE.PlaneGeometry(.54, .5), glass); gl.position.set(cx * U + dx, 1.02, 3 * U + .04); scene.add(gl); }
  }
  // porta de entrada
  const door = new THREE.Mesh(new THREE.BoxGeometry(.08, 1.2, 1.3), new THREE.MeshStandardMaterial({color: '#6b4a33', roughness: .7}));
  door.position.set(-.02, .6, 13.5 * U - .1); door.rotation.y = -.5; door.castShadow = true; scene.add(door);

  /* ---------- móveis ---------- */
  const loader = new GLTFLoader();
  const cache = new Map();
  const load = url => { if (!cache.has(url)) cache.set(url, loader.loadAsync(url)); return cache.get(url); };
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({color, roughness: .7, ...o});
  const screens = new Map();
  function codeTexture(color) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 80; const x = c.getContext('2d');
    x.fillStyle = '#0f1a2a'; x.fillRect(0, 0, 128, 80);
    for (let r = 0; r < 9; r++) { x.fillStyle = r % 3 ? '#8fb3d9' : color; x.fillRect(8 + (r % 4) * 6, 8 + r * 8, 20 + rnd() * 70, 3); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const custom = {
    rack() { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(.5, 1.25, .7), std('#252a36', {metalness: .4, roughness: .5})); b.position.y = .625; g.add(b);
      for (let i = 0; i < 7; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(.02, .1, .6), std('#3b4354')); s.position.set(-.255, .2 + i * .15, 0); g.add(s);
        for (let k = 0; k < 3; k++) { const led = new THREE.Mesh(new THREE.BoxGeometry(.02, .025, .025), new THREE.MeshStandardMaterial({color: '#0a2', emissive: k === 2 ? '#3b82f6' : '#22c55e', emissiveIntensity: 2.5})); led.position.set(-.27, .2 + i * .15, -.22 + k * .07); led.userData.led = rnd() * 6; g.add(led); } }
      return g; },
    whiteboard() { const g = new THREE.Group(); const f = new THREE.Mesh(new THREE.BoxGeometry(.05, .75, 1.5), std('#9aa1ad')); f.position.set(0, .95, 0); g.add(f);
      const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#f8f9fc'; x.fillRect(0, 0, 256, 128);
      x.lineWidth = 3; [['#2f6fb0', 20, 20, 70, 30], ['#3a9a5b', 130, 20, 80, 30], ['#c2635a', 70, 80, 90, 30]].forEach(([s, a, b, w, h]) => { x.strokeStyle = s; x.strokeRect(a, b, w, h); });
      x.strokeStyle = '#555'; x.beginPath(); x.moveTo(90, 35); x.lineTo(130, 35); x.moveTo(55, 50); x.lineTo(100, 80); x.moveTo(170, 50); x.lineTo(130, 80); x.stroke();
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      const p = new THREE.Mesh(new THREE.PlaneGeometry(1.4, .65), new THREE.MeshStandardMaterial({map: t, roughness: .4})); p.rotation.y = Math.PI / 2; p.position.set(.03, .95, 0); g.add(p); return g; }
  };
  const leds = [];
  async function furniture() {
    await Promise.all(O.FURN.map(async f => {
      let obj;
      if (custom[f.m]) { obj = custom[f.m](); obj.traverse(n => { if (n.userData.led != null) leds.push(n); if (n.isMesh) n.castShadow = n.receiveShadow = true; }); }
      else {
        const g = await load(`/models/f/${f.m}.glb`); const inner = g.scene.clone(true);
        const box = new THREE.Box3().setFromObject(inner), c = box.getCenter(new THREE.Vector3());
        inner.position.set(-c.x, -box.min.y, -c.z);
        inner.traverse(n => { if (!n.isMesh) return; n.castShadow = !/^rug/.test(f.m); n.receiveShadow = true;
          if (f.c && /carpet/i.test(n.material.name) ) { n.material = n.material.clone(); n.material.color.set(f.c); if (/Darker/.test(n.material.name)) n.material.color.multiplyScalar(.75); }
          if (/lamp/i.test(n.material.name)) { n.material = n.material.clone(); n.material.emissive = new THREE.Color('#ffd98a'); n.material.emissiveIntensity = 1.2; } });
        obj = new THREE.Group(); obj.add(inner);
        const s = f.s == null ? FS : Array.isArray(f.s) ? f.s : f.s * FS; Array.isArray(s) ? obj.scale.set(...s) : obj.scale.setScalar(s);
      }
      obj.position.set(f.x * U, f.e || 0, f.y * U); obj.rotation.y = (f.r || 0) * Math.PI / 180; scene.add(obj);
    }));
    // telas acesas (uma por mesa)
    O.ROOMS.forEach((r, ri) => r.desks.forEach((cx, i) => {
      const col = ['#ffb38e', '#e5a5ee', '#82d9db'][ri];
      const p = new THREE.Mesh(new THREE.PlaneGeometry(.43, .24), new THREE.MeshBasicMaterial({map: codeTexture(col), toneMapped: false}));
      p.position.set(cx * U, O.DESK_H + .225, 3.5 * U + .045); p.visible = false; scene.add(p); screens.set(ri + ':' + i, p);
    }));
  }

  /* ---------- personagens ---------- */
  const SIT_HIP = +(/[?&]hip=([\d.]+)/.exec(location.search) || [0, .12])[1];
  const DIR = {d: 0, u: Math.PI, r: Math.PI / 2, l: -Math.PI / 2};
  const actors = new Map(), portraits = new Map();
  const ring = new THREE.Mesh(new THREE.RingGeometry(.3, .38, 40), new THREE.MeshBasicMaterial({color: '#c9a6f2', transparent: true, opacity: .9, side: THREE.DoubleSide}));
  ring.rotation.x = -Math.PI / 2; ring.visible = false; scene.add(ring);
  const isReal = g => { let r = false; g.scene.traverse(n => { if (n.userData && n.userData.real) r = true; }); return r; };   // modelos realistas (Hunyuan3D + Mixamo)
  function makePortrait(model, gltf) {
    try {
      const r = new THREE.WebGLRenderer({antialias: true, alpha: true, preserveDrawingBuffer: true}); r.setSize(192, 240, false);
      const s = new THREE.Scene(); s.add(new THREE.HemisphereLight(0xffffff, 0x9988bb, 1.6)); const d = new THREE.DirectionalLight(0xffffff, 2); d.position.set(1, 2, 3); s.add(d);
      const o = cloneSkinned(gltf.scene); s.add(o);
      const mx = new THREE.AnimationMixer(o), clip = gltf.animations.find(a => a.name === 'idle'); if (clip) { mx.clipAction(clip).play(); mx.update(.4); }
      const cam = new THREE.PerspectiveCamera(26, 192 / 240, .1, 10); if (isReal(gltf)) { cam.position.set(.14, .8, .68); cam.lookAt(0, .78, 0); } else { cam.position.set(.5, .75, 2.1); cam.lookAt(0, .44, 0); }
      r.render(s, cam); portraits.set(model, r.domElement.toDataURL('image/png')); r.dispose(); r.forceContextLoss();
    } catch { /* sem retrato: a lista usa a inicial */ }
  }
  function spawn(c) {
    const a = {obj: new THREE.Group(), cur: '', ready: false}; actors.set(c.id, a);
    a.obj.position.set(c.x, 0, c.z); a.obj.rotation.y = DIR[c.dir] ?? 0; scene.add(a.obj);
    load(`/models/c/${c.model || 'character-male-a'}.glb`).then(g => {
      const o = cloneSkinned(g.scene); o.scale.setScalar(CS); o.traverse(n => { if (n.isMesh) { n.castShadow = true; n.frustumCulled = false; } });
      a.obj.add(o); a.inner = o; if (isReal(g)) a.sitHip = .28; a.mixer = new THREE.AnimationMixer(o); a.acts = {};
      for (const n of ['idle', 'walk', 'sit', 'interact-right']) { const clip = g.animations.find(x => x.name === n); if (clip) a.acts[n] = a.mixer.clipAction(clip); }
      if (isReal(g) && a.acts.walk) a.acts.walk.timeScale = 1.37;   // passo real cobre ~0,91 por segundo; o escritório desloca a 1,25
      a.ready = true;
      if (!portraits.has(c.model)) { makePortrait(c.model, g); dispatchEvent(new Event('v3d-ready')); }
    }).catch(() => {});
    return a;
  }
  function play(a, name) {
    if (!a.ready || a.cur === name || !a.acts[name]) return;
    const next = a.acts[name], prev = a.acts[a.cur];
    next.reset().fadeIn(.25).play(); if (prev) prev.fadeOut(.25); a.cur = name;
  }

  /* ---------- quadro ---------- */
  const clock = new THREE.Clock(); let night = null, W = 300, H = 300, st = null;
  function setNight(n) {
    night = n; hemi.intensity = n ? .32 : 1.25; hemi.color.set(n ? '#8fa0d8' : '#ffffff'); sun.intensity = n ? .35 : 2.6; sun.color.set(n ? '#9db4ff' : '#fff0dc');
    lamps.forEach(l => l.intensity = n ? 9 : 0); glass.color.set(n ? '#1d2a55' : '#bfe1ff'); glass.emissive.set(n ? '#16224a' : '#9fd0ff'); glass.emissiveIntensity = n ? .5 : .9;
    scene.background.copy(n ? BG_NIGHT : BG_DAY); renderer.toneMappingExposure = n ? 1.15 : 1.05;
  }
  V.update = s => {
    st = s; const dt = Math.min(.05, clock.getDelta()), t = clock.elapsedTime;
    if (s.night !== night) setNight(s.night);
    const seen = new Set();
    for (const c of s.chars) {
      seen.add(c.id); const a = actors.get(c.id) || spawn(c);
      const seated = c.sit && !c.moving;
      a.obj.position.x += (c.x - a.obj.position.x) * Math.min(1, dt * 18); a.obj.position.z += (c.z - a.obj.position.z) * Math.min(1, dt * 18);
      const ty = seated ? Math.max(0, c.sh - (a.sitHip ?? SIT_HIP)) : 0; a.obj.position.y += (ty - a.obj.position.y) * Math.min(1, dt * 10);
      let d = (DIR[c.dir] ?? 0) - a.obj.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); a.obj.rotation.y += d * Math.min(1, dt * 12);
      play(a, c.moving ? 'walk' : seated ? 'sit' : 'idle'); if (a.mixer) a.mixer.update(dt);
    }
    for (const [id, a] of actors) if (!seen.has(id)) { scene.remove(a.obj); actors.delete(id); }
    for (const [k, p] of screens) p.visible = s.screens.includes(k);
    const sel = s.selected && actors.get(s.selected); ring.visible = !!sel; if (sel) { ring.position.set(sel.obj.position.x, .02, sel.obj.position.z); ring.scale.setScalar(1 + Math.sin(t * 4) * .06); }
    leds.forEach(l => l.visible = Math.sin(t * 3 + l.userData.led * 7) > -.3);
    controls.update(); renderer.render(scene, camera);
  };
  V.resize = (w, h, dpr) => { W = w; H = h; renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = w / h < 1.25 ? 46 : 32; camera.updateProjectionMatrix();
    if (dbg) { const [a, b, c, d, e] = dbg[1].split(',').map(Number); camera.position.set(a, b, c); controls.target.set(d, 0, e); touched = true; }
    if (!touched) frameAll(w / h); controls.update(); };
  const v3 = new THREE.Vector3();
  V.project = (x, y, z) => { v3.set(x, y, z).project(camera); return {x: (v3.x + 1) / 2 * W, y: (1 - v3.y) / 2 * H, behind: v3.z > 1}; };
  const asked = new Set();
  V.portrait = m => { if (m && !portraits.has(m) && !asked.has(m)) { asked.add(m); load(`/models/c/${m}.glb`).then(g => { if (!portraits.has(m)) { makePortrait(m, g); dispatchEvent(new Event('v3d-ready')); } }).catch(() => {}); } return portraits.get(m) || null; };

  furniture().then(() => { V.ready = true; dispatchEvent(new Event('v3d-ready')); }).catch(e => { console.error(e); V.error = true; });
} catch (e) { console.error(e); V.error = true; }
