// ============================================================
// CARDAPIO.JS — v3 (Aviso de Caixa + Item Esgotado)
// ============================================================

console.log('✔ Cardapio.js v3 carregado');

(function forcarRolagemTouch() {
    // Só no cardápio do cliente (QR Code). No sistema normal quem rola é .content-area; forçar
    // height:auto aqui quebrava a rolagem de TODAS as telas.
    if (!window.location.pathname.startsWith('/mesa/')) return;
    document.documentElement.style.setProperty('overflow-y', 'auto', 'important');
    document.documentElement.style.setProperty('overflow-x', 'hidden', 'important');
    document.documentElement.style.setProperty('height', 'auto', 'important');
    document.body.style.setProperty('overflow-y', 'auto', 'important');
    document.body.style.setProperty('overflow-x', 'hidden', 'important');
    document.body.style.setProperty('height', 'auto', 'important');
    document.body.style.setProperty('-webkit-overflow-scrolling', 'touch', 'important');
    document.body.style.setProperty('touch-action', 'pan-y', 'important');
})();

window.CORES_EQUIPE = window.CORES_EQUIPE || [
    { id: 'verde', hex: '#4caf50' },
    { id: 'azul', hex: '#1976d2' },
    { id: 'laranja', hex: '#ff9800' },
    { id: 'vermelho', hex: '#c62828' },
    { id: 'roxo', hex: '#C2185B' }
];

window.cardapioState = {
    mesa: null, comanda: null, produtos: [], grupos: [], carrinho: [],
    termoBusca: '', grupoFiltro: '', corEquipe: null, nomeGrupoEquipe: null,
    clienteIdentificado: null, identificacaoFeita: false,
    caixaAberto: false // 🔥 Novo estado
};

window.renderCardapio = function() {
    if (document.body.classList.contains('cliente-qrcode')) {
        document.documentElement.style.setProperty('overflow-y', 'auto', 'important');
        document.body.style.setProperty('overflow-y', 'auto', 'important');
    }

    const numeroMesa = obterMesaDaURL();
    if (!numeroMesa) return renderSemMesa();

    setTimeout(function() { carregarCardapio(numeroMesa); }, 50);

    return [
        '<div class="app-bar">',
        '    <div style="width:40px;"></div>',
        '    <h1 id="cardapio-titulo">Cardápio</h1>',
        '    <button class="icon-btn" onclick="abrirMeusPedidos()" title="Meus pedidos"><i class="fas fa-receipt"></i></button>',
        '</div>',

        '<style>',
        '   body.cliente-qrcode { overflow-y: auto !important; height: auto !important; -webkit-overflow-scrolling: touch !important; }',
        '   body.cliente-qrcode #app { overflow: visible !important; height: auto !important; }',
        '   .content-area { overflow-y: auto !important; -webkit-overflow-scrolling: touch !important; touch-action: pan-y !important; }',
        '   #cardapio-lista { overflow-y: auto !important; -webkit-overflow-scrolling: touch !important; }',
        '</style>',

        // 🔥 BANNER DE CAIXA FECHADO
        '<div id="cardapio-caixa-status" style="display:none; padding:10px 16px; text-align:center; font-size:0.85rem; font-weight:bold; border-bottom:1px solid #ccc;"></div>',

        '<div id="cardapio-cliente-info" style="display:none;padding:8px 16px;background:#e8f5e9;text-align:center;font-size:0.8rem;color:#2e7d32;border-bottom:1px solid #c8e6c9;">',
        '    <i class="fas fa-user-circle"></i> <span id="cardapio-cliente-nome"></span>',
        '    <span id="cardapio-cliente-garcom" style="display:none;color:#666;font-size:0.75rem;"> • Garçom: <b id="cardapio-garcom-nome"></b></span>',
        '    <button class="btn-limpar" onclick="trocarClienteCardapio()" style="margin-left:8px;color:#2e7d32;font-size:0.75rem;text-decoration:underline;">Trocar</button>',
        '</div>',

        '<div id="cardapio-mesa-info" style="padding:12px 16px;background:linear-gradient(135deg, #C2185B 0%, #D81B60 100%);color:#fff;text-align:center;transition:background 0.4s;">',
        '    <div style="font-size:0.75rem;opacity:0.9;">VOCÊ ESTÁ NA</div>',
        '    <div style="font-size:1.3rem;font-weight:700;margin-top:2px;" id="cardapio-mesa-nome">—</div>',
        '    <div style="font-size:0.7rem;opacity:0.75;margin-top:4px;">Bem-vindo! Faça seu pedido 😊</div>',
        '</div>',

        '<div class="input-busca">',
        '    <input type="text" placeholder="Pesquisar no cardápio" id="cardapio-busca" oninput="filtrarCardapio()">',
        '    <button class="btn-limpar" onclick="limparBuscaCardapio()"><i class="fas fa-xmark"></i></button>',
        '</div>',

        window.seletorOrdemProdutos((window.cardapioState && window.cardapioState.ordem) || 'padrao', 'mudarOrdemCardapio'),
        '<div id="cardapio-grupos-chips" style="padding:0 16px 10px; overflow-x: auto; white-space: nowrap; -webkit-overflow-scrolling: touch; touch-action: pan-x;">',
        '    <span style="color:#888;font-size:0.8rem;">Carregando categorias...</span>',
        '</div>',

        '<div id="cardapio-lista" style="padding:0 16px 120px; min-height: 300px; -webkit-overflow-scrolling: touch; touch-action: pan-y;">',
        '    <p class="empty-state">🔄 Carregando cardápio...</p>',
        '</div>',

        '<div id="cardapio-carrinho-bar" style="display:none;"></div>'
    ].join('\n');
};

