# Noelle V19.6 — Avatar Lab Isolated

Este pack adiciona os quatro itens que você pediu sem quebrar a troca de abas:

1. Preview real do VRM.
2. Loader novo do avatar/widget.
3. Sincronização real com Room.
4. Animações VRM/VRMA.

## Por que agora é isolado?

O V19.5 quebrou a mudança de abas porque injetava o preview diretamente no app principal.
A V19.6 cria uma janela separada:

```txt
src/avatar_lab_v19_6.html
```

Assim o preview real do VRM não briga com a navegação do app principal.

## Como abrir

Depois de aplicar, aparece um botão flutuante:

```txt
🧪 Avatar Lab
```

Ou abra direto:

```txt
src/avatar_lab_v19_6.html
```

## Se der Failed to fetch

Use o campo:

```txt
Ou carregar VRM/GLB local
```

Isso usa `URL.createObjectURL(file)` e evita problema de caminho relativo em `file://`.

## Sincronização com Room

O Avatar Lab envia:

```txt
BroadcastChannel: noelle-avatar-room-sync
localStorage: noelle.avatar.sync.state
CustomEvent: noelle:avatar-sync
```

A Room recebe pela bridge:

```txt
src/renderer/room_sync_bridge_v19_6.js
```

## Não entra neste pack

Nada dos quatro itens foi deixado de fora.

Limite conhecido:
- A sincronização visual profunda depende de a Room expor APIs internas do player. O bridge tenta nomes comuns e também dispara evento `noelle:room-avatar-sync`.
