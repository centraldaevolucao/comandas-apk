// ============================================================
// PDV.JS — v39 (Filtros corrigidos e completos)
// ============================================================

console.log('✔ PDV.js v39 carregado');

window.pdvState = {
    comandas: [],
    filtroStatus: 'aberta', // O padrão será 'aberta' (singular)
    termoBusca: '',
    timer: null,
    caixaAberto: false
};

function extrairArrayPDV(bruto) {
    if (Array.isArray(bruto)) return bruto;
    if (bruto && typeof bruto === 'object') {
        const chaves = Object.keys(bruto);
        if (chaves.length > 0 && chaves.every(k => /^\d+$/.test(k))) {
            return chaves.sort((a, b) => Number(a) - Number(b)).map(k => bruto[k]);
        }
    }
    return [];
}

function comandaTemItensFaltando(c) {
    if (!c || !Array.isArray(c.itens)) return false;
    return c.itens.some(i => i.statusProducao === 'faltou');
}

function calcularTotalRealComanda(c) {
    if (!c) return 0;
    const itens = window.normalizarArray(c.itens);
    let total = 0;
    itens.forEach(i => {
        if (i.statusProducao !== 'faltou') total += Number(i.preco) * Number(i.quantidade);
    });
    return total;
}

// ============================================================
// RENDER PRINCIPAL
// ============================================================
window.renderPDV = function() {
    setTimeout(carregarPDV, 50);

    if (window.pdvState.timer) clearInterval(window.pdvState.timer);
    window.pdvState.timer = setInterval(function() {
        if (document.getElementById('pdv-conteudo')) carregarPDV();
    }, 5000);

    return [
        '<div class="app-bar">',
        '    <button class="icon-btn" onclick="navigateTo(\'home\')"><i class="fas fa-home"></i></button>',
        '    <h1>PDV</h1>',
        '    <div style="display:flex;gap:2px;">',
        '        <button class="icon-btn" style="position:relative;" onclick="navigateTo(\'pedidos-pendentes\')" title="Pedidos pendentes">',
        '            <i class="fas fa-bell"></i>',
        '            <span id="pdv-badge-pendentes" style="position:absolute;top:2px;right:2px;background:#ff9800;color:#fff;border-radius:50%;font-size:0.6rem;width:18px;height:18px;display:none;align-items:center;justify-content:center;font-weight:bold;">0</span>',
        '        </button>',
        '        <button class="icon-btn" onclick="carregarPDV()" title="Atualizar"><i class="fas fa-sync-alt"></i></button>',
        '        <button class="icon-btn" onclick="abrirMenu()"><i class="fas fa-bars"></i></button>',
        '    </div>',
        '</div>',
        '<div class="input-busca">',
        '    <input type="text" placeholder="Pesquisar comanda, cliente ou mesa" id="pdv-busca" oninput="filtrarComandasPDV()" value="' + (window.pdvState.termoBusca || '') + '">',
        '    <button class="btn-limpar" onclick="limparBuscaPDV()"><i class="fas fa-xmark"></i></button>',
        '</div>',
        '<div class="content-area" id="pdv-conteudo" style="padding:12px;">',
        '    <p class="empty-state">🔄 Carregando...</p>',
        '</div>',
        '<button class="fab" onclick="abrirModalNovaComandaPDV()" title="Nova comanda"><i class="fas fa-plus"></i></button>'
    ].join('\n');
};

