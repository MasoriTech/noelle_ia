#!/usr/bin/env python3
"""Yoru Memory Core 2026 - setup seguro.
Cria a estrutura pedida sem apagar dados existentes.
"""
from __future__ import annotations

import argparse
import datetime as _dt
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MEMORY_DIR = ROOT / "yoru_memory"

FILES: dict[str, str] = {
    "soul.md": """# Yoru - soul.md\n\nIdentidade base da Yoru.\n\n- Nome: Yoru\n- Função: companheira/assistente local do projeto\n- Estilo: clara, direta, leve, com foco em ajudar sem travar o usuário\n- Prioridade: funcionar em modo widget quando disponível\n- Regra: não fingir que sabe algo que não foi carregado na memória ou no contexto\n\n""",
    "system.md": """# Yoru - system.md\n\nRegras de execução do núcleo da Yoru.\n\n1. Manter respostas úteis e objetivas.\n2. Usar a memória curta para contexto recente.\n3. Usar a memória longa apenas para fatos duráveis.\n4. Registrar eventos importantes em logs.\n5. Nunca travar silenciosamente: avisar carregando, erro, fallback e pronto.\n6. Preferir fallbacks seguros quando modelos, vozes, avatar ou conectores falharem.\n\n""",
    "constraints.md": """# Yoru - constraints.md\n\nLimites e proteções.\n\n- Não salvar senhas, tokens, chaves ou dados privados sensíveis em texto puro.\n- Não sobrescrever memórias existentes sem backup.\n- Não depender de internet para iniciar o modo básico.\n- Não bloquear o programa se Ollama/voz/avatar estiver indisponível.\n- Separar estado temporário de memória permanente.\n- Logs devem ajudar diagnóstico, não expor segredo.\n\n""",
    "user.md": """# Yoru - user.md\n\nPreferências do usuário para a Yoru.\n\n- Preferência: packs com poucos arquivos .bat.\n- Preferência: sempre incluir iniciar.bat atualizado.\n- Preferência: Yoru com foco em modo widget por padrão quando possível.\n- Preferência: terminal com mensagens claras de carregamento, pronto, erro e fallback.\n\n""",
    "state.md": """# Yoru - state.md\n\nEstado atual de execução.\n\n- status: inicial\n- modo_preferido: widget\n- modelo_fast: qwen3:0.6b ou equivalente local\n- modelo_smart: hermes leve ou equivalente local\n- voz: opcional/desligada por padrão\n- avatar: opcional\n\nAtualize este arquivo via ferramenta/script, não como memória permanente.\n\n""",
    "memory_short.md": """# Yoru - memory_short.md\n\nMemória curta. Use para contexto recente da sessão.\n\n- Nenhum item ainda.\n\n""",
    "memory_long.md": """# Yoru - memory_long.md\n\nMemória longa. Use apenas para informações duráveis e úteis.\n\n- Todo pack/correção futura da Yoru deve incluir iniciar.bat atualizado.\n- A Yoru deve priorizar modo widget quando possível.\n\n""",
    "memory_rules.md": """# Yoru - memory_rules.md\n\nRegras de memória.\n\n## O que salvar\n- Preferências duráveis do usuário.\n- Decisões de arquitetura do projeto.\n- Caminhos/configurações importantes que não sejam segredo.\n- Bugs corrigidos e padrões de fallback.\n\n## O que não salvar\n- Senhas, tokens, cookies, chaves de API.\n- Dados sensíveis desnecessários.\n- Estado temporário que pertence ao state.md.\n- Logs muito grandes dentro da memória longa.\n\n## Escrita\n- Antes de sobrescrever, criar backup.\n- Preferir anexar registros com data.\n- Manter linguagem clara.\n\n""",
    "reflection.md": """# Yoru - reflection.md\n\nReflexões e melhorias futuras.\n\n- Melhorar inicialização com mensagens claras.\n- Separar chat, memória, voz, avatar e conectores em módulos.\n- Manter modo básico funcionando mesmo sem recursos opcionais.\n\n""",
    "goals.md": """# Yoru - goals.md\n\nObjetivos da Yoru.\n\n1. Iniciar de forma confiável.\n2. Funcionar bem em modo widget.\n3. Usar Ollama/local quando configurado.\n4. Manter memória organizada e auditável.\n5. Ter logs e métricas simples para diagnosticar travamentos.\n\n""",
    "tools.md": """# Yoru - tools.md\n\nFerramentas previstas.\n\n- Ollama: modelos locais.\n- Piper: voz local opcional.\n- Avatar/widget: exibição visual.\n- RAG local: consulta em knowledge/.\n- Logs/métricas: diagnóstico.\n\n""",
}

