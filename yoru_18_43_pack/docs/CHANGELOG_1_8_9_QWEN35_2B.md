# Yoru Bridge 1.8.9 - Qwen3.5 2B THINK

## Objetivo

Trocar o modelo THINK padrão de `Qwen2.5 3B` para `Qwen3.5 2B Q4_K_M`, mantendo o `Qwen2.5 3B` como backup.

## Configuração recomendada

- FAST 5001: `Qwen3.5 0.8B Q4_K_M`
- THINK 5002: `Qwen3.5 2B Q4_K_M`
- BACKUP: `Qwen2.5 3B Instruct Q4_K_M`

## Como aplicar

1. Coloque o modelo em `C:\IA_MODELOS\Qwen3.5-2B-Q4_K_M.gguf`.
2. Rode `iniciar.bat`.
3. Entre em `Submenu Modelos / KoboldCpp`.
4. Use `[5] Aplicar Qwen3.5 2B como THINK 5002`.
5. Use `[2] Gerar .bat FAST/THINK`.
6. Feche o THINK antigo e abra `INICIAR_KOBOLD_THINK_5002.bat`.
7. Use `/modelos` dentro da Bridge para conferir.

## Por que isso é melhor para seu PC

O Qwen3.5 2B deve ser mais leve que o Qwen2.5 3B, mantendo qualidade melhor que o 0.8B. Ele vira um THINK leve para projeto, conhecimento e diagnóstico.
