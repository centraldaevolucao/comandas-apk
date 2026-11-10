// ============================================================
// PERFIL.JS — Funções do aparelho (Garçom, Cozinha, Caixa, Cardápio do dia)
//
//  • Modo ÚNICO ou SERVIDOR  → acesso total (nenhum perfil).
//  • Modo CLIENTE            → o aparelho tem uma função (Configurações > Tipo de dispositivo).
//  • Endereços /caixa, /cozinha e /cardapio abrem direto na função (como o /garcom), sem instalar nada.
//
// Aviso: é uma limitação de TELAS (menu, atalhos e navegação). O servidor continua sem login nos dados;
// use Wi-Fi/hotspot com senha.
// ============================================================
console.log('✔ perfil.js carregado');

(function () {
    'use strict';

    const ROTAS_COMANDA = ['pdv', 'comandas', 'nova-comanda', 'detalhe-comanda', 'editar-comanda', 'pedidos-pendentes'];

    window.PERFIS = {
        garcom:   { nome: 'Garçom',            icone: 'fa-person-walking', rotas: ROTAS_COMANDA.slice(), inicial: 'home', menu: true },
        cozinha:  { nome: 'Cozinha',           icone: 'fa-fire-burner',    rotas: ['cozinha'],           inicial: 'home', menu: true },
        caixa:    { nome: 'Caixa',             icone: 'fa-cash-register',  rotas: ['caixa', 'resumo-caixa', 'historico-caixa'].concat(ROTAS_COMANDA), inicial: 'home', menu: true },
        cardapio: { nome: 'Cardápio do dia',   icone: 'fa-book-open',      rotas: ['cardapio-dia'],      inicial: 'cardapio-dia', menu: false }
    };

    // ---------- Funções cadastradas (Colaboradores › Funções) ----------
    // Cada função tem um nível de acesso; o nível lista as telas/funções liberadas. Aqui isso vira um perfil de aparelho.
    function ler(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
    function gravar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
    const norm = function (t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); };

    window.FUNCOES_PADRAO = [
        { id: 1, nome: 'Garçom', nivelAcesso: 'atendente', modoCliente: true },
        { id: 2, nome: 'Atendente', nivelAcesso: 'atendente', modoCliente: true },
        { id: 3, nome: 'Caixa', nivelAcesso: 'caixa', modoCliente: true },
        { id: 4, nome: 'Cozinheiro', nivelAcesso: 'cozinha', modoCliente: true },
        { id: 5, nome: 'Barman', nivelAcesso: 'cozinha', modoCliente: true },
        { id: 6, nome: 'Gerente', nivelAcesso: 'gerente', modoCliente: false },
        { id: 7, nome: 'Recepcionista', nivelAcesso: 'atendente', modoCliente: true }
    ];
    window.__niveisCache = ler('niveisCache') || [];
    window.__funcoesCache = ler('funcoesCache') || [];

    function nivelDaFuncao(f) {
        if (f.nivelAcesso) return f.nivelAcesso;
        const n = norm(f.nome);
        if (n.indexOf('caixa') >= 0) return 'caixa';
        if (n.indexOf('cozinh') >= 0 || n.indexOf('chapeiro') >= 0 || n.indexOf('barman') >= 0) return 'cozinha';
        if (n.indexOf('gerente') >= 0) return 'gerente';
        return 'atendente';
    }

    function rotasDasPermissoes(perms) {
        const todas = perms.indexOf('*') >= 0;
        const mapa = window.PERMISSOES_ROTA || {};
        const rotas = [];
        Object.keys(mapa).forEach(function (r) { if (mapa[r] && (todas || perms.indexOf(mapa[r]) >= 0)) rotas.push(r); });
        const comanda = todas || perms.some(function (p) { return p.indexOf('comandas.') === 0 || p === 'pdv.acessar' || p === 'garcom.acessar'; });
        if (comanda) ROTAS_COMANDA.forEach(function (r) { if (rotas.indexOf(r) < 0) rotas.push(r); });
        if (todas) Object.keys(window.ROTAS || {}).forEach(function (r) { if (rotas.indexOf(r) < 0) rotas.push(r); });
        return rotas;
    }

    window.funcoesModoCliente = function () {
        const base = (window.__funcoesCache && window.__funcoesCache.length) ? window.__funcoesCache : window.FUNCOES_PADRAO;
        return base.filter(function (f) { return f.modoCliente !== false; });
    };

    function construirPerfis() {
        Object.keys(window.PERFIS).forEach(function (k) { if (k.indexOf('f:') === 0) delete window.PERFIS[k]; });
        window.funcoesModoCliente().forEach(function (f) {
            const nivel = nivelDaFuncao(f);
            const perms = (window.permissoesDoNivel && window.permissoesDoNivel(nivel)) || [];
            window.PERFIS['f:' + f.id] = {
                nome: f.nome, icone: f.icone || 'fa-id-badge', rotas: rotasDasPermissoes(perms), inicial: 'home', menu: true,
                nivel: nivel, livre: norm(f.nome) === 'garcom' || norm(f.nome) === 'atendente' && false, registrada: true
            };
        });
    }

    /** Baixa funções, níveis e a configuração de login/treinamento do servidor e recria os perfis. */
    window.carregarPerfisDinamicos = async function () {
        try {
            const norma = window.normalizarArray;
            const f = norma(await window.apiGet('funcoes')), n = norma(await window.apiGet('niveisAcesso'));
            window.__funcoesCache = f; window.__niveisCache = n; gravar('funcoesCache', f); gravar('niveisCache', n);
            const c = norma(await window.apiGet('configuracoes'))[0] || {};
            window.__cfgLogin = { exigir: c.exigirLogin !== false, treinamento: c.modoTreinamento === true };
            gravar('cfgLogin', window.__cfgLogin);
        } catch (e) {}
        construirPerfis();
    };
    window.__cfgLogin = ler('cfgLogin') || { exigir: true, treinamento: false };
    construirPerfis();
    let ultimoCx = '';
    window.addEventListener('cx:status', function (ev) {
        const e = ((ev && ev.detail) || window.CX || {}).estado;
        if (e === 'conectado' && ultimoCx !== 'conectado') window.carregarPerfisDinamicos().then(function () { if (window.aplicarPerfilUI) window.aplicarPerfilUI(); });
        ultimoCx = e;
    });

    // Endereços que fixam a função do navegador (não dependem de configuração salva)
    const CAMINHOS = { '/caixa': 'caixa', '/cozinha': 'cozinha', '/cardapio': 'cardapio' };

    function caminho() { return window.location.pathname.replace(/\/+$/, '') || '/'; }

    /** Função fixada pelo endereço (ou null). Calculada na hora, antes de qualquer configuração carregar. */
    window.perfilPorUrl = function () { return CAMINHOS[caminho()] || null; };

    /** Aparelhos que NÃO devem gravar a configuração do servidor (navegadores de clientes, garçom web, QR). */
    window.__semConfigLocal = !!(window.perfilPorUrl() || caminho() === '/garcom' || window.location.pathname.indexOf('/mesa/') === 0);

    /** Função em uso: pelo endereço; senão, a do aparelho em modo cliente; senão null (acesso total). */
    window.perfilAtivo = function () {
        const porUrl = window.perfilPorUrl();
        if (porUrl) return porUrl;
        const mt = window.MT || {};
        if (mt.tipoDispositivo === 'cliente') {
            if (mt.funcaoDispositivo === 'treinamento') return null;   // administrador: acesso total (Modo Treinamento)
            return window.PERFIS[mt.funcaoDispositivo] ? mt.funcaoDispositivo : 'garcom'; // sem escolha: o mais restrito
        }
        return null;
    };

    window.perfilDados = function () { const id = window.perfilAtivo(); return id ? window.PERFIS[id] : null; };

    window.perfilRotaInicial = function () { const p = window.perfilDados(); return p ? p.inicial : 'pdv'; };

    window.perfilPermiteRota = function (rota) {
        const p = window.perfilDados();
        if (!p) return true;
        if (rota === 'rede' || rota === 'tipo-dispositivo') return true;   // todo aparelho pode ver/corrigir a própria conexão
        if (rota === 'home' || rota === 'atalhos') return p.menu;
        return p.rotas.indexOf(rota) >= 0;
    };

    /** Esconde do menu lateral e do Menu Principal o que a função não pode usar. Chamado após cada tela. */
    window.aplicarPerfilUI = function () {
        const mtt = window.MT || {};
        const treino = mtt.tipoDispositivo === 'cliente' && mtt.funcaoDispositivo === 'treinamento';
        let faixa = document.getElementById('faixa-treinamento');
        if (treino && !faixa) {
            faixa = document.createElement('div'); faixa.id = 'faixa-treinamento';
            faixa.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:4px;z-index:250000;background:#ff6f00;color:#fff;font-size:.7rem;font-weight:700;padding:3px 12px;border-radius:12px;pointer-events:none;letter-spacing:.5px;';
            faixa.textContent = 'MODO TREINAMENTO · ADMINISTRADOR';
            document.body.appendChild(faixa);
        } else if (!treino && faixa) faixa.remove();
        const p = window.perfilDados();
        const body = document.body;
        body.classList.toggle('perfil-ativo', !!p);
        body.classList.toggle('perfil-sem-menu', !!p && !p.menu);
        if (!p) return;

        const app = document.getElementById('app');
        if (!app) return;
        const permitido = function (el) {
            const m = /navigateTo\(\s*['"]([\w-]+)['"]/.exec(el.getAttribute('onclick') || '');
            return m ? window.perfilPermiteRota(m[1]) : null; // null = não é um item de navegação
        };

        // Menu lateral: itens, seções vazias, rodapé "avaliar"
        app.querySelectorAll('#menu-lateral .menu-item').forEach(function (el) {
            const ok = permitido(el);
            if (ok === false) el.remove();
            else if (ok === null && /avaliarApp/.test(el.getAttribute('onclick') || '')) el.remove();
        });
        app.querySelectorAll('#menu-lateral .menu-section').forEach(function (sec) {
            if (!sec.querySelector('.menu-item')) sec.remove();
        });

        // Menu Principal (cartões)
        app.querySelectorAll('.content-area div[onclick*="navigateTo("]').forEach(function (el) {
            if (permitido(el) === false) el.remove();
        });

        // Nome da função no menu
        const titulo = document.getElementById('menu-header-titulo');
        if (titulo && !titulo.querySelector('.perfil-rotulo')) {
            const r = document.createElement('small');
            r.className = 'perfil-rotulo';
            r.style.cssText = 'display:block;font-size:0.7rem;font-weight:400;opacity:0.85;';
            r.textContent = 'Função: ' + p.nome;
            titulo.appendChild(r);
        }
    };

    // O menu principal e o lateral são montados de forma assíncrona (logo, nome): reaplica logo depois
    const antigaRender = window.navigateTo;
    document.addEventListener('DOMContentLoaded', function () {
        setInterval(function () { if (window.perfilAtivo && window.perfilAtivo()) window.aplicarPerfilUI(); }, 400);
    });

    window.rotaOrigem = window.perfilRotaInicial ? window.perfilRotaInicial() : 'pdv';
})();