DIRS = ["evaluation", "tasks", "connectors", "skills", "knowledge", "logs", "rag", "metrics"]
DIR_FILES: dict[str, str] = {
    "evaluation/evaluation_log.md": "# Evaluation log\n\nRegistre testes e avaliações da Yoru aqui.\n",
    "tasks/todo.md": "# Tasks\n\n- [ ] Integrar Memory Core ao chat da Yoru.\n- [ ] Conectar logs do iniciar.bat.\n- [ ] Adicionar busca simples em knowledge/.\n",
    "connectors/connectors.md": "# Connectors\n\nConectores opcionais. Mantenha desativado por padrão.\n",
    "skills/index.md": "# Skills\n\nHabilidades locais carregáveis pela Yoru.\n",
    "knowledge/index.md": "# Knowledge\n\nColoque arquivos de conhecimento local aqui.\n",
    "logs/README.md": "# Logs\n\nLogs diários da Yoru.\n",
    "rag/README.md": "# RAG\n\nÍndices e cache de busca local.\n",
    "rag/index.jsonl": "",
    "metrics/README.md": "# Metrics\n\nEventos simples em JSONL para diagnóstico.\n",
    "metrics/events.jsonl": "",
}


def backup_path(path: Path) -> Path:
    stamp = _dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = ROOT / "backups" / f"yoru_memory_core_2026_{stamp}"
    backup_dir.mkdir(parents=True, exist_ok=True)
    rel = path.relative_to(ROOT)
    dest = backup_dir / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    if path.is_dir():
        shutil.copytree(path, dest, dirs_exist_ok=True)
    else:
        shutil.copy2(path, dest)
    return dest


def write_if_missing(path: Path, content: str, force: bool = False) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and not force:
        return "mantido"
    if path.exists() and force:
        backup_path(path)
    path.write_text(content, encoding="utf-8", newline="\n")
    return "criado" if not force else "atualizado"


def apply(force: bool = False) -> int:
    MEMORY_DIR.mkdir(parents=True, exist_ok=True)
    print(f"[INFO] Pasta de memoria: {MEMORY_DIR}")
    for d in DIRS:
        p = MEMORY_DIR / d
        p.mkdir(parents=True, exist_ok=True)
        gitkeep = p / ".gitkeep"
        if not gitkeep.exists():
            gitkeep.write_text("", encoding="utf-8")
        print(f"[OK] Diretorio: yoru_memory/{d}")
    for name, content in FILES.items():
        status = write_if_missing(MEMORY_DIR / name, content, force=force)
        print(f"[OK] {status}: yoru_memory/{name}")
    for name, content in DIR_FILES.items():
        status = write_if_missing(MEMORY_DIR / name, content, force=force)
        print(f"[OK] {status}: yoru_memory/{name}")
    manifest = MEMORY_DIR / "README.md"
    if not manifest.exists():
        manifest.write_text(
            "# Yoru Memory Core 2026\n\n"
            "Estrutura modular de memória, estado, logs, RAG, tarefas, ferramentas e conhecimento da Yoru.\n\n"
            "Use `scripts/yoru_memory_core_cli_2026.py` para registrar memória/logs sem editar tudo manualmente.\n",
            encoding="utf-8", newline="\n")
        print("[OK] criado: yoru_memory/README.md")
    else:
        print("[OK] mantido: yoru_memory/README.md")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="cria a estrutura sem sobrescrever arquivos existentes")
    parser.add_argument("--force", action="store_true", help="atualiza templates criando backup dos existentes")
    args = parser.parse_args()
    if not args.apply and not args.force:
        print("Use --apply para criar/verificar a estrutura.")
        return 0
    return apply(force=args.force)

if __name__ == "__main__":
    raise SystemExit(main())
