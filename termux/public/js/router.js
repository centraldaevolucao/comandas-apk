// ============================================================
// ROUTER.JS — Navegação do Sistema (Com controle da Cozinha)
// ============================================================

console.log('✔ router.js carregado');

window.ROTAS = {
    'home':                     'renderAtalhos',
    'atalhos':                  'renderAtalhos',
    'pdv':                      'renderPDV',
    'comandas':                 'renderComandas',
    'nova-comanda':             'renderNovaComanda',
    'detalhe-comanda':          'renderDetalheComanda',
    'editar-comanda':           'renderEditarComanda',
    'pedidos-pendentes':        'renderPedidosPendentes',
    'garcom':                   'renderGarcom',
    'cozinha':                  'renderCozinha', // 🔥 Rota principal
    'caixa':                    'renderCaixa',
    'resumo-caixa':             'renderResumoCaixa',
    'historico-caixa':          'renderHistoricoCaixa',
    'cardapio':                 'renderCardapio',
    'cardapio-dia':             'renderCardapioDia',
    'qrcodes':                  'renderQRCodes',
    'produtos':                 'renderProdutos',
    'cadastro-produto':         'renderCadastroProduto',
    'grupos':                   'renderGrupos',
    'cadastro-grupo':           'renderCadastroGrupo',
    'grupos-trabalho':          'renderGruposTrabalho',
    'adicionais':               'renderAdicionais',
    'cadastro-adicional':       'renderCadastroAdicional',
    'clientes':                 'renderClientes',
    'pendencias':               'renderPendencias',
    'cadastro-cliente':         'renderCadastroCliente',
    'mesas':                    'renderMesas',
    'cadastro-mesa':            'renderCadastroMesa',
    'colaboradores':            'renderColaboradores',
    'cadastro-colaborador':     'renderCadastroColaborador',
    'funcoes':                  'renderFuncoes',
    'cadastro-funcao':          'renderCadastroFuncao',
    'niveis-acesso':            'renderNiveisAcesso',
    'cadastro-nivel':           'renderCadastroNivel',
    'usuarios':                 'renderUsuarios',
    'cadastro-usuario-sistema': 'renderCadastroUsuarioSistema',
    'cadastro-cliente-sistema': 'renderCadastroClienteSistema',
    'controle-perdas':          'renderControlePerdas',
    'movimentacao-estoque':     'renderMovimentacaoEstoque',
    'parcelas':                 'renderParcelas',
    'cadastro-parcela':         'renderCadastroParcela',
    'relatorios':               'renderRelatorios',
    'comandas-arquivadas':      'renderComandasArquivadas',
    'produtos-vendidos':        'renderProdutosVendidos',
    'totais-especie':           'renderTotaisEspecie',
    'relatorio-estoque':        'renderRelatorioEstoque',
    'configuracoes':            'renderConfiguracoes',
    'impressoras':              'renderImpressoras',
    'impressoras-local':        'renderImpressorasporLocal',
    'backup':                   'renderBackup',
    'pix':                      'renderPIX',
    'senha':                    'renderSenha',
    'tipo-dispositivo':         'renderTipodeDispositivo',
    'rede':                     'renderRede',
    'assinatura':               'renderAssinatura',
    'suporte':                  'renderSuporte'
};

