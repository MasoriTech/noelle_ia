# Integração Noelle + Yoru/KoboldCpp

## Decisão de arquitetura

- Noelle = app visual Electron.
- Yoru = cérebro/chat embutido.
- KoboldCpp = servidor dos modelos locais.
- Ollama = removido do caminho principal do chat.

## Canal usado

O Noelle já usa IPC `noelle:chat`. O patch troca o backend desse canal para chamar a Yoru por processo filho Python/STDIO.

## Fluxo

```txt
renderer do Noelle
→ window.noelleAPI.chat(payload)
→ ipcMain.handle("noelle:chat")
→ yoru_chat/noelle_kobold_replace/yoru_kobold_embedded_client.cjs
→ python -m yoru_bridge embedded
→ KoboldCpp FAST/THINK
```

## Pasta final recomendada

```txt
noelle_ia/
  yoru_chat/
    src/yoru_bridge/
    config.json
    requirements/
    noelle_kobold_replace/
```

## Comandos de diagnóstico

```bat
node yoru_chat
oelle_kobold_replace\diagnostico_noelle_kobold_replace_2026.cjs
python yoru_chat\scripts	est_embedded_stdio.py
```
