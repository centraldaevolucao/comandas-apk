// ============================================================
// COMANDAS.JS — Lista e gestão de comandas (Apenas visualização)
// v28 — Botão voltar sempre leva ao PDV (não depende de rotaOrigem)
// ============================================================

console.log('✔ Comandas.js v28 carregado');

window.abaAtiva = 'abertas';
window.comandasCache = [];
window.termoBusca = "";
window.comandaOrigem = 'comandas';

function extrairArrayComandas(bruto) {
    if (Array.isArray(bruto)) return bruto;
    if (bruto && typeof bruto === 'object') {
        const chaves = Object.keys(bruto);
        if (chaves.length > 0 && chaves.every(function (k) { return /^\d+$/.test(k); })) {
            return chaves.sort(function (a, b) { return Number(a) - Number(b); }).map(function (k) { return bruto[k]; });
        }
    }
    return [];
}

window.renderComandas = function () {
    window.comandasCache = [];
    apiGet('comandas').then(function (dados) {
        window.comandasCache = extrairArrayComandas(dados);
        const grid = document.getElementById('comandas-grid');
        if (grid) grid.innerHTML = renderCards();
    }).catch(function (e) {
        const grid = document.getElementById('comandas-grid');
        if (grid) grid.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro ao carregar: ' + e.message + '</p>';
    });

    setTimeout(atualizarBadgePendentes, 100);

    return line(
        '<div class="app-bar">',
        // 🔙 BOTÃO VOLTAR → sempre vai para o PDV
        '    <button class="icon-btn" onclick="window.navigateTo(\'pdv\')" title="Voltar"><i class="fas fa-arrow-left"></i></button>',
        '    <h1>' + tituloAba() + '</h1>',
        '    <div style="display:flex;gap:2px;">',
        '        <button class="icon-btn" style="position:relative;" onclick="navigateTo(\'pedidos-pendentes\')" title="Pedidos pendentes">',
        '            <i class="fas fa-bell"></i>',
        '            <span id="badge-pendentes" style="position:absolute;top:2px;right:2px;background:#ff9800;color:#fff;border-radius:50%;font-size:0.6rem;width:18px;height:18px;display:none;align-items:center;justify-content:center;font-weight:bold;">0</span>',
        '        </button>',
        '        <button class="icon-btn" onclick="navigateTo(\'cozinha\')" title="Cozinha"><i class="fas fa-fire"></i></button>',
        '        <button class="icon-btn" onclick="navigateTo(\'relatorios\')"><i class="fas fa-chart-line"></i></button>',
        '    </div>',
        '</div>',
        '<div style="padding:8px 16px;background:#FCE4EC;border-bottom:1px solid #e0e0e0;">',
        '    <div style="font-size:0.8rem;color:#C2185B;">',
        '        <i class="fas fa-calendar-day"></i> Mostrando apenas comandas de <b>hoje</b>.',
        '    </div>',
        '</div>',
        '<div class="input-busca">',
        '    <input type="text" placeholder="Pesquisar por nome, número ou mesa" id="busca-comanda" oninput="filtrarComandas()" value="' + window.termoBusca + '">',
        '    <button class="btn-limpar" onclick="limparBusca()"><i class="fas fa-xmark"></i></button>',
        '</div>',
        '<div class="content-area" id="comandas-grid">',
        '    <p class="empty-state">🔄 Carregando...</p>',
        '</div>',
        renderBottomNav()
    );
};

function formatarMesaSimples(mesa) {
    if (!mesa) return '';
    if (mesa === 'balcao') return 'Balcão';
    if (mesa === 'delivery') return 'Delivery';
    if (mesa === 'viagem') return 'Para Viagem';
    return 'Mesa ' + mesa;
}

function tituloAba() {
    if (window.abaAtiva === 'abertas') return 'Abertas (hoje)';
    if (window.abaAtiva === 'delivery') return 'Delivery (hoje)';
    if (window.abaAtiva === 'fechadas') return 'Fechadas (hoje)';
    if (window.abaAtiva === 'canceladas') return 'Canceladas (hoje)';
    return 'Comandas';
}

