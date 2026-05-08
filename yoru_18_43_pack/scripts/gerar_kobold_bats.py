from __future__ import annotations
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))
from yoru_bridge.config import load_config, PACK_ROOT

def q(s: str) -> str:
    return '"' + s + '"'

def write_bat(name: str, model_path: str, port: int, title: str, threads: int = 2, batch: int = 64):
    exe = load_config().get('koboldcpp_exe')
    p = PACK_ROOT / name
    txt = f'''@echo off
chcp 65001 >nul
title {title}
cd /d "%~dp0"

echo ===============================================================
echo  {title}
echo ===============================================================
echo Porta: {port}
echo Modelo: {model_path}
echo.

{q(exe)} ^
  --model {q(model_path)} ^
  --port {port} ^
  --threads {threads} ^
  --contextsize 2048 ^
  --batchsize {batch} ^
  --gpulayers 0 ^
  --usecpu ^
  --noavx2

pause
'''
    p.write_text(txt, encoding='utf-8')
    print('[OK]', p)

if __name__ == '__main__':
    cfg = load_config()
    paths = cfg.get('model_paths', {})
    fast_label = cfg.get('models', {}).get('fast', {}).get('label', 'Yoru FAST')
    think_label = cfg.get('models', {}).get('think', {}).get('label', 'Yoru THINK')
    write_bat('INICIAR_KOBOLD_FAST_5001.bat', paths.get('fast_model_path',''), 5001, f'{fast_label} - Porta 5001', threads=2, batch=64)
    write_bat('INICIAR_KOBOLD_THINK_5002.bat', paths.get('think_model_path',''), 5002, f'{think_label} - Porta 5002', threads=2, batch=64)
    print('\nAbra os dois BATs gerados e espere os modelos carregarem.')
