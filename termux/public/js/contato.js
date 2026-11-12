// Dados da empresa (um só lugar): contato do suporte, pedidos de licença e rodapé.
(function () {
    'use strict';
    window.APP_VERSAO='2.20.2';                      // atualizar a cada versão (rodapé do Suporte e do menu)
    window.CONTATO = {
        empresa: 'Central da Evolução',
        whatsapp: '5591981385331',                     // com 55 + DDD (wa.me)
        whatsappFmt: '(91) 98138-5331',
        email: 'centraldaevolucao@gmail.com',
        horarios: ['Segunda a sexta: 8h às 18h', 'Sábado: 8h às 12h', 'Domingo e feriados: só por mensagem (respondemos no próximo dia útil)']   // edite aqui
    };
    window.LICENCA_WHATSAPP = window.CONTATO.whatsapp;
    window.abrirLinkExterno = function (url) {
        try { if (window.AndroidApp && window.AndroidApp.abrirUrl) { window.AndroidApp.abrirUrl(url); return; } } catch (e) {}
        if (/^mailto:/i.test(url)) { location.href = url; } else { window.open(url, '_blank'); }
    };
    window.contatoWhatsAppUrl = function (texto) { return 'https://wa.me/' + window.CONTATO.whatsapp + (texto ? '?text=' + encodeURIComponent(texto) : ''); };
    window.contatoEmailUrl = function (assunto, corpo) { return 'mailto:' + window.CONTATO.email + '?subject=' + encodeURIComponent(assunto || 'Suporte Comandas') + '&body=' + encodeURIComponent(corpo || ''); };
    window.rodapeVersaoHtml = function (estilo) {
        return '<div style="text-align:center;font-size:.72rem;color:#888;line-height:1.5;' + (estilo || '') + '">Restaurante-app v' + window.APP_VERSAO +
            '<br>© ' + new Date().getFullYear() + ' ' + window.CONTATO.empresa + ' · Todos os direitos reservados</div>';
    };
})();
