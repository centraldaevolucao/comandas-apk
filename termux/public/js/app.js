// ============================================================
// APP.JS — v15 (Responsividade e Menu Sanduíche)
// ============================================================

(function() {
    'use strict';

    function aplicarDispositivo() {
        var w = window.innerWidth;
        
        // No celular e tablet (menor que 1024px), o menu é gaveta e tem o botão sanduíche.
        // No desktop (maior que 1024px), o menu é fixo e NÃO tem o botão sanduíche.
        if (w < 1024) {
            document.body.classList.add('permite-collapse');
            document.body.classList.remove('menu-collapsed'); // Garante que não inicie recolhido no mobile
        } else {
            document.body.classList.remove('permite-collapse');
        }
    }

    async function iniciarApp() {
        aplicarDispositivo();
        window.addEventListener('resize', aplicarDispositivo);

        const appDiv = document.getElementById('app');
        if (!appDiv) return;

        // Verifica Sessão
        if (typeof window.iniciarSessao === 'function') {
            await window.iniciarSessao();
            if (window.carregarPerfisDinamicos) window.carregarPerfisDinamicos().then(function () { if (window.aplicarPerfilUI) window.aplicarPerfilUI(); });
        }

        // ---------------------------------------------------------
        // 🔒 MODO CLIENTE (QR CODE)
        // ---------------------------------------------------------
        if (window.location.pathname.startsWith('/mesa/')) {
            document.body.classList.add('cliente-qrcode');
            document.body.classList.remove('mostrando-abas-cozinha', 'mostrando-abas-pdv', 'tela-login', 'modo-garcom', 'permite-collapse');
            
            // FORÇA ROLAGEM
            document.documentElement.style.setProperty('overflow-y', 'auto', 'important');
            document.documentElement.style.setProperty('height', 'auto', 'important');
            document.body.style.setProperty('overflow-y', 'auto', 'important');
            document.body.style.setProperty('height', 'auto', 'important');
            appDiv.style.setProperty('height', 'auto', 'important');
            appDiv.style.setProperty('overflow', 'visible', 'important');
            
            appDiv.innerHTML = '<div style="padding:40px;text-align:center;"><h2 style="color:var(--primary-color);">Carregando cardápio...</h2></div>';
            
            setTimeout(() => { 
                if (typeof window.renderCardapio === 'function') {
                    appDiv.innerHTML = window.renderCardapio(); 
                } else {
                    appDiv.innerHTML = '<div style="padding:20px;text-align:center;color:#c62828;">Erro: Módulo do cardápio não carregado.</div>';
                }
            }, 100);
            return;
        }

        // ---------------------------------------------------------
        // MODO GARÇOM
        // ---------------------------------------------------------
        if (window.location.pathname === '/garcom') {
            document.body.classList.add('modo-garcom');
            document.body.classList.remove('mostrando-abas-cozinha', 'mostrando-abas-pdv', 'cliente-qrcode', 'permite-collapse');
            document.documentElement.style.setProperty('overflow-y', 'auto', 'important');
            document.documentElement.style.setProperty('height', 'auto', 'important');
            document.body.style.setProperty('overflow-y', 'auto', 'important');
            document.body.style.setProperty('height', 'auto', 'important');
            if (typeof window.renderGarcom === 'function') appDiv.innerHTML = window.renderGarcom();
            return;
        }

        // ---------------------------------------------------------
        // MODO SISTEMA NORMAL
        // ---------------------------------------------------------
        document.body.classList.remove('cliente-qrcode', 'modo-garcom', 'tela-login', 'mostrando-abas-cozinha', 'mostrando-abas-pdv');

        // Espera a configuração do aparelho (modo/função) antes de decidir a tela inicial.
        for (let i = 0; i < 40 && window.MT && !window.MT._carregado; i++) await new Promise(r => setTimeout(r, 50));

        let rotaInicial = 'pdv'; // Padrão Desktop

        const isMobile = window.innerWidth < 768;
        if (isMobile) {
            rotaInicial = 'home'; 
        }

        if (window.location.hash && window.location.hash.length > 1) {
            rotaInicial = window.location.hash.substring(1);
        }

        // Aparelho com função (cliente, /caixa, /cozinha, /cardapio): só abre telas da função.
        if (typeof window.perfilDados === 'function' && window.perfilDados()) {
            if (!window.perfilPermiteRota(rotaInicial) || (rotaInicial === 'home' && !window.perfilPermiteRota('home'))) {
                rotaInicial = window.perfilRotaInicial();
            }
            window.rotaOrigem = window.perfilRotaInicial();
        }

        if (typeof window.navigateTo === 'function') window.navigateTo(rotaInicial);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciarApp);
    else iniciarApp();
})();