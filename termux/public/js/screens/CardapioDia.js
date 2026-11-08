// ============================================================
// CARDAPIODIA.JS — v5 (Ativos no topo)
// ============================================================

console.log('✔ CardapioDia.js v5 carregado');

window.cardapioDiaState = {
    produtos: [],
    grupos: [],
    termoBusca: '',
    grupoFiltro: '',
    selecionados: {},
    corEquipe: 'verde',
    nomesGrupos: {
        verde:    'Cardápio normal',
        azul:     'Promoções do dia',
        laranja:  'Almoço especial',
        vermelho: 'Últimos itens',
        roxo:     'Jantar'
    }
};

window.CORES_EQUIPE = [
    { id: 'verde',    hex: '#4caf50' },
    { id: 'azul',     hex: '#1976d2' },
    { id: 'laranja',  hex: '#ff9800' },
    { id: 'vermelho', hex: '#c62828' },
    { id: 'roxo',     hex: '#C2185B' }
];

window.renderCardapioDia = function() {
    setTimeout(carregarCardapioDia, 50);

    return [
        '<div class="app-bar">',
        '    <button class="icon-btn" onclick="navigateTo(\'comandas\')"><i class="fas fa-arrow-left"></i></button>',
        '    <h1>Cardápio do Dia</h1>',
        '    <button class="icon-btn" onclick="salvarCardapioDia()" title="Salvar"><i class="fas fa-save"></i></button>',
        '</div>',

        '<div class="content-area" style="flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding-bottom:140px;">',

        '    <div style="padding:12px 16px;background:#fff3e0;border-bottom:1px solid #ffe0b2;">',
        '        <div style="font-size:0.85rem;color:#e65100;line-height:1.5;">',
        '            <i class="fas fa-info-circle"></i>',
        '            <b>Marque os produtos</b> disponíveis hoje. <br>Itens marcados aparecem <b>no topo</b> da lista.',
        '        </div>',
        '    </div>',

        '    <div style="padding:14px 16px;background:#fff;border-bottom:1px solid #eee;">',
        '        <label style="font-size:0.85rem;font-weight:600;color:#555;display:block;margin-bottom:8px;">',
        '            <i class="fas fa-users"></i> Grupo da equipe (diferencia o cardápio)',
        '        </label>',
        '        <div style="display:flex;gap:8px;flex-wrap:wrap;" id="cores-equipe"></div>',
        '        <div style="margin-top:10px;padding:10px;background:#f5f5f5;border-radius:8px;">',
        '            <label style="font-size:0.75rem;color:#666;display:block;margin-bottom:4px;">Nome deste grupo:</label>',
        '            <input type="text" id="cor-equipe-nome" placeholder="Ex: Almoço, Jantar, Promoções" style="width:100%;padding:8px 10px;border:1.5px solid #ccc;border-radius:6px;font-family:var(--font-family);font-size:0.85rem;" onchange="atualizarNomeGrupoEquipe()">',
        '            <small style="color:#888;font-size:0.7rem;display:block;margin-top:4px;">Esse nome aparecerá no cardápio do cliente.</small>',
        '        </div>',
        '    </div>',

        '    <div class="input-busca">',
        '        <input type="text" placeholder="Pesquisar produto" id="cardapio-dia-busca" oninput="filtrarCardapioDia()">',
        '        <button class="btn-limpar" onclick="limparBuscaCardapioDia()"><i class="fas fa-xmark"></i></button>',
        '    </div>',

        '    <div id="cardapio-dia-chips" style="padding:0 16px 10px;">',
        '        <span style="color:#888;font-size:0.8rem;white-space:nowrap;">Carregando categorias...</span>',
        '    </div>',

        '    <div style="padding:0 16px 10px;display:flex;gap:8px;">',
        '        <button class="btn-outline" style="flex:1;font-size:0.8rem;padding:8px;" onclick="marcarTodosCardapioDia(true)">',
        '            <i class="fas fa-check-double"></i> Marcar Todos',
        '        </button>',
        '        <button class="btn-outline" style="flex:1;font-size:0.8rem;padding:8px;border-color:#c62828;color:#c62828;" onclick="marcarTodosCardapioDia(false)">',
        '            <i class="fas fa-times"></i> Desmarcar Todos',
        '        </button>',
        '    </div>',

        '    <div style="padding:0 16px 5px;color:#666;font-size:0.8rem;" id="cardapio-dia-contador"></div>',

        '    <div id="cardapio-dia-lista" style="padding:0 12px;">',
        '        <p class="empty-state">🔄 Carregando...</p>',
        '    </div>',

        '</div>',

        '<button class="fab" onclick="salvarCardapioDia()" style="bottom:88px;"><i class="fas fa-save"></i></button>'
    ].join('\n');
};

