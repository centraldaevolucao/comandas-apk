// ============================================================
// REDE.JS — CONFIGURAÇÃO DE REDE E CONEXÃO + diagnóstico
// ============================================================
console.log('✔ Rede.js carregado');

window.renderRede = function () {
    setTimeout(window.redeAtualizar, 30);
    return [
        '<div class="app-bar">',
        '  <button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button>',
        '  <h1>Rede e conexão</h1>',
        '  <button class="icon-btn" onclick="redeAtualizar()" title="Atualizar"><i class="fas fa-sync-alt"></i></button>',
        '</div>',
        '<div class="content-area" id="rede-conteudo" style="padding:16px;"><p class="empty-state">🔄 Carregando...</p></div>'
    ].join('');
};

function _esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
function _linha(k, v) { return '<div style="display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px dashed #eee;font-size:.85rem;"><span style="color:#666;">' + k + '</span><b style="text-align:right;word-break:break-all;">' + v + '</b></div>'; }

window.redeAtualizar = async function () {
    const c = document.getElementById('rede-conteudo');
    if (!c) return;
    const mt = window.MT || {}, cx = window.CX || {};
    const tipo = mt.tipoDispositivo || 'unico';
    const nomeModo = tipo === 'unico' ? '📱 Dispositivo Único' : tipo === 'servidor' ? '🌐 Servidor' : '🔗 Cliente';
    const perfil = window.perfilDados ? window.perfilDados() : null;
    let h = '';

    h += '<div class="card" style="background:#FCE4EC;"><div class="card-title">Modo em uso</div>';
    h += _linha('Modo', nomeModo);
    h += _linha('Função', perfil ? _esc(perfil.nome) : 'Acesso total');
    if (tipo === 'cliente') {
        const corEst = { conectado: '#2e7d32', reconectando: '#f57c00', offline: '#c62828' }[cx.estado] || '#555';
        h += _linha('Estado', '<span style="color:' + corEst + ';">' + _esc(cx.estado || '—') + '</span>');
        h += _linha('Endereço ativo', _esc(cx.ativo || '—') + (cx.ativoTipo ? ' (' + _esc(cx.nomeTipo(cx.ativoTipo)) + ')' : ''));
        h += _linha('Latência', cx.latencia != null ? cx.latencia + ' ms' : '—');
        if (cx.ultimoErro) h += _linha('Último erro', _esc(cx.ultimoErro));
    }
    h += _linha('Tempo real', _esc(cx.tempoReal || 'parado'));
    h += '</div>';

    // ---- diagnóstico do servidor (o local ou o ativo) ----
    let d = null, erroDiag = '';
    try {
        const r = await (window.CX ? window.CX.fetch('/api/diagnostico') : fetch('/api/diagnostico'));
        d = await r.json();
    } catch (e) { erroDiag = e.message || 'sem resposta'; }

    h += '<div class="card" style="background:#fff;"><div class="card-title"><i class="fas fa-stethoscope"></i> Diagnóstico do servidor</div>';
    if (d) {
        h += _linha('Versão', _esc(d.versao));
        h += _linha('Escutando em', _esc(d.escutando) + ':' + _esc(d.porta) + (d.escutando === '0.0.0.0' ? ' (todas as interfaces)' : ''));
        h += _linha('Banco de dados', d.banco && d.banco.ok ? 'OK (' + d.banco.registros + ' registros)' : '<span style="color:#c62828;">ERRO ' + _esc(d.banco && d.banco.erro) + '</span>');
        h += _linha('Ativo há', Math.floor(d.ativoSeg / 60) + ' min');
        h += _linha('Aparelhos em tempo real', (d.clientesTempoReal || []).length);
        h += _linha('Este pedido veio de', _esc(d.origem) + (d.externo ? ' (internet)' : ''));
        if (d.urlTunel) h += _linha('Link Cloudflare', _esc(d.urlTunel));
        h += '<div style="margin-top:10px;font-weight:600;font-size:.85rem;">Endereços para os outros aparelhos:</div>';
        let ips = (d.ips || []).slice();
        try { if (window.AndroidApp && window.AndroidApp.ipLocal) { const a = String(window.AndroidApp.ipLocal() || ''); if (a && a !== '?' && !ips.some(function (i) { return i.ip === a; })) ips.unshift({ ip: a, interface: 'app' }); } } catch (e) {}
        if (!ips.length) h += '<div style="color:#c62828;font-size:.85rem;">Nenhum IP de rede encontrado. Conecte ao Wi-Fi ou ligue o Hotspot.</div>';
        ips.forEach(function (i) {
            const u = 'http://' + i.ip + ':' + d.porta;
            h += '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;font-size:.85rem;"><span><code>' + _esc(u) + '</code> <small style="color:#888;">' + _esc(i.interface) + ' · ' + _esc(window.CX.nomeTipo(window.CX.tipoPeloEndereco(u))) + '</small></span>' +
                '<button class="btn-outline" style="padding:4px 10px;" onclick="copiarTexto(\'' + _esc(u) + '\',\'Endereço copiado\')"><i class="fas fa-copy"></i></button></div>';
        });
    } else {
        h += '<div style="color:#c62828;font-size:.9rem;">❌ Servidor não respondeu: ' + _esc(erroDiag) + '</div>';
    }
    h += '</div>';

    // ---- acesso dos colaboradores pelo link externo (servidor / único) ----
    if (tipo !== 'cliente') {
        let ac = null;
        try { ac = await fetch('/api/acesso-externo', { cache: 'no-store' }).then(function (r) { return r.json(); }); } catch (e) {}
        h += '<div class="card" style="background:#fff3e0;border-left:4px solid #ef6c00;"><div class="card-title"><i class="fas fa-user-lock"></i> Acesso dos colaboradores (link externo)</div>';
        h += '<div style="font-size:.78rem;color:#666;margin-bottom:8px;">O QR Code das mesas dá acesso <b>só ao cardápio</b>. Para colaboradores usarem Garçom/Caixa/Cozinha de fora da rede, gere a chave abaixo e envie o link de cada função. Quem não tem a chave não passa do cardápio.</div>';
        const tunel = (ac && ac.urlTunel) || (d && d.urlTunel) || '';
        if (!tunel) {
            h += '<div style="color:#c62828;font-size:.85rem;">Ligue o link externo primeiro (QR Codes › Gerar link externo).</div>';
        } else if (!ac || !ac.chave) {
            h += '<div style="font-size:.85rem;margin-bottom:8px;">Acesso de colaboradores <b>desligado</b>.</div>';
            h += '<button class="btn-primary" style="width:100%;" onclick="redeGerarChave()"><i class="fas fa-key"></i> Gerar chave e liberar</button>';
        } else {
            [['garcom', 'Garçom (PDV)'], ['caixa', 'Caixa'], ['cozinha', 'Cozinha'], ['cardapio', 'Cardápio do Dia']].forEach(function (f) {
                const u = tunel.replace(/\/$/, '') + '/' + f[0] + '?k=' + ac.chave;
                h += '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-bottom:1px dashed #ffe0b2;font-size:.82rem;"><span><b>' + f[1] + '</b><br><small style="word-break:break-all;color:#666;">' + _esc(u) + '</small></span>' +
                    '<button class="btn-outline" style="padding:4px 10px;" onclick="copiarTexto(\'' + _esc(u) + '\',\'Link copiado\')"><i class="fas fa-copy"></i></button></div>';
            });
            h += '<div style="display:flex;gap:8px;margin-top:10px;"><button class="btn-outline" style="flex:1;" onclick="redeGerarChave()"><i class="fas fa-redo"></i> Renovar chave</button>' +
                 '<button class="btn-outline" style="flex:1;border-color:#c62828;color:#c62828;" onclick="redeRevogarChave()"><i class="fas fa-ban"></i> Revogar</button></div>';
            h += '<div style="font-size:.72rem;color:#888;margin-top:6px;">Renovar ou revogar derruba o acesso de todos que usam a chave antiga. Quem tem a chave acessa os dados do sistema: envie só a pessoas de confiança.</div>';
        }
        h += '</div>';
    }

    // ---- endereços do servidor (modo cliente) ----
    if (tipo === 'cliente') {
        h += '<div class="card" style="background:#fff;"><div class="card-title"><i class="fas fa-route"></i> Endereços do servidor</div>';
        h += '<div style="font-size:.78rem;color:#666;margin-bottom:8px;">Ordem de preferência: Rede local › Hotspot › Cloudflare. O app usa o primeiro que realmente responde e troca sozinho se ele cair.</div>';
        h += '<div id="rede-lista"><p style="color:#888;">Testando...</p></div>';
        h += '<div class="field" style="margin-top:10px;"><label>Adicionar endereço (IP, IP:porta ou link https)</label><input type="text" id="rede-novo" placeholder="192.168.0.10  ou  https://xxxx.trycloudflare.com"></div>';
        h += '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
        h += '<button class="btn-primary" style="flex:1;" onclick="redeAdicionar()"><i class="fas fa-plus"></i> Adicionar</button>';
        h += '<button class="btn-outline" style="flex:1;" onclick="redeEscolherAgora()"><i class="fas fa-bolt"></i> Reconectar agora</button>';
        h += '</div></div>';
    }

    if (tipo === 'cliente') h += '<button class="btn-outline" style="width:100%;margin-bottom:12px;border-color:#C2185B;color:#C2185B;" onclick="trocarFuncaoAgora()"><i class="fas fa-id-badge"></i> Trocar função deste aparelho</button>';
    h += '<button class="btn-outline" style="width:100%;margin-bottom:12px;border-color:#C2185B;color:#C2185B;" onclick="navigateTo(\'tipo-dispositivo\')"><i class="fas fa-exchange-alt"></i> Voltar à seleção de modo (Único / Servidor / Cliente)</button>';
    h += '<div class="card" style="background:#fff;"><div class="card-title"><i class="fas fa-list"></i> Registro de conexão</div><pre style="font-size:.72rem;white-space:pre-wrap;max-height:180px;overflow:auto;margin:0;">' +
        _esc((cx.log || []).slice(-30).join('\n') || 'Sem eventos ainda.') + '</pre></div>';

    c.innerHTML = h;
    if (tipo === 'cliente') redeDesenharLista();
};

