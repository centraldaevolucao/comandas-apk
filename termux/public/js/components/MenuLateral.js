// ============================================================
// MENULATERAL.JS — Menu Lateral Global
// ============================================================

console.log('✔ MenuLateral.js carregado');

// ------------------------------------------------------------
// Seções do menu (dados → HTML). Itens e grupos em ordem alfabética.
// Os itens ficam sempre visíveis: a seção abre do tamanho do conteúdo e o menu rola.
// ------------------------------------------------------------
const MENU_SECOES = [
    { id: 'sec-cadastros', titulo: 'Cadastros', grupos: [
        { id: 'grp-cardapio', icone: 'fa-utensils', titulo: 'Cardápio', itens: [
            ['adicionais', 'fa-plus-circle', 'Adicionais'], ['grupos', 'fa-layer-group', 'Grupos de Produtos'],
            ['precificacao', 'fa-tags', 'Precificação'], ['produtos', 'fa-box', 'Produtos'] ] },
        { id: 'grp-estoque', icone: 'fa-boxes-stacked', titulo: 'Estoque e compras', itens: [
            ['compras', 'fa-cart-shopping', 'Compras'], ['controle-perdas', 'fa-ban', 'Controle de Perdas'],
            ['fornecedores', 'fa-truck', 'Fornecedores'], ['movimentacao-estoque', 'fa-arrow-up', 'Movimentação de Estoque'] ] },
        { id: 'grp-equipe', icone: 'fa-concierge-bell', titulo: 'Salão e equipe', itens: [
            ['clientes', 'fa-users', 'Clientes'], ['colaboradores', 'fa-id-badge', 'Colaboradores'], ['funcoes', 'fa-briefcase', 'Funções'],
            ['mesas', 'fa-chair', 'Mesas'], ['niveis-acesso', 'fa-shield-alt', 'Níveis de Acesso'], ['usuarios', 'fa-user-cog', 'Usuários'] ] }
    ] },
    { id: 'sec-relatorios', titulo: 'Relatórios', itens: [
        ['comandas-arquivadas', 'fa-calendar', 'Comandas Arquivadas'], ['relatorio-estoque', 'fa-clipboard-check', 'Estoque'],
        ['financeiro', 'fa-scale-balanced', 'Financeiro (DRE)'], ['produtos-vendidos', 'fa-chart-bar', 'Produtos Vendidos'],
        ['totais-especie', 'fa-coins', 'Totais por Espécie'], ['relatorios', 'fa-chart-line', 'Visão Geral'] ] },
    { divisor: true },
    { id: 'sec-config', titulo: 'Configurações', itens: [
        ['configuracoes', 'fa-cogs', 'Ajustes Gerais'], ['backup', 'fa-cloud-upload-alt', 'Backup'],
        ['grupos-trabalho', 'fa-users-cog', 'Grupos de Trabalho'], ['impressoras', 'fa-print', 'Impressoras'],
        ['assinatura', 'fa-crown', 'Minha Assinatura'], ['parcelas', 'fa-credit-card', 'Parcelas'], ['suporte', 'fa-headset', 'Suporte'], ['meus-dados', 'fa-user-shield', 'Privacidade e meus dados'] ] }
];

