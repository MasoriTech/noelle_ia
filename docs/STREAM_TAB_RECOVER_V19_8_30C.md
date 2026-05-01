# Stream IA — V19.8.30c Stream Tab Recover

Corrige a aba Stream sumida.

## Causa provável

A aba Stream era injetada antes/ao redor do `controls_window_app.js`. Em alguns casos a inicialização da janela principal podia não reconhecer ou sobrescrever a aba.

## Correção

Cria:

```txt
src/renderer/modules/noelle_stream_tab_recover_v19_8_30c.js
```

Esse recovery:

- garante o botão/menu `Stream`;
- garante a página `data-page="stream"`;
- roda depois do `controls_window_app.js`;
- cria fallback visual caso a Stream page original não carregue;
- não liga microfone automaticamente;
- não chama STT;
- não chama Ollama;
- não chama TTS.

## Como aplicar

```bat
node scripts\apply_v19_8_30c_auto_2026.cjs
```
