# Changelog 1.8.27 - Stabilize

Versão de estabilização e limpeza de release.

## Correções

- `scripts/trocar_think_model.py` não altera mais `config["version"]` ao trocar o modelo THINK.
- Removido o vault `%USERPROFILE%\Documents\Yoru_ia` de dentro do ZIP final.
- Removido `data/apps_inventory.json` vazio do pacote; o arquivo será criado após `/apps scan`.
- Detector de habilidades centralizado em `core/capabilities.py`.
- Perguntas como `habilidades?`, `skills?` e `o que você sabe fazer?` agora roteiam para `/skills` com config real.
- Memória padrão `skills_ativas.md` atualizada em `storage/vault.py`.
- User-Agent do Web Knowledge atualizado para `YoruBridge/1.8.28`.
- Status do App Inventory mostra `atualizado=nunca` quando ainda não houve scan.
- `vault_path` com `%USERPROFILE%` agora usa `Path.home()` como fallback fora do Windows.
- Fora do Windows, barras invertidas vindas de `%USERPROFILE%\Documents` são normalizadas para `/`.
- Removido retorno duplicado em `skills/apps.py`.

## Objetivo

Deixar a 1.8.26 pronta para testes mais sérios no Windows antes de adicionar widget real ou automações maiores.