function secoesMenuHtml(isAtivo, hash) {
    const item = function (i) {
        return '<div class="menu-item sub-item" onclick="navigateTo(\'' + i[0] + '\'); fecharMenuMobile();" style="' + isAtivo(i[0]) + '"><i class="fas ' + i[1] + '"></i> <span>' + i[2] + '</span></div>';
    };
    const tem = function (itens) { return itens.some(function (i) { return i[0] === hash; }); };
    return MENU_SECOES.map(function (sec) {
        if (sec.divisor) return '<hr class="menu-divider">';
        const grupos = sec.grupos || null;
        const todos = grupos ? grupos.reduce(function (a, g) { return a.concat(g.itens); }, []) : sec.itens;
        const aberta = tem(todos);
        const corpo = grupos ? grupos.map(function (g) {
            const ab = tem(g.itens);
            return '<div class="menu-subgroup">' +
                '<div class="menu-subgroup-header" onclick="toggleSecao(\'' + g.id + '\')"><span class="menu-subgroup-titulo"><i class="fas ' + g.icone + ' menu-subgroup-ico"></i>' + g.titulo + '</span><i class="fas fa-chevron-down" id="icon-' + g.id + '"' + (ab ? ' style="transform:rotate(180deg)"' : '') + '></i></div>' +
                '<div class="menu-subgroup-content' + (ab ? ' open' : '') + '" id="' + g.id + '">' + g.itens.map(item).join('') + '</div></div>';
        }).join('') : sec.itens.map(item).join('');
        return '<div class="menu-section"><div class="menu-section-header" onclick="toggleSecao(\'' + sec.id + '\')"><span>' + sec.titulo + '</span>' +
            '<i class="fas fa-chevron-down" id="icon-' + sec.id + '"' + (aberta ? ' style="transform:rotate(180deg)"' : '') + '></i></div>' +
            '<div class="menu-section-content' + (aberta ? ' open' : '') + '" id="' + sec.id + '">' + corpo + '</div></div>';
    }).join('\n');
}

window.renderMenuLateral = function () {
    const hash = window.location.hash.substring(1) || 'pdv';
    const isAtivo = (rota) => hash === rota
        ? 'background:var(--primary-light); color:var(--primary-color); font-weight:600;'
        : '';

    // Atualiza cabeçalho depois
    setTimeout(async () => {
        try {
            const configArr = window.normalizarArray(await apiGet('configuracoes'));
            const config = configArr[0] || {};
            const logoEmpresa = config.urlLogo || config.urlIcone || '';
            const nomeEmpresa = config.nomeImpressao || 'App Restaurante';

            const headerDiv = document.getElementById('menu-header-titulo');
            if (headerDiv) {
                headerDiv.innerHTML = `
                    ${logoEmpresa ? `<img alt="Logo" src="${logoEmpresa}" style="height:30px; max-width:100px; object-fit:contain; border-radius:4px; margin-right:8px;">` : ''}
                    <span style="${logoEmpresa ? 'display:none;' : ''}">${nomeEmpresa}</span>
                `;
            }
        } catch (e) {
            console.error('Erro ao carregar config do menu:', e);
        }
    }, 50);

    return [
        '<div class="menu-overlay" id="menu-overlay" onclick="fecharMenu()"></div>',

        '<div class="menu-lateral" id="menu-lateral">',

        // Cabeçalho
        '    <div class="menu-header">',
        '        <button class="icon-btn btn-fechar-gaveta" onclick="fecharMenu()" id="btn-fechar-menu">',
        '            <i class="fas fa-times"></i>',
        '        </button>',
        '        <div class="menu-titulo" id="menu-header-titulo" style="display:flex; align-items:center; gap:10px;">',
        '            <span>Carregando...</span>',
        '        </div>',
        '        <button class="hamburger" onclick="toggleMenuCollapse()" id="btn-hamburger" title="Recolher/Expandir Menu">',
        '            <span></span><span></span><span></span>',
        '        </button>',
        '    </div>',

        // Corpo do menu
        '    <div class="menu-body">',

        // --- ITEM EXCLUSIVO MOBILE/TABLET ---
        '        <div class="menu-item menu-item-mobile" onclick="navigateTo(\'home\'); fecharMenuMobile();" title="Menu Principal" style="' + isAtivo('home') + '">',
        '            <i class="fas fa-home"></i>',
        '            <span>Menu Principal</span>',
        '        </div>',

        // --- ITENS PRINCIPAIS ---
        '        <div class="menu-item" onclick="navigateTo(\'pdv\'); fecharMenuMobile();" style="' + isAtivo('pdv') + '">',
        '            <i class="fas fa-cash-register"></i>',
        '            <span>PDV</span>',
        '        </div>',

        '        <div class="menu-item" onclick="navigateTo(\'cozinha\'); fecharMenuMobile();" style="' + isAtivo('cozinha') + '">',
        '            <i class="fas fa-fire"></i>',
        '            <span>Cozinha</span>',
        '        </div>',

        '        <div class="menu-item" onclick="navigateTo(\'caixa\'); fecharMenuMobile();" style="' + isAtivo('caixa') + '">',
        '            <i class="fas fa-money-bill-wave"></i>',
        '            <span>Caixa</span>',
        '        </div>',

        '        <div class="menu-item" onclick="navigateTo(\'garcom\'); fecharMenuMobile();" style="' + isAtivo('garcom') + '">',
        '            <i class="fas fa-user-tie"></i>',
        '            <span>Garçom</span>',
        '        </div>',

        '        <div class="menu-item" onclick="navigateTo(\'comandas\'); fecharMenuMobile();" style="' + isAtivo('comandas') + '">',
        '            <i class="fas fa-clipboard-list"></i>',
        '            <span>Comandas</span>',
        '        </div>',

        // 🔥 NOVO ITEM: CARDÁPIO DO DIA
        '        <div class="menu-item" onclick="navigateTo(\'cardapio-dia\'); fecharMenuMobile();" style="' + isAtivo('cardapio-dia') + '">',
        '            <i class="fas fa-utensils"></i>',
        '            <span>Cardápio do Dia</span>',
        '        </div>',

        '        <div class="menu-item" onclick="navigateTo(\'qrcodes\'); fecharMenuMobile();" style="' + isAtivo('qrcodes') + '">',
        '            <i class="fas fa-qrcode"></i>',
        '            <span>QR Codes</span>',
        '        </div>',

        '        <hr class="menu-divider">',

        // --- SEÇÕES (Cadastros em submenus; tudo em ordem alfabética) ---
        secoesMenuHtml(isAtivo, hash),

        // --- RODAPÉ ---
        '        <div class="menu-item" style="margin-top:20px; border-top:1px solid #f0f0f0; padding-top:15px;" onclick="navigateTo(\'avaliacao\')">',
        '            <i class="fas fa-star" style="color:#ffc107;"></i>',
        '            <div>',
        '                <span style="display:block; font-weight:600; font-size:0.9rem; color:#333;">Avalie o Comandas</span>',
        '                <span style="display:block; font-size:0.7rem; color:#6b6b6b;">Conte o que achou, direto ao desenvolvedor</span>',
        '            </div>',
        '        </div>',

        '        <div style="margin-top:14px;">' + (window.rodapeVersaoHtml ? window.rodapeVersaoHtml('padding:8px 0;') : '') + '</div>',
        '    </div>',
        '</div>'
    ].join('\n');
};

