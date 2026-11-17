// ============================================================
// PLATAFORMADESKTOP.JS — funções do computador (Windows/Linux) registradas na camada Plataforma.
// Só vale no próprio PC (localhost): impressora térmica direta por rede, USB, serial ou impressora do sistema.
// Reaproveita a tela Impressoras e o fluxo da térmica do Bluetooth (bluetooth.js): o "mac" vira o destino
// (tcp:IP:porta · usb:/dev/usb/lp0 · cups:NOME · win:NOME).
// ============================================================
(function () {
    'use strict';
    const P = window.Plataforma;
    if (!P || P.ehAndroid) return;
    const h = location.hostname;
    if (h !== 'localhost' && h !== '127.0.0.1' && h !== '[::1]') return;   // celular/garçom no navegador não usa as impressoras do PC

    function api(metodo, caminho, corpo) {   // síncrono de propósito: a ponte do Android também responde na hora
        const x = new XMLHttpRequest();
        x.open(metodo, caminho, false);
        if (corpo) x.setRequestHeader('Content-Type', 'application/json');
        x.send(corpo ? JSON.stringify(corpo) : null);
        let j = {}; try { j = JSON.parse(x.responseText || '{}'); } catch (e) {}
        return { status: x.status, json: j };
    }

    P.registrar('btListar', function () {
        try {
            const r = api('GET', '/api/impressoras');
            if (r.status !== 200) return JSON.stringify({ erro: 'Não foi possível listar as impressoras.', lista: [] });
            return JSON.stringify({ erro: '', lista: r.json.lista || [] });
        } catch (e) { return JSON.stringify({ erro: 'Não foi possível listar as impressoras.', lista: [] }); }
    });
    P.registrar('btImprimir', function (destino, dadosB64, id) {
        fetch('/api/imprimir-raw', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ destino: destino, dados: dadosB64 }) })
            .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok && j.ok !== false, msg: j.msg || j.error || '' }; }); })
            .catch(function (e) { return { ok: false, msg: e.message }; })
            .then(function (r) { if (window.__btRes) window.__btRes(id, r.ok, r.msg || (r.ok ? 'ok' : 'Falha ao imprimir')); });
    });

    // Impressora de rede: IP + porta (padrão 9100)
    window.impAdicionarRede = async function () {
        const host = window.prompt('IP da impressora na rede (ex.: 192.168.0.50)');
        if (!host) return;
        const porta = window.prompt('Porta (padrão 9100)', '9100') || '9100';
        const nome = window.prompt('Nome da impressora (ex.: Cozinha)', 'Impressora') || 'Impressora';
        const r = await fetch('/api/impressoras', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ host: host, porta: porta, nome: nome }) });
        const j = await r.json().catch(function () { return {}; });
        if (!r.ok) { alert(j.msg || 'Não foi possível adicionar.'); return; }
        if (window.btDesenhar) window.btDesenhar();
    };
    window.impRemoverRede = async function (destino) {
        if (!await window.confirmar('Remover esta impressora de rede da lista?')) return;
        await fetch('/api/impressoras?destino=' + encodeURIComponent(destino), { method: 'DELETE' });
        if (window.btDesenhar) window.btDesenhar();
    };
})();