function obterMesaDaURL() {
    const partes = window.location.pathname.split('/').filter(function(p) { return p; });
    if (partes.length >= 2 && partes[0] === 'mesa') return partes[1];
    return null;
}

function renderSemMesa() {
    return [
        '<div class="app-bar"><div style="width:40px;"></div><h1>Cardápio</h1><div style="width:40px;"></div></div>',
        '<div style="padding:20px;">',
        '    <div class="card" style="text-align:center;margin-top:40px;padding:30px 20px;">',
        '        <i class="fas fa-qrcode" style="font-size:4rem;color:var(--primary-color);"></i>',
        '        <h2 style="margin-top:20px;color:var(--primary-color);">Acesso por QR Code</h2>',
        '        <p style="margin-top:12px;color:#666;line-height:1.6;">Escaneie o QR Code da sua mesa para ver o cardápio e fazer pedidos.</p>',
        '    </div>',
        '</div>'
    ].join('\n');
}

async function carregarCardapio(numeroMesa) {
    const lista = document.getElementById('cardapio-lista');
    if (!lista) return;

    try {
        // 🔥 1. VERIFICA SE O CAIXA ESTÁ ABERTO
        let caixaAberto = false;
        try {
            const caixaAtual = await apiGet('caixaAtual');
            const cx = Array.isArray(caixaAtual) ? caixaAtual[0] : caixaAtual;
            if (cx && cx.status === 'aberto') caixaAberto = true;
        } catch (e) { caixaAberto = false; }
        
        window.cardapioState.caixaAberto = caixaAberto;
        
        const bannerCaixa = document.getElementById('cardapio-caixa-status');
        if (bannerCaixa) {
            if (caixaAberto) {
                bannerCaixa.style.display = 'block';
                bannerCaixa.style.background = '#e8f5e9';
                bannerCaixa.style.color = '#2e7d32';
                bannerCaixa.innerHTML = '<i class="fas fa-check-circle"></i> Caixa Aberto — Pedidos liberados!';
            } else {
                bannerCaixa.style.display = 'block';
                bannerCaixa.style.background = '#ffebee';
                bannerCaixa.style.color = '#c62828';
                bannerCaixa.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Caixa Fechado — Não é possível fazer novos pedidos no momento.';
            }
        }

        // 2. Carrega mesas e produtos
        const mesas = await apiGet('mesas');
        const mesa = mesas.find(function(m) { return String(m.numero) === String(numeroMesa); });

        if (!mesa) {
            lista.innerHTML = '<div class="card" style="text-align:center;padding:30px;"><i class="fas fa-exclamation-triangle" style="font-size:3rem;color:#c62828;"></i><p style="margin-top:15px;color:#c62828;font-weight:500;">Mesa não encontrada</p></div>';
            return;
        }

        window.cardapioState.mesa = mesa;
        const elNome = document.getElementById('cardapio-mesa-nome');
        if (elNome) elNome.textContent = mesa.nome;

        const produtos = await apiGet('produtos');
        let produtosAtivos = (Array.isArray(produtos) ? produtos : []).filter(p => p.inativo !== true);

        const configCardapioDia = await apiGet('cardapioDia');
        let selecionados = null, corEquipe = null, nomeGrupoEquipe = null;

        if (Array.isArray(configCardapioDia) && configCardapioDia.length > 0) {
            const c = configCardapioDia[0];
            if (c && c.selecionados) selecionados = c.selecionados;
            if (c && c.corEquipe) {
                corEquipe = c.corEquipe;
                if (c.nomesGrupos && c.nomesGrupos[corEquipe]) nomeGrupoEquipe = c.nomesGrupos[corEquipe];
            }
        }

        if (selecionados) produtosAtivos = produtosAtivos.filter(p => selecionados[p.id] === true);
        window.cardapioState.produtos = produtosAtivos;

        if (corEquipe) {
            const cor = window.CORES_EQUIPE.find(c => c.id === corEquipe);
            if (cor) {
                const infoMesa = document.getElementById('cardapio-mesa-info');
                if (infoMesa) infoMesa.style.background = 'linear-gradient(135deg, ' + cor.hex + ' 0%, ' + ajustarTom(cor.hex, -25) + ' 100%)';
                window.cardapioState.corEquipe = cor.hex;
            }
        }

        if (nomeGrupoEquipe) {
            window.cardapioState.nomeGrupoEquipe = nomeGrupoEquipe;
            const titulo = document.getElementById('cardapio-titulo');
            if (titulo) titulo.textContent = nomeGrupoEquipe;
        }

        const grupos = await apiGet('grupos');
        window.cardapioState.grupos = (Array.isArray(grupos) ? grupos : []).filter(g => g.inativo !== true);

        renderChipsGrupos();
        lista.innerHTML = renderListaCardapio();
        renderCarrinhoBar();

        setTimeout(() => { window.scrollTo(0, 0); }, 100);

        if (!window.cardapioState.identificacaoFeita) {
            setTimeout(abrirModalIdentificacao, 400);
        } else if (window.cardapioState.clienteIdentificado) {
            mostrarBarraCliente();
        }
    } catch (e) {
        lista.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro ao carregar cardápio.</p>';
    }
}

