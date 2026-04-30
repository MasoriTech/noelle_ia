# Noelle/Yoru V19.8.24 — Clean maintenance

Este pack faz a limpeza controlada que foi planejada depois das fases de performance V19.8.22/V19.8.23.

## O que faz

- limpa `package.json`;
- move scripts antigos V19.x para `docs/SCRIPTS_LEGADOS_V19_8_24.md`;
- mantém scripts principais:
  - `start`
  - `check`
  - `diagnostico`
  - `diagnostico:main`
  - `diagnostico:preload`
  - `diagnostico:avatar`
  - `repair:v19.8.24-clean`
- unifica importação de avatar no `main.js`;
- unifica aliases de importação no `preload.js`;
- preserva compatibilidade com V19.8.20/V19.8.21:
  - `noelleAvatarImportV19820`
  - `noelleAvatarImportV19821`
  - `noelleAvatarImportV19824`
  - `noelleAvatarImport`

## O que NÃO faz

- não mexe na UI;
- não mexe no Avatar renderer;
- não mexe em Chat;
- não mexe em Room;
- não apaga scripts físicos antigos;
- não mexe em `renderer_dist`.

## Como aplicar

1. Copie para a raiz do projeto.
2. Rode `iniciar.bat`.
3. Escolha `[3] Aplicar limpeza controlada V19.8.24`.
4. Rode `[2]` diagnóstico.
5. Abra pela opção `[1]`.