// ============================================================
// CONTROLE DO MENU
// ============================================================
window.abrirMenu = function () {
    document.getElementById('menu-lateral').classList.add('open');
    document.getElementById('menu-overlay').classList.add('open');
};

window.fecharMenu = function () {
    document.getElementById('menu-lateral').classList.remove('open');
    document.getElementById('menu-overlay').classList.remove('open');
};

window.fecharMenuMobile = function () {
    if (window.innerWidth < 1024) window.fecharMenu();
};

window.toggleMenuCollapse = function () {
    const body = document.body;
    body.classList.toggle('menu-collapsed');
    const btn = document.getElementById('btn-hamburger');
    if (btn) {
        btn.title = body.classList.contains('menu-collapsed') ? 'Expandir Menu' : 'Recolher Menu';
    }
};

window.toggleSecao = function (id) {
    const content = document.getElementById(id);
    const icon = document.getElementById('icon-' + id);
    if (!content) return;

    if (content.classList.contains('open')) {
        content.classList.remove('open');
        if (icon) icon.style.transform = 'rotate(0deg)';
    } else {
        content.classList.add('open');
        if (icon) icon.style.transform = 'rotate(180deg)';
    }
};

window.avaliarApp = function () { window.navigateTo('avaliacao'); };   // o app não está em loja: a avaliação vai direto ao desenvolvedor