function ajustarTom(hex, delta) {
    const n = parseInt(hex.replace('#', ''), 16);
    let r = Math.max(0, Math.min(255, (n >> 16) + delta));
    let g = Math.max(0, Math.min(255, ((n >> 8) & 0x00FF) + delta));
    let b = Math.max(0, Math.min(255, (n & 0x0000FF) + delta));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

// ============================================================
// IDENTIFICAÇÃO
// ============================================================
window.abrirModalIdentificacao = function() {
    const anterior = document.getElementById('modal-identificacao');
    if (anterior) anterior.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-identificacao'; modal.className = 'modal-overlay'; modal.style.zIndex = '900';

    let html = '<div class="modal-content"><div class="modal-header"><strong>Identifique-se (opcional)</strong>';
    html += '    <button class="btn-limpar" onclick="pularIdentificacao()"><i class="fas fa-xmark"></i></button></div>';
    html += '    <div class="modal-body">';
    html += '        <div style="text-align:center;margin-bottom:20px;">';
    html += '            <div style="width:70px;height:70px;background:#FCE4EC;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto;"><i class="fas fa-user-circle" style="font-size:2.2rem;color:var(--primary-color);"></i></div>';
    html += '            <p style="margin-top:12px;color:#666;font-size:0.9rem;line-height:1.5;">Informe seus dados para agilizar o atendimento.</p>';
    html += '        </div>';
    html += '        <div class="field"><label>Nome</label><input type="text" id="ident-nome" maxlength="40" placeholder="Ex: João Silva"></div>';
    html += '        <div class="field"><label>CPF</label><input type="text" id="ident-cpf" maxlength="14" placeholder="000.000.000-00" oninput="mascaraCPF(this)"><small style="color:#888;font-size:0.75rem;">Se já tiver cadastro, seus pedidos aparecerão automaticamente</small></div>';
    html += '        <div class="field"><label>Garçom que está atendendo</label><select id="ident-garcom"><option value="">-- Sem preferência --</option></select></div>';
    html += '        <button class="btn-primary" onclick="confirmarIdentificacao()"><i class="fas fa-check"></i> Confirmar</button>';
    html += '        <button class="btn-outline" style="width:100%;margin-top:10px;" onclick="pularIdentificacao()">Pular (não informar)</button>';
    html += '    </div></div>';

    modal.innerHTML = html;
    document.body.appendChild(modal);

    setTimeout(carregarGarconsNoSelect, 100);
    setTimeout(() => { const el = document.getElementById('ident-nome'); if (el) el.focus(); }, 150);
};

async function carregarGarconsNoSelect() {
    const sel = document.getElementById('ident-garcom');
    if (!sel) return;
    try {
        const colabs = await apiGet('colaboradores');
        const lista = Array.isArray(colabs) ? colabs : [];
        const garcons = lista.filter(c => {
            const f = String(c.funcao || '').toLowerCase();
            const n = String(c.nivelAcesso || '').toLowerCase();
            return f.includes('gar') || f.includes('atend') || n === 'atendente' || n === 'garcom' || n === 'gerente';
        });
        (garcons.length > 0 ? garcons : lista).forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.nome;
            opt.textContent = g.nome + (g.funcao ? ' (' + g.funcao + ')' : '');
            sel.appendChild(opt);
        });
    } catch (e) { console.error('Erro:', e); }
}

window.mascaraCPF = function(input) {
    let v = (input.value || '').replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
    input.value = v;
};

