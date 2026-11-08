"""Licença/assinatura do Comandas — verificação OFFLINE por assinatura digital (Ed25519).

Como funciona: o dono (você) emite um CÓDIGO de ativação assinado com a CHAVE PRIVADA (fica só com você, em
ferramentas/chave-privada.txt). O app só contém a chave PÚBLICA, que apenas VERIFICA — não dá para fabricar códigos
a partir dela. O código vale para uma instalação (ID da instalação) e uma data de validade.

Ed25519 abaixo = implementação de referência da RFC 8032 (só Python padrão, sem dependências).
"""
import base64, hashlib, json, os, secrets, threading, time
from datetime import date, datetime, timedelta

# ---- Chave PÚBLICA do emissor (hex, 32 bytes). Gerada por: python3 ferramentas/licenca_admin.py chaves ----
CHAVE_PUBLICA_HEX = "1451bac3783a9b23d4001030168cd1145ce25ac7c421c98318b2048bfb25e4e1"

LIMITE_COMANDAS_MES = 30        # plano gratuito / assinatura vencida
CARENCIA_PADRAO_DIAS = 3        # depois do vencimento, tudo continua funcionando por estes dias
AVISO_DIAS = 7                  # aviso de renovação
PREFIXO = "CMD1"

# ----------------------------------------------------------------------------------------------------------
# Ed25519 (RFC 8032)
# ----------------------------------------------------------------------------------------------------------
_p = 2 ** 255 - 19
_q = 2 ** 252 + 27742317777372353535851937790883648493

def _sha512(s): return hashlib.sha512(s).digest()
def _modq(s): return int.from_bytes(_sha512(s), "little") % _q
def _inv(x): return pow(x, _p - 2, _p)
_d = -121665 * _inv(121666) % _p
_sqrt_m1 = pow(2, (_p - 1) // 4, _p)

def _add(P, Q):
    A = (P[1] - P[0]) * (Q[1] - Q[0]) % _p
    B = (P[1] + P[0]) * (Q[1] + Q[0]) % _p
    C = 2 * P[3] * Q[3] * _d % _p
    D = 2 * P[2] * Q[2] % _p
    E, F, G, H = B - A, D - C, D + C, B + A
    return (E * F % _p, G * H % _p, F * G % _p, E * H % _p)

def _mul(s, P):
    Q = (0, 1, 1, 0)
    while s > 0:
        if s & 1: Q = _add(Q, P)
        P = _add(P, P)
        s >>= 1
    return Q

def _eq(P, Q):
    if (P[0] * Q[2] - Q[0] * P[2]) % _p != 0: return False
    if (P[1] * Q[2] - Q[1] * P[2]) % _p != 0: return False
    return True

def _recover_x(y, sign):
    if y >= _p: return None
    x2 = (y * y - 1) * _inv(_d * y * y + 1)
    if x2 == 0: return None if sign else 0
    x = pow(x2, (_p + 3) // 8, _p)
    if (x * x - x2) % _p != 0: x = x * _sqrt_m1 % _p
    if (x * x - x2) % _p != 0: return None
    if (x & 1) != sign: x = _p - x
    return x

_gy = 4 * _inv(5) % _p
_gx = _recover_x(_gy, 0)
_G = (_gx, _gy, 1, _gx * _gy % _p)

def _compress(P):
    zi = _inv(P[2]); x = P[0] * zi % _p; y = P[1] * zi % _p
    return int.to_bytes(y | ((x & 1) << 255), 32, "little")

def _decompress(s):
    if len(s) != 32: return None
    y = int.from_bytes(s, "little"); sign = y >> 255; y &= (1 << 255) - 1
    x = _recover_x(y, sign)
    return None if x is None else (x, y, 1, x * y % _p)

def _expand(secret):
    h = _sha512(secret)
    a = int.from_bytes(h[:32], "little")
    a &= (1 << 254) - 8
    a |= (1 << 254)
    return a, h[32:]

def chave_publica_de(segredo):
    a, _ = _expand(segredo)
    return _compress(_mul(a, _G))

def assinar(segredo, msg):
    a, prefixo = _expand(segredo)
    A = _compress(_mul(a, _G))
    r = _modq(prefixo + msg)
    Rs = _compress(_mul(r, _G))
    h = _modq(Rs + A + msg)
    s = (r + h * a) % _q
    return Rs + int.to_bytes(s, 32, "little")

def verificar(publica, msg, assinatura):
    if len(publica) != 32 or len(assinatura) != 64: return False
    A = _decompress(publica)
    if not A: return False
    Rs = assinatura[:32]
    R = _decompress(Rs)
    if not R: return False
    s = int.from_bytes(assinatura[32:], "little")
    if s >= _q: return False
    h = _modq(Rs + publica + msg)
    return _eq(_mul(s, _G), _add(R, _mul(h, A)))

# ----------------------------------------------------------------------------------------------------------
# Código de ativação:  CMD1.<payload base64url>.<assinatura base64url>
# ----------------------------------------------------------------------------------------------------------
def _b64e(b): return base64.urlsafe_b64encode(b).decode().rstrip("=")
def _b64d(s): return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))

def gerar_codigo(segredo, dados):
    """dados: {c: cliente, i: id da instalação ('*' = qualquer), ini: 'AAAA-MM-DD', fim: 'AAAA-MM-DD', g: dias de carência, p: plano}"""
    corpo = json.dumps({**dados, "v": 1}, separators=(",", ":"), ensure_ascii=False, sort_keys=True).encode("utf-8")
    return PREFIXO + "." + _b64e(corpo) + "." + _b64e(assinar(segredo, corpo))

