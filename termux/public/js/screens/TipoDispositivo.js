// ============================================================
// TIPODISPOSITIVO.JS — Modos e Conexão
// Compatível com /api/device e /api/info-servidor
// Porta padrão embutida no código (3000)
// ============================================================

console.log('✔ TipoDispositivo.js carregado');

// Porta padrão embutida — usada em todos os modos
window.PORTA_PADRAO = 3000;

window.renderTipodeDispositivo = function () {
    setTimeout(carregarTipoDispositivo, 50);
    return [
        '<div class="app-bar">',
        '    <button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button>',
        '    <h1>Modo de operação</h1>',
        '    <div style="width:40px;"></div>',
        '</div>',
        '<div class="content-area" id="disp-conteudo" style="padding:16px;">',
        '    <p class="empty-state">🔄 Carregando...</p>',
        '</div>'
    ].join('');
};

window.renderTipoDispositivo = window.renderTipodeDispositivo;

async function carregarTipoDispositivo() {
    const c = document.getElementById('disp-conteudo');
    if (!c) return;

    // Garante que o MT carregou
    if (typeof window.MT.carregar === 'function' && !window.MT._carregado) {
        await window.MT.carregar();
    }

    const mt = window.MT;
    const tipo = mt.tipoDispositivo || 'unico';
    const porta = window.PORTA_PADRAO;

    let html = '';

    // Estado atual
    html += '<div class="card" style="background:#FCE4EC;text-align:center;">';
    html += '    <div style="font-size:0.75rem;color:#888;">MODO ATUAL</div>';
    html += '    <div style="font-size:1.2rem;font-weight:700;color:var(--primary-color);margin-top:4px;">';
    html += '        ' + (tipo === 'unico' ? '📱 Único' : tipo === 'servidor' ? '🌐 Servidor' : '🔗 Cliente');
    html += '    </div>';
    html += '    <div style="font-size:0.8rem;color:#666;margin-top:4px;">' + (mt.descricao ? mt.descricao() : '') + '</div>';
    html += '</div>';

    // Seleção de modo
    html += '<div class="card" style="background:#fff;">';
    html += '    <div class="card-title">Escolha o modo</div>';

    html += '<label style="display:flex;align-items:flex-start;gap:10px;padding:12px 0;cursor:pointer;border-bottom:1px solid #eee;">';
    html += '    <input type="radio" name="mt-tipo" value="unico" ' + (tipo === 'unico' ? 'checked' : '') + ' onchange="mtTrocarModo(\'unico\')" style="width:20px;height:20px;accent-color:#C2185B;margin-top:3px;">';
    html += '    <div style="flex:1;">';
    html += '        <div style="font-weight:600;"><i class="fas fa-mobile-alt"></i> Dispositivo Único</div>';
    html += '        <div style="font-size:0.75rem;color:#666;margin-top:2px;">Tudo roda localmente. Uma base só. Ideal para um único PDV.</div>';
    html += '    </div>';
    html += '</label>';

    html += '<label style="display:flex;align-items:flex-start;gap:10px;padding:12px 0;cursor:pointer;border-bottom:1px solid #eee;">';
    html += '    <input type="radio" name="mt-tipo" value="servidor" ' + (tipo === 'servidor' ? 'checked' : '') + ' onchange="mtTrocarModo(\'servidor\')" style="width:20px;height:20px;accent-color:#C2185B;margin-top:3px;">';
    html += '    <div style="flex:1;">';
    html += '        <div style="font-weight:600;"><i class="fas fa-server"></i> Servidor</div>';
    html += '        <div style="font-size:0.75rem;color:#666;margin-top:2px;">Libera acesso para colaboradores e clientes (IP ou ID de acesso).</div>';
    html += '    </div>';
    html += '</label>';

    html += '<label style="display:flex;align-items:flex-start;gap:10px;padding:12px 0;cursor:pointer;">';
    html += '    <input type="radio" name="mt-tipo" value="cliente" ' + (tipo === 'cliente' ? 'checked' : '') + ' onchange="mtTrocarModo(\'cliente\')" style="width:20px;height:20px;accent-color:#C2185B;margin-top:3px;">';
    html += '    <div style="flex:1;">';
    html += '        <div style="font-weight:600;"><i class="fas fa-link"></i> Cliente</div>';
    html += '        <div style="font-size:0.75rem;color:#666;margin-top:2px;">Conecta em outro servidor. Precisa de um servidor ativo (IP ou ID).</div>';
    html += '    </div>';
    html += '</label>';
    html += '</div>';

    // Configuração cliente
    html += '<div id="mt-cfg-cliente" style="display:' + (tipo === 'cliente' ? 'block' : 'none') + ';">';
    html += '    <div class="card" style="background:#fff;">';
    html += '        <div class="card-title"><i class="fas fa-id-badge"></i> Função deste aparelho</div>';
    html += '        <div class="field" style="margin-bottom:6px;">';
    html += '            <select id="mt-funcao" onchange="mtTrocarFuncao(this.value)">';
    Object.keys(window.PERFIS || {}).forEach(function (k) {
        html += '                <option value="' + k + '"' + ((mt.funcaoDispositivo || 'garcom') === k ? ' selected' : '') + '>' + window.PERFIS[k].nome + '</option>';
    });
    html += '            </select>';
    html += '            <small id="mt-funcao-desc" style="display:block;margin-top:6px;color:#666;line-height:1.4;">' + descricaoFuncao(mt.funcaoDispositivo || 'garcom') + '</small>';
    html += '        </div>';
    html += '    </div>';
    html += '    <div class="card" style="background:#fff;">';
    html += '        <div class="card-title">Conectar ao servidor</div>';
    html += '        <div class="field">';
    html += '            <label>Modo de conexão</label>';
    html += '            <select id="mt-metodo" onchange="mtMudarMetodo()">';
    html += '                <option value="ip">🌐 Por IP (rede interna)</option>';
    html += '                <option value="id">🔑 Por ID de acesso (internet)</option>';
    html += '            </select>';
    html += '        </div>';

    // --- Conexão por IP (sem campo de porta) ---
    html += '        <div id="mt-campo-ip">';
    html += '            <div class="field"><label>IP do servidor</label><input type="text" id="mt-ip" placeholder="192.168.0.10" value="' + (mt.ipServidor || '') + '"></div>';
    html += '            <button class="btn-primary" style="width:100%;" onclick="mtConectarIP()"><i class="fas fa-plug"></i> Conectar via IP</button>';
    html += '        </div>';

    // --- Conexão por ID (IP/Link + ID de acesso) ---
    html += '        <div id="mt-campo-id" style="display:none;">';
    html += '            <div class="field"><label>IP ou Link do servidor</label><input type="text" id="mt-id-ip" placeholder="192.168.0.10 ou https://abc.trycloudflare.com" value="' + (mt.ipServidor || '') + '"></div>';
    html += '            <div class="field"><label>ID de acesso</label><input type="text" id="mt-id-acesso" placeholder="ABCD-1234 ou TEMP-XXXX" maxlength="20" style="text-transform:uppercase;" value="' + (mt.idAcesso || '') + '"></div>';
    html += '            <button class="btn-primary" style="width:100%;" onclick="mtConectarID()"><i class="fas fa-key"></i> Entrar com ID</button>';
    html += '        </div>';

    html += '        <div id="mt-status" style="margin-top:12px;padding:10px;border-radius:8px;font-size:0.85rem;display:none;"></div>';
    html += '    </div>';
    html += '</div>';

    // Servidor info
    html += '<div id="mt-cfg-servidor" style="display:' + (tipo === 'servidor' ? 'block' : 'none') + ';">';
    html += '    <div class="card" style="background:#e8f5e9;border-left:4px solid #4caf50;">';
    html += '        <div class="card-title" style="color:#2e7d32;"><i class="fas fa-globe"></i> Servidor ativo</div>';
    html += '        <div style="font-size:0.85rem;color:#555;line-height:1.6;">';
    html += '            <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px dashed #c8e6c9;">';
    html += '                <div><b>IP Interno:</b> <span id="mt-ip-servidor">—</span></div>';
    html += '            </div>';
    html += '            <div id="mt-linha-id" style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px dashed #c8e6c9;">';
    if (mt.isVisitante) {
        html += '                <div><b>Seu ID (Temporário):</b> <span id="mt-id-acesso-servidor" style="font-family:monospace;font-weight:700;color:#ff9800;font-size:1rem;">' + (mt.idAcesso || 'TEMP-XXXX') + '</span></div>';
    } else {
        html += '                <div><b>Seu ID (Vinculado):</b> <span id="mt-id-acesso-servidor" style="font-family:monospace;font-weight:700;color:#1565c0;font-size:1rem;">—</span></div>';
    }
    html += '            </div>';
    html += '            <div id="mt-linha-tunel" style="display:none;padding:6px 0;border-bottom:1px dashed #c8e6c9;">';
    html += '                <div><b>Link Externo (Internet):</b></div>';
    html += '                <div style="font-size:0.75rem;color:#1565c0;word-break:break-all;margin-top:4px;" id="mt-url-tunel">—</div>';
    html += '            </div>';
    html += '            <div style="margin-top:10px;padding:8px;background:#fff;border-radius:8px;font-size:0.78rem;line-height:1.6;">';
    html += '                <b>Endereços por função</b> (abra no navegador de outro aparelho no mesmo Wi-Fi):<br>';
    html += '                <code>http://<span class="mt-ip-link">IP</span>:' + porta + '/caixa</code><br>';
    html += '                <code>http://<span class="mt-ip-link">IP</span>:' + porta + '/cozinha</code><br>';
    html += '                <code>http://<span class="mt-ip-link">IP</span>:' + porta + '/garcom</code><br>';
    html += '                <code>http://<span class="mt-ip-link">IP</span>:' + porta + '/cardapio</code> (cardápio do dia)';
    html += '            </div>';
    html += '            <div style="margin-top:8px;font-size:0.75rem;color:#666;">Conecte usando o IP (rede interna, porta ' + porta + ') ou o Link Externo (internet).</div>';
    html += '            <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px;">';
    html += '                <button class="btn-outline" style="width:100%;border-color:#4caf50;color:#2e7d32;" onclick="mtCopiarLinkRede()"><i class="fas fa-wifi"></i> Copiar Link (Rede Interna)</button>';
    html += '                <button id="btn-copiar-tunel" class="btn-primary" style="width:100%;background:#1976d2;display:none;" onclick="mtCopiarLinkInternet()"><i class="fas fa-globe"></i> Copiar Link (Internet)</button>';
    html += '            </div>';
    html += '        </div>';
    html += '    </div>';
    html += '</div>';

    // Ações
    html += '<div style="margin-top:16px;display:flex;gap:8px;">';
    html += '    <button class="btn-outline" style="flex:1;" onclick="mtRecarregar()"><i class="fas fa-sync-alt"></i> Recarregar</button>';
    html += '    <button class="btn-outline" style="flex:1;border-color:#c62828;color:#c62828;" onclick="mtDesconectar()"><i class="fas fa-power-off"></i> Desconectar</button>';
    html += '</div>';

    c.innerHTML = html;
    obterIPServidor();
}

