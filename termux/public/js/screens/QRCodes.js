// ============================================================
// QRCODES.JS — v4 (Ativos no topo + Card visual)
// ============================================================

console.log('✔ QRCodes.js v4 carregado');

window.qrCodesState = {
    mesas: [],
    selecionadas: {} // { mesaId: true/false }
};

window.renderQRCodes = function() {
    setTimeout(carregarQRCodes, 50);

    return [
        '<div class="app-bar">',
        '    <button class="icon-btn" onclick="navigateTo(\'comandas\')"><i class="fas fa-arrow-left"></i></button>',
        '    <h1>QR Codes das Mesas</h1>',
        '    <button class="icon-btn" onclick="salvarMesasQRCodes()" title="Salvar"><i class="fas fa-save"></i></button>',
        '</div>',

        '<div style="padding:12px 16px;background:#e3f2fd;border-bottom:1px solid #bbdefb;">',
        '    <div style="font-size:0.85rem;color:#1565c0;line-height:1.5;">',
        '        <i class="fas fa-info-circle"></i>',
        '        Marque as mesas que terão QR Code ativo. As mesas ativas aparecem <b>no topo</b>.',
        '    </div>',
        '</div>',

        '<div class="content-area" style="padding:12px;">',
        '<div id="qr-link-externo"></div>',
        '<div id="qrcodes-lista">',
        '    <p class="empty-state">🔄 Carregando...</p>',
        '</div>',
        '</div>'
    ].join('\n');
};

// ============================================================
// CARREGA
// ============================================================
async function carregarQRCodes() {
    const lista = document.getElementById('qrcodes-lista');
    if (!lista) return;
    atualizarCardLinkExterno();

    try {
        const mesas = window.normalizarArray(await apiGet('mesas'));
        window.qrCodesState.mesas = mesas;

        let config = {};
        try {
            const cfgArr = window.normalizarArray(await apiGet('configuracoes'));
            config = cfgArr[0] || {};
        } catch (e) {}

        const mesasAtivas = config.mesasQRAativas || {};

        window.qrCodesState.selecionadas = {};
        mesas.forEach(m => {
            window.qrCodesState.selecionadas[m.id] = mesasAtivas[m.id] === true;
        });

        lista.innerHTML = renderListaQRCodes();
    } catch (e) {
        console.error('Erro ao carregar QR Codes:', e);
        lista.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro ao carregar mesas.</p>';
    }
}

window.carregarQRCodes = carregarQRCodes;

