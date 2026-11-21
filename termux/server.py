#!/usr/bin/env python3
# App Restaurante - servidor Python (biblioteca padrão)
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, unquote
import sqlite3, json, os, socket, secrets, base64, mimetypes, time, threading
import backup_comandas
import licenca

ROOT = Path(os.getenv("COMANDAS_ROOT") or Path(__file__).resolve().parent)
PUBLIC_DIR = (ROOT / "public").resolve()
DATA_DIR = ROOT / "data"
DB_PATH = DATA_DIR / "database.sqlite"
HOST, PORT = os.getenv("HOST", "0.0.0.0"), int(os.getenv("PORT", "3000"))
MAX_BODY = 10 * 1024 * 1024
DB_LOCK = threading.RLock()
VERSAO_SERVIDOR = "2.32.8"
INICIO = time.time()
# Tempo real: cada gravação aumenta REV e acorda quem está ouvindo /api/eventos (SSE)
REV = {"n": 0, "ultimo": ""}
REV_COND = threading.Condition()
SSE_CLIENTES = {}          # id -> {"ip":..., "desde":...}
OPS = {}                   # X-Op-Id -> resposta já dada (idempotência: reenvio não duplica)
OPS_ORDEM = []

DATA_DIR.mkdir(parents=True, exist_ok=True)
def _id_equipamento():
    """Identifica o EQUIPAMENTO (Android ID enviado pelo app; no PC/Termux, o machine-id)."""
    e = (os.getenv("COMANDAS_EQUIP") or "").strip()
    if e: return e
    for caminho in ("/etc/machine-id", "/var/lib/dbus/machine-id"):
        try:
            v = open(caminho).read().strip()
            if v: return v
        except Exception: pass
    return None

LIC = licenca.Licenca(DATA_DIR, equipamento=_id_equipamento())   # assinatura/licença deste equipamento (veja licenca.py)
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("image/svg+xml", ".svg")

EXTERNO_LEITURA = {"caixaAtual", "mesas", "produtos", "cardapioDia", "grupos", "adicionais", "colaboradores", "comandas", "configuracoes", "pedidosPendentes"}
EXTERNO_ESCRITA = {"pedidosPendentes", "chamados"}
EXTERNO_CAMPOS = {
    "colaboradores": {"id", "nome", "funcao", "nivelAcesso"},
    "configuracoes": {"nomeImpressao", "urlLogo", "couvert", "garcomPercentual", "pixChave"},
    "caixaAtual": {"id", "status", "cor"},
    "pedidosPendentes": {"id", "mesa", "status", "motivoRecusa"},
    "comandas": {"id", "numero", "mesa", "status", "itens", "tipo"},
}

def bump(recurso):
    with REV_COND:
        REV["n"] += 1
        REV["ultimo"] = recurso
        REV_COND.notify_all()

def chave_colab():
    """Chave de acesso dos colaboradores pelo link externo (None = desligado)."""
    itens = read_resource("acessoExterno", "")
    it = itens[0] if itens else {}
    return it.get("chave") if it.get("ativa") and it.get("chave") else None

def definir_chave_colab(ativa):
    ch = secrets.token_urlsafe(18) if ativa else ""
    with DB_LOCK, db() as con:
        _write_resource_locked(con, "acessoExterno", "", [{"id": "chave", "chave": ch, "ativa": bool(ativa), "criadaEm": time.time()}])
        con.commit()
    bump("acessoExterno")
    return ch or None

def todos_ips():
    """Todos os endereços IPv4 não-loopback deste aparelho (Wi-Fi, hotspot, cabo...)."""
    achados = []
    try:
        import subprocess
        out = subprocess.run(["ip", "-4", "-o", "addr"], capture_output=True, text=True, timeout=2).stdout
        for ln in out.splitlines():
            p = ln.split()
            if len(p) >= 4:
                ip = p[3].split("/")[0]
                if not ip.startswith("127.") and not ip.startswith("169.254."):
                    achados.append({"interface": p[1], "ip": ip})
    except Exception:
        pass
    try:
        ip = local_ip()
        if ip and not ip.startswith("127.") and all(a["ip"] != ip for a in achados):
            achados.append({"interface": "?", "ip": ip})
    except Exception:
        pass
    return achados

def tunnel_url():
    """URL temporária do túnel Cloudflare (gravada pelo app Android em tunnel_url.txt)."""
    try:
        return (ROOT / "tunnel_url.txt").read_text(encoding="utf-8").strip()
    except OSError:
        return ""

def db():
    conn = sqlite3.connect(DB_PATH, timeout=20)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout=20000")
    return conn

def init_db():
    with DB_LOCK, db() as con:
        con.executescript("""
        CREATE TABLE IF NOT EXISTS meta (chave TEXT PRIMARY KEY, valor TEXT);
        CREATE TABLE IF NOT EXISTS sessoes (token TEXT PRIMARY KEY, usuario_id INTEGER, dados TEXT);
        CREATE TABLE IF NOT EXISTS terminais (id TEXT PRIMARY KEY, nome TEXT, ultimo_acesso INTEGER);
        CREATE TABLE IF NOT EXISTS devices (id TEXT PRIMARY KEY, dados TEXT);
        CREATE TABLE IF NOT EXISTS recursos (
            recurso TEXT, cliente_id TEXT, item_id TEXT, dados TEXT,
            PRIMARY KEY (recurso, cliente_id, item_id)
        );
        """)
        # Aparelho único = uma base só: dados que ficaram guardados sob um "cliente" (/api/c/<id>/...) voltam para a base comum.
        con.execute("UPDATE OR IGNORE recursos SET cliente_id='' WHERE cliente_id<>'' AND recurso<>'device'")
        con.commit()
    print(f"[DB] Banco pronto: {DB_PATH}", flush=True)
    iniciar_retencao()

def local_ip():
    candidates = []
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if not ip.startswith("127."): candidates.append(ip)
    except OSError:
        pass
    # Descobre a interface usada para sair, sem enviar dados.
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("192.0.2.1", 80))
        ip = s.getsockname()[0]
        s.close()
        if not ip.startswith("127."): candidates.insert(0, ip)
    except OSError:
        pass
    for prefix in ("192.168.", "10.", "172."):
        for ip in candidates:
            if ip.startswith(prefix): return ip
    return candidates[0] if candidates else "127.0.0.1"

# ---------------- Maquininha: Mercado Pago Point (API de integração) ----------------
MP_BASE = os.environ.get("MP_BASE", "https://api.mercadopago.com")

def maq_config(maq_id=None):
    """Lê as credenciais da maquininha salvas em Configurações (ficam só no aparelho servidor).
    Com várias maquininhas (config.maquininhas), escolhe pelo id; sem id, a primeira."""
    try:
        cfg = read_resource("configuracoes", None) or [{}]
        cfg = cfg[0] if isinstance(cfg, list) and cfg else {}
    except Exception:
        cfg = {}
    if not isinstance(cfg, dict):
        return {}
    lista = cfg.get("maquininhas")
    if isinstance(lista, list) and lista:
        if maq_id:
            for m in lista:
                if isinstance(m, dict) and str(m.get("id")) == str(maq_id):
                    return m
        return lista[0] if isinstance(lista[0], dict) else {}
    return cfg.get("maquininha") or {}

