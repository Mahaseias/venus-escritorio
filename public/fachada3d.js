// Fachadas em 3D — quatro prédios originais, com o nome (ou o logo) da empresa no letreiro.
// Motor: three.js (MIT). Plantas: Kenney (CC0).
import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';

const F = window.F3D = {ready: false, error: false, start() {}, stop() {}, setEstilo() {}, setEmpresa() {}, setLogo() {}, enquadrar() {}};
const canvas = document.getElementById('fgl');
if (canvas) try {
  let montado = false, running = false, raf = 0, estilo = 'moderno', quadro = 'centro', nome = 'SUA EMPRESA', logo = '';
  let renderer, scene, camera, signT, grupos = {}, letreiros = [], Wd = 0, Hd = 0;
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({color, roughness: .8, ...o});
  const glow = color => new THREE.MeshBasicMaterial({color, toneMapped: false});
  const rnd = (() => { let s = 23; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  function tex(w, h, draw, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); } return t; }
  const B = (g, w, h, d, mat, x, y, z, sh = true) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = sh; m.receiveShadow = true; g.add(m); return m; };

  function pintaLetreiro() {
    const x = signT.image.getContext('2d'), w = 1024, h = 256; x.clearRect(0, 0, w, h);
    const fim = () => { signT.needsUpdate = true; };
    if (logo) { const im = new Image(); im.onload = () => { const k = Math.min(w * .92 / im.width, h * .92 / im.height); x.clearRect(0, 0, w, h); x.drawImage(im, (w - im.width * k) / 2, (h - im.height * k) / 2, im.width * k, im.height * k); letreiros.forEach(l => { l.frente.color.set('#ffffff'); l.sombra.visible = false; }); fim(); }; im.src = logo; return; }
    letreiros.forEach(l => { l.frente.color.set(l.cor); l.sombra.visible = true; });
    const p = nome.trim().toUpperCase().split(/\s+/), a = p.length > 2 ? p.slice(0, Math.ceil(p.length / 2)).join(' ') : p[0] || '', b = p.length > 2 ? p.slice(Math.ceil(p.length / 2)).join(' ') : p.slice(1).join(' ');
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    const fit = (t, y, size, weight, gap) => { do { x.font = `${weight} ${size}px "Helvetica Neue",Helvetica,Arial,sans-serif`; x.letterSpacing = gap + 'px'; size -= 5; } while (x.measureText(t).width > w - 50 && size > 18); x.fillText(t, w / 2, y); };
    if (b) { fit(a, 96, 128, 500, 10); fit(b, 200, 50, 400, 16); } else fit(a, 128, 150, 500, 12); fim();
  }
  function letreiro(g, largura, x, y, z, cor, corSombra, ry = 0) {
    const frente = new THREE.MeshBasicMaterial({map: signT, color: cor, transparent: true, toneMapped: false}), sombra = new THREE.MeshBasicMaterial({map: signT, color: corSombra, transparent: true, opacity: .55, toneMapped: false});
    const geo = new THREE.PlaneGeometry(largura, largura / 4), s = new THREE.Mesh(geo, sombra), f = new THREE.Mesh(geo, frente);
    s.position.set(x + .02, y - .025, z); f.position.set(x, y, z + .015); s.rotation.y = f.rotation.y = ry; s.scale.set(1.02, 1.06, 1); g.add(s, f); letreiros.push({frente, sombra: s, cor});
  }

  function montar() {
    montado = true;
    renderer = new THREE.WebGLRenderer({canvas, antialias: true, powerPreference: 'high-performance'});
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
    scene = new THREE.Scene();
    scene.background = tex(16, 512, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0d1433'); g.addColorStop(.5, '#2b2f6e'); g.addColorStop(.78, '#7a4f8f'); g.addColorStop(1, '#f0a37a'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
    scene.fog = new THREE.Fog('#2a2748', 22, 55);
    camera = new THREE.PerspectiveCamera(30, 1, .1, 120);
    signT = tex(1024, 256, () => {});
    scene.add(new THREE.HemisphereLight('#aab4ff', '#2a1d2c', .85));
    const lua = new THREE.DirectionalLight('#c9d2ff', 1.1); lua.position.set(-7, 10, 9); lua.castShadow = true; lua.shadow.mapSize.set(2048, 2048); lua.shadow.bias = -.0005; lua.shadow.normalBias = .04;
    Object.assign(lua.shadow.camera, {left: -11, right: 11, top: 10, bottom: -4, near: 1, far: 40}); lua.shadow.camera.updateProjectionMatrix(); scene.add(lua);
    // chão e calçada
    const piso = tex(256, 256, (x, w, h) => { x.fillStyle = '#3d3b42'; x.fillRect(0, 0, w, h); for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { x.fillStyle = `rgba(${rnd() > .5 ? '255,255,255' : '0,0,0'},${rnd() * .08})`; x.fillRect(c * 32 + (r % 2) * 16 + 1, r * 32 + 1, 30, 30); } }, [14, 14]);
    const chao = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), new THREE.MeshStandardMaterial({map: piso, roughness: .35, metalness: .25})); chao.rotation.x = -Math.PI / 2; chao.receiveShadow = true; scene.add(chao);
    B(scene, 16, .12, 3.2, std('#8a8780', {roughness: .7}), 0, .06, 2.2, false);
    const led = glow('#ffd9a0'), ledFrio = glow('#fff1d8');
    const vidro = (g, w, h, x, y, z, aceso = .55, cols = 0, rows = 0, quadro = '#141418') => { B(g, w, h, .06, new THREE.MeshStandardMaterial({color: '#1a2030', emissive: '#f0a050', emissiveIntensity: aceso * .62, roughness: .1, metalness: .6}), x, y, z, false);
      const q = std(quadro, {roughness: .5}); for (let i = 0; i <= cols + 1; i++) B(g, .05, h, .1, q, x - w / 2 + i * w / (cols + 1), y, z, false); for (let j = 0; j <= rows + 1; j++) B(g, w, .05, .1, q, x, y - h / 2 + j * h / (rows + 1), z, false); };
    const quente = (g, x, y, z, i = 10, d = 7) => { const l = new THREE.PointLight('#ffb866', i, d, 1.6); l.position.set(x, y, z); g.add(l); };
    const concreto = tex(512, 512, (x, w, h) => { x.fillStyle = '#8f8c88'; x.fillRect(0, 0, w, h); for (let i = 0; i < 6000; i++) { x.fillStyle = `rgba(${rnd() > .5 ? '255,255,255' : '20,20,20'},${rnd() * .07})`; x.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 4, 1 + rnd() * 3); }
      x.strokeStyle = 'rgba(40,38,36,.5)'; x.lineWidth = 2; for (let i = 0; i <= 4; i++) { x.strokeRect(i * w / 4, 0, 0, h); x.strokeRect(0, i * h / 4, w, 0); } x.fillStyle = 'rgba(30,28,26,.55)'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (const [dx, dy] of [[.1, .1], [.9, .1], [.1, .9], [.9, .9]]) { x.beginPath(); x.arc((i + dx) * w / 4, (j + dy) * h / 4, 3, 0, 7); x.fill(); } });
    const pedra = tex(256, 256, (x, w, h) => { x.fillStyle = '#d9cfbd'; x.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(${rnd() > .5 ? '255,250,235' : '90,75,55'},${rnd() * .1})`; x.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 7, 2 + rnd() * 5); } }, [3, 3]);
    const tabuas = tex(512, 128, (x, w, h) => { for (let r = 0; r < 4; r++) { x.fillStyle = ['#b98a52', '#c2935a', '#b2834c', '#bd8e56'][r]; x.fillRect(0, r * 32, w, 32); x.fillStyle = 'rgba(60,35,15,.5)'; x.fillRect(0, r * 32, w, 1.5); for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(70,40,15,${rnd() * .12})`; x.fillRect(rnd() * w, r * 32 + rnd() * 30, 20 + rnd() * 60, 1); } } });
    const madeira = std('#6e4c38', {roughness: .6}), escuro = std('#1b1b20', {roughness: .55}), branco = std('#efebe5', {roughness: .9});

    /* 1 · contemporânea: volumes claros, canto de vidro, portal de madeira e linhas de luz */
    { const g = grupos.minimalista = new THREE.Group(), cinza = std('#bdbab4', {roughness: .9}), tx = new THREE.MeshStandardMaterial({map: pedra, roughness: 1});
      B(g, 5.4, 3.5, 4, cinza, -1.2, 1.75, -2); B(g, 2.2, 4.8, 4.3, tx, 2.8, 2.4, -1.95);
      B(g, 1.75, 2.7, .1, std('#5d4a3e', {roughness: .7}), 2.8, 2.85, .23, false); letreiro(g, 1.6, 2.8, 3.45, .3, '#ffffff', '#ffd9a0');
      B(g, 1.8, .03, .03, led, 2.8, 1.47, .3, false);
      B(g, 6, .45, 1, cinza, -1.3, 3.5, .4); B(g, .45, 3.7, 1, cinza, -4.05, 1.85, .4);
      for (let i = 0; i < 3; i++) { B(g, 5.3 - i * .24, .035, .035, led, -1.1 + i * .12, 3.2 - i * .13, .92, false); B(g, .035, 3.2 - i * .13, .035, led, -3.76 + i * .12, (3.2 - i * .13) / 2, .92, false); }
      vidro(g, 3.3, 2.75, -1.75, 1.55, .04, .35, 3, 2); B(g, 3.5, .35, .5, cinza, -1.75, .17, .2);
      B(g, 2.4, 2.2, 1, madeira, .95, 1.1, .5); B(g, 1.3, 1.85, .06, std('#4a3226', {roughness: .5}), 1.0, .93, 1.02, false); B(g, .03, .9, .05, std('#c9c9c9', {metalness: .8, roughness: .3}), .55, .95, 1.07, false); B(g, 1.3, .03, .03, led, 1.0, 1.88, 1.03, false);
      quente(g, 1, 1.6, 2, 9); quente(g, -1.8, 1.6, 2.2, 8); quente(g, 2.8, 2.6, 1.6, 7, 5); g.userData.plantas = [[1.75, 1.3, 1.9], [0.25, 1.3, 1.6], [-2.6, .75, 1.3], [-1.4, .75, 1.2], [-3.4, .75, 1.3]]; g.userData.alvo = [-.4, 2.2]; }

    /* 2 · corporativa: moldura escura, parede de concreto, janelas altas e fitas de LED */
    { const g = grupos.moderno = new THREE.Group(), conc = new THREE.MeshStandardMaterial({map: concreto, roughness: .9});
      B(g, 8.4, .55, 3.2, escuro, 0, 4.5, -.4); B(g, .75, 4.25, 3.2, escuro, -3.82, 2.12, -.4); B(g, .35, 4.25, 3.2, escuro, 4.02, 2.12, -.4);
      B(g, 5.4, 4.25, .2, conc, 1.15, 2.12, -1.3); B(g, 2.2, 4.25, .2, std('#232327', {roughness: .7}), -2.65, 2.12, -1.3); for (let i = 0; i < 16; i++) B(g, .05, 4.25, .06, escuro, -3.7 + i * .14, 2.12, -1.18, false);
      letreiro(g, 3.6, 1.15, 3.2, -1.17, '#2a2a2e', '#ffd9a0');
      vidro(g, 1.8, 2.2, 0, 1.25, -1.17, .3, 1, 1); vidro(g, 1.8, 2.2, 2.3, 1.25, -1.17, .3, 1, 1); B(g, 4.6, .12, .5, std('#3a5a3a', {roughness: 1}), 1.15, .06, -.85, false);
      vidro(g, 1.0, 1.95, -2.65, .98, -1.17, .7, 1, 0); B(g, 2.3, .13, 1.1, escuro, -2.65, 2.2, -.7); B(g, 2.2, .02, 1, madeira, -2.65, 2.12, -.7, false);
      for (const x of [-4.02, -3.72]) B(g, .04, 3.4, .04, led, x, 2.1, 1.22, false); B(g, .04, 3.4, .04, led, 4.02, 2.1, 1.22, false);
      for (let i = 0; i < 6; i++) { const d = new THREE.Mesh(new THREE.CircleGeometry(.06, 16), ledFrio); d.rotation.x = Math.PI / 2; d.position.set(-1.6 + i * 1.05, 4.215, -.3); g.add(d); }
      quente(g, 1.15, 3.6, .2, 12, 6); quente(g, -2.65, 1.6, .4, 8, 5); quente(g, 1.1, 1.2, .8, 6, 5); g.userData.plantas = [[-1.1, .8, -.6], [3.3, .8, -.6], [1.15, .7, -.5], [-4.6, 1.2, 1.5]]; g.userData.alvo = [0, 2.3]; }

    /* 3 · escultural: parede de pedra inclinada, pilares altos, terraço e degraus iluminados */
    { const g = grupos.escultural = new THREE.Group(), tx = new THREE.MeshStandardMaterial({map: pedra, roughness: 1});
      const forma = new THREE.Shape(); forma.moveTo(.1, 0); forma.lineTo(3.6, 0); forma.lineTo(3.6, 5); forma.lineTo(-1.25, 3.85); forma.closePath();
      const geo = new THREE.ExtrudeGeometry(forma, {depth: .7, bevelEnabled: false}); geo.computeBoundingBox();
      const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 5, uv.getY(i) / 5); const parede = new THREE.Mesh(geo, tx); parede.position.set(-1.1, 0, -.35); parede.castShadow = parede.receiveShadow = true; g.add(parede);
      const fita = B(g, .05, 4.1, .05, led, -1.68, 1.93, .4, false); fita.rotation.z = Math.atan2(1.35, 3.85);
      letreiro(g, 3.1, .85, 2.75, .37, '#e9c98a', '#7a5a22');
      for (const x of [3.05, 4.15, 5.25]) B(g, .6, 5, .75, branco, x, 2.5, -.1); vidro(g, .5, 4.3, 3.6, 2.35, -.3, .5, 0, 3, '#2a2a2e'); vidro(g, .5, 4.3, 4.7, 2.35, -.3, .5, 0, 3, '#2a2a2e'); B(g, 3, .2, 1.4, escuro, 4.15, 4.55, -.5);
      B(g, 3.9, .38, 1.7, branco, -3.25, 2.4, .25); B(g, .38, 2.25, 1.7, branco, -5.0, 1.12, .25); vidro(g, 3.2, 1.95, -3.05, 1.0, -.35, .75, 3, 0); B(g, 3.3, .02, 1.5, madeira, -3.05, 2.2, .25, false);
      B(g, 4.2, .18, 2.6, escuro, -3.2, 3.85, -.2); B(g, 4.0, .02, 2.4, std('#a8683a', {roughness: .6}), -3.2, 3.75, -.2, false);
      for (let i = 0; i < 4; i++) { const d = new THREE.Mesh(new THREE.CircleGeometry(.05, 12), ledFrio); d.rotation.x = Math.PI / 2; d.position.set(-4.4 + i * .8, 3.735, .4); g.add(d); }
      for (let i = 0; i < 4; i++) { B(g, 4.2, .13, .42, std('#cfc8ba', {roughness: .8}), -3.05, .52 - i * .13, 1.3 + i * .42); B(g, 4.2, .02, .02, led, -3.05, .46 - i * .13, 1.52 + i * .42, false); } B(g, 4.2, .6, 1.1, std('#cfc8ba'), -3.05, .28, .55);
      quente(g, .9, 1.2, 1.6, 10); quente(g, -3, 1.6, 1.4, 10); quente(g, 4.2, 1.2, 1.4, 9); g.userData.plantas = [[.2, 1.1, 1.0], [1.5, 1.2, 1.1], [2.7, 1.0, 1.0], [3.6, 1.1, 1.0], [4.8, 1.1, 1.0], [-5.6, 1.0, 1.4]]; g.userData.alvo = [0, 2.4]; }

    /* 4 · vitrine: concreto, faixa de madeira com o nome e uma grande vitrine */
    { const g = grupos.vitrine = new THREE.Group(), conc = new THREE.MeshStandardMaterial({map: concreto, roughness: .9}), faixa = new THREE.MeshStandardMaterial({map: tabuas, roughness: .65});
      B(g, 7.2, 4.1, 3, conc, 0, 2.05, -1.5); B(g, 3.5, 4.9, 3, conc, 1.85, 2.45, -1.55);
      B(g, 6.9, 1.3, .28, faixa, .15, 3.55, .16); B(g, 3.2, .55, .2, faixa, -2.0, 4.42, .1); letreiro(g, 4.9, .6, 3.55, .31, '#fff3d6', '#3a2410');
      vidro(g, 4.5, 2.75, -1.3, 1.45, .03, .85, 3, 1, '#0e0e10'); B(g, 4.7, .12, .25, escuro, -1.3, .06, .1, false);
      const trel = tex(128, 256, (x, w, h) => { x.fillStyle = '#2a1c12'; x.fillRect(0, 0, w, h); x.strokeStyle = '#b06a3a'; x.lineWidth = 3; for (let i = -8; i < 16; i++) { x.beginPath(); x.moveTo(i * 20, 0); x.lineTo(i * 20 + h / 2, h); x.moveTo(i * 20 + h / 2, 0); x.lineTo(i * 20, h); x.stroke(); } });
      const tp = new THREE.Mesh(new THREE.PlaneGeometry(.85, 2.85), new THREE.MeshStandardMaterial({map: trel, roughness: .7})); tp.position.set(1.75, 1.45, .012); g.add(tp);
      for (const x of [-2.9, -1.3, .3]) { B(g, .03, .5, .03, escuro, x, 2.55, -.5, false); const l = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 8), ledFrio); l.position.set(x, 2.28, -.5); g.add(l); }
      quente(g, -1.3, 1.6, 1.4, 14, 7); quente(g, .6, 3.6, 1.2, 8, 5); g.userData.plantas = [[3.0, 1.3, .7], [-3.9, 1.2, .8]]; g.userData.alvo = [0, 2.3]; }

    Object.values(grupos).forEach(g => { g.visible = false; scene.add(g); });
    new GLTFLoader().loadAsync('/models/f/pottedPlant.glb').then(p => { for (const g of Object.values(grupos)) for (const [x, s, z] of g.userData.plantas) { const o = p.scene.clone(true), b = new THREE.Box3().setFromObject(o), c = b.getCenter(new THREE.Vector3());
      o.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } }); const w = new THREE.Group(); o.position.set(-c.x, -b.min.y, -c.z); w.add(o); w.scale.setScalar(s * 2.2); w.position.set(x, .12, z); w.rotation.y = rnd() * 6; g.add(w); } }).catch(() => {});
    pintaLetreiro(); aplica(); F.ready = true; dispatchEvent(new Event('f3d-ready'));
  }
  function aplica() { if (!montado) return; for (const [k, g] of Object.entries(grupos)) g.visible = k === estilo; Wd = 0; }
  const alvoCam = new THREE.Vector3(), posCam = new THREE.Vector3(); let t0 = performance.now(), primeira = true;
  function loop() {
    if (!running) return; raf = requestAnimationFrame(loop);
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    if (w !== Wd || h !== Hd) { Wd = w; Hd = h; renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); renderer.setSize(w, h, false); camera.aspect = w / h; const estreito = w / h < 1; camera.fov = estreito ? 48 : 30;
      const dx = quadro === 'lado' && !estreito && w >= 980 ? Math.round(w * .2) : 0, dy = quadro === 'baixo' ? Math.round(h * .14) : estreito && quadro !== 'centro' ? Math.round(h * .22) : 0;
      if (dx || dy) camera.setViewOffset(w, h, dx, dy, w, h); else camera.clearViewOffset(); camera.updateProjectionMatrix(); }
    const g = grupos[estilo], [ax, ay] = g.userData.alvo, t = (performance.now() - t0) / 1000, a = .42 + Math.sin(t * .11) * .1, r = camera.aspect < 1 ? 17 : 14.5;
    alvoCam.set(ax, ay, -.6); posCam.set(ax + Math.sin(a) * r, 2.1 + Math.sin(t * .07) * .15, Math.cos(a) * r);
    if (primeira) { camera.position.copy(posCam); primeira = false; } else camera.position.lerp(posCam, .04); camera.lookAt(alvoCam); renderer.render(scene, camera);
  }
  const nomeFachada = id => ({minimalista: 1, moderno: 1, escultural: 1, vitrine: 1}[id] ? id : id === 'classico' ? 'vitrine' : 'moderno');
  F.start = () => { if (!montado) montar(); if (running) return; running = true; Wd = 0; loop(); };
  F.stop = () => { running = false; cancelAnimationFrame(raf); };
  F.setEstilo = id => { estilo = nomeFachada(id); aplica(); };
  F.setEmpresa = n => { nome = String(n || '').trim() || 'SUA EMPRESA'; logo = ''; if (montado) pintaLetreiro(); };
  F.setLogo = url => { logo = url || ''; if (montado) pintaLetreiro(); };
  F.enquadrar = q => { quadro = q; Wd = 0; };
} catch (e) { console.error(e); F.error = true; }