// ============================================================
// RENDER
// ============================================================
function renderListaQRCodes() {
    const mesas = window.qrCodesState.mesas.slice();
    const selecionadas = window.qrCodesState.selecionadas;

    if (mesas.length === 0) {
        return '<p class="empty-state">Nenhuma mesa cadastrada.</p>';
    }

    // 🔥 ORDENAÇÃO: Ativos primeiro, depois inativos. Dentro do grupo, por número.
    mesas.sort((a, b) => {
        const ativaA = selecionadas[a.id] === true ? 1 : 0;
        const ativaB = selecionadas[b.id] === true ? 1 : 0;
        if (ativaA !== ativaB) return ativaB - ativaA; // Ativos primeiro
        return String(a.numero).localeCompare(String(b.numero));
    });

    let html = '';

    // Contador
    const totalAtivas = Object.values(selecionadas).filter(v => v === true).length;
    html += '<div style="padding:8px 12px;background:#f5f5f5;border-radius:8px;margin-bottom:12px;font-size:0.85rem;color:#666;display:flex;justify-content:space-between;">';
    html += '    <span><b>' + totalAtivas + '</b> de ' + mesas.length + ' mesas ativas</span>';
    html += '    <span>Toque no QR para imprimir</span>';
    html += '</div>';

    html += '<div class="qrcodes-grid">';

    mesas.forEach(m => {
        const ativa = selecionadas[m.id] === true;
        
        const urlBase = (window.urlBaseRede ? window.urlBaseRede() : window.location.origin);
        const url = urlBase + '/mesa/' + m.numero;
        const qrUrl = window.qrUrl(url, '200x200');

        const cardStyle = ativa 
            ? 'border-color:#4caf50; background:#fff; box-shadow:0 4px 12px rgba(76,175,80,0.15);' 
            : 'border-color:#ddd; background:#f9f9f9; opacity:0.6; filter:grayscale(100%);';

        html += '<div class="qrcode-card" style="' + cardStyle + '">';
        
        html += '    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">';
        html += '        <div style="font-weight:700;font-size:1.1rem;color:' + (ativa ? '#2e7d32' : '#666') + ';">';
        html += '            ' + m.nome;
        html += '            <div style="font-size:0.7rem;font-weight:400;color:#888;margin-top:2px;">Número: ' + m.numero + '</div>';
        html += '        </div>';
        html += '        <label class="toggle">';
        html += '            <input type="checkbox" ' + (ativa ? 'checked' : '') + ' onchange="toggleMesaQRCode(\'' + m.id + '\')">';
        html += '            <span class="slider"></span>';
        html += '        </label>';
        html += '    </div>';

        html += '    <div style="text-align:center; background:#fff; border-radius:8px; padding:10px; margin-bottom:10px; border:1px solid #eee;">';
        html += '        <img src="' + qrUrl + '" style="width:100%; max-width:150px; display:block; margin:0 auto; ' + (ativa ? '' : 'opacity:0.4;') + '">';
        html += '    </div>';

        html += '    <div class="qrcode-acoes" style="display:flex; flex-direction:column; gap:6px;">';
        
        if (ativa) {
            html += '        <button class="btn-primary" style="background:#1976d2; font-size:0.8rem; padding:8px;" onclick="imprimirQRCodeMesa(\'' + m.id + '\')">';
            html += '            <i class="fas fa-print"></i> Imprimir';
            html += '        </button>';
        } else {
            html += '        <button class="btn-primary" style="background:#ccc; font-size:0.8rem; padding:8px; cursor:not-allowed;" disabled>';
            html += '            <i class="fas fa-print"></i> Inativa';
            html += '        </button>';
        }

        if (ativa) {
            html += '        <button class="btn-outline" style="font-size:0.8rem; padding:8px;" onclick="testarQRCodeMesa(\'' + m.id + '\')">';
            html += '            <i class="fas fa-external-link-alt"></i> Testar Link';
            html += '        </button>';
        } else {
            html += '        <button class="btn-outline" style="font-size:0.8rem; padding:8px; border-color:#ccc; color:#ccc; cursor:not-allowed;" disabled>';
            html += '            <i class="fas fa-external-link-alt"></i> Testar Link';
            html += '        </button>';
        }

        html += '    </div>';
        html += '</div>';
    });

    html += '</div>';

    html += '<button class="btn-primary" style="margin-top:20px; background:#4caf50; padding:16px;" onclick="salvarMesasQRCodes()">';
    html += '    <i class="fas fa-save"></i> Salvar Alterações';
    html += '</button>';

    return html;
}

// ============================================================
// AÇÕES
// ============================================================
window.toggleMesaQRCode = function(mesaId) {
    window.qrCodesState.selecionadas[mesaId] = !window.qrCodesState.selecionadas[mesaId];
    const lista = document.getElementById('qrcodes-lista');
    if (lista) lista.innerHTML = renderListaQRCodes();
    
    salvarMesasQRCodes(true); 
};

window.testarQRCodeMesa = function(mesaId) {
    const mesa = window.qrCodesState.mesas.find(m => String(m.id) === String(mesaId));
    if (!mesa) return;

    const url = (window.urlBaseRede ? window.urlBaseRede() : window.location.origin) + '/mesa/' + mesa.numero;
    window.open(url, '_blank');
};

