// Worker do escritório Venus — roda no PC que fica ligado.
// Busca tarefas no escritório (só de quem está no turno) e executa com o Claude Code em modo headless.
// Uso: node worker/venus-worker.mjs [caminho/do/config.json]
import {spawn} from 'node:child_process';
import {readFileSync, existsSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const cfgFile = process.argv[2] || path.join(here, 'config.json');
if (!existsSync(cfgFile)) { console.error(`Config não encontrado: ${cfgFile}\nCopie worker/config.example.json para worker/config.json e preencha.`); process.exit(1); }
const cfg = JSON.parse(readFileSync(cfgFile, 'utf8'));
const BASE = String(process.env.VENUS_URL || cfg.url || '').replace(/\/$/, '');
const TOKEN = process.env.OFFICE_TOKEN || cfg.token;
if (!BASE || !TOKEN) { console.error('Defina url e token no config.json (ou VENUS_URL e OFFICE_TOKEN no ambiente).'); process.exit(1); }

const CLAUDE = cfg.claude || 'claude';
const MAX = Math.max(1, Number(cfg.maxParalelo || 2));
const POLL = Math.max(3, Number(cfg.intervaloSegundos || 10)) * 1000;
const TIMEOUT = Math.max(1, Number(cfg.timeoutMinutos || 60)) * 60000;
const WIN = process.platform === 'win32';
let running = 0, stopping = false;

const log = (...a) => console.log(new Date().toLocaleString('pt-BR'), '·', ...a);
async function call(p, body) {
  const r = await fetch(BASE + p, {method: 'POST', headers: {'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json'}, body: JSON.stringify(body || {}), signal: AbortSignal.timeout(20000)});
  if (r.status === 401) throw new Error('Token recusado (confira OFFICE_TOKEN).');
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

function prompt(t) {
  const p = t.perfil;
  return [
    p.instrucoes,
    '',
    `Seu perfil: ${p.nome}, ${p.cargo}. ${p.bio}`,
    `Suas atribuições: ${(p.faz || []).join('; ')}.`,
    '',
    `Tarefa enviada por ${t.autor} pelo escritório virtual da Venus:`,
    '---',
    t.texto,
    '---',
    'Quando terminar, responda com um resumo claro do que foi feito e do que ficou pendente. Essa resposta aparece no painel do escritório.'
  ].join('\n');
}

function run(t) {
  const setor = (cfg.setores || {})[t.setor] || {};
  const pasta = setor.pasta || cfg.pastaPadrao || path.join(here, 'areas', t.setor);
  if (!existsSync(pasta)) mkdirSync(pasta, {recursive: true});
  const args = ['-p', ...(setor.args || cfg.args || ['--permission-mode', 'acceptEdits'])];
  log(`▶ ${t.perfil.nome}: ${t.texto.split('\n')[0].slice(0, 80)}`);
  return new Promise(resolve => {
    let out = '', err = '', done = false;
    // O texto da tarefa vai pela entrada padrão, nunca pela linha de comando.
    const child = spawn(CLAUDE, args, {
      cwd: pasta, shell: WIN, windowsHide: true,
      env: {...process.env, VENUS_URL: BASE, OFFICE_TOKEN: TOKEN, VENUS_ROLE: t.setor, VENUS_STAFF: t.func}
    });
    const timer = setTimeout(() => { if (!done) { err += '\nTempo limite atingido.'; child.kill(); } }, TIMEOUT);
    child.stdout.on('data', d => { out += d; if (out.length > 200000) out = out.slice(-100000); });
    child.stderr.on('data', d => { err += d; if (err.length > 20000) err = err.slice(-10000); });
    child.on('error', e => { err += `\nNão foi possível iniciar "${CLAUDE}": ${e.message}`; });
    child.on('close', code => {
      done = true; clearTimeout(timer);
      const ok = code === 0 && out.trim().length > 0;
      resolve({ok, resultado: (ok ? out : (out + '\n' + err)).trim().slice(-20000) || `Encerrado com código ${code}.`});
    });
    child.stdin.end(prompt(t));
  });
}

async function loop() {
  while (!stopping) {
    try {
      while (running < MAX) {
        const {tarefa} = await call('/api/worker/next');
        if (!tarefa) break;
        running++;
        run(tarefa).then(async r => {
          log(`${r.ok ? '✔' : '✖'} ${tarefa.perfil.nome}`);
          for (let i = 0; i < 5; i++) { try { await call('/api/worker/result', {id: tarefa.id, ...r}); break; } catch (e) { log('Falha ao enviar resultado, tentando de novo:', e.message); await new Promise(s => setTimeout(s, 5000 * (i + 1))); } }
        }).finally(() => running--);
      }
    } catch (e) { log('Escritório indisponível:', e.message); }
    await new Promise(s => setTimeout(s, POLL));
  }
}

process.on('SIGINT', () => { stopping = true; log('Encerrando… (tarefas em andamento continuam até o fim)'); if (!running) process.exit(0); });
log(`Worker Venus ligado em ${BASE} · até ${MAX} tarefas simultâneas · verificando a cada ${POLL / 1000}s`);
loop();
