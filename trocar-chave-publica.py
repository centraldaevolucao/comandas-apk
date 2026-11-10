#!/usr/bin/env python3
"""Troca a chave PÚBLICA embutida no Comandas (e, se quiser, no Licenca-app).
Não precisa da chave privada: use a "Chave pública" (64 caracteres) mostrada em Licenca-app › Configurações.

    python3 trocar-chave-publica.py <chave_publica_64_hex> [--licencas ../comandas-licencas]

Depois: aumente a versão, gere o APK (GitHub) e instale nos clientes. Licenças antigas deixam de valer.
"""
import os, re, sys

def main():
    a = [x for x in sys.argv[1:]]
    pasta_lic = None
    if "--licencas" in a:
        i = a.index("--licencas"); pasta_lic = a[i + 1]; del a[i:i + 2]
    if len(a) != 1 or not re.fullmatch(r"[0-9a-fA-F]{64}", a[0].strip()):
        sys.exit("Informe a chave pública com exatamente 64 caracteres hexadecimais (0-9, a-f).")
    nova = a[0].strip().lower()
    aqui = os.path.dirname(os.path.abspath(__file__))
    alvos = [os.path.join(aqui, "app/src/main/python/licenca.py"), os.path.join(aqui, "termux/licenca.py")]
    if pasta_lic: alvos.append(os.path.join(pasta_lic, "app/src/main/python/licencas/licenca.py"))
    for p in alvos:
        if not os.path.exists(p): print("(não encontrado, ignorado) " + p); continue
        s = open(p, encoding="utf-8").read()
        novo, n = re.subn(r'(CHAVE_PUBLICA_HEX\s*=\s*")[0-9a-fA-F]{64}(")', r"\g<1>" + nova + r"\g<2>", s, count=1)
        if n != 1: print("ERRO: constante não encontrada em " + p); continue
        open(p, "w", encoding="utf-8").write(novo); print("atualizado: " + p)
    print("\nPronto. Agora aumente a versão (app/build.gradle e VERSAO_SERVIDOR), gere o APK e reinstale.")

main()
