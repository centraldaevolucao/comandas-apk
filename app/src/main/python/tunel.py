"""Link externo temporário (Cloudflare Quick Tunnel) para o Restaurante Desktop — sem instalar nada.
Baixa sozinho o cloudflared (um arquivo, direto do GitHub oficial da Cloudflare) para a pasta de dados,
sobe o túnel e grava o endereço em tunnel_url.txt (que o servidor e os QR Codes já usam)."""
import os, re, sys, stat, shutil, platform, threading, subprocess, urllib.request
from pathlib import Path

_ROOT = None
_PORTA = 3000
_proc = None
_lock = threading.Lock()
_st = {"estado": "parado", "url": "", "msg": ""}
_BASE = "https://github.com/cloudflare/cloudflared/releases/latest/download/"


def init(root, porta):
    global _ROOT, _PORTA
    _ROOT = Path(root)
    _PORTA = int(porta)


def status():
    with _lock:
        return dict(_st)


def _set(**kw):
    with _lock:
        _st.update(kw)


def _nome_arquivo():
    m = platform.machine().lower()
    arm = "arm64" if m in ("aarch64", "arm64") else ("arm" if m.startswith("arm") else None)
    if os.name == "nt":
        return "cloudflared-windows-%s.exe" % ("386" if m in ("x86", "i386", "i686") else "amd64")
    if sys.platform == "darwin":
        return None
    return "cloudflared-linux-%s" % (arm or ("386" if m in ("i386", "i686") else "amd64"))


def _caminho():
    exe = "cloudflared.exe" if os.name == "nt" else "cloudflared"
    achado = shutil.which("cloudflared")          # se já estiver instalado, usa
    if achado:
        return Path(achado)
    return _ROOT / "bin" / exe


def _garantir_binario():
    alvo = _caminho()
    if alvo.is_file():
        return alvo
    nome = _nome_arquivo()
    if not nome:
        raise RuntimeError("Este sistema não é suportado pelo link automático.")
    alvo.parent.mkdir(parents=True, exist_ok=True)
    _set(estado="baixando", msg="Baixando o programa da Cloudflare (só na primeira vez)…")
    tmp = alvo.with_suffix(alvo.suffix + ".baixando")
    try:
        with urllib.request.urlopen(_BASE + nome, timeout=60) as r, open(tmp, "wb") as f:
            shutil.copyfileobj(r, f)
        if tmp.stat().st_size < 5_000_000:
            raise RuntimeError("Arquivo baixado incompleto.")
        os.replace(tmp, alvo)
        os.chmod(alvo, os.stat(alvo).st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
    except Exception as e:
        try:
            tmp.unlink()
        except OSError:
            pass
        raise RuntimeError("Não foi possível baixar o cloudflared (confira a internet): %s" % e)
    return alvo


def _gravar_url(url):
    arq = _ROOT / "tunnel_url.txt"
    try:
        if url:
            arq.write_text(url, encoding="utf-8")
        elif arq.exists():
            arq.unlink()
    except OSError:
        pass


def _rodar():
    global _proc
    try:
        exe = _garantir_binario()
        _set(estado="iniciando", msg="Criando o link externo…")
        flags = getattr(subprocess, "CREATE_NO_WINDOW", 0) if os.name == "nt" else 0
        p = subprocess.Popen([str(exe), "tunnel", "--url", "http://127.0.0.1:%d" % _PORTA, "--no-autoupdate"],
                             stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, errors="replace", creationflags=flags)
        with _lock:
            _proc = p
        cauda = []
        for linha in p.stdout:
            cauda = (cauda + [linha.strip()])[-6:]
            m = re.search(r"https://[a-z0-9-]+\.trycloudflare\.com", linha)
            if m and _st["estado"] != "ativo":
                _gravar_url(m.group(0))
                _set(estado="ativo", url=m.group(0), msg="")
        p.wait()
        if _st["estado"] != "parado":
            _gravar_url("")
            motivo = " | ".join(l for l in cauda if l)[-300:]
            _set(estado="erro", url="", msg="O link externo foi encerrado (confira a internet). " + (motivo and "Detalhe: " + motivo))
    except Exception as e:
        _gravar_url("")
        _set(estado="erro", url="", msg=str(e))


def iniciar():
    with _lock:
        if _st["estado"] in ("baixando", "iniciando", "ativo"):
            return dict(_st)
        _st.update(estado="iniciando", url="", msg="Criando o link externo…")
    _gravar_url("")
    threading.Thread(target=_rodar, name="tunel-cloudflare", daemon=True).start()
    return status()


def parar():
    global _proc
    _set(estado="parado", url="", msg="")
    with _lock:
        p, _proc = _proc, None
    if p and p.poll() is None:
        try:
            p.terminate()
        except OSError:
            pass
    _gravar_url("")
    return status()
