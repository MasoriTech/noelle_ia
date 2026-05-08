# Yoru Bridge Modern 1.8.36 - ContractsCore - 2026

Foco: melhorar skills existentes sem adicionar automação perigosa.

## Melhorias

- `/skills` virou SkillHub com status, comandos, busca e exemplos.
- App Inventory ganhou favoritos e recentes:
  - `/apps favoritos`
  - `/apps favorito add nome`
  - `/apps favorito remove nome`
  - `/apps recentes`
- Busca/listagem de apps marca favoritos com estrela.
- Ao abrir app pela Yoru, o histórico local é atualizado em `data/apps_prefs.json`.
- Tarefas ganharam:
  - `/tarefa remover número`
  - `/tarefa limpar concluidas`
- `/projeto status` e `/projeto proxima versao` foram atualizados para a linha atual.
- `/mega check` agora lista SkillHub e arquivos de preferências locais.

## Segurança

- Nenhum controle livre do PC foi liberado.
- Fechar janelas continua exigindo confirmação.
- Organização de downloads continua conservadora.
- Favoritos/recentes ficam apenas no arquivo local do pack.
