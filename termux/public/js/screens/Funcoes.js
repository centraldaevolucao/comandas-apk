// ============================================================
// FUNCOES.JS — Lista de funções/cargos
// ============================================================

console.log('✔ Funcoes.js carregado');

window.funcoesCache = [];
window.funcaoTermoBusca = '';

// ============================================================
// RENDER
// ============================================================
window.renderFuncoes = function() {
    console.log('🎬 renderFuncoes chamado');
    setTimeout(atualizarListaFuncoes, 50);

    return [
        '<div class="app-bar">',
        '    <button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button>',
        '    <h1>Funções / Cargos</h1>',
        '    <button class="icon-btn" onclick="abrirMenu()"><i class="fas fa-bars"></i></button>',
        '</div>',

        '<div style="padding:12px 16px;background:#FCE4EC;border-bottom:1px solid #e0e0e0;">',
        '    <div style="font-size:0.85rem;color:#C2185B;line-height:1.5;">',
        '        <i class="fas fa-info-circle"></i>',
        '        Cadastre as funções (Garçom, Caixa, Cozinheiro, etc) para usar no cadastro de colaboradores.',
        '    </div>',
        '</div>',

        '<div class="input-busca">',
        '    <input type="text" placeholder="Pesquisar função" id="busca-funcao" oninput="filtrarFuncoes()">',
        '    <button class="btn-limpar" onclick="limparBuscaFuncoes()"><i class="fas fa-xmark"></i></button>',
        '</div>',

        '<div style="padding:0 16px 5px;color:#666;font-size:0.8rem;" id="funcoes-contador"></div>',

        '<div class="content-area" id="funcoes-lista">',
        '    <p class="empty-state">🔄 Carregando...</p>',
        '</div>',

        '<button class="fab" onclick="novaFuncao()">+</button>'
    ].join('\n');
};

// ============================================================
// CARREGA
// ============================================================
async function atualizarListaFuncoes() {
    const lista = document.getElementById('funcoes-lista');
    if (!lista) return;

    try {
        const dados = await apiGet('funcoes');
        window.funcoesCache = Array.isArray(dados) ? dados : [];

        // Se vazio, cria as funções padrão
        if (window.funcoesCache.length === 0) {
            window.funcoesCache = [
                { id: 1, nome: 'Garçom' },
                { id: 2, nome: 'Atendente' },
                { id: 3, nome: 'Caixa' },
                { id: 4, nome: 'Cozinheiro' },
                { id: 5, nome: 'Barman' },
                { id: 6, nome: 'Gerente' },
                { id: 7, nome: 'Recepcionista' }
            ];
            await apiSave('funcoes', window.funcoesCache);
        }

        console.log('🔍 Funções:', window.funcoesCache.length);
        lista.innerHTML = renderListaFuncoes();
    } catch (e) {
        console.error('❌ Erro:', e);
        lista.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro: ' + e.message + '</p>';
    }
}

window.atualizarListaFuncoes = atualizarListaFuncoes;

// ============================================================
// LISTA
// ============================================================
function renderListaFuncoes() {
    let lista = window.funcoesCache.slice();

    const busca = String(window.funcaoTermoBusca || '').trim().toLowerCase();
    if (busca !== '') {
        lista = lista.filter(function(f) {
            return String(f.nome || '').toLowerCase().indexOf(busca) >= 0;
        });
    }

    lista.sort(function(a, b) {
        return String(a.nome || '').localeCompare(String(b.nome || ''));
    });

    const contador = document.getElementById('funcoes-contador');
    if (contador) contador.textContent = lista.length + ' função(ões)';

    if (lista.length === 0) {
        if (busca) return '<p class="empty-state">Nenhuma função encontrada.</p>';
        return '<p class="empty-state">Nenhuma função cadastrada</p>';
    }

    const html = [];
    for (let i = 0; i < lista.length; i++) {
        const f = lista[i];

        // Conta quantos colaboradores usam essa função
        const emUso = (window.colaboradoresCache || []).filter(function(c) {
            return String(c.funcaoId) === String(f.id) || c.funcao === f.nome;
        }).length;

        html.push(
            '<div class="lista-item" onclick="editarFuncao(' + f.id + ')">' +
            '<div class="lista-item-info">' +
            '    <div class="lista-item-titulo">' +
            '        <i class="fas fa-briefcase" style="color:var(--primary-color);font-size:0.8rem;margin-right:6px;"></i>' +
                     f.nome +
            '    </div>' +
            (emUso > 0 ? '    <div class="lista-item-sub">' + emUso + ' colaborador(es) usam esta função</div>' : '') +
            '</div>' +
            '<button class="btn-limpar" onclick="event.stopPropagation(); excluirFuncao(' + f.id + ')" title="Excluir" style="margin-right:4px;">' +
            '    <i class="fas fa-trash" style="color:#c62828;font-size:0.9rem;"></i>' +
            '</button>' +
            '<i class="fas fa-chevron-right" style="color:#ccc;"></i>' +
            '</div>'
        );
    }
    return html.join('');
}

// ============================================================
// AÇÕES
// ============================================================
window.novaFuncao = function() {
    window.funcaoEditando = null;
    navigateTo('cadastro-funcao');
};

window.editarFuncao = function(id) {
    for (let i = 0; i < window.funcoesCache.length; i++) {
        if (String(window.funcoesCache[i].id) === String(id)) {
            window.funcaoEditando = window.funcoesCache[i];
            navigateTo('cadastro-funcao');
            return;
        }
    }
};

window.excluirFuncao = async function(id) {
    let func = null;
    for (let i = 0; i < window.funcoesCache.length; i++) {
        if (String(window.funcoesCache[i].id) === String(id)) {
            func = window.funcoesCache[i];
            break;
        }
    }
    if (!func) return;

    // Verifica se está em uso
    const colaboradores = await apiGet('colaboradores');
    const emUso = colaboradores.filter(function(c) {
        return String(c.funcaoId) === String(id) || c.funcao === func.nome;
    }).length;

    if (emUso > 0) {
        alert('Não é possível excluir: ' + emUso + ' colaborador(es) usam esta função.');
        return;
    }

    if (!await window.confirmar('Excluir a função "' + func.nome + '"?')) return;

    const lista = await apiGet('funcoes');
    const novaLista = lista.filter(function(x) { return String(x.id) !== String(id); });
    await apiSave('funcoes', novaLista);

    document.getElementById('app').innerHTML = renderFuncoes();
};

window.filtrarFuncoes = function() {
    window.funcaoTermoBusca = (document.getElementById('busca-funcao') || {}).value || '';
    const lista = document.getElementById('funcoes-lista');
    if (lista) lista.innerHTML = renderListaFuncoes();
};

window.limparBuscaFuncoes = function() {
    window.funcaoTermoBusca = '';
    const input = document.getElementById('busca-funcao');
    if (input) input.value = '';
    const lista = document.getElementById('funcoes-lista');
    if (lista) lista.innerHTML = renderListaFuncoes();
};