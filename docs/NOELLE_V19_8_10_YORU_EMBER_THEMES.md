# Noelle/Yoru V19.8.10 — Mega Pack Temas Yoru Ember 2026

## Objetivo

Este pack consolida o sistema visual de temas da Noelle/Yoru, com foco no tema principal da Yoru:

**Yoru Ember** — preto carvão, grafite, laranja brasa e vermelho fogo.

A proposta é melhorar o visual sem reativar runtimes legados, sem criar overlays flutuantes e sem mexer nos assets principais.

## Temas incluídos

1. Yoru Ember — principal da Yoru
2. Noelle Noir — principal da Noelle
3. Yoru Midnight — escuro elegante
4. Sakura Dark — anime/fofo
5. Cyber Violet — gamer/futurista
6. Crimson Glass — premium/glass
7. Forest Spirit — uso longo/descanso
8. Light Pearl — claro opcional

## O que o pack reforça

- tema Yoru Ember como padrão;
- seletor visual de temas dentro da aba Configurações;
- botões com papéis visuais: primary, secondary, room, widget, preview, danger e ghost;
- botões com flex-wrap para acompanhar telas menores;
- foco visível em botões e inputs;
- bloqueio visual de overlays legados Avatar Lab / Room V19;
- `iniciar.bat` único;
- opção [1] apenas inicia o programa.

## O que este pack não faz

- não mexe em VRM, VRMA, PNG, GLB;
- não troca Room;
- não troca Widget;
- não troca Preview LoadFile;
- não reativa preload antigo;
- não usa PowerShell/Activate.ps1.

## Arquivos principais

- `src/styles/noelle_themes_v19_8_10.css`
- `src/renderer/noelle_theme_manager_v19_8_10.js`
- `scripts/repair_v19_8_10_yoru_ember_themes_2026.cjs`
- `scripts/diagnostico_v19_8_10_yoru_ember_themes_2026.cjs`
- `scripts/status_v19_8_10_yoru_ember_themes_2026.cjs`
- `data/noelle_theme_settings.json`
- `iniciar.bat`

## Como aplicar

1. Copie o conteúdo do pack para a raiz do projeto.
2. Rode `iniciar.bat`.
3. Escolha `[3] Reparar/aplicar Mega Temas Yoru Ember V19.8.10`.
4. Escolha `[2] Rodar diagnostico V19.8.10 Temas`.
5. Escolha `[1] Iniciar programa agora`.

## Critérios de aceite

- o app inicia pela opção [1] sem aplicar patch;
- Configurações mostra seletor de temas;
- Yoru Ember é o padrão;
- botões acompanham a largura da janela;
- botões Room, Widget e Preview têm destaque próprio;
- não aparece overlay Avatar Lab / Room V19;
- preload continua sem V19.3/V19.5 legado.