async function redeDesenharLista() {
    const box = document.getElementById('rede-lista');
    if (!box) return;
    const res = await window.CX.testarTodos();
    if (!res.length) { box.innerHTML = '<p style="color:#c62828;">Nenhum endereço cadastrado.</p>'; return; }
    box.innerHTML = res.map(function (e) {
        const ativo = e.url === window.CX.ativo;
        return '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px;margin-bottom:6px;border-radius:8px;background:' + (ativo ? '#e8f5e9' : '#fafafa') + ';border:1px solid ' + (ativo ? '#a5d6a7' : '#eee') + ';">' +
            '<div style="font-size:.85rem;word-break:break-all;"><b>' + _esc(e.url) + '</b><br><small style="color:#666;">' + _esc(window.CX.nomeTipo(e.tipo)) + ' · ' +
            (e.ok ? '<span style="color:#2e7d32;">✔ ' + e.ms + ' ms</span>' : '<span style="color:#c62828;">✖ ' + _esc(e.erro || 'sem resposta') + '</span>') + (ativo ? ' · <b>em uso</b>' : '') + '</small></div>' +
            '<button class="btn-outline" style="padding:4px 10px;border-color:#c62828;color:#c62828;" onclick="redeRemover(\'' + _esc(e.url) + '\')"><i class="fas fa-trash"></i></button></div>';
    }).join('');
}

window.redeAdicionar = async function () {
    const i = document.getElementById('rede-novo');
    if (!i || !i.value.trim()) return;
    await window.CX.adicionar(i.value);
    await window.CX.escolher('endereço novo');
    window.redeAtualizar();
};
window.redeRemover = async function (url) {
    if (!await window.confirmar('Remover este endereço?\n' + url)) return;
    await window.CX.remover(url);
    window.redeAtualizar();
};
window.redeEscolherAgora = async function () {
    await window.CX.escolher('pedido do usuário');
    window.redeAtualizar();
};

window.redeGerarChave = async function () {
    if (!await window.confirmar('Gerar uma nova chave? Links antigos deixam de funcionar.')) return;
    await fetch('/api/acesso-externo/gerar', { method: 'POST' });
    window.redeAtualizar();
};
window.redeRevogarChave = async function () {
    if (!await window.confirmar('Revogar o acesso externo dos colaboradores?')) return;
    await fetch('/api/acesso-externo/revogar', { method: 'POST' });
    window.redeAtualizar();
};
