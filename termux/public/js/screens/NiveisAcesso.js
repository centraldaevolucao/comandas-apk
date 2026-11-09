// ============================================================
// NIVEISACESSO.JS — Lista de níveis de acesso
// ============================================================

console.log('✔ NiveisAcesso.js carregado');

window.niveisCache = [];
window.nivelTermoBusca = '';

// Paleta de cores disponíveis
window.CORES_NIVEL = [
    { id: 'vermelho', hex: '#c62828' },
    { id: 'roxo',     hex: '#C2185B' },
    { id: 'azul',     hex: '#1976d2' },
    { id: 'verde',    hex: '#388e3c' },
    { id: 'laranja',  hex: '#ff9800' },
    { id: 'cinza',    hex: '#607d8b' },
    { id: 'rosa',     hex: '#e91e63' },
    { id: 'preto',    hex: '#333333' }
];

// Ícones disponíveis
window.ICONES_NIVEL = [
    { id: 'fa-crown',        label: 'Coroa' },
    { id: 'fa-user-shield',  label: 'Escudo' },
    { id: 'fa-user-tie',     label: 'Gravata' },
    { id: 'fa-user',         label: 'Usuário' },
    { id: 'fa-user-cog',     label: 'Engrenagem' },
    { id: 'fa-user-nurse',   label: 'Enfermeira' },
    { id: 'fa-user-astronaut', label: 'Astronauta' },
    { id: 'fa-utensils',     label: 'Garfo' },
    { id: 'fa-hat-chef',     label: 'Chapéu Chef' },
    { id: 'fa-cash-register', label: 'Caixa' },
    { id: 'fa-broom',        label: 'Vassoura' },
    { id: 'fa-star',         label: 'Estrela' }
];

// ============================================================
// RENDER
// ============================================================
window.renderNiveisAcesso = function() {
    console.log('🎬 renderNiveisAcesso chamado');
    setTimeout(atualizarListaNiveis, 50);

    return [
        '<div class="app-bar">',
        '    <button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button>',
        '    <h1>Níveis de Acesso</h1>',
        '    <button class="icon-btn" onclick="abrirMenu()"><i class="fas fa-bars"></i></button>',
        '</div>',

        '<div style="padding:12px 16px;background:#fff3e0;border-bottom:1px solid #ffe0b2;">',
        '    <div style="font-size:0.85rem;color:#e65100;line-height:1.5;">',
        '        <i class="fas fa-shield-alt"></i>',
        '        Defina os níveis de permissão no sistema. Cada nível pode ter cor e ícone próprios.',
        '    </div>',
        '</div>',

        '<div class="input-busca">',
        '    <input type="text" placeholder="Pesquisar nível" id="busca-nivel" oninput="filtrarNiveis()">',
        '    <button class="btn-limpar" onclick="limparBuscaNiveis()"><i class="fas fa-xmark"></i></button>',
        '</div>',

        '<div style="padding:0 16px 5px;color:#666;font-size:0.8rem;" id="niveis-contador"></div>',

        '<div class="content-area" id="niveis-lista">',
        '    <p class="empty-state">🔄 Carregando...</p>',
        '</div>',

        '<button class="fab" onclick="novoNivel()">+</button>'
    ].join('\n');
};

// ============================================================
// CARREGA
// ============================================================
async function atualizarListaNiveis() {
    const lista = document.getElementById('niveis-lista');
    if (!lista) return;

    try {
        const dados = await apiGet('niveisAcesso');
        window.niveisCache = Array.isArray(dados) ? dados : [];

        // Se vazio, cria os níveis padrão
        if (window.niveisCache.length === 0) {
            window.niveisCache = [
                { id: 'admin',     nome: 'Administrador', icon: 'fa-crown',       cor: '#c62828', descricao: 'Acesso total ao sistema', protegido: true },
                { id: 'gerente',   nome: 'Gerente',       icon: 'fa-user-shield', cor: '#C2185B', descricao: 'Cadastros e relatórios',  protegido: true },
                { id: 'atendente', nome: 'Atendente',     icon: 'fa-user-tie',    cor: '#1976d2', descricao: 'Comandas e pedidos',      protegido: true },
                { id: 'cliente',   nome: 'Cliente',       icon: 'fa-user',        cor: '#388e3c', descricao: 'Apenas o cardápio',       protegido: true }
            ];
            await apiSave('niveisAcesso', window.niveisCache);
        }

        console.log('🔍 Níveis:', window.niveisCache.length);
        lista.innerHTML = renderListaNiveis();
    } catch (e) {
        console.error('❌ Erro:', e);
        lista.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro: ' + e.message + '</p>';
    }
}