window.fecharModalIdentificacao = () => { const m = document.getElementById('modal-identificacao'); if (m) m.remove(); };
window.pularIdentificacao = () => { window.cardapioState.identificacaoFeita = true; fecharModalIdentificacao(); };

window.confirmarIdentificacao = async function() {
    const nome = (document.getElementById('ident-nome').value || '').trim();
    const cpf = (document.getElementById('ident-cpf').value || '').trim();
    const garcom = (document.getElementById('ident-garcom').value || '').trim();
    window.cardapioState.identificacaoFeita = true;

    if (!nome && !cpf && !garcom) { pularIdentificacao(); return; }

    // O servidor identifica/cadastra o cliente sem entregar a lista de clientes ao celular (vale também pelo link externo).
    let cliente = null;
    if (cpf || nome) {
        try {
            const base = (window.MT && window.MT.apiBase) ? window.MT.apiBase() : '';
            const r = await fetch(base + '/api/qr/' + (cpf ? 'cliente' : 'identificar'), {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: nome, cpf: cpf })
            });
            const j = await r.json();
            cliente = j && j.cliente ? j.cliente : null;
        } catch (e) { console.warn('Identificação QR falhou:', e); }
    }

    window.cardapioState.clienteIdentificado = {
        id: cliente ? cliente.id : null, nome: nome || (cliente ? cliente.nome : 'Cliente'),
        cpf: cpf || (cliente ? cliente.cpf : ''), garcom: garcom, novo: !!(cliente && cliente.criadoPorQRCode)
    };

    mostrarBarraCliente();
    fecharModalIdentificacao();
    if (cliente) mostrarToast('👋 Bem-vindo, ' + cliente.nome + '!');
    else if (garcom) mostrarToast('👋 Atendimento com ' + garcom);
};

function mostrarBarraCliente() {
    const div = document.getElementById('cardapio-cliente-info');
    const c = window.cardapioState.clienteIdentificado;
    if (!div || !c) return;
    div.style.display = 'block';
    document.getElementById('cardapio-cliente-nome').textContent = c.nome;
    if (c.garcom) {
        document.getElementById('cardapio-cliente-garcom').style.display = 'inline';
        document.getElementById('cardapio-garcom-nome').textContent = c.garcom;
    } else {
        document.getElementById('cardapio-cliente-garcom').style.display = 'none';
    }
}

window.trocarClienteCardapio = function() {
    window.cardapioState.clienteIdentificado = null;
    window.cardapioState.identificacaoFeita = false;
    document.getElementById('cardapio-cliente-info').style.display = 'none';
    abrirModalIdentificacao();
};

// ============================================================
// LISTA DE PRODUTOS E CARRINHO
// ============================================================
function renderChipsGrupos() {
    const container = document.getElementById('cardapio-grupos-chips');
    if (!container) return;
    const grupos = window.cardapioState.grupos;
    if (grupos.length === 0) { container.innerHTML = ''; return; }
    const chips = ['<button class="chip-grupo ' + (window.cardapioState.grupoFiltro === '' ? 'ativo' : '') + '" onclick="selecionarGrupoCardapio(\'\')">Todos</button>'];
    grupos.forEach(g => {
        const ativo = String(window.cardapioState.grupoFiltro) === String(g.id) ? 'ativo' : '';
        chips.push('<button class="chip-grupo ' + ativo + '" onclick="selecionarGrupoCardapio(\'' + g.id + '\')">' + g.nome + '</button>');
    });
    container.innerHTML = chips.join('');
}

window.mudarOrdemCardapio = async function(v) {
    window.cardapioState.ordem = v;
    if (v.indexOf('pedidos') >= 0 && !window.cardapioState.pop) window.cardapioState.pop = await window.popularidadeProdutos();
    document.getElementById('cardapio-lista').innerHTML = renderListaCardapio();
};

window.selecionarGrupoCardapio = function(grupoId) {
    window.cardapioState.grupoFiltro = grupoId;
    renderChipsGrupos();
    document.getElementById('cardapio-lista').innerHTML = renderListaCardapio();
};

