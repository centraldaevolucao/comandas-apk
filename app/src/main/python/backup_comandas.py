"""Backup e restauração REAIS do banco do Comandas, em arquivo próprio com extensão .comandas.

O arquivo .comandas é um ZIP com:
  manifest.json   -> app, versão do formato, data, quantidade de registros por tipo
  dados.sqlite    -> cópia consistente do banco (API de backup do SQLite), sem as sessões de login
Também aceita restaurar um .sqlite puro (a cópia automática que o app Android guarda em /Comandas/backup).
"""
import io, json, os, re, sqlite3, tempfile, time, zipfile
from datetime import datetime

EXTENSAO = ".comandas"
FORMATO = 1
NOME_VALIDO = re.compile(r"^[A-Za-z0-9._-]{1,80}\.comandas$")
MAX_RESTAURAR = 300 * 1024 * 1024
MANTER = 20
# Recursos que são "movimentação" (apagados por "Zerar dados"); cadastros (produtos, clientes, mesas...) ficam.
MOVIMENTACAO = ("comandas", "caixas", "caixaAtual", "sangrias", "pedidosPendentes", "chamados",
                "perdas", "movimentacoes")


class ErroBackup(ValueError):
    pass


def pasta(data_dir):
    p = data_dir / "backups"
    p.mkdir(parents=True, exist_ok=True)
    return p


def _copiar_sqlite(origem, destino, lock):
    with lock:
        src = sqlite3.connect(str(origem), timeout=20)
        dst = sqlite3.connect(str(destino))
        try:
            src.backup(dst)
        finally:
            dst.close()
            src.close()


def criar(db_path, data_dir, lock, motivo="manual"):
    """Gera backup-AAAAMMDD-HHMMSS.comandas em data/backups e devolve (nome, caminho, resumo)."""
    destino_dir = pasta(data_dir)
    fd, tmp = tempfile.mkstemp(suffix=".sqlite", dir=str(destino_dir))
    os.close(fd)
    try:
        _copiar_sqlite(db_path, tmp, lock)
        con = sqlite3.connect(tmp)
        try:
            con.execute("DELETE FROM sessoes")
            con.commit()
            resumo = {r[0]: r[1] for r in con.execute("SELECT recurso, COUNT(*) FROM recursos GROUP BY recurso")}
        finally:
            con.close()
        nome = "backup-%s%s" % (time.strftime("%Y%m%d-%H%M%S"), EXTENSAO)
        i = 1
        while (destino_dir / nome).exists():
            i += 1
            nome = "backup-%s-%d%s" % (time.strftime("%Y%m%d-%H%M%S"), i, EXTENSAO)
        manifest = {"app": "comandas", "formato": FORMATO, "criadoEm": datetime.now().isoformat(timespec="seconds"),
                    "motivo": motivo, "registros": resumo}
        caminho = destino_dir / nome
        with zipfile.ZipFile(str(caminho), "w", zipfile.ZIP_DEFLATED) as z:
            z.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False, indent=1))
            z.write(tmp, "dados.sqlite")
    finally:
        try: os.remove(tmp)
        except OSError: pass
    _limpar_antigos(destino_dir)
    return nome, caminho, manifest


def _limpar_antigos(destino_dir):
    arquivos = sorted(destino_dir.glob("*" + EXTENSAO), key=lambda p: p.stat().st_mtime)
    for velho in arquivos[:-MANTER]:
        try: velho.unlink()
        except OSError: pass


def listar(data_dir):
    itens = []
    for p in sorted(pasta(data_dir).glob("*" + EXTENSAO), key=lambda p: p.stat().st_mtime, reverse=True):
        info = {"nome": p.name, "tamanho": p.stat().st_size, "data": datetime.fromtimestamp(p.stat().st_mtime).isoformat(timespec="seconds"),
                "motivo": "", "registros": {}}
        try:
            with zipfile.ZipFile(str(p)) as z:
                m = json.loads(z.read("manifest.json").decode("utf-8"))
                info["motivo"] = m.get("motivo", "")
                info["registros"] = m.get("registros", {})
                info["data"] = m.get("criadoEm", info["data"])
        except Exception:
            info["motivo"] = "arquivo ilegível"
        itens.append(info)
    return itens


