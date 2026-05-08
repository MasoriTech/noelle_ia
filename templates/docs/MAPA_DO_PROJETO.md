# Noelle v20 - Mapa do Projeto

Fase atual: **Chat Texto + Diagnostico Ollama**.

## Fluxo atual

```txt
renderer/chat_page.js
↓
preload/preload.js
↓
main/ipc_routes.js
↓
core/ai/prompt_router.js
↓
core/ai/ollama_client.js
↓
Ollama local
```

## Regra da v20

- Renderer não chama arquivo local direto.
- Renderer não chama Ollama direto.
- Renderer fala com `preload`.
- `preload` chama IPC.
- IPC chama `core`.
- Core retorna resultado ou erro controlado.

## Fases seguintes

1. Chat texto estável.
2. Voz IA com STT + VAD 5s.
3. TTS com fila por frases.
4. Avatar reagindo a estados.
5. Stream isolada.
6. Build portable.
