# Yoru Bridge Modern 1.8.30 - AvatarBridgeCore

Foco: preparar o Python da Yoru para uma janela/avatar externo sem mexer no TTS.

## Adicionado

- `core/events.py`: barramento local que grava eventos JSONL.
- `core/runtime_state.py`: estado central `idle/listening/thinking/responding/speaking/error`.
- `integrations/avatar_bridge.py`: comandos `/avatar`, `/bridge` e `/godot`.
- Eventos locais `say`, `state`, `emote` e `ping`.
- Arquivos locais `data/avatar_events.jsonl` e `data/runtime_state.json`.

## Comandos novos

```txt
/avatar status
/avatar teste
/avatar eventos
/avatar limpar eventos --confirmar
/avatar emote happy
/avatar state thinking
/avatar dizer texto
/bridge status
/godot status
```

## Mantido

- TTS não foi alterado nesta versão.
- Nenhuma janela ou UI foi criada aqui.
- Sem servidor local, sem WebSocket e sem novas dependências.

## Objetivo

A janela/Godot em desenvolvimento pode ler os arquivos locais e reagir a eventos sem acoplar a UI diretamente ao loop principal da Yoru.
