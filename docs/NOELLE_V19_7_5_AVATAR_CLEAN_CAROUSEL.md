# Noelle/Yoru V19.7.5 — Avatar limpo com carrossel

Este pack troca a tela técnica antiga do Avatar por um seletor visual limpo.

## Objetivo

A aba Avatar deve ficar assim:

```txt
avatar grande aqui        opções aqui
seta esquerda / direita   embaixo do avatar
```

## O que muda

- Substitui o painel antigo “Preview real do VRM V19.5”.
- Remove da interface o bloco técnico de sincronização.
- Mantém a aba Avatar como seleção/preview do personagem.
- Gera `src/assets/avatar_manifest.json` com os VRM/GLB encontrados.
- Carrega um avatar por vez, para ser mais leve.
- Mantém as opções separadas:
  - Room / Quarto
  - Widget Mode
  - Preview / Teste

## Arquivos principais

```txt
src/avatar_lab_v19_6.html
src/renderer/avatar_lab_v19_6_app.js
src/renderer/avatar_v19_5_panel_bootstrap.js
src/renderer/avatar_manifest_runtime_v19_7_5.js
src/assets/avatar_manifest.json
scripts/build_avatar_lab_v19_6_2026.cjs
scripts/diagnostico_v19_7_5_avatar_clean_2026.cjs
iniciar.bat
```

## Como aplicar

```bat
APLICAR_AVATAR_LIMPO_CARROSSEL_V19_7_5.bat
```

Depois use:

```bat
iniciar.bat
```

## Regra do projeto

A aba Avatar escolhe e mostra o personagem.
A Room cuida do quarto e objetos.
O Widget Mode mostra o avatar sem fundo.
O Preview/Teste serve como visualização segura.
