# NoelleKoboldReplace 1.8.43

Objetivo: substituir completamente o chat/Ollama do Noelle Companion pelo chat da Yoru usando KoboldCpp.

## Como usar no GitHub do Noelle

1. Copie esta pasta do pack para dentro do repositório como `yoru_chat/`.
2. Na raiz do Noelle, rode:

```bash
node yoru_chat/noelle_kobold_replace/apply_noelle_kobold_replace_2026.cjs
```

3. Rode o diagnóstico:

```bash
node yoru_chat/noelle_kobold_replace/diagnostico_noelle_kobold_replace_2026.cjs
```

4. Inicie o app:

```bash
npm start
```

## O que o patch faz

- Copia `yoru_kobold_embedded_client.cjs` para `src/main/`.
- Atualiza `package.json` para incluir `yoru_chat/**/*` no build.
- Substitui `ipcMain.handle("noelle:chat")` para chamar `python -m yoru_bridge embedded`.
- Substitui `noelle:status` para mostrar Kobold/Yoru e marcar Ollama como desativado no chat.
- Não usa API HTTP.

## Donos de cada parte

- Noelle: janela, avatar, renderer, TTS/STT visual.
- Yoru: chat, skills, contratos, KoboldCpp FAST/THINK.
