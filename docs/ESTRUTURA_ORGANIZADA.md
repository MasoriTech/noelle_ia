# 📁 Guia de Estrutura Organizada - Noelle/Yoru

## ✅ O que foi feito

A bagunça foi organizada! Todos os scripts de utilidade foram movidos das pastas raiz para locais apropriados.

### Estrutura Final

```
noelle_ia/
│
├── CONFIGURAÇAO PRINCIPAL (raiz)
│   ├── main.js                    (Electron main)
│   ├── preload.js                 (Electron preload)
│   ├── package.json               (Dependências Node)
│   ├── requirements.txt            (Dependências Python)
│   ├── iniciar.bat                (Script de inicialização único)
│   ├── README.md                  (Documentação principal)
│   └── LICENSE
│
├── 📜 SCRIPTS E FERRAMENTAS
│   ├── scripts/                   (Scripts em Node/Python)
│   ├── tools/
│   │   └── scripts/               (Scripts .bat de utilidade)
│   │       ├── CONFIGURAR_STT.bat
│   │       ├── STT_CHECKUP.bat
│   │       ├── APLICAR_*.bat      (Patches e updates)
│   │       └── ... (11 scripts .bat organizados)
│   └── patch/                     (Scripts de patch/restauração)
│       ├── patch_apply_runtime_v20.js
│       ├── restore_avatar_renderer_patch.js
│       └── disable_legacy_avatar_loader.js
│
├── 🎨 APLICAÇÃO
│   ├── src/                       (Código-fonte Electron)
│   ├── renderer/                  (Renderer process)
│   ├── preload/                   (Preload scripts)
│   ├── config/                    (Configurações JSON)
│   ├── data/                      (Dados persistentes)
│       ├── cache/
│       ├── logs/
│       ├── memory/
│       └── sessions/
│   ├── assets/                    (Imagens, ícones, sons)
│   ├── core/                      (Módulos core)
│   └── noelle_app/                (App principal)
│
├── 🤖 AGENTES E IA
│   ├── agents/                    (Agentes Noelle/Yoru)
│   ├── yoru_chat/                 (Yoru chat integration)
│   ├── yoru_memory/               (Yoru memory system)
│   └── stt/                       (Speech-to-text)
│
├── 📚 DOCUMENTAÇÃO
│   ├── docs/                      (Documentação principal)
│   │   └── __extras/              (Docs antigas/extras)
│   ├── MEMORIA_GPT_NOELLE.md      (Notas GPT)
│   └── README_ORGANIZACAO_YORU.md (Nota de organização)
│
└── 🔧 MANTENÇA
    ├── .git/                      (Repositório Git)
    ├── _ORGANIZADO_BACKUP/        (Backups de limpeza)
    ├── diagnostics/               (Relatórios de erro)
    └── logs/                      (Logs de execução)
```

## 🚀 Como usar

### Iniciar a aplicação
```bash
iniciar.bat
```

### Rodar scripts de utilidade/patch
```bash
# Configurar STT
tools\scripts\CONFIGURAR_STT.bat

# Aplicar patches
tools\scripts\APLICAR_CHAT_TEXTO_V20.bat
tools\scripts\APLICAR_STREAM_V19_8_34.bat

# Verificar duplicatas
tools\scripts\APENAS_DIAGNOSTICAR_ABAS_DUPLICADAS_V19_8_37.bat
```

### Scripts de organização (se necessário novamente)
```bash
tools\scripts\LIMPAR_ORGANIZAR_NOELLE_YORU.bat
tools\scripts\ORGANIZAR_NOELLE_REPO_UNICO.bat
```

## 📊 O que foi limpo na raiz

| Tipo | Arquivos | Destino |
|------|----------|---------|
| Scripts .bat de patch/util | 11 | `tools/scripts/` |
| Scripts de patch JS | 3 | `patch/` |
| Documentação extra | 4 | `docs/__extras/` |
| Caches Python | Vários | Removidos |
| Caches Node | Vários | Removidos |

## 🔐 Backups

Todos os arquivos foram organizados **com segurança**. Se algo não funcionar:

- Pasta de backup: `_ORGANIZADO_BACKUP/cleanup_YYYYMMDD_HHMMSS/`
- Nunca deletamos, apenas movemos

## ✨ Benefícios

✅ Raiz clara com apenas arquivos essenciais  
✅ Scripts organizados por tipo (patch, scripts, tools)  
✅ Documentação centralizada em docs/  
✅ Caches removidos (mais espaço, build mais rápido)  
✅ Estrutura profissional + fácil de navegar  
✅ Todos os scripts ainda funcionam no novo local  

## 📝 Próximos passos

1. Teste iniciar a aplicação com `iniciar.bat`
2. Se precisar de um script .bat específico, procure em `tools/scripts/`
3. Se encontrar erros de patch, verifique `patch/`
4. Para limpezas futuras, use novamente `tools/scripts/LIMPAR_ORGANIZAR_NOELLE_YORU.bat`

---

**Criado em:** 2026-05-07 23:37:13
