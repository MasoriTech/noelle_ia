# Noelle/Yoru V19.8.27 — Controls core split

Primeira quebra segura do `src/renderer/controls_window_app.js`.

## Por que esta fase é pequena

O `controls_window_app.js` concentra navegação, abas, chat, assets, avatar, estado, temas e eventos. Em vez de reescrever a janela inteira de uma vez, esta fase só extrai helpers simples e deixa stubs compatíveis no arquivo original.

## Arquivo novo

```txt
src/renderer/modules/noelle_renderer_core_v19_8_27.js
```

## Funções movidas para o módulo core

```txt
nowTime
showToast
escapeText
selectHasValue
setGlobalStatus
setChatStatus
autosizeTextarea
scrollChatToBottom
applyTheme
updateAssetSummary
```

## O que não mexe

- Avatar renderer;
- Chat logic;
- Room;
- main.js;
- preload.js;
- renderer_dist;
- layout HTML principal.

## Como aplicar

```bat
node scripts\apply_v19_8_27_auto_2026.cjs
```

Ou manualmente:

```bat
node scripts\repair_v19_8_27_controls_core_split_2026.cjs
node scripts\diagnostico_v19_8_27_controls_core_split_2026.cjs
```

Depois teste o app e faça commit.
