# MEMÓRIA GPT — PROJETO NOELLE IA

**Versão desta memória:** 2.0  
**Uso:** este arquivo deve ficar na raiz do repositório e deve ser lido antes de qualquer alteração no projeto.

```txt
MEMORIA_GPT_NOELLE.md
```

---

## 1. Regra de ouro

A Noelle IA **não é apenas uma janela de chat**.

Ela é um companion desktop com:

```txt
Electron desktop
Chat IA com Ollama
Avatar/widget VRM
Emotes/animações VRMA
Expressions PNG
Inventário/items GLB
STT/TTS Python
Inicializador INICIAR.bat
```

Sempre corrigir uma parte **sem quebrar as outras**.

Não fazer redesign total sem pedido explícito.  
Não substituir o projeto inteiro.  
Não criar placeholder se já existe função real.

---

## 2. Fonte verdadeira

A fonte verdadeira é o GitHub atual:

```txt
github.com/MasoriTech/noelle_ia
```

Regras:

```txt
1. Usar o GitHub atual como base.
2. Não usar ZIPs antigos como fonte principal.
3. Se ZIP antigo e GitHub atual divergirem, confiar no GitHub atual.
4. Antes de gerar pack, auditar a árvore real do projeto.
5. Criar backup antes de alterar arquivos importantes.
```

---

## 3. Mapa mental do projeto

```txt
Noelle IA
├─ Janela principal / controles
│  ├─ Chat IA
│  ├─ Emotes
│  ├─ Expressions
│  ├─ Inventário
│  ├─ Configurações
│  └─ Botões para controlar avatar/widget
│
├─ Janela avatar/widget
│  ├─ Carrega Noelle.vrm
│  ├─ Reproduz motions .vrma
│  ├─ Mostra expressions .png
│  └─ Equipa items .glb
│
├─ Backend local
│  ├─ Ollama
│  ├─ Modelo rápido qwen3:0.6b
│  ├─ STT Python
│  └─ TTS Python
│
└─ Inicialização
   └─ INICIAR.bat
```

---

## 4. Arquivos essenciais por área

### 4.1 Janela principal / controles

```txt
src/controls.html
src/renderer/controls_window_app.js
src/styles/noelle.css
src/styles/responsive.css
main.js
preload.js
```

A janela principal deve conseguir:

```txt
abrir avatar/widget
listar emotes reais
listar expressions reais
listar items reais
chamar Chat IA
salvar/carregar estado básico
```

---

### 4.2 Chat IA

```txt
main.js
preload.js
src/controls.html
src/renderer/controls_window_app.js
```

APIs importantes do Chat IA:

```txt
window.noelleAPI.chat
window.noelleAPI.status
window.noelleAPI.loadState
window.noelleAPI.saveState
```

Não quebrar essas APIs ao mexer no preload.

---

### 4.3 Avatar/widget

Arquivos reais do avatar:

```txt
src/avatar_view.html
src/renderer/avatar_window_app.js
src/renderer/avatar.js
src/renderer/scene.js
src/renderer/config.js
src/renderer/motions.js
src/renderer/items.js
src/renderer/local_assets.js
```

Esses arquivos devem ser **preservados e reaproveitados**.

Não substituir o avatar real por card, texto ou placeholder.

---

### 4.4 Assets principais

```txt
src/assets/Noelle.vrm
src/assets/avatars/
src/assets/motions/
src/assets/expressions/
src/assets/items/
src/assets/motion_manifest.json
src/assets/item_manifest.json
src/assets/expressions/manifest.json
```

Esses caminhos são críticos.

Não apagar.  
Não ignorar no Git sem entender o impacto.  
Não desconectar da UI.

---

### 4.5 Ícones do app

```txt
assets/icons/app.ico
assets/icons/noelle_128.png
assets/icons/noelle_256.png
```

Se o ícone da janela ou barra de tarefas sumir, verificar:

```txt
main.js
BrowserWindow({ icon: ... })
app.setAppUserModelId(...)
package.json build.win.icon
assets/icons/app.ico
```

No Windows, a barra de tarefas pode manter cache de ícone. Às vezes é necessário fechar tudo, reinstalar o portable/instalador ou limpar cache do Windows.

---

## 5. Diferença entre tipos de assets

```txt
.vrm  = modelo 3D/avatar
.vrma = animação/emote do avatar
.png  = expression/ícone visual
.glb  = item 3D/inventário
.ico  = ícone Windows do app
```

Nunca confundir:

```txt
VRM  ≠ VRMA
VRMA ≠ PNG
PNG  ≠ GLB
GLB  ≠ VRM
```

---

## 6. Manifests reais

### 6.1 Motions / emotes

```txt
src/assets/motion_manifest.json
src/assets/motions/*.vrma
src/renderer/motions.js
src/renderer/avatar_window_app.js
```

A aba Emotes deve renderizar os dados reais de:

```txt
src/assets/motion_manifest.json
```

Clique em emote deve chamar:

```txt
motion -> playMotion
```

Payload esperado pelo avatar:

```js
{ type: "playMotion", motionId: "<id>" }
```

---

### 6.2 Expressions

```txt
src/assets/expressions/manifest.json
src/assets/expressions/*.png
src/renderer/avatar_window_app.js
```

A aba Expressions deve renderizar os PNGs reais.

Clique em expression deve chamar:

```txt
expression -> showExpression
```

Payload esperado pelo avatar:

```js
{ type: "showExpression", expressionId: "<id>" }
```

---

### 6.3 Inventário / items

```txt
src/assets/item_manifest.json
src/assets/items/*.glb
src/renderer/items.js
src/renderer/avatar_window_app.js
```

A aba Inventário deve renderizar os GLBs reais.

Clique em item deve chamar:

```txt
item -> equipItem
```

Payload esperado pelo avatar:

