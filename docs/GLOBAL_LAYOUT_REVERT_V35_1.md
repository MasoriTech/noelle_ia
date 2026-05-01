# Global Layout Revert V35.1

O v35 foi uma tentativa correta conceitualmente, mas agressiva demais para a estrutura atual.
Ele classificou o shell automaticamente e aplicou `overflow:hidden`, alturas e contratos em containers errados.

Decisão correta:
- reverter o runtime global
- manter o app funcional
- fazer ajustes por página
- só depois criar um AppShell real diretamente no HTML, não por inferência automática