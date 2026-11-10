// ============================================================
// PERMISSIONS.JS — Sessão via cookie HttpOnly + permissões
// ============================================================

console.log('✔ permissions.js carregado');

window.SESSION = {
    usuario: null
};

window.estaLogado = function () {
    return !!(window.SESSION.usuario && window.SESSION.usuario.id);
};

window.obterUsuarioLogado = function () {
    return window.SESSION.usuario;
};

window.fazerLogout = async function () {
    if (!await window.confirmar('Deseja realmente sair do sistema?')) return;
    try {
        const base = (window.MT && window.MT.apiBase) ? window.MT.apiBase() : '';
        await fetch(base + '/api/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {}
    window.SESSION.usuario = null;
    window.location.reload();
};

window.iniciarSessao = async function () {
    try {
        const base = (window.MT && window.MT.apiBase) ? window.MT.apiBase() : '';
        const res = await fetch(base + '/api/sessao', { credentials: 'include' });
        if (res.ok) {
            const data = await res.json();
            if (data.ok && data.usuario) {
                window.SESSION.usuario = data.usuario;
                window.SESSION.usuario.permissoes = window.SESSION.usuario.permissoes || [];
            }
        }
    } catch (e) {}
};

// ------------------------------------------------------------
// CATÁLOGO DE TELAS E FUNÇÕES (editável por nível de acesso)
// ------------------------------------------------------------
window.PERMISSOES_CATALOGO = [
    { grupo: 'Atendimento', itens: [['pdv.acessar', 'PDV / Comandas'], ['comandas.ver', 'Ver comandas e pedidos pendentes'], ['comandas.criar', 'Criar comandas'], ['comandas.editar', 'Editar comandas'], ['garcom.acessar', 'Tela do garçom']] },
    { grupo: 'Cozinha', itens: [['cozinha.acessar', 'Tela da cozinha']] },
    { grupo: 'Caixa', itens: [['caixa.abrir', 'Caixa: abrir, receber e fechar'], ['caixa.historico', 'Histórico de caixa']] },
    { grupo: 'Cadastros', itens: [['produtos.ver', 'Ver produtos'], ['produtos.editar', 'Editar produtos'], ['grupos.editar', 'Grupos'], ['adicionais.editar', 'Adicionais'], ['clientes.ver', 'Ver clientes e pendências'], ['clientes.editar', 'Editar clientes'], ['mesas.editar', 'Mesas e QR Codes']] },
    { grupo: 'Equipe', itens: [['colaboradores.ver', 'Ver colaboradores, funções e níveis'], ['colaboradores.editar', 'Editar colaboradores, funções e níveis'], ['usuarios.gerenciar', 'Gerenciar usuários e senhas']] },
    { grupo: 'Estoque', itens: [['perdas.registrar', 'Controle de perdas'], ['estoque.movimentar', 'Movimentação de estoque']] },
    { grupo: 'Relatórios', itens: [['relatorios.ver', 'Relatórios']] },
    { grupo: 'Sistema', itens: [['configuracoes.ver', 'Ver configurações'], ['configuracoes.editar', 'Editar configurações, impressoras, PIX e cardápio do dia'], ['backup.gerenciar', 'Backup']] }
];
(function () {
    const todas = []; window.PERMISSOES_CATALOGO.forEach(function (g) { g.itens.forEach(function (i) { todas.push(i[0]); }); });
    window.PERMISSOES_TODAS = todas;
    const atend = ['pdv.acessar', 'comandas.ver', 'comandas.criar', 'comandas.editar', 'garcom.acessar', 'clientes.ver'];
    window.PERMISSOES_PADRAO_NIVEL = {
        admin: ['*'],
        gerente: todas.filter(function (x) { return x !== 'usuarios.gerenciar'; }),
        atendente: atend,
        garcom: atend,
        caixa: atend.concat(['caixa.abrir', 'caixa.historico']),
        cozinha: ['cozinha.acessar']
    };
})();

/** Permissões de um nível (as editadas pelo dono; senão o padrão do nível; senão nenhuma). */
window.permissoesDoNivel = function (nivel) {
    const lista = window.__niveisCache || [];
    const n = lista.find(function (x) { return String(x.id) === String(nivel); });
    if (n && Array.isArray(n.permissoes)) return n.permissoes;
    return window.PERMISSOES_PADRAO_NIVEL[nivel] || null;
};

window.temPermissao = function (permissao) {
    const u = window.obterUsuarioLogado();
    if (!u) return true;
    if (u.isDono || u.nivel === 'admin') return true;
    // O nível de acesso (editável em Níveis de acesso) manda; sem lista editada, vale a permissão gravada no usuário
    const pn = window.permissoesDoNivel(u.nivel);
    const explicito = (window.__niveisCache || []).some(function (x) { return String(x.id) === String(u.nivel) && Array.isArray(x.permissoes); });
    if (explicito) return pn.indexOf('*') >= 0 || pn.indexOf(permissao) >= 0;
    if (Array.isArray(u.permissoes) && u.permissoes.indexOf('*') >= 0) return true;
    if (Array.isArray(u.permissoes) && u.permissoes.indexOf(permissao) >= 0) return true;
    if (pn && (pn.indexOf('*') >= 0 || pn.indexOf(permissao) >= 0)) return true;
    return false;
};

window.podeAcessar = function (permissao) {
    const u = window.obterUsuarioLogado();
    if (!u) return true;
    return window.temPermissao(permissao);
};

// ------------------------------------------------------------
// LIMITE DE COMANDAS
// ------------------------------------------------------------
window.LIMITE_COMANDAS_DIA = 30;

window.comandasCriadasHoje = async function () {
    try {
        const comandas = window.normalizarArray(await window.apiGet('comandas'));
        const hoje = new Date();
        let total = 0;
        comandas.forEach(function (c) {
            const data = window.parseDataBR ? window.parseDataBR(c.dataAbertura) : null;
            if (data && data.getFullYear() === hoje.getFullYear() &&
                data.getMonth() === hoje.getMonth() &&
                data.getDate() === hoje.getDate()) total++;
        });
        return total;
    } catch (e) { return 0; }
};

window.temAssinaturaAtiva = function () {
    if (window.MT && window.MT.assinaturaAtiva) return true;
    return false;
};

window.podeCriarComanda = async function () {
    const usadas = await window.comandasCriadasHoje();
    const limite = window.LIMITE_COMANDAS_DIA;
    if (window.temAssinaturaAtiva()) return { permitido: true, usadas, limite: Infinity };
    if (usadas >= limite) return { permitido: false, usadas, limite, msg: 'Limite de comandas atingido. Ative o Premium.' };
    return { permitido: true, usadas, limite };
};