async function obterIPServidor() {
    const elIP = document.getElementById('mt-ip-servidor');
    const elID = document.getElementById('mt-id-acesso-servidor');
    const linhaTunel = document.getElementById('mt-linha-tunel');
    const elTunel = document.getElementById('mt-url-tunel');
    const btnTunel = document.getElementById('btn-copiar-tunel');

    if (!elIP) return;

    try {
        const base = (window.MT && window.MT.apiBase) ? window.MT.apiBase() : '';
        const path = (window.MT && window.MT.clienteId) ? ('/api/c/' + window.MT.clienteId + '/info-servidor') : '/api/info-servidor';
        const res = await fetch(base + path);
        const data = await res.json();

        if (data.ok) {
            // No app Android, o IP vem do próprio aparelho (certo também quando ele é o hotspot).
            let ipApp = '';
            try { if (window.AndroidApp && window.AndroidApp.ipLocal) ipApp = String(window.AndroidApp.ipLocal() || ''); } catch (e) {}
            elIP.textContent = (ipApp && ipApp !== '?') ? ipApp : (data.ip || location.hostname || 'localhost');
            document.querySelectorAll('.mt-ip-link').forEach(function (e) { e.textContent = elIP.textContent; });

            if (window.MT.isVisitante) {
                if (elID) elID.textContent = window.MT.idAcesso || 'TEMP-XXXX';
            } else if (data.idAcesso) {
                if (elID) elID.textContent = data.idAcesso;
            }

            if (data.urlTunel && linhaTunel && elTunel && btnTunel) {
                elTunel.textContent = data.urlTunel;
                linhaTunel.style.display = 'block';
                btnTunel.style.display = 'flex';
            }
        } else {
            elIP.textContent = location.hostname || 'localhost';
        }
    } catch (e) {
        elIP.textContent = location.hostname || 'localhost';
    }
}

