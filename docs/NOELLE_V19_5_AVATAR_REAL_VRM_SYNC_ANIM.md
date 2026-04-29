# Noelle V19.5 — Avatar Real VRM Sync Anim 2026

Este pack implementa os quatro itens que ficaram fora do V19.4.1:

1. Preview real do VRM.
2. Loader novo do avatar/widget.
3. Sincronização com Room.
4. Animações VRM/VRMA.

## Como funciona

### Preview real do VRM

A aba Avatar recebe um painel novo com canvas WebGL. Ele carrega:

```txt
./assets/Noelle.vrm
./assets/avatars/Yoru.vrm
./assets/avatars/Noelle.vrm
```

O loader usa:

```js
GLTFLoader
VRMLoaderPlugin
gltf.userData.vrm
vrm.scene
```

### Animações VRMA

O preview tenta ler:

```txt
./assets/motion_manifest.json
./assets/motions/motion_manifest.json
./assets/room_manifest.json
```

E toca `.vrma` usando:

```js
VRMAnimationLoaderPlugin
createVRMAnimationClip
```

Se não tiver VRMA funcionando, usa idle simples como fallback.

### Sincronização com Room

O avatar envia eventos por:

```txt
BroadcastChannel("noelle-avatar-room-sync")
localStorage: noelle.avatar.sync.state
CustomEvent: noelle:avatar-sync
```

A Room recebe por:

```txt
src/renderer/avatar_room_sync_bridge_v19_5.js
```

Ela tenta chamar APIs conhecidas se existirem:

```js
window.noelleRoomPlayer
window.roomPlayerApi
window.noelleRoomV19
```

Se essas APIs ainda não existirem na Room, o estado fica salvo e visível para o próximo patch conectar diretamente no player real.

## Arquivos

```txt
src/renderer/avatar_v19_5_panel_bootstrap.js
src/renderer/avatar_v19_5_preview_app.js
src/renderer/avatar_room_sync_bridge_v19_5.js
scripts/build_avatar_v19_5_2026.cjs
scripts/apply_v19_5_avatar_real_vrm_sync_anim_2026.cjs
scripts/diagnostico_v19_5_avatar_real_vrm_sync_anim_2026.cjs
docs/NOELLE_V19_5_AVATAR_REAL_VRM_SYNC_ANIM.md
```

## Uso

```bat
INICIAR.bat
```

Escolha:

```txt
[1] Aplicar V19.5 Avatar completo e iniciar Noelle
```

## Depois de aplicar

Se o bundle não existir, rode:

```bat
npm install
npm run build:avatar-v19.5
```

## Não entrou neste pack

Nada dos quatro itens ficou totalmente ignorado.

Limite conhecido:
- A sincronização profunda depende da Room consumir os eventos ou expor API do player. O bridge já envia/recebe e tenta chamar APIs conhecidas, mas talvez o próximo patch precise conectar isso ao player interno real da Room se o nome da API for diferente.
