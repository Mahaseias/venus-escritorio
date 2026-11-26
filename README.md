# Escritório Venus
Node 20+ e Python 3 (somente na máquina do Claude Code). A página acompanha os agentes que você já executa. Visita demonstrativa é uma simulação opcional por visitante. Cada sala agrega sessões do mesmo setor.

## Publicar
Extraia o ZIP e envie os arquivos a um repositório, com render.yaml na raiz. No Render escolha New → Blueprint, conecte o repositório e aplique a configuração. Abra a URL HTTPS atribuída ao serviço. O plano gratuito pode hibernar. Estado transitório em memória para uma instância, reiniciado a cada deploy. Sem banco de dados.

## Conectar agentes
Na máquina que inicia Claude Code, configure VENUS_URL como a URL HTTPS do serviço, OFFICE_TOKEN com o valor gerado na aba Environment do Render e VENUS_ROLE com secretaria, marketing ou dev, conforme a sessão. Reinicie Claude Code nesse ambiente. Use uma variável por processo se rodar papéis diferentes na mesma máquina. Para subagentes, VENUS_AGENT_MAP aceita JSON, por exemplo {"analista-marketing":"marketing","desenvolvedor":"dev","secretaria":"secretaria"}. Use os nomes reais de agent_type. Os três IDs de sala são fixos nesta versão.

Mescle a chave hooks de hooks.example.json nas configurações .claude/settings.local.json do projeto, preservando os hooks existentes. Substitua o comando pelo executável Python disponível e caminho absoluto do hook.py. Em Windows use barras normais no caminho e mantenha as aspas. Confirme os hooks em /hooks no Claude Code. Dispare uma tarefa em uma sessão com papel configurado e observe a sala. Stop ou SessionEnd libera a sessão; subagentes usam SubagentStart e SubagentStop. Após dez minutos sem eventos a presença expira, inclusive durante tarefas longas silenciosas. Atualização pública a cada cinco segundos. Falhas de telemetria não bloqueiam a tarefa após o timeout da chamada.

## Incorporar no site
Substitua a URL no trecho abaixo. Se o site tiver uma política CSP, autorize a origem do escritório em frame-src.
~~~html
<iframe src="https://SEU-SERVICO.onrender.com/" title="Escritório virtual da Venus Tecnologia" width="100%" height="640" loading="lazy" style="border:0;border-radius:16px"></iframe>
~~~
Somente o servidor e o adaptador recebem o token. O site público consulta cargos e presença. O adaptador envia setor, identificador derivado da sessão e indicador de atividade. Nenhum prompt, comando, nome de cliente ou transcrição é enviado.

## Executar localmente
Defina OFFICE_TOKEN no ambiente e execute node server.mjs. Abra http://localhost:3000. Use essa URL como VENUS_URL em testes locais.
