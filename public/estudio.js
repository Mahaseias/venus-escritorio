// Estúdio de personagens — transforma o modelo do Hunyuan3D + esqueleto do Mixamo no boneco animado do escritório.
// Tudo roda no navegador: nada é enviado até a pessoa clicar em publicar.
import * as THREE from './vendor/three.module.js';
import {FBXLoader} from './vendor/FBXLoader.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {GLTFExporter} from './vendor/GLTFExporter.js';
import {mergeVertices} from './vendor/BufferGeometryUtils.js';
import {OrbitControls} from './vendor/OrbitControls.js';

const ALTURA = .92;                  // altura do boneco antes da escala do escritório (igual à da Lívia)
const REF = '/models/c/livia.glb';   // de onde vêm as animações (todo esqueleto do Mixamo tem os mesmos ossos)

/* ---------- leitura do GLB ---------- */
function lerGLB(buf) {
  const dv = new DataView(buf);
  if (buf.byteLength < 28 || dv.getUint32(0, true) !== 0x46546C67) throw new Error('Este arquivo não é um GLB. No Hunyuan3D, escolha o tipo "glb" antes de baixar.');
  const jl = dv.getUint32(12, true), json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jl))), bin = new Uint8Array(buf, 28 + jl);
  if ((json.extensionsRequired || []).some(e => /draco|meshopt/i.test(e))) throw new Error('Este GLB está compactado. Baixe de novo sem compactação.');
  const acc = i => {
    const a = json.accessors[i], v = json.bufferViews[a.bufferView], n = {SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4}[a.type];
    const T = {5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array}[a.componentType];
    const size = n * T.BYTES_PER_ELEMENT, stride = v.byteStride || size, off = (v.byteOffset || 0) + (a.byteOffset || 0), out = new T(a.count * n);
    const src = new DataView(bin.buffer, bin.byteOffset + off);
    const get = {5126: 'getFloat32', 5125: 'getUint32', 5123: 'getUint16', 5121: 'getUint8'}[a.componentType];
    for (let i = 0; i < a.count; i++) for (let k = 0; k < n; k++) out[i * n + k] = src[get](i * stride + k * T.BYTES_PER_ELEMENT, true);
    return out;
  };
  const P = [], U = [], N = [], I = []; let base = 0, mat = null;
  for (const m of json.meshes || []) for (const p of m.primitives) {
    if (p.attributes.POSITION == null || p.attributes.TEXCOORD_0 == null) continue;
    const pos = acc(p.attributes.POSITION), uv = acc(p.attributes.TEXCOORD_0), nor = p.attributes.NORMAL != null ? acc(p.attributes.NORMAL) : null;
    const idx = p.indices != null ? acc(p.indices) : Uint32Array.from({length: pos.length / 3}, (_, i) => i);
    for (const v of pos) P.push(v); for (const v of uv) U.push(v); if (nor) for (const v of nor) N.push(v); else for (let i = 0; i < pos.length; i++) N.push(i % 3 === 1 ? 1 : 0);
    for (const v of idx) I.push(v + base); base += pos.length / 3; if (mat == null) mat = p.material;
  }
  if (!P.length) throw new Error('Não encontrei a malha com textura neste GLB. No Hunyuan3D, marque "Include Texture".');
  const tex = json.materials?.[mat ?? 0]?.pbrMetallicRoughness?.baseColorTexture, img = tex && json.images?.[json.textures[tex.index].source];
  if (!img || img.bufferView == null) throw new Error('Este GLB veio sem a pintura. No Hunyuan3D, marque "Include Texture" e gere com textura.');
  const iv = json.bufferViews[img.bufferView], bytes = bin.slice(iv.byteOffset || 0, (iv.byteOffset || 0) + iv.byteLength);
  return {P, U, N, I, imagem: bytes, mime: img.mimeType || 'image/jpeg'};
}

/* ---------- zip sem compactação ---------- */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function zip(files) {
  const enc = new TextEncoder(), parts = [], central = []; let off = 0;
  for (const [name, data] of files) {
    const nm = enc.encode(name), crc = crc32(data), h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nm.length, true);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
    parts.push(new Uint8Array(h.buffer), nm, data); central.push(new Uint8Array(c.buffer), nm); off += 30 + nm.length + data.length;
  }
  const cs = central.reduce((n, p) => n + p.length, 0), e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cs, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...central, new Uint8Array(e.buffer)], {type: 'application/zip'});
}

