# Yoru Bridge 1.8.6 - Performance Guard

## Objetivo
Melhorar desempenho em PC antigo sem remover recursos.

## Mudanças
- AutoSpeed: se a chamada ao modelo passar do limite, a Bridge reduz contexto por um tempo.
- Timeouts separados para FAST e THINK.
- Cooldown de falha de modelo para não insistir em porta travada.
- TTS com fila curta e descarte de fala antiga quando acumular.
- FAST com TTS desligado por padrão.
- Prompts e memória mais curtos.
- `/perf`, `/autospeed on/off`, `/fastvoice on/off`.

## Recomendação
Para uso diário em PC fraco:
1. Use `/turbo`.
2. Use `/streamout on`.
3. Use `/fastvoice off`.
4. Use `/warmup` após abrir FAST/THINK.
