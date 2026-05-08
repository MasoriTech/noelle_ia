from __future__ import annotations
import contextlib, io, json, os, sys, time, traceback
from typing import Any, Dict

os.environ.setdefault("PYGAME_HIDE_SUPPORT_PROMPT", "1")
from ..app import YoruApp
from ..config import load_config, PACK_ROOT
from ..core.router import route_message

PROTOCOL = "yoru-embedded-stdio-jsonl-v1"
VERSION = "1.8.44-repoorganized-2026"

def _write(obj: Dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + "\n")
    sys.stdout.flush()

def _err(text: str) -> None:
    try:
        sys.stderr.write(str(text).rstrip() + "\n"); sys.stderr.flush()
    except Exception:
        pass

class EmbeddedChatWorker:
    def __init__(self) -> None:
        self.config = load_config()
        self.app = YoruApp(mode="embedded")
        self.app.vault.ensure()
        ecfg = self.config.get("embedded_chat", {}) or {}
        if not bool(ecfg.get("default_speak", False)):
            self.app.config.setdefault("tts", {})["enabled"] = False
        self.started_at = time.time()

    def status(self) -> Dict[str, Any]:
        return {
            "ok": True, "type": "status", "protocol": PROTOCOL, "version": VERSION,
            "pack_root": str(PACK_ROOT),
            "state": getattr(self.app.runtime_state, "current", "idle"),
            "brain_mode": self.app.config.get("runtime", {}).get("brain_mode", "auto"),
            "fast": self.app.config.get("models", {}).get("fast", {}).get("label"),
            "think": self.app.config.get("models", {}).get("think", {}).get("label"),
            "tts_enabled": bool(self.app.config.get("tts", {}).get("enabled", False)),
            "event_count": self.app.events.count(),
            "uptime_sec": round(time.time() - self.started_at, 3),
        }

    def handle(self, req: Dict[str, Any]) -> Dict[str, Any]:
        rid=req.get("id")
        typ=str(req.get("type") or "chat").lower().strip()
        if typ in {"ping","health"}:
            return {"ok": True, "id": rid, "type": typ, "reply": "pong", "protocol": PROTOCOL, "version": VERSION}
        if typ == "status":
            out=self.status(); out["id"]=rid; return out
        if typ in {"shutdown","exit","quit"}:
            return {"ok": True, "id": rid, "type": "shutdown", "reply": "encerrando", "exit": True}
        message=str(req.get("message") or req.get("command") or req.get("text") or "").strip()
        if not message:
            return {"ok": False, "id": rid, "type": typ, "error": "mensagem vazia"}
        speak=req.get("speak", None)
        old_tts=self.app.config.setdefault("tts", {}).get("enabled", False)
        if speak is not None:
            self.app.config["tts"]["enabled"]=bool(speak)
        old_last=self.app.last_reply
        before_events=self.app.events.count()
        route=route_message(message, self.app.config.get("runtime", {}).get("default_model", "auto"))
        buf=io.StringIO(); t0=time.time(); status=None; error=None
        try:
            with contextlib.redirect_stdout(buf):
                status=self.app.handle_input(message)
        except Exception as e:
            error=f"{type(e).__name__}: {e}"
            _err(traceback.format_exc())
            try: self.app.runtime_state.set_state("error", source="embedded_stdio", error=error)
            except Exception: pass
        finally:
            if speak is not None:
                self.app.config["tts"]["enabled"]=old_tts
        stdout_text=buf.getvalue().strip()
        reply=self.app.last_reply if self.app.last_reply != old_last else ""
        if not reply: reply=stdout_text
        max_stdout=int((self.app.config.get("embedded_chat", {}) or {}).get("max_stdout_chars", 12000) or 12000)
        if len(stdout_text)>max_stdout:
            stdout_text=stdout_text[:max_stdout]+"\n...[stdout cortado]"
        res={
            "ok": error is None, "id": rid, "type": "chat_result" if typ=="chat" else "command_result",
            "reply": reply, "text": reply, "message": reply,
            "backend": "koboldcpp_via_yoru", "replaced": "ollama",
            "route": getattr(route,"kind",None), "model": getattr(route,"model",None),
            "profile": getattr(route,"profile",None), "state": getattr(self.app.runtime_state,"current","idle"),
            "stdout": stdout_text, "events_added": max(0, self.app.events.count()-before_events),
            "elapsed_sec": round(time.time()-t0,3)
        }
        if status == "exit": res["exit"] = True
        if error: res["error"] = error
        return res

def run_stdio() -> None:
    worker=EmbeddedChatWorker()
    _write({"ok": True, "type": "ready", "protocol": PROTOCOL, "version": VERSION, "status": worker.status()})
    for line in sys.stdin:
        line=line.strip()
        if not line: continue
        try:
            req=json.loads(line)
            if not isinstance(req, dict): req={"type":"chat","message":str(req)}
        except Exception:
            req={"type":"chat","message":line}
        res=worker.handle(req); _write(res)
        if res.get("exit"): break

if __name__ == "__main__":
    run_stdio()
