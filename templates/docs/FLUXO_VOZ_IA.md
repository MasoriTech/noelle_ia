# Fluxo Voz IA - Próxima Fase

Ainda não está ativo neste pack.

Fluxo planejado:

```txt
Botão Falar
↓
Captura áudio
↓
VAD com silêncio de 5s
↓
STT
↓
Filtro de intenção
↓
Ollama
↓
TTS por frases
↓
Avatar falando
↓
Volta para pronto
```

Fallbacks obrigatórios:

- STT falhou → usuário pode digitar.
- TTS falhou → resposta aparece em texto.
- Ollama falhou → mostra diagnóstico.
- Avatar falhou → chat continua.
