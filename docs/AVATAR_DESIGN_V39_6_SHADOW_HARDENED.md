# Avatar Design V39.6 Shadow Hardened

## O que mudou

A aba Avatar agora é montada dentro de Shadow DOM:

```js
host.attachShadow({ mode: "open" })
```

Isso isola o layout do CSS antigo do app.

## Estrutura esperada

```txt
avatarDesignHostV396
└── shadowRoot
    └── avatarDesignRootV396
        ├── header
        └── main
            ├── preview
            │   └── iframe Loadfile v19.8.3
            └── side panel
```

## Onde ajustar medidas

Arquivo:

```txt
src/renderer/pages/avatar/avatar_design_v39_6.css
```

Principais valores:

```css
.av396-root {
  height: calc(100vh - 148px);
  min-height: 620px;
}

.av396-main {
  grid-template-columns: minmax(640px, 1fr) 380px;
}
```

## Por que isso é mais robusto

O Shadow DOM impede que estilos globais antigos como `.page`, `.card`, `section`, `aside`, `main`, etc. quebrem a aba Avatar.