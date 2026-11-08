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