function renderCards() {
    let lista = window.comandasCache.filter(function (c) {
        if (!window.isHoje(c.dataAbertura)) return false;
        const st = window.statusComandaNormalizado(c);
        if (window.abaAtiva === 'abertas') return st === 'aberta';
        if (window.abaAtiva === 'delivery') return st === 'delivery';
        if (window.abaAtiva === 'fechadas') return st === 'fechada';
        if (window.abaAtiva === 'canceladas') return st === 'cancelada';
        return false;
    });

    if (window.termoBusca) {
        const t = window.termoBusca.toLowerCase();
        lista = lista.filter(function (c) {
            return String(c.numero || '').toLowerCase().indexOf(t) >= 0 ||
                   String(c.mesa || '').toLowerCase().indexOf(t) >= 0 ||
                   String(c.cliente || '').toLowerCase().indexOf(t) >= 0 ||
                   String(c.garcom || '').toLowerCase().indexOf(t) >= 0;
        });
    }

    if (lista.length === 0) {
        return '<p class="empty-state">Sem comandas ' + tituloAba().toLowerCase() + '.<br><span style="font-size:0.8rem;color:#999;margin-top:10px;display:block;">Para criar uma nova, acesse o PDV.</span></p>';
    }

    return lista.map(function (c) {
        const consumo = c.total > 0 ? formatMoney(c.total) : 'Sem consumo';
        const bg = c.status === 'aberta' ? 'linear-gradient(135deg, #ffd4a3 0%, #ff8a65 100%)' :
                   c.status === 'fechada' ? 'linear-gradient(135deg, #c8e6c9 0%, #81c784 100%)' :
                   c.status === 'cancelada' ? 'linear-gradient(135deg, #ffcdd2 0%, #e57373 100%)' :
                   'linear-gradient(135deg, #bbdefb 0%, #64b5f6 100%)';

        const mesaTexto = formatarMesaSimples(c.mesa);
        const itensCount = (c.itens || []).length;
        const garcomCurto = c.garcom ? String(c.garcom).split(' ')[0] : '';

        const corHex = c.corGrupo ? ((window.CORES_CAIXA || []).find(function (x) { return x.id === c.corGrupo; }) || {}).hex : null;
        const badgeCor = corHex ? '<div style="position:absolute;top:6px;left:6px;width:10px;height:10px;border-radius:50%;background:' + corHex + ';border:2px solid #fff;"></div>' : '';

        const temClienteCadastrado = !!(c.clienteId && c.cliente);
        const nomeCliente = c.cliente ? String(c.cliente).trim() : '';
        const clienteCurto = nomeCliente.length > 12 ? nomeCliente.substring(0, 12) + '…' : nomeCliente;

        const clienteHTML = nomeCliente
            ? (temClienteCadastrado
                ? '<div class="card-comanda-status" style="font-size:0.62rem;font-weight:600;color:#880E4F;background:rgba(255,255,255,0.5);padding:2px 4px;border-radius:6px;margin-top:2px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + nomeCliente + '">👤 ' + clienteCurto + '</div>'
                : '<div class="card-comanda-status" style="font-size:0.6rem;opacity:0.85;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + nomeCliente + '">' + clienteCurto + '</div>')
            : '';

        return '<div class="card-comanda-wrapper">' +
               '    <div class="card-comanda" style="background:' + bg + ';position:relative;" onclick="abrirComanda(' + c.id + ')">' +
               badgeCor +
               '        <div class="card-comanda-header">' + (c.dataAbertura || '') + '</div>' +
               '        <div class="card-comanda-numero">' + c.numero + '</div>' +
               (mesaTexto ? '<div class="card-comanda-status" style="font-size:0.62rem;">' + mesaTexto + '</div>' : '') +
               clienteHTML +
               (garcomCurto ? '<div class="card-comanda-status" style="font-size:0.6rem;opacity:0.85;">👨‍🍳 ' + garcomCurto + '</div>' : '') +
               '        <div class="card-comanda-status" style="margin-top:2px;font-weight:700;">' + consumo + '</div>' +
               (itensCount > 0 ? '<div class="card-comanda-status" style="font-size:0.55rem;opacity:0.7;">' + itensCount + ' item(ns)</div>' : '') +
               '    </div>' +
               '    <button class="card-comanda-menu" onclick="event.stopPropagation(); abrirMenuCard(' + c.id + ')">' +
               '        <i class="fas fa-ellipsis-v"></i>' +
               '    </button>' +
               '</div>';
    }).join('');
}

window.abrirMenuCard = function (id) {
    const c = window.comandasCache.find(function (x) { return String(x.id) === String(id); });
    if (!c) return;

    const anterior = document.getElementById('modal-card-menu');
    if (anterior) anterior.remove();

    const st = window.statusComandaNormalizado(c);
    const estaAtiva = (st === 'aberta' || st === 'delivery');
    const podeReativar = (st === 'cancelada' || st === 'fechada');

    let opcoes = '';
    opcoes += '<div class="card-menu-item" onclick="fecharMenuCard(); abrirComanda(' + c.id + ')"><i class="fas fa-eye" style="color:var(--primary-color);"></i><span>Ver detalhes</span></div>';

    if (estaAtiva) {
        opcoes += '<div class="card-menu-item" onclick="fecharMenuCard(); cancelarComandaCard(' + c.id + ')"><i class="fas fa-ban" style="color:#c62828;"></i><span>Cancelar comanda</span></div>';
    }
    if (podeReativar) {
        opcoes += '<div class="card-menu-item" onclick="fecharMenuCard(); reativarComandaCard(' + c.id + ')"><i class="fas fa-undo" style="color:#2e7d32;"></i><span>Reativar</span></div>';
    }
    opcoes += '<div class="card-menu-item" onclick="fecharMenuCard(); excluirComandaCard(' + c.id + ')"><i class="fas fa-trash" style="color:#c62828;"></i><span style="color:#c62828;">Excluir</span></div>';

    const modal = document.createElement('div');
    modal.id = 'modal-card-menu';
    modal.className = 'modal-overlay';
    modal.style.zIndex = '99999';
    modal.onclick = function (e) { if (e.target === modal) fecharMenuCard(); };
    modal.innerHTML = '<div class="modal-content" style="max-width:340px;"><div class="modal-header"><strong>Comanda ' + c.numero + ' · ' + formatarMesaSimples(c.mesa) + '</strong><button class="btn-limpar" onclick="fecharMenuCard()"><i class="fas fa-xmark"></i></button></div><div style="padding:8px 0;">' + opcoes + '</div></div>';
    document.body.appendChild(modal);
};

window.fecharMenuCard = function () {
    const m = document.getElementById('modal-card-menu');
    if (m) m.remove();
};

window.cancelarComandaCard = async function (id) {
    const c = window.comandasCache.find(function (x) { return String(x.id) === String(id); });
    if (!c || !await window.confirmar('Cancelar a comanda ' + c.numero + '?')) return;
    const lista = window.normalizarArray(await apiGet('comandas'));
    const idx = lista.findIndex(function (x) { return String(x.id) === String(id); });
    if (idx >= 0) {
        lista[idx].status = 'cancelada';
        lista[idx].dataFechamento = new Date().toLocaleString('pt-BR');
    }
    await apiSave('comandas', lista);
    document.getElementById('app').innerHTML = renderComandas();
};

window.reativarComandaCard = async function (id) {
    const c = window.comandasCache.find(function (x) { return String(x.id) === String(id); });
    if (!c || !await window.confirmar('Reativar a comanda ' + c.numero + '?')) return;
    const lista = window.normalizarArray(await apiGet('comandas'));
    const conflitoMesa = lista.some(function (x) {
        if (String(x.id) === String(c.id)) return false;
        return window.comandaEstaAtiva(x) && String(x.mesa) === String(c.mesa);
    });
    if (conflitoMesa) { alert('Mesa ' + formatarMesaSimples(c.mesa) + ' já está ocupada.'); return; }
    const idx = lista.findIndex(function (x) { return String(x.id) === String(c.id); });
    if (idx >= 0) {
        lista[idx].status = 'aberta';
        delete lista[idx].pagamentos;
        delete lista[idx].troco;
        delete lista[idx].desconto;
        delete lista[idx].dataFechamento;
        delete lista[idx].pagamentoPendente;
        delete lista[idx].valorPendente;
    }
    await apiSave('comandas', lista);
    document.getElementById('app').innerHTML = renderComandas();
};

window.excluirComandaCard = async function (id) {
    const c = window.comandasCache.find(function (x) { return String(x.id) === String(id); });
    if (!c || !await window.confirmar('ATENÇÃO: Excluir a comanda ' + c.numero + ' definitivamente?')) return;
    const lista = window.normalizarArray(await apiGet('comandas'));
    const novaLista = lista.filter(function (x) { return String(x.id) !== String(id); });
    await apiSave('comandas', novaLista);
    document.getElementById('app').innerHTML = renderComandas();
};

async function atualizarBadgePendentes() {
    try {
        const pedidos = await apiGet('pedidosPendentes');
        const pendentes = window.normalizarArray(pedidos).filter(function (p) { return p.status === 'pendente'; });
        const badge = document.getElementById('badge-pendentes');
        if (badge) {
            if (pendentes.length > 0) {
                badge.textContent = pendentes.length;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (e) {}
}
window.atualizarBadgePendentes = atualizarBadgePendentes;
setInterval(function () {
    if (document.getElementById('badge-pendentes')) atualizarBadgePendentes();
}, 10000);

function renderBottomNav() {
    const abas = [
        { id: 'abertas',    label: 'Abertas',    icon: 'fa-file-pen' },
        { id: 'delivery',   label: 'Delivery',   icon: 'fa-motorcycle' },
        { id: 'fechadas',   label: 'Fechadas',   icon: 'fa-check' },
        { id: 'canceladas', label: 'Canceladas', icon: 'fa-circle-xmark' }
    ];
    const html = abas.map(function (aba) {
        const ativa = aba.id === window.abaAtiva ? 'active' : '';
        return '<button class="nav-item ' + ativa + '" onclick="mudarAba(\'' + aba.id + '\')"><i class="fas ' + aba.icon + '"></i><span>' + aba.label + '</span></button>';
    }).join('');
    return '<nav class="bottom-nav">' + html + '</nav>';
}

window.mudarAba = function (aba) {
    window.abaAtiva = aba;
    document.getElementById('app').innerHTML = renderComandas();
};

window.filtrarComandas = function () {
    window.termoBusca = document.getElementById('busca-comanda').value;
    document.getElementById('comandas-grid').innerHTML = renderCards();
};

window.limparBusca = function () {
    window.termoBusca = '';
    document.getElementById('busca-comanda').value = '';
    document.getElementById('comandas-grid').innerHTML = renderCards();
};

window.abrirComanda = function (id) {
    window.comandaIdAtual = id;
    window.comandaOrigem = 'comandas';
    window.rotaOrigem = 'comandas';
    navigateTo('detalhe-comanda');
};

function line() { return Array.prototype.slice.call(arguments).join("\n"); }