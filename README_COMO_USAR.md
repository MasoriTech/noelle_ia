# Noelle v20 - Pack Organizador Seguro

Este pack cria a estrutura limpa da Noelle v20 sem apagar o projeto atual.

## Como usar

1. Extraia este zip dentro da pasta raiz do projeto `noelle_ia`.
2. Abra PowerShell ou CMD nessa pasta.
3. Rode:

```bat
APLICAR_ORGANIZACAO_V20.bat
```

O modo padrão:

- cria as pastas da arquitetura v20;
- cria arquivos base que ainda não existem;
- cria backup de `main.js`, `preload.js`, `package.json` se eles existirem;
- não apaga arquivos antigos;
- não sobrescreve arquivos existentes.

## Para ativar o skeleton v20 no package.json

Depois de testar, rode:

```bat
APLICAR_ORGANIZACAO_V20.bat --ativar-v20
```

Isso altera o `main` do `package.json` para `main/main.js` e adiciona scripts v20. Um backup do package é salvo antes.

## Ordem recomendada

1. Crie uma branch:

```bat
git checkout -b noelle-v20-reestrutura
```

2. Aplique o pack.
3. Rode diagnóstico:

```bat
npm run diagnostico:v20
```

4. Abra a versão v20:

```bat
npm run start:v20
```

## Regra do pack

Este pack é para organizar a base, não para portar tudo de uma vez.
A aba Stream, voz, avatar e TTS devem ser trazidos por fases.
