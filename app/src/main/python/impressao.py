"""Impressão térmica direta (ESC/POS) para o Restaurante Desktop (Windows e Linux).
Destinos (ids):  tcp:IP:PORTA · usb:/dev/usb/lpN · serial:/dev/ttyUSB0 · cups:NOME (Linux) · win:NOME (Windows)
Só usa a biblioteca padrão. No Android não é usado (lá a impressão é Bluetooth, pelo app)."""
import os, sys, json, glob, socket, subprocess, ipaddress, shutil, threading

_trava = threading.Lock()


def _rodar(cmd, timeout=8):
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return r.returncode, r.stdout
    except Exception:
        return 1, ""


def _arq_redes(data_dir):
    return os.path.join(str(data_dir), "impressoras_rede.json")


def redes_salvas(data_dir):
    try:
        with open(_arq_redes(data_dir), encoding="utf-8") as f:
            v = json.load(f)
        return v if isinstance(v, list) else []
    except Exception:
        return []


def _grava_redes(data_dir, lista):
    tmp = _arq_redes(data_dir) + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(lista, f, ensure_ascii=False)
    os.replace(tmp, _arq_redes(data_dir))


def _ip_privado(host):
    """Só aceita impressora na própria rede (evita usar o servidor para alcançar a internet)."""
    try:
        ips = {socket.gethostbyname(host)}
    except OSError:
        return False
    return all(ipaddress.ip_address(i).is_private or ipaddress.ip_address(i).is_loopback for i in ips)


def adicionar_rede(data_dir, nome, host, porta):
    host = str(host or "").strip()
    try:
        porta = int(porta or 9100)
    except (TypeError, ValueError):
        raise ValueError("Porta inválida.")
    if not host or not (1 <= porta <= 65535):
        raise ValueError("Informe o IP (ex.: 192.168.0.50) e a porta (padrão 9100).")
    if not _ip_privado(host):
        raise ValueError("Use o IP de uma impressora da sua rede local (192.168.x.x, 10.x.x.x…).")
    lista = redes_salvas(data_dir)
    dest = "tcp:%s:%d" % (host, porta)
    lista = [i for i in lista if i.get("mac") != dest]
    lista.append({"nome": (str(nome).strip() or "Impressora de rede") + " (" + host + ")", "mac": dest, "impressora": True})
    _grava_redes(data_dir, lista)
    return lista


def remover_rede(data_dir, destino):
    lista = [i for i in redes_salvas(data_dir) if i.get("mac") != destino]
    _grava_redes(data_dir, lista)
    return lista


def _win_impressoras():
    rc, out = _rodar(["powershell", "-NoProfile", "-Command", "Get-Printer | Select-Object -ExpandProperty Name"], 12)
    return [n.strip() for n in out.splitlines() if n.strip()] if rc == 0 else []


def _linux_impressoras():
    rc, out = _rodar(["lpstat", "-e"]) if shutil.which("lpstat") else (1, "")
    return [n.strip() for n in out.splitlines() if n.strip()] if rc == 0 else []


def listar(data_dir):
    """{'lista': [{nome, mac (=destino), impressora}], 'erro': '' }"""
    lista = list(redes_salvas(data_dir))
    if os.name == "nt":
        for n in _win_impressoras():
            lista.append({"nome": n + " (Windows)", "mac": "win:" + n, "impressora": True})
    else:
        for n in _linux_impressoras():
            lista.append({"nome": n + " (CUPS)", "mac": "cups:" + n, "impressora": True})
        for p in sorted(glob.glob("/dev/usb/lp*")):
            lista.append({"nome": "USB " + os.path.basename(p), "mac": "usb:" + p, "impressora": True})
        for p in sorted(glob.glob("/dev/ttyUSB*") + glob.glob("/dev/ttyACM*") + glob.glob("/dev/rfcomm*")):
            lista.append({"nome": "Serial " + os.path.basename(p), "mac": "serial:" + p, "impressora": False})
    return {"lista": lista, "erro": ""}


def _winspool(nome, dados):
    import ctypes
    from ctypes import wintypes
    sp = ctypes.WinDLL("winspool.drv", use_last_error=True)

    class DOC(ctypes.Structure):
        _fields_ = [("pDocName", wintypes.LPWSTR), ("pOutputFile", wintypes.LPWSTR), ("pDatatype", wintypes.LPWSTR)]
    h = wintypes.HANDLE()
    if not sp.OpenPrinterW(nome, ctypes.byref(h), None):
        raise OSError("Não foi possível abrir a impressora do Windows (erro %d)." % ctypes.get_last_error())
    try:
        if not sp.StartDocPrinterW(h, 1, ctypes.byref(DOC("Restaurante", None, "RAW"))):
            raise OSError("A impressora recusou o documento (erro %d)." % ctypes.get_last_error())
        sp.StartPagePrinter(h)
        escrito = wintypes.DWORD()
        ok = sp.WritePrinter(h, dados, len(dados), ctypes.byref(escrito))
        sp.EndPagePrinter(h)
        sp.EndDocPrinter(h)
        if not ok:
            raise OSError("Falha ao enviar para a impressora (erro %d)." % ctypes.get_last_error())
    finally:
        sp.ClosePrinter(h)


def enviar(data_dir, destino, dados):
    """Envia os bytes ESC/POS. O destino precisa estar na lista de impressoras conhecidas (nada de caminhos livres)."""
    conhecidos = {i["mac"] for i in listar(data_dir)["lista"]}
    if destino not in conhecidos:
        raise ValueError("Impressora não encontrada. Atualize a lista em Impressoras.")
    tipo, _, alvo = destino.partition(":")
    with _trava:
        if tipo == "tcp":
            host, _, porta = alvo.rpartition(":")
            if not _ip_privado(host):
                raise ValueError("Endereço fora da rede local.")
            with socket.create_connection((host, int(porta)), timeout=6) as s:
                s.sendall(dados)
        elif tipo in ("usb", "serial"):
            with open(alvo, "wb", buffering=0) as f:
                f.write(dados)
        elif tipo == "cups":
            r = subprocess.run(["lp", "-d", alvo, "-o", "raw"], input=dados, capture_output=True, timeout=15)
            if r.returncode != 0:
                raise OSError((r.stderr or b"Falha no CUPS").decode("utf-8", "replace").strip())
        elif tipo == "win" and os.name == "nt":
            _winspool(alvo, dados)
        else:
            raise ValueError("Tipo de impressora não suportado neste sistema.")
    return True
