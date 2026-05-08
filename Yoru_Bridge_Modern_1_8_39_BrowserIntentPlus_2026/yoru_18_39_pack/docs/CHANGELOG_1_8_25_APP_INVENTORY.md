# Changelog 1.8.25 - App Inventory

Nova skill local para a Yoru saber quais programas existem no PC.

## Comandos

- `/apps scan`: escaneia Menu Iniciar e registro de apps instalados.
- `/apps list`: lista programas abríveis.
- `/apps buscar nome`: busca no inventário local.
- `/apps abrir nome`: abre programa via atalho/executável seguro.
- `abre o programa nome`: comando natural.

## Segurança

- O inventário fica local em `data/apps_inventory.json`.
- A skill evita atalhos de uninstall/setup/help/update.
- Em empate de nomes, ela pede um nome mais específico em vez de abrir o app errado.
- Apps achados apenas no Registro entram como inventário; só são abertos se houver caminho executável seguro.
