# Avatar Owner Width V38.1

## Objetivo

Reduzir a largura horizontal do render da aba Avatar sem mexer no render interno.

## Tamanho aplicado

```css
width: min(100%, 1120px);
max-width: 1120px;
margin: 0 auto;
```

## Onde alterar manualmente

Arquivo:

```txt
src/renderer/pages/avatar/avatar_render_owner_v38.js
```

Procure:

```css
width:min(100%, 1120px);
max-width:1120px;
```

Troque para:

- 1040px se quiser menor
- 1180px se quiser maior
- 1240px se quiser quase como antes