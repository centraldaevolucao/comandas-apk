// Recibo A4 no formato de "nota" (organizado em quadros). NÃO é documento fiscal: o próprio recibo traz o aviso.
// window.impReciboA4Html(c, config, opts) -> HTML (usado na pré-visualização, na impressão A4 e no PDF)
(function () {
    'use strict';
    const esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); };
    const R = function (v) { return window.formatMoney ? window.formatMoney(v) : 'R$ ' + Number(v || 0).toFixed(2).replace('.', ','); };
    const FORMAS = { dinheiro: 'Dinheiro', debito: 'Cartão de débito', credito: 'Cartão de crédito', pix: 'PIX' };
    const COR = '#222', LINHA = '1px solid #333';

    function quadro(titulo, corpo, extra) {
        return '<div style="border:' + LINHA + ';' + (extra || '') + '"><div style="background:#e9e9e9;border-bottom:' + LINHA + ';font-size:9px;font-weight:700;letter-spacing:.6px;padding:3px 7px;text-transform:uppercase;">' + esc(titulo) + '</div><div style="padding:6px 8px;">' + corpo + '</div></div>';
    }
    function campo(rot, val, grow) {
        return '<div style="' + (grow ? 'flex:' + grow + ';' : '') + 'min-width:0;"><div style="font-size:8.5px;color:#555;text-transform:uppercase;">' + esc(rot) + '</div><div style="font-size:11.5px;font-weight:600;word-break:break-word;">' + (esc(val) || '&nbsp;') + '</div></div>';
    }

    window.impReciboA4Html = function (c, config, opts) {
        config = config || {}; opts = opts || {};
        const calc = window.calcularTotais ? window.calcularTotais(c) : { subtotal: c.subtotal || 0, desconto: 0, total: c.total || 0 };
        const itens = (window.normalizarArray ? window.normalizarArray(c.itens) : c.itens) || [];
        const pgs = (window.normalizarArray ? window.normalizarArray(c.pagamentos) : c.pagamentos) || [];
        const mesa = window.formatarMesa ? window.formatarMesa(c.mesa) : (c.mesa || '-');
        const data = opts.data || c.dataFechamento || new Date().toLocaleString('pt-BR');
        const nome = config.nomeImpressao || 'Minha Empresa';
        const OA = (window.impLayoutDe ? window.impLayoutDe(config).a4 : {}) || {};   // opções do modelo A4 (Layout de impressão)
        const pend = !!c.pagamentoPendente, aberto = !!opts.aberto;
        const situacao = aberto ? 'AGUARDANDO PAGAMENTO' : (pend ? 'PENDENTE' : 'PAGO');
        const corSit = aberto || pend ? '#e65100' : '#2e7d32';
        const totalQtd = itens.reduce(function (s, i) { return s + Number(i.quantidade || 0); }, 0);
        const logo = (OA.logo !== false && config.imprimirLogo !== false && (config.urlLogo || opts.logoAmostra)) ? '<img src="' + esc(config.urlLogo || opts.logoAmostra) + '" style="max-height:62px;max-width:130px;object-fit:contain;" alt="Logo">' : '';

        const emitente = '<div style="display:flex;gap:10px;align-items:center;">' + (logo ? '<div style="flex:0 0 auto;">' + logo + '</div>' : '') +
            '<div style="min-width:0;"><div style="font-size:17px;font-weight:800;line-height:1.1;">' + esc(String(nome).toUpperCase()) + '</div>' +
            (OA.empresa !== false && config.empresaRazao ? '<div style="font-size:10.5px;">' + esc(config.empresaRazao) + '</div>' : '') +
            (OA.empresa !== false && config.empresaCnpj ? '<div style="font-size:10.5px;">CNPJ/CPF: ' + esc(config.empresaCnpj) + '</div>' : '') +
            (OA.empresa !== false && config.empresaEndereco ? '<div style="font-size:10.5px;">' + esc(config.empresaEndereco) + '</div>' : '') +
            (OA.empresa !== false && config.empresaTelefone ? '<div style="font-size:10.5px;">Tel.: ' + esc(config.empresaTelefone) + '</div>' : '') + '</div></div>';

        const cabF = function (pg, tot) { return '<div style="display:flex;border:' + LINHA + ';">' +
            '<div style="flex:1;padding:8px 10px;min-width:0;">' + emitente + '</div>' +
            '<div style="flex:0 0 190px;border-left:' + LINHA + ';text-align:center;padding:8px 6px;">' +
            '<div style="font-size:20px;font-weight:800;letter-spacing:1px;">RECIBO</div>' +
            '<div style="font-size:10px;">Nº <b style="font-size:13px;">' + esc(c.numero) + '</b></div>' +
            '<div style="font-size:9.5px;margin-top:2px;">Emissão: ' + esc(data) + '</div>' +
            '<div style="display:inline-block;margin-top:5px;padding:2px 10px;border:2px solid ' + corSit + ';color:' + corSit + ';font-weight:800;font-size:11px;border-radius:3px;">' + situacao + '</div>' + (tot > 1 ? '<div style="font-size:10px;margin-top:4px;">Página <b>' + pg + '</b> de <b>' + tot + '</b></div>' : '') + '</div></div>'; };

        const aviso = '<div style="border:' + LINHA + ';border-top:0;background:#f4f4f4;text-align:center;font-size:9.5px;font-weight:700;padding:3px;letter-spacing:.4px;">DOCUMENTO SEM VALOR FISCAL — NÃO SUBSTITUI NOTA FISCAL</div>';

        const cli = quadro('Destinatário / Cliente',
            '<div style="display:flex;gap:10px;">' + campo('Nome', c.cliente || 'Consumidor', 3) + campo('CPF/CNPJ', c.clienteCpf || '', 1.3) + campo('Telefone', c.clienteTelefone || '', 1.2) + '</div>' +
            (c.enderecoEntrega || c.endereco ? '<div style="margin-top:4px;">' + campo('Endereço', c.enderecoEntrega || c.endereco) + '</div>' : ''), 'margin-top:8px;');
        const ref = quadro('Dados do atendimento',
            '<div style="display:flex;gap:10px;">' + campo('Comanda', c.numero, 1) + campo('Mesa', mesa, 1) + campo('Garçom', c.garcom || '', 1.6) + campo('Abertura', c.dataAbertura || '', 1.6) + '</div>', 'margin-top:8px;');

        // ---- tabela de itens (uma fatia por página) ----
        const th = 'background:#e9e9e9;border:' + LINHA + ';font-size:9px;text-transform:uppercase;padding:4px 5px;';
        const td = 'border-left:' + LINHA + ';border-right:' + LINHA + ';font-size:11px;padding:4px 5px;';
        const linhaItem = function (i, n) {
            const q = Number(i.quantidade || 0), p = Number(i.preco || 0);
            return '<tr style="border-bottom:1px solid #ccc;"><td style="' + td + 'text-align:center;">' + (n + 1) + '</td><td style="' + td + '">' + esc(i.nome) + (i.observacao || i.obs ? '<div style="font-size:9px;color:#666;">' + esc(i.observacao || i.obs) + '</div>' : '') + '</td><td style="' + td + 'text-align:center;">' + esc(i.unidade || 'UN') + '</td><td style="' + td + 'text-align:right;">' + q + '</td><td style="' + td + 'text-align:right;">' + R(p) + '</td><td style="' + td + 'text-align:right;font-weight:700;">' + R(p * q) + '</td></tr>';
        };
        const vazia = '<tr><td style="' + td + 'height:21px;">&nbsp;</td><td style="' + td + '"></td><td style="' + td + '"></td><td style="' + td + '"></td><td style="' + td + '"></td><td style="' + td + '"></td></tr>';
        const tabela = function (ini, fim, preencher) {
            let l = ''; for (let n = ini; n < fim; n++) l += linhaItem(itens[n], n);
            for (let k = fim - ini; k < preencher; k++) l += vazia;
            return '<div style="margin-top:8px;"><table style="width:100%;border-collapse:collapse;border-bottom:' + LINHA + ';"><thead><tr><th style="' + th + 'width:34px;">Item</th><th style="' + th + 'text-align:left;">Descrição do produto / serviço</th><th style="' + th + 'width:34px;">Un</th><th style="' + th + 'width:44px;">Qtd</th><th style="' + th + 'width:84px;text-align:right;">Vl. unit.</th><th style="' + th + 'width:92px;text-align:right;">Vl. total</th></tr></thead><tbody>' + l + '</tbody></table></div>';
        };

        // ---- QR Pix: só enquanto aguardando pagamento (recibo em aberto ou pendente) ----
        let valorQr = 0, qrHtml = '';
        if (aberto || pend) {
            const pixPago = window.pixValorPago ? window.pixValorPago(c) : 0;
            const falta = Math.max(0, Math.round((Number(calc.total || 0) - pgs.reduce(function (t, p) { return t + Number(p.valor || 0); }, 0)) * 100) / 100);
            valorQr = pend && !aberto ? Number(c.valorPendente || 0) : (pixPago > 0.004 ? pixPago : falta);   // Pix escolhido; senão o que falta pagar
            if (opts.pixAmostra) { valorQr = valorQr || calc.total; qrHtml = '<div style="width:104px;height:104px;border:1px solid #333;background:repeating-conic-gradient(#000 0 25%,#fff 0 50%) 0 0/14px 14px;"></div>'; }
            else if (valorQr > 0.004 && config.pixRestaurante && window.gerarPixComValor && window.qrUrl) {
                qrHtml = '<img alt="QR Code Pix" src="' + esc(window.qrUrl(window.gerarPixComValor(config.pixRestaurante, valorQr), '200x200')) + '" style="width:104px;height:104px;display:block;">';
            }
        }
        const blocoQr = (qrHtml && OA.qr !== false) ? '<div style="flex:0 0 auto;text-align:center;border-left:1px dashed #999;padding-left:10px;margin-left:10px;"><div style="font-size:9px;font-weight:800;letter-spacing:.4px;">PAGUE COM PIX</div>' + qrHtml + '<div style="font-size:10px;font-weight:700;margin-top:2px;">' + R(valorQr) + '</div>' + (config.pixChave && window.pixFormatarChave ? '<div style="font-size:8px;color:#444;max-width:110px;word-break:break-all;">' + esc(window.pixFormatarChave(config.pixTipo, config.pixChave)) + '</div>' : '') + '</div>' : '';

        const linhaTot = function (r, v, forte) { return '<div style="display:flex;justify-content:space-between;padding:2px 0;' + (forte ? 'font-weight:800;font-size:14px;border-top:' + LINHA + ';margin-top:3px;padding-top:5px;' : 'font-size:11.5px;') + '"><span>' + r + '</span><span>' + v + '</span></div>'; };
        let tot = linhaTot('Itens', totalQtd) + linhaTot('Subtotal', R(calc.subtotal));
        if (calc.desconto > 0) tot += linhaTot('Desconto' + (c.desconto && c.desconto.tipo === 'porcentagem' ? ' (' + c.desconto.valor + '%)' : ''), '-' + R(calc.desconto));
        tot += linhaTot('TOTAL', R(calc.total), true);
        const pagHtml = pgs.length ? pgs.map(function (p) { return linhaTot(esc(FORMAS[p.forma] || p.forma), R(p.valor)); }).join('') + (Number(c.troco) > 0 ? linhaTot('Troco', R(c.troco)) : '') : '<div style="font-size:11px;color:#777;">' + (aberto || pend ? 'Aguardando pagamento.' : 'Nenhum pagamento registrado.') + '</div>' +
            (pend && Number(c.valorPendente) > 0 ? linhaTot('Valor pendente', R(c.valorPendente), true) : '');
        const rodapeBox = '<div style="display:flex;gap:8px;margin-top:8px;">' +
            '<div style="flex:1;">' + quadro('Forma de pagamento', '<div style="display:flex;align-items:center;"><div style="flex:1;min-width:0;">' + pagHtml + '</div>' + blocoQr + '</div>', 'height:100%;box-sizing:border-box;') + '</div>' +
            '<div style="flex:0 0 250px;">' + quadro('Totais', tot, 'height:100%;box-sizing:border-box;') + '</div></div>';
        const obs = quadro('Observações', '<div style="font-size:10.5px;min-height:34px;">' + esc(opts.observacao || config.recibosObservacao || 'Obrigado pela preferência!') + '</div>', 'margin-top:8px;');
        const campoAss = function (tit, sub) { return '<div style="flex:1;"><div style="height:52px;border-bottom:1px solid #333;"></div><div style="font-size:10px;font-weight:700;padding-top:3px;text-align:center;">' + tit + '</div><div style="font-size:9px;color:#444;margin-top:5px;">' + sub + '</div></div>'; };
        const ass = quadro('Assinaturas', '<div style="display:flex;gap:26px;padding:4px 4px 2px;">' +
            campoAss('Assinatura do cliente', 'Nome: ______________________________<br>CPF/CNPJ: _________________ &nbsp; Data: ____/____/______') +
            campoAss('Assinatura do responsável', esc(config.empresaResponsavel || config.empresaRazao || config.nomeImpressao || 'Responsável') + (config.empresaRespDoc || config.empresaCnpj ? '<br>CPF/CNPJ: ' + esc(config.empresaRespDoc || config.empresaCnpj) : '<br>CPF/CNPJ: _________________') + '<br>Data: ____/____/______') + '</div>', 'margin-top:10px;');
        const rodapeF = function (pg, tot) { return '<div style="margin-top:12px;border-top:1px solid #999;padding-top:4px;display:flex;justify-content:space-between;font-size:9px;color:#555;"><span>Recibo Nº ' + esc(c.numero) + ' • ' + esc(nome) + ' • Documento sem valor fiscal</span><span>' + esc(data) + (tot > 1 ? ' • Página ' + pg + '/' + tot : '') + '</span></div>'; };
        const fechamento = rodapeBox + (OA.obs !== false ? obs : '') + (OA.ass !== false ? ass : '');

        // ---- paginação: R1 itens na 1ª página (com cabeçalho), R2 nas do meio, R3 na última (com o fechamento) ----
        const R1 = 11, R2 = 26, R3 = 11;
        const fatias = [];
        if (itens.length <= R1) fatias.push([0, itens.length]);
        else {
            fatias.push([0, R1]); let pos = R1;
            while (itens.length - pos > R3) { fatias.push([pos, Math.min(pos + R2, itens.length - 5)]); pos = fatias[fatias.length - 1][1]; }
            fatias.push([pos, itens.length]);
        }
        const total = fatias.length;
        const paginas = fatias.map(function (f, idx) {
            const ultima = idx === total - 1, primeira = idx === 0;
            let h = cabF(idx + 1, total) + aviso + (primeira ? cli + ref : '');
            h += tabela(f[0], f[1], primeira && ultima ? 12 : 0);
            if (primeira && !ultima) h += '<div style="text-align:right;font-size:10px;color:#555;margin-top:4px;">Continua na página ' + (idx + 2) + ' de ' + total + ' →</div>';
            if (!primeira && !ultima) h += '<div style="text-align:right;font-size:10px;color:#555;margin-top:4px;">Continua na página ' + (idx + 2) + ' de ' + total + ' →</div>';
            if (ultima) h += fechamento;
            h += rodapeF(idx + 1, total);
            return '<div class="a4-pagina" style="' + (ultima ? '' : 'break-after:page;page-break-after:always;') + 'padding-bottom:10px;">' + h + '</div>';
        });
        const css = '<style>.a4-pagina+.a4-pagina{border-top:2px dashed #bbb;margin-top:18px;padding-top:18px;}@media print{.a4-pagina+.a4-pagina{border-top:0;margin-top:0;padding-top:0;}}</style>';

        return css + '<div class="imp-a4" style="box-sizing:border-box;width:100%;max-width:720px;margin:0 auto;padding:6px;background:#fff;color:' + COR + ';font-family:Arial,Helvetica,sans-serif;line-height:1.3;">' + paginas.join('') + '</div>';
    };
})();
