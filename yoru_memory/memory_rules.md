# Yoru - memory_rules.md

Regras de memória.

## O que salvar
- Preferências duráveis do usuário.
- Decisões de arquitetura do projeto.
- Caminhos/configurações importantes que não sejam segredo.
- Bugs corrigidos e padrões de fallback.

## O que não salvar
- Senhas, tokens, cookies, chaves de API.
- Dados sensíveis desnecessários.
- Estado temporário que pertence ao state.md.
- Logs muito grandes dentro da memória longa.

## Escrita
- Antes de sobrescrever, criar backup.
- Preferir anexar registros com data.
- Manter linguagem clara.

