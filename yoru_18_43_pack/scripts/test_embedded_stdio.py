from __future__ import annotations
import json, os, subprocess, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
env=os.environ.copy(); env['PYTHONPATH']=str(ROOT/'src'); env.setdefault('PYGAME_HIDE_SUPPORT_PROMPT','1')
p=subprocess.Popen([sys.executable,'-m','yoru_bridge','embedded'], cwd=str(ROOT), env=env, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding='utf-8')
try:
    print('READY:', p.stdout.readline().strip())
    p.stdin.write(json.dumps({'type':'chat','id':'t1','message':'/skills status','speak':False}, ensure_ascii=False)+'\n'); p.stdin.flush()
    print('RESPONSE:', p.stdout.readline().strip())
    p.stdin.write(json.dumps({'type':'shutdown','id':'bye'}, ensure_ascii=False)+'\n'); p.stdin.flush()
    print('BYE:', p.stdout.readline().strip())
finally:
    try: p.terminate()
    except Exception: pass
