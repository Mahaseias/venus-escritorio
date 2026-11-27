// Abertura de um novo escritório: uma conversa guiada, com a recepção sendo montada ao vivo atrás.
window.R3D_OPCOES = {deslocar: .17, subir: .2};
(async () => {
const el = id => document.getElementById(id), stage = el('stage'), veil = el('veil');
const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
function h(tag, attrs = {}, ...kids) { const n = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') n.className = v; else if (k.startsWith('on')) n[k] = v; else if (v !== false && v != null) n.setAttribute(k, v === true ? '' : v); } kids.flat(Infinity).forEach(k => n.append(k instanceof Node ? k : document.createTextNode(k ?? ''))); return n; }
let cat; try { cat = await (await fetch('/catalogo.json')).json(); } catch { stage.append(h('p', {class: 'err'}, 'Não foi possível carregar. Recarregue a página.')); return; }

const d = {nome: '', sobre: '', oferece: [], whatsapp: '', slug: '', slugManual: false, logo: '', cenario: 'moderno', estilo: 'padrao',
  agentes: Object.fromEntries(cat.agentes.map(a => [a.id, {on: !!a.obrigatorio || a.id === 'marketing', nome: a.nome, funcoes: new Set(a.funcoes.filter(f => f.padrao).map(f => f.id))}])), conta: {nome: '', email: '', senha: ''}};
const slugDe = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
const primeiro = t => t.trim().split(/\s+/)[0] || '';
const recep = cat.agentes.find(a => a.obrigatorio);
function esc(t) { return t.replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c])); }

/* ---------- a recepção ao vivo ---------- */
const R = () => window.R3D && window.R3D.setEstilo ? window.R3D : null;
function cena() { const r = R(); if (!r) return; r.setEstilo(d.cenario); if (d.logo) r.setLogo(d.logo); else r.setEmpresa(d.nome.trim() || 'SUA EMPRESA');
  r.setModel(d.estilo === 'ultra' ? 'livia' : recep.modelo); el('rtagn').textContent = d.estilo === 'ultra' ? 'Recepcionista sob medida' : primeiro(d.agentes[recep.id].nome) + ' · recepção'; r.start(); }
addEventListener('r3d-ready', cena); let cenaT = 0; const cenaLogo = () => { clearTimeout(cenaT); cenaT = setTimeout(cena, 120); };

/* ---------- peças da conversa ---------- */
function linha(chave, attrs = {}, obj = d) { const i = h(attrs.linhas ? 'textarea' : 'input', {class: 'line', type: attrs.linhas ? null : attrs.type || 'text', maxlength: attrs.max || 120, placeholder: attrs.ph || '', autocomplete: attrs.ac || 'off', rows: attrs.linhas, 'aria-label': attrs.ph || ''});
  i.value = obj[chave]; i.oninput = () => { obj[chave] = i.value; if (attrs.on) attrs.on(i); }; return i; }
function cartoes(cls, itens, atual, escolher) { return h('div', {class: 'cards ' + cls}, itens.map(c => h('button', {class: 'card', type: 'button', 'aria-pressed': atual() === c.id, onclick: e => { const b = e.currentTarget; escolher(c.id); b.parentNode.querySelectorAll('.card').forEach(x => x.setAttribute('aria-pressed', x === b)); cena(); }},
  c.selo ? h('span', {class: 'badge' + (c.ouro ? ' gold' : '')}, c.selo) : '', h('img', {src: c.img, alt: c.alt || ''}), h('div', {class: 'tx'}, h('b', {}, c.nome), h('span', {}, c.descricao))))); }
function logoArquivo(file, done) { const im = new Image(); im.onload = () => { const k = Math.min(1, 600 / im.width, 240 / im.height), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k));
  c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(im.src); done(c.toDataURL('image/png')); }; im.onerror = () => done(''); im.src = URL.createObjectURL(file); }

