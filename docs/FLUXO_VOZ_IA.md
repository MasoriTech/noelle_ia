# Fluxo Voz IA

1. Usuário aperta botão Falar.
2. Estado vira `listening`.
3. VAD espera silêncio de 5 segundos.
4. STT transcreve.
5. `intent_filter` decide se responde, ignora, salva memória ou pede web.
6. Ollama responde.
7. TTS fala por fila.
8. Avatar muda para `speaking`.
9. Ao terminar, volta para `idle`.

## Fallbacks obrigatórios

- STT falhou: liberar digitação.
- TTS falhou: mostrar texto.
- Ollama falhou: mostrar diagnóstico.
- Avatar falhou: manter chat funcionando.
