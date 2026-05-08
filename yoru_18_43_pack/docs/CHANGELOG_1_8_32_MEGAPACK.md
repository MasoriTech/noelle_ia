# Yoru Bridge Modern 1.8.32 - MegaPack

Versão focada em correção de bugs, limpeza e estabilidade.

## Correções

- Corrige emissão de `tts_start`: agora acontece imediatamente antes do playback, depois de `audio_ready`.
- Corrige corrida do `/tts parar`, evitando limpar o sinal de parada antes do worker perceber.
- Evita que `ask_model`/`ask_dual_model` sobrescrevam `speaking` com `idle` enquanto o TTS ainda está ocupado.
- EventBus continua sequência de eventos ao reiniciar o app.
- Roteamento de comandos com prefixos exatos para reduzir falso positivo.
- Atualiza versões, User-Agent e documentação para 1.8.32.

## Novo

- `/mega check`, `/mega status` e `/diagnostico pack`.
- `requirements/requirements_mega.txt`.
- `instalar_dependencias.bat` como segundo BAT opcional para dependências.

## Mantido

- Edge TTS + `pt-BR-FranciscaNeural` como voz principal.
- pygame como player interno/controlável.
- Sem integrações antigas de avatar externo removidas anteriormente.
- Sem mexer na janela/Godot.