window.imprimirQRCodeMesa = function(mesaId) {
    const mesa = window.qrCodesState.mesas.find(m => String(m.id) === String(mesaId));
    if (!mesa) return;

    const url = (window.urlBaseRede ? window.urlBaseRede() : window.location.origin) + '/mesa/' + mesa.numero;
    const qrUrl = window.qrUrl(url, '400x400');

    const janela = window.open('', '', 'width=600,height=800');
    janela.document.write(
        '<html><head><title>QR Code - ' + mesa.nome + '</title>' +
        '<style>' +
        'body{font-family:sans-serif;text-align:center;padding:30px;}' +
        'h1{font-size:22px;margin-bottom:5px;color:#333;}' +
        'h2{font-size:14px;color:#666;margin-bottom:20px;font-weight:normal;}' +
        'img{width:300px;height:300px;margin:10px 0;}' +
        'p{font-size:12px;color:#999;word-break:break-all;}' +
        '.footer{margin-top:30px;font-size:10px;color:#ccc;}' +
        '</style></head><body>' +
        '<h1>' + mesa.nome + '</h1>' +
        '<h2>Aponte a câmera do celular para fazer seu pedido</h2>' +
        '<img src="' + qrUrl + '">' +
        '<p>' + url + '</p>' +
        '<div class="footer">Sistema App Restaurante</div>' +
        '<script>window.onload=function(){setTimeout(function(){window.print();},500);}</script>' +
        '</body></html>'
    );
    janela.document.close();
};

// ============================================================
// SALVAR
// ============================================================
window.salvarMesasQRCodes = async function(silencioso) {
    try {
        let config = {};
        try {
            const cfgArr = window.normalizarArray(await apiGet('configuracoes'));
            config = cfgArr[0] || {};
        } catch (e) {}

        config.mesasQRAativas = window.qrCodesState.selecionadas;
        config.ultimaAtualizacao = new Date().toLocaleString('pt-BR');

        await apiSave('configuracoes', [config]);

        if (!silencioso) {
            if (typeof window.mostrarToast === 'function') {
                window.mostrarToast('✅ QR Codes salvos');
            } else {
                alert('✅ QR Codes salvos');
            }
        }
    } catch (e) {
        alert('Erro ao salvar: ' + e.message);
    }
};


