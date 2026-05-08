# Noelle v20 - Limpeza segura de BATs e relatórios

Este pack limpa a raiz do projeto sem apagar arquivos.

Ele move para `_archive/v20_limpeza_bats_relatorios_DATA/`:

- `.bat` duplicados ou antigos da raiz;
- relatórios, logs, diagnósticos, inventários e resultados antigos da raiz;
- pastas de relatório/log da raiz, quando existirem.

Por padrão, ficam na raiz:

- `iniciar.bat`;
- `APLICAR_LIMPEZA_BATS_RELATORIOS_V20.bat`.

## Como usar

Extraia o pack na raiz do projeto e rode:

```bat
APLICAR_LIMPEZA_BATS_RELATORIOS_V20.bat
```

## Simular antes

```bat
APLICAR_LIMPEZA_BATS_RELATORIOS_V20.bat --dry-run
```

## Manter aplicadores antigos

Caso ainda queira manter `APLICAR_*.bat` na raiz:

```bat
APLICAR_LIMPEZA_BATS_RELATORIOS_V20.bat --manter-aplicadores
```

## Modo profundo

O modo profundo procura relatórios fora da raiz, mas ignora pastas protegidas como `node_modules`, `.git`, `src`, `assets`, `config`, `data`, `docs`, `scripts`, `tools`, `main`, `renderer`, `preload`, `core` e `noelle_app`.

```bat
APLICAR_LIMPEZA_BATS_RELATORIOS_V20.bat --profundo
```

## Restaurar

Depois da limpeza, o script cria um arquivo de restauração dentro da pasta do arquivo:

```txt
_archive/v20_limpeza_bats_relatorios_DATA/RESTAURAR_LIMPEZA_V20.bat
```

Rode esse arquivo se quiser voltar os arquivos para os lugares originais.