// ============================================================
// Helpers de cópia de link (porta embutida)
// ============================================================
window.mtCopiarLinkRede = function () {
    const el = document.getElementById('mt-ip-servidor');
    if (!el) return;
    const ip = (el.textContent || '').trim();
    const url = 'http://' + ip + ':' + window.PORTA_PADRAO;
    window.copiarTexto(url, 'Link da Rede Interna copiado!');
};

window.mtCopiarLinkInternet = function () {
    const el = document.getElementById('mt-url-tunel');
    if (!el) return;
    const url = (el.textContent || '').trim();
    if (!url || url === '—') return;
    window.copiarTexto(url, 'Link da Internet copiado!');
};

window.copiarTexto = function (texto, mensagemSucesso) {
    try {
        navigator.clipboard.writeText(texto);
        if (typeof window.mostrarToast === 'function') window.mostrarToast('✅ ' + mensagemSucesso);
        else alert(mensagemSucesso);
    } catch (e) {
        const el = document.createElement('textarea');
        el.value = texto;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        if (typeof window.mostrarToast === 'function') window.mostrarToast('✅ ' + mensagemSucesso);
        else alert(mensagemSucesso);
    }
};

// ============================================================
// Troca de modo
// ============================================================
window.mtTrocarModo = async function (tipo) {
    const atual = window.MT.tipoDispositivo || 'unico';
    const nomes = { unico: 'Dispositivo Único', servidor: 'Servidor', cliente: 'Cliente' };
    if (tipo === atual) return;
    const aviso = {
        unico: 'Este aparelho passa a funcionar sozinho, com o banco local.',
        servidor: 'Este aparelho passa a atender outros aparelhos da rede. Mantenha o Wi-Fi/Hotspot ligado.',
        cliente: 'Este aparelho passa a usar os dados de outro servidor. Informe o endereço do servidor em seguida.'
    }[tipo];
    if (!await window.confirmar('Trocar o modo de "' + nomes[atual] + '" para "' + nomes[tipo] + '"?\n\n' + aviso + '\n\nOs dados deste aparelho NÃO são apagados. O app será reiniciado.')) {
        const r = document.querySelector('input[name="mt-tipo"][value="' + atual + '"]');
        if (r) r.checked = true;       // cancelou: volta a seleção
        return;
    }
    if (tipo === 'cliente') {
        const escolhida = await new Promise(function (ok) { window.perguntarFuncao(window.MT.funcaoDispositivo || 'garcom', ok); });
        if (!escolhida) { const r = document.querySelector('input[name="mt-tipo"][value="' + atual + '"]'); if (r) r.checked = true; return; }
        window.MT.funcaoDispositivo = escolhida;
    }
    window.MT.tipoDispositivo = tipo;
    if (tipo !== 'cliente') window.MT.funcaoDispositivo = '';
    await window.MT.salvar();
    // confere o que ficou gravado de verdade antes de reiniciar
    let gravado = '';
    try { gravado = (await fetch('/api/device', { cache: 'no-store' }).then(function (r) { return r.json(); })).tipoDispositivo; } catch (e) {}
    if (gravado !== tipo) { mostrarStatus('❌ Não foi possível gravar o modo (leitura voltou "' + gravado + '"). Nada foi alterado.', 'error'); return; }
    mostrarStatus('✅ Modo ' + nomes[tipo] + ' gravado. Reiniciando...', 'success');
    // No app Android, o servidor só aceita outros aparelhos se escutar em 0.0.0.0: liga em Único e Servidor (QR do cardápio precisa), desliga só no Cliente.
    if (window.AndroidApp && window.AndroidApp.definirRede && window.AndroidApp.reiniciarApp) {
        try {
            window.AndroidApp.definirRede(tipo !== 'cliente');
            setTimeout(function () { window.AndroidApp.reiniciarApp(); }, 900);
            return;
        } catch (e) { console.warn('reiniciarApp falhou', e); }
    }
    setTimeout(function () { window.location.hash = '#tipo-dispositivo'; window.location.reload(); }, 900);
};

