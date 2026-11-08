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

window.temPermissao = function (permissao) {
    const u = window.obterUsuarioLogado();
    if (!u) return true;
    if (u.isDono || u.nivel === 'admin') return true;
    if (Array.isArray(u.permissoes) && u.permissoes.indexOf('*') >= 0) return true;
    if (Array.isArray(u.permissoes) && u.permissoes.indexOf(permissao) >= 0) return true;
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
window.LIMITE_COMANDAS_DIA = 20;

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