// ============================================================
// CARREGA
// ============================================================
async function carregarCardapioDia() {
    const lista = document.getElementById('cardapio-dia-lista');
    if (!lista) return;

    try {
        const produtos = await apiGet('produtos');
        window.cardapioDiaState.produtos = Array.isArray(produtos) ? produtos : [];

        const grupos = await apiGet('grupos');
        window.cardapioDiaState.grupos = Array.isArray(grupos) ? grupos : [];

        const config = await apiGet('cardapioDia');
        
        window.cardapioDiaState.selecionados = {};
        window.cardapioDiaState.produtos.forEach(p => {
            window.cardapioDiaState.selecionados[p.id] = false;
        });

        if (Array.isArray(config) && config.length > 0) {
            const c = config[0];
            if (c && c.selecionados) {
                Object.keys(c.selecionados).forEach(id => {
                    if (c.selecionados[id] === true) {
                        window.cardapioDiaState.selecionados[id] = true;
                    }
                });
            }
            if (c && c.corEquipe) window.cardapioDiaState.corEquipe = c.corEquipe;
            if (c && c.nomesGrupos) window.cardapioDiaState.nomesGrupos = Object.assign({}, window.cardapioDiaState.nomesGrupos, c.nomesGrupos);
        }

        renderCoresEquipe();
        renderChipsCardapioDia();
        lista.innerHTML = renderListaCardapioDia();

    } catch (e) {
        console.error('❌ Erro:', e);
        lista.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro ao carregar.</p>';
    }
}

window.carregarCardapioDia = carregarCardapioDia;

// ============================================================
// CORES DA EQUIPE
// ============================================================
function renderCoresEquipe() {
    const container = document.getElementById('cores-equipe');
    if (!container) return;
    const html = [];
    for (let i = 0; i < window.CORES_EQUIPE.length; i++) {
        const cor = window.CORES_EQUIPE[i];
        const ativo = window.cardapioDiaState.corEquipe === cor.id;
        const nome = window.cardapioDiaState.nomesGrupos[cor.id] || '';
        html.push(
            '<button onclick="selecionarCorEquipe(\'' + cor.id + '\')" title="' + nome + '" ' +
            'style="background:' + cor.hex + ';color:#fff;border:none;padding:8px 14px;border-radius:20px;font-size:0.8rem;cursor:pointer;font-weight:600;' +
            (ativo ? 'box-shadow:0 0 0 3px rgba(0,0,0,0.25);transform:scale(1.05);' : 'opacity:0.55;') + '">' +
            (ativo ? '<i class="fas fa-check"></i> ' : '') + nome + '</button>'
        );
    }
    container.innerHTML = html.join('');
    const input = document.getElementById('cor-equipe-nome');
    if (input) input.value = window.cardapioDiaState.nomesGrupos[window.cardapioDiaState.corEquipe] || '';
}

window.selecionarCorEquipe = function(corId) {
    window.cardapioDiaState.corEquipe = corId;
    renderCoresEquipe();
};

