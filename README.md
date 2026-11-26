# Escritório virtual da Venus

Escritório em 3D (three.js) que mostra os agentes de IA da Venus trabalhando. Arraste para girar a câmera e role para aproximar. Cada funcionário tem perfil, turno e mesa. Quem tem acesso pode clicar num funcionário e mandar uma tarefa, que um PC ligado executa com o Claude Code.

```
Navegador ──► Render (server.mjs) ◄── worker no PC de casa ──► claude -p
                 ▲                                   │
                 └──── hooks (hook.py) ◄─────────────┘   (o boneco senta e digita)
```

Sem dependências: Node 20+ no servidor e no worker, e Python 3 só para o hook.

## 1. Render

Variáveis de ambiente (aba **Environment** do serviço):

| Variável | O que é |
|---|---|
| `OFFICE_TOKEN` | Gerada pelo Render. É a senha do worker e dos hooks. |
| `SESSION_SECRET` | Gerada pelo Render. Assina o cookie de login. |
| `OFFICE_USERS` | Lista de quem pode entrar e mandar tarefas (veja abaixo). |
| `STATE_FILE` | Opcional. Caminho de um arquivo para guardar fila e histórico, ex.: `/data/state.json`. |
| `NOTION_TOKEN` | Token de uma integração interna do Notion com acesso à base "Atividades do escritório". Sem ele, a agenda aparece só pelos horários, sem confirmar se a rotina rodou. |
| `TASK_TIMEOUT_MIN` | Opcional (padrão 90). Depois desse tempo sem resposta, a tarefa vira "erro". |

**Persistência:** sem `STATE_FILE` em disco persistente, a fila e o histórico zeram a cada deploy ou reinício. No plano gratuito do Render não existe disco persistente. Para manter o histórico, use o plano Starter, adicione um Disk montado em `/data` e defina `STATE_FILE=/data/state.json`.

## 2. Quem pode mandar tarefas

Rode uma vez para cada pessoa (no seu PC, dentro da pasta do projeto):

```bash
node scripts/gerar-senha.mjs mahaseias@venustecnologia.com.br "Mahaseias" "uma-senha-forte"
node scripts/gerar-senha.mjs guilherme@... "Guilherme" "outra-senha"
node scripts/gerar-senha.mjs amanda@... "Amanda" "outra-senha"
```

Junte as três linhas num array e cole em `OFFICE_USERS`:

```json
[{"email":"...","nome":"Mahaseias","hash":"scrypt$..."},{"email":"...","nome":"Guilherme","hash":"scrypt$..."},{"email":"...","nome":"Amanda","hash":"scrypt$..."}]
```

A senha em si nunca fica salva, só o hash. Visitantes sem login veem o escritório e os perfis, mas não as tarefas.

## 3. Funcionários e turnos

Edite `public/agents.json`. Cada funcionário tem:

- `setor`: `secretaria`, `marketing` ou `dev` (define a sala e a cor).
- `turno`: `dias` (0 = domingo … 6 = sábado), `inicio` e `fim` no fuso de Cuiabá. Turnos que passam da meia-noite funcionam (ex.: 18:00–06:00).
- `bio`, `faz`, `hobbies`, `aparencia` (cores de cabelo e pele): aparecem na ficha.
- `instrucoes`: o "jeito de trabalhar" que o worker envia ao Claude junto com cada tarefa.

Até 3 funcionários por sala. Fora do turno o boneco vai embora, e tarefas enviadas nesse período ficam na fila até ele voltar.

## 3.1 Rotinas (tarefas agendadas)

Cada funcionário tem `rotinas` no `agents.json` (id, nome, dias, horas). As tarefas agendadas da Venus rodam na nuvem e registram início e fim na base **Atividades do escritório** do Notion (Venus Tecnologia → Documentação). O servidor lê essa base a cada minuto e:

- mostra o funcionário trabalhando enquanto a rotina está em "Fazendo";
- monta a **Agenda de hoje** na ficha (Concluída, Fazendo, Erro, Próxima, Não rodou), com o resumo de cada execução.

Para ligar: em notion.so/profile/integrations crie uma integração interna, copie o token, abra a base "Atividades do escritório" → ••• → Conexões → adicione a integração, e cole o token em `NOTION_TOKEN` no Render.

