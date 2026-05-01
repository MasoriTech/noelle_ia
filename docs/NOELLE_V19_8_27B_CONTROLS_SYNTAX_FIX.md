# Noelle/Yoru V19.8.27b — Controls syntax fix

Corrige o erro:

```txt
SyntaxError: Unexpected token ')'
function updateAssetSummary(counts = {}) { ... }) {
```

## Causa

O scanner do V19.8.27 procurava a primeira `{` depois do nome da função.  
Em `updateAssetSummary(counts = {})`, ele pegou o `{}` do parâmetro padrão, não o corpo real da função.

## Correção

- corrige `updateAssetSummary`;
- mantém o stub chamando o módulo core;
- valida `node --check src/renderer/controls_window_app.js`;
- não mexe no Avatar renderer, Chat, Room, main, preload ou renderer_dist.

## Como aplicar

```bat
node scripts\apply_v19_8_27b_auto_2026.cjs
```

Ou pelo `iniciar.bat`.
