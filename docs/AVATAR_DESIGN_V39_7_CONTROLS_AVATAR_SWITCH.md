# Avatar Design V39.7 — Controls + Avatar Switch

## O que ativa

- Recarregar avatar
- Enquadrar
- Reset
- Câmera envia mensagem para iframe
- Zoom atualiza UI e aplica escala segura no iframe
- Iluminação/Pose/Fundo enviam mensagem para iframe
- Lista de troca de avatar

## Manifest

Arquivo:

```txt
src/assets/avatars/avatar_manifest_v39_7.json
```

Exemplo:

```json
{
  "avatars": [
    { "name": "Noelle", "path": "assets/Noelle.vrm", "type": "vrm" },
    { "name": "Yoru", "path": "assets/avatars/Yoru.vrm", "type": "vrm" }
  ]
}
```

## Troca real do avatar

O owner recarrega o iframe assim:

```txt
avatar_loadfile_preview_v19_8_3.html?avatar=CAMINHO
```

O script `patch_avatar_preview_query_v39_7.js` tenta adaptar o app do preview para ler esse parâmetro.