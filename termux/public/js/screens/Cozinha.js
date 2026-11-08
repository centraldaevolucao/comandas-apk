// ============================================================
// COZINHA.JS — v37 (Card de pedido expansível)
// ============================================================

console.log('✔ Cozinha.js v37 carregado');

window.cozinhaState = {
    comandas: [],
    produtos: [],
    cardapioDiaProdutos: [],
    filtroStatus: 'pendentes',
    filtroLocal: 'todos',
    termoBusca: ''
};

// ============================================================
// RENDER PRINCIPAL
// ============================================================
window.renderCozinha = function() {
    window.cozinhaState.filtroStatus = 'pendentes';
    if (window.atualizarVisualAbasCozinha) window.atualizarVisualAbasCozinha('pendentes');

    setTimeout(carregarCozinha, 50);
    setTimeout(carregarListaCardapioLateral, 150);

    return `
        <style>
            /* A tela inteira vive dentro de .content-area (que rola). No computador e no tablet deitado
               são duas colunas com rolagem própria; no celular/tablet em pé, uma coluna só rolando junto. */
            .cozinha-tela { display:flex; flex-direction:column; padding-bottom:0 !important; overflow:hidden !important; }
            .cozinha-container {
                display: flex; flex: 1 1 auto; min-height: 0; width: 100%; overflow: hidden;
            }
            .cozinha-col-esquerda {
                width: 320px; min-width: 300px; max-width: 35%;
                background: #f9f9f9; border-right: 2px solid #eee;
                display: flex; flex-direction: column; overflow-y: auto;
                -webkit-overflow-scrolling: touch; overscroll-behavior: contain; touch-action: pan-y;
            }
            .cozinha-col-direita {
                flex: 1; padding: 16px; overflow-y: auto; min-width: 0;
                -webkit-overflow-scrolling: touch; overscroll-behavior: contain; touch-action: pan-y;
                padding-bottom: calc(40px + env(safe-area-inset-bottom, 0px));
            }
            @media (max-width: 900px) {
                .cozinha-tela { display:block; overflow-y:auto !important; padding-bottom: calc(40px + env(safe-area-inset-bottom, 0px)) !important; }
                .cozinha-container { flex-direction: column; overflow: visible; }
                /* no celular o cardápio do dia fica na gaveta (botão "Cardápio"), não ocupa a tela */
                .cozinha-col-esquerda { display: none; }
                .cozinha-col-direita { overflow: visible; padding: 12px; }
            }
        </style>

        <div class="app-bar">
            <button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button>
            <h1>Cozinha</h1>
            <div style="display:flex;gap:2px;">
                <button class="icon-btn" onclick="atualizarCozinha()" title="Atualizar"><i class="fas fa-sync-alt"></i></button>
                <button class="icon-btn" onclick="abrirModalFecharCozinha()" title="Fechar cozinha"><i class="fas fa-door-closed"></i></button>
            </div>
        </div>

        <div class="content-area cozinha-tela">
        <div style="padding:8px 16px;background:#C2185B;color:#fff;text-align:center;font-size:0.8rem;box-shadow: 0 2px 4px rgba(0,0,0,0.1);flex-shrink:0;">
            <i class="fas fa-calendar-day"></i> Mostrando apenas comandas de <b>hoje</b>
        </div>

        <div class="cozinha-container">
            <div class="cozinha-col-esquerda">
                <div style="padding:12px; background:#fff; border-bottom:1px solid #eee; display:flex; align-items:center; gap:8px; position:sticky; top:0; z-index:10;">
                    <i class="fas fa-utensils" style="color:#C2185B;"></i>
                    <span style="font-weight:bold; color:#333;">Cardápio de Hoje</span>
                </div>
                <div style="padding:8px; font-size:0.75rem; color:#666; text-align:center; background:#fff3e0;">
                    Desative o que <b>acabou</b>.
                </div>
                <div id="cozinha-lista-produtos" style="flex:1; overflow-y:auto; padding:10px;">
                    <p style="text-align:center; color:#999;">🔄 Buscando produtos...</p>
                </div>
            </div>

            <div class="cozinha-col-direita" id="cozinha-lista">
                <p class="empty-state">🔄 Carregando comandas...</p>
            </div>
        </div>
        </div>
    `;
};