def mp_chamar(metodo, caminho, corpo=None, maq_id=None, token=None):
    import ssl, urllib.request, urllib.error
    m = maq_config(maq_id)
    token = (token or m.get("mpToken") or "").strip()
    if not token:
        return 400, {"error": "Informe o Access Token do Mercado Pago em Configurações › Maquininha."}
    dados = json.dumps(corpo).encode("utf-8") if corpo is not None else None
    req = urllib.request.Request(MP_BASE + caminho, data=dados, method=metodo)
    req.add_header("Authorization", "Bearer " + token)
    req.add_header("Content-Type", "application/json")
    ctx = ssl.create_default_context()
    ca = os.environ.get("SSL_CERT_FILE")
    if ca and os.path.exists(ca):
        ctx = ssl.create_default_context(cafile=ca)
    try:
        with urllib.request.urlopen(req, timeout=20, context=ctx) as r:
            txt = r.read().decode("utf-8") or "{}"
            return r.status, json.loads(txt)
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode("utf-8") or "{}")
        except Exception:
            return e.code, {"error": "HTTP %s" % e.code}
    except Exception as e:
        return 502, {"error": "Sem conexão com o Mercado Pago: %s" % e}


def read_resource(resource, client_id):
    with DB_LOCK, db() as con:
        rows = con.execute(
            "SELECT dados FROM recursos WHERE recurso=? AND cliente_id=?",
            (resource, client_id or "")
        ).fetchall()
    return [json.loads(row["dados"]) for row in rows]

_id_counter = [0]

def novo_id():
    """Id único mesmo quando vários itens são criados no mesmo milissegundo."""
    with DB_LOCK:
        _id_counter[0] += 1
        return str(int(time.time() * 1000) * 1000 + (_id_counter[0] % 1000))

def _write_resource_locked(con, resource, client_id, data):
    con.execute("DELETE FROM recursos WHERE recurso=? AND cliente_id=?", (resource, client_id))
    items = data if isinstance(data, list) else [data]
    usados = set()
    for item in items:
        _proteger_segredos(resource, item)
        if isinstance(item, dict):
            item_id = str(item.get("id") or "")
            if not item_id or item_id in usados:
                item_id = novo_id()
                while item_id in usados: item_id = novo_id()
            item["id"] = item_id
        else:
            item_id = "1"
            while item_id in usados: item_id = str(int(item_id) + 1)
        usados.add(item_id)
        con.execute(
            "INSERT OR REPLACE INTO recursos(recurso,cliente_id,item_id,dados) VALUES(?,?,?,?)",
            (resource, client_id, item_id, json.dumps(item, ensure_ascii=False))
        )

def write_resource(resource, client_id, data):
    client_id = client_id or ""
    with DB_LOCK, db() as con:
        _write_resource_locked(con, resource, client_id, data)
        con.commit()

def merge_resource(resource, client_id, body):
    """Lê, mescla e grava dentro do mesmo bloqueio (dois salvamentos ao mesmo tempo não perdem item)."""
    client_id = client_id or ""
    with DB_LOCK, db() as con:
        rows = con.execute("SELECT dados FROM recursos WHERE recurso=? AND cliente_id=?", (resource, client_id)).fetchall()
        current = [json.loads(r["dados"]) for r in rows]
        if isinstance(body, list):
            current = body
        elif isinstance(body, dict) and body.get("id"):
            idx = next((i for i, it in enumerate(current) if str(it.get("id")) == str(body["id"])), None)
            if idx is not None: current[idx] = {**current[idx], **body}
            else: current.append(body)
        elif isinstance(body, dict):
            body["id"] = novo_id()
            current.append(body)
        else:
            raise ValueError("JSON inválido")
        _write_resource_locked(con, resource, client_id, current)
        con.commit()

def append_only(resource, client_id, body):
    """Para quem chega pelo link externo: só ACRESCENTA itens novos, nunca altera nem apaga."""
    client_id = client_id or ""
    novos = body if isinstance(body, list) else [body]
    with DB_LOCK, db() as con:
        rows = con.execute("SELECT dados FROM recursos WHERE recurso=? AND cliente_id=?", (resource, client_id)).fetchall()
        current = [json.loads(r["dados"]) for r in rows]
        ids = {str(it.get("id")) for it in current if isinstance(it, dict)}
        for it in novos:
            if isinstance(it, dict) and str(it.get("id") or "") not in ids:
                if not it.get("id"): it["id"] = novo_id()
                current.append(it); ids.add(str(it["id"]))
        _write_resource_locked(con, resource, client_id, current)
        con.commit()

def password_hash(value):
    # Formato LEGADO (Base64). Só é usado para reconhecer senhas antigas e migrá-las.
    return base64.b64encode(str(value or "").encode("utf-8")).decode("ascii")

PBKDF2_ITER = 120000

def hash_senha(valor):
    """Hash seguro (PBKDF2-HMAC-SHA256 + sal aleatório). Formato: pbkdf2$iter$sal$hash (LGPD art. 46)."""
    import hashlib
    b = valor if isinstance(valor, bytes) else str(valor or "").encode("utf-8")
    sal = secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac("sha256", b, bytes.fromhex(sal), PBKDF2_ITER).hex()
    return "pbkdf2$%d$%s$%s" % (PBKDF2_ITER, sal, h)

def _eh_hash(v):
    return isinstance(v, str) and v.startswith("pbkdf2$") and v.count("$") == 3

def senha_confere(digitada, guardado):
    """True se a senha digitada confere com o valor guardado (hash novo ou Base64 legado)."""
    import hashlib, hmac
    guardado = str(guardado or "")
    if not guardado: return False
    if _eh_hash(guardado):
        _, it, sal, h = guardado.split("$")
        for enc in ("utf-8", "latin-1"):
            try: b = str(digitada or "").encode(enc)
            except UnicodeEncodeError: continue
            c = hashlib.pbkdf2_hmac("sha256", b, bytes.fromhex(sal), int(it)).hex()
            if hmac.compare_digest(c, h): return True
        return False
    return hmac.compare_digest(password_hash(digitada), guardado)

def _legado_para_bytes(v):
    """Base64 antigo (btoa do navegador) -> bytes da senha original."""
    try: return base64.b64decode(v, validate=True)
    except Exception: return str(v).encode("utf-8")

def _proteger_segredos(resource, item):
    """Nunca guarda senha, resposta de segurança ou senha mestre em texto/Base64 (LGPD art. 46)."""
    if not isinstance(item, dict): return
    campos = {"usuarios": ("senha", "respostaSeguranca"), "configuracoes": ("senhaMestre",)}.get(resource, ())
    for c in campos:
        v = item.get(c)
        if not v or _eh_hash(v): continue
        # usuarios: o app envia Base64 (btoa). configuracoes: texto puro.
        item[c] = hash_senha(_legado_para_bytes(v) if resource == "usuarios" else v)

