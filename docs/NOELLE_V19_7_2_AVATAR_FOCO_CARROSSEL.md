# Noelle/Yoru V19.7.2 — Avatar Foco + Carrossel VRM

Objetivo: a aba/janela de Avatar deve focar no personagem.

## Layout

- Avatar grande à esquerda.
- Opções à direita.
- Setas embaixo do avatar.
- Preview limpo, com menos texto técnico.

## Fluxo

1. O aplicador procura arquivos `.vrm`, `.glb` e `.gltf` em:
   - `src/assets/`
   - `src/assets/avatars/`
   - `src/assets/vrm/`
   - `src/assets/models/`
2. Ele gera `src/assets/avatar_manifest.json`.
3. O preview carrega um avatar por vez.
4. As setas esquerda/direita trocam o personagem.
5. Botões de destino:
   - Room / Quarto
   - Widget Mode
   - Preview / Teste

## Regra de arquitetura

A aba Avatar escolhe e testa o avatar. A Room aplica quarto/objetos. Widget Mode mostra o avatar sem fundo.