## 3.2 Fila e prioridade

Tarefas enviadas pela ficha entram na fila do funcionário. Na ficha, ▲ ▼ mudam a ordem e ⤒ coloca a tarefa em primeiro. O worker sempre executa a primeira da fila de quem está no turno.

## 4. Worker no PC de casa

Pré-requisitos: Node 20+ e Claude Code instalado e logado (`claude` funcionando no terminal).

1. Copie esta pasta para o PC (ou faça `git clone`).
2. Copie `worker/config.example.json` para `worker/config.json` e preencha:
   - `token`: o `OFFICE_TOKEN` do Render.
   - `setores.*.pasta`: a pasta de trabalho de cada setor. Ali você pode colocar um `CLAUDE.md` com contexto daquele setor, arquivos de referência, etc.
   - `args`: permissões do Claude Code. O padrão `--permission-mode acceptEdits` deixa editar arquivos na pasta do setor. Para liberar comandos, use `--allowedTools` (veja o exemplo do `dev`). Libere só o necessário.
3. Teste: `node worker/venus-worker.mjs`. Deve aparecer "Worker Venus ligado…", e no escritório (logado) o selo **Worker online**.

**Deixar rodando sempre:**

- **Windows:** abra o Agendador de Tarefas e crie uma tarefa com o disparador "Ao fazer logon" (ou "Ao iniciar o computador"). Em Ação, use o programa `node` com o argumento `C:\caminho\venus-escritorio\worker\venus-worker.mjs`. Em Configurações, marque "Se a tarefa falhar, reiniciar a cada 1 minuto".
- **Linux:** crie um serviço `systemd --user` com `ExecStart=/usr/bin/node /caminho/worker/venus-worker.mjs` e `Restart=always`.

Para não dormir: desative a suspensão automática do PC.

## 5. Hooks (animação em tempo real)

O worker já marca o funcionário como "trabalhando" enquanto executa a tarefa. Os hooks deixam a animação fiel ao que o Claude está fazendo, e também mostram sessões que você abre manualmente.

1. Mescle a chave `hooks` de `hooks.example.json` em `~/.claude/settings.json` (vale para todas as pastas). Troque o comando pelo caminho absoluto do `hook.py`. No Windows, use barras normais e mantenha as aspas.
2. Nas sessões abertas pelo worker, `VENUS_URL`, `OFFICE_TOKEN`, `VENUS_ROLE` e `VENUS_STAFF` já vêm preenchidas.
3. Para uma sessão manual aparecer no escritório, defina `VENUS_URL`, `OFFICE_TOKEN` e `VENUS_ROLE` (e opcionalmente `VENUS_STAFF=rafael`, por exemplo) antes de abrir o Claude Code. Sem `VENUS_ROLE`, o hook não envia nada.

O hook envia só o setor, o funcionário, um identificador anônimo da sessão e se está ativo. Nenhum prompt, comando ou arquivo sai pelo hook.

## 6. Segurança

- O texto da tarefa vai para o Claude pela entrada padrão, nunca pela linha de comando.
- Login com cookie `HttpOnly` assinado, limite de tentativas e bloqueio de requisições de outros sites.
- `worker/config.json` está no `.gitignore` porque contém o token. Nunca o envie ao GitHub.
- Se o token vazar, gere outro no Render (Environment → OFFICE_TOKEN) e atualize o `config.json`.

## Incorporar no site

```html
<iframe src="https://escritorio.venustecnologia.com.br/" title="Escritório virtual da Venus Tecnologia" width="100%" height="720" loading="lazy" style="border:0;border-radius:16px"></iframe>
```

## Cena 3D

- `public/office3d.js`: cena, luz (dia/noite pelo horário de Cuiabá; `?dia` / `?noite` para testar), móveis e personagens animados.
- `public/app.js`: planta (salas, portas), lista de móveis (`F('modelo', x, y, {...})`) e pontos de parada. A grade de caminhada sai dessa mesma lista.
- `agents.json`: o campo `modelo` escolhe o boneco de cada funcionário (arquivos em `public/models/c`).
- Créditos: modelos 3D de Kenney (kenney.nl), licença CC0; motor three.js, licença MIT (em `public/vendor`).

## Rodar localmente

```bash
OFFICE_TOKEN=teste node server.mjs   # http://localhost:3000
```