// ============================================================
// CARREGAMENTO E FILTRO
// ============================================================
async function carregarPDV() {
    const container = document.getElementById('pdv-conteudo');
    if (!container) return;

    try {
        try {
            const caixaBruto = await apiGet('caixaAtual');
            const cx = Array.isArray(caixaBruto) ? caixaBruto[0] : caixaBruto;
            window.pdvState.caixaAberto = !!(cx && cx.status === 'aberto');
        } catch (e) { window.pdvState.caixaAberto = false; }

        const comandasBrutas = await apiGet('comandas');
        const todas = extrairArrayPDV(comandasBrutas);

        // Só aparecem as comandas do caixa aberto agora: nada de dias anteriores nem de outro caixa/cor.
        const caixaAtual = await window.obterCaixaAbertoAtual();
        window.pdvState.caixaAtualId = caixaAtual ? caixaAtual.id : null;
        window.pdvState.caixaCor = caixaAtual ? caixaAtual.cor : '';
        window.pdvState.comandas = caixaAtual ? todas.filter(c => window.comandaDoCaixaAtual(c, caixaAtual)) : [];

        atualizarBadgesPDV();
        renderizarListaAtual();
        atualizarBadgePendentesPDV();
    } catch (e) {
        console.error('❌ Erro ao carregar PDV:', e);
        container.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro ao carregar comandas.</p>';
    }
}
window.carregarPDV = carregarPDV;

function atualizarBadgesPDV() {
    const comandas = window.pdvState.comandas;
    const contarPorStatus = (status) => {
        return comandas.filter(c => {
            if (status === 'todas') return true;
            if (status === 'pendentes') return c.pagamentoPendente === true && Number(c.valorPendente || 0) > 0;
            return window.statusComandaNormalizado(c) === status && !(c.pagamentoPendente === true && Number(c.valorPendente || 0) > 0);
        }).length;
    };

    const elTodas = document.getElementById('badge-pdv-todas');
    const elAbertas = document.getElementById('badge-pdv-abertas');
    const elPendentes = document.getElementById('badge-pdv-pendentes');
    const elFechadas = document.getElementById('badge-pdv-fechadas');
    const elCanceladas = document.getElementById('badge-pdv-canceladas');

    if (elTodas) elTodas.textContent = comandas.length;
    if (elAbertas) elAbertas.textContent = contarPorStatus('aberta');
    if (elPendentes) elPendentes.textContent = contarPorStatus('pendentes');
    if (elFechadas) elFechadas.textContent = contarPorStatus('fechada');
    if (elCanceladas) elCanceladas.textContent = contarPorStatus('cancelada');
}

async function atualizarBadgePendentesPDV() {
    try {
        const pedidos = await apiGet('pedidosPendentes');
        const pendentes = window.normalizarArray(pedidos).filter(p => p.status === 'pendente').length;
        const badge = document.getElementById('pdv-badge-pendentes');
        if (badge) {
            if (pendentes > 0) { badge.textContent = pendentes; badge.style.display = 'flex'; }
            else { badge.style.display = 'none'; }
        }
    } catch (e) {}
}

// 🔥 FUNÇÃO GLOBAL PARA RECEBER O CLIQUE DO BOTÃO
window.mudarFiltroPDV = function(filtro) {
    // Converte o nome que vem da tela (plural) para o status do banco (singular)
    let novoFiltro = String(filtro).toLowerCase();
    if (novoFiltro === 'abertas') novoFiltro = 'aberta';
    if (novoFiltro === 'fechadas') novoFiltro = 'fechada';
    if (novoFiltro === 'canceladas') novoFiltro = 'cancelada';
    
    window.pdvState.filtroStatus = novoFiltro;

    // Atualiza os botões visuais
    const menu = document.getElementById('menu-abas-pdv');
    if (menu) {
        menu.querySelectorAll('button').forEach(btn => {
            btn.classList.remove('ativo');
            if (btn.getAttribute('onclick').includes(filtro)) btn.classList.add('ativo');
        });
    }

    // Força a renderização
    renderizarListaAtual();
};