window.atualizarListaNiveis = atualizarListaNiveis;

// ============================================================
// LISTA
// ============================================================
function renderListaNiveis() {
    let lista = window.niveisCache.slice();

    const busca = String(window.nivelTermoBusca || '').trim().toLowerCase();
    if (busca !== '') {
        lista = lista.filter(function(n) {
            return String(n.nome || '').toLowerCase().indexOf(busca) >= 0;
        });
    }

    // Ordena por "poder" (níveis protegidos primeiro)
    lista.sort(function(a, b) {
        if (a.protegido && !b.protegido) return -1;
        if (!a.protegido && b.protegido) return 1;
        return String(a.nome || '').localeCompare(String(b.nome || ''));
    });

    const contador = document.getElementById('niveis-contador');
    if (contador) contador.textContent = lista.length + ' nível(is)';

    if (lista.length === 0) {
        if (busca) return '<p class="empty-state">Nenhum nível encontrado.</p>';
        return '<p class="empty-state">Nenhum nível cadastrado</p>';
    }

    const html = [];
    for (let i = 0; i < lista.length; i++) {
        const n = lista[i];

        // Conta colaboradores com esse nível
        const emUso = (window.colaboradoresCache || []).filter(function(c) {
            return c.nivelAcesso === n.id;
        }).length;

        const badgeProtegido = n.protegido
            ? ' <span style="background:#eee;color:#666;font-size:0.6rem;padding:2px 6px;border-radius:6px;margin-left:6px;"><i class="fas fa-lock" style="font-size:0.55rem;"></i> Protegido</span>'
            : '';

        html.push(
            '<div class="lista-item" onclick="editarNivel(\'' + n.id + '\')">' +
            '<div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0;">' +
            '    <div style="width:40px;height:40px;background:' + n.cor + ';border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
            '        <i class="fas ' + n.icon + '" style="color:#fff;font-size:1rem;"></i>' +
            '    </div>' +
            '    <div style="flex:1;min-width:0;">' +
            '        <div class="lista-item-titulo">' + n.nome + badgeProtegido + '</div>' +
            '        <div class="lista-item-sub">' + (n.descricao || 'Sem descrição') + (emUso > 0 ? ' • ' + emUso + ' colaborador(es)' : '') + '</div>' +
            '    </div>' +
            '</div>' +
            '<i class="fas fa-chevron-right" style="color:#ccc;"></i>' +
            '</div>'
        );
    }
    return html.join('');
}

// ============================================================
// AÇÕES
// ============================================================
window.novoNivel = function() {
    window.nivelEditando = null;
    navigateTo('cadastro-nivel');
};

window.editarNivel = function(id) {
    for (let i = 0; i < window.niveisCache.length; i++) {
        if (String(window.niveisCache[i].id) === String(id)) {
            window.nivelEditando = window.niveisCache[i];
            navigateTo('cadastro-nivel');
            return;
        }
    }
};

window.filtrarNiveis = function() {
    window.nivelTermoBusca = (document.getElementById('busca-nivel') || {}).value || '';
    const lista = document.getElementById('niveis-lista');
    if (lista) lista.innerHTML = renderListaNiveis();
};

window.limparBuscaNiveis = function() {
    window.nivelTermoBusca = '';
    const input = document.getElementById('busca-nivel');
    if (input) input.value = '';
    const lista = document.getElementById('niveis-lista');
    if (lista) lista.innerHTML = renderListaNiveis();
};