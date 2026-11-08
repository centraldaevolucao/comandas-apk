"""Ponte entre o app Android e o server.py (que fica idêntico ao do PC, salvo pasta/host/porta por ambiente)."""
import os, threading

_thread = None

def iniciar(raiz, host, porta):
    """Sobe o servidor HTTP em uma thread. Retorna imediatamente."""
    global _thread
    if _thread is not None and _thread.is_alive():
        return
    os.environ["COMANDAS_ROOT"] = raiz
    os.environ["HOST"] = host
    os.environ["PORT"] = str(porta)
    import server  # lê as variáveis acima ao ser importado
    def rodar():
        server.init_db()
        srv = server.ThreadingHTTPServer((server.HOST, server.PORT), server.Handler)
        srv.serve_forever()
    _thread = threading.Thread(target=rodar, name="comandas-server", daemon=True)
    _thread.start()


def salvar_backup(pasta):
    """Cópia consistente do banco (API de backup do SQLite) para a pasta pública /Comandas/backup.
    Mantém também as 5 cópias datadas mais recentes. A pasta sobrevive a desinstalar/reinstalar o app."""
    import sqlite3, shutil, time, glob
    os.makedirs(pasta, exist_ok=True)
    import server
    destino = os.path.join(pasta, "comandas.sqlite")
    tmp = destino + ".tmp"
    with server.DB_LOCK:
        src = sqlite3.connect(str(server.DB_PATH), timeout=20)
        dst = sqlite3.connect(tmp)
        try:
            src.backup(dst)
        finally:
            dst.close(); src.close()
    os.replace(tmp, destino)
    # uma cópia datada por dia (últimas 5)
    datada = os.path.join(pasta, "comandas-%s.sqlite" % time.strftime("%Y%m%d"))
    if not os.path.exists(datada):
        shutil.copyfile(destino, datada)
        antigas = sorted(glob.glob(os.path.join(pasta, "comandas-*.sqlite")))
        for velha in antigas[:-5]:
            try: os.remove(velha)
            except OSError: pass
    return True