function renderListaCardapio() {
    let lista = window.cardapioState.produtos.slice();
    const busca = String(window.cardapioState.termoBusca || '').trim().toLowerCase();
    if (busca) lista = lista.filter(p => String(p.nome || '').toLowerCase().indexOf(busca) >= 0);
    
    const grupoFiltro = String(window.cardapioState.grupoFiltro || '').trim();
    if (grupoFiltro) lista = lista.filter(p => String(p.grupo || '') === grupoFiltro);
    
    lista = window.ordenarProdutos(lista, window.cardapioState.ordem || 'padrao', window.cardapioState.pop, obterNomeGrupoCardapio);

    if (lista.length === 0) return '<p class="empty-state">Nenhum item encontrado.</p>';

    const html = [];
    lista.forEach(p => {
        const temPromo = p.promocaoAtiva && Number(p.precoPromocional) > 0;
        const precoVenda = Number(p.valorVenda || 0);
        const precoFinal = temPromo ? Number(p.precoPromocional) : precoVenda;
        const grupoNome = obterNomeGrupoCardapio(p.grupo);
        
        // 🔥 2. VERIFICA SE O ITEM ACABOU (ESTOQUE ZERADO)
        const esgotado = p.acabouCozinha === true;   // só a Cozinha marca que acabou

        let precoHTML = temPromo 
            ? '<span style="text-decoration:line-through;color:#999;font-size:0.8rem;margin-right:6px;">' + formatMoney(precoVenda) + '</span><span style="color:#e65100;font-weight:bold;font-size:1.05rem;">' + formatMoney(precoFinal) + '</span>'
            : '<span style="font-weight:bold;color:var(--primary-color);font-size:1.05rem;">' + formatMoney(precoFinal) + '</span>';
        
        const badgePromo = temPromo ? ' <span style="background:#ff9800;color:#fff;font-size:0.6rem;padding:2px 6px;border-radius:8px;">PROMO</span>' : '';
        const noCarrinho = window.cardapioState.carrinho.find(i => String(i.produtoId) === String(p.id));
        const qtd = noCarrinho ? noCarrinho.quantidade : 0;

        let controles = '';
        if (esgotado) {
            controles = '<span style="background:#eee;color:#999;font-size:0.75rem;font-weight:bold;padding:6px 10px;border-radius:20px;white-space:nowrap;"><i class="fas fa-ban"></i> Esgotado</span>';
        } else if (!window.cardapioState.caixaAberto) {
            controles = '<span style="background:#ffebee;color:#c62828;font-size:0.75rem;font-weight:bold;padding:6px 10px;border-radius:20px;white-space:nowrap;"><i class="fas fa-lock"></i> Caixa Fechado</span>';
        } else {
            controles = qtd > 0
                ? '<div style="display:flex;align-items:center;gap:8px;"><button class="btn-qtd-cardapio" onclick="removerDoCarrinho(' + p.id + ')">−</button><span style="font-weight:700;min-width:20px;text-align:center;">' + qtd + '</span><button class="btn-qtd-cardapio" onclick="adicionarAoCarrinho(' + p.id + ')">+</button></div>'
                : '<button class="btn-add-cardapio" aria-label="Adicionar" title="Adicionar" onclick="adicionarAoCarrinho(' + p.id + ')"><i class="fas fa-plus"></i></button>';
        }

        const opacityStyle = esgotado ? 'opacity:0.6; background:#fafafa;' : 'background:#fff;';
        
        html.push(
            '<div class="card" style="margin:0 0 10px;padding:14px;' + opacityStyle + 'border:1px solid #f0f0f0;border-radius:12px;box-shadow:0 2px 5px rgba(0,0,0,0.05);">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">' +
            '<div style="flex:1;min-width:0;">' +
            '<div style="font-weight:600;font-size:1rem;">' + p.nome + badgePromo + '</div>' +
            (grupoNome ? '<div style="font-size:0.75rem;color:#888;margin-top:2px;">' + grupoNome + '</div>' : '') +
            '<div style="margin-top:8px;">' + (esgotado ? '<span style="color:#999;font-weight:bold;">Indisponível</span>' : precoHTML) + '</div>' +
            '</div><div>' + controles + '</div></div></div>'
        );
    });
    return html.join('');
}

function obterNomeGrupoCardapio(id) {
    const g = window.cardapioState.grupos.find(g => String(g.id) === String(id));
    return g ? g.nome : '';
}

window.adicionarAoCarrinho = function(produtoId) {
    if (!window.cardapioState.caixaAberto) {
        mostrarToast('🔒 Caixa fechado. Não é possível adicionar.');
        return;
    }
    const produto = window.cardapioState.produtos.find(p => String(p.id) === String(produtoId));
    if (!produto) return;
    if (produto.acabouCozinha === true) {
        mostrarToast('❌ Produto esgotado!');
        return;
    }
    const temPromo = produto.promocaoAtiva && Number(produto.precoPromocional) > 0;
    const preco = temPromo ? Number(produto.precoPromocional) : Number(produto.valorVenda || 0);
    const existente = window.cardapioState.carrinho.find(i => String(i.produtoId) === String(produtoId));
    
    if (existente) existente.quantidade++;
    else window.cardapioState.carrinho.push({ produtoId: produto.id, nome: produto.nome, preco, quantidade: 1, emPromocao: temPromo, precoOriginal: temPromo ? Number(produto.valorVenda) : undefined });
    
    atualizarTelaCardapio();
    mostrarToast('✅ ' + produto.nome + ' adicionado');
};

