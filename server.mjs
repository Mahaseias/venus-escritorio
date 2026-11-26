// Escritório virtual da Venus — servidor sem dependências (Node 20+)
import http from 'node:http';
import {readFileSync, writeFileSync, renameSync, existsSync} from 'node:fs';
import {timingSafeEqual, createHash, createHmac, randomBytes, scryptSync, randomUUID} from 'node:crypto';

/* ---------- arquivos públicos ---------- */
const pub = f => new URL('./public/' + f, import.meta.url);
const STATIC = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/fachada.jpg': ['fachada.jpg', 'image/jpeg'],
  '/sprites.png': ['sprites.png', 'image/png'],
  '/sprites.json': ['sprites.json', 'application/json; charset=utf-8']
};
const files = Object.fromEntries(Object.entries(STATIC).map(([k, [f, t]]) => [k, [readFileSync(pub(f)), t]]));
const cfg = JSON.parse(readFileSync(pub('agents.json')));
const SETORES = cfg.setores, FUNC = cfg.funcionarios, TZ = cfg.fuso || 'America/Cuiaba';
const byId = Object.fromEntries(FUNC.map(f => [f.id, f]));

/* ---------- segredos ---------- */
const TOKEN = process.env.OFFICE_TOKEN || '';
const SECRET = process.env.SESSION_SECRET || (TOKEN ? createHash('sha256').update('sessao:' + TOKEN).digest('hex') : randomBytes(32).toString('hex'));
const USERS = (() => {
  try { return JSON.parse(process.env.OFFICE_USERS || '[]').filter(u => u.email && u.hash).map(u => ({...u, email: u.email.toLowerCase()})); }
  catch { console.error('OFFICE_USERS inválido: use o formato gerado por scripts/gerar-senha.mjs'); return []; }
})();
const TASK_TIMEOUT_MIN = Number(process.env.TASK_TIMEOUT_MIN || 90);

/* ---------- estado ---------- */
const sessions = new Map();          // sessões do Claude Code (hooks)
let tasks = [];                      // fila e histórico de tarefas
let workerSeen = 0;
const STATE_FILE = process.env.STATE_FILE;
if (STATE_FILE && existsSync(STATE_FILE)) {
  try { tasks = JSON.parse(readFileSync(STATE_FILE, 'utf8')).tasks || []; } catch { console.error('Não foi possível ler STATE_FILE'); }
}
let saveTimer = null;
function save() {
  if (!STATE_FILE || saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try { writeFileSync(STATE_FILE + '.tmp', JSON.stringify({tasks})); renameSync(STATE_FILE + '.tmp', STATE_FILE); }
    catch (e) { console.error('Falha ao salvar estado:', e.message); }
  }, 800);
}
function prune() {
  const now = Date.now();
  for (const [k, v] of sessions) if (now - v.time > 600000) sessions.delete(k);
  for (const t of tasks) if (t.status === 'andamento' && now - t.iniciada > TASK_TIMEOUT_MIN * 60000) {
    t.status = 'erro'; t.resultado = 'Tempo esgotado sem resposta do worker.'; t.concluida = now; save();
  }
  if (tasks.length > 500) { tasks = tasks.slice(-500); save(); }
}

