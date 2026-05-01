# Avatar V41 — Restore Fast Loadfile + Model Viewers

## Por que esse pack existe

O Loadfile antigo carregava em um piscar de olhos porque abria direto:

```txt
./avatar_loadfile_preview_v19_8_3.html
```

O erro anterior foi tentar fazer o Loadfile aceitar troca dinâmica por `?avatar=...`.

## Arquitetura correta

```txt
Noelle padrão:
  avatar_loadfile_preview_v19_8_3.html

Outros VRM:
  renderer/viewers/vrm_viewer_v41.html?model=...

GLB personagem:
  renderer/viewers/glb_viewer_v41.html?model=...

Cenário:
  renderer/viewers/scene_viewer_v41.html?scene=...
```

## Naruto

Naruto Sala Examen Chunnin é cenário/arena:

```txt
src/assets/scenes/naruto_sala_examen_chunnin.glb
```

Ele não deve entrar na lista de avatar.

## Nezuko

Nezuko é avatar/personagem GLB:

```txt
src/assets/avatars/nezuko_kamado.glb
```

## Observação

O viewer separado usa Three.js do `node_modules`.
Se o viewer separado reclamar de Three.js, rode:

```bat
npm install
```