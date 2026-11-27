// Cadastro de uma nova empresa: dados, cenário, estilo dos agentes, equipe e conta.
(async () => {
const el = id => document.getElementById(id);
function h(tag, attrs = {}, ...kids) { const n = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') n.className = v; else if (k.startsWith('on')) n[k] = v; else if (v !== false && v != null) n.setAttribute(k, v === true ? '' : v); } kids.flat(Infinity).forEach(k => n.append(k instanceof Node ? k : document.createTextNode(k ?? ''))); return n; }
const box = el('box');
let cat; try { cat = await (await fetch('/catalogo.json')).json(); } catch { box.append(h('p', {class: 'err'}, 'Não foi possível carregar o cadastro. Recarregue a página.')); return; }

const PASSOS = ['Empresa', 'Cenário', 'Estilo', 'Equipe', 'Conta'];
const d = {nome: '', sobre: '', oferece: '', whatsapp: '', slug: '', slugManual: false, logo: '', cenario: 'moderno', estilo: 'padrao',
  agentes: Object.fromEntries(cat.agentes.map(a => [a.id, {on: !!a.obrigatorio || a.id === 'marketing', nome: a.nome, funcoes: new Set(a.funcoes.filter(f => f.padrao).map(f => f.id))}])), conta: {nome: '', email: '', senha: ''}};
let passo = 0, erro = '';
const slugDe = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

function logoArquivo(file, done) { // reduz o logo no navegador para caber no cadastro
  const im = new Image(); im.onload = () => { const k = Math.min(1, 600 / im.width, 240 / im.height), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k));
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(im.src); done(c.toDataURL('image/png')); };
  im.onerror = () => done(''); im.src = URL.createObjectURL(file);
}
function campo(rot, chave, attrs = {}, obj = d) { const i = h(attrs.linhas ? 'textarea' : 'input', {type: attrs.type || 'text', maxlength: attrs.max || 120, placeholder: attrs.ph || '', autocomplete: attrs.ac || 'off', rows: attrs.linhas});
  i.value = obj[chave]; i.oninput = () => { obj[chave] = i.value; if (attrs.on) attrs.on(i); }; return h('label', {}, rot, i); }

const telas = [
  () => { const end = h('input', {type: 'text', maxlength: 40}); end.value = d.slug; end.oninput = () => { d.slug = slugDe(end.value); d.slugManual = true; };
    const prev = h('div', {class: 'logo'}), up = h('input', {type: 'file', accept: 'image/png,image/jpeg'});
    const mostra = () => prev.replaceChildren(...(d.logo ? [h('img', {src: d.logo, alt: 'Logo enviado'}), h('button', {class: 'ghost', type: 'button', onclick: () => { d.logo = ''; mostra(); }}, 'Remover')] : [up]));
    up.onchange = () => up.files[0] && logoArquivo(up.files[0], u => { if (u.length > 110000) { erro = 'Esse logo é pesado demais. Use uma imagem mais simples.'; render(); return; } d.logo = u; mostra(); }); mostra();
    return [h('h2', {}, 'Sobre a sua empresa'), h('p', {class: 'sub'}, 'É o que a recepcionista vai saber para atender quem chega.'),
      h('div', {class: 'two'}, campo('Nome da empresa', 'nome', {max: 60, on: () => { if (!d.slugManual) { d.slug = slugDe(d.nome); end.value = d.slug; } }}), campo('WhatsApp do Comercial (com DDD)', 'whatsapp', {type: 'tel', max: 20, ph: '(65) 99999-0000'})),
      campo('O que a empresa faz, em duas ou três frases', 'sobre', {linhas: 3, max: 600}), campo('O que ela oferece (um item por linha)', 'oferece', {linhas: 4, max: 900, ph: 'Ex.: Bolos sob encomenda'}),
      h('div', {class: 'two'}, h('label', {}, 'Endereço do escritório', end, h('p', {class: 'hint'}, 'Fica assim: ' + location.host + '/e/seu-endereco')), h('label', {}, 'Logo (opcional). Sem logo, o letreiro usa o nome.', prev))]; },
  () => [h('h2', {}, 'Escolha o cenário'), h('p', {class: 'sub'}, 'É a recepção que os visitantes veem. Dá para trocar depois.'),
    h('div', {class: 'grid3'}, cat.cenarios.map(c => h('button', {class: 'pick', type: 'button', 'aria-pressed': d.cenario === c.id, onclick: () => { d.cenario = c.id; render(); }},
      h('img', {src: `/cat/cenario-${c.id}.jpg`, alt: 'Recepção no estilo ' + c.nome}), h('div', {class: 'tx'}, h('b', {}, c.nome), h('span', {}, c.descricao)))))],
  () => [h('h2', {}, 'Estilo dos agentes'), h('p', {class: 'sub'}, 'Como a sua equipe aparece no escritório.'),
    h('div', {class: 'grid2'},
      h('button', {class: 'pick', type: 'button', 'aria-pressed': d.estilo === 'padrao', onclick: () => { d.estilo = 'padrao'; render(); }}, h('img', {src: '/cat/estilo-padrao.jpg', alt: 'Agentes no estilo padrão'}),
        h('div', {class: 'tx'}, h('b', {}, 'Padrão'), h('span', {}, 'Personagens prontos, simpáticos e leves. Disponíveis na hora.'), h('div', {}, h('span', {class: 'tagp'}, 'Incluído no plano')))),
      h('button', {class: 'pick', type: 'button', 'aria-pressed': d.estilo === 'ultra', onclick: () => { d.estilo = 'ultra'; render(); }}, h('img', {src: '/cat/estilo-ultra.jpg', alt: 'Agente no estilo ultra realista'}),
        h('div', {class: 'tx'}, h('b', {}, 'Ultra realista'), h('span', {}, 'Personagens feitos sob medida para a sua empresa pela equipe da Venus, com rosto, roupa e movimentos próprios.'), h('div', {}, h('span', {class: 'tagp g'}, 'Sob orçamento'))))),
    d.estilo === 'ultra' ? h('p', {class: 'hint', style: 'margin-top:12px'}, 'Seu escritório começa com os personagens padrão. A equipe da Venus entra em contato para combinar os personagens sob medida e o valor.') : ''],
  () => [h('h2', {}, 'Monte a sua equipe'), h('p', {class: 'sub'}, 'Ligue os agentes que quiser e marque o que cada um faz. Eles preparam rascunhos e respostas; nada é enviado sem alguém da sua equipe aprovar.'),
    h('div', {style: 'display:grid;gap:12px'}, cat.agentes.map(a => { const s = d.agentes[a.id];
      const nome = h('input', {type: 'text', maxlength: 40, style: 'max-width:240px'}); nome.value = s.nome; nome.oninput = () => { s.nome = nome.value; };
      const liga = h('input', {type: 'checkbox', disabled: !!a.obrigatorio}); liga.checked = s.on; liga.onchange = () => { s.on = liga.checked; render(); };
      return h('div', {class: 'ag' + (s.on ? ' on' : '')}, h('img', {src: `/cat/${a.modelo}.png`, alt: ''}),
        h('div', {}, h('div', {class: 'top'}, h('div', {}, h('h3', {}, a.cargo), h('p', {}, a.resumo)), h('label', {class: 'sw', style: 'margin:0'}, liga, a.obrigatorio ? 'Sempre incluída' : 'Incluir')),
          s.on ? [h('label', {style: 'margin-top:0'}, 'Nome', nome), a.funcoes.map(f => { const c = h('input', {type: 'checkbox'}); c.checked = s.funcoes.has(f.id); c.onchange = () => { c.checked ? s.funcoes.add(f.id) : s.funcoes.delete(f.id); }; return h('label', {class: 'chk'}, c, f.nome); })] : '')); }))],
  () => [h('h2', {}, 'Sua conta'), h('p', {class: 'sub'}, 'Com ela você entra no escritório como membro da equipe.'),
    h('div', {class: 'two'}, campo('Seu nome', 'nome', {max: 60, ac: 'name'}, d.conta), campo('E-mail', 'email', {type: 'email', ac: 'email'}, d.conta)),
    campo('Crie uma senha (mínimo de 8 caracteres)', 'senha', {type: 'password', max: 100, ac: 'new-password'}, d.conta),
    h('p', {class: 'hint', style: 'margin-top:14px'}, 'Você começa com um período de teste. Os dados informados são usados só para criar e operar o seu escritório.')]
];
async function valida() {
  if (passo === 0) { if (d.nome.trim().length < 2) return 'Informe o nome da empresa.'; if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(d.slug)) return 'O endereço precisa ter de 3 a 40 letras minúsculas, números ou hífen.';
    try { const r = await (await fetch('/api/cadastro?slug=' + encodeURIComponent(d.slug))).json(); if (r.slug === false) return 'Esse endereço já está em uso. Escolha outro.'; } catch {} }
  if (passo === 3 && !Object.values(d.agentes).some(a => a.on)) return 'Inclua pelo menos a recepcionista.';
  if (passo === 4) { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.conta.email.trim())) return 'Informe um e-mail válido.'; if (d.conta.senha.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.'; }
  return '';
}
async function enviar(btn) {
  btn.disabled = true; btn.textContent = 'Criando o escritório…';
  const corpo = {empresa: {nome: d.nome, sobre: d.sobre, oferece: d.oferece.split('\n').map(x => x.trim()).filter(Boolean), whatsapp: d.whatsapp, slug: d.slug, cenario: d.cenario, estilo: d.estilo, logo: d.logo},
    agentes: cat.agentes.filter(a => d.agentes[a.id].on).map(a => ({catalogo: a.id, nome: d.agentes[a.id].nome, funcoes: [...d.agentes[a.id].funcoes]})), conta: d.conta};
  try { const r = await fetch('/api/cadastro', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(corpo)}), j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.erro || 'Não foi possível concluir o cadastro.');
    el('steps').hidden = true; box.replaceChildren(h('div', {class: 'done'}, h('h2', {}, 'Seu escritório está no ar'), h('p', {class: 'sub'}, 'Entre na recepção e clique em "Sou da equipe" para acessar com o e-mail e a senha que você criou.'),
      h('p', {}, h('a', {class: 'cta', href: j.url, style: 'text-decoration:none;display:inline-block'}, 'Abrir o meu escritório →')), h('p', {class: 'hint'}, 'Endereço para divulgar: ' + location.origin + j.url)));
  } catch (e) { erro = e.message; render(); }
}
function render() {
  el('steps').replaceChildren(...PASSOS.map((p, i) => h('li', {class: i === passo ? 'on' : i < passo ? 'ok' : ''}, `${i + 1}. ${p}`)));
  const fim = passo === PASSOS.length - 1, av = h('button', {class: 'cta', type: 'button'}, fim ? 'Criar meu escritório' : 'Continuar →');
  av.onclick = async () => { erro = await valida(); if (erro) return render(); if (fim) return enviar(av); passo++; render(); scrollTo(0, 0); };
  box.replaceChildren(...telas[passo]().flat().filter(Boolean), h('p', {class: 'err', role: 'alert'}, erro),
    h('div', {class: 'row'}, passo ? h('button', {class: 'ghost', type: 'button', onclick: () => { erro = ''; passo--; render(); }}, '← Voltar') : h('span', {}), av));
  erro = '';
}
render();
})();