/* ---------- os momentos ---------- */
const N = () => d.nome.trim() || 'sua empresa';
const passos = [
  {luz: .78, fala: () => 'Toda empresa merece uma recepção que <em>nunca fecha</em>.', sub: 'Em poucos minutos a sua ganha uma: alguém para receber quem chega ao site e uma equipe de agentes de IA para ajudar no dia a dia. Vamos montar juntos?', botao: 'Começar', corpo: () => []},
  {luz: .5, fala: () => 'Primeiro, o nome que vai para a parede. Como se chama a sua empresa?', corpo: () => [linha('nome', {max: 60, ph: 'Nome da empresa', on: () => { if (!d.slugManual) d.slug = slugDe(d.nome); cenaLogo(); }}), h('p', {class: 'mini'}, 'Olhe para a parede enquanto digita.')],
    valida: () => d.nome.trim().length < 2 ? 'Me diga o nome da empresa para eu colocar na parede.' : ''},
  {luz: .42, fala: () => `Prazer, <em>${esc(N())}</em>. Em duas ou três frases, o que vocês fazem?`, sub: 'É o que a recepcionista vai saber para apresentar a empresa a quem chega.', corpo: () => [linha('sobre', {linhas: 3, max: 600, ph: 'Ex.: Somos uma oficina especializada em…'})], pular: true},
  {luz: .38, fala: () => 'E o que vocês oferecem?', sub: 'Escreva um item e aperte Enter. Pode colocar quantos quiser.', corpo: () => { const lista = h('div', {class: 'chips'}), i = h('input', {class: 'line', type: 'text', maxlength: 120, placeholder: 'Ex.: Troca de óleo', 'aria-label': 'Item oferecido'});
      const pinta = () => lista.replaceChildren(...d.oferece.map((t, k) => h('span', {class: 'chip'}, t, h('button', {type: 'button', 'aria-label': 'Remover ' + t, onclick: () => { d.oferece.splice(k, 1); pinta(); }}, '×'))));
      i.onkeydown = e => { if (e.key === 'Enter' && i.value.trim()) { e.preventDefault(); e.stopPropagation(); if (d.oferece.length < 8) d.oferece.push(i.value.trim().slice(0, 120)); i.value = ''; pinta(); } }; pinta(); return [i, lista]; },
    sair: () => { const i = stage.querySelector('input.line'); if (i && i.value.trim() && d.oferece.length < 8) d.oferece.push(i.value.trim().slice(0, 120)); }, pular: true},
  {luz: .12, largo: true, fala: () => `Agora o clima. Qual destes tem a cara da <em>${esc(N())}</em>?`, sub: 'Toque em um e veja a recepção mudar.', corpo: () => [cartoes('c3', cat.cenarios.map(c => ({...c, img: `/cat/cenario-${c.id}.jpg`, alt: 'Recepção no estilo ' + c.nome})), () => d.cenario, v => { d.cenario = v; })]},
  {luz: .1, fala: () => 'Tem um logo? Ele vai direto para a parede.', sub: 'Se preferir, deixamos só o nome, como já está.', corpo: () => { const up = h('input', {type: 'file', accept: 'image/png,image/jpeg', hidden: true}), caixa = h('label', {class: 'drop'}), tira = h('button', {class: 'skip', type: 'button', hidden: !d.logo, onclick: () => { d.logo = ''; cena(); pinta(); }}, 'Tirar o logo e usar só o nome');
      const pinta = () => { tira.hidden = !d.logo; const b = stage.querySelector('.go'); if (b) b.textContent = d.logo ? 'Continuar' : 'Usar só o nome'; caixa.replaceChildren(up, ...(d.logo ? [h('img', {src: d.logo, alt: 'Logo enviado'}), h('span', {}, 'Ficou bom? Toque para trocar.')] : [h('span', {style: 'font-size:26px'}, '＋'), h('span', {}, 'Escolher a imagem do logo (PNG ou JPG)')])); };
      up.onchange = () => up.files[0] && logoArquivo(up.files[0], u => { if (!u || u.length > 110000) { erro('Esse arquivo é pesado demais. Tente uma imagem mais simples.'); return; } d.logo = u; pinta(); cena(); }); pinta(); return [caixa, tira]; }, botao: () => d.logo ? 'Continuar' : 'Usar só o nome'},
  {luz: .06, largo: true, fala: () => 'Quem vai estar atrás do balcão?', sub: 'Escolha o estilo da sua equipe. Dá para começar no padrão e evoluir depois.', corpo: () => [cartoes('c2', [
      {id: 'padrao', nome: 'Padrão', descricao: 'Personagens prontos, simpáticos e leves. No ar na hora.', img: '/cat/estilo-padrao.jpg', selo: 'Incluído'},
      {id: 'ultra', nome: 'Ultra realista', descricao: 'Feitos sob medida pela Venus para a sua empresa: rosto, roupa e movimentos próprios.', img: '/cat/estilo-ultra.jpg', selo: 'Sob orçamento', ouro: true}], () => d.estilo, v => { d.estilo = v; }),
    h('p', {class: 'mini'}, 'No ultra realista, seu escritório abre com os personagens padrão e a equipe da Venus chama você para criar os seus.')]},
  {luz: .04, largo: true, fala: () => 'Agora, a equipe. Quem trabalha com você?', sub: 'Ligue quem quiser e toque nas funções de cada um. Eles preparam; alguém da sua equipe sempre aprova antes de qualquer coisa sair.', corpo: () => [h('div', {style: 'display:grid;gap:10px'}, cat.agentes.map((a, k) => { const s = d.agentes[a.id], card = h('div', {class: 'ag' + (s.on ? ' on' : ''), style: `animation-delay:${k * 70}ms`});
      const pinta = () => { const tg = h('input', {type: 'checkbox', class: 'tg', disabled: !!a.obrigatorio, 'aria-label': 'Incluir ' + a.cargo}); tg.checked = s.on; tg.onchange = () => { s.on = tg.checked; card.className = 'ag' + (s.on ? ' on' : ''); card.style.animation = 'none'; pinta(); };
        const nm = h('input', {class: 'nm', type: 'text', maxlength: 40, 'aria-label': 'Nome de ' + a.cargo}); nm.value = s.nome; nm.oninput = () => { s.nome = nm.value; if (a.obrigatorio) cenaLogo(); };
        card.replaceChildren(h('img', {src: `/cat/${a.modelo}.png`, alt: ''}), h('div', {}, h('h3', {}, a.cargo), h('p', {}, a.resumo)), tg,
          s.on ? h('div', {class: 'more'}, nm, h('div', {class: 'fn'}, a.funcoes.map(f => h('button', {type: 'button', 'aria-pressed': s.funcoes.has(f.id), onclick: e => { const b = e.currentTarget; s.funcoes.has(f.id) ? s.funcoes.delete(f.id) : s.funcoes.add(f.id); b.setAttribute('aria-pressed', s.funcoes.has(f.id)); }}, f.nome)))) : ''); };
      pinta(); return card; }))]},
  {luz: .04, fala: () => 'Quando alguém quiser falar com uma pessoa, para qual WhatsApp eu mando?', sub: 'A recepcionista oferece esse número a quem pedir orçamento ou atendimento.', corpo: () => [linha('whatsapp', {type: 'tel', max: 20, ph: '(00) 00000-0000', ac: 'tel'})], pular: true},
  {luz: 0, fala: () => 'Falta só a chave da porta: <em>a sua conta</em>.', sub: 'É com ela que você entra no escritório como membro da equipe.', corpo: () => { const end = h('input', {type: 'text', maxlength: 40, 'aria-label': 'Endereço do escritório'}); end.value = d.slug; end.oninput = () => { d.slug = slugDe(end.value); d.slugManual = true; };
      return [h('span', {class: 'lbl'}, 'Seu nome'), linha('nome', {max: 60, ac: 'name', ph: 'Como podemos chamar você'}, d.conta), h('span', {class: 'lbl'}, 'E-mail'), linha('email', {type: 'email', ac: 'email', ph: 'voce@empresa.com.br'}, d.conta),
        h('span', {class: 'lbl'}, 'Senha'), linha('senha', {type: 'password', max: 100, ac: 'new-password', ph: 'Mínimo de 8 caracteres'}, d.conta), h('span', {class: 'lbl'}, 'Endereço do seu escritório'), h('div', {class: 'addr'}, location.host + '/e/', end)]; },
    botao: 'Abrir as portas', valida: async () => { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.conta.email.trim())) return 'Preciso de um e-mail válido para criar a sua conta.'; if (d.conta.senha.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
      if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(d.slug)) return 'O endereço precisa ter de 3 a 40 letras minúsculas, números ou hífen.';
      try { const r = await (await fetch(`/api/cadastro?slug=${encodeURIComponent(d.slug)}&email=${encodeURIComponent(d.conta.email.trim())}`)).json(); if (r.slug === false) return 'Esse endereço já está em uso. Mude um pouco e tente de novo.'; if (r.email === false) return 'Já existe uma conta com esse e-mail.'; } catch {} return ''; }, fim: true}
];

