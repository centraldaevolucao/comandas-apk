// Dados da empresa (um só lugar): contato do suporte, pedidos de licença e rodapé.
(function () {
    'use strict';
    window.APP_VERSAO='2.32.10';                      // atualizar a cada versão (rodapé do Suporte e do menu)
    window.CONTATO = {
        empresa: 'Central da Evolução',
        whatsapp: '5591981385331',                     // com 55 + DDD (wa.me)
        whatsappFmt: '(91) 98138-5331',
        email: 'centraldaevolucao@gmail.com',
        // ---- DADOS LEGAIS (preencha; só aparecem nas telas quando preenchidos — nada é inventado) ----
        razaoSocial: '',           // nome empresarial / nome completo do vendedor
        cnpj: '',                  // CNPJ (ou CPF, se for pessoa física)
        endereco: '',              // endereço completo (Decreto 7.962/2013, art. 2º)
        encarregado: '',           // nome de quem responde pelos dados (LGPD art. 41); vazio = "Central da Evolução"
        emailPrivacidade: '',      // vazio = usa o e-mail de suporte acima
        horarios: ['Segunda a sexta: 8h às 18h', 'Sábado: 8h às 12h', 'Domingo e feriados: só por mensagem (respondemos no próximo dia útil)']   // edite aqui
    };
    window.LICENCA_WHATSAPP = window.CONTATO.whatsapp;
    window.abrirLinkExterno = function (url) {
        try { if (window.Plataforma.tem('abrirUrl')) { window.Plataforma.abrirUrl(url); return; } } catch (e) {}
        if (/^mailto:/i.test(url)) { location.href = url; } else { window.open(url, '_blank'); }
    };
    window.contatoWhatsAppUrl = function (texto) { return 'https://wa.me/' + window.CONTATO.whatsapp + (texto ? '?text=' + encodeURIComponent(texto) : ''); };
    window.contatoEmailUrl = function (assunto, corpo) { return 'mailto:' + window.CONTATO.email + '?subject=' + encodeURIComponent(assunto || 'Suporte Comandas') + '&body=' + encodeURIComponent(corpo || ''); };
    window.rodapeVersaoHtml = function (estilo) {
        return '<div style="text-align:center;font-size:.72rem;color:#6b6b6b;line-height:1.5;' + (estilo || '') + '">Restaurante-app v' + window.APP_VERSAO +
            '<br>© ' + new Date().getFullYear() + ' ' + window.CONTATO.empresa + ' · Todos os direitos reservados' +
            '<br>' + (window.legalLinksHtml ? window.legalLinksHtml() : '') + '</div>';
    };
})();
