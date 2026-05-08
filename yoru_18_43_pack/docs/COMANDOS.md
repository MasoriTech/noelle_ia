# Comandos


## Skills / Habilidades

```txt
/skills
/habilidades
/funcoes
/capacidades
/comandos
skills
habilidades
o que você sabe fazer?
quais suas skills?
quais suas habilidades?
lista suas funções
quais comandos você tem?
```

Essas frases respondem localmente com as habilidades reais do pack, sem chamar o modelo.

## Chat

- `/fast texto`
- `/think texto`
- `/projeto texto`
- `/tecnico texto`
- `/saber texto`
- `/criativo texto`

## Voz

- `/voz status`
- `/voz on`
- `/voz off`
- `/voz edge`
- `/voz windows`
- `/testarvoz`
- `/falar texto`
- `/pararvoz`
- `/limparvoz`
- `/ouvir`
- `/stt diagnostico`

## Stream

- `/stream on`
- `/stream status`

## Navegador

- `abra youtube`
- `abra youtube e pesquise anime`
- `/site add nome https://site.com`
- `/sites`

## Memória

- `/salvar texto`
- `/exportar`


## Programas do PC / App Inventory

```txt
/apps status
/apps scan
/apps list
/apps buscar nome
/apps abrir nome
/apps arquivo
abre o programa Discord
```

Use `/apps scan` depois de instalar/remover programas para atualizar o inventário local.


## Nota 1.8.27

O detector de habilidades foi centralizado. Perguntas com pontuação, como `habilidades?` e `skills?`, também usam a resposta local de `/skills`.


## DesktopContext 1.8.28

### Tela
- `/tela capturar` - salva print da tela.
- `/tela analisar` - captura print e prepara análise futura; não finge visão real.
- `/tela pasta` - abre pasta dos prints.

### PC e modelos
- `/pc status` - sistema, Python, CPU, disco, RAM e portas.
- `/pc diagnostico` - diagnóstico maior com dependências e processos.
- `/pc portas` - portas FAST/THINK.
- `/modelo status` - status de portas/caminhos dos modelos.
- `/modelo benchmark` - orienta usar `/warmup` para chamada real.

### Arquivos e clipboard
- `/arquivos recentes` - lista arquivos recentes.
- `/arquivos buscar nome` - busca por nome nas pastas padrão.
- `/arquivos abrir ultimo zip` - abre o ZIP mais recente.
- `/arquivos organizar downloads` - prévia segura, sem mover arquivos.
- `/clip ler` - mostra texto copiado.
- `/clip resumir` - resume clipboard usando THINK.
- `/clip melhorar` - melhora texto copiado usando THINK.
- `/clip salvar nota` - salva clipboard no vault.

### Tarefas, memória e projeto
- `/tarefa adicionar texto` - adiciona tarefa local.
- `/tarefa hoje` - lista pendências.
- `/tarefa concluir 1` - conclui tarefa.
- `/memoria lembrar texto` - salva memória manual.
- `/memoria buscar termo` - busca no vault.
- `/diario texto` - salva registro rápido.
- `/projeto status` - status do projeto.
- `/projeto bugs` - pendências conhecidas.
- `/rotina modo yoru` - abre pasta do pack e mostra checklist.


## MissingSkills 1.8.29

```txt
/tela ocr
/tela ler erro
/janela list
/janela focar discord
/janela minimizar tudo
/janela fechar notepad --confirmar
/arquivos abrir nome
/arquivos organizar downloads --confirmar
/arquivos limpar cache yoru --confirmar
/clip copiar texto
/modelo api
/pc gpu
```

Fechar janelas, mover arquivos e limpar cache só acontecem com `--confirmar`.


## AvatarBridgeCore 1.8.30

```txt
/avatar status
/avatar teste
/avatar eventos
/avatar eventos 20
/avatar limpar eventos --confirmar
/avatar emote happy
/avatar state idle
/avatar state listening
/avatar state thinking
/avatar state responding
/avatar state error
/avatar dizer texto
/bridge status
/godot status
```

A Bridge grava eventos locais em `data/avatar_events.jsonl` e estado atual em `data/runtime_state.json`.
Na 1.8.30 esta camada não mexia no TTS. Na 1.8.32, o TTSControl passa a emitir eventos de áudio/fala para a mesma interface externa consumir.


## TTSControl 1.8.32

```txt
/tts status              status curto do TTS
/tts diagnostico         diagnóstico detalhado, incluindo player pygame
/tts teste               fala frase de teste
/tts parar               limpa fila e interrompe pygame
/tts dizer texto         fala um texto manualmente
/tts player pygame       usa pygame como player interno
/tts player externo      usa player externo do Windows
```

A voz principal continua sendo Edge TTS `pt-BR-FranciscaNeural`. O pygame é apenas o player interno/controlável.


## MegaPack 1.8.32 / ScopeCore 1.8.36

- `/mega check` — auditoria local do pack, versões, config, dependências e caminhos dos modelos.
- `/mega status` — alias de `/mega check`.
- `/diagnostico pack` — alias de `/mega check`.

Correções internas: eventos TTS mais precisos, `/tts parar` mais seguro, estado `speaking` protegido contra `idle` cedo demais e roteamento de comandos mais exato.


## ScopeCore 1.8.36

- `/scope status` mostra o contrato de resposta.
- `/scope on` liga resposta estrita ao pedido.
- `/scope off` desliga resposta estrita.
- `/scope exemplos` mostra exemplos de lista, data e sim/não.
- `/scope debug on/off` mostra ou oculta o tipo de resposta detectado.

Regra principal: lista é lista; detalhe só quando você pede; data começa com data; pergunta sim/não começa com Sim, Não ou Depende.


# 1.8.36 ContractsCore

## SkillHub

```txt
/skills status
/skills comandos
/skills buscar termo
/skills exemplos
```

## App Inventory melhorado

```txt
/apps favoritos
/apps favorito add nome
/apps favorito remove nome
/apps recentes
```

## Tarefas melhoradas

```txt
/tarefa remover número
/tarefa limpar concluidas
```


## ContractsCore 1.8.36

- `/contratos status` - mostra status dos contratos.
- `/contratos exemplos` - mostra exemplos de escopo.
- `/contratos testar texto` - classifica uma pergunta antes de chamar o modelo.
- `/contratos modo rigido` - reduz extras não pedidos.
- `/contratos modo normal` - volta ao modo padrão.


## Download Center 1.8.38

```txt
/baixar status      verifica modelos, KoboldCpp e dependências
/baixar tudo        baixa/instala tudo recomendado de uma vez
/baixar modelos     baixa FAST + THINK se faltarem
/baixar deps        instala requirements_mega.txt
/baixar kobold      baixa KoboldCpp se faltar
/baixar pasta       abre pastas C:\IA_MODELOS e C:\KoboldCpp
```


## BrowserIntent 1.8.38

```txt
abri o youtube para mim e pesqusia gojo vs sukuna amv
abre youtube e pesquisa gojo vs sukuna amv
pesquisa gojo vs sukuna amv no youtube
pesquisa no youtube gojo vs sukuna amv
abre o google e pesquisa yoru bridge
```

Esses comandos abrem navegador diretamente antes de chamar o modelo.




## NoelleKoboldReplace 1.8.43

```txt
/noelle status
/kobold status
python -m yoru_bridge embedded
```

Substitui o chat/Ollama do Noelle por Yoru+KoboldCpp via STDIO JSONL, sem API HTTP.