/* ---------- condução ---------- */
let passo = 0, ocupado = false;
function erro(t) { const e = stage.querySelector('.err'); if (e) e.textContent = t; }
function escreve(h1, html, depois) { // a fala aparece aos poucos, como alguém falando
  if (calmo) { h1.innerHTML = html; return depois(); }
  const tmp = document.createElement('div'); tmp.innerHTML = html; const total = tmp.textContent.length; let n = 0, fim = false;
  const corta = (no, st) => { for (const c of [...no.childNodes]) { if (c.nodeType === 3) { if (st.f <= 0) c.remove(); else if (c.textContent.length > st.f) { c.textContent = c.textContent.slice(0, st.f); st.f = 0; } else st.f -= c.textContent.length; } else if (st.f <= 0) c.remove(); else corta(c, st); } };
  const acaba = () => { if (fim) return; fim = true; clearInterval(t); h1.innerHTML = html; depois(); };
  const t = setInterval(() => { n += 3; if (n >= total) return acaba(); const copia = tmp.cloneNode(true); corta(copia, {f: n}); h1.innerHTML = copia.innerHTML; }, 18);
  h1.onclick = acaba;
}
function mostra() {
  const p = passos[passo]; veil.style.opacity = p.luz; el('bar').style.width = (passo / passos.length * 100) + '%'; stage.classList.toggle('wide', !!p.largo);
  const h1 = h('h1', {}), corpo = h('div', {class: 'body wait'}), rot = typeof p.botao === 'function' ? p.botao() : p.botao || 'Continuar';
  corpo.append(...[p.sub ? h('p', {class: 'sub'}, p.sub) : '', ...p.corpo().flat(), h('p', {class: 'err', role: 'alert'}),
    h('div', {class: 'nav'}, h('button', {class: 'go', type: 'button', onclick: () => ir(1)}, rot), p.pular ? h('button', {class: 'skip', type: 'button', onclick: () => ir(1, true)}, 'Pular por enquanto') : '', passo > 0 ? h('button', {class: 'back', type: 'button', onclick: () => ir(-1)}, '← Voltar') : '')].filter(Boolean));
  stage.replaceChildren(h('div', {class: 'turn'}, h('div', {class: 'who'}, h('i', {}), 'Venus · montando o seu escritório'), h1, corpo)); stage.scrollTop = 0;
  escreve(h1, p.fala(), () => { corpo.classList.remove('wait'); const f = corpo.querySelector('.line'); if (f && innerWidth > 860) setTimeout(() => { if (!stage.contains(document.activeElement) || document.activeElement.tagName === 'BUTTON') f.focus(); }, 350); });
}
async function ir(delta, pulando) {
  if (ocupado) return; const p = passos[passo];
  if (delta > 0) { if (p.sair) p.sair(); if (!pulando && p.valida) { ocupado = true; const e = await p.valida(); ocupado = false; if (e) return erro(e); } if (p.fim) return criar(); }
  const novo = Math.min(passos.length - 1, Math.max(0, passo + delta)); if (novo === passo) return;
  const t = stage.querySelector('.turn'); if (t && !calmo) { ocupado = true; t.classList.add('out'); await new Promise(r => setTimeout(r, 300)); ocupado = false; }
  passo = novo; mostra(); cena();
}
addEventListener('keydown', e => { if (e.key !== 'Enter' || e.shiftKey || ocupado) return; const t = e.target; if (t.tagName === 'BUTTON' || t.tagName === 'A' || t.type === 'file' || t.type === 'checkbox') return; if (t.tagName === 'TEXTAREA' && !(e.ctrlKey || e.metaKey)) return; e.preventDefault(); ir(1); });