window.mtMudarMetodo = function () {
    const metodo = document.getElementById('mt-metodo').value;
    document.getElementById('mt-campo-ip').style.display = metodo === 'ip' ? 'block' : 'none';
    document.getElementById('mt-campo-id').style.display = metodo === 'id' ? 'block' : 'none';
};

// ============================================================
// Conectar via IP — porta fixa embutida
// ============================================================
window.mtConectarIP = async function () {
    let ip = (document.getElementById('mt-ip').value || '').trim();

    // Sanitiza: remove http://, https://, barras e porta digitada
    ip = ip.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/:\d+$/, '').trim();

    if (!ip) {
        mostrarStatus('Informe o IP do servidor', 'error');
        return;
    }

    mostrarStatus('🔄 Conectando em ' + ip + ':' + window.PORTA_PADRAO + '...', 'info');

    const r = await window.MT.conectarViaIP(ip, window.PORTA_PADRAO);
    if (r.ok) {
        if (window.CX) await window.CX.adicionar(ip);
        mostrarStatus('✅ Conectado! Recarregando...', 'success');
        setTimeout(function () { window.location.reload(); }, 800);
    } else {
        mostrarStatus('❌ ' + (r.msg || 'Falha na conexão'), 'error');
    }
};

// ============================================================
// Conectar via ID — porta embutida (443 para links https)
// ============================================================
window.mtConectarID = async function () {
    let host = (document.getElementById('mt-id-ip').value || '').trim();
    const idAcesso = (document.getElementById('mt-id-acesso').value || '').trim().toUpperCase();

    if (!host) {
        mostrarStatus('Informe o IP/Link do servidor', 'error');
        return;
    }
    if (!idAcesso) {
        mostrarStatus('Informe o ID de acesso', 'error');
        return;
    }

    // Se for link https (túnel cloudflare), usa 443; senão porta padrão embutida
    let porta = window.PORTA_PADRAO;
    if (/^https:\/\//i.test(host)) {
        porta = 443;
    } else {
        // Sanitiza IP puro
        host = host.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/:\d+$/, '').trim();
    }

    mostrarStatus('🔄 Buscando ID ' + idAcesso + '...', 'info');

    const r = await window.MT.conectarViaId(idAcesso, host, porta);
    if (r.ok) {
        if (window.CX) await window.CX.adicionar(host);
        mostrarStatus('✅ Conectado! Recarregando...', 'success');
        setTimeout(function () { window.location.reload(); }, 1000);
    } else {
        mostrarStatus('❌ ' + (r.msg || 'ID não encontrado'), 'error');
    }
};

