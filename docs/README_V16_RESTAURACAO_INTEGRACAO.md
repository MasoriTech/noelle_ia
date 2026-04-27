# Noelle V16 - restauração de integração

Este pack foi feito para parar de redesenhar a interface e restaurar a integração útil:

- `INICIAR.bat` verifica e instala o essencial antes de abrir a Noelle.
- A janela do avatar volta como widget separado.
- A aba Emotes lê `src/assets/expressions` e `src/assets/motions`.
- O inventário lê `src/assets/item_manifest.json` e `src/assets/items`.
- O TTS é essencial no boot: instala `piper-tts` e usa fallback Windows SAPI se ainda não houver voz Piper `.onnx`.
- O Chat IA continua com layout moderno e input fixo.

## Arquivos preservados

O pack não inclui nem apaga assets. Ele espera que estes arquivos já existam no seu repo:

```txt
src/assets/Noelle.vrm
src/assets/avatars/*.vrm
src/assets/motions/*.vrma
src/assets/expressions/*.png
src/assets/items/*.glb
```

## Ordem recomendada

```bat
INICIAR.bat
```

Escolha:

```txt
[1] Iniciar Noelle (verifica/instala tudo antes)
```

## Observação sobre VRMA

A janela do avatar volta a receber comandos de motion/expressão/item. O viewer 3D tenta carregar `Noelle.vrm` com `three` e `@pixiv/three-vrm`. A reprodução real de animação `.vrma` pode exigir um loader específico em etapa posterior; este pack reconecta o fluxo sem quebrar o widget.
