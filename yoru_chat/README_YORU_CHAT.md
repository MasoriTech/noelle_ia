# Yoru Chat Core 1.8.44 RepoOrganized

Esta pasta deve ficar dentro do GitHub do Noelle como `noelle_ia/yoru_chat/`.

## Função desta pasta

A Yoru é o backend de chat/cérebro:

- FAST / THINK / DUAL via KoboldCpp;
- skills locais;
- contratos de resposta;
- navegador/apps/arquivos/desktop;
- modo embedded para Electron.

## Não é função desta pasta

- criar janela;
- renderizar avatar;
- substituir renderer do Noelle;
- controlar todo TTS/STT do app.

O Noelle continua cuidando da interface. A Yoru responde ao canal de chat.

## Rodar teste rápido

```bat
python scripts	est_embedded_stdio.py
```

ou:

```bat
python -m yoru_bridge embedded
```