/* ---------- passo 1: GLB do Hunyuan3D -> pacote que o Mixamo aceita ---------- */
export function glbParaMixamo(buf) {
  const g = lerGLB(buf), o = ['mtllib personagem.mtl', 'o personagem'], ext = /png/.test(g.mime) ? 'png' : 'jpg';
  for (let i = 0; i < g.P.length; i += 3) o.push(`v ${g.P[i].toFixed(6)} ${g.P[i + 1].toFixed(6)} ${g.P[i + 2].toFixed(6)}`);
  for (let i = 0; i < g.U.length; i += 2) o.push(`vt ${g.U[i].toFixed(6)} ${(1 - g.U[i + 1]).toFixed(6)}`);
  for (let i = 0; i < g.N.length; i += 3) o.push(`vn ${g.N[i].toFixed(4)} ${g.N[i + 1].toFixed(4)} ${g.N[i + 2].toFixed(4)}`);
  o.push('usemtl pele');
  for (let i = 0; i < g.I.length; i += 3) { const f = k => { const x = g.I[i + k] + 1; return `${x}/${x}/${x}`; }; o.push(`f ${f(0)} ${f(1)} ${f(2)}`); }
  const enc = new TextEncoder();
  return {zip: zip([['personagem.obj', enc.encode(o.join('\n') + '\n')], ['personagem.mtl', enc.encode(`newmtl pele\nKa 1 1 1\nKd 1 1 1\nKs 0 0 0\nd 1\nillum 1\nmap_Kd personagem.${ext}\n`)], [`personagem.${ext}`, g.imagem]]),
    pontos: g.P.length / 3, faces: g.I.length / 3};
}

/* ---------- passo 2: FBX do Mixamo + pintura do GLB -> boneco animado ---------- */
const restY = (mesh, bone) => { const i = mesh.skeleton.bones.indexOf(bone); return new THREE.Vector3().setFromMatrixPosition(mesh.skeleton.boneInverses[i].clone().invert()).y; };
/* Os movimentos vêm de outro corpo. Cada pessoa é gerada com braços e pernas em ângulos um pouco diferentes,
   então copiar as rotações direto deixa o ombro levantado. Aqui cada osso de braço e perna é corrigido para
   apontar na mesma direção que apontava na personagem de origem; os demais mantêm a postura própria. */
const SEGUE = {Arm: 'ForeArm', ForeArm: 'Hand', UpLeg: 'Leg', Leg: 'Foot'};
function repouso(mesh) {
  const r = {}; mesh.skeleton.bones.forEach((b, i) => { const m = mesh.skeleton.boneInverses[i].clone().invert();
    const p = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Vector3(); m.decompose(p, q, e); r[b.name] = {p, q, pai: b.parent && b.parent.isBone ? b.parent.name : null}; });
  return r;
}
function adaptar(clips, origem, destino) {
  const A = repouso(origem), B = repouso(destino), I = new THREE.Quaternion();
  const dir = (R, n) => { const m = /^mixamorig(Left|Right)(\w+)$/.exec(n); const f = m && SEGUE[m[2]] && R['mixamorig' + m[1] + SEGUE[m[2]]];
    return f ? f.p.clone().sub(R[n].p).normalize() : null; };
  const C = n => { if (!n || !A[n] || !B[n]) return I; const a = dir(A, n), b = dir(B, n); return a && b ? new THREE.Quaternion().setFromUnitVectors(b, a) : I; };
  const q = (R, n) => n && R[n] ? R[n].q : I;
  for (const c of clips) for (const t of c.tracks) { const [n, prop] = t.name.split('.'); if (prop !== 'quaternion' || !A[n] || !B[n]) continue;
    const pre = q(B, B[n].pai).clone().invert().multiply(C(B[n].pai).clone().invert()).multiply(q(A, A[n].pai));
    const pos = q(A, n).clone().invert().multiply(C(n)).multiply(q(B, n)); const v = new THREE.Quaternion();
    for (let i = 0; i < t.values.length; i += 4) { v.fromArray(t.values, i); v.premultiply(pre).multiply(pos).normalize(); v.toArray(t.values, i); } }
}
export async function montar(glbBuf, fbxBuf, nome = 'personagem') {
  const g = lerGLB(glbBuf);
  const bmp = await createImageBitmap(new Blob([g.imagem], {type: g.mime}));
  const cv = document.createElement('canvas'); cv.width = cv.height = 1024; cv.getContext('2d').drawImage(bmp, 0, 0, 1024, 1024);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.userData.mimeType = 'image/jpeg';
  let ch; try { ch = new FBXLoader().parse(fbxBuf, ''); } catch { throw new Error('Não consegui ler o FBX. No Mixamo, baixe em "FBX Binary (.fbx)".'); }
  let mesh = null; ch.traverse(o => { if (o.isSkinnedMesh && !mesh) mesh = o; });
  if (!mesh) throw new Error('Este FBX não tem esqueleto. No Mixamo, baixe o personagem (Format: FBX Binary, Pose: T-pose) depois de marcar os pontos.');
  const hips = mesh.skeleton.bones.find(b => b.name === 'mixamorigHips');
  if (!hips) throw new Error('O esqueleto deste FBX não é o do Mixamo.');
  const antes = mesh.geometry.attributes.position.count;
  for (const k of Object.keys(mesh.geometry.attributes)) if (!['position', 'normal', 'uv', 'skinIndex', 'skinWeight'].includes(k)) mesh.geometry.deleteAttribute(k);
  mesh.geometry = mergeVertices(mesh.geometry, 1e-5);
  // dois lados: o modelo gerado tem furinhos onde as pernas se encostavam; assim o furo mostra o tecido de dentro, não o fundo
  mesh.material = new THREE.MeshStandardMaterial({map: tex, roughness: .85, metalness: 0, name: 'pele', side: THREE.DoubleSide});
  // animações da personagem de referência, ajustadas à altura do quadril deste esqueleto
  const ref = await new GLTFLoader().loadAsync(REF); let rmesh = null; ref.scene.traverse(o => { if (o.isSkinnedMesh && !rmesh) rmesh = o; });
  // altura do quadril acima da sola do pé (o modelo vem centrado no meio do corpo, não no chão)
  const doChao = (m, osso) => { m.geometry.computeBoundingBox(); return restY(m, osso) - m.geometry.boundingBox.min.y; };
  const k = doChao(mesh, hips) / doChao(rmesh, rmesh.skeleton.bones.find(b => b.name === 'mixamorigHips'));
  const nomes = new Set(mesh.skeleton.bones.map(b => b.name));
  const clips = ['idle', 'walk', 'sit'].map(n => { const c = ref.animations.find(a => a.name === n).clone();
    c.tracks = c.tracks.filter(t => nomes.has(t.name.split('.')[0])); for (const t of c.tracks) if (t.name === 'mixamorigHips.position') t.values = t.values.map(v => v * k); return c; });
  adaptar(clips, rmesh, mesh);
  mesh.geometry.computeBoundingBox(); const bb = mesh.geometry.boundingBox, alt = bb.max.y - bb.min.y;
  const root = new THREE.Group(); root.name = nome; root.userData = {real: true};
  const inner = new THREE.Group(); inner.scale.setScalar(ALTURA / alt); inner.add(ch); root.add(inner);
  const buf = await new GLTFExporter().parseAsync(root, {binary: true, animations: clips});
  return {bytes: new Uint8Array(buf), info: {pontos: [antes, mesh.geometry.attributes.position.count], ossos: mesh.skeleton.bones.length, quadril: +k.toFixed(3), trilhas: clips[0].tracks.length}};
}