def ler_codigo(codigo, publica_hex=None):
    """Devolve (dados, None) se a assinatura é válida; senão (None, 'motivo')."""
    try:
        txt = "".join(str(codigo or "").split())
        pre, corpo_b64, sig_b64 = txt.split(".")
        if pre != PREFIXO: return None, "Código inválido."
        corpo = _b64d(corpo_b64); sig = _b64d(sig_b64)
        pub = bytes.fromhex(publica_hex or CHAVE_PUBLICA_HEX)
        if not verificar(pub, corpo, sig): return None, "Código inválido ou adulterado."
        dados = json.loads(corpo.decode("utf-8"))
        date.fromisoformat(dados["fim"]); date.fromisoformat(dados["ini"])
        return dados, None
    except Exception:
        return None, "Código inválido."

# ----------------------------------------------------------------------------------------------------------
# Estado da licença neste aparelho (arquivo data/licenca.json — sobrevive a "zerar movimentação")
# ----------------------------------------------------------------------------------------------------------
_ALFA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"   # sem 0/O/1/I/L

class Licenca:
    def __init__(self, data_dir, publica_hex=None, hoje_fn=None):
        self.arq = os.path.join(str(data_dir), "licenca.json")
        self.lock = threading.RLock()
        self.pub = publica_hex
        self._hoje = hoje_fn or date.today
        self.e = self._ler()
        if not self.e.get("instalacao"):
            self.e["instalacao"] = "".join(secrets.choice(_ALFA) for _ in range(8))
            self._gravar()

    def _ler(self):
        try:
            with open(self.arq, "r", encoding="utf-8") as f: return json.load(f)
        except Exception:
            return {}

    def _gravar(self):
        tmp = self.arq + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f: json.dump(self.e, f, ensure_ascii=False)
        os.replace(tmp, self.arq)

    @property
    def instalacao_id(self):
        i = self.e["instalacao"]
        return i[:4] + "-" + i[4:]

    def hoje(self):
        """Data efetiva: nunca anda para trás (quem volta o relógio não ganha dias)."""
        h = self._hoje()
        with self.lock:
            ult = self.e.get("ultima")
            try: u = date.fromisoformat(ult) if ult else None
            except Exception: u = None
            if u and u > h: return u
            if not u or u < h:
                self.e["ultima"] = h.isoformat(); self._gravar()
        return h

    def _licenca_valida(self):
        cod = self.e.get("codigo")
        if not cod: return None
        dados, _ = ler_codigo(cod, self.pub)
        if not dados: return None
        if dados.get("i") not in ("*", self.instalacao_id.replace("-", ""), self.instalacao_id): return None
        return dados

    def ativar(self, codigo):
        dados, erro = ler_codigo(codigo, self.pub)
        if erro: return False, erro
        mesmo = dados.get("i") in ("*", self.instalacao_id.replace("-", ""), self.instalacao_id)
        if not mesmo: return False, "Este código é de outra instalação (ID " + str(dados.get("i")) + "). O ID deste aparelho é " + self.instalacao_id + "."
        atual = self._licenca_valida()
        if atual and atual["fim"] > dados["fim"]:
            return False, "Já existe uma licença com validade maior (até " + atual["fim"] + ")."
        with self.lock:
            self.e["codigo"] = "".join(str(codigo).split()); self._gravar()
        return True, "Assinatura ativada até " + dados["fim"] + "."

    def status(self):
        h = self.hoje()
        mes = h.strftime("%Y-%m")
        usadas = len(self.e.get("contadas", {}).get(mes, []))
        s = {"instalacaoId": self.instalacao_id, "hoje": h.isoformat(), "limiteComandas": LIMITE_COMANDAS_MES,
             "comandasMes": usadas, "estado": "gratis", "limitado": True, "cliente": "", "validade": None, "diasRestantes": None, "plano": "gratis"}
        d = self._licenca_valida()
        if d:
            fim = date.fromisoformat(d["fim"]); g = int(d.get("g", CARENCIA_PADRAO_DIAS))
            dias = (fim - h).days
            s.update({"cliente": d.get("c", ""), "validade": d["fim"], "diasRestantes": dias, "plano": d.get("p", "mensal"), "carenciaDias": g})
            if dias >= 0: s.update(estado="ativa", limitado=False, aviso=dias <= AVISO_DIAS)
            elif -dias <= g: s.update(estado="carencia", limitado=False, aviso=True)
            else: s.update(estado="vencida", limitado=True)
        return s

    def permitir_comandas(self, ids_novos):
        """ids_novos: ids de comandas que estão sendo CRIADAS agora. Registra (conta) e devolve (ok, msg)."""
        if not ids_novos: return True, ""
        st = self.status(); mes = st["hoje"][:7]
        with self.lock:
            cont = self.e.setdefault("contadas", {})
            usados = set(cont.get(mes, []))
            faltam = [i for i in ids_novos if i not in usados]
            if st["limitado"] and len(usados) + len(faltam) > LIMITE_COMANDAS_MES:
                return False, "Limite de %d comandas por mês do plano gratuito atingido. Assine para continuar sem limite." % LIMITE_COMANDAS_MES
            if faltam:
                usados.update(faltam); cont[mes] = sorted(usados)
                for k in sorted(cont)[:-3]: cont.pop(k, None)   # guarda só os últimos meses
                self._gravar()
        return True, ""