function renderizarListaAtual() {
    const container = document.getElementById('pdv-conteudo');
    if (!container) return;
    if (!window.pdvState.caixaAberto) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-lock" style="font-size:2.2rem;color:#c62828;"></i>' +
            '<p style="margin:12px 0;">Caixa fechado. Abra o caixa para ver e criar comandas.</p>' +
            '<button class="btn-primary" style="max-width:260px;" onclick="navigateTo(\'caixa\')">Ir para o Caixa</button></div>';
        return;
    }
    const corG = window.pdvState.caixaCor ? (window.CORES_CAIXA || []).find(x => x.id === window.pdvState.caixaCor) : null;
    const faixa = corG ? '<div style="display:flex;align-items:center;gap:8px;background:' + corG.hex + ';color:#fff;border-radius:10px;padding:7px 12px;margin-bottom:10px;font-weight:700;font-size:0.85rem;"><i class="fas fa-users"></i> ' + (corG.label || corG.id) + '</div>' : '';
    container.innerHTML = faixa + renderListaComandasPDV();
}

function renderListaComandasPDV() {
    let lista = window.pdvState.comandas.slice();
    const filtro = window.pdvState.filtroStatus;
    const busca = String(window.pdvState.termoBusca || '').trim().toLowerCase();

    // Filtra
    if (filtro !== 'todas') {
        if (filtro === 'pendentes') {
            lista = lista.filter(c => c.pagamentoPendente === true && Number(c.valorPendente || 0) > 0);
        } else {
            lista = lista.filter(c => 
                window.statusComandaNormalizado(c) === filtro && 
                !(c.pagamentoPendente === true && Number(c.valorPendente || 0) > 0)
            );
        }
    }

    if (busca !== '') {
        lista = lista.filter(c => 
            String(c.numero || '').toLowerCase().includes(busca) ||
            String(c.mesa || '').toLowerCase().includes(busca) ||
            String(c.cliente || '').toLowerCase().includes(busca) ||
            String(c.garcom || '').toLowerCase().includes(busca)
        );
    }

    const ordem = { 'aberta': 1, 'delivery': 2, 'fechada': 3, 'cancelada': 4 };
    lista.sort((a, b) => {
        const pa = (a.pagamentoPendente === true) ? 0 : 1;
        const pb = (b.pagamentoPendente === true) ? 0 : 1;
        if (pa !== pb) return pa - pb;
        const oa = ordem[window.statusComandaNormalizado(a)] || 9;
        const ob = ordem[window.statusComandaNormalizado(b)] || 9;
        if (oa !== ob) return oa - ob;
        return String(a.numero || '').localeCompare(String(b.numero || ''), 'pt-BR', { numeric: true });
    });

    if (lista.length === 0) {
        return '<p class="empty-state" style="padding:20px;">Nenhuma comanda encontrada nesta aba.</p>';
    }

    return '<div class="pdv-cards-grid">' + lista.map(renderCardComandaPDV).join('') + '</div>';
}

