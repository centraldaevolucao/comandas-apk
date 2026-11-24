"""Assinatura recorrente no cartão (Mercado Pago) — lado do app.

O app NÃO vê nem guarda dados de cartão: abre a página do Mercado Pago e só guarda o token de cancelamento.
O Servidor Assinatura (pasta Servidor-Assinatura) é quem fala com o Mercado Pago e emite a licença.
Endereço: variável COMANDAS_ASSINATURAS_URL ou o arquivo data/assinaturas_url.txt ou URL_PADRAO abaixo.
Vazio = recurso desligado (o app continua só com Pix).
"""
import json, os, urllib.request, urllib.error

URL_PADRAO = ""     # ex.: "https://servidor-assinatura.onrender.com"  (preencha depois de publicar o servidor)


def _url(data_dir):
    u = os.environ.get("COMANDAS_ASSINATURAS_URL", "").strip()
    if not u:
        try:
            with open(os.path.join(str(data_dir), "assinaturas_url.txt"), "r", encoding="utf-8") as f: u = f.read().strip()
        except Exception: u = ""
    return (u or URL_PADRAO).rstrip("/")


def disponivel(data_dir): return bool(_url(data_dir))


def _chamar(data_dir, metodo, caminho, corpo=None):
    base = _url(data_dir)
    if not base: return 0, {"erro": "Assinatura no cartão não está disponível."}
    req = urllib.request.Request(base + caminho, method=metodo, data=(json.dumps(corpo).encode() if corpo is not None else None), headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=25) as r: return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read().decode() or "{}")
        except Exception: return e.code, {"erro": "Erro no Servidor Assinatura."}
    except Exception:
        return 0, {"erro": "Sem conexão com a internet. A assinatura no cartão precisa de internet."}


def _inst(LIC): return LIC.instalacao_id.replace("-", "")


def assinar(LIC, data_dir, edicao, meses, email):
    st, j = _chamar(data_dir, "POST", "/api/assinar", {"instalacao": _inst(LIC), "edicao": edicao, "meses": meses, "email": email})
    if st != 200 or not j.get("url"): return False, j.get("erro") or "Não foi possível iniciar a assinatura.", {}
    with LIC.lock:
        LIC.e["cartao"] = {"token": j.get("token", ""), "edicao": edicao, "meses": meses, "email": email}
        LIC._gravar()
    return True, "", {"url": j["url"], "valor": j.get("valor")}


def status(LIC, data_dir):
    """Consulta o servidor; se houver licença paga no cartão, ativa sozinha. Nunca derruba o app: erro vira só um aviso."""
    if not disponivel(data_dir): return {"disponivel": False}
    st, j = _chamar(data_dir, "GET", "/api/assinatura?i=" + _inst(LIC))
    if st != 200: return {"disponivel": True, "erro": j.get("erro") or "Sem conexão.", "tokenLocal": bool((LIC.e.get("cartao") or {}).get("token"))}
    ativou = ""
    cod = j.pop("codigo", None)
    if cod:
        ok, msg = LIC.ativar(cod)
        ativou = msg if ok else ""
    j.update(disponivel=True, ativou=ativou, tokenLocal=bool((LIC.e.get("cartao") or {}).get("token")))
    return j


def cancelar(LIC, data_dir):
    tok = (LIC.e.get("cartao") or {}).get("token")
    if not tok: return False, "Este aparelho não iniciou a assinatura no cartão. Cancele pelo aparelho que a contratou ou fale com o suporte."
    st, j = _chamar(data_dir, "POST", "/api/cancelar", {"instalacao": _inst(LIC), "token": tok})
    if st != 200: return False, j.get("erro") or "Não foi possível cancelar agora."
    return True, j.get("msg") or "Assinatura cancelada."