```js
{ type: "equipItem", itemId: "<id>", slot: "<slot>" }
```

Itens importantes conhecidos do projeto:

```txt
basketball
katana / shinai
iphone_14_pro
d20
dice
microfone
violão/guitar
piano
água
café
tablet
mesa
```

Não apagar nem remover esses itens sem pedido explícito.

---

## 7. Caminho correto do avatar/widget

O arquivo real é:

```txt
src/avatar_view.html
```

Se algum código tentar abrir:

```txt
src/avatar.html
```

corrigir para:

```txt
src/avatar_view.html
```

ou criar alias seguro:

```txt
src/avatar.html -> avatar_view.html
```

O Electron não pode apontar para arquivo inexistente.

---

## 8. Ponte main / preload / renderer

Manter segurança do Electron:

```txt
nodeIntegration: false
contextIsolation: true
```

Usar `contextBridge` no `preload.js`.

APIs importantes:

```txt
window.noelleAPI
window.desktopWidget
```

`window.noelleAPI` deve manter, quando existir:

```txt
status
chat
loadState
saveState
openExternal
openAvatar
avatarCommand
assets
```

Se renderer antigo depender de `desktopWidget`, manter compatibilidade em vez de remover.

---

## 9. Canais do avatar

Para compatibilidade, aceitar/enviar nos dois canais se necessário:

```txt
avatar:command
avatar-command
```

Comandos vindos da janela principal podem ser simples:

```txt
motion
expression
item
camera
center
pause
stop
clearItems
rotateLeft
rotateRight
resetRotation
```

O `main.js` deve traduzir para o formato real do avatar:

```txt
motion        -> { type: "playMotion", motionId }
expression    -> { type: "showExpression", expressionId }
item          -> { type: "equipItem", itemId, slot }
camera        -> { type: "setPreset", preset }
center        -> { type: "centerAvatar" }
pause         -> { type: "togglePauseMotion" }
stop          -> { type: "stopMotion" }
clearItems    -> { type: "clearAvatarItems" }
rotateLeft    -> { type: "rotateAvatar", deltaY: -0.15 }
rotateRight   -> { type: "rotateAvatar", deltaY: 0.15 }
resetRotation -> { type: "resetAvatarRotation" }
```

---

## 10. Dependências importantes

Avatar/widget usa:

```txt
three
@pixiv/three-vrm
@pixiv/three-vrm-animation
```

Se `src/renderer/avatar_window_app.js` importa `@pixiv/three-vrm-animation`, o `package.json` precisa declarar:

```txt
@pixiv/three-vrm-animation
```

Evitar:

```txt
"latest"
```

Preferir versões testadas e fixadas.

Não trocar Electron/Three/@pixiv agressivamente junto com correção de bug de UI.  
Atualização de dependência grande deve ser uma tarefa separada.

---

## 11. Inicializador oficial

O projeto deve ter apenas um `.bat` principal na raiz:

```txt
INICIAR.bat
```

Evitar vários atalhos duplicados.

O menu ideal:

```txt
[1] Iniciar Noelle
[2] Diagnóstico completo
[3] Reparar manifests/assets
[4] Limpar outros .bat da raiz para backup
[0] Sair
```

### 11.1 O que a opção [1] deve fazer

```txt
verificar Node
verificar npm
não exigir npm se node_modules/electron já existir
instalar npm somente se faltar Electron local
verificar Python
criar .venv se faltar
instalar requirements STT/TTS somente se faltar
verificar Ollama
iniciar Ollama se possível
verificar/baixar qwen3:0.6b
verificar Noelle.vrm
verificar motions .vrma
verificar expressions .png
verificar items .glb
verificar/reconstruir manifests
iniciar Electron no final
```

### 11.2 Logs esperados

```txt
[OK] Node encontrado
[OK] Electron local encontrado
[OK] npm install pulado
[OK] Python encontrado
[OK] .venv encontrado
[OK] STT/TTS pronto
[OK] Noelle.vrm encontrado
[OK] Motions .vrma encontrados
[OK] Expressions PNG encontradas
[OK] Items GLB encontrados
[OK] Ollama online
[OK] Modelo qwen3:0.6b pronto
[START] Iniciando Noelle
```

### 11.3 Errorlevel

Depois de qualquer comando Node importante no `.bat`, verificar erro:

```bat
node scripts\algum_script.cjs
if errorlevel 1 (
  echo [ERRO] Script falhou com codigo %errorlevel%
  pause
  goto MENU
)
```

---

## 12. Regras de manutenção

### Nunca fazer sem pedido explícito

```txt
redesign total
substituir controls.html inteiro
apagar assets
desconectar avatar para corrigir chat
desconectar emotes para corrigir layout
desconectar items para corrigir CSS
trocar tudo por placeholder
criar vários .bat na raiz
trocar Electron/Three/VRM agressivamente
```

### Sempre fazer

```txt
auditar primeiro
listar plano antes de alterar
criar backup antes de mexer
preservar avatar/emotes/expressions/items/chat
rodar node --check nos JS/CJS alterados
testar caminhos e manifests
explicar riscos
explicar como reverter
```

---

## 13. Arquivos que podem ser mexidos com cuidado

```txt
INICIAR.bat
.gitignore
.gitattributes
.editorconfig
package.json
main.js
preload.js
src/controls.html
src/renderer/controls_window_app.js
src/styles/noelle.css
scripts/*.cjs
requirements.txt
tools/noelle_stt/requirements.txt
tools/noelle_tts/requirements.txt
README.md
CHANGELOG.md
VERSION
.github/workflows/ci.yml
```

---

## 14. Arquivos que devem ser preservados e reaproveitados

