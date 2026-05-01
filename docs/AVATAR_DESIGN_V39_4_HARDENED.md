# Avatar Design V39.4 Hardened

## Decisão técnica

A aba Avatar passa a ter um único responsável:

```txt
src/renderer/pages/avatar/avatar_design_owner_v39_4.js
```

O estilo fica isolado em:

```txt
src/renderer/pages/avatar/avatar_design_v39_4.css
```

## Renderer preservado

```txt
src/avatar_loadfile_preview_v19_8_3.html
```

## O que foi corrigido

- Preview sempre na coluna esquerda.
- Painel direito sempre na coluna direita.
- `grid-template-areas` aplicado no CSS e reforçado pelo JS.
- Health check reconstrói a UI se algum script antigo mexer no DOM.
- Antigos owners v31-v39.3 são desativados no `controls.html`.
- `MutationObserver` usa debounce.
- Listeners dos botões usam bind único.

## Onde ajustar medidas

No CSS:

```txt
src/renderer/pages/avatar/avatar_design_v39_4.css
```

Valores principais:

```css
#avatarDesignOwnerV394 {
  height: calc(100vh - 138px);
  min-height: 600px;
  grid-template-rows: 64px minmax(0, 1fr);
}

#avatarDesignMainV394 {
  grid-template-columns: minmax(620px, 1fr) 390px;
  gap: 16px;
}
```

Sugestões:

- painel direito menor: `390px` -> `360px`
- preview mínimo maior: `620px` -> `700px`
- altura maior: `calc(100vh - 138px)` -> `calc(100vh - 118px)`
