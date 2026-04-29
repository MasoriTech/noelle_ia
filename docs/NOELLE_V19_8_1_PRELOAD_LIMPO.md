# Noelle V19.8.1 — Preload Limpo

Este patch segue a memória do projeto: preservar Chat IA, avatar/widget VRM, motions VRMA, expressions PNG, items GLB, Room, bandeja e inicializador único.

## Objetivo

Limpar o `preload.js` para que ele volte a ser ponte segura do Electron, não injetor de interface antiga.

## O que muda

- Remove do `preload.js` as injeções visuais antigas:
  - `noelle_v19_3_complete_ui_md.js`
  - `avatar_v19_5_panel_bootstrap.js`
- Preserva APIs:
  - `window.noelleAPI`
  - `window.desktopWidget`
  - `window.noelleRoom`
- Mantém compatibilidade `window.noelleRoomV19` como API, sem criar botão flutuante.
- Remove script tags legadas de `src/controls.html`, se existirem.
- Atualiza `package.json` com scripts de diagnóstico/reparo V19.8.1.
- Atualiza `MEMORIA_GPT_NOELLE.md` com nota V19.8.1.

## O que este patch NÃO faz

- Não redesenha a aba Avatar.
- Não troca o renderer principal.
- Não apaga VRM, VRMA, PNG ou GLB.
- Não altera Room, Chat, STT/TTS ou assets.

## Por que isso é necessário

A tela Avatar antiga ficava voltando porque o `preload.js` ainda injetava runtimes visuais antigos. Esses runtimes criavam botões como `Avatar Lab` e `Room V19` e mexiam no DOM com observadores.

A V19.8.1 corta essa raiz sem mexer no layout final ainda. A próxima fase é a V19.8.2: Aba Avatar real no renderer principal.