```txt
src/avatar_view.html
src/renderer/avatar_window_app.js
src/renderer/avatar.js
src/renderer/scene.js
src/renderer/config.js
src/renderer/motions.js
src/renderer/items.js
src/renderer/local_assets.js
src/assets/Noelle.vrm
src/assets/avatars/
src/assets/motions/
src/assets/expressions/
src/assets/items/
src/assets/motion_manifest.json
src/assets/item_manifest.json
src/assets/expressions/manifest.json
assets/icons/
```

---

## 15. Sobras de hotfix

O projeto teve vários hotfixes antigos. Arquivos como:

```txt
README_*.txt
RELATORIO_*.txt
noelle_chat_*patch*.js
noelle_chat_*patch*.css
scripts/aplicar_*hotfix*.cjs
scripts/corrigir_*chat*.cjs
```

podem ser sobras.

Não apagar direto.

Mover para:

```txt
docs/hotfixes/legacy/
scripts/legacy/
src/renderer/legacy/
src/styles/legacy/
```

ou backup.

Só mover se estiver claramente não importado pelo build atual.

---

## 16. Build real / renderer_dist

Quando o projeto usa bundle, verificar:

```txt
scripts/bundle-renderers.mjs
src/renderer_dist/
```

O build costuma usar entradas como:

```txt
src/launcher_bootstrap.js
src/renderer/controls_window_app.js
src/renderer/avatar_window_app.js
```

Se mexer em renderer, pode ser necessário regenerar `renderer_dist`.

Não assumir que alterar `src/renderer/*.js` basta se o app está carregando bundle antigo.

---

## 17. Git / LFS / arquivos binários

Assets VRM/GLB/PNG podem ser grandes.

Ideal:

```txt
git lfs install
git lfs track "*.vrm"
git lfs track "*.glb"
git lfs track "*.png"
git lfs track "*.ico"
git add .gitattributes
```

Mas não remover assets do repo sem combinar.

Se `.noelle_*bootstrap*.json` ou estado local estiver versionado:

```txt
git rm --cached .noelle_v15_bootstrap.json
```

O `.gitignore` só ignora arquivos novos. Arquivos já rastreados continuam no Git até remover do tracking.

---

## 18. .gitignore recomendado

```gitignore
node_modules/
release/
dist/
build/
out/
logs/
backups/
.venv/
venv/
__pycache__/
*.pyc
*.log
*.zip
*.rar
*.7z
.DS_Store
Thumbs.db
.noelle_*bootstrap*.json
.noelle_*state*.json

!src/assets/
!src/assets/Noelle.vrm
!src/assets/avatars/
!src/assets/motions/
!src/assets/expressions/
!src/assets/items/
!src/assets/motion_manifest.json
!src/assets/item_manifest.json
!src/assets/expressions/manifest.json
```

---

## 19. Checklist antes de gerar qualquer ZIP

Confirmar:

```txt
node --check main.js
node --check preload.js
node --check scripts/*.cjs alterados
node --check src/renderer/*.js alterados
apenas INICIAR.bat na raiz do pack
VRM/VRMA/PNG/GLB não foram removidos
motion_manifest.json existe e lista motions
expressions/manifest.json existe e lista PNGs
item_manifest.json existe e lista GLBs
Chat continua funcionando
Avatar abre
Emotes interagem
Expressions interagem
Items interagem
Configurações continuam acessíveis
Ícone da janela/barra de tarefas configurado
```

---

## 20. Checklist de teste manual

Depois de aplicar qualquer pack:

```txt
1. Rodar INICIAR.bat.
2. Escolher diagnóstico.
3. Iniciar Noelle.
4. Ver se ícone aparece na janela/barra de tarefas.
5. Abrir widget/avatar.
6. Confirmar que Noelle.vrm carrega.
7. Clicar em um emote VRMA.
8. Aplicar uma expression PNG.
9. Equipar um item GLB.
10. Testar Chat IA.
11. Fechar e abrir de novo.
```

---

## 21. Histórico importante

O projeto passou por várias tentativas de hotfix. Alguns packs consertaram o Chat IA, mas quebraram avatar, emotes, icon bar, expressions ou inventário.

Não repetir esse erro.

A regra final é:

```txt
Corrigir uma parte sem quebrar as outras.
```

---

## 22. Preferências do usuário

```txt
Preferir apenas 1 .bat principal na raiz.
Nome recomendado: INICIAR.bat.
Evitar muitos atalhos duplicados.
Priorizar widget/avatar quando aplicável.
Terminal deve mostrar feedback claro:
  modelo baixado
  modelo carregando
  servidor pronto
  avisos de espera
  diagnóstico quando servidor não responder
```

---

## 23. Prompt curto para futuras sessões

Se uma futura IA não souber o contexto, usar:

```txt
Leia MEMORIA_GPT_NOELLE.md antes de mexer.
O projeto Noelle IA tem Electron + Ollama + avatar VRM + motions VRMA + expressions PNG + items GLB.
Não redesenhe tudo.
Não apague assets.
Não desconecte avatar/emotes/items/chat.
Faça manutenção cirúrgica e preserve a arquitetura atual.
```

---

## 24. Primeira resposta ideal da IA em nova sessão

Quando o usuário pedir alteração no projeto, responder primeiro com:

```txt
Vou auditar a arquitetura atual do GitHub antes de mexer.
Vou preservar avatar, emotes, expressions, items e Chat IA.
Depois te passo o plano dos arquivos que serão alterados.
```

Só gerar ZIP depois do plano, exceto se o usuário pedir explicitamente para já gerar.


## Bandeja do sistema

A Noelle tinha um ícone bonito na bandeja do Windows e isso deve ser preservado.

Arquivos e pontos importantes:

```txt
assets/icons/app.ico
assets/icons/noelle_16.png
assets/icons/noelle_32.png
assets/icons/noelle_48.png
assets/icons/noelle_128.png
assets/icons/noelle_256.png
main.js
Electron Tray
Electron Menu
app.setAppUserModelId(...)
BrowserWindow({ icon: ... })
```

