# Organização no GitHub

## Branches sugeridos

```txt
main      versão estável
dev       testes gerais
audio     desenvolvimento do STT/TTS
avatar    animações e avatar
```

## Tags sugeridas

```txt
v1.0.0-public
v1.1.0-chat
v1.2.0-audio-stt
v1.3.0-tts
```

## Antes de commitar

Verifique se não entrou:

```txt
node_modules/
logs/
release/
build/
dist/
modelos/cache
.venv/
*.zip
```

## Fluxo recomendado

```bash
git add .
git commit -m "v1.0.0 base publica da Noelle IA"
git tag v1.0.0-public
git push origin main --tags
```