# ---------------------------------------------------------------------------
# LGPD: aceite dos termos, direitos do titular (art. 18) e prazos de retenção
# ---------------------------------------------------------------------------
VERSAO_TERMOS = "2026-11-18"          # mude quando os Termos/Privacidade mudarem: todos precisam aceitar de novo
RETENCAO_DIAS = {"chamados": 30, "auditoria": 365, "avaliacoes": 730}   # apagados quando vencem
RETENCAO_ANONIMIZA_ANOS = 5           # comandas: após 5 anos, some o dado pessoal; ficam só os valores (obrigação fiscal/contábil)
CAMPOS_PESSOAIS_COMANDA = ("cliente", "clienteCpf", "clienteTelefone", "clienteId", "clienteIdentificado", "enderecoEntrega", "endereco")

def agora_iso():
    from datetime import datetime
    return datetime.now().astimezone().isoformat(timespec="seconds")

def registrar_aceite(quem, dados):
    """Guarda a prova do aceite (LGPD art. 8º §2º): data/hora do servidor, versão dos termos e o que foi aceito."""
    reg = {
        "id": novo_id(), "quem": str(quem or "")[:120], "versao": str(dados.get("versao") or VERSAO_TERMOS)[:20],
        "dataHora": agora_iso(), "termosEPrivacidade": bool(dados.get("termos")), "maior18": bool(dados.get("maior18")),
        "marketing": bool(dados.get("marketing")), "origem": str(dados.get("origem") or "app")[:30]
    }
    with DB_LOCK, db() as con:
        rows = con.execute("SELECT dados FROM recursos WHERE recurso='aceites' AND cliente_id=''").fetchall()
        atual = [json.loads(r["dados"]) for r in rows]
        atual.append(reg)
        _write_resource_locked(con, "aceites", "", atual)
        con.commit()
    return reg

def ultimo_aceite(quem):
    regs = [r for r in read_resource("aceites", "") if isinstance(r, dict) and r.get("quem") == str(quem or "")]
    regs.sort(key=lambda r: r.get("dataHora", ""))
    return regs[-1] if regs else None

def exportar_dados_pessoais():
    """Cópia legível dos dados pessoais guardados (LGPD art. 18, II e V). Sem senhas."""
    def limpo(lista, tirar=()):
        return [{k: v for k, v in it.items() if k not in tirar} for it in lista if isinstance(it, dict)]
    pacote = {
        "geradoEm": agora_iso(), "versaoApp": VERSAO_SERVIDOR, "formato": "JSON (UTF-8)",
        "usuarios": limpo(read_resource("usuarios", ""), ("senha", "respostaSeguranca")),
        "colaboradores": limpo(read_resource("colaboradores", ""), ("senha", "respostaSeguranca")),
        "clientes": limpo(read_resource("clientes", "")),
        "avaliacoes": limpo(read_resource("avaliacoes", "")),
        "aceites": limpo(read_resource("aceites", "")),
        "comandas_com_dados_de_clientes": [
            {k: it.get(k) for k in ("id", "numero", "dataAbertura", "dataFechamento", "total") + CAMPOS_PESSOAIS_COMANDA if k in it}
            for it in read_resource("comandas", "") if isinstance(it, dict) and (it.get("cliente") or it.get("clienteCpf") or it.get("clienteTelefone"))
        ],
    }
    return pacote

def _anonimiza_comanda(c):
    for k in CAMPOS_PESSOAIS_COMANDA:
        if k in c:
            c[k] = "" if k not in ("clienteId", "clienteIdentificado") else None
    if c.get("cliente") == "" : c["cliente"] = "Cliente removido"

def anonimizar_cliente(cliente_id):
    """Atende o pedido de exclusão de UM cliente: apaga o cadastro e tira nome/CPF/telefone das comandas,
    mantendo só os valores da venda (obrigação fiscal/contábil, LGPD art. 16, I)."""
    cid = str(cliente_id)
    with DB_LOCK, db() as con:
        cli = [json.loads(r["dados"]) for r in con.execute("SELECT dados FROM recursos WHERE recurso='clientes' AND cliente_id=''").fetchall()]
        nome = ""
        for c in cli:
            if str(c.get("id")) == cid: nome = str(c.get("nome") or "").strip().lower()
        _write_resource_locked(con, "clientes", "", [c for c in cli if str(c.get("id")) != cid])
        rows = [json.loads(r["dados"]) for r in con.execute("SELECT dados FROM recursos WHERE recurso='comandas' AND cliente_id=''").fetchall()]
        n = 0
        for c in rows:
            if str(c.get("clienteId") or "") == cid or (nome and str(c.get("cliente") or "").strip().lower() == nome):
                _anonimiza_comanda(c); n += 1
        _write_resource_locked(con, "comandas", "", rows)
        con.commit()
    return n

def apagar_dados_pessoais():
    """Apaga TODOS os dados pessoais (clientes, avaliações, colaboradores sem acesso, nomes nas comandas).
    Ficam: usuários com acesso ao sistema (para não trancar o app), registros de aceite (prova legal) e valores das vendas."""
    with DB_LOCK, db() as con:
        _write_resource_locked(con, "clientes", "", [])
        _write_resource_locked(con, "avaliacoes", "", [])
        _write_resource_locked(con, "chamados", "", [])
        rows = [json.loads(r["dados"]) for r in con.execute("SELECT dados FROM recursos WHERE recurso='comandas' AND cliente_id=''").fetchall()]
        for c in rows: _anonimiza_comanda(c)
        _write_resource_locked(con, "comandas", "", rows)
        con.commit()

def _data_br(txt):
    import re
    m = re.match(r"\s*(\d{2})/(\d{2})/(\d{4})", str(txt or ""))
    return (int(m.group(3)), int(m.group(2)), int(m.group(1))) if m else None

def aplicar_retencao():
    """Apaga o que passou do prazo (ver a Política de Privacidade). Roda ao abrir o app e a cada 12 horas."""
    from datetime import datetime
    agora_ms = int(time.time() * 1000)
    apagados = 0
    try:
        with DB_LOCK, db() as con:
            for rec, dias in RETENCAO_DIAS.items():
                limite = agora_ms - dias * 86400 * 1000
                rows = [json.loads(r["dados"]) for r in con.execute("SELECT dados FROM recursos WHERE recurso=? AND cliente_id=''", (rec,)).fetchall()]
                mantidos = []
                for it in rows:
                    try: ms = int(str(it.get("id")))
                    except (ValueError, TypeError): ms = None
                    if ms and ms > 10**12 and ms < limite: apagados += 1
                    else: mantidos.append(it)
                if len(mantidos) != len(rows): _write_resource_locked(con, rec, "", mantidos)
            corte = datetime.now().year - RETENCAO_ANONIMIZA_ANOS
            rows = [json.loads(r["dados"]) for r in con.execute("SELECT dados FROM recursos WHERE recurso='comandas' AND cliente_id=''").fetchall()]
            mudou = False
            for c in rows:
                d = _data_br(c.get("dataFechamento") or c.get("dataAbertura"))
                if d and d < (corte, datetime.now().month, datetime.now().day) and any(c.get(k) for k in CAMPOS_PESSOAIS_COMANDA):
                    _anonimiza_comanda(c); mudou = True; apagados += 1
            if mudou: _write_resource_locked(con, "comandas", "", rows)
            con.commit()
    except Exception as e:
        print("retencao:", e, flush=True)
    return apagados