Comportamento esperado:

```txt
- Ícone aparece na bandeja do sistema.
- Clique no ícone mostra/oculta a janela principal.
- Duplo clique mostra a janela principal e abre o widget/avatar.
- Menu da bandeja tem:
  Mostrar/Ocultar Noelle
  Abrir widget/avatar
  Centralizar avatar
  Parar emote
  Sair da Noelle
- Fechar a janela principal deve esconder na bandeja, não encerrar tudo.
- Sair de verdade deve ser pelo menu da bandeja ou opção explícita.
```

Não remover a bandeja ao mexer em main.js.


## Nota de estabilidade do main.js

O arquivo main.js não pode ter quebras literais dentro de strings com aspas duplas ou simples.

Errado:

```js
prompt: "linha 1
linha 2"
```

Certo:

```js
prompt: "linha 1\nlinha 2"
```

ou template literal bem controlado:

```js
prompt: `linha 1
linha 2`
```

Antes de entregar qualquer pack, sempre rodar:

```bat
node --check main.js
```


## Nota V17.5 — Manifest com prefixo de pasta

Os manifests podem listar arquivos assim:

```json
{ "file": "motions/003_humidai.vrma" }
{ "file": "items/basketball.glb" }
```

Os loaders NÃO podem montar caminho duplicado:

```txt
assets/motions/motions/003_humidai.vrma
assets/items/items/basketball.glb
```

O loader correto deve aceitar ambos:

```txt
003_humidai.vrma
motions/003_humidai.vrma
assets/motions/003_humidai.vrma
```

e resolver para:

```txt
assets/motions/003_humidai.vrma
```

O mesmo vale para items e thumbnails.


## Nota V17.5 — Manifest com prefixo de pasta

Os manifests podem listar arquivos assim:

```json
{ "file": "motions/003_humidai.vrma" }
{ "file": "items/basketball.glb" }
```

Os loaders NÃO podem montar caminho duplicado:

```txt
assets/motions/motions/003_humidai.vrma
assets/items/items/basketball.glb
```

O loader correto deve aceitar ambos:

```txt
003_humidai.vrma
motions/003_humidai.vrma
assets/motions/003_humidai.vrma
```

e resolver para:

```txt
assets/motions/003_humidai.vrma
```

O mesmo vale para items e thumbnails.


## V17.7 — items robustos

A lógica de items deve usar:
- SkeletonUtils.clone para GLB com SkinnedMesh/bones;
- wrapper Group para cada item;
- normalização de pivot;
- alinhamento de base no chão para scene props;
- targetSize por slot;
- item_slots.js para slots;
- item_behaviors.js para ações especiais;
- items.js como motor genérico.

Objetos de cenário como mesa e piano usam:
- slot front_floor;
- Y = 0;
- Z negativo;
- ground: true;
- bottom aligned pela bounding box.

Água usa:
- right_hand;
- behavior: playMotion 006_drinkwater.

iPhone usa:
- left_hand;
- behavior: playMotion 005_smartphone.


## V18.2 Room ultra robusta

