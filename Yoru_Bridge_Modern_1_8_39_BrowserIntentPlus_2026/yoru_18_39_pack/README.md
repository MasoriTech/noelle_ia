# Yoru Bridge Modern 1.8.39 BrowserIntentPlus - 2026

Pack focado no cérebro Python da Yoru: FastBrain, skills locais, inventário de apps, DesktopContext, AvatarBridgeCore e TTSControl com Edge TTS + player interno pygame.

## Ordem recomendada

1. **PASSO 1 - Preparar ambiente / primeira execução**
   - validar Python
   - reparar `config.json`
   - preparar vault Obsidian
   - gerar `.bat` FAST/THINK
   - instalar TTS/STT
   - aplicar setup recomendado

2. **PASSO 2 - Modelos / KoboldCpp FAST-THINK**
   - checar portas 5001/5002
   - gerar `.bat` dos modelos
   - trocar THINK entre Qwen3.5 2B e backup Qwen2.5 3B

3. **PASSO 3 - Cérebros / modo FAST-THINK**
   - auto/ambos
   - só FAST 0.8B
   - só THINK 2B
   - dual fast+think

4. **PASSO 4 - Chat Texto**
   - uso normal da Yoru por texto

5. **PASSO 5 - Voz / TTS + STT**
   - Edge TTS
   - voz persistente
   - Faster-Whisper
   - limpeza de Markdown para fala

6. **PASSO 6 - Chat de Voz**
   - botão/ENTER vazio ou `/ouvir`

7. **PASSO 7 - Chat Stream ao vivo CT2**
   - Faster-Whisper tiny/int8/cpu
   - VAD adaptativo
   - wake word Yoru

8. **PASSO 8 - Web Knowledge / Pesquisa automática**
   - `/web`
   - `/pesquisa`
   - cache de pesquisas
   - resumo no Obsidian

9. **PASSO 9 - Velocidade / FastLane**
   - turbo
   - streamout
   - cache
   - reduzir tokens

10. **PASSO 10 - Programas do PC / App Inventory**
   - `/apps scan` para escanear Menu Iniciar e apps instalados
   - `/apps list` para listar programas abríveis
   - `/apps buscar nome` para encontrar
   - `/apps abrir nome` para abrir com segurança

Extras:
- Vault / Obsidian
- Sites / Navegador
- Diagnóstico / Manutenção


## 1.8.36 MegaPack/ScopeCore

Foco desta versão: correção de bugs, estabilidade e auditoria local.

Principais correções:

- TTS `speaking` agora é emitido quando o áudio está pronto e vai tocar, não durante a geração do MP3.
- `/tts parar` ficou mais seguro contra corrida de thread.
- O estado `idle` não sobrescreve `speaking` enquanto a fila/playback de voz está ativo.
- EventBus continua a sequência de eventos depois de reiniciar o app.
- Roteamento de comandos ficou mais exato para evitar `/avatarqualquer` ou `/telao` caírem em skills erradas.
- Novo `/mega check` para auditoria local de versão, config, dependências e modelos.

Instalação recomendada de dependências:

```bat
instalar_dependencias.bat
```

Ou manualmente:

```bat
python -m pip install -r requirements\requirements_mega.txt
```

## 1.8.30 AvatarBridgeCore

Esta versão foca só no Python para preparar a janela/avatar externo. Não altera o TTS e não cria interface.

Novos comandos:

```txt
/avatar status
/avatar teste
/avatar eventos
/avatar limpar eventos --confirmar
/avatar emote happy
/avatar state thinking
/avatar dizer texto
/bridge status
/godot status
```

Arquivos locais criados/atualizados quando usar a Bridge:

```txt
data/avatar_events.jsonl
data/runtime_state.json
```

A janela/Godot pode ler `avatar_events.jsonl` para eventos como `say`, `state`, `emote` e `ping`, e ler `runtime_state.json` para saber se a Yoru está `idle`, `listening`, `thinking`, `responding`, `speaking` ou `error`.

Observação: o TTS foi deixado intocado nesta versão para você decidir depois qual player/engine usar.

## Como iniciar

Execute:

```bat
iniciar.bat
```

Na primeira vez, use:

```txt
[1] PASSO 1 - Preparar ambiente / primeira execução
```