async function criar() {
  ocupado = true; veil.style.opacity = .55; stage.classList.remove('wide');
  const etapas = ['Acendendo as luzes da recepção', 'Colocando o nome na parede', 'Chamando a equipe', 'Destrancando a porta'], lis = etapas.map(t => h('li', {}, t));
  stage.replaceChildren(h('div', {class: 'turn'}, h('div', {class: 'who'}, h('i', {}), 'Venus · quase lá'), h('h1', {}, 'Um instante. Estou abrindo o seu escritório.'), h('ul', {class: 'build'}, lis)));
  const corpo = {empresa: {nome: d.nome, sobre: d.sobre, oferece: d.oferece, whatsapp: d.whatsapp, slug: d.slug, cenario: d.cenario, estilo: d.estilo, logo: d.logo},
    agentes: cat.agentes.filter(a => d.agentes[a.id].on).map(a => ({catalogo: a.id, nome: d.agentes[a.id].nome, funcoes: [...d.agentes[a.id].funcoes]})), conta: d.conta};
  const pedido = fetch('/api/cadastro', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(corpo)}).then(async r => ({ok: r.ok, j: await r.json().catch(() => ({}))})).catch(() => ({ok: false, j: {}}));
  for (let i = 0; i < lis.length; i++) { lis[i].classList.add('on'); await new Promise(r => setTimeout(r, calmo ? 80 : 850)); lis[i].classList.add('ok'); veil.style.opacity = .55 - (i + 1) * .13; }
  const r = await pedido; ocupado = false;
  if (!r.ok) { mostra(); erro(r.j.erro || 'Não consegui abrir o escritório agora. Tente de novo em instantes.'); return; }
  veil.style.opacity = 0; el('bar').style.width = '100%';
  const fim = h('h1', {}); fim.innerHTML = `A <em>${esc(N())}</em> está de portas abertas.`;
  stage.replaceChildren(h('div', {class: 'turn'}, h('div', {class: 'who'}, h('i', {}), 'Pronto'), fim,
    h('p', {class: 'sub'}, `${primeiro(d.agentes[recep.id].nome)} já está no balcão esperando o primeiro visitante. Para entrar como equipe, clique em "Sou da equipe" e use o e-mail e a senha que você acabou de criar.`),
    h('div', {class: 'nav'}, h('a', {class: 'go', href: r.j.url}, 'Entrar no meu escritório →')), h('p', {class: 'mini', style: 'margin-top:18px'}, 'Endereço para divulgar: ' + location.origin + r.j.url)));
}
mostra(); cena();
})();
