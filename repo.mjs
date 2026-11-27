// Empresas clientes: cadastro, usuários, agentes e estado de cada escritório.
// Com DATABASE_URL usa o Postgres do Neon por HTTPS (sem dependências). Sem ela, lê um arquivo de teste (REPO_FAKE) ou fica vazio.
import {readFileSync} from 'node:fs';

const SETORES = [
  {id: 'secretaria', nome: 'Atendimento', sala: 'Recepção', cor: '#ffb38e'},
  {id: 'marketing', nome: 'Marketing', sala: 'Estúdio de marketing', cor: '#e5a5ee'},
  {id: 'dev', nome: 'Operações', sala: 'Sala de operações', cor: '#82d9db'}
];
const soDigitos = s => String(s || '').replace(/\D/g, '');
function exibirFone(d) { d = d.replace(/^55/, ''); return d.length >= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, -4)}-${d.slice(-4)}` : d; }

// monta a configuração do escritório a partir das linhas do banco
function montar(emp, usuarios, agentes, estado, extras) {
  const funcionarios = agentes.filter(a => a.ativo !== false).map(a => ({...(a.perfil || {}), id: a.slug, nome: a.nome, cargo: a.cargo, setor: a.setor, modelo: a.modelo || 'character-female-a',
    turno: a.turno && a.turno.inicio ? a.turno : {dias: [0, 1, 2, 3, 4, 5, 6], inicio: '08:00', fim: '18:00'}, rotinas: [], faz: (a.perfil || {}).faz || a.funcoes || [], hobbies: (a.perfil || {}).hobbies || [], bio: (a.perfil || {}).bio || '', instrucoes: (a.perfil || {}).instrucoes || ''}));
  const fone = soDigitos(emp.whatsapp), sec = funcionarios.find(f => f.setor === 'secretaria') || funcionarios[0];
  const cfg = {fuso: 'America/Cuiaba', setores: SETORES, funcionarios,
    empresa: {nome: emp.nome, sobre: emp.sobre || '', oferece: emp.oferece || [], site: emp.site || '', secretaria: sec && sec.id,
      ...(fone.length >= 10 ? {comercial: {nome: 'Comercial', whatsapp: fone.length <= 11 ? '55' + fone : fone, exibicao: exibirFone(fone)}} : {})},
    reunioes: funcionarios.length > 1 ? [{id: 'alinhamento', nome: 'Alinhamento e estratégia', hora: '08:00', dias: [1, 2, 3, 4, 5], participantes: funcionarios.slice(0, 6).map(f => f.id),
      foco: 'Alinhar o dia: o que foi feito, o que falhou e por quê, recados da recepção e ideias para a empresa crescer.'}] : []};
  const lista = usuarios.map(u => ({email: String(u.email).toLowerCase(), nome: u.nome, hash: u.hash, papel: u.papel}));
  const ativo = () => emp.status === 'ativa' && (emp.plano !== 'teste' || !emp.teste_ate || Date.now() < new Date(emp.teste_ate).getTime());
  return {cfg, X: {slug: emp.slug, estado, usuarios: () => lista, liberado: ativo,
    plano: () => ({plano: emp.plano, status: emp.status, ate: emp.teste_ate ? new Date(emp.teste_ate).getTime() : null, liberado: ativo()}), ...extras}};
}

function fake(arquivo) {
  let dados = {}; try { if (arquivo) dados = JSON.parse(readFileSync(arquivo, 'utf8')); } catch (e) { console.error('REPO_FAKE inválido:', e.message); }
  const estados = {};
  return {tipo: arquivo ? 'arquivo de teste' : 'desligado (sem DATABASE_URL)',
    async carregar(slug) { const e = dados[slug]; if (!e) return null;
      return montar({slug, ...e.empresa}, e.usuarios || [], e.agentes || [], estados[slug] || null, {salvar: st => { estados[slug] = JSON.parse(JSON.stringify(st)); }, uso() {}}); }};
}

function neon(url) {
  const host = new URL(url).hostname, alvos = [`https://api.${host.split('.').slice(1).join('.')}/sql`, `https://${host}/sql`]; let alvo = 0;
  const texto = v => v == null ? null : typeof v === 'string' ? v : typeof v === 'object' ? JSON.stringify(v) : String(v);
  const tipo = {16: v => v === 't' || v === 'true', 20: Number, 21: Number, 23: Number, 114: JSON.parse, 3802: JSON.parse, 1184: v => v.replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00')};
  async function q(sql, params = []) {
    for (let t = 0; ; t++) {
      try {
        const r = await fetch(alvos[alvo], {method: 'POST', signal: AbortSignal.timeout(15000), body: JSON.stringify({query: sql, params: params.map(texto)}),
          headers: {'Neon-Connection-String': url, 'Neon-Raw-Text-Output': 'true', 'Neon-Array-Mode': 'false', 'Content-Type': 'application/json'}});
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(`HTTP ${r.status} ${j.message || ''}`);
        const conv = (j.fields || []).map(f => [f.name, tipo[f.dataTypeID]]);
        return (j.rows || []).map(row => { for (const [n, fn] of conv) if (fn && row[n] != null) row[n] = fn(row[n]); return row; });
      } catch (e) { if (t === 0 && alvos.length > 1 && !/HTTP 4/.test(e.message)) { alvo = 1 - alvo; continue; } throw e; }
    }
  }
  q('select count(*)::int as n from empresas').then(r => console.log(`Banco conectado (${alvos[alvo]}) · ${r[0].n} empresas`)).catch(e => console.error('Banco indisponível:', e.message));
  return {tipo: 'banco Neon', q,
    async carregar(slug) {
      const [emp] = await q('select * from empresas where slug = $1', [slug]); if (!emp) return null;
      const [usuarios, agentes, est] = await Promise.all([q('select email, nome, hash, papel from usuarios where empresa_id = $1', [emp.id]),
        q('select * from agentes where empresa_id = $1 and ativo order by criado_em', [emp.id]), q('select dados from estado where empresa_id = $1', [emp.id])]);
      const pend = {}; let timer = null;
      const uso = (u, modelo) => { const k = /haiku/.test(modelo || '') ? 'haiku' : 'sonnet';
        pend['chamadas_' + k] = (pend['chamadas_' + k] || 0) + 1; pend['entrada_' + k] = (pend['entrada_' + k] || 0) + (u.input_tokens || 0); pend['saida_' + k] = (pend['saida_' + k] || 0) + (u.output_tokens || 0);
        if (!timer) timer = setTimeout(async () => { timer = null; const lote = Object.entries(pend); for (const [k2] of lote) delete pend[k2];
          for (const [t, n] of lote) await q(`insert into uso (empresa_id, dia, tipo, n) values ($1, (now() at time zone 'America/Cuiaba')::date, $2, $3) on conflict (empresa_id, dia, tipo) do update set n = uso.n + excluded.n`, [emp.id, t, n]).catch(e => console.error('Uso:', e.message)); }, 30000); };
      const salvar = st => q('insert into estado (empresa_id, dados, atualizado) values ($1, $2::jsonb, now()) on conflict (empresa_id) do update set dados = excluded.dados, atualizado = now()', [emp.id, JSON.stringify(st)]).catch(e => console.error(`Estado de ${slug}:`, e.message));
      return montar(emp, usuarios, agentes, est[0] ? est[0].dados : null, {salvar, uso});
    }};
}

export function criarRepo() { return process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : fake(process.env.REPO_FAKE); }