window.removerDoCarrinho = function(produtoId) {
    const idx = window.cardapioState.carrinho.findIndex(i => String(i.produtoId) === String(produtoId));
    if (idx < 0) return;
    window.cardapioState.carrinho[idx].quantidade--;
    if (window.cardapioState.carrinho[idx].quantidade <= 0) window.cardapioState.carrinho.splice(idx, 1);
    atualizarTelaCardapio();
};

function atualizarTelaCardapio() {
    const lista = document.getElementById('cardapio-lista');
    if (lista) lista.innerHTML = renderListaCardapio();
    renderCarrinhoBar();
}

function renderCarrinhoBar() {
    const bar = document.getElementById('cardapio-carrinho-bar');
    if (!bar) return;
    const carrinho = window.cardapioState.carrinho;
    if (carrinho.length === 0) { bar.style.display = 'none'; return; }
    
    let total = 0, qtd = 0;
    carrinho.forEach(i => { total += i.preco * i.quantidade; qtd += i.quantidade; });

    bar.style.display = 'block';
    bar.innerHTML = '<div class="carrinho-bar" onclick="abrirCarrinho()">' +
        '<div style="display:flex;align-items:center;gap:12px;"><div class="carrinho-badge">' + qtd + '</div>' +
        '<div><div style="font-size:0.75rem;opacity:0.9;">Ver carrinho</div><div style="font-size:1.1rem;font-weight:700;">' + formatMoney(total) + '</div></div></div>' +
        '<div style="font-size:1.3rem;"><i class="fas fa-chevron-right"></i></div></div>';
}

window.abrirCarrinho = function() {
    const carrinho = window.cardapioState.carrinho;
    if (carrinho.length === 0) return;
    
    let total = 0;
    const itensHTML = carrinho.map(item => {
        const sub = item.preco * item.quantidade;
        total += sub;
        return '<div class="item-comanda"><div class="item-comanda-info"><div class="item-comanda-nome">' + item.nome + '</div><div class="item-comanda-preco">' + formatMoney(item.preco) + ' cada</div></div>' +
            '<div class="item-comanda-controles"><button class="btn-qtd" onclick="removerDoCarrinho(' + item.produtoId + '); abrirCarrinho();">−</button>' +
            '<span class="item-comanda-qtd">' + item.quantidade + '</span><button class="btn-qtd" onclick="adicionarAoCarrinho(' + item.produtoId + '); abrirCarrinho();">+</button>' +
            '<span class="item-comanda-subtotal">' + formatMoney(sub) + '</span></div></div>';
    }).join('');

    const cli = window.cardapioState.clienteIdentificado;
    const clienteHTML = cli ? '<div style="padding:10px;background:#e8f5e9;border-radius:8px;margin-bottom:15px;font-size:0.85rem;"><i class="fas fa-user-circle" style="color:#2e7d32;"></i> <b>' + cli.nome + '</b>' +
          (cli.cpf ? '<div style="font-size:0.75rem;color:#666;margin-top:2px;">CPF: ' + cli.cpf + '</div>' : '') +
          (cli.garcom ? '<div style="font-size:0.75rem;color:#666;"><i class="fas fa-user-tie"></i> Garçom: ' + cli.garcom + '</div>' : '') + '</div>' : '';

    const anterior = document.getElementById('modal-carrinho');
    if (anterior) anterior.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-carrinho'; modal.className = 'modal-overlay';
    modal.innerHTML = '<div class="modal-content"><div class="modal-header"><strong>🛒 Meu Pedido</strong><button class="btn-limpar" onclick="fecharCarrinho()"><i class="fas fa-xmark"></i></button></div>' +
        '<div class="modal-body">' + clienteHTML + '<div>' + itensHTML + '</div>' +
        '<div style="margin-top:20px;padding-top:15px;border-top:2px solid #eee;display:flex;justify-content:space-between;align-items:center;"><strong style="font-size:1.1rem;">Total</strong><strong style="color:var(--primary-color);font-size:1.5rem;">' + formatMoney(total) + '</strong></div>' +
        '<button class="btn-primary" style="margin-top:20px;" onclick="enviarPedido()" ' + (!window.cardapioState.caixaAberto ? 'disabled style="opacity:0.5;"' : '') + '><i class="fas fa-paper-plane"></i> ' + (window.cardapioState.caixaAberto ? 'Enviar Pedido' : 'Caixa Fechado') + '</button>' +
        '<button class="btn-outline" style="width:100%;margin-top:10px;" onclick="limparCarrinho()"><i class="fas fa-trash"></i> Limpar Carrinho</button>' +
        '<button class="btn-outline" style="width:100%;margin-top:10px;" onclick="fecharCarrinho()">Continuar Pedindo</button></div></div>';
    document.body.appendChild(modal);
};