// ============================================================
// LINK EXTERNO TEMPORÁRIO (Cloudflare) — para clientes fora do Wi-Fi do local
// ============================================================
function escHtml(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

window.statusTunel = function () {
    try {
        if (window.AndroidApp && window.AndroidApp.statusTunel) return JSON.parse(window.AndroidApp.statusTunel());
    } catch (e) {}
    return null;
};

async function descobrirUrlTunel() {
    const st = window.statusTunel();
    if (st) return st;
    try {
        const d = await fetch('/api/info-servidor').then(r => r.json());
        if (d && d.urlTunel) return { estado: 'ativo', url: d.urlTunel };
    } catch (e) {}
    return { estado: 'parado', url: '' };
}

async function atualizarCardLinkExterno() {
    const box = document.getElementById('qr-link-externo');
    if (!box) return;
    const st = await descobrirUrlTunel();
    const noApp = !!(window.AndroidApp && window.AndroidApp.iniciarTunel);
    if (st.estado === 'ativo' && st.url) window.__urlExterna = st.url;
    else if (st.estado !== 'iniciando') window.__urlExterna = window.__urlExternaManual || '';
    const base = window.urlBaseRede ? window.urlBaseRede() : location.origin;
    const rede = window.__redeAberta === false;

    let h = '<div style="background:#fff;border:1px solid #e0e0e0;border-radius:12px;padding:14px;margin-bottom:14px;">';
    h += '<div style="font-weight:700;margin-bottom:6px;"><i class="fas fa-link" style="color:#C2185B;"></i> Endereço usado nos QR Codes</div>';
    h += '<div style="font-size:0.8rem;word-break:break-all;background:#f5f5f5;border-radius:8px;padding:8px;margin-bottom:10px;">' + escHtml(base) + '</div>';

    if (st.estado === 'ativo' && st.url) {
        h += '<div style="font-size:0.8rem;color:#2e7d32;margin-bottom:8px;"><i class="fas fa-circle-check"></i> Link externo temporário ativo. Ele deixa de valer quando você parar ou fechar o app.</div>';
        h += '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
        h += '<button class="btn-outline" style="flex:1 1 120px;" onclick="copiarLinkExterno()"><i class="fas fa-copy"></i> Copiar</button>';
        if (noApp) h += '<button class="btn-danger" style="flex:1 1 120px;" onclick="pararLinkExterno()"><i class="fas fa-stop"></i> Parar link</button>';
        h += '</div>';
    } else if (st.estado === 'iniciando') {
        h += '<div style="font-size:0.85rem;color:#e65100;"><i class="fas fa-spinner fa-spin"></i> Criando o link externo... aguarde alguns segundos.</div>';
    } else {
        if (st.estado === 'erro') h += '<div style="font-size:0.8rem;color:#c62828;margin-bottom:8px;">' + escHtml(st.msg || 'Não foi possível criar o link.') + '</div>';
        if (noApp) {
            h += '<button class="btn-primary" onclick="gerarLinkExterno()"><i class="fas fa-globe"></i> Gerar link externo temporário</button>';
            h += '<div style="font-size:0.72rem;color:#777;margin-top:8px;line-height:1.4;">Usa a Cloudflare (precisa de internet). Pelo link externo o cliente só consegue ver o cardápio e enviar pedidos; o resto do sistema fica bloqueado.</div>';
        } else {
            h += '<div style="font-size:0.78rem;color:#555;line-height:1.5;margin-bottom:8px;">No computador, rode <b>cloudflared tunnel --url http://localhost:3000</b>, copie o endereço <i>https://….trycloudflare.com</i> e cole abaixo:</div>';
            h += '<div style="display:flex;gap:8px;"><input id="qr-url-manual" type="url" placeholder="https://exemplo.trycloudflare.com" style="flex:1;padding:10px;border:1.5px solid #ccc;border-radius:8px;">';
            h += '<button class="btn-primary" style="width:auto;padding:0 18px;" onclick="usarLinkExternoManual()">Usar</button></div>';
        }
    }
    if (rede && noApp) h += '<div style="font-size:0.75rem;color:#c62828;margin-top:8px;">Atenção: o servidor está só neste aparelho. Para QR Codes no Wi-Fi, ative "Permitir outros aparelhos na rede" (botão Voltar na tela inicial).</div>';
    h += '</div>';
    box.innerHTML = h;
    const lista = document.getElementById('qrcodes-lista');
    if (lista && window.qrCodesState.mesas.length) lista.innerHTML = renderListaQRCodes();
    if (st.estado === 'iniciando') setTimeout(atualizarCardLinkExterno, 1500);
}
window.atualizarCardLinkExterno = atualizarCardLinkExterno;

window.gerarLinkExterno = function () {
    try { window.AndroidApp.iniciarTunel(); } catch (e) { alert('Não foi possível iniciar: ' + e.message); return; }
    setTimeout(atualizarCardLinkExterno, 400);
};
window.pararLinkExterno = async function () {
    if (!await window.confirmar('Parar o link externo? Os QR Codes impressos com ele deixam de funcionar.')) return;
    try { window.AndroidApp.pararTunel(); } catch (e) {}
    window.__urlExterna = '';
    setTimeout(atualizarCardLinkExterno, 400);
};
window.copiarLinkExterno = async function () {
    const u = window.__urlExterna || '';
    try { await navigator.clipboard.writeText(u); window.mostrarToast && window.mostrarToast('Link copiado'); }
    catch (e) { await window.perguntar('Copie o link:', u); }
};
window.usarLinkExternoManual = function () {
    const v = ((document.getElementById('qr-url-manual') || {}).value || '').trim().replace(/\/+$/, '');
    if (!/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(:\d+)?$/i.test(v)) { alert('Informe o endereço completo, começando com https://'); return; }
    window.__urlExternaManual = v; window.__urlExterna = v;
    atualizarCardLinkExterno();
};

console.log('✔ QRCodes.js v4 — Pronto');