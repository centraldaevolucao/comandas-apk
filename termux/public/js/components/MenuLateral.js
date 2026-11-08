// ============================================================
// MENULATERAL.JS — Menu Lateral Global
// ============================================================

console.log('✔ MenuLateral.js carregado');

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
            const logoEmpresa = config.urlLogo || '';
            const nomeEmpresa = config.nomeImpressao || 'App Restaurante';

            const headerDiv = document.getElementById('menu-header-titulo');
            if (headerDiv) {
                headerDiv.innerHTML = `
                    ${logoEmpresa ? `<img src="${logoEmpresa}" style="height:30px; max-width:100px; object-fit:contain; border-radius:4px; margin-right:8px;">` : ''}
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

        // --- SEÇÃO: CADASTROS ---
        '        <div class="menu-section">',
        '            <div class="menu-section-header" onclick="toggleSecao(\'sec-cadastros\')">',
        '                <span>Cadastros</span>',
        '                <i class="fas fa-chevron-down" id="icon-sec-cadastros"></i>',
        '            </div>',
        '            <div class="menu-section-content" id="sec-cadastros">',

        '                <div class="menu-item sub-item" onclick="navigateTo(\'produtos\'); fecharMenuMobile();" style="' + isAtivo('produtos') + '">',
        '                    <i class="fas fa-box"></i> <span>Produtos</span>',
        '                </div>',

        '                <div class="menu-item sub-item" onclick="navigateTo(\'grupos\'); fecharMenuMobile();" style="' + isAtivo('grupos') + '">',
        '                    <i class="fas fa-layer-group"></i> <span>Grupos de Produtos</span>',
        '                </div>',

        '                <div class="menu-item sub-item" onclick="navigateTo(\'adicionais\'); fecharMenuMobile();" style="' + isAtivo('adicionais') + '">',
        '                    <i class="fas fa-plus-circle"></i> <span>Adicionais</span>',
        '                </div>',

        '                <div class="menu-item sub-item" onclick="navigateTo(\'clientes\'); fecharMenuMobile();" style="' + isAtivo('clientes') + '">',
        '                    <i class="fas fa-users"></i> <span>Clientes</span>',
        '                </div>',

        '                <div class="menu-item sub-item" onclick="navigateTo(\'mesas\'); fecharMenuMobile();" style="' + isAtivo('mesas') + '">',
        '                    <i class="fas fa-chair"></i> <span>Mesas</span>',
        '                </div>',

        '                <div class="menu-item sub-item" onclick="navigateTo(\'colaboradores\'); fecharMenuMobile();" style="' + isAtivo('colaboradores') + '">',
        '                    <i class="fas fa-id-badge"></i> <span>Colaboradores</span>',
        '                </div>',

        '                <div class="menu-item sub-item" onclick="navigateTo(\'funcoes\'); fecharMenuMobile();" style="' + isAtivo('funcoes') + '">',
        '                    <i class="fas fa-briefcase"></i> <span>Funções</span>',
        '                </div>',

        '                <div class="menu-item sub-item" onclick="navigateTo(\'niveis-acesso\'); fecharMenuMobile();" style="' + isAtivo('niveis-acesso') + '">',
        '                    <i class="fas fa-shield-alt"></i> <span>Níveis de Acesso</span>',
        '                </div>',

        '                <div class="menu-item sub-item" onclick="navigateTo(\'usuarios\'); fecharMenuMobile();" style="' + isAtivo('usuarios') + '">',
        '                    <i class="fas fa-user-cog"></i> <span>Usuários</span>',
        '                </div>',

        '                <div class="menu-item sub-item" onclick="navigateTo(\'controle-perdas\'); fecharMenuMobile();" style="' + isAtivo('controle-perdas') + '">',
        '                    <i class="fas fa-ban"></i> <span>Controle de Perdas</span>',
        '                </div>',

        '                <div class="menu-item sub-item" onclick="navigateTo(\'movimentacao-estoque\'); fecharMenuMobile();" style="' + isAtivo('movimentacao-estoque') + '">',
        '                    <i class="fas fa-arrow-up"></i> <span>Movimentação de Estoque</span>',
        '                </div>',

        '            </div>',
        '        </div>',

        // --- SEÇÃO: RELATÓRIOS ---
        '        <div class="menu-section">',
        '            <div class="menu-section-header" onclick="toggleSecao(\'sec-relatorios\')">',
        '                <span>Relatórios</span>',
        '                <i class="fas fa-chevron-down" id="icon-sec-relatorios"></i>',
        '            </div>',
        '            <div class="menu-section-content" id="sec-relatorios">',

        '                <div class="menu-item sub-item" onclick="navigateTo(\'relatorios\'); fecharMenuMobile();" style="' + isAtivo('relatorios') + '">',
        '                    <i class="fas fa-chart-line"></i> <span>Visão Geral</span>',
        '                </div>',

        '                <div class="menu-item sub-item" onclick="navigateTo(\'comandas-arquivadas\'); fecharMenuMobile();" style="' + isAtivo('comandas-arquivadas') + '">',
        '                    <i class="fas fa-calendar"></i> <span>Comandas Arquivadas</span>',
        '                </div>',

        '                <div class="menu-item sub-item" onclick="navigateTo(\'produtos-vendidos\'); fecharMenuMobile();" style="' + isAtivo('produtos-vendidos') + '">',
        '                    <i class="fas fa-chart-bar"></i> <span>Produtos Vendidos</span>',
        '                </div>',

        '                <div class="menu-item sub-item" onclick="navigateTo(\'totais-especie\'); fecharMenuMobile();" style="' + isAtivo('totais-especie') + '">',
        '                    <i class="fas fa-coins"></i> <span>Totais por Espécie</span>',
        '                </div>',

        '                <div class="menu-item sub-item" onclick="navigateTo(\'relatorio-estoque\'); fecharMenuMobile();" style="' + isAtivo('relatorio-estoque') + '">',
        '                    <i class="fas fa-clipboard-check"></i> <span>Estoque</span>',
        '                </div>',

        '            </div>',
        '        </div>',

        '        <hr class="menu-divider">',

        // --- SEÇÃO: CONFIGURAÇÕES ---
        '        <div class="menu-section">',
        '            <div class="menu-section-header" onclick="toggleSecao(\'sec-config\')">',
        '                <span>Configurações</span>',
        '                <i class="fas fa-chevron-down" id="icon-sec-config"></i>',
        '            </div>',
        '            <div class="menu-section-content" id="sec-config">',

        '                <div class="menu-item sub-item" onclick="navigateTo(\'configuracoes\'); fecharMenuMobile();" style="' + isAtivo('configuracoes') + '">',
        '                    <i class="fas fa-cogs"></i> <span>Ajustes Gerais</span>',
        '                </div>',

        '                <div class="menu-item sub-item" onclick="navigateTo(\'grupos-trabalho\'); fecharMenuMobile();" style="' + isAtivo('grupos-trabalho') + '">',
        '                    <i class="fas fa-users-cog"></i> <span>Grupos de Trabalho</span>',
        '                </div>',

        '                <div class="menu-item sub-item" onclick="navigateTo(\'impressoras\'); fecharMenuMobile();" style="' + isAtivo('impressoras') + '">',
        '                    <i class="fas fa-print"></i> <span>Impressoras</span>',
        '                </div>',

        '                <div class="menu-item sub-item" onclick="navigateTo(\'parcelas\'); fecharMenuMobile();" style="' + isAtivo('parcelas') + '">',
        '                    <i class="fas fa-credit-card"></i> <span>Parcelas</span>',
        '                </div>',

        '                <div class="menu-item sub-item" onclick="navigateTo(\'backup\'); fecharMenuMobile();" style="' + isAtivo('backup') + '">',
        '                    <i class="fas fa-cloud-upload-alt"></i> <span>Backup</span>',
        '                </div>',

        '                <div class="menu-item sub-item" onclick="navigateTo(\'assinatura\'); fecharMenuMobile();" style="' + isAtivo('assinatura') + '">',
        '                    <i class="fas fa-crown"></i> <span>Minha Assinatura</span>',
        '                </div>',

        '                <div class="menu-item sub-item" onclick="navigateTo(\'suporte\'); fecharMenuMobile();" style="' + isAtivo('suporte') + '">',
        '                    <i class="fas fa-headset"></i> <span>Suporte</span>',
        '                </div>',

        '            </div>',
        '        </div>',

        // --- RODAPÉ ---
        '        <div class="menu-item" style="margin-top:20px; border-top:1px solid #f0f0f0; padding-top:15px;" onclick="avaliarApp()">',
        '            <i class="fas fa-star" style="color:#ffc107;"></i>',
        '            <div>',
        '                <span style="display:block; font-weight:600; font-size:0.9rem; color:#333;">Gostou do App?</span>',
        '                <span style="display:block; font-size:0.7rem; color:#888;">Faça sua avaliação</span>',
        '            </div>',
        '        </div>',

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

window.avaliarApp = function () {
    window.open('https://play.google.com/store', '_blank');
};