/* ---------- prévia ---------- */
export async function previa(canvas, bytes) {
  const g = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const r = new THREE.WebGLRenderer({canvas, antialias: true, alpha: true}); r.toneMapping = THREE.ACESFilmicToneMapping;
  const s = new THREE.Scene(); s.add(new THREE.HemisphereLight(0xffffff, 0x8877aa, 1.6)); const d = new THREE.DirectionalLight(0xfff0dc, 2.2); d.position.set(1.5, 3, 2.5); s.add(d);
  const chao = new THREE.Mesh(new THREE.CircleGeometry(.6, 48), new THREE.MeshStandardMaterial({color: '#3a3156'})); chao.rotation.x = -Math.PI / 2; s.add(chao);
  g.scene.traverse(n => { if (n.isMesh) n.frustumCulled = false; }); s.add(g.scene);
  const cam = new THREE.PerspectiveCamera(30, 1, .05, 20); cam.position.set(.9, .75, 2.1);
  const ctl = new OrbitControls(cam, canvas); ctl.target.set(0, .46, 0); ctl.enablePan = false; ctl.minDistance = .8; ctl.maxDistance = 4; ctl.enableDamping = true;
  const mx = new THREE.AnimationMixer(g.scene), acts = Object.fromEntries(g.animations.map(a => [a.name, mx.clipAction(a)])); let cur = null, vivo = true;
  const tocar = n => { if (!acts[n] || cur === n) return; acts[n].reset().fadeIn(.25).play(); if (cur) acts[cur].fadeOut(.25); cur = n; };
  tocar('idle'); const clock = new THREE.Clock();
  (function loop() { if (!vivo) return; requestAnimationFrame(loop);
    const w = canvas.clientWidth, h = canvas.clientHeight; if (w && h && (canvas.width !== w * 2 || canvas.height !== h * 2)) { r.setPixelRatio(2); r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    mx.update(Math.min(.05, clock.getDelta())); ctl.update(); r.render(s, cam); })();
  return {tocar, fechar() { vivo = false; ctl.dispose(); r.dispose(); r.forceContextLoss(); }};
}