window.PERMISSOES_ROTA = {
    'home':              null,
    'pdv':               'pdv.acessar',
    'cozinha':           'cozinha.acessar',
    'garcom':            'garcom.acessar',
    'pedidos-pendentes': 'comandas.ver',
    'nova-comanda':      'comandas.criar',
    'editar-comanda':    'comandas.editar',
    'caixa':             'caixa.abrir',
    'resumo-caixa':      'caixa.abrir',
    'historico-caixa':   'caixa.historico',
    'produtos':          'produtos.ver',
    'cadastro-produto':  'produtos.editar',
    'grupos':            'grupos.editar',
    'cadastro-grupo':    'grupos.editar',
    'grupos-trabalho':   'configuracoes.editar',
    'adicionais':        'adicionais.editar',
    'cadastro-adicional':'adicionais.editar',
    'clientes':          'clientes.ver',
    'pendencias':        'clientes.ver',
    'cadastro-cliente':  'clientes.editar',
    'mesas':             'mesas.editar',
    'cadastro-mesa':     'mesas.editar',
    'colaboradores':     'colaboradores.ver',
    'cadastro-colaborador': 'colaboradores.editar',
    'funcoes':           'colaboradores.ver',
    'cadastro-funcao':   'colaboradores.editar',
    'niveis-acesso':     'colaboradores.ver',
    'cadastro-nivel':    'colaboradores.editar',
    'usuarios':          'usuarios.gerenciar',
    'cadastro-usuario-sistema': 'usuarios.gerenciar',
    'controle-perdas':   'perdas.registrar',
    'movimentacao-estoque': 'estoque.movimentar',
    'parcelas':          'configuracoes.ver',
    'cadastro-parcela':  'configuracoes.editar',
    'relatorios':        'relatorios.ver',
    'comandas-arquivadas': 'relatorios.ver',
    'produtos-vendidos': 'relatorios.ver',
    'totais-especie':    'relatorios.ver',
    'relatorio-estoque': 'relatorios.ver',
    'configuracoes':     'configuracoes.ver',
    'impressoras':       'configuracoes.editar',
    'impressoras-local': 'configuracoes.editar',
    'backup':            'backup.gerenciar',
    'pix':               'configuracoes.editar',
    'senha':             'configuracoes.editar',
    'tipo-dispositivo':  'configuracoes.ver',
    'rede':              'configuracoes.ver',
    'cardapio-dia':      'configuracoes.editar',
    'qrcodes':           'mesas.editar'
};

function rotaPermitida(rota) {
    if (typeof window.perfilPermiteRota === 'function' && !window.perfilPermiteRota(rota)) return false;
    if (rota === 'home') return true;

    const perm = window.PERMISSOES_ROTA[rota];
    if (!perm) return true;
    if (typeof window.podeAcessar === 'function') return window.podeAcessar(perm);
    if (typeof window.temPermissao === 'function') return window.temPermissao(perm);
    return true;
}

function rotaBloqueadaMsg(rota) {
    if (typeof window.perfilDados === 'function' && window.perfilDados() && !window.perfilPermiteRota(rota))
        return 'Esta tela não está disponível para a função ' + window.perfilDados().nome + ' deste aparelho.';
    const perm = window.PERMISSOES_ROTA[rota];
    const logado = typeof window.estaLogado === 'function' ? window.estaLogado() : false;
    if (!logado) return 'Esta tela requer login.\n\nEntre pelo menu lateral.';
    if (perm && typeof window.ehFeaturePremium === 'function' && window.ehFeaturePremium(perm))
        return 'Esta funcionalidade é exclusiva do plano Premium.';
    return 'Você não tem permissão para acessar esta tela.';
}

window.rotaOrigem = 'pdv';