_retencao_ativa = [False]

def iniciar_retencao():
    if _retencao_ativa[0]: return
    _retencao_ativa[0] = True
    threading.Thread(target=_loop_retencao, daemon=True).start()

def _loop_retencao():
    while True:
        aplicar_retencao()
        time.sleep(12 * 3600)

class Handler(BaseHTTPRequestHandler):
    server_version = "AppRestaurantePython/1.0"

    def log_message(self, fmt, *args):
        print("[%s] %s" % (self.log_date_time_string(), fmt % args), flush=True)

    def send_json(self, status, data, extra=None):
        payload = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", self.headers.get("Origin", "*"))
        self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Credentials", "true")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-Cliente-Id, X-Terminal-Id, X-Op-Id, X-Colab-Key, X-Session")
        if extra:
            for key, value in extra.items(): self.send_header(key, value)
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def read_json(self):
        try: length = int(self.headers.get("Content-Length", "0"))
        except ValueError: raise ValueError("Content-Length inválido")
        if length > MAX_BODY: raise ValueError("Payload grande")
        raw = self.rfile.read(length) if length else b"{}"
        try: return json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError): raise ValueError("JSON inválido")

    def cookie(self, name):
        for part in self.headers.get("Cookie", "").split(";"):
            key, sep, value = part.strip().partition("=")
            if sep and key == name: return value
        return None

    def session_user(self):
        token = self.cookie("session_token") or self.headers.get("X-Session")
        if not token: return None
        with DB_LOCK, db() as con:
            row = con.execute("SELECT dados FROM sessoes WHERE token=?", (token,)).fetchone()
        return json.loads(row["dados"]) if row else None

    # ---------------- link externo (túnel Cloudflare) ----------------
    def licenca_bloqueia(self, col, client_id, body):
        """Regras da assinatura nas gravações. Devolve a mensagem de bloqueio ou None."""
        if col == "comandas":
            existentes = {str(i.get("id")) for i in read_resource("comandas", client_id) if isinstance(i, dict)}
            itens = body if isinstance(body, list) else [body]
            novos = []
            for i in itens:
                if not isinstance(i, dict): continue
                iid = str(i.get("id") or "")
                if not iid: novos.append("n" + novo_id())
                elif iid not in existentes: novos.append(iid)
            ok, msg = LIC.permitir_comandas(novos)
            if not ok: return msg
        return None

    def api_maquininha(self, parts):
        """/api/maquininha/mp/{devices|cobrar|status|cancelar} — ponte para a API Point do Mercado Pago."""
        if not parts or parts[0] != "mp":
            return self.send_json(404, {"error": "Provedor não suportado pelo servidor (usa deeplink no app)"})
        sub = parts[1] if len(parts) > 1 else ""
        corpo = {}
        if self.command == "POST":
            try:
                n = int(self.headers.get("Content-Length") or 0)
                corpo = json.loads(self.rfile.read(n).decode("utf-8") or "{}") if n else {}
            except Exception:
                corpo = {}
        qs = self.path.split("?", 1)[1] if "?" in self.path else ""
        maq_id = str(corpo.get("maqId") or "")
        for kv in qs.split("&"):
            if kv.startswith("maq="):
                from urllib.parse import unquote
                maq_id = unquote(kv[4:])
        dev = (corpo.get("deviceId") or maq_config(maq_id).get("mpDeviceId") or "").strip()
        if sub == "testar" and self.command == "POST":      # diagnóstico sem cobrar nada
            tk = str(corpo.get("token") or "").strip()
            if not tk:
                return self.send_json(200, {"ok": False, "passos": [{"ok": False, "t": "Access Token", "d": "Cole o Access Token de produção."}]})
            passos = []
            st, u = mp_chamar("GET", "/users/me", token=tk)
            if st != 200:
                passos.append({"ok": False, "t": "Access Token", "d": "Token recusado pelo Mercado Pago (HTTP %s). Use o token de PRODUÇÃO da sua aplicação, copiado inteiro, sem espaços." % st if st in (401, 403) else (u.get("error") or u.get("message") or "Erro HTTP %s" % st)})
                return self.send_json(200, {"ok": False, "passos": passos})
            passos.append({"ok": True, "t": "Access Token", "d": "Válido. Conta: %s %s" % (u.get("nickname") or u.get("first_name") or "", ("(" + str(u.get("email")) + ")") if u.get("email") else "")})
            st, dv = mp_chamar("GET", "/point/integration-api/devices?offset=0&limit=50", token=tk)
            if st != 200:
                passos.append({"ok": False, "t": "Maquininhas da conta", "d": "Não consegui listar (HTTP %s). A conta precisa ter uma maquininha Point e a aplicação precisa estar com o produto Point habilitado." % st})
                return self.send_json(200, {"ok": False, "passos": passos})
            lista = [{"id": d.get("id"), "modo": d.get("operating_mode")} for d in (dv.get("devices") or []) if isinstance(d, dict)]
            passos.append({"ok": bool(lista), "t": "Maquininhas da conta", "d": ("%d encontrada(s): " % len(lista) + ", ".join("%s (%s)" % (d["id"], d["modo"]) for d in lista)) if lista else "Nenhuma maquininha Point vinculada a esta conta."})
            alvo = str(corpo.get("deviceId") or "").strip()
            ok = bool(lista) and bool(alvo)
            if not alvo:
                passos.append({"ok": False, "t": "ID da maquininha", "d": "Informe o ID (toque em \"Buscar maquininhas da conta\")."})
            else:
                d = next((x for x in lista if x["id"] == alvo), None)
                if not d:
                    ok = False; passos.append({"ok": False, "t": "ID da maquininha", "d": "Este ID não está nesta conta."})
                elif d["modo"] != "PDV":
                    ok = False; passos.append({"ok": False, "t": "Modo PDV", "d": "A maquininha está em modo %s. Toque em \"Ativar modo PDV\" (e reinicie a Point)." % d["modo"], "pdv": True})
                else:
                    passos.append({"ok": True, "t": "Modo PDV", "d": "Pronta para receber cobranças do app."})
            return self.send_json(200, {"ok": ok, "passos": passos})
        if sub == "pdv" and self.command == "POST":
            tk = str(corpo.get("token") or "").strip(); alvo = str(corpo.get("deviceId") or "").strip()
            if not tk or not alvo or not all(ch.isalnum() or ch in "-_" for ch in alvo):
                return self.send_json(400, {"error": "Informe o token e o ID da maquininha."})
            st, r = mp_chamar("PATCH", "/point/integration-api/devices/" + alvo, {"operating_mode": "PDV"}, token=tk)
            return self.send_json(st, r)
        if sub == "devices" and self.command == "GET":
            st, r = mp_chamar("GET", "/point/integration-api/devices?offset=0&limit=50", maq_id=maq_id)
            return self.send_json(st, r)
        if sub == "cobrar" and self.command == "POST":
            if not dev:
                return self.send_json(400, {"error": "Informe o ID da maquininha em Configurações › Maquininha."})
            centavos = int(round(float(corpo.get("valor") or 0) * 100))
            if centavos <= 0:
                return self.send_json(400, {"error": "Valor inválido"})
            forma = corpo.get("forma")
            pag = {"type": "debit_card" if forma == "debito" else "credit_card"}
            if forma == "credito":
                pag["installments"] = max(1, int(corpo.get("parcelas") or 1))
                pag["installments_cost"] = "seller"
            body = {"amount": centavos, "description": str(corpo.get("descricao") or "Comanda")[:100], "payment": pag,
                    "additional_info": {"external_reference": str(corpo.get("ref") or "")[:64], "print_on_terminal": True}}
            st, r = mp_chamar("POST", "/point/integration-api/devices/%s/payment-intents" % dev, body, maq_id=maq_id)
            if isinstance(r, dict):
                r["deviceId"] = dev
            return self.send_json(st, r)
        if sub == "status" and self.command == "GET":
            q = self.path.split("?", 1)[1] if "?" in self.path else ""
            pid = ""
            for kv in q.split("&"):
                if kv.startswith("id="):
                    pid = kv[3:]
            if not pid or not all(ch.isalnum() or ch in "-_" for ch in pid):
                return self.send_json(400, {"error": "id inválido"})
            st, r = mp_chamar("GET", "/point/integration-api/payment-intents/" + pid, maq_id=maq_id)
            return self.send_json(st, r)
        if sub == "cancelar" and self.command == "POST":
            pid = str(corpo.get("id") or "")
            if not dev or not pid or not all(ch.isalnum() or ch in "-_" for ch in pid):
                return self.send_json(400, {"error": "Dados inválidos"})
            st, r = mp_chamar("DELETE", "/point/integration-api/devices/%s/payment-intents/%s" % (dev, pid), maq_id=maq_id)
            return self.send_json(st, r)
        return self.send_json(405, {"error": "Método não permitido"})

    def externo(self):
        """Pedido que chegou pela internet (túnel): a Cloudflare sempre acrescenta estes cabeçalhos."""
        h = self.headers
        return bool(h.get("Cf-Connecting-Ip") or h.get("Cf-Ray") or h.get("Cf-Visitor"))

    def colab_valido(self):
        """Pedido pelo link externo com a chave de colaborador válida (cookie ou cabeçalho)."""
        esperado = chave_colab()
        if not esperado: return False
        enviado = self.cookie("colab_key") or self.headers.get("X-Colab-Key") or ""
        return secrets.compare_digest(str(enviado), esperado)

    def api_externo(self, route, parts, client_id):
        """Pelo link externo só passa o que o cardápio do cliente (QR Code) precisa."""
        col = parts[0] if parts else ""
        if col in ("backup", "device", "acesso-externo", "acessoExterno"):
            return self.send_json(403, {"error": "Somente no aparelho servidor"})
        if self.colab_valido():
            return False   # colaborador autorizado: usa a API normal (menos o que está bloqueado acima)
        if not LIC.status().get("cardapio"):   # cardápio digital (QR / link): assinante com o bônus/edição que o inclui
            return self.send_json(402, {"error": "Cardápio digital indisponível: assinatura inativa.", "licenca": True})
        if self.command == "DELETE":
            return self.send_json(403, {"error": "Não permitido pelo link externo"})
        if self.command == "POST" and col in ("qr",) and len(parts) > 1:
            return False  # tratado abaixo (identificação por QR)
        if self.command in ("POST", "PUT"):
            return False if col in EXTERNO_ESCRITA else self.send_json(403, {"error": "Não permitido pelo link externo"})
        if self.command == "GET":
            if route in ("info-servidor", "sessao"):
                return self.send_json(200, {"ok": True, "usuario": None, "modo": "externo"}) if route == "sessao" else False
            if col not in EXTERNO_LEITURA:
                return self.send_json(403, {"error": "Não permitido pelo link externo"})
            dados = read_resource(col, client_id)
            campos = EXTERNO_CAMPOS.get(col)
            if campos:
                dados = [{k: v for k, v in (it.items() if isinstance(it, dict) else []) if k in campos} for it in dados]
            if col == "comandas":  # só o necessário para "Meus pedidos" da mesa
                dados = [it for it in dados if str(it.get("status")) in ("aberta", "delivery")]
            return self.send_json(200, dados)
        return self.send_json(405, {"error": "Método não permitido"})

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", self.headers.get("Origin", "*"))
        self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Credentials", "true")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-Cliente-Id, X-Terminal-Id, X-Op-Id, X-Colab-Key, X-Session")
        self.end_headers()

    def do_GET(self): self.dispatch()
    def do_POST(self): self.dispatch()
    def do_PUT(self): self.dispatch()
    def do_DELETE(self): self.dispatch()

    def dispatch(self):
        try:
            parsed = urlparse(self.path)
            path = unquote(parsed.path)
            if path.startswith("/api/"):
                self.api(path[5:], parsed.query)
            else:
                if self.externo():
                    from urllib.parse import parse_qs
                    k = parse_qs(parsed.query).get("k", [""])[0]
                    esperado = chave_colab()
                    if k and esperado and secrets.compare_digest(k, esperado):
                        self.send_response(302)
                        self.send_header("Location", path or "/")
                        self.send_header("Set-Cookie", f"colab_key={k}; HttpOnly; Secure; Path=/; Max-Age=2592000; SameSite=Lax")
                        self.send_header("Content-Length", "0")
                        self.end_headers()
                        return
                self.static_file(path)
        except BrokenPipeError:
            pass
        except Exception as exc:
            print("[ERRO]", repr(exc), flush=True)
            try: self.send_json(500, {"ok": False, "error": "Erro interno do servidor"})
            except (BrokenPipeError, ConnectionError): pass

    def api(self, rest_path, query):
        from urllib.parse import parse_qs
        parts = rest_path.split("/")
        client_id = None
        if parts[0] == "c":
            client_id = None   # base única: o prefixo /c/<id> é aceito (compatibilidade) mas não separa mais os dados
            parts = parts[2:]
        route = "/".join(parts)

        if self.externo():
            r = self.api_externo(route, parts, client_id)
            if r is not False:
                return r

        if route == "login" and self.command == "POST":
            try:
                body = self.read_json()
                email = str(body.get("email", "")).strip().lower()
                senha = str(body.get("senha", ""))
                with DB_LOCK, db() as con:
                    rows = con.execute(
                        "SELECT dados FROM recursos WHERE recurso=? AND cliente_id IN (?, '')",
                        ("usuarios", client_id or "")
                    ).fetchall()
                user = next((json.loads(r["dados"]) for r in rows
                            if str(json.loads(r["dados"]).get("email", "")).lower() == email), None)
                if not user or user.get("ativo") is False or not senha_confere(senha, user.get("senha", "")):
                    return self.send_json(401, {"ok": False, "msg": "E-mail ou senha inválidos."})
                if not _eh_hash(user.get("senha", "")):
                    # migra a senha antiga (Base64) para hash seguro no primeiro login
                    user["senha"] = hash_senha(senha)
                    with DB_LOCK, db() as con:
                        con.execute("UPDATE recursos SET dados=? WHERE recurso='usuarios' AND item_id=?",
                                    (json.dumps(user, ensure_ascii=False), str(user.get("id"))))
                        con.commit()
                token = secrets.token_hex(24)
                session_user = {
                    "id": user.get("id"), "nome": user.get("nome"), "email": user.get("email"),
                    "nivel": user.get("nivel"), "permissoes": user.get("permissoes") or ["*"],
                    "isDono": user.get("email") == "admin@admin.com", "clienteId": client_id
                }
                with DB_LOCK, db() as con:
                    con.execute("INSERT OR REPLACE INTO sessoes(token,usuario_id,dados) VALUES(?,?,?)",
                                (token, user.get("id"), json.dumps(session_user, ensure_ascii=False)))
                    con.commit()
                return self.send_json(200, {"ok": True, "usuario": session_user, "token": token}, {
                    "Set-Cookie": f"session_token={token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax"
                })
            except (ValueError, AttributeError, TypeError):
                return self.send_json(400, {"ok": False, "msg": "Requisição inválida."})

        if route == "logout" and self.command == "POST":
            token = self.cookie("session_token")
            if token:
                with DB_LOCK, db() as con:
                    con.execute("DELETE FROM sessoes WHERE token=?", (token,))
                    con.commit()
            return self.send_json(200, {"ok": True}, {"Set-Cookie": "session_token=; Max-Age=0; Path=/"})

        if route == "aceite":
            quem = (self.session_user() or {}).get("email") or "_dispositivo"
            if self.command == "GET":
                reg = ultimo_aceite(quem)
                ok = bool(reg and reg.get("versao") == VERSAO_TERMOS and reg.get("termosEPrivacidade") and reg.get("maior18"))
                return self.send_json(200, {"ok": True, "aceito": ok, "versao": VERSAO_TERMOS, "registro": reg})
            if self.command == "POST":
                try: body = self.read_json()
                except (ValueError, TypeError): return self.send_json(400, {"ok": False, "msg": "Requisição inválida."})
                if body.get("revogarMarketing") and not body.get("termos"):
                    ant = ultimo_aceite(quem) or {}
                    body = {"termos": ant.get("termosEPrivacidade"), "maior18": ant.get("maior18"), "versao": ant.get("versao"),
                            "marketing": bool(body.get("marketing")), "origem": "central-privacidade"}
                elif not (body.get("termos") and body.get("maior18")):
                    return self.send_json(400, {"ok": False, "msg": "É preciso aceitar os Termos e a Política e confirmar ter 18 anos ou mais."})
                return self.send_json(200, {"ok": True, "registro": registrar_aceite(quem, body)})

        if parts and parts[0] == "privacidade":
            if self.externo():
                return self.send_json(403, {"error": "Somente no aparelho servidor"})
            acao = parts[1] if len(parts) > 1 else ""
            if acao == "exportar" and self.command == "GET":
                dados = json.dumps(exportar_dados_pessoais(), ensure_ascii=False, indent=2).encode("utf-8")
                return self.send_file_bytes("meus-dados-restaurante.json", dados, "application/json")
            if acao == "anonimizar" and self.command == "POST":
                try: body = self.read_json()
                except (ValueError, TypeError): return self.send_json(400, {"ok": False})
                if not body.get("clienteId"): return self.send_json(400, {"ok": False, "msg": "Informe o cliente."})
                return self.send_json(200, {"ok": True, "comandasAnonimizadas": anonimizar_cliente(body["clienteId"])})
            if acao == "apagar-pessoais" and self.command == "POST":
                try: body = self.read_json()
                except (ValueError, TypeError): return self.send_json(400, {"ok": False})
                if str(body.get("confirmar", "")).strip().upper() != "APAGAR":
                    return self.send_json(400, {"ok": False, "msg": "Digite APAGAR para confirmar."})
                apagar_dados_pessoais()
                return self.send_json(200, {"ok": True})
            if acao == "retencao" and self.command == "POST":
                return self.send_json(200, {"ok": True, "tratados": aplicar_retencao()})
            return self.send_json(404, {"error": "rota"})

        if route == "sessao" and self.command == "GET":
            user = self.session_user()
            return self.send_json(200, {"ok": True, "usuario": user}) if user else self.send_json(401, {"ok": False})

        if parts and parts[0] == "maquininha":
            if self.externo():
                return self.send_json(403, {"error": "Somente na rede local"})
            return self.api_maquininha(parts[1:])

        if parts and parts[0] == "backup":
            return self.api_backup(parts[1:])

        if parts and parts[0] == "acesso-externo":
            if self.externo():
                return self.send_json(403, {"error": "Somente no aparelho servidor"})
            sub = parts[1] if len(parts) > 1 else ""
            if self.command == "GET":
                return self.send_json(200, {"ok": True, "chave": chave_colab(), "urlTunel": tunnel_url()})
            if self.command == "POST" and sub == "gerar":
                return self.send_json(200, {"ok": True, "chave": definir_chave_colab(True), "urlTunel": tunnel_url()})
            if self.command == "POST" and sub == "revogar":
                definir_chave_colab(False)
                return self.send_json(200, {"ok": True, "chave": None})
            return self.send_json(405, {"error": "Método não permitido"})

        if route == "ping":
            return self.send_json(200, {"ok": True, "t": time.time()})

        if route == "diagnostico" and self.command == "GET":
            try:
                with DB_LOCK, db() as con:
                    n = con.execute("SELECT COUNT(*) c FROM recursos").fetchone()["c"]
                banco = {"ok": True, "registros": n}
            except Exception as e:
                banco = {"ok": False, "erro": str(e)}
            return self.send_json(200, {
                "ok": True, "versao": VERSAO_SERVIDOR, "hora": time.time(), "ativoSeg": int(time.time() - INICIO),
                "escutando": HOST, "porta": PORT, "ips": todos_ips(), "urlTunel": tunnel_url(),
                "banco": banco, "rev": REV["n"], "ultimoRecurso": REV["ultimo"],
                "clientesTempoReal": list(SSE_CLIENTES.values()), "origem": self.client_address[0],
                "externo": self.externo()})

        if route == "eventos" and self.command == "GET":
            return self.sse()

        # Link externo (Desktop): baixa o cloudflared sozinho e gera o túnel. Só pelo próprio computador.
        if route in ("tunel", "tunel/iniciar", "tunel/parar"):
            if self.externo() or self.client_address[0] not in ("127.0.0.1", "::1"):
                return self.send_json(403, {"error": "Somente no próprio computador"})
            try:
                import tunel
                tunel.init(ROOT, PORT)
                if route == "tunel/iniciar" and self.command == "POST": return self.send_json(200, tunel.iniciar())
                if route == "tunel/parar" and self.command == "POST": return self.send_json(200, tunel.parar())
                if route == "tunel" and self.command == "GET": return self.send_json(200, tunel.status())
            except ImportError:
                return self.send_json(404, {"error": "Indisponível nesta versão"})
            return self.send_json(405, {"error": "Método não permitido"})

        # Impressora térmica direta (Desktop): lista/adiciona/remove destinos e envia bytes ESC/POS. Nunca pelo link externo.
        if route in ("impressoras", "imprimir-raw"):
            if self.externo(): return self.send_json(403, {"error": "Somente na rede local"})
            try:
                import impressao
                if route == "impressoras" and self.command == "GET":
                    return self.send_json(200, impressao.listar(DATA_DIR))
                if route == "impressoras" and self.command == "POST":
                    b = self.read_json()
                    impressao.adicionar_rede(DATA_DIR, b.get("nome"), b.get("host"), b.get("porta"))
                    return self.send_json(200, dict(impressao.listar(DATA_DIR), ok=True))
                if route == "impressoras" and self.command == "DELETE":
                    impressao.remover_rede(DATA_DIR, parse_qs(query).get("destino", [""])[0])
                    return self.send_json(200, dict(impressao.listar(DATA_DIR), ok=True))
                if route == "imprimir-raw" and self.command == "POST":
                    b = self.read_json()
                    impressao.enviar(DATA_DIR, str(b.get("destino", "")), base64.b64decode(b.get("dados", "")))
                    return self.send_json(200, {"ok": True})
            except ValueError as e:
                return self.send_json(400, {"ok": False, "msg": str(e)})
            except Exception as e:
                return self.send_json(502, {"ok": False, "msg": "Não foi possível imprimir: %s" % e})
            return self.send_json(405, {"error": "Método não permitido"})

        if route == "info-servidor" and self.command == "GET":
            return self.send_json(200, {"ok": True, "ip": local_ip(), "ips": todos_ips(), "porta": PORT, "modo": "local", "urlTunel": tunnel_url(), "versao": VERSAO_SERVIDOR})

        col = parts[0] if parts else ""
        item_id = parts[1] if len(parts) > 1 else None
        if not col:
            return self.send_json(404, {"error": "Rota não encontrada"})

        # Assinatura: status (qualquer aparelho da rede) e ativação por código (somente rede local)
        if col == "licenca":
            if self.command == "GET" and not item_id:
                return self.send_json(200, LIC.status())
            if self.command == "POST" and item_id == "ativar":
                if self.externo(): return self.send_json(403, {"error": "Somente na rede local"})
                try: body = self.read_json()
                except ValueError: return self.send_json(400, {"error": "JSON inválido"})
                ok, msg = LIC.ativar(str((body or {}).get("codigo", "")))
                return self.send_json(200 if ok else 400, {"ok": ok, "msg": msg, "status": LIC.status()})
            if self.command == "POST" and item_id == "teste":
                # teste gratuito de 30 dias (Gestão ou Completo), uma vez por equipamento; registra quem pediu e grava na base
                if self.externo(): return self.send_json(403, {"error": "Somente na rede local"})
                try: body = self.read_json()
                except ValueError: return self.send_json(400, {"error": "JSON inválido"})
                u = self.session_user() or {}
                usuario = str(u.get("nome") or u.get("email") or (body or {}).get("usuario") or "")
                ok, msg = LIC.iniciar_teste(str((body or {}).get("edicao", "")), usuario)
                if ok:
                    t = LIC.e.get("teste_app", {})
                    try: write_resource("testesLicenca", client_id, [dict(t, id=novo_id(), tipo="teste-app")])
                    except Exception: pass
                return self.send_json(200 if ok else 400, {"ok": ok, "msg": msg, "status": LIC.status()})
            return self.send_json(405, {"error": "Método não permitido"})

        # Configuração DESTE aparelho (modo único/servidor/cliente, função, IP). É um registro só, não uma lista:
        # antes cada gravação criava um item novo e a leitura devolvia uma lista, então nada era relido ao reabrir.
        if col == "device":
            if self.command == "GET":
                itens = read_resource("device", "")
                return self.send_json(200, itens[0] if itens else {})
            if self.command in ("POST", "PUT"):
                try: body = self.read_json()
                except ValueError: return self.send_json(400, {"error": "JSON inválido"})
                if not isinstance(body, dict): return self.send_json(400, {"error": "JSON inválido"})
                body["id"] = "device"
                with DB_LOCK, db() as con:
                    _write_resource_locked(con, "device", "", [body])
                    con.commit()
                return self.send_json(200, {"success": True, "item": body})

        if col == "qr" and self.command == "POST" and item_id in ("identificar", "cliente"):
            return self.qr_cliente(item_id, client_id)

        if self.command == "GET":
            if item_id:
                with DB_LOCK, db() as con:
                    row = con.execute(
                        "SELECT dados FROM recursos WHERE recurso=? AND cliente_id=? AND item_id=?",
                        (col, client_id or "", item_id)
                    ).fetchone()
                return self.send_json(200, json.loads(row["dados"])) if row else self.send_json(404, {"error": "Não encontrado"})
            return self.send_json(200, read_resource(col, client_id))

        if self.command in ("POST", "PUT"):
            try:
                body = self.read_json()
                op = self.headers.get("X-Op-Id")
                if op and op in OPS:   # reenvio da mesma operação: devolve o mesmo resultado, não grava de novo
                    return self.send_json(200, {**OPS[op], "repetida": True})
                if not (self.externo() and not self.colab_valido()):
                    bloqueio = self.licenca_bloqueia(col, client_id, body)
                    if bloqueio: return self.send_json(402, {"error": bloqueio, "licenca": True})
                if self.externo() and not self.colab_valido():
                    if col not in EXTERNO_ESCRITA:
                        return self.send_json(403, {"error": "Não permitido pelo link externo"})
                    append_only(col, client_id, body)
                    resp = {"success": True}
                else:
                    merge_resource(col, client_id, body)
                    resp = {"success": True, "item": body}
                if op:
                    OPS[op] = resp; OPS_ORDEM.append(op)
                    while len(OPS_ORDEM) > 2000: OPS.pop(OPS_ORDEM.pop(0), None)
                bump(col)
                return self.send_json(200, resp)
            except (ValueError, TypeError):
                return self.send_json(400, {"error": "JSON inválido"})

        if self.command == "DELETE":
            item_to_delete = item_id or parse_qs(query).get("id", [None])[0]
            if item_to_delete:
                with DB_LOCK, db() as con:
                    con.execute("DELETE FROM recursos WHERE recurso=? AND cliente_id=? AND item_id=?",
                                (col, client_id or "", str(item_to_delete)))
                    con.commit()
                bump(col)
            return self.send_json(200, {"success": True})

        return self.send_json(405, {"error": "Método não permitido"})

    def sse(self):
        """Canal em tempo real: avisa os aparelhos quando algo muda (PDV→Cozinha→Caixa)."""
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Connection", "keep-alive")
        self.send_header("X-Accel-Buffering", "no")
        self.send_header("Access-Control-Allow-Origin", self.headers.get("Origin", "*"))
        self.end_headers()
        cid = secrets.token_hex(4)
        SSE_CLIENTES[cid] = {"id": cid, "ip": self.client_address[0], "desde": time.time()}
        visto = -1
        try:
            while True:
                with REV_COND:
                    if REV["n"] == visto:
                        REV_COND.wait(timeout=15)
                    n, ultimo = REV["n"], REV["ultimo"]
                if n != visto:
                    msg = "data: " + json.dumps({"rev": n, "recurso": ultimo}) + "\n\n"
                    visto = n
                else:
                    msg = ": ping\n\n"
                self.wfile.write(msg.encode()); self.wfile.flush()
        except (BrokenPipeError, ConnectionError, OSError):
            pass
        finally:
            SSE_CLIENTES.pop(cid, None)

    def qr_cliente(self, acao, client_id):
        """Identifica (ou cadastra) o cliente do QR Code sem expor a lista de clientes."""
        try:
            body = self.read_json()
        except ValueError:
            return self.send_json(400, {"error": "JSON inválido"})
        cpf = "".join(ch for ch in str(body.get("cpf", "")) if ch.isdigit())
        nome = str(body.get("nome", "")).strip()[:80]
        lista = read_resource("clientes", client_id)
        achado = None
        if cpf:
            achado = next((c for c in lista if "".join(ch for ch in str(c.get("cpf", "")) if ch.isdigit()) == cpf), None)
        elif nome:
            achado = next((c for c in lista if str(c.get("nome", "")).lower() == nome.lower()), None)
        if achado is None and acao == "cliente" and cpf:
            achado = {"id": novo_id(), "nome": nome or "Cliente QR Code", "telefone": "", "cpf": str(body.get("cpf", ""))[:20],
                      "info": "Cadastrado via QR Code", "enderecos": [], "criadoPorQRCode": True,
                      "dataCadastro": time.strftime("%d/%m/%Y %H:%M:%S")}
            append_only("clientes", client_id, [achado])
        if achado is None:
            return self.send_json(200, {"cliente": None})
        publico = {k: achado.get(k) for k in ("id", "nome", "telefone", "cpf", "enderecos", "info", "criadoPorQRCode")}
        return self.send_json(200, {"cliente": publico})

    # ---------------- backup / restauração (.comandas) ----------------
    def read_bytes(self, limite):
        try: length = int(self.headers.get("Content-Length", "0"))
        except ValueError: raise ValueError("Content-Length inválido")
        if length <= 0: raise backup_comandas.ErroBackup("Arquivo vazio.")
        if length > limite: raise backup_comandas.ErroBackup("Arquivo grande demais.")
        return self.rfile.read(length)

    def send_file_bytes(self, nome, dados, mime="application/octet-stream"):
        self.send_response(200)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Disposition", 'attachment; filename="%s"' % nome)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(dados)))
        self.end_headers()
        self.wfile.write(dados)

    def api_backup(self, sub):
        """/api/backup/{lista|criar|arquivo/<nome>|restaurar|restaurar-lista|zerar}"""
        acao = sub[0] if sub else ""
        try:
            if acao == "lista" and self.command == "GET":
                return self.send_json(200, {"ok": True, "itens": backup_comandas.listar(DATA_DIR)})
            if acao == "criar" and self.command == "POST":
                nome, caminho, man = backup_comandas.criar(DB_PATH, DATA_DIR, DB_LOCK, "manual")
                return self.send_json(200, {"ok": True, "nome": nome, "tamanho": caminho.stat().st_size, "registros": man["registros"]})
            if acao == "arquivo" and len(sub) > 1:
                if self.command == "GET":
                    caminho = backup_comandas.caminho_seguro(DATA_DIR, unquote(sub[1]))
                    return self.send_file_bytes(caminho.name, caminho.read_bytes())
                if self.command == "DELETE":
                    backup_comandas.excluir(DATA_DIR, unquote(sub[1]))
                    return self.send_json(200, {"ok": True})
            if acao == "restaurar" and self.command == "POST":
                raw = self.read_bytes(backup_comandas.MAX_RESTAURAR)
                r = backup_comandas.restaurar_bytes(raw, DB_PATH, DATA_DIR, DB_LOCK)
                init_db()
                return self.send_json(200, {"ok": True, **r})
            if acao == "restaurar-lista" and self.command == "POST":
                body = self.read_json()
                caminho = backup_comandas.caminho_seguro(DATA_DIR, body.get("nome"))
                r = backup_comandas.restaurar_bytes(caminho.read_bytes(), DB_PATH, DATA_DIR, DB_LOCK)
                init_db()
                return self.send_json(200, {"ok": True, **r})
            if acao == "zerar" and self.command == "POST":
                body = self.read_json()
                if str(body.get("confirmacao", "")).strip().upper() != "ZERAR":
                    return self.send_json(400, {"ok": False, "msg": "Digite ZERAR para confirmar."})
                return self.send_json(200, {"ok": True, **backup_comandas.zerar_movimentacao(DB_PATH, DATA_DIR, DB_LOCK)})
        except backup_comandas.ErroBackup as e:
            return self.send_json(400, {"ok": False, "msg": str(e)})
        except (sqlite3.DatabaseError, ValueError, OSError) as e:
            return self.send_json(400, {"ok": False, "msg": "Não foi possível concluir: %s" % e})
        return self.send_json(404, {"ok": False, "msg": "Rota de backup não encontrada"})

    def static_file(self, url_path):
        if self.externo():
            permitido = url_path.startswith(("/mesa/", "/js/", "/css/", "/vendor/", "/img/")) or url_path in ("/", "/index.html", "/sw.js", "/manifest.json")
            if not permitido and url_path.rstrip("/") in ("/garcom", "/caixa", "/cozinha", "/cardapio") and self.colab_valido():
                permitido = True
            if not permitido:
                self.send_error(403)
                return
        relative = "index.html" if url_path in ("", "/") else url_path.lstrip("/")
        target = (PUBLIC_DIR / relative).resolve()
        if target != PUBLIC_DIR and PUBLIC_DIR not in target.parents:
            self.send_error(403)
            return
        if not target.is_file():
            target = PUBLIC_DIR / "index.html"
        if not target.is_file():
            self.send_error(404, "Arquivo não encontrado. Crie a pasta public e coloque index.html nela.")
            return
        content = target.read_bytes()
        mime, _ = mimetypes.guess_type(str(target))
        self.send_response(200)
        self.send_header("Content-Type", (mime or "application/octet-stream") + ("; charset=utf-8" if mime and (mime.startswith("text/") or mime in ("application/javascript", "application/json")) else ""))
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

def main():
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print("\n===========================================")
    print("   APP RESTAURANTE — SERVIDOR PYTHON")
    print("===========================================")
    print(f"   Local:  http://localhost:{PORT}")
    print(f"   Rede:   http://{local_ip()}:{PORT}")
    print(f"   Banco:  {DB_PATH}")
    print("   Para encerrar: Ctrl+C")
    print("===========================================\n", flush=True)
    try: server.serve_forever()
    except KeyboardInterrupt: print("\n[INFO] Encerrando servidor...")
    finally: server.server_close()

if __name__ == "__main__":
    main()