function renderCardComandaPDV(c) {
    const st = window.statusComandaNormalizado(c);
    const pendente = c.pagamentoPendente === true && Number(c.valorPendente || 0) > 0;
    const temFaltando = comandaTemItensFaltando(c);
    const totalReal = calcularTotalRealComanda(c);

    let bg;
    if (pendente) bg = 'linear-gradient(135deg, #fff59d 0%, #fdd835 100%)';
    else if (temFaltando) bg = 'linear-gradient(135deg, #ffcdd2 0%, #e57373 100%)';
    else if (st === 'aberta' || st === 'delivery') bg = 'linear-gradient(135deg, #c8e6c9 0%, #81c784 100%)';
    else if (st === 'fechada') bg = 'linear-gradient(135deg, #ffcdd2 0%, #e57373 100%)';
    else if (st === 'cancelada') bg = 'linear-gradient(135deg, #e0e0e0 0%, #9e9e9e 100%)';
    else bg = 'linear-gradient(135deg, #bbdefb 0%, #64b5f6 100%)';

    const qtdItens = window.normalizarArray(c.itens).length;
    const garcomCurto = c.garcom ? String(c.garcom).split(' ')[0] : '';
    const corBadge = c.corGrupo ? (window.CORES_CAIXA || []).find(x => x.id === c.corGrupo) : null;

    const badgeCor = corBadge ? '<div style="position:absolute;top:6px;left:6px;width:10px;height:10px;border-radius:50%;background:' + corBadge.hex + ';border:2px solid #fff;"></div>' : '';
    const badgePendente = pendente ? '<div style="position:absolute;top:6px;right:6px;background:#e65100;color:#fff;font-size:0.6rem;font-weight:700;padding:2px 6px;border-radius:8px;">FIADO</div>' : '';
    const badgeFaltando = temFaltando ? '<div style="position:absolute;top:6px;right:6px;background:#c62828;color:#fff;font-size:0.6rem;font-weight:700;padding:2px 6px;border-radius:8px;"><i class="fas fa-exclamation-triangle"></i> FALTOU</div>' : '';

    const temClienteCadastrado = !!(c.clienteId && c.cliente);
    const nomeCliente = c.cliente ? String(c.cliente).trim() : '';
    const clienteCurto = nomeCliente.length > 12 ? nomeCliente.substring(0, 12) + '…' : nomeCliente;
    const clienteHTML = nomeCliente ? '<div class="card-comanda-status" style="font-size:0.62rem;font-weight:600;color:#880E4F;background:rgba(255,255,255,0.5);padding:2px 4px;border-radius:6px;margin-top:2px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + nomeCliente + '">👤 ' + clienteCurto + '</div>' : '';

    const totalHTML = temFaltando
        ? '<div class="card-comanda-status" style="margin-top:2px;font-weight:700;text-decoration:line-through;color:#888;font-size:0.65rem;">' + formatMoney(c.total) + '</div><div class="card-comanda-status" style="font-size:0.85rem;font-weight:700;color:#2e7d32;">' + formatMoney(totalReal) + '</div>'
        : '<div class="card-comanda-status" style="margin-top:2px;font-weight:700;">' + formatMoney(totalReal) + '</div>';

    return '<div class="card-comanda-wrapper">' +
           '    <div class="card-comanda" style="background:' + bg + ';" onclick="abrirComandaPDV(' + c.id + ')">' +
           badgeCor + (pendente ? badgePendente : (temFaltando ? badgeFaltando : '')) +
           '        <div class="card-comanda-header">' + (c.dataAbertura || '') + '</div>' +
           '        <div class="card-comanda-numero">' + c.numero + '</div>' +
           (corBadge ? '<div style="display:inline-block;background:' + corBadge.hex + ';color:#fff;font-size:0.58rem;font-weight:700;padding:1px 7px;border-radius:8px;margin-top:1px;max-width:92%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (corBadge.label || corBadge.id) + '</div>' : '') +
           '        <div class="card-comanda-status" style="font-size:0.62rem;">' + (c.mesa || '—') + '</div>' +
           clienteHTML +
           (garcomCurto ? '<div class="card-comanda-status" style="font-size:0.6rem;opacity:0.85;">👨‍🍳 ' + garcomCurto + '</div>' : '') +
           totalHTML +
           (pendente ? '<div class="card-comanda-status" style="font-size:0.6rem;color:#e65100;font-weight:700;">Pendente: ' + formatMoney(c.valorPendente || 0) + '</div>' : '') +
           (qtdItens > 0 ? '<div class="card-comanda-status" style="font-size:0.55rem;opacity:0.7;">' + qtdItens + ' item(ns)</div>' : '') +
           '    </div>' +
           '    <button class="card-comanda-menu" onclick="event.stopPropagation(); abrirMenuCardPDV(' + c.id + ')">' +
           '        <i class="fas fa-ellipsis-v"></i>' +
           '    </button>' +
           '</div>';
}

window.abrirComandaPDV = function(id, acao) {
    window.comandaIdAtual = id; window.comandaOrigem = 'pdv'; window.rotaOrigem = 'pdv';
    window.acaoPosComanda = acao || null;
    navigateTo('detalhe-comanda');
};

window.abrirMenuCardPDV = function(id) {
    const c = window.pdvState.comandas.find(x => String(x.id) === String(id));
    if (!c) return;

    const anterior = document.getElementById('modal-card-menu-pdv');
    if (anterior) anterior.remove();

    const st = window.statusComandaNormalizado(c);
    const estaAtiva = (st === 'aberta' || st === 'delivery');
    const pendente = c.pagamentoPendente === true && Number(c.valorPendente || 0) > 0;
    const podeReativar = (st === 'cancelada' || st === 'fechada');

    let opcoes = '';
    opcoes += '<div class="card-menu-item" onclick="fecharMenuCardPDV(); abrirComandaPDV(' + c.id + ')"><i class="fas fa-eye" style="color:var(--primary-color);"></i><span>Ver detalhes</span></div>';
    if (pendente) opcoes += '<div class="card-menu-item" onclick="fecharMenuCardPDV(); abrirComandaPDV(' + c.id + ', \'fechar\')"><i class="fas fa-money-bill-wave" style="color:#2e7d32;"></i><span>Receber Fiado</span></div>' +
        '<div class="card-menu-item" onclick="fecharMenuCardPDV(); reabrirPendenciaPDV(' + c.id + ')"><i class="fas fa-lock-open" style="color:#6a1b9a;"></i><span>Reabrir no caixa atual</span></div>';
    if (estaAtiva) {
        opcoes += '<div class="card-menu-item" onclick="fecharMenuCardPDV(); abrirComandaPDV(' + c.id + ', \'fechar\')"><i class="fas fa-check-circle" style="color:#2e7d32;"></i><span>Fechar comanda</span></div>';
        opcoes += '<div class="card-menu-item" onclick="fecharMenuCardPDV(); cancelarComandaPDV(' + c.id + ')"><i class="fas fa-ban" style="color:#c62828;"></i><span>Cancelar comanda</span></div>';
    }
    if (podeReativar) opcoes += '<div class="card-menu-item" onclick="fecharMenuCardPDV(); reativarComandaPDV(' + c.id + ')"><i class="fas fa-redo" style="color:#2e7d32;"></i><span>Reativar</span></div>';
    opcoes += '<div class="card-menu-item" onclick="fecharMenuCardPDV(); excluirComandaPDV(' + c.id + ')"><i class="fas fa-trash" style="color:#c62828;"></i><span style="color:#c62828;">Excluir</span></div>';

    const modal = document.createElement('div');
    modal.id = 'modal-card-menu-pdv'; modal.className = 'modal-overlay'; modal.style.zIndex = '99999';
    modal.onclick = e => { if (e.target === modal) fecharMenuCardPDV(); };
    modal.innerHTML =
        '<div class="modal-content" style="max-width:340px;">' +
        '    <div class="modal-header"><strong>Comanda ' + c.numero + ' · ' + (c.mesa || '—') + '</strong><button class="btn-limpar" onclick="fecharMenuCardPDV()"><i class="fas fa-xmark"></i></button></div>' +
        '    <div style="padding:8px 0;">' + opcoes + '</div></div>';
    document.body.appendChild(modal);
};

window.fecharMenuCardPDV = function() { const m = document.getElementById('modal-card-menu-pdv'); if (m) m.remove(); };
window.cancelarComandaPDV = async function(id) {
    const c = window.pdvState.comandas.find(x => String(x.id) === String(id));
    if (!c || !await window.confirmar('Cancelar a comanda ' + c.numero + '?')) return;
    const lista = window.normalizarArray(await apiGet('comandas'));
    const idx = lista.findIndex(x => String(x.id) === String(id));
    if (idx >= 0) { lista[idx].status = 'cancelada'; lista[idx].dataFechamento = new Date().toLocaleString('pt-BR'); }
    await apiSave('comandas', lista); carregarPDV();
};
window.reabrirPendenciaPDV = async function(id) { if (await window.reabrirPendencia(id)) carregarPDV(); };
window.reativarComandaPDV = async function(id) {
    const c = window.pdvState.comandas.find(x => String(x.id) === String(id));
    if (!c || !await window.confirmar('Reativar a comanda ' + c.numero + '?')) return;
    const lista = window.normalizarArray(await apiGet('comandas'));
    const conflitoMesa = lista.some(x => String(x.id) !== String(c.id) && window.comandaEstaAtiva(x) && String(x.mesa) === String(c.mesa));
    if (conflitoMesa) { alert('Mesa já está ocupada.'); return; }
    const idx = lista.findIndex(x => String(x.id) === String(c.id));
    if (idx >= 0) {
        lista[idx].status = 'aberta';
        delete lista[idx].pagamentos; delete lista[idx].troco; delete lista[idx].desconto;
        delete lista[idx].dataFechamento; delete lista[idx].pagamentoPendente; delete lista[idx].valorPendente;
    }
    await apiSave('comandas', lista); carregarPDV();
};
window.excluirComandaPDV = async function(id) {
    const c = window.pdvState.comandas.find(x => String(x.id) === String(id));
    if (!c || !await window.confirmar('Excluir a comanda ' + c.numero + '?')) return;
    const lista = window.normalizarArray(await apiGet('comandas'));
    await apiSave('comandas', lista.filter(x => String(x.id) !== String(id))); carregarPDV();
};

window.filtrarComandasPDV = function() {
    window.pdvState.termoBusca = (document.getElementById('pdv-busca') || {}).value || '';
    renderizarListaAtual();
};
window.limparBuscaPDV = function() {
    window.pdvState.termoBusca = '';
    const input = document.getElementById('pdv-busca'); if (input) input.value = '';
    renderizarListaAtual();
};

// ============================================================
// MODAL NOVA COMANDA
// ============================================================
window.abrirModalNovaComandaPDV = async function() {
    const caixaAgora = await window.obterCaixaAbertoAtual();
    window.pdvState.caixaAberto = !!caixaAgora;
    if (!caixaAgora) {
        if (document.body.classList.contains('modo-garcom')) { alert('O caixa está fechado. Peça para abrirem o caixa.'); return; }
        if (await window.confirmar('O caixa está fechado. Deseja abrir o caixa agora?')) navigateTo('caixa');
        return;
    }

    const mesas = window.normalizarArray(await apiGet('mesas'));
    const colaboradores = window.normalizarArray(await apiGet('colaboradores'));
    const comandas = window.normalizarArray(await apiGet('comandas'));
    const mesasOcupadas = comandas.filter(c => window.comandaEstaAtiva(c)).map(c => String(c.mesa));

    let opcoesMesas = '<option value="">-- Sem mesa (Balcão) --</option>';
    const az = (a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR', { sensitivity: 'base', numeric: true });
    mesas.filter(m => m.ativa !== false).sort(az).forEach(m => {
        const ocupada = mesasOcupadas.includes(String(m.numero));
        opcoesMesas += '<option value="' + m.numero + '" ' + (ocupada ? 'disabled' : '') + '>' + m.nome + (ocupada ? ' (OCUPADA)' : '') + '</option>';
    });

    let opcoesColabs = '<option value="">-- Sem garçom --</option>';
    colaboradores.slice().sort(az).forEach(c => { opcoesColabs += '<option value="' + c.nome + '">' + c.nome + '</option>'; });

    const proximoNumero = await window.sugerirNumeroComanda();

    const anterior = document.getElementById('modal-nova-comanda-pdv');
    if (anterior) anterior.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-nova-comanda-pdv'; modal.className = 'modal-overlay'; modal.style.zIndex = '99999';
    modal.onclick = e => { if (e.target === modal) fecharModalNovaComandaPDV(); };

    modal.innerHTML =
        '<div class="modal-content" style="max-width:420px;">' +
        '    <div class="modal-header" style="background:#2e7d32;color:#fff;">' +
        '        <strong>Nova Comanda</strong>' +
        '        <button class="btn-limpar" onclick="fecharModalNovaComandaPDV()" style="color:#fff;"><i class="fas fa-xmark"></i></button>' +
        '    </div>' +
        '    <div class="modal-body">' +
        '        <div class="field"><label>Número da comanda</label><input type="text" id="nc-pdv-numero" value="' + proximoNumero + '" maxlength="10"></div>' +
        '        <div class="field"><label>Mesa / Local</label><select id="nc-pdv-mesa">' + opcoesMesas + '</select></div>' +
        '        <div class="field"><label style="display:flex;justify-content:space-between;align-items:center;"><span>Cliente (opcional)</span><button type="button" class="btn-limpar" onclick="novoClienteNaComanda(\'nc-pdv-cliente\')" style="font-size:0.75rem;color:var(--primary-color);font-weight:600;text-decoration:underline;"><i class="fas fa-plus"></i> Novo</button></label><input type="text" id="nc-pdv-cliente" maxlength="40" placeholder="Selecione ou digite o nome"></div>' +
        '        <div class="field"><label>Garçom / Colaborador</label><select id="nc-pdv-colaborador">' + opcoesColabs + '</select></div>' +
        '        <button class="btn-primary" style="background:#2e7d32;" onclick="salvarNovaComandaPDV()"><i class="fas fa-check"></i> Criar Comanda</button>' +
        '        <button class="btn-outline" style="width:100%;margin-top:10px;" onclick="fecharModalNovaComandaPDV()">Cancelar</button>' +
        '    </div>' +
        '</div>';
    document.body.appendChild(modal);
    if (window.clientePicker) window.clientePicker.anexar(document.getElementById('nc-pdv-cliente'), { limparAoDigitar: true });
    setTimeout(() => { const el = document.getElementById('nc-pdv-numero'); if (el) { el.focus(); el.select(); } }, 150);
};

window.fecharModalNovaComandaPDV = function() { const m = document.getElementById('modal-nova-comanda-pdv'); if (m) m.remove(); };

window.salvarNovaComandaPDV = async function() {
    const numero = (document.getElementById('nc-pdv-numero').value || '').trim();
    const mesa = document.getElementById('nc-pdv-mesa').value || '';
    const cliEl = document.getElementById('nc-pdv-cliente');
    const cliente = (cliEl.value || '').trim();
    const clienteId = cliente && cliEl.dataset.clienteId ? cliEl.dataset.clienteId : null;
    const garcom = (document.getElementById('nc-pdv-colaborador').value || '').trim();

    if (!numero) { alert('Informe o número'); return; }

    try {
        const comandas = window.normalizarArray(await apiGet('comandas'));
        const caixaBruto = await apiGet('caixaAtual');
        const caixa = Array.isArray(caixaBruto) ? caixaBruto[0] : caixaBruto;

        if (comandas.some(c => String(c.numero) === numero && window.comandaEstaAtiva(c))) { alert('Já existe comanda ativa com esse número'); return; }
        if (mesa && comandas.some(c => String(c.mesa) === String(mesa) && window.comandaEstaAtiva(c))) { alert('Essa mesa já está ocupada'); return; }

        const agora = new Date();
        const data = agora.toLocaleDateString('pt-BR') + ' ' + String(agora.getHours()).padStart(2, '0') + ':' + String(agora.getMinutes()).padStart(2, '0');

        const nova = {
            id: Date.now(), numero: numero, mesa: mesa || 'balcao', dataAbertura: data,
            cliente: cliente, clienteId: clienteId, clienteTelefone: clienteId ? cliEl.dataset.telefone || '' : '', clienteCpf: clienteId ? cliEl.dataset.cpf || '' : '', garcom: garcom, status: 'aberta', tipo: 'mesa', itens: [], total: 0,
            caixaId: caixa ? caixa.id : null, corGrupo: caixa ? caixa.cor : ''
        };

        comandas.push(nova);
        await apiSave('comandas', comandas);
        await window.registrarNumeroComanda(numero);

        fecharModalNovaComandaPDV();
        window.comandaIdAtual = nova.id;
        window.comandaOrigem = 'pdv'; window.rotaOrigem = 'pdv';
        navigateTo('detalhe-comanda');
    } catch (e) { alert('Erro ao criar comanda: ' + e.message); }
};