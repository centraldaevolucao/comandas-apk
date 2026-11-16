#!/data/data/com.termux/files/usr/bin/bash
# Servidor Comandas no Termux.
#   bash iniciar-servidor.sh           -> só rede local / hotspot
#   bash iniciar-servidor.sh tunel     -> também gera o link https://xxxx.trycloudflare.com
cd "$(dirname "$0")"
command -v python3 >/dev/null || pkg install -y python
termux-wake-lock 2>/dev/null
export HOST=0.0.0.0 PORT=${PORT:-3000}
rm -f tunnel_url.txt

if [ "$1" = "tunel" ]; then
  if ! command -v cloudflared >/dev/null; then
    echo "Instalando cloudflared (pacote do Termux)..."
    pkg install -y cloudflared || { echo "Não foi possível instalar o cloudflared."; exit 1; }
  fi
  : > tunel.log
  cloudflared tunnel --url "http://127.0.0.1:$PORT" --no-autoupdate > tunel.log 2>&1 &
  CF=$!
  trap 'kill $CF 2>/dev/null' EXIT
  ( for i in $(seq 1 60); do
      URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' tunel.log | head -1)
      [ -n "$URL" ] && { echo "$URL" > tunnel_url.txt; echo ">>> Link externo: $URL"; break; }
      sleep 1
    done ) &
fi

echo "Enderecos para os outros aparelhos (use o do hotspot se ele estiver ligado):"
ip -4 -o addr 2>/dev/null | awk '{print "  http://" $4 "  (" $2 ")"}' | sed 's#/[0-9]*  #  #'
python3 server.py
