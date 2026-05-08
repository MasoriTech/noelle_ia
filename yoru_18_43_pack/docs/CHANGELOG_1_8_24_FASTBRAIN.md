# Yoru Bridge Modern 1.8.24 - FastBrain

## Objetivo
Melhorar o cérebro FAST mantendo compatibilidade com PC antigo.

## Mudanças
- Versão atualizada para `1.8.24-fastbrain-2026`.
- `brain_mode` padrão voltou para `auto`: FAST para conversa leve, THINK para projeto/técnico/conhecimento.
- FAST agora usa prompt mais curto quando o perfil é companion.
- `KoboldClient` aceita parâmetros extras de sampling:
  - `top_p`
  - `top_k`
  - `min_p`
  - `repeat_penalty`
  - `presence_penalty`
- FAST padrão:
  - temperatura 0.24
  - top_p 0.88
  - min_p 0.04
  - repeat_penalty 1.08
  - max_tokens 72
- Novo comando `/fastbrain`:
  - `/fastbrain turbo`: Qwen3.5 0.8B
  - `/fastbrain plus`: Qwen3 1.7B
  - `/fastbrain gemma`: Gemma 3 1B experimental
- Guarda de qualidade do FAST remove `<think>` e corta resposta longa demais.
- Perguntas longas podem subir automaticamente para THINK quando não foram forçadas com `/fast`.

## Nota
A versão não baixa modelos automaticamente. Ela só prepara config, presets e BATs para os caminhos configurados.