// ============================================================
// CONTROLE DA LISTA DE PRODUTOS (COLUNA ESQUERDA)
// ============================================================
async function carregarListaCardapioLateral() {
    const container = document.getElementById('cozinha-lista-produtos');
    if (!container) return;

    try {
        const produtosBrutos = await apiGet('produtos');
        const produtos = window.normalizarArray(produtosBrutos);

        let configCardapioDia = await apiGet('cardapioDia');
        let selecionados = {};
        
        if (Array.isArray(configCardapioDia) && configCardapioDia.length > 0) selecionados = configCardapioDia[0].selecionados || {};
        else if (configCardapioDia && typeof configCardapioDia === 'object') selecionados = configCardapioDia.selecionados || {};

        const produtosDoDia = produtos.filter(p => {
            if (p.inativo === true) return false;
            if (selecionados[p.id] === true) return true;
            return false;
        });

        if (produtosDoDia.length === 0) {
            container.innerHTML = '<div style="padding:20px; text-align:center; color:#888;"><i class="fas fa-box-open" style="font-size:2rem; margin-bottom:10px; opacity:0.5;"></i><p style="font-size:0.85rem;">Nenhum produto ativo no cardápio hoje.</p></div>';
            return;
        }

        produtosDoDia.sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')));

        let html = '';
        produtosDoDia.forEach(p => {
            const acabou = p.acabouCozinha === true;
            const bg = acabou ? '#ffebee' : '#fff';
            const cor = acabou ? '#c62828' : '#333';
            const badge = acabou ? '<span style="background:#c62828;color:#fff;font-size:0.6rem;padding:2px 6px;border-radius:6px;margin-left:6px;font-weight:bold;">ACABOU</span>' : '';

            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:${bg}; border-radius:8px; border:1px solid #eee; margin-bottom:8px;">
                    <div style="flex:1; min-width:0; padding-right:10px;">
                        <div style="font-weight:600; font-size:0.85rem; color:${cor}; text-decoration:${acabou ? 'line-through' : 'none'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                            ${p.nome}${badge}
                        </div>
                    </div>
                    <label class="toggle" style="margin:0; flex-shrink:0;">
                        <input type="checkbox" ${!acabou ? 'checked' : ''} onchange="toggleAcabouProduto(${p.id})">
                        <span class="slider"></span>
                    </label>
                </div>
            `;
        });

        container.innerHTML = html;
    } catch (e) {
        console.error('❌ Erro na lista lateral:', e);
        container.innerHTML = `<p style="color:#c62828; padding:20px;">Erro ao buscar.</p>`;
    }
}

window.toggleAcabouProduto = async function(produtoId) {
    // Só a Cozinha marca que um item acabou (não garçom, nem cardápio de cliente por QR)
    const mt = window.MT || {};
    if (document.body.classList.contains('cliente-qrcode') || mt.isVisitante || mt.funcaoDispositivo === 'garcom') {
        if (window.mostrarToast) window.mostrarToast('Somente a Cozinha pode marcar item como esgotado.');
        return;
    }
    try {
        const produtos = window.normalizarArray(await apiGet('produtos'));
        const idx = produtos.findIndex(p => String(p.id) === String(produtoId));
        if (idx < 0) return;

        produtos[idx].acabouCozinha = !produtos[idx].acabouCozinha;
        await apiSave('produtos', produtos);
        
        if (typeof window.mostrarToast === 'function') {
            window.mostrarToast(produtos[idx].acabouCozinha ? '❌ Item marcado como ACABOU' : '✅ Item disponível novamente');
        }
        carregarListaCardapioLateral();
        atualizarCozinha();
    } catch (e) { alert('Erro ao alterar: ' + e.message); }
};

// ============================================================
// CONTROLE DA LISTA DE COMANDAS (CARD EXPANSÍVEL)
// ============================================================
window.cozinhaCardsAbertos = {};

window.toggleCardCozinha = function(comandaId) {
    window.cozinhaCardsAbertos[comandaId] = !window.cozinhaCardsAbertos[comandaId];
    atualizarCozinha();
};

async function carregarCozinha() { await atualizarCozinha(); }

window.atualizarCozinha = async function() {
    const lista = document.getElementById('cozinha-lista');
    if (!lista) return;

    try {
        const comandasBrutas = await apiGet('comandas');
        const todas = window.normalizarArray(comandasBrutas);
        const produtosBrutos = await apiGet('produtos');
        window.cozinhaState.produtos = window.normalizarArray(produtosBrutos);

        // Com caixa aberto: só as comandas dele (nada de dias anteriores nem de outra cor). Sem caixa: as de hoje.
        const caixaAtual = await window.obterCaixaAbertoAtual();
        window.cozinhaState.comandas = todas.filter(function(c) {
            if (caixaAtual ? !window.comandaDoCaixaAtual(c, caixaAtual) : !window.isHoje(c.dataAbertura)) return false;
            if (window.comandaEstaAtiva(c)) return window.normalizarArray(c.itens).length > 0;
            return window.statusComandaNormalizado(c) === 'cancelada';
        });

        lista.innerHTML = renderListaCozinha();
        if (window.atualizarBadgesCozinha) window.atualizarBadgesCozinha();
    } catch (e) {
        console.error('Erro ao carregar:', e);
        lista.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro ao carregar cozinha.</p>';
    }
};

function obterStatusComanda(c) {
    if (window.statusComandaNormalizado(c) === 'cancelada') return 'cancelados';
    const itens = window.normalizarArray(c.itens);
    if (itens.length === 0) return 'pendentes';

    let temPendente = false, temPreparando = false, temServido = false, temFaltou = false;
    itens.forEach(i => {
        const st = i.statusProducao || 'pendente';
        if (st === 'pendente') temPendente = true;
        else if (st === 'preparando') temPreparando = true;
        else if (st === 'servido') temServido = true;
        else if (st === 'faltou') temFaltou = true;
    });

    if (temFaltou) return 'pendentes';
    if (temPendente) return 'pendentes';
    if (temPreparando) return 'preparando';
    if (temServido) return 'atendidos';
    return 'pendentes';
}

window.atualizarBadgesCozinha = function() {
    const cont = { pendentes: 0, preparando: 0, atendidos: 0, cancelados: 0 };
    (window.cozinhaState.comandas || []).forEach(function(c) {
        const st = obterStatusComanda(c);
        if (cont[st] !== undefined) cont[st]++;
    });
    Object.keys(cont).forEach(function(k) {
        const el = document.getElementById('badge-cozinha-' + k);
        if (el) el.textContent = cont[k];
    });
};

window.atualizarVisualAbasCozinha = function(filtro) {
    const menu = document.getElementById('menu-abas-cozinha');
    if (!menu) return;
    menu.querySelectorAll('button').forEach(function(btn) {
        btn.classList.toggle('ativo', btn.classList.contains('btn-' + filtro));
    });
};

window.ROTULOS_FILTRO_COZINHA = { pendentes: 'Pendentes', preparando: 'Preparando', atendidos: 'Atendidos', cancelados: 'Cancelados' };

window.mudarFiltroCozinha = function(filtro) {
    window.cozinhaState.filtroStatus = filtro;
    window.atualizarVisualAbasCozinha(filtro);
    atualizarCozinha();
};

function renderListaCozinha() {
    let comandas = window.cozinhaState.comandas.slice();
    const filtroStatus = window.cozinhaState.filtroStatus;
    const busca = String(window.cozinhaState.termoBusca || '').trim().toLowerCase();

    const resultado = [];
    
    comandas.forEach(function(c) {
        if (obterStatusComanda(c) !== filtroStatus) return;
        let itensFiltrados = window.normalizarArray(c.itens).slice();
        if (busca !== '') itensFiltrados = itensFiltrados.filter(i => String(i.nome || '').toLowerCase().includes(busca));
        if (itensFiltrados.length > 0) resultado.push({ comanda: c, itens: itensFiltrados });
    });

    const rotulo = (window.ROTULOS_FILTRO_COZINHA || {})[filtroStatus] || filtroStatus;
    const titulo = '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 12px;padding:8px 12px;background:#fff;border-radius:10px;border:1px solid #f0d0dc;">' +
        '<span style="font-weight:700;color:#C2185B;"><i class="fas fa-filter"></i> Filtro: ' + rotulo + '</span>' +
        '<span style="font-size:0.85rem;color:#666;">' + resultado.length + ' comanda(s)</span></div>';
    if (resultado.length === 0) return titulo + '<p class="empty-state" style="margin-top:40px;">Nenhuma comanda nesta aba.</p>';
    return titulo + resultado.map(renderCardCozinha).join('');
}

function renderCardCozinha(entry) {
    const c = entry.comanda;
    const isCancelada = window.statusComandaNormalizado(c) === 'cancelada';
    const aberto = window.cozinhaCardsAbertos[c.id] === true;

    const itensCompletos = window.normalizarArray(c.itens);
    const totalItens = itensCompletos.reduce((s, i) => s + Number(i.quantidade), 0);
    
    // Resumo para o card fechado
    const itensResumo = itensCompletos.slice(0, 2).map(i => `${i.quantidade}x ${i.nome}`).join(', ') + (itensCompletos.length > 2 ? '...' : '');

    // Conteúdo do card aberto (lista detalhada)
    const itensHTML = itensCompletos.map(function(item) {
        const idx = itensCompletos.indexOf(item);
        const st = item.statusProducao || 'pendente';

        const produtoBanco = window.cozinhaState.produtos.find(p => String(p.id) === String(item.produtoId));
        const acabou = produtoBanco && produtoBanco.acabouCozinha === true;
        const semEstoque = false;   // esgotado = apenas o que a Cozinha marcou como ACABOU

        const stInfo = {
            'pendente':   { cor: '#ff9800', label: '⏳ Pendente',   bg: '#fff3e0' },
            'preparando': { cor: '#2196f3', label: '👨‍🍳 Preparando', bg: '#e3f2fd' },
            'servido':    { cor: '#4caf50', label: '✅ Atendido',   bg: '#e8f5e9' },
            'faltou':     { cor: '#d32f2f', label: '❌ Faltou',     bg: '#ffebee' }
        };
        const st2 = stInfo[st] || stInfo.pendente;

        let botoesAcao = '';
        if (!isCancelada) {
            if (st === 'pendente') {
                botoesAcao = '<button class="btn-primary" style="padding:6px 10px;font-size:0.75rem;background:#2196f3;width:auto;margin-right:4px;" onclick="mudarStatusItem(' + c.id + ', ' + idx + ', \'preparando\')">Preparar</button>' +
                             '<button class="btn-outline" style="padding:6px 10px;font-size:0.75rem;border-color:#d32f2f;color:#d32f2f;width:auto;" onclick="mudarStatusItem(' + c.id + ', ' + idx + ', \'faltou\')">Faltou</button>';
            } else if (st === 'preparando') {
                botoesAcao = '<button class="btn-primary" style="padding:6px 10px;font-size:0.75rem;background:#4caf50;width:auto;margin-right:4px;" onclick="mudarStatusItem(' + c.id + ', ' + idx + ', \'servido\')">Servir</button>' +
                             '<button class="btn-outline" style="padding:6px 10px;font-size:0.75rem;border-color:#d32f2f;color:#d32f2f;width:auto;" onclick="mudarStatusItem(' + c.id + ', ' + idx + ', \'faltou\')">Faltou</button>';
            } else {
                botoesAcao = '<button class="btn-outline" style="padding:6px 10px;font-size:0.75rem;" onclick="mudarStatusItem(' + c.id + ', ' + idx + ', \'pendente\')">↩️ Reabrir</button>';
            }
        }

        let alertaEstoque = '';
        if (semEstoque) alertaEstoque = '<div style="margin-top:6px; padding:6px 8px; background:#ffebee; border-radius:6px; font-size:0.7rem; color:#c62828; font-weight:bold;"><i class="fas fa-exclamation-triangle"></i> ESGOTADO</div>';
        else if (acabou) alertaEstoque = '<div style="margin-top:6px; padding:6px 8px; background:#ffebee; border-radius:6px; font-size:0.7rem; color:#c62828; font-weight:bold;"><i class="fas fa-ban"></i> ACABOU</div>';

        return '<div style="padding:10px;background:' + st2.bg + ';border-radius:8px;margin-bottom:8px;border-left:3px solid ' + st2.cor + '; opacity: ' + (isCancelada ? '0.6' : '1') + ';">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">' +
            '<div style="flex:1;">' +
            '    <div style="font-weight:600;font-size:0.95rem; text-decoration: ' + (isCancelada ? 'line-through' : 'none') + '; color: ' + (acabou || semEstoque ? '#c62828' : '#333') + ';">' + item.quantidade + 'x ' + item.nome + '</div>' +
            '    <div style="font-size:0.75rem;color:#888;margin-top:3px;"><i class="fas fa-utensils"></i> ' + (item.localProducao || 'cozinha') + ' · <span style="color:' + st2.cor + ';">' + st2.label + '</span></div>' +
            alertaEstoque +
            '</div>' +
            '<div>' + botoesAcao + '</div>' +
            '</div></div>';
    }).join('');

    return '<div class="card" style="background:#fff; margin-bottom:12px; border-left:4px solid ' + (isCancelada ? '#9e9e9e' : '#C2185B') + '; overflow:hidden;">' +
        
        // CABEÇALHO DO CARD (Sempre visível)
        '<div style="display:flex; justify-content:space-between; align-items:center; padding:14px; cursor:pointer; background:' + (aberto ? '#f5f5f5' : '#fff') + ';" onclick="toggleCardCozinha(' + c.id + ')">' +
        '    <div>' +
        '        <div style="font-size:1.1rem; font-weight:700;"><i class="fas fa-chair" style="color:#C2185B;"></i> ' + (c.mesa || '—') + '</div>' +
        '        <div style="font-size:0.75rem; color:#666;">Comanda ' + c.numero + ' · ' + (c.dataAbertura || '') + ' · ' + totalItens + ' item(ns)</div>' +
        '        <div style="font-size:0.8rem; color:#880E4F; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:250px;">' + itensResumo + '</div>' +
        '    </div>' +
        '    <div style="display:flex; align-items:center; gap:10px;">' +
        '        <i class="fas ' + (aberto ? 'fa-chevron-up' : 'fa-chevron-down') + '" style="color:#999;"></i>' +
        '        <button class="btn-limpar" onclick="event.stopPropagation(); excluirCozinha(' + c.id + ')" style="color:#c62828; padding:5px;"><i class="fas fa-times"></i></button>' +
        '    </div>' +
        '</div>' +

        // CONTEÚDO (Só visível se aberto)
        (aberto ? 
            '<div style="padding:0 14px 14px 14px; border-top:1px solid #eee;">' +
                '<div style="margin-top:14px;">' + itensHTML + '</div>' +
                (!isCancelada ? '<button class="btn-outline" style="width:100%; margin-top:10px;" onclick="servirTudoComanda(' + c.id + ')"><i class="fas fa-check-double"></i> Servir Todos os Itens</button>' : '') +
            '</div>'
        : '') +
        '</div>';
}

window.mudarStatusItem = async function(comandaId, itemIndex, novoStatus) {
    try {
        const comandas = window.normalizarArray(await apiGet('comandas'));
        const comanda = comandas.find(c => String(c.id) === String(comandaId));
        if (!comanda) return;
        const itens = window.normalizarArray(comanda.itens);
        if (!itens[itemIndex]) return;

        itens[itemIndex].statusProducao = novoStatus;
        comanda.itens = itens;
        await apiSave('comandas', comandas);
        atualizarCozinha();
    } catch (e) { alert('Erro ao atualizar item'); }
};

window.servirTudoComanda = async function(comandaId) {
    if (!await window.confirmar('Marcar TODOS os itens desta comanda como atendidos?')) return;
    try {
        const comandas = window.normalizarArray(await apiGet('comandas'));
        const comandaIndex = comandas.findIndex(c => String(c.id) === String(comandaId));
        if (comandaIndex === -1) return;

        const comanda = comandas[comandaIndex];
        const itens = window.normalizarArray(comanda.itens);
        
        itens.forEach(function(i) {
            if (i.statusProducao !== 'faltou') i.statusProducao = 'servido';
        });
        
        comanda.itens = itens;
        comandas[comandaIndex] = comanda;

        await apiSave('comandas', comandas);
        atualizarCozinha();
        if (typeof window.mostrarToast === 'function') window.mostrarToast('✅ Comanda atendida');
    } catch (e) { alert('Erro ao atualizar comanda'); }
};

window.excluirCozinha = async function(comandaId) {
    if (!await window.confirmar('Tem certeza que deseja fechar e remover este card da cozinha? (A comanda continuará no PDV)')) return;
    window.cozinhaState.comandas = window.cozinhaState.comandas.filter(c => String(c.id) !== String(comandaId));
    document.getElementById('cozinha-lista').innerHTML = renderListaCozinha();
};

window.abrirModalFecharCozinha = async function() {
    try {
        const comandas = window.normalizarArray(await apiGet('comandas'));
        const doDia = comandas.filter(c => window.isHoje(c.dataAbertura) && window.statusComandaNormalizado(c) !== 'cancelada');

        const pendencias = [];
        doDia.forEach(function(c) {
            window.normalizarArray(c.itens).forEach(function(i) {
                const st = i.statusProducao || 'pendente';
                if (st !== 'servido' && st !== 'faltou') pendencias.push({ c: c.numero, nome: i.nome, st: st });
            });
        });

        if (pendencias.length > 0) {
            alert('⚠️ Existem ' + pendencias.length + ' itens pendentes. Finalize-os antes de fechar a cozinha.');
            return;
        }

        if (!await window.confirmar('Todos os pedidos estão atendidos.\n\nDeseja fechar a cozinha do dia?')) return;
        await window.avisar('✅ Cozinha fechada com sucesso!');
        navigateTo('comandas');
    } catch (e) { alert('Erro: ' + e.message); }
};