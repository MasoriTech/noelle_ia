# Noelle V19.2 — Settings/About Cleanup 2026

## Objetivo

Este pack corrige a sobreposição visual mais evidente da V19 e melhora duas abas específicas:

- **Configurações**
- **Sobre**

A aba **Chat IA** deve ser preservada com o mínimo de alterações.

## Mudanças

### 1. Botão Room V19 único

Remove duplicações causadas por:

- botão inline antigo em `src/controls.html`
- launcher antigo em `src/renderer/controls_window_app.js`
- re-renderizações do app

Cria um launcher canônico:

```txt
noelle-room-v19-single-launcher
```

O launcher pode ser ocultado ou reposicionado pelas Configurações V19.2.

### 2. Configurações úteis

Adiciona 30 configurações agrupadas:

- Interface
- Avatar e Room
- Chat IA, áudio e manutenção

As preferências ficam em:

```txt
localStorage: noelle.v19.settings
```

### 3. Sobre mais completo

A aba Sobre recebe:

- descrição do projeto
- formatos usados
- links úteis
- fontes de assets
- tecnologias
- regras de licença
- status esperado

### 4. Segurança do preload

Garante que `noelleRoomV19` seja exposto sem redeclarar `contextBridge`/`ipcRenderer`.

## Arquivos alterados

```txt
src/controls.html
src/renderer/controls_window_app.js
src/renderer/noelle_v19_2_settings_about_cleanup.js
preload.js
package.json
MEMORIA_GPT_NOELLE.md
```

## Arquivos preservados

```txt
src/avatar_view.html
src/renderer/avatar_window_app.js
src/assets/Noelle.vrm
src/assets/avatars/
src/assets/motions/
src/assets/expressions/
src/assets/items/
src/assets/motion_manifest.json
src/assets/item_manifest.json
```

## Teste

1. Rodar `INICIAR.bat`.
2. Escolher aplicar V19.2.
3. Abrir Noelle.
4. Confirmar que só existe um botão **Room V19**.
5. Abrir **Configurações**.
6. Ver painel "Configurações avançadas V19.2".
7. Abrir **Sobre**.
8. Ver links, formatos, regras de assets e status esperado.
9. Confirmar que Chat IA continua visualmente igual.
