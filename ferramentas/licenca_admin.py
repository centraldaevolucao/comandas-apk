#!/usr/bin/env python3
"""Ferramenta DO DONO: emite e controla assinaturas do Comandas. NÃO vai no app (o app só tem a chave pública).

  python3 licenca_admin.py chaves                         (uma vez) cria chave-privada.txt e mostra a chave pública
  python3 licenca_admin.py emitir --cliente "Bar do Zé" --id ABCD-EFGH --meses 1 --valor 13.99
  python3 licenca_admin.py renovar --cliente "Bar do Zé" --meses 1 --valor 13.99
  python3 licenca_admin.py listar [--vencendo]            situação de todos os clientes (pago? vence quando?)
  python3 licenca_admin.py verificar CODIGO               mostra o que há dentro de um código

Cada código emitido é anotado em livro-licencas.csv (cliente, ID, datas, valor, forma de pagamento) = seu controle
de recebimentos. GUARDE chave-privada.txt e livro-licencas.csv em lugar seguro (e faça cópia). Sem a chave privada
não dá para emitir novos códigos; quem a tiver pode emitir códigos como se fosse você.
"""
import argparse, calendar, csv, os, sys
from datetime import date, timedelta

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, "..", "app", "src", "main", "python"))
import licenca as L

ARQ_CHAVE = os.path.join(AQUI, "chave-privada.txt")
ARQ_LIVRO = os.path.join(AQUI, "livro-licencas.csv")
CAMPOS = ["emitido_em", "cliente", "instalacao", "plano", "inicio", "fim", "valor", "forma_pagamento", "obs", "codigo"]

def ler_chave():
    if not os.path.exists(ARQ_CHAVE): sys.exit("Falta chave-privada.txt. Rode primeiro:  python3 licenca_admin.py chaves")
    return bytes.fromhex(open(ARQ_CHAVE).read().strip())

def somar_meses(d, n):
    m = d.month - 1 + n; a = d.year + m // 12; m = m % 12 + 1
    return date(a, m, min(d.day, calendar.monthrange(a, m)[1]))

def livro():
    if not os.path.exists(ARQ_LIVRO): return []
    with open(ARQ_LIVRO, newline="", encoding="utf-8") as f: return list(csv.DictReader(f))

def anotar(linha):
    novo = not os.path.exists(ARQ_LIVRO)
    with open(ARQ_LIVRO, "a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=CAMPOS)
        if novo: w.writeheader()
        w.writerow(linha)

def emitir_codigo(cliente, inst, inicio, fim, carencia, valor, forma, obs):
    cod = L.gerar_codigo(ler_chave(), {"c": cliente, "i": inst.replace("-", "").upper() if inst != "*" else "*", "ini": inicio.isoformat(), "fim": fim.isoformat(), "g": carencia, "p": "mensal"})
    anotar({"emitido_em": date.today().isoformat(), "cliente": cliente, "instalacao": inst, "plano": "mensal", "inicio": inicio.isoformat(), "fim": fim.isoformat(),
            "valor": valor, "forma_pagamento": forma, "obs": obs, "codigo": cod})
    print("\nCliente:   ", cliente, "\nInstalação:", inst, "\nVálido:    ", inicio, "até", fim, "(carência %d dias)" % carencia)
    print("\n=== ENVIE ESTE CÓDIGO AO CLIENTE (Assinatura › Código de ativação) ===\n\n" + cod + "\n")

def cmd_chaves(a):
    if os.path.exists(ARQ_CHAVE) and not a.forcar: sys.exit("chave-privada.txt já existe. (Trocar a chave invalida TODOS os códigos já emitidos; use --forcar se tiver certeza.)")
    seg = os.urandom(32)
    open(ARQ_CHAVE, "w").write(seg.hex() + "\n"); os.chmod(ARQ_CHAVE, 0o600)
    print("Chave privada salva em", ARQ_CHAVE, "(NUNCA compartilhe nem coloque no GitHub).")
    print("Chave pública (cole em app/src/main/python/licenca.py → CHAVE_PUBLICA_HEX e gere o app de novo):\n" + L.chave_publica_de(seg).hex())

def cmd_emitir(a):
    ini = date.fromisoformat(a.inicio) if a.inicio else date.today()
    emitir_codigo(a.cliente, a.id, ini, somar_meses(ini, a.meses), a.carencia, a.valor, a.forma, a.obs)

def cmd_renovar(a):
    ult = [r for r in livro() if r["cliente"].lower() == a.cliente.lower()]
    if not ult: sys.exit("Cliente não encontrado no livro. Use 'emitir' com o --id do cliente.")
    r = max(ult, key=lambda x: x["fim"]); fim_ant = date.fromisoformat(r["fim"])
    ini = max(fim_ant, date.today())          # renovou antes de vencer: continua do vencimento; vencido: conta de hoje
    emitir_codigo(r["cliente"], r["instalacao"], ini, somar_meses(ini, a.meses), a.carencia, a.valor, a.forma, a.obs)

def cmd_listar(a):
    ult = {}
    for r in livro():
        k = (r["cliente"], r["instalacao"])
        if k not in ult or r["fim"] > ult[k]["fim"]: ult[k] = r
    hoje = date.today(); tot = 0
    print("%-24s %-10s %-11s %-8s %s" % ("CLIENTE", "INSTAL.", "VENCE", "DIAS", "SITUAÇÃO"))
    for r in sorted(ult.values(), key=lambda x: x["fim"]):
        dias = (date.fromisoformat(r["fim"]) - hoje).days
        sit = "ATIVA" if dias >= 7 else ("VENCE LOGO" if dias >= 0 else ("CARÊNCIA" if dias >= -L.CARENCIA_PADRAO_DIAS else "VENCIDA — cobrar"))
        if a.vencendo and dias > 7: continue
        print("%-24s %-10s %-11s %-8s %s" % (r["cliente"][:24], r["instalacao"], r["fim"], dias, sit))
    for r in livro():
        try: tot += float(str(r["valor"]).replace(",", "."))
        except Exception: pass
    print("\nTotal recebido (soma do livro): R$ %.2f" % tot)

def cmd_verificar(a):
    pub = L.chave_publica_de(ler_chave()).hex()
    d, e = L.ler_codigo(a.codigo, pub)
    print(e or d)

p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
s = p.add_subparsers(dest="cmd", required=True)
x = s.add_parser("chaves"); x.add_argument("--forcar", action="store_true"); x.set_defaults(f=cmd_chaves)
for nome, f in (("emitir", cmd_emitir), ("renovar", cmd_renovar)):
    x = s.add_parser(nome); x.add_argument("--cliente", required=True)
    if nome == "emitir": x.add_argument("--id", required=True, help="ID da instalação mostrado na tela Assinatura do cliente ('*' = qualquer aparelho, só p/ testes)"); x.add_argument("--inicio")
    x.add_argument("--meses", type=int, default=1); x.add_argument("--valor", default="13.99"); x.add_argument("--forma", default="pix")
    x.add_argument("--carencia", type=int, default=L.CARENCIA_PADRAO_DIAS); x.add_argument("--obs", default=""); x.set_defaults(f=f)
x = s.add_parser("listar"); x.add_argument("--vencendo", action="store_true"); x.set_defaults(f=cmd_listar)
x = s.add_parser("verificar"); x.add_argument("codigo"); x.set_defaults(f=cmd_verificar)
a = p.parse_args(); a.f(a)