window.navigateTo = function(rota) {
    console.log('🧭 navigateTo:', rota);

    if (document.body.classList.contains('cliente-qrcode') ||
        document.body.classList.contains('modo-garcom')) return;

    const nomeFuncao = window.ROTAS[rota];
    if (!nomeFuncao) {
        console.warn('Rota não encontrada:', rota);
        return;
    }

    const grupoBloqueado = window.licencaBloqueia ? window.licencaBloqueia(rota) : null;   // plano gratuito / assinatura vencida
    if (grupoBloqueado) { window.licencaMostrarBloqueio(grupoBloqueado); return; }

    if (!rotaPermitida(rota)) {
        if (typeof window.mostrarToast === 'function')
            window.mostrarToast('🔒 ' + rotaBloqueadaMsg(rota).split('\n')[0]);
        else alert(rotaBloqueadaMsg(rota));
        return;
    }

    const fn = window[nomeFuncao];
    if (typeof fn !== 'function') {
        console.warn('Módulo não carregado:', nomeFuncao);
        const app = document.getElementById('app');
        if (app) app.innerHTML =
            '<div style="padding:30px;text-align:center;">' +
            '    <i class="fas fa-exclamation-triangle" style="font-size:3rem;color:#ff9800;"></i>' +
            '    <h2 style="margin-top:15px;">Módulo não carregado</h2>' +
            '    <p style="color:#666;margin-top:10px;">A função <code>' + nomeFuncao + '</code> não está definida.</p>' +
            '    <button class="btn-outline" style="margin-top:15px;" onclick="navigateTo(\'pdv\')">Voltar ao PDV</button>' +
            '</div>';
        return;
    }

    const app = document.getElementById('app');
    if (!app) return;

    const rotasComanda = ['detalhe-comanda', 'editar-comanda', 'nova-comanda'];
    const rotaAtual = window.location.hash.substring(1) || 'pdv';
    if (!rotasComanda.includes(rota) && !rotasComanda.includes(rotaAtual)) {
        window.rotaOrigem = rota;
    }

    try {
        // 🔥 CONTROLE DO BOTÃO DA COZINHA (Esconde ao sair da tela)
        if (typeof window.sairDaCozinha === 'function') {
            window.sairDaCozinha();
        }

        const semMenu = typeof window.perfilDados === 'function' && window.perfilDados() && !window.perfilDados().menu;
        const htmlMenu = (!semMenu && typeof window.renderMenuLateral === 'function') ? window.renderMenuLateral() : '';
        const htmlTela = fn();
        app.innerHTML = htmlMenu + htmlTela;

        if (typeof window.aplicarPermissoesUI === 'function') window.aplicarPermissoesUI();
        if (typeof window.aplicarPerfilUI === 'function') window.aplicarPerfilUI();

        // Pilha de telas própria: "voltar" sempre volta à tela anterior de verdade (e depois de salvar um cadastro
        // não fica repetindo a lista). O histórico do navegador só guarda a rota atual.
        try {
            const p = window.__pilha;
            if (!window.__navVoltando) {
                const i = p.lastIndexOf(rota);
                if (p[p.length - 1] === rota) { /* atualização da mesma tela */ }
                else if (i >= 0 && !/^(detalhe-|editar-|nova-|cadastro-|resumo-)/.test(rota)) p.length = i + 1;   // voltou a uma tela já aberta (ex.: lista após salvar, Menu): descarta o que veio depois
                else { p.push(rota); if (p.length > 40) p.shift(); }
            }
            history.replaceState({ rota: rota }, '', '#' + rota);
        } catch (e) {}

        const content = app.querySelector('.content-area');
        if (content) content.scrollTop = 0;
    } catch (e) {
        console.error('❌ Erro ao renderizar', rota, e);
        app.innerHTML =
            '<div style="padding:20px;text-align:center;color:#c62828;">' +
            '    <i class="fas fa-bug" style="font-size:2.5rem;"></i>' +
            '    <h3 style="margin-top:10px;">Erro ao abrir <b>' + rota + '</b></h3>' +
            '    <p style="font-size:0.85rem;margin-top:10px;background:#fff3e0;padding:10px;border-radius:6px;text-align:left;word-break:break-word;font-family:monospace;">' +
                     String(e && e.message ? e.message : e) +
            '    </p>' +
            '    <button class="btn-outline" style="margin-top:15px;" onclick="navigateTo(\'pdv\')">Voltar ao PDV</button>' +
            '</div>';
    }
};

window.__pilha = [];
window.__profundidade = function () { return window.__pilha.length; };

function __rotaPrincipal() {
    const pd = window.perfilDados ? window.perfilDados() : null;
    return pd ? (pd.menu ? 'home' : (window.perfilRotaInicial ? window.perfilRotaInicial() : 'pdv')) : 'home';
}

// Botão "voltar" de TODAS as telas: volta para a tela de onde o usuário veio; sem tela anterior, vai ao Menu Principal.
window.voltarTela = function () {
    const p = window.__pilha;
    const principal = __rotaPrincipal();
    const atual = (location.hash || '#home').substring(1) || 'home';
    let destino = principal;
    if (p.length > 1) { p.pop(); destino = p[p.length - 1]; }
    else if (atual === principal) return false;                     // já no início
    else { window.__pilha = []; }
    window.__navVoltando = true;
    try { window.navigateTo(destino); } finally { window.__navVoltando = false; }
    if ((location.hash || '').substring(1) !== destino) {            // destino bloqueado (permissão/licença): fica onde estava
        if (p[p.length - 1] !== atual) p.push(atual);
        return false;
    }
    if (!window.__pilha.length) window.__pilha.push(destino);
    return true;
};
window.voltar = window.voltarTela;

window.addEventListener('popstate', function (e) {
    if (e.state && e.state.rota && ('#' + e.state.rota) !== location.hash) {
        window.__navPop = true;
        try { window.navigateTo(e.state.rota); } finally { window.__navPop = false; }
    }
});