window.mtRecarregar = function () { window.location.reload(); };

window.mtDesconectar = async function () {
    if (!await window.confirmar('Desconectar e voltar ao modo local?')) return;
    await window.MT.desconectar();
    window.location.reload();
};

function mostrarStatus(msg, tipo) {
    const el = document.getElementById('mt-status');
    if (!el) return;
    el.style.display = 'block';
    const cores = {
        success: { bg: '#e8f5e9', color: '#2e7d32' },
        error: { bg: '#ffebee', color: '#c62828' },
        info: { bg: '#e3f2fd', color: '#1565c0' }
    };
    const cor = cores[tipo] || cores.info;
    el.style.background = cor.bg;
    el.style.color = cor.color;
    el.textContent = msg;
}

console.log('✔ TipoDispositivo.js pronto (porta padrão: ' + window.PORTA_PADRAO + ')');

// ============================================================
// Função do aparelho (modo cliente)
// ============================================================
function descricaoFuncao(k) {
    return ({
        garcom:   'Vê só o PDV: abre e atende comandas.',
        cozinha:  'Vê só a Cozinha.',
        caixa:    'Vê o Caixa e o PDV (abrir/fechar caixa, receber).',
        cardapio: 'Vê só o Cardápio do Dia (marcar o que acabou), sem menu.'
    })[k] || '';
}

window.mtTrocarFuncao = async function (funcao) {
    window.MT.funcaoDispositivo = funcao;
    const d = document.getElementById('mt-funcao-desc');
    if (d) d.textContent = descricaoFuncao(funcao);
    await window.MT.salvar();
    mostrarStatus('✅ Função: ' + (window.PERFIS[funcao] ? window.PERFIS[funcao].nome : funcao) + '. Volte ao início para ver o menu desta função.', 'success');
};