/* ---------- turnos ---------- */
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const fmtTZ = new Intl.DateTimeFormat('en-US', {timeZone: TZ, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'});
function agora(d = new Date()) {
  const p = Object.fromEntries(fmtTZ.formatToParts(d).map(x => [x.type, x.value]));
  return {dow: DOW.indexOf(p.weekday), min: Number(p.hour) * 60 + Number(p.minute)};
}
const toMin = s => { const [h, m] = String(s).split(':').map(Number); return h * 60 + (m || 0); };
function emTurno(f, d) {
  const t = f.turno; if (!t) return true;
  const {dow, min} = agora(d), a = toMin(t.inicio), b = toMin(t.fim), dias = t.dias || [0, 1, 2, 3, 4, 5, 6];
  if (a === b) return dias.includes(dow);
  if (a < b) return dias.includes(dow) && min >= a && min < b;
  return (dias.includes(dow) && min >= a) || (dias.includes((dow + 6) % 7) && min < b);
}

/* quem está trabalhando: sessão de hook com o id do funcionário, ou só com o setor (vai para quem está de turno) */
function estado() {
  prune();
  const ativos = new Set();
  const semFunc = new Map();
  for (const s of sessions.values()) {
    if (s.func && byId[s.func]) ativos.add(s.func);
    else semFunc.set(s.role, (semFunc.get(s.role) || 0) + 1);
  }
  for (const [role] of semFunc) {
    const doSetor = FUNC.filter(f => f.setor === role);
    const alvo = doSetor.find(f => emTurno(f) && !ativos.has(f.id)) || doSetor.find(f => emTurno(f)) || doSetor[0];
    if (alvo) ativos.add(alvo.id);
  }
  for (const t of tasks) if (t.status === 'andamento') ativos.add(t.func);
  return ativos;
}

/* ---------- autenticação (cookie assinado) ---------- */
const b64 = s => Buffer.from(s).toString('base64url');
const sign = s => createHmac('sha256', SECRET).update(s).digest('base64url');
function makeCookie(email) {
  const body = b64(JSON.stringify({e: email, x: Date.now() + 7 * 864e5}));
  return body + '.' + sign(body);
}
function readCookie(req) {
  const m = /(?:^|;\s*)venus_sess=([^;]+)/.exec(req.headers.cookie || '');
  if (!m) return null;
  const [body, sig] = m[1].split('.');
  if (!body || !sig) return null;
  const a = Buffer.from(sign(body)), b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const {e, x} = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (Date.now() > x) return null;
    return USERS.find(u => u.email === e) || null;
  } catch { return null; }
}
function checkPassword(user, senha) {
  const [alg, salt, hash] = String(user.hash).split('$');
  if (alg !== 'scrypt' || !salt || !hash) return false;
  const got = scryptSync(String(senha), Buffer.from(salt, 'base64'), 32);
  const want = Buffer.from(hash, 'base64');
  return got.length === want.length && timingSafeEqual(got, want);
}
const attempts = new Map();
function limited(ip) {
  const now = Date.now(), a = attempts.get(ip) || {n: 0, t: now};
  if (now - a.t > 600000) { a.n = 0; a.t = now; }
  a.n++; attempts.set(ip, a);
  return a.n > 8;
}
const digest = s => createHash('sha256').update(s).digest();
const bearerOk = req => TOKEN && timingSafeEqual(digest(req.headers.authorization || ''), digest('Bearer ' + TOKEN));

/* ---------- visões ---------- */
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
function turnoTexto(t) {
  if (!t) return '24 horas';
  const d = t.dias || [0, 1, 2, 3, 4, 5, 6];
  let dias = d.length === 7 ? 'Todos os dias' : d.join() === '1,2,3,4,5' ? 'Seg a sex' : d.map(i => DIAS[i]).join(', ');
  const h = t.inicio === t.fim ? '24 horas' : `${t.inicio}–${t.fim}`;
  return `${dias} · ${h}`;
}
const pubTask = t => ({id: t.id, func: t.func, titulo: t.titulo, texto: t.texto, autor: t.autor, status: t.status, criada: t.criada, iniciada: t.iniciada || null, concluida: t.concluida || null, resultado: t.resultado || ''});
function office(user) {
  const ativos = estado();
  return {
    agora: Date.now(), fuso: TZ, setores: SETORES,
    logado: user ? {nome: user.nome || user.email, email: user.email} : null,
    worker: user ? {online: Date.now() - workerSeen < 60000, visto: workerSeen || null} : undefined,
    funcionarios: FUNC.map(f => {
      const atual = tasks.find(t => t.func === f.id && t.status === 'andamento');
      const fila = tasks.filter(t => t.func === f.id && t.status === 'fila').length;
      const o = {id: f.id, nome: f.nome, cargo: f.cargo, setor: f.setor, turno: turnoTexto(f.turno), bio: f.bio, faz: f.faz, hobbies: f.hobbies, aparencia: f.aparencia,
        emTurno: emTurno(f), trabalhando: ativos.has(f.id)};
      if (user) { o.atividade = atual ? atual.titulo : null; o.fila = fila; }
      return o;
    })
  };
}

/* ---------- http ---------- */
const CSP = "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'self' https://venustecnologia.com.br https://*.venustecnologia.com.br";
async function readJSON(req, max = 8192) {
  let body = '';
  for await (const chunk of req) { body += chunk; if (body.length > max) throw Object.assign(new Error('grande'), {code: 413}); }
  try { return JSON.parse(body || '{}'); } catch { throw Object.assign(new Error('json'), {code: 400}); }
}
const titulo = s => { const l = s.trim().split('\n')[0]; return l.length > 80 ? l.slice(0, 77) + '…' : l; };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x'), path = url.pathname;
  const send = (code, data, type = 'application/json; charset=utf-8', extra = {}) => {
    res.writeHead(code, {'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', ...extra});
    res.end(typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data));
  };
  const user = readCookie(req);
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  try {
    if (req.method === 'GET') {
      if (STATIC[path]) { const [buf, type] = files[path]; return send(200, buf, type, path === '/' ? {'Content-Security-Policy': CSP} : {'Cache-Control': 'public, max-age=300'}); }
      if (path === '/health') return send(200, {ok: true});
      if (path === '/api/office') return send(200, office(user));
      if (path === '/api/team') { // compatibilidade com a versão anterior
        const ativos = estado();
        return send(200, SETORES.map(s => ({id: s.id, name: s.nome, room: s.sala, color: s.cor, active: FUNC.some(f => f.setor === s.id && ativos.has(f.id))})));
      }
      if (path === '/api/tasks') {
        if (!user) return send(401, {erro: 'Faça login'});
        const f = url.searchParams.get('func');
        return send(200, tasks.filter(t => !f || t.func === f).slice(-30).reverse().map(pubTask));
      }
    }
    if (req.method !== 'POST') return send(404, {});

    /* hooks do Claude Code */
    if (path === '/api/event') {
      if (!bearerOk(req)) return send(401, {});
      const {role, session, active, staff} = await readJSON(req, 2048);
      if (!SETORES.some(s => s.id === role) || typeof session !== 'string' || !/^\w{1,80}$/.test(session) || typeof active !== 'boolean') return send(400, {});
      if (staff !== undefined && (typeof staff !== 'string' || !byId[staff])) return send(400, {});
      const key = role + ':' + session;
      if (active) sessions.set(key, {role, func: staff || null, time: Date.now()}); else sessions.delete(key);
      return send(200, {ok: true});
    }

    /* worker do PC de casa */
    if (path === '/api/worker/next') {
      if (!bearerOk(req)) return send(401, {});
      workerSeen = Date.now(); prune();
      const ocupados = new Set(tasks.filter(t => t.status === 'andamento').map(t => t.func));
      const t = tasks.find(t => t.status === 'fila' && byId[t.func] && emTurno(byId[t.func]) && !ocupados.has(t.func));
      if (!t) return send(200, {tarefa: null});
      t.status = 'andamento'; t.iniciada = Date.now(); save();
      const f = byId[t.func];
      return send(200, {tarefa: {id: t.id, func: f.id, setor: f.setor, texto: t.texto, autor: t.autor,
        perfil: {nome: f.nome, cargo: f.cargo, bio: f.bio, faz: f.faz, instrucoes: f.instrucoes || ''}}});
    }
    if (path === '/api/worker/result') {
      if (!bearerOk(req)) return send(401, {});
      workerSeen = Date.now();
      const {id, ok, resultado} = await readJSON(req, 64000);
      const t = tasks.find(t => t.id === id);
      if (!t || t.status !== 'andamento') return send(404, {});
      t.status = ok ? 'concluida' : 'erro'; t.resultado = String(resultado || '').slice(0, 20000); t.concluida = Date.now(); save();
      return send(200, {ok: true});
    }

    /* painel (cookie) — bloqueia requisições de outras origens */
    const origin = req.headers.origin;
    if (origin && new URL(origin).host !== req.headers.host) return send(403, {erro: 'Origem não permitida'});

    if (path === '/api/login') {
      if (limited(ip)) return send(429, {erro: 'Muitas tentativas. Aguarde alguns minutos.'});
      const {email, senha} = await readJSON(req, 1024);
      const u = USERS.find(u => u.email === String(email || '').trim().toLowerCase());
      if (!u || !checkPassword(u, senha)) return send(401, {erro: 'E-mail ou senha inválidos.'});
      const secure = (req.headers['x-forwarded-proto'] || '') === 'https' ? '; Secure' : '';
      return send(200, {nome: u.nome || u.email}, undefined, {'Set-Cookie': `venus_sess=${makeCookie(u.email)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure}`});
    }
    if (path === '/api/logout') return send(200, {ok: true}, undefined, {'Set-Cookie': 'venus_sess=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'});

    if (!user) return send(401, {erro: 'Faça login'});
    if (path === '/api/tasks') {
      const {func, texto} = await readJSON(req, 16000);
      const txt = String(texto || '').trim();
      if (!byId[func]) return send(400, {erro: 'Funcionário inválido'});
      if (txt.length < 3 || txt.length > 8000) return send(400, {erro: 'Descreva a tarefa (até 8000 caracteres).'});
      if (tasks.filter(t => t.status === 'fila').length >= 100) return send(429, {erro: 'Fila cheia.'});
      const t = {id: randomUUID(), func, texto: txt, titulo: titulo(txt), autor: user.nome || user.email, status: 'fila', criada: Date.now()};
      tasks.push(t); save();
      return send(201, pubTask(t));
    }
    const m = /^\/api\/tasks\/([\w-]{8,64})\/cancelar$/.exec(path);
    if (m) {
      const t = tasks.find(t => t.id === m[1]);
      if (!t || t.status !== 'fila') return send(409, {erro: 'Só dá para cancelar tarefas na fila.'});
      t.status = 'cancelada'; t.concluida = Date.now(); save();
      return send(200, pubTask(t));
    }
    return send(404, {});
  } catch (e) {
    return send(e.code === 413 ? 413 : 400, {erro: 'Requisição inválida'});
  }
}).listen(Number(process.env.PORT || 3000), '0.0.0.0', () => {
  console.log(`Escritório Venus no ar · ${FUNC.length} funcionários · ${USERS.length} usuários com acesso`);
});