Depois, para uso diário:

```txt
[4] PASSO 4 - Chat Texto
```

ou:

```txt
[6] PASSO 6 - Chat de Voz
```

## Observação

Este pack mantém o foco em chat, voz, stream, pesquisa, Obsidian e manutenção.



## 1.8.29 MissingSkills

Versão de limpeza antes de evoluções maiores.

- Corrige script `scripts/trocar_think_model.py` para não rebaixar a versão do pack.
- Remove o vault `%USERPROFILE%\Documents\Yoru_ia` de dentro do ZIP; o vault é criado no primeiro uso.
- Centraliza o detector de `/skills` em `core/capabilities.py`, incluindo perguntas com pontuação como `habilidades?`.
- Atualiza a memória padrão `skills_ativas.md` criada em vault novo.
- Atualiza User-Agent do Web Knowledge para `YoruBridge/1.8.28`.
- Remove `data/apps_inventory.json` vazio do pacote; ele será criado após `/apps scan`.
- Melhora o status do App Inventory quando o inventário ainda não foi gerado.

## 1.8.24 FastBrain

Esta versão melhora o cérebro FAST:

- FAST padrão continua em Qwen3.5 0.8B para PC antigo.
- Cliente KoboldCpp agora envia parâmetros extras: top_p, top_k, min_p e repeat_penalty quando o backend aceitar.
- Prompt FAST foi encurtado para conversa ao vivo.
- Guardas de qualidade removem blocos `<think>` e cortam respostas longas demais do FAST.
- Perguntas longas demais sobem automaticamente para THINK quando o usuário não força `/fast`.
- Novo comando: `/fastbrain turbo`, `/fastbrain plus`, `/fastbrain gemma`.
- Menu de Modelos inclui presets FAST 0.8B, Qwen3 1.7B e Gemma 3 1B experimental.

Recomendação: use `/fastbrain turbo` para PC antigo; teste `/fastbrain plus` só se o FAST 0.8B estiver rápido demais e você quiser mais qualidade.


## App Inventory / Programas do PC

A Yoru agora pode criar um inventário local dos programas instalados no Windows. Use no chat:

```txt
/apps scan
/apps list
/apps buscar discord
/apps abrir discord
abre o programa Discord
```

O inventário fica em `data/apps_inventory.json`. Ele é local; não é enviado para a internet nem para o modelo. A abertura automática usa atalhos do Menu Iniciar ou executáveis explícitos encontrados no inventário.

## 1.8.26 Skills / Habilidades

A Yoru agora responde localmente quando você pergunta pelas habilidades dela, sem mandar isso para o modelo inventar.

Comandos e frases aceitas:

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

A resposta mostra capacidades reais do pack: cérebros FAST/THINK/DUAL, voz, STT, stream, pesquisa, Obsidian, performance e App Inventory. Quando existir `data/apps_inventory.json`, ela também mostra o status do inventário de programas do PC.


## 1.8.29 MissingSkills

Nova camada de skills locais para a Yoru entender melhor o PC sem fingir controle total:

- `/tela capturar` salva print da tela em `data/screenshots`.
- `/pc status` e `/pc diagnostico` mostram sistema, RAM/disco, portas, Python e processos relevantes.
- `/modelo status` checa portas FAST/THINK e caminhos de modelos.
- `/arquivos recentes`, `/arquivos buscar nome`, `/arquivos abrir ultimo zip` e `/arquivos organizar downloads` ajudam com arquivos locais sem mover/apagar nada automaticamente.
- `/clip ler`, `/clip resumir`, `/clip melhorar` e `/clip salvar nota` trabalham com o texto copiado.
- `/tarefa adicionar`, `/tarefa hoje` e `/tarefa concluir N` salvam tarefas locais em `data/tasks.json`.
- `/memoria lembrar`, `/memoria buscar`, `/memoria resumo` e `/diario texto` usam o vault local.
- `/projeto status`, `/projeto bugs`, `/projeto changelog`, `/projeto proxima versao` ajudam no projeto Yoru/Noelle.
- `/rotina modo yoru`, `/rotina estudo`, `/rotina trabalho`, `/rotina noite` mostram checklists seguros.

