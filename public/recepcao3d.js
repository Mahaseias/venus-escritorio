// Recepção da Venus em 3D — inspirada na fachada: concreto, vidro, madeira ripada, luz quente e LED roxo.
// Modelos: Kenney (kenney.nl), licença CC0. Motor: three.js (MIT).
import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {clone as cloneSkinned} from './vendor/SkeletonUtils.js';

const R = window.R3D = {ready: false, error: false, start() {}, stop() {}, talk() {}, setModel() {}};
try {
  const canvas = document.getElementById('rgl'), tag = document.getElementById('rtag');
  const renderer = new THREE.WebGLRenderer({canvas, antialias: true, powerPreference: 'high-performance'});
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#0c0a13'); scene.fog = new THREE.Fog('#0c0a13', 11, 22);
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 60);
  const HOME = new THREE.Vector3(.7, 1.5, 7.3), TARGET = new THREE.Vector3(.15, .95, -1);
  camera.position.copy(HOME);
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(TARGET); controls.enableDamping = true; controls.dampingFactor = .08; controls.enablePan = false;
  controls.minDistance = 4; controls.maxDistance = 9.5; controls.minAzimuthAngle = -.6; controls.maxAzimuthAngle = .6; controls.minPolarAngle = 1.05; controls.maxPolarAngle = 1.52;
  controls.rotateSpeed = .5; controls.zoomSpeed = .7;
  let touched = 0; controls.addEventListener('start', () => { touched = performance.now(); });

  const std = (color, o = {}) => new THREE.MeshStandardMaterial({color, roughness: .75, ...o});
  const box = (w, h, d, mat, x, y, z, shadow = true) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; scene.add(m); return m; };
  const glow = color => new THREE.MeshBasicMaterial({color, toneMapped: false});
  function canvasTex(w, h, draw, repeat) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); } return t;
  }
  const rnd = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

  /* ---------- piso, paredes ---------- */
  const W = 8, D = 6.4, H = 3.1, BZ = -3;
  const floorT = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#b9b2a6'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(${rnd() > .5 ? '255,250,240' : '70,62,55'},${rnd() * .07})`; x.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 2); }
    x.strokeStyle = 'rgba(60,52,46,.55)'; x.lineWidth = 2; x.strokeRect(0, 0, w, h); }, [W / 1.6, D / 1.6]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W + 3, D + 3), new THREE.MeshStandardMaterial({map: floorT, roughness: .28, metalness: .08}));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, .2); floor.receiveShadow = true; scene.add(floor);
  const concT = canvasTex(512, 256, (x, w, h) => { x.fillStyle = '#8a857f'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) { x.fillStyle = `rgba(${rnd() > .5 ? '255,255,255' : '30,28,26'},${rnd() * .06})`; x.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 4, 1 + rnd() * 3); }
    x.strokeStyle = 'rgba(40,36,34,.5)'; x.lineWidth = 2; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * w / 4, 0); x.lineTo(i * w / 4, h); x.stroke(); } x.beginPath(); x.moveTo(0, h / 2); x.lineTo(w, h / 2); x.stroke();
    x.fillStyle = 'rgba(30,28,26,.6)'; for (let i = 0; i < 4; i++) for (const yy of [h * .12, h * .62]) for (const dx of [.12, .88]) { x.beginPath(); x.arc((i + dx) * w / 4, yy, 3, 0, 7); x.fill(); } });
  const paredeM = new THREE.MeshStandardMaterial({map: concT, roughness: .9}); box(5.3, H, .2, paredeM, -1.35, H / 2, BZ - .1);
  // letreiro iluminado
  const signT = canvasTex(1024, 320, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    const spaced = (txt, y, size, gap, weight) => { x.font = `${weight} ${size}px "Helvetica Neue",Helvetica,Arial,sans-serif`; const ws = [...txt].map(ch => x.measureText(ch).width); let px = (w - ws.reduce((a, b) => a + b, 0) - gap * (txt.length - 1)) / 2;
      [...txt].forEach((ch, i) => { x.fillText(ch, px + ws[i] / 2, y); px += ws[i] + gap; }); };
    spaced('VENUS', 120, 170, 26, 300); spaced('TECNOLOGIA', 262, 54, 30, 400); });
  R.setEmpresa = nome => { // letreiro de outra empresa: primeira palavra grande, o resto embaixo
    const p = String(nome || '').trim().toUpperCase().split(/\s+/), a = p.shift() || '', b = p.join(' '), x = signT.image.getContext('2d'), w = 1024, h = 320; x.clearRect(0, 0, w, h); x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    const fit = (t, y, size, weight) => { do { x.font = `${weight} ${size}px "Helvetica Neue",Helvetica,Arial,sans-serif`; size -= 6; } while (x.measureText(t).width > w - 60 && size > 20); x.fillText(t, w / 2, y); };
    fit(a, b ? 120 : 160, 170, 300); if (b) fit(b, 262, 54, 400); signT.needsUpdate = true; halo.visible = true; };
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 1.05), new THREE.MeshBasicMaterial({map: signT, color: '#ffb866', transparent: true, opacity: .35, toneMapped: false}));
  halo.position.set(-1.55, 2.08, BZ + .012); halo.scale.set(1.03, 1.08, 1); scene.add(halo);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 1.05), new THREE.MeshBasicMaterial({map: signT, color: '#fff3df', transparent: true, toneMapped: false}));
  sign.position.set(-1.55, 2.1, BZ + .03); scene.add(sign);
  // painel de madeira ripada com LED roxo
  const wood = std('#9a633c', {roughness: .6}), woodD = std('#5e3920', {roughness: .8});
  box(2.7, H, .16, woodD, 2.65, H / 2, BZ - .08);
  for (let i = 0; i < 20; i++) box(.075, H - .5, .07, wood, 1.38 + i * .134, (H - .5) / 2, BZ + .04, false);
  const ledM = glow('#a56bff'); box(2.7, .05, .09, ledM, 2.65, H - .42, BZ + .06, false);
  const led = new THREE.PointLight('#9b5cff', 7, 5, 1.6); led.position.set(2.65, H - .7, BZ + .7); scene.add(led);
  // lateral esquerda: pele de vidro com montantes escuros e o entardecer lá fora
  const dark = std('#17151c', {roughness: .5, metalness: .4});
  const skyT = canvasTex(64, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2a2f6b'); g.addColorStop(.45, '#7a4f9a'); g.addColorStop(.75, '#e58aa0'); g.addColorStop(1, '#ffc48a'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(D + 4, H + 2), new THREE.MeshBasicMaterial({map: skyT, toneMapped: false})); sky.rotation.y = Math.PI / 2; sky.position.set(-W / 2 - 2.2, H / 2, .2); scene.add(sky);
  const glassM = new THREE.MeshStandardMaterial({color: '#9fc4e8', transparent: true, opacity: .16, roughness: .05, metalness: .6, side: THREE.DoubleSide});
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(D, H), glassM); gl.rotation.y = Math.PI / 2; gl.position.set(-W / 2, H / 2, BZ + D / 2); scene.add(gl);
  for (let i = 0; i <= 5; i++) box(.07, H, .09, dark, -W / 2, H / 2, BZ + i * D / 5);
  for (const y of [.04, 1.5, H - .04]) box(.07, .07, D, dark, -W / 2, y, BZ + D / 2);
  // lateral direita: brises verticais escuros
  for (let i = 0; i < 13; i++) box(.5, H, .07, dark, W / 2 + .1, H / 2, BZ + .2 + i * .5).rotation.y = .5;
  box(.1, H, D, std('#221f2a'), W / 2 + .4, H / 2, BZ + D / 2);
  // forro com linhas de luz
  box(W + .8, .1, D + .4, std('#15131b'), .2, H + .05, BZ + D / 2 - .1, false);
  for (const [x, z, len] of [[-2.4, -1.6, 2.6], [.6, -.6, 3.4], [-1.2, .9, 2.2], [2.6, .6, 1.8]]) box(len, .03, .05, glow('#ffe2b0'), x, H - .02, z, false);

  /* ---------- balcão ---------- */
  const CX = .2, CZ = -1.45;
  box(2.5, .5, .52, woodD, CX, .25, CZ);
  for (let i = 0; i < 19; i++) box(.07, .44, .04, wood, CX - 1.17 + i * .13, .25, CZ + .27, false);
  const tampoM = std('#ece7df', {roughness: .35}); box(2.66, .05, .66, tampoM, CX, .525, CZ);
  box(2.5, .025, .03, glow('#ffc98a'), CX, .488, CZ + .3, false);
  const placaM = glow('#b98cf5'); const plaque = new THREE.Mesh(new THREE.PlaneGeometry(.2, .2), placaM); plaque.rotation.z = Math.PI / 4; plaque.position.set(CX, .26, CZ + .296); scene.add(plaque);
  // anéis de luz suspensos
  for (const [x, y, z, r] of [[CX + .75, 2.25, CZ + .25, .58], [CX + 1.7, 2.55, CZ + .1, .36]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, .022, 10, 64), glow('#ffe0ad')); ring.rotation.x = Math.PI / 2; ring.position.set(x, y, z); scene.add(ring);
    for (const a of [0, 2.1, 4.2]) box(.006, H - y, .006, dark, x + Math.cos(a) * r, y + (H - y) / 2, z + Math.sin(a) * r, false);
  }

  /* ---------- luz ---------- */
  scene.add(new THREE.HemisphereLight('#ffe9d2', '#3a2d4d', .75));
  const key = new THREE.DirectionalLight('#ffe1bd', 1.9); key.position.set(-2.5, 5, 4.5); key.target.position.set(0, 0, -1); scene.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.0004; key.shadow.normalBias = .03;
  Object.assign(key.shadow.camera, {left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 20}); key.shadow.camera.updateProjectionMatrix();
  const warm = (x, y, z, i, d = 6) => { const l = new THREE.PointLight('#ffc58a', i, d, 1.6); l.position.set(x, y, z); scene.add(l); return l; };
  warm(CX + .6, 2.0, CZ + .3, 9); warm(-1.5, 1.2, BZ + .7, 5, 4); warm(-2.8, 1.6, 1.2, 6);
  const dusk = new THREE.PointLight('#c58ad8', 5, 7, 1.5); dusk.position.set(-W / 2 + .4, 1.6, 0); scene.add(dusk);

  /* ---------- estilos de cenário ---------- */
  const lisoT = canvasTex(8, 8, x => { x.fillStyle = '#fff'; x.fillRect(0, 0, 8, 8); });
  const ESTILOS = {
    moderno: {parede: '#ffffff', liso: false, madeira: '#9a633c', madeiraEsc: '#5e3920', led: '#a56bff', luz: '#9b5cff', piso: '#ffffff', tampo: '#ece7df', letra: '#fff3df', halo: '#ffb866', fundo: '#0c0a13'},
    minimalista: {parede: '#f1eee9', liso: true, madeira: '#d9c3a1', madeiraEsc: '#bfa888', led: '#fff4e0', luz: '#ffe9cc', piso: '#f4f1ec', tampo: '#ffffff', letra: '#3a3a3a', halo: '#ffffff', fundo: '#15141a'},
    classico: {parede: '#33473d', liso: true, madeira: '#6b4226', madeiraEsc: '#3b2414', led: '#ffcf7a', luz: '#ffb85c', piso: '#c9a57c', tampo: '#e8dcc6', letra: '#f1d9a0', halo: '#c79a45', fundo: '#0f0c0a'}
  };
  R.setEstilo = id => { const e = ESTILOS[id] || ESTILOS.moderno;
    paredeM.map = e.liso ? lisoT : concT; paredeM.color.set(e.parede); paredeM.needsUpdate = true; wood.color.set(e.madeira); woodD.color.set(e.madeiraEsc); ledM.color.set(e.led); led.color.set(e.luz); placaM.color.set(e.led);
    floor.material.color.set(e.piso); tampoM.color.set(e.tampo); sign.material.color.set(e.letra); halo.material.color.set(e.halo); halo.material.opacity = id === 'minimalista' ? 0 : .35; scene.background.set(e.fundo); scene.fog.color.set(e.fundo); };
  R.setLogo = url => { if (!url) return; const im = new Image(); im.onload = () => { const x = signT.image.getContext('2d'), w = 1024, h = 320, k = Math.min(w * .9 / im.width, h * .92 / im.height);
    x.clearRect(0, 0, w, h); x.drawImage(im, (w - im.width * k) / 2, (h - im.height * k) / 2, im.width * k, im.height * k); signT.needsUpdate = true; sign.material.color.set('#ffffff'); halo.visible = false; }; im.src = url; };

  /* ---------- móveis e plantas ---------- */
  const loader = new GLTFLoader(), cache = new Map();
  const load = url => { if (!cache.has(url)) cache.set(url, loader.loadAsync(url)); return cache.get(url); };
  async function put(m, x, z, {r = 0, s = 1.3, e = 0, c} = {}) {
    const g = await load(`/models/f/${m}.glb`), inner = g.scene.clone(true), b = new THREE.Box3().setFromObject(inner), ctr = b.getCenter(new THREE.Vector3());
    inner.position.set(-ctr.x, -b.min.y, -ctr.z);
    inner.traverse(n => { if (!n.isMesh) return; n.castShadow = !/^rug/.test(m); n.receiveShadow = true;
      if (c && /carpet/i.test(n.material.name)) { n.material = n.material.clone(); n.material.color.set(c); if (/Darker/.test(n.material.name)) n.material.color.multiplyScalar(.75); }
      if (/lamp/i.test(n.material.name)) { n.material = n.material.clone(); n.material.emissive = new THREE.Color('#ffd98a'); n.material.emissiveIntensity = 1.4; } });
    const o = new THREE.Group(); o.add(inner); o.scale.setScalar(s); o.position.set(x, e, z); o.rotation.y = r * Math.PI / 180; scene.add(o);
  }
  const furn = Promise.all([
    put('computerScreen', CX + .55, CZ - .05, {e: .55, r: 200}), put('computerKeyboard', CX + .5, CZ - .22, {e: .55, r: 180}), put('plantSmall1', CX - .95, CZ + .02, {e: .55, s: 1.7}), put('books', CX - .35, CZ + .05, {e: .55, s: 1, r: 20}),
    put('rugRound', -2.35, .9, {s: 2.5, c: '#6f4fa6'}), put('loungeSofa', -3.3, .9, {r: 90, s: 1.35, c: '#8d6bc2'}), put('loungeDesignChair', -1.9, 2.0, {r: 200, c: '#d8cfc2'}), put('tableCoffee', -2.3, .85, {s: 1.1, r: 90}),
    put('plantSmall2', -2.3, .85, {e: .26, s: 1.2}), put('lampRoundFloor', -3.5, -.5, {s: 1.5}),
    put('pottedPlant', -3.45, -2.5, {s: 2.9}), put('pottedPlant', 3.45, -2.45, {s: 2.6, r: 90}), put('pottedPlant', 3.3, .9, {s: 2.1, r: 40}), put('pottedPlant', -3.55, 2.6, {s: 2.2, r: 200}), put('pottedPlant', 1.05, -2.6, {s: 1.9, r: 130}),
    put('benchCushion', 2.9, -.6, {r: -90, s: 1.4, c: '#8d6bc2'})
  ]);

  /* ---------- a secretária ---------- */
  let tagY = 1.2, actor = null, mixer = null, acts = {}, cur = '', busy = false, modelName = null;
  function play(n) { if (!acts[n] || cur === n) return; acts[n].reset().fadeIn(.3).play(); if (acts[cur]) acts[cur].fadeOut(.3); cur = n; }
  R.setModel = async m => {
    if (!m || m === modelName) return; modelName = m;
    try {
      const g = await load(`/models/c/${m}.glb`); if (actor) scene.remove(actor);
      let real = false; g.scene.traverse(n => { if (n.userData && n.userData.real) real = true; });
      actor = cloneSkinned(g.scene); actor.scale.setScalar(1.22); actor.position.set(CX - .25, real ? 0 : .2, CZ - .5); actor.rotation.y = .12; tagY = real ? 1.22 : 1.2;
      actor.traverse(n => { if (n.isMesh) { n.castShadow = true; n.frustumCulled = false; } }); scene.add(actor);
      mixer = new THREE.AnimationMixer(actor); acts = {}; cur = '';
      for (const n of ['idle', 'interact-right', 'emote-yes']) { const c = g.animations.find(a => a.name === n); if (c) acts[n] = mixer.clipAction(c); }
      play(busy ? 'interact-right' : 'idle');
    } catch (e) { console.error(e); }
  };
  R.talk = b => { busy = b; play(b ? 'interact-right' : 'idle'); };

  /* ---------- quadro ---------- */
  const clock = new THREE.Clock(), v3 = new THREE.Vector3(); let running = false, raf = 0, Wd = 0, Hd = 0;
  function size() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h || (w === Wd && h === Hd)) return; Wd = w; Hd = h;
    renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); renderer.setSize(w, h, false); camera.aspect = w / h;
    const narrow = w / h < 1.15; camera.fov = narrow ? 52 : 34;
    const op = window.R3D_OPCOES || {}, shift = !narrow && w >= 980 ? (op.deslocar ? Math.round(w * op.deslocar) : 215) : 0;                 // abre espaço para o painel de conversa à direita
    if (shift) camera.setViewOffset(w, h, shift, 0, w, h); else if (w < 860) camera.setViewOffset(w, h, 0, Math.round(h * (op.subir || .2)), w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  function loop() {
    if (!running) return; raf = requestAnimationFrame(loop); size();
    const dt = Math.min(.05, clock.getDelta()), t = clock.elapsedTime;
    if (mixer) mixer.update(dt);
    if (performance.now() - touched > 6000) { const a = Math.sin(t * .13) * .16; v3.set(HOME.x - TARGET.x, 0, HOME.z - TARGET.z); const r = v3.length(), base = Math.atan2(v3.x, v3.z);
      const want = new THREE.Vector3(TARGET.x + Math.sin(base + a) * r, HOME.y, TARGET.z + Math.cos(base + a) * r); camera.position.lerp(want, .015); }
    led.intensity = 7 + Math.sin(t * 1.3) * .8;
    controls.update(); renderer.render(scene, camera);
    if (tag && actor) { v3.set(actor.position.x, tagY, actor.position.z).project(camera); tag.style.transform = `translate(-50%,-100%) translate(${((v3.x + 1) / 2 * Wd).toFixed(1)}px,${((1 - v3.y) / 2 * Hd).toFixed(1)}px)`; tag.hidden = v3.z > 1; }
  }
  R.start = () => { if (running) return; running = true; clock.getDelta(); Wd = 0; loop(); };
  R.stop = () => { running = false; cancelAnimationFrame(raf); };
  furn.then(() => { R.ready = true; dispatchEvent(new Event('r3d-ready')); }).catch(e => { console.error(e); R.error = true; });
} catch (e) { console.error(e); R.error = true; dispatchEvent(new Event('r3d-ready')); }