window.atualizarNomeGrupoEquipe = function() {
    const input = document.getElementById('cor-equipe-nome');
    if (!input) return;
    const novoNome = String(input.value || '').trim();
    if (novoNome === '') return;
    window.cardapioDiaState.nomesGrupos[window.cardapioDiaState.corEquipe] = novoNome;
    renderCoresEquipe();
};

// ============================================================
// CHIPS DE GRUPOS
// ============================================================
function renderChipsCardapioDia() {
    const container = document.getElementById('cardapio-dia-chips');
    if (!container) return;
    const grupos = window.cardapioDiaState.grupos;
    if (grupos.length === 0) { container.innerHTML = ''; return; }
    const chips = ['<button class="chip-grupo ' + (window.cardapioDiaState.grupoFiltro === '' ? 'ativo' : '') + '" onclick="selecionarGrupoCardapioDia(\'\')">Todos</button>'];
    for (let i = 0; i < grupos.length; i++) {
        const g = grupos[i];
        const ativo = String(window.cardapioDiaState.grupoFiltro) === String(g.id) ? 'ativo' : '';
        chips.push('<button class="chip-grupo ' + ativo + '" onclick="selecionarGrupoCardapioDia(\'' + g.id + '\')">' + g.nome + '</button>');
    }
    container.innerHTML = chips.join('');
}

window.selecionarGrupoCardapioDia = function(grupoId) {
    window.cardapioDiaState.grupoFiltro = grupoId;
    renderChipsCardapioDia();
    const lista = document.getElementById('cardapio-dia-lista');
    if (lista) lista.innerHTML = renderListaCardapioDia();
};

// ============================================================
// LISTA DE PRODUTOS (ORDENADA)
// ============================================================
function renderListaCardapioDia() {
    let lista = window.cardapioDiaState.produtos.slice();
    const busca = String(window.cardapioDiaState.termoBusca || '').trim().toLowerCase();
    if (busca !== '') {
        lista = lista.filter(function(p) { return String(p.nome || '').toLowerCase().indexOf(busca) >= 0; });
    }
    const grupoFiltro = String(window.cardapioDiaState.grupoFiltro || '').trim();
    if (grupoFiltro !== '') {
        lista = lista.filter(function(p) { return String(p.grupo || '') === grupoFiltro; });
    }

    // ORDENAÇÃO: A-Z (sem acento/caixa), só na exibição
    lista.sort(function(a, b) {
        return String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR', { sensitivity: 'base', numeric: true });
    });

    const contador = document.getElementById('cardapio-dia-contador');
    if (contador) {
        let total = 0;
        for (let i = 0; i < window.cardapioDiaState.produtos.length; i++) {
            const p = window.cardapioDiaState.produtos[i];
            if (p.inativo !== true && window.cardapioDiaState.selecionados[p.id]) total++;
        }
        contador.textContent = total + ' de ' + window.cardapioDiaState.produtos.length + ' produtos no cardápio';
    }

    if (lista.length === 0) return '<p class="empty-state">Nenhum produto encontrado.</p>';

    const html = [];
    for (let i = 0; i < lista.length; i++) {
        const p = lista[i];
        const selecionado = window.cardapioDiaState.selecionados[p.id] === true;
        const inativo = p.inativo === true;
        const preco = Number(p.valorVenda || 0);
        const nomeGrupo = obterNomeGrupoCardapioDia(p.grupo);
        
        const bg = inativo ? '#f5f5f5' : (selecionado ? '#e8f5e9' : '#fff');
        const borda = inativo ? '#ddd' : (selecionado ? '#4caf50' : '#eee');
        const corTexto = inativo ? '#999' : '#333';

        html.push(
            '<div class="card" style="background:' + bg + ';border-left:4px solid ' + borda + ';padding:14px;margin-bottom:8px;opacity:' + (inativo ? '0.6' : '1') + ';">' +
            '    <div style="display:flex;align-items:center;gap:12px;">' +
            '        <input type="checkbox" ' + (selecionado ? 'checked' : '') + (inativo ? ' disabled' : '') + ' onchange="toggleProdutoCardapioDia(' + p.id + ')" style="width:24px;height:24px;cursor:pointer;accent-color:#4caf50;flex-shrink:0;">' +
            '        <div style="flex:1;min-width:0;">' +
            '            <div style="font-weight:600;color:' + corTexto + ';font-size:0.95rem;">' + p.nome + (inativo ? ' <span style="background:#ccc;color:#666;font-size:0.6rem;padding:2px 6px;border-radius:6px;">INATIVO</span>' : '') + '</div>' +
            (nomeGrupo ? '            <div style="font-size:0.75rem;color:#888;margin-top:2px;">' + nomeGrupo + '</div>' : '') +
            '            <div style="font-size:0.8rem;color:var(--primary-color);font-weight:600;margin-top:4px;">' + formatMoney(preco) + '</div>' +
            '        </div>' +
            '        <div style="font-size:1.3rem;color:' + (selecionado ? '#4caf50' : '#ddd') + ';"><i class="fas ' + (selecionado ? 'fa-check-circle' : 'fa-circle') + '"></i></div>' +
            '    </div></div>'
        );
    }
    return html.join('');
}

