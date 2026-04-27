# Noelle Companion 2026 — Mega Pack V14

Este pack é uma correção grande, mas organizada, para estabilizar a base Electron atual da Noelle sem repetir os remendos antigos.

## Objetivo

- Corrigir a arquitetura principal do Electron.
- Recriar a ponte segura `preload.js` com `window.noelleAPI` e compatibilidade `window.desktopWidget`.
- Manter o Chat IA com layout fixo e sem input por cima das mensagens.
- Reativar a aba Emotes usando `src/assets/expressions/manifest.json` e os PNGs da Noelle.
- Atualizar `requirements.txt` do STT.
- Atualizar `package.json` com Electron e electron-builder de 2026.
- Mover sobras de hotfixes antigos para backup, sem apagar direto.
- Manter só um `.bat`: `INICIAR.bat`.

## Como aplicar

Extraia o ZIP na raiz do projeto, onde ficam `package.json` e `main.js`.

Depois rode:

```bat
INICIAR.bat
```

Ordem recomendada:

1. `[1] Aplicar Mega Pack V14 completo`
2. `[3] Instalar/atualizar dependências npm`
3. `[2] Diagnóstico completo`
4. `[5] Iniciar Noelle`

## Backup

O aplicador cria backup automático em:

```txt
backups/mega_pack_v14_DATA_HORA
```

Os hotfixes antigos movidos vão para:

```txt
backups/mega_pack_v14_DATA_HORA/legacy_hotfixes
```

## Sobre os emotes

O pack não apaga PNGs. Ele lê:

```txt
src/assets/expressions/manifest.json
src/assets/expressions/*.png
```

Se o manifest estiver vazio ou inválido, ele cria um padrão com:

```txt
angry.png
sick.png
sad.png
happy.png
```

## Depois de testar

Se funcionar:

```bat
git status
git add .
git commit -m "Aplica Mega Pack V14 da Noelle"
git push origin main
```

Se algo não ficar bom, restaure os arquivos pelo backup criado.