window.fecharCarrinho = () => { const m = document.getElementById('modal-carrinho'); if (m) m.remove(); };
window.limparCarrinho = async () => { if (!await window.confirmar('Limpar todos os itens?')) return; window.cardapioState.carrinho = []; fecharCarrinho(); atualizarTelaCardapio(); };

window.enviarPedido = async function() {
    if (!window.cardapioState.caixaAberto) {
        alert('O caixa está fechado. Não é possível enviar o pedido.');
        return;
    }
    const mesa = window.cardapioState.mesa;
    const carrinho = window.cardapioState.carrinho;
    if (!mesa || carrinho.length === 0) return;

    const pedidosPendentes = await apiGet('pedidosPendentes') || [];
    const agora = new Date();
    const data = agora.toLocaleDateString('pt-BR') + ' ' + String(agora.getHours()).padStart(2, '0') + ':' + String(agora.getMinutes()).padStart(2, '0');
    let total = 0;
    carrinho.forEach(c => total += c.preco * c.quantidade);
    
    const cli = window.cardapioState.clienteIdentificado || {};
    const novoPedido = {
        id: Date.now(), mesa: mesa.numero, mesaNome: mesa.nome, cliente: cli.nome || 'Cliente (QR Code)',
        clienteCpf: cli.cpf || '', clienteId: cli.id || null, garcom: cli.garcom || '',
        itens: carrinho.map(c => ({ produtoId: c.produtoId, nome: c.nome, preco: c.preco, quantidade: c.quantidade, emPromocao: c.emPromocao || false, precoOriginal: c.precoOriginal })),
        total: total, dataSolicitacao: data, status: 'pendente'
    };

    pedidosPendentes.push(novoPedido);
    await apiSave('pedidosPendentes', pedidosPendentes);
    
    window.cardapioState.carrinho = [];
    fecharCarrinho();
    atualizarTelaCardapio();
    mostrarAguardandoAprovacao(novoPedido.id);
};

function mostrarAguardandoAprovacao(pedidoId) {
    const anterior = document.getElementById('modal-aguardando');
    if (anterior) anterior.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-aguardando'; modal.className = 'modal-overlay'; modal.style.zIndex = '500';
    modal.innerHTML = '<div class="modal-content" style="text-align:center;padding:30px 20px;"><div style="font-size:4rem;color:var(--primary-color);margin-bottom:15px;"><i class="fas fa-hourglass-half" style="animation:pulse 1.5s infinite;"></i></div>' +
        '<h2 style="color:var(--primary-color);margin-bottom:10px;">Pedido Enviado!</h2><p style="color:#666;line-height:1.6;margin-bottom:20px;">Seu pedido foi enviado para o atendente.<br>Aguarde a confirmação.</p>' +
        '<div id="status-pedido-' + pedidoId + '" style="padding:15px;background:#FCE4EC;border-radius:10px;margin-bottom:20px;"><div style="font-size:0.85rem;color:#666;">Status</div><div style="font-size:1.1rem;font-weight:700;color:#e65100;">⏳ Aguardando aprovação</div></div>' +
        '<button class="btn-outline" style="width:100%;" onclick="fecharAguardando()">Voltar ao Cardápio</button></div>';
    document.body.appendChild(modal);

    const interval = setInterval(async () => {
        const pedidos = await apiGet('pedidosPendentes') || [];
        const pedido = pedidos.find(p => String(p.id) === String(pedidoId));
        
        if (!pedido) {
            clearInterval(interval); 
            atualizarStatusAguardando(pedidoId, 'aceito'); 
            return;
        }
        
        if (pedido.status === 'aceito') { 
            clearInterval(interval); 
            atualizarStatusAguardando(pedidoId, 'aceito'); 
        } else if (pedido.status === 'recusado') { 
            clearInterval(interval); 
            atualizarStatusAguardando(pedidoId, 'recusado', pedido.motivoRecusa); 
        }
    }, 2000);
    
    window._aguardandoInterval = interval;
}

function atualizarStatusAguardando(pedidoId, status, motivo) {
    const el = document.getElementById('status-pedido-' + pedidoId);
    if (!el) return;
    
    if (status === 'aceito') {
        el.innerHTML = '<div style="font-size:0.85rem;color:#666;">Status</div><div style="font-size:1.1rem;font-weight:700;color:#2e7d32;">✅ Pedido Aceito!</div><div style="font-size:0.8rem;color:#666;margin-top:6px;">Seu pedido está sendo preparado 🍳</div>';
        setTimeout(() => fecharAguardando(), 3000);
    } else if (status === 'recusado') {
        el.innerHTML = '<div style="font-size:0.85rem;color:#666;">Status</div><div style="font-size:1.1rem;font-weight:700;color:#c62828;">❌ Pedido Recusado</div>' + (motivo ? '<div style="font-size:0.8rem;color:#666;margin-top:6px;">' + motivo + '</div>' : '');
    }
}

