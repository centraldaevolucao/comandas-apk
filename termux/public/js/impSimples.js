// ============================================================
// IMPSIMPLES.JS — Recibo simples (A4): "Recibo de pagamento" com valor por extenso e quitação
// ============================================================
(function () {
    const UN = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const DZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const CT = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
    function ate999(n) {
        if (n === 0) return '';
        if (n === 100) return 'cem';
        const c = Math.floor(n / 100), r = n % 100; const p = [];
        if (c) p.push(CT[c]);
        if (r) p.push(r < 20 ? UN[r] : DZ[Math.floor(r / 10)] + (r % 10 ? ' e ' + UN[r % 10] : ''));
        return p.join(' e ');
    }
    function inteiro(n) {
        if (n === 0) return 'zero';
        const grupos = [[1e9, 'bilhão', 'bilhões'], [1e6, 'milhão', 'milhões'], [1e3, 'mil', 'mil']]; const partes = []; let resto = n;
        grupos.forEach(function (g) {
            const q = Math.floor(resto / g[0]); resto = resto % g[0];
            if (q) partes.push((g[0] === 1e3 && q === 1) ? 'mil' : ate999(q) + ' ' + (q === 1 ? g[1] : g[2]));
        });
        if (resto) partes.push(ate999(resto));
        // "e" antes da última parte quando ela é < 100 ou centena exata
        if (partes.length > 1) { const ult = resto || 0; const antes = partes.slice(0, -1).join(' '); return antes + (ult && (ult < 100 || ult % 100 === 0) ? ' e ' : ' ') + partes[partes.length - 1]; }
        return partes[0];
    }
    /** 1234.5 → "mil duzentos e trinta e quatro reais e cinquenta centavos" */
    window.valorPorExtenso = function (v) {
        v = Math.round(Number(v || 0) * 100) / 100;
        const r = Math.floor(v), c = Math.round((v - r) * 100);
        const reais = r ? inteiro(r) + (r === 1 ? ' real' : (r % 1e6 === 0 && r >= 1e6 ? ' de reais' : ' reais')) : '';
        const cent = c ? inteiro(c) + (c === 1 ? ' centavo' : ' centavos') : '';
        return reais && cent ? reais + ' e ' + cent : (reais || cent || 'zero real');
    };

    const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    const R = function (v) { return 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
    const LINHA = '<span style="display:inline-block;min-width:170px;border-bottom:1px solid #333;">&nbsp;</span>';

    /** opts: { pagador:{nome,doc}, valor, descricao, data:Date|string, aberto } */
    window.impReciboSimplesHtml = function (c, config, opts) {
        opts = opts || {}; config = config || {};
        const OA = (window.impLayoutDe ? window.impLayoutDe(config).a4 : {}) || {};
        const calc = (window.calcularTotais ? window.calcularTotais(c) : { total: Number(c.total || 0) });
        const pend = c.pagamentoPendente === true && Number(c.valorPendente || 0) > 0.009;
        let valor = opts.valor != null ? Number(opts.valor) : Number(calc.total || 0) - (pend ? Number(c.valorPendente || 0) : 0);
        if (!(valor > 0.004)) valor = Number(calc.total || 0);
        const ext = window.valorPorExtenso(valor);
        const pag = opts.pagador || {};
        const nomePag = pag.nome || c.cliente || '';
        const itens = (c.itens || []).map(function (i) { return (Number(i.quantidade || i.qtd || 1)) + 'x ' + i.nome; });
        const descr = opts.descricao || ('consumo no estabelecimento (comanda nº ' + (c.numero || c.id || '') + (itens.length ? ': ' + itens.slice(0, 6).join(', ') + (itens.length > 6 ? ' e outros itens' : '') : '') + ')');
        const nomeEmp = config.empresaRazao || config.empresaFantasia || config.nomeImpressao || '';
        const respNome = config.empresaResponsavel || nomeEmp;
        const respDoc = config.empresaRespDoc || config.empresaCnpj || '';
        const cidadeUF = [config.empresaCidade, config.empresaUF].filter(Boolean).join('/');
        let d = opts.data ? new Date(opts.data) : new Date(); if (isNaN(d)) d = new Date();
        const dataExt = (cidadeUF ? esc(cidadeUF) : '__________________') + ', ' + d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear() + '.';
        const logo = (OA.logo !== false && config.imprimirLogo !== false && (opts.logoAmostra || config.urlLogo))
            ? '<div style="text-align:center;margin-bottom:10px;"><img alt="Logo" src="' + esc(opts.logoAmostra || config.urlLogo) + '" style="max-height:90px;max-width:260px;object-fit:contain;"></div>' : '';
        const docPag = pag.doc ? ', inscrito(a) no CPF/CNPJ sob o nº <b>' + esc(pag.doc) + '</b>' : ', inscrito(a) no CPF/CNPJ sob o nº ' + LINHA;
        const quem = nomePag ? '<b>' + esc(nomePag) + '</b>' : LINHA;
        const emp = (OA.empresa !== false && nomeEmp) ? '<div style="text-align:center;font-size:12px;color:#444;margin-bottom:6px;">' + esc(nomeEmp) + (config.empresaCnpj ? ' · CNPJ/CPF ' + esc(config.empresaCnpj) : '') + (config.empresaEndereco ? '<br>' + esc(config.empresaEndereco) : '') + '</div>' : '';
        return '<div class="imp-a4 imp-simples" style="width:720px;box-sizing:border-box;background:#fff;color:#000;font-family:Arial,Helvetica,sans-serif;padding:44px 52px;min-height:540px;border:1px solid #bbb;">' +
            logo + emp +
            '<div style="text-align:center;font-size:26px;font-weight:800;letter-spacing:1px;margin:14px 0 6px;">RECIBO DE PAGAMENTO</div>' +
            '<div style="text-align:center;font-size:18px;margin-bottom:26px;"><b>Valor: ' + R(valor) + '</b> (' + esc(ext) + ')</div>' +
            '<p style="font-size:15px;line-height:1.7;text-align:justify;margin:0 0 14px;">Recebi de ' + quem + docPag + ', a importância de <b>' + R(valor) + '</b> (' + esc(ext) + '), referente a ' + esc(descr) + '.</p>' +
            '<p style="font-size:15px;line-height:1.7;text-align:justify;margin:0 0 30px;">Para maior clareza, firmo o presente recibo, dando plena, geral e irrevogável quitação do valor acima especificado.</p>' +
            '<div style="font-size:15px;margin-bottom:56px;">' + dataExt + '</div>' +
            '<div style="width:340px;margin:0 auto;text-align:center;border-top:1px solid #000;padding-top:6px;font-size:14px;">' +
            '<div style="font-weight:700;">' + (respNome ? esc(respNome) : '&nbsp;') + '</div>' +
            '<div>CPF/CNPJ: ' + (respDoc ? esc(respDoc) : LINHA.replace('170', '120')) + '</div></div>' +
            '<div style="margin-top:34px;text-align:center;font-size:10px;color:#666;">Documento sem valor fiscal.</div></div>';
    };

    /** Pagador (cliente cadastrado) da comanda: nome + CPF/CNPJ, quando houver. */
    window.impPagadorDe = async function (c) {
        try {
            const clientes = window.normalizarArray(await apiGet('clientes')); const nome = String(c.cliente || '').trim().toLowerCase();
            const cli = clientes.find(function (x) { return (c.clienteId && String(x.id) === String(c.clienteId)) || (nome && String(x.nome || '').trim().toLowerCase() === nome); });
            if (cli) return { nome: cli.nome, doc: cli.documento || '' };
        } catch (e) {}
        return { nome: c.cliente || '', doc: '' };
    };
    /** Modelo A4 em uso: 'nota' (NF) ou 'simples'. Recibo em aberto/pendente é sempre a nota. */
    window.impModeloA4 = function (c, config, opts) {
        opts = opts || {};
        const pend = c && c.pagamentoPendente === true && Number(c.valorPendente || 0) > 0.009;
        if (opts.pendente || pend) return 'nota';   // simples só com tudo pago (em aberto SEM saldo pendente também vale)
        const m = opts.modelo || window.__impModeloA4 || ((window.impLayoutDe ? window.impLayoutDe(config || {}).a4.modelo : '') || 'nota');
        return m === 'simples' ? 'simples' : 'nota';
    };
    window.impReciboA4Auto = function (c, config, opts) {
        return window.impModeloA4(c, config, opts) === 'simples' ? window.impReciboSimplesHtml(c, config, opts) : window.impReciboA4Html(c, config, opts);
    };
})();
