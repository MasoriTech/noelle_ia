# Changelog 1.8.5 - FastLane Stream Cache

Foco: melhorar velocidade percebida e reduzir chamadas desnecessárias ao modelo.

## Mudanças
- Saída incremental opcional do modelo (`/streamout on`).
- Cache de respostas curtas (`/cache`, `/cache clear`).
- Prompts ainda menores.
- Memória mais curta e cache do vault mais longo.
- Cache de áudio Edge TTS: respostas repetidas não precisam gerar mp3 de novo.
- `/warmup` para aquecer FAST/THINK.
- Submenu Velocidade atualizado.
- Removido `__pycache__` do zip.

## Dica
Para seu PC, use:
- `/turbo`
- `/streamout on`
- FAST para conversa leve
- THINK só para análise/projeto