window.fecharAguardando = () => { 
    const m = document.getElementById('modal-aguardando'); 
    if (m) m.remove(); 
    if (window._aguardandoInterval) { 
        clearInterval(window._aguardandoInterval); 
        window._aguardandoInterval = null; 
    } 
};

window.abrirMeusPedidos = async function() {
    const mesa = window.cardapioState.mesa;
    if (!mesa) return alert('Mesa não identificada');
    const comandas = await apiGet('comandas');
    const comanda = comandas.find(c => String(c.mesa) === String(mesa.numero) && (c.status === 'aberta' || c.status === 'delivery'));
    
    if (!comanda || !comanda.itens || comanda.itens.length === 0) return alert('Você ainda não fez nenhum pedido.');

    let total = 0;
    const itensHTML = comanda.itens.map(item => {
        const sub = item.preco * item.quantidade;
        total += sub;
        return '<div class="item-comanda"><div class="item-comanda-info"><div class="item-comanda-nome">' + item.nome + '</div><div class="item-comanda-preco">' + item.quantidade + 'x ' + formatMoney(item.preco) + '</div></div><div class="item-comanda-subtotal">' + formatMoney(sub) + '</div></div>';
    }).join('');

    const anterior = document.getElementById('modal-pedidos');
    if (anterior) anterior.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-pedidos'; modal.className = 'modal-overlay';
    modal.innerHTML = '<div class="modal-content"><div class="modal-header"><strong>🧾 Meus Pedidos</strong><button class="btn-limpar" onclick="fecharMeusPedidos()"><i class="fas fa-xmark"></i></button></div>' +
        '<div class="modal-body"><p style="color:#666;font-size:0.85rem;margin-bottom:15px;">Mesa: <b>' + mesa.nome + '</b></p><div>' + itensHTML + '</div>' +
        '<div style="margin-top:20px;padding-top:15px;border-top:2px solid #eee;display:flex;justify-content:space-between;"><strong>Total</strong><strong style="color:var(--primary-color);font-size:1.4rem;">' + formatMoney(total) + '</strong></div>' +
        '<button class="btn-primary" style="margin-top:20px;" onclick="chamarGarcom()"><i class="fas fa-bell"></i> Chamar Garçom</button>' +
        '<button class="btn-outline" style="width:100%;margin-top:10px;" onclick="pedirConta()"><i class="fas fa-receipt"></i> Pedir a Conta</button>' +
        '<button class="btn-outline" style="width:100%;margin-top:10px;" onclick="fecharMeusPedidos()">Fechar</button></div></div>';
    document.body.appendChild(modal);
};

window.fecharMeusPedidos = () => { const m = document.getElementById('modal-pedidos'); if (m) m.remove(); };
window.chamarGarcom = async function() {
    const mesa = window.cardapioState.mesa; if (!mesa) return;
    try {
        const chamados = await apiGet('chamados') || [];
        const cli = window.cardapioState.clienteIdentificado || {};
        chamados.push({ id: Date.now(), mesa: mesa.numero, mesaNome: mesa.nome, garcom: cli.garcom || '', cliente: cli.nome || '', tipo: 'garcom', data: new Date().toLocaleString('pt-BR'), atendido: false });
        await apiSave('chamados', chamados);
    } catch (e) {}
    alert('🔔 Garçom chamado! Aguarde alguns instantes.');
};

window.pedirConta = async function() {
    const mesa = window.cardapioState.mesa; if (!mesa || !await window.confirmar('Deseja pedir a conta?')) return;
    try {
        const chamados = await apiGet('chamados') || [];
        const cli = window.cardapioState.clienteIdentificado || {};
        chamados.push({ id: Date.now(), mesa: mesa.numero, mesaNome: mesa.nome, garcom: cli.garcom || '', cliente: cli.nome || '', tipo: 'conta', data: new Date().toLocaleString('pt-BR'), atendido: false });
        await apiSave('chamados', chamados);
    } catch (e) {}
    alert('🧾 Conta solicitada! Aguarde o atendente.');
};

window.filtrarCardapio = () => { window.cardapioState.termoBusca = (document.getElementById('cardapio-busca') || {}).value || ''; document.getElementById('cardapio-lista').innerHTML = renderListaCardapio(); };
window.limparBuscaCardapio = () => { window.cardapioState.termoBusca = ''; document.getElementById('cardapio-busca').value = ''; document.getElementById('cardapio-lista').innerHTML = renderListaCardapio(); };

function mostrarToast(mensagem) {
    const anterior = document.querySelector('.toast-cliente');
    if (anterior) anterior.remove();
    const toast = document.createElement('div');
    toast.className = 'toast-cliente';
    toast.textContent = mensagem;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 2000);
}

console.log('✔ Cardapio.js v3 — Caixa e Esgotado ativos');