function obterNomeGrupoCardapioDia(id) {
    for (let i = 0; i < window.cardapioDiaState.grupos.length; i++) {
        if (String(window.cardapioDiaState.grupos[i].id) === String(id)) return window.cardapioDiaState.grupos[i].nome;
    }
    return '';
}

window.toggleProdutoCardapioDia = function(produtoId) {
    const atualmente = window.cardapioDiaState.selecionados[produtoId] === true;
    window.cardapioDiaState.selecionados[produtoId] = !atualmente;
    const lista = document.getElementById('cardapio-dia-lista');
    if (lista) lista.innerHTML = renderListaCardapioDia();
    
    // 🔥 Auto-salva para reordenar os ativos no topo em tempo real
    salvarCardapioDia(true);
};

window.marcarTodosCardapioDia = function(marcar) {
    for (let i = 0; i < window.cardapioDiaState.produtos.length; i++) {
        const p = window.cardapioDiaState.produtos[i];
        if (p.inativo !== true) window.cardapioDiaState.selecionados[p.id] = marcar;
    }
    const lista = document.getElementById('cardapio-dia-lista');
    if (lista) lista.innerHTML = renderListaCardapioDia();
    salvarCardapioDia(true);
};

window.filtrarCardapioDia = function() {
    window.cardapioDiaState.termoBusca = (document.getElementById('cardapio-dia-busca') || {}).value || '';
    const lista = document.getElementById('cardapio-dia-lista');
    if (lista) lista.innerHTML = renderListaCardapioDia();
};

window.limparBuscaCardapioDia = function() {
    window.cardapioDiaState.termoBusca = '';
    const input = document.getElementById('cardapio-dia-busca');
    if (input) input.value = '';
    const lista = document.getElementById('cardapio-dia-lista');
    if (lista) lista.innerHTML = renderListaCardapioDia();
};

// ============================================================
// SALVAR
// ============================================================
window.salvarCardapioDia = async function(silencioso) {
    try {
        const config = [{
            selecionados: window.cardapioDiaState.selecionados,
            corEquipe: window.cardapioDiaState.corEquipe,
            nomesGrupos: window.cardapioDiaState.nomesGrupos,
            ultimaAtualizacao: new Date().toLocaleString('pt-BR')
        }];
        await apiSave('cardapioDia', config);
        
        if (!silencioso) {
            if (typeof window.mostrarToast === 'function') {
                window.mostrarToast('✅ Cardápio do dia salvo!');
            } else {
                alert('✅ Cardápio do dia salvo!');
            }
        }
    } catch (e) {
        console.error('❌ Erro ao salvar:', e);
        alert('Erro ao salvar: ' + e.message);
    }
};

console.log('✔ CardapioDia.js v5 — Pronto');