Correções importantes:
- TransformControls deve ser adicionado pelo getHelper() quando disponível.
- src/assets/* dentro de src/room.html deve virar ./assets/*, não ../assets/*.
- SkeletonUtils.clone reutiliza geometria/material por referência; a Room clona recursos por item para poder remover sem quebrar o cache.
- A escala salva no room_layout.json é userScale, não escala final normalizada, evitando dobrar o tamanho ao recarregar.
- Room usa Box3/BoxHelper para seleção e colisão simples.
- Layout salvo é sanitizado no main.js e escrito via arquivo temporário + rename.


## V18.4 Room Safety / Undo / Autosave

A Room V18.4 adiciona:
- Undo/Redo com Ctrl+Z/Ctrl+Y;
- room_history.js;
- room_autosave.js;
- autosave local com botão "Recuperar auto";
- placeholder seguro quando GLB não carrega;
- callbacks de commit/change no room_items.js;
- save continua por IPC no main;
- layout ainda sanitizado no renderer e main.

Regra:
- Se um asset quebrar, a Room não deve crashar. Deve mostrar placeholder.
- Se salvar falhar, autosave deve ficar disponível.
- Undo/Redo não deve mexer no Avatar, Chat, motions ou expressions.


## V18.6 Room Walk Robust

Reforços do modo andar:
- Pointer lock agora é nativo para evitar conflito/dobro com PointerLockControls.
- Corrigido risco de bug no CapsuleGeometry.
- Loop do player agora cancela no dispose.
- Mouse/teclas limpam em blur/visibilitychange.
- Third person tem colisão simples de câmera para reduzir atravessar móveis.
- Spawn do player procura posição segura se nascer dentro de móvel.
- Layout salva player.position, player.yaw e player.pitch.
- Build controls desligam fora do Build Mode.


## V18.7 Yoru POV Walk

O First Person virou Yoru POV:
- Câmera posicionada na altura dos olhos da Yoru/Noelle.
- room_player_avatar.js tenta carregar:
  - src/assets/avatars/Yoru.vrm
  - src/assets/Yoru.vrm
  - src/assets/Noelle.vrm
  - src/assets/avatars/Noelle.vrm
- Third Person usa a Yoru/Noelle como player visual.
- First Person oculta o corpo/avatar para evitar ver por dentro da cabeça.
- Se VRM não carregar, usa cápsula fallback.
- Isso ainda não anima braços/mãos em primeira pessoa; isso fica para uma versão futura.


## V19 MegaLayout 2026

- Room passa a usar layout anti-sobreposição: topbar, leftbar, viewport central, rightbar e downbar.
- As 100 sugestões ficam em docs/NOELLE_V19_100_SUGESTOES.md e também aparecem no painel Roadmap 100 da Room.
- O botão Room V19 é adicionado sem remover a janela principal antiga.
- Avatar/widget, Chat IA, Emotes, Expressions e Inventário continuam preservados.
- V19 cria uma Room separada em src/room.html e renderer próprio src/renderer/room_v19_app.js.


## V19.2 Settings/About Cleanup

- Chat IA foi preservado com alterações mínimas.
- Corrigido botão Room V19 duplicado: existe apenas um launcher canônico.
- Aba Configurações recebe 30 opções úteis organizadas por Interface, Avatar/Room, Chat/Áudio/Manutenção.
- Aba Sobre recebe informações do projeto, links úteis, formatos de assets, regras de licença e status esperado.
- O patch roda por src/renderer/noelle_v19_2_settings_about_cleanup.js e não substitui controls.html inteiro.
- preload.js usa bloco seguro noelleRoomV19 sem redeclarar contextBridge/ipcRenderer.


## V19.2.1 Settings/About/Room Fix

- Corrige falha do V19.2 onde Configurações/Sobre podiam não aparecer.
- Runtime agora também é injetado via preload, não depende só do script em controls.html.
- Remove botões flutuantes antigos "Room" e "Room V19" e cria um botão canônico.
- Mantém Chat IA sem mexer no layout.
- Adiciona painéis reais nas abas Configurações e Sobre quando essas abas ficam visíveis.

## V19.3 Complete UI/MD Pack — 2026

Pacote consolidado para limpar os hotfixes V19.2, V19.2.1 e V19.2.2.

Inclui:
- Correção global dos dropdowns/selects com fundo branco no Windows/Electron.
- Um único botão canônico `Room V19`: `#noelle-room-v19-canonical-button`.
- Remoção de launchers antigos `Room` e `Room V19` duplicados.
- Painel real de Configurações avançadas com 30 opções úteis.
- Painel real de Sobre com:
  - descrição do projeto;
  - formatos VRM/VRMA/PNG/GLB/JSON;
  - links úteis de assets;
  - tecnologias usadas;
  - regras de licença;
  - status esperado do projeto.
- Injeção via `preload.js` e também via `src/controls.html` para ser mais robusto.
- Chat IA deve ser preservado com alterações mínimas.

Arquivos principais:
- `src/renderer/noelle_v19_3_complete_ui_md.js`
- `scripts/apply_v19_3_complete_ui_md_2026.cjs`
- `scripts/diagnostico_v19_3_complete_ui_md_2026.cjs`

Não inclui:
- Nova mecânica de Room.
- Correção de animações VRM.
- Correção completa do player Yoru/Third Person.
- Mega refactor V20.

## V19.5 Avatar Real VRM Sync Anim — 2026

Este pack implementa os itens que ficaram fora do V19.4.1:

- Preview real do VRM dentro da aba Avatar usando Three.js + @pixiv/three-vrm.
- Loader novo para Avatar/Widget em `src/renderer/avatar_v19_5_preview_app.js`.
- Bundle browser em `src/renderer_dist/avatar_v19_5.bundle.js`.
- Sincronização com Room via `BroadcastChannel("noelle-avatar-room-sync")`, `localStorage` e eventos DOM.
- Bridge de Room em `src/renderer/avatar_room_sync_bridge_v19_5.js`.
- Animações VRMA via `@pixiv/three-vrm-animation` quando arquivos `.vrma` e manifest estão disponíveis.
- Fallback de idle simples quando não há VRMA.

Limite conhecido:
- A sincronização profunda depende da Room expor APIs como `window.noelleRoomPlayer`, `window.roomPlayerApi` ou escutar `noelle:room-avatar-sync`.
- O pack já dispara eventos e salva estado; se a Room ainda não consumir, o próximo passo é conectar esses eventos ao player real da Room.

## V19.6 Avatar Lab Isolated — 2026

Correção da estratégia V19.5:
- O V19.5 injetado no app principal quebrou troca de abas.
- A solução correta é isolar o preview real do VRM em uma janela separada: `src/avatar_lab_v19_6.html`.

Este pack adiciona os quatro itens solicitados sem mexer diretamente na navegação de abas:
1. Preview real do VRM em janela isolada.
2. Loader novo com Three.js + @pixiv/three-vrm.
3. Sincronização com Room via BroadcastChannel/localStorage/CustomEvent.
4. Animações VRMA via @pixiv/three-vrm-animation.

Arquivos principais:
- `src/avatar_lab_v19_6.html`
- `src/renderer/avatar_lab_v19_6_app.js`
- `src/renderer/avatar_lab_launcher_v19_6.js`
- `src/renderer/room_sync_bridge_v19_6.js`
- `scripts/build_avatar_lab_v19_6_2026.cjs`

Importante:
- A aba principal não recebe MutationObserver global.
- Se caminho `./assets/Noelle.vrm` falhar, o Avatar Lab permite escolher VRM/GLB local por input de arquivo.


---

## V19.7.2 — Avatar Foco + Carrossel VRM

- A aba/janela Avatar deve ter foco visual no personagem.
- Avatar grande a esquerda, opcoes a direita, setas embaixo.
- Carrossel deve carregar um VRM/GLB por vez a partir de src/assets/avatar_manifest.json.
- Nao acoplar o preview a Room em tempo real; Room cuida do quarto/objetos e Widget Mode cuida da janela sem fundo.
- Todo pack futuro deve incluir iniciar.bat atualizado.


## V19.7.3 Build Regex / Avatar Focus
- Corrige SyntaxError de regex quebrada em scripts/build_avatar_lab_v19_6_2026.cjs.
- O iniciar.bat deve rodar fix/diagnostico antes de iniciar.


---

## Nota V19.7.4 - Avatar Preview robusto

- O Avatar Preview/Avatar Lab deve compilar em build IIFE sem top-level await.
- Strings com quebra de linha real dentro de aspas simples/duplas devem ser corrigidas para \n escapado.
- A aba Avatar deve manter foco visual no personagem: preview grande, setas embaixo e opções ao lado.
- O iniciar.bat deve rodar correção/diagnóstico antes de iniciar para evitar regressões antigas.


## V19.7.5 Avatar Clean Carousel 2026
- Aba Avatar limpa: avatar grande à esquerda, opções à direita e setas embaixo.
- Remove da interface a tela técnica antiga de sincronização.
- Avatar escolhe/personagem; Room usa quarto/objetos; Widget Mode mostra sem fundo; Preview/Teste fica seguro.
- Sempre manter iniciar.bat atualizado nos próximos packs.


---

## V19.7.6 Avatar Clean Carousel

Regra aplicada: a aba Avatar deve ser um seletor visual limpo de personagens VRM/GLB, com avatar grande, setas embaixo e opções à direita. Não mostrar BroadcastChannel, localStorage, Sincronizar Room ou painel técnico V19.5 na interface principal. Room / Quarto, Widget Mode e Preview / Teste ficam separados. Todo pack futuro deve incluir iniciar.bat atualizado.

## V19.7.8 - Avatar final limpo em carrossel
- Aba Avatar deve ser limpa, sem BroadcastChannel/localStorage/Sincronizar Room na interface.
- Layout correto: avatar grande à esquerda, opções à direita, setas embaixo.
- Room / Quarto aplica cenário e objetos; Widget Mode abre avatar sem fundo; Preview/Teste fica na aba Avatar.
- Manter um único iniciar.bat com menu e opção segura para mover outros .bat para backup.


## V19.8.1 — Preload Limpo
- O preload.js deve expor APIs via contextBridge, não injetar UI visual antiga.
- Runtimes visuais V19.3/V19.5 não devem criar botões flutuantes automaticamente na janela principal.
- A aba Avatar final deve ser rota real do renderer principal, não painel injetado por MutationObserver.
- Compatibilidade com noelleRoomV19 pode existir como API, sem botão/painel visual legado.


## V19.8.1a — Preload Forçado

- preload.js consolidado como ponte segura, sem injeção visual V19.3/V19.5.
- Mantidas APIs window.noelleAPI, window.desktopWidget, window.noelleRoom e window.noelleRoomV19.
- A aba Avatar final deve ser implementada no renderer principal, não por preload.
- iniciar.bat continua com opção [1] apenas para iniciar, sem aplicar patch automático.


## V19.8.1d - Manifest Forte
- avatar_manifest.json deve ser sempre uma lista/array JSON.
- O manifest deve conter entradas VRM/GLB com path/rel válidos no disco.
- iniciar.bat permanece único; a opção [1] apenas inicia o programa.
- Esta fase preserva preload limpo e não redesenha a aba Avatar.


## V19.8.2 — Aba Avatar Real
- A aba Avatar deve ser parte do renderer principal, nao injetada pelo preload.
- Layout final: avatar grande a esquerda, setas embaixo, opcoes a direita.
- Carrossel deve carregar avatar_manifest.json e renderizar um VRM/GLB por vez.
- Room / Widget Mode / Preview-Teste continuam separados.
- Nao reativar V19.3/V19.5 como runtime visual automatico.


## V19.8.3 — Resolução + LoadFile
- A aba Avatar deve ser responsiva: avatar grande acompanha a janela, opções ficam à direita e descem em telas menores.
- O preview de teste deve ter caminho seguro por BrowserWindow.loadFile() para evitar falhas frágeis de fetch em file://.
- O layout deve usar grid/flex, minmax(0, 1fr), overflow auto e breakpoints.
- A opção [1] do iniciar.bat continua apenas iniciando o programa, sem aplicar patch automaticamente.


## V19.8.3a Preview LoadFile + Resize Fix

- Corrige preload com API `openAvatarPreviewLoadFile`.
- Corrige guard responsivo da aba Avatar com controle por resize.
- Mantem preload limpo, sem injeções visuais V19.3/V19.5.
- Mantem iniciar.bat unico; opcao [1] apenas inicia o programa.


## V19.8.7 — Purge Avatar legado
- Removido do codigo ativo o carrossel/overlay antigo V19.7.6 que carregava `avatar_carousel_v19_7_6.bundle.js`.
- A aba Avatar valida deve usar somente a implementacao V19.8.x atual, sem pílula flutuante "Avatar Lab" e sem runtime legado sobreposto.
- Arquivos removidos sao copiados para `backups/` antes de sair do codigo ativo.

## V19.8.9a Mega UI/Settings Reforco — 2026
- Reforça V19.8.9 antes de aplicar: remove tags antigas V19.8.9 e instala apenas V19.8.9a.
- Bloqueia com mais força botões flutuantes legados Avatar Lab/Room V19, sem mexer em VRM/VRMA/PNG/GLB.
- Mantém preload limpo, iniciar.bat único e opção [1] apenas iniciar.
- Configurações recebe cards úteis de Interface, IA/Ollama, Avatar, Áudio e Sistema.


## V19.8.10 — Temas Yoru Ember 2026

- Tema principal da Yoru: `Yoru Ember` / id interno `yoru-ember`.
- O sistema de temas deve preservar Chat IA, Room, Widget, Preview, VRM, VRMA, expressions PNG e items GLB.
- `iniciar.bat` deve continuar único; a opção [1] apenas inicia o programa e não aplica patch.
- O runtime de tema pode estilizar botões e instalar painel em Configurações, mas não deve criar overlay flutuante nem reativar Avatar Lab / Room V19.
- Botões devem acompanhar a tela: flex-wrap, largura segura, foco visível e estados primary/secondary/room/widget/preview/danger.


## V19.8.11a — Configurações Premium Reforço 2026

- Aba Configurações deve usar o dashboard V19.8.11a.
- O card chamado **Interface** não deve voltar; usar **Aparência** para densidade/layout.
- Manter Yoru Ember como tema padrão, sem reativar Avatar Lab / Room V19.
- Reforçar idempotência: não duplicar painel, não criar overlay, não mexer em assets VRM/VRMA/PNG/GLB.
- `iniciar.bat` continua único; opção [1] apenas inicia o programa.


## V19.8.11c — Configurações Premium Robusta

- Reforço da aba Configurações para evitar tela vazia.
- Runtime único: `noelle_config_premium_v19_8_11c.js`.
- Remove referências antigas V19.8.10/V19.8.11/V19.8.11a/V19.8.11b antes de instalar o novo runtime.
- Bloqueia visualmente `Avatar Lab` e `Room V19` legados.
- Mantém Yoru Ember como tema principal e preserva Chat, Avatar, Room, Widget, VRM, VRMA, PNG e GLB.
- `iniciar.bat` permanece único; opção [1] apenas inicia.


## V19.8.13 — Rollback antigo funcional

- Reverte a janela principal para um backup funcional anterior aos runtimes agressivos de Configurações V19.8.11/11a/11b/11c/11d/12.
- Remove referências a dashboards/guards que causaram tela vazia ou texto repetido.
- Não apaga assets VRM/VRMA/PNG/GLB, Chat, Room ou Widget.
- O iniciar.bat continua único e a opção [1] apenas inicia.


## V19.8.14 — Avatar microfix

- Ajusta preview/avatar para usar A-pose leve no lugar de T-pose.
- Tenta tornar o renderer transparente (`alpha: true` + `setClearColor(0x000000, 0)`).
- Injeta CSS seguro para remover fundo branco da área do avatar.
- Patch pequeno e localizado; não mexe nas outras abas.


## V19.8.15 — Avatar fix real target

- Microfix mais certeiro para fundo branco e T-pose/A-pose no Avatar.
- Varre `src/renderer`, `src/renderer_dist` e HTMLs de preview para pegar o arquivo realmente usado pela aba Avatar.
- Não mexe nas outras abas e faz backup antes de alterar.


## V19.8.17 — Avatar targeted\n\n- Correção mira especificamente `src/renderer_dist/avatar_carousel_preview_v19_8_2.bundle.js` e `src/renderer/avatar_carousel_preview_v19_8_2_app.mjs`, encontrados pelo diagnóstico V19.8.16.\n- Remove fundo branco usando clearColor/background escuro Yoru Ember no alvo real.\n- Aplica A-pose leve após o carregamento do VRM.\n- Patch pequeno e localizado na aba Avatar.\n

## V19.8.18 — Avatar fit viewport

- Microfix para a aba Avatar caber verticalmente na janela atual.\n- O problema corrigido é layout/altura da página, não câmera 3D.\n- Preview fica limitado ao viewport e painel lateral rola por dentro se necessário.\n- Não mexe em Chat, Room, Configurações ou assets.\n

## V19.8.20 — Avatar compacto + importar

- Microfix para reduzir a altura do card do Avatar, sem mexer na câmera 3D.
- Adiciona botão **Importar avatar** na aba Avatar.
- Adiciona botão **Acionar avatar** para salvar/acionar o avatar atual pela própria aba.
- Importação copia `.vrm`/`.glb` para `src/assets/avatars` e atualiza `src/assets/avatar_manifest.json`.
- Não usa MutationObserver e não remove DOM.


## V19.8.20a — Correção de diagnóstico Avatar

- Corrige falso positivo do diagnóstico V19.8.20 que acusava `MutationObserver` por causa de comentário no runtime.
- O runtime do Avatar compacto/importar não usa observador de DOM ativo.
- Não altera layout, VRM, câmera, importação ou abas.


## V19.8.21 — Botão Adicionar avatar

- Adiciona botão **Adicionar avatar** na aba Avatar, perto de `Recarregar lista`/ações do avatar.
- O botão abre seletor `.vrm`/`.glb`, copia para `src/assets/avatars` e atualiza `src/assets/avatar_manifest.json`.
- Depois tenta clicar em `Recarregar lista` automaticamente.
- Micro-patch sem observador de DOM, sem remover containers e sem mexer no renderer 3D.


## V19.8.22 — Main performance modular

- Primeira fase de modularização segura do `main.js`.
- Adiciona módulos `src/main/performance/ollama_http_agent_v19_8_22.cjs` e `safe_json_v19_8_22.cjs`.
- `ollamaRequest` passa a usar HTTP keep-alive para reduzir overhead em chamadas locais ao Ollama.
- `writeJson` passa a usar escrita atômica para reduzir risco de corromper estado.
- `loadState`/`saveState` recebem cache curto de 1 segundo para reduzir leituras repetidas de disco.
- Não mexe em UI, Avatar, Room, Chat ou renderer.


## V19.8.23 — Log queue performance

- Segunda fase de performance/manutenção do `main.js`.
- Extrai fila de logs para `src/main/performance/log_queue_v19_8_23.cjs`.
- `appendLog` deixa de usar `fs.appendFileSync` direto no main process.
- Logs passam a ser agrupados e escritos assíncronamente.
- Adiciona rotação simples quando o log passa de 2 MB.
- Adiciona flush seguro em `before-quit` quando o padrão existe.
- Não mexe em Avatar, Chat, Room, UI ou preload.


## V19.8.23a — Log queue fix

- Corrige o V19.8.23 quando o padrão exato de `appendLog` não é encontrado.
- Usa scanner de função com balanceamento de chaves para substituir `appendLog` de forma mais robusta.
- Mantém `log_queue_v19_8_23.cjs` como módulo extraído.
- Não mexe em UI, Avatar, Chat, Room ou preload.


## V19.8.24 — Clean maintenance

- Limpeza controlada de manutenção.
- `package.json` mantém scripts principais e move scripts legados V19.x para `docs/SCRIPTS_LEGADOS_V19_8_24.md`.
- `main.js` unifica o IPC de adicionar/importar avatar em V19.8.24 com aliases compatíveis V19.8.20/V19.8.21.
- `preload.js` expõe `noelleAvatarImport`, `noelleAvatarImportV19824`, `noelleAvatarImportV19821` e `noelleAvatarImportV19820` apontando para o canal novo.
- Não mexe em UI, Avatar renderer, Chat, Room, assets ou renderer_dist.


## V19.8.25 — Root BAT cleanup

- Move `.bat` legados da raiz para `legacy_bats/`.
- Mantém apenas `iniciar.bat` como arquivo `.bat` principal da raiz.
- Arquivos movidos nesta execução: 6.
- Não mexe em UI, Avatar, Chat, Room, renderer, preload ou assets.


## V19.8.26 — Main performance finish

- Fecha pontos incompletos da performance do `main.js`.
- `writeJson` passa a usar `writeJsonAtomic`.
- `ollamaRequest` passa a usar `agent: OLLAMA_HTTP_AGENT`.
- `loadState`/`saveState` recebem cache curto V19.8.26.
- Nao mexe em UI, Avatar, Chat, Room, renderer, preload ou assets.


## V19.8.27 — Controls core split

- Primeira quebra segura do `src/renderer/controls_window_app.js`.
- Cria `src/renderer/modules/noelle_renderer_core_v19_8_27.js`.
- Move helpers simples de UI/DOM/status/tema para o módulo core.
- `controls_window_app.js` mantém stubs compatíveis chamando o módulo, reduzindo acoplamento sem reescrever a janela.
- Não mexe no Avatar renderer, Chat, Room, preload, main ou renderer_dist.


## V19.8.27a — Core diagfix

- Corrige falso positivo do diagnóstico V19.8.27 no módulo core.
- `classList.remove` não remove elemento do DOM, mas o diagnóstico antigo interpretava como remoção de DOM.
- O módulo core passa a usar `classList.toggle(..., false)`.
- Não mexe no Avatar renderer, Chat, Room, main, preload ou renderer_dist.


## V19.8.27b — Controls syntax fix

- Corrige erro de sintaxe em `src/renderer/controls_window_app.js` causado pela extração de `updateAssetSummary(counts = {})` no V19.8.27.
- A causa foi o scanner antigo confundir o `{}` do parâmetro padrão com o corpo da função.
- `updateAssetSummary` agora fica como stub correto chamando `NoelleRendererCoreV19827.updateAssetSummary`.
- Não mexe no Avatar renderer, Chat, Room, main, preload ou renderer_dist.


## V19.8.27c — updateAssetSummary hardfix

- Corrige definitivamente o erro `function updateAssetSummary(counts = {}) ... }) {` em `controls_window_app.js`.
- O V19.8.27b detectou o padrão, mas não removeu todos os resíduos do corpo antigo.
- O hardfix neutraliza a linha quebrada, remove o corpo antigo quando possível e valida com `node --check`.
- Não mexe no Avatar renderer, Chat, Room, main, preload ou renderer_dist.


## V19.8.27d — Diagnostic regex fix

- Corrige falso positivo do diagnóstico V19.8.27c.
- `node --check` já passava, mas a regex do diagnóstico era ampla demais e acusava `updateAssetSummary` quebrado mesmo com sintaxe válida.
- O diagnóstico agora procura apenas o padrão literal quebrado `}) {` da linha antiga.
- Não mexe em Avatar, Chat, Room, main, preload ou renderer_dist.


## V19.8.28 — Status/Assets split

- Segunda quebra segura do `src/renderer/controls_window_app.js`.
- Cria `src/renderer/modules/noelle_status_assets_v19_8_28.js`.
- Move `refreshStatus` e `loadAssets` para o módulo status/assets.
- Mantém renderização de cards/assets no arquivo original por enquanto.
- Não mexe no Avatar renderer, Chat, Room, main, preload ou renderer_dist.


## V19.8.29 — Stream Tab Skeleton

- Cria a aba **Stream** como Fase 1 da IA em tempo real.
- A aba Stream nesta fase é apenas visual: não liga microfone, não transcreve, não chama Ollama e não chama TTS.
- Regra inicial do projeto: o microfone nunca liga automaticamente; só poderá ligar quando o usuário apertar "Iniciar escuta" em fase futura.
- Regra principal StreamGuard: Noelle/Yoru só responde se a fala for uma pergunta direcionada a ela.
- Wake words obrigatórias por padrão: Noelle, Yoru, Ei Noelle, Ei Yoru.
- Exemplo: "Como faço isso?" não responde. "Noelle, como faço isso?" responde.
- Nunca deixar conversa contínua como padrão.


## V19.8.30 — Stream Mic Button

- Fase 2 da aba Stream.
- O microfone só liga quando o usuário aperta **Iniciar escuta**.
- O botão **Parar escuta** desliga todas as tracks do microfone.
- Se a janela ficar oculta ou fechar, o microfone é desligado.
- Mostra volume real no medidor da aba Stream.
- Não faz STT, não chama Ollama e não chama TTS nesta fase.
- A regra StreamGuard continua: Noelle/Yoru só responde pergunta direcionada a ela, em fases futuras.


## V19.8.30a — Stream Mic diagfix

- Corrige falso positivo do diagnóstico V19.8.30.
- O módulo de microfone continha as palavras STT/Ollama/TTS apenas em comentários, mas o diagnóstico interpretava como código real.
- O diagnóstico V19.8.30a remove comentários e strings antes de procurar chamadas indevidas.
- A fase continua sendo apenas microfone por botão + medidor de volume real.