Nota honesta: `/tela analisar` ainda não faz visão real com VLM/OCR. Ele captura o print e informa que análise visual completa precisa de uma versão futura com modelo de visão ou OCR.


## 1.8.29 MissingSkills

Completa o que faltou na 1.8.28:

- `/tela ocr` e `/tela ler erro`: captura print e tenta ler texto com OCR opcional.
- `/janela list`, `/janela focar nome`, `/janela minimizar tudo`, `/janela fechar nome --confirmar`.
- `/arquivos abrir nome`, `/arquivos organizar downloads --confirmar`, `/arquivos limpar cache yoru --confirmar`.
- `/clip copiar texto`.
- `/modelo api` para testar `/v1/models` do FAST/THINK.
- `/pc gpu` para diagnóstico simples de vídeo/GPU.

Ações sensíveis exigem `--confirmar`. Executáveis em Downloads não são movidos automaticamente.


## 1.8.31 TTSControl

Esta versão mantém a voz principal em Edge TTS com `pt-BR-FranciscaNeural` e adiciona `pygame` como player interno/controlável. O objetivo é controlar melhor quando a Yoru está falando, permitir `/tts parar` e emitir eventos para a janela/avatar sem trocar a voz brasileira feminina.

Comandos novos/alias:

```txt
/tts status
/tts diagnostico
/tts teste
/tts parar
/tts dizer texto
/tts player pygame
/tts player externo
```

Eventos novos em `data/avatar_events.jsonl` quando `tts.emit_avatar_events=true`:

```json
{"type":"audio_ready"}
{"type":"tts_start"}
{"type":"tts_end"}
```

Dependência opcional recomendada:

```bat
python -m pip install -r requirements\requirements_tts_control.txt
```

Se `pygame` não estiver instalado, a Yoru tenta cair para o player externo do Windows para não ficar sem voz.


## 1.8.36 ScopeCore

Foco: melhorar o THINK/Web Knowledge para obedecer exatamente ao pedido, sem gastar tokens com extras.

Exemplos:
- `top 10 animes de 2026` -> só 10 nomes numerados, sem resumo de cada anime.
- `me fale mais do número 4` -> explica só o item 4.
- `Palmeiras ganhou mundial?` -> resposta direta com ressalva curta de critério.
- `quando Corinthians foi fundado?` -> começa pela data.

Comandos:
- `/scope status`
- `/scope on`
- `/scope off`
- `/scope exemplos`
- `/scope debug on/off`


## 1.8.36 ContractsCore

Esta versão melhora as skills existentes, sem liberar controle perigoso do PC.

Novos comandos úteis:

```txt
/skills status
/skills comandos
/skills buscar apps
/skills exemplos
/apps favoritos
/apps favorito add Discord
/apps favorito remove Discord
/apps recentes
/tarefa remover 1
/tarefa limpar concluidas
```

O App Inventory agora mantém favoritos e recentes em `data/apps_prefs.json`, criado localmente só quando usado.


## 1.8.36 ContractsCore

Adiciona contratos de resposta por intenção. Use `/contratos status`, `/contratos exemplos` e `/contratos testar texto` para ver como a Yoru vai formatar cada pedido antes de chamar THINK/Web.


## 1.8.38 - Download Center

Comandos novos:

```txt
/baixar status
/baixar tudo
/baixar modelos
/baixar deps
/baixar kobold
/baixar pasta
```

`/baixar status` confirma o que já está baixado. `/baixar tudo` baixa/instala apenas o que faltar e pula arquivos já completos.


## 1.8.39 - BrowserIntentPlus

Corrige comandos naturais de navegador para voz/texto. Exemplos:

```txt
abri o youtube para mim e pesqusia gojo vs sukuna amv
abre youtube e pesquisa gojo vs sukuna amv
pesquisa gojo vs sukuna amv no youtube
```

Esses comandos agora abrem a busca no navegador, sem cair no modelo FAST/THINK.


## 1.8.39 BrowserIntentPlus

- Corrige comandos naturais de navegador com typos/STT: `youbue`, `pquise`, `pequise`, `pesquie`, `pesqusia`.
- Exemplo: `abra o youtube e pquise roberto carlos` agora abre a busca do YouTube.
- Esconde o banner do pygame para ele não vazar no chat.