def caminho_seguro(data_dir, nome):
    if not NOME_VALIDO.match(str(nome or "")):
        raise ErroBackup("Nome de arquivo inválido.")
    p = pasta(data_dir) / nome
    if not p.is_file():
        raise ErroBackup("Backup não encontrado.")
    return p


def excluir(data_dir, nome):
    caminho_seguro(data_dir, nome).unlink()


def _extrair_sqlite(raw, destino_tmp):
    """Aceita .comandas (zip) ou .sqlite puro. Grava o sqlite em destino_tmp."""
    if raw[:16] == b"SQLite format 3\x00":
        with open(destino_tmp, "wb") as f:
            f.write(raw)
        return
    if not zipfile.is_zipfile(io.BytesIO(raw)):
        raise ErroBackup("Arquivo inválido: não é um backup do Comandas (.comandas).")
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        nomes = z.namelist()
        if "manifest.json" not in nomes or "dados.sqlite" not in nomes:
            raise ErroBackup("Arquivo inválido: faltam partes do backup.")
        m = json.loads(z.read("manifest.json").decode("utf-8"))
        if m.get("app") != "comandas":
            raise ErroBackup("Este arquivo não é um backup do Comandas.")
        if int(m.get("formato", 0)) > FORMATO:
            raise ErroBackup("Backup de uma versão mais nova do app. Atualize o app e tente de novo.")
        with z.open("dados.sqlite") as origem, open(destino_tmp, "wb") as f:
            while True:
                bloco = origem.read(1024 * 1024)
                if not bloco: break
                f.write(bloco)


def restaurar_bytes(raw, db_path, data_dir, lock):
    """Valida, guarda uma cópia de segurança do que existe agora e substitui os dados pelo backup."""
    if not raw:
        raise ErroBackup("Arquivo vazio.")
    destino_dir = pasta(data_dir)
    fd, tmp = tempfile.mkstemp(suffix=".sqlite", dir=str(destino_dir))
    os.close(fd)
    try:
        try:
            _extrair_sqlite(raw, tmp)
        except zipfile.BadZipFile:
            raise ErroBackup("Arquivo danificado.")
        con = sqlite3.connect(tmp)
        try:
            tabelas = {r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
            if "recursos" not in tabelas:
                raise ErroBackup("O arquivo não contém dados do Comandas.")
            if con.execute("PRAGMA quick_check").fetchone()[0] != "ok":
                raise ErroBackup("Banco do backup está corrompido.")
            total = con.execute("SELECT COUNT(*) FROM recursos").fetchone()[0]
        finally:
            con.close()
        seguranca = None
        try:
            seguranca = criar(db_path, data_dir, lock, motivo="antes-de-restaurar")[0]
        except Exception:
            pass
        with lock:
            # A configuração deste aparelho (servidor/cliente/função) NÃO vem do backup: fica como está.
            atual = sqlite3.connect(str(db_path), timeout=20)
            try:
                device = atual.execute("SELECT recurso, cliente_id, item_id, dados FROM recursos WHERE recurso='device'").fetchall()
            finally:
                atual.close()
            src = sqlite3.connect(tmp)
            dst = sqlite3.connect(str(db_path), timeout=20)
            try:
                src.backup(dst)
                dst.execute("DELETE FROM recursos WHERE recurso='device'")
                for linha in device:
                    dst.execute("INSERT OR REPLACE INTO recursos(recurso,cliente_id,item_id,dados) VALUES(?,?,?,?)", linha)
                dst.execute("CREATE TABLE IF NOT EXISTS sessoes (token TEXT PRIMARY KEY, usuario_id INTEGER, dados TEXT)")
                dst.commit()
            finally:
                dst.close()
                src.close()
        return {"registros": total, "copiaDeSeguranca": seguranca}
    finally:
        try: os.remove(tmp)
        except OSError: pass


def zerar_movimentacao(db_path, data_dir, lock):
    """Apaga comandas, caixas e demais movimentações; mantém produtos, clientes, mesas e configurações."""
    seguranca = criar(db_path, data_dir, lock, motivo="antes-de-zerar")[0]
    with lock:
        con = sqlite3.connect(str(db_path), timeout=20)
        try:
            marcas = ",".join("?" * len(MOVIMENTACAO))
            apagados = con.execute("DELETE FROM recursos WHERE recurso IN (%s)" % marcas, MOVIMENTACAO).rowcount
            con.commit()
        finally:
            con.close()
    return {"apagados": apagados, "copiaDeSeguranca": seguranca}
