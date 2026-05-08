# Changelog 1.8.28 - DesktopContext

## Adicionado

- Skill `DesktopContextSkill` em `skills/desktop_context.py`.
- Comandos de tela: `/tela capturar`, `/tela analisar`, `/tela pasta`.
- Comandos do PC: `/pc status`, `/pc diagnostico`, `/pc portas`, `/pc processos`, `/pc python`.
- Comandos de modelo: `/modelo status`, `/modelo portas`, `/modelo ping`, `/modelo benchmark`.
- Comandos de arquivos: `/arquivos recentes`, `/arquivos buscar`, `/arquivos abrir ultimo zip`, `/arquivos organizar downloads`.
- Comandos de clipboard: `/clip ler`, `/clip resumir`, `/clip melhorar`, `/clip traduzir`, `/clip salvar nota`.
- Comandos de tarefas: `/tarefa adicionar`, `/tarefa hoje`, `/tarefa concluir N`, `/lembra de ...`.
- Comandos de memória: `/memoria lembrar`, `/memoria buscar`, `/memoria resumo`, `/diario texto`.
- Comandos de projeto: `/projeto status`, `/projeto bugs`, `/projeto changelog`, `/projeto proxima versao`, `/projeto arquivos`.
- Rotinas seguras: `/rotina modo yoru`, `/rotina estudo`, `/rotina trabalho`, `/rotina noite`.

## Segurança

- Não apaga nem move arquivos automaticamente.
- Não encerra processos/modelos automaticamente.
- `/tela analisar` não finge visão real; só captura print e informa limitação.
- Rotinas são checklists/abertura de pasta segura, não automação livre do PC.

## Atualizado

- Versão para `1.8.28-desktopcontext-2026`.
- `/skills` agora lista DesktopContext.
- `README.md`, `docs/COMANDOS.md`, `config.json` e `DEFAULT_CONFIG` sincronizados.
