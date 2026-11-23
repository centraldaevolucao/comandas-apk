// Layout de impressão: um único motor para comanda, recibo e via da cozinha.
// - impDocumento(tipo, c, config, opts) -> { lines, papel, sep, margem }  (modelo neutro)
// - impHtml(doc, config)               -> HTML (tela, impressão comum, imagem do WhatsApp)
// - impPagina(inner, titulo)           -> página completa que abre o diálogo de impressão
// - a Bluetooth (bluetooth.js) converte as mesmas linhas em ESC/POS
// - abrirLayoutImpressao()             -> tela de edição com pré-visualização
(function () {
    'use strict';
    const COR = '#C2185B';
    const DOCS = { comanda: 'Comanda', recibo: 'Recibo', cozinha: 'Cozinha', pendencia: 'Pendência' };
    // mesmos blocos para todos os documentos (cada um liga/desliga o que quiser)
    const BLOCOS_BASE = [['logo', 'Logo'], ['nome', 'Nome do estabelecimento'], ['titulo', 'Título e situação'], ['cor', 'Faixa de cor do caixa'], ['cab', 'Comanda / Mesa / Data'], ['cliente', 'Cliente e garçom'], ['itens', 'Itens'], ['totais', 'Totais, pagamentos e pendente'], ['pendencias', 'Pendências anteriores e total geral'], ['qr', 'QR Code PIX'], ['assinatura', 'Linha de assinatura'], ['final', 'Mensagem final']];
    const BLOCOS = { comanda: BLOCOS_BASE, recibo: BLOCOS_BASE, cozinha: BLOCOS_BASE, pendencia: BLOCOS_BASE };
    const TEXTO_PADRAO = {
        comanda: { titulo: 'COMPROVANTE DE CONSUMO', final: 'Obrigado pela preferência!' },
        recibo: { titulo: 'RECIBO DE PAGAMENTO', final: 'Obrigado pela preferência!' },
        cozinha: { titulo: 'PEDIDO - COZINHA', final: '' },
        pendencia: { titulo: 'COMPROVANTE DE PENDÊNCIA', final: 'Obrigado pela preferência!' }
    };
    const SUBS = { logo: 'Centralizado', itens: 'Qtd · Nome · Valor', final: 'Texto da mensagem' };
    const ON_PADRAO = {
        comanda: { pendencias: false, assinatura: false },
        cozinha: { logo: false, cor: false, totais: false, pendencias: false, qr: false, assinatura: false, final: false }
    };
    const PAPEL_COLS = { '58': 32, '80': 48, 'a4': 48 };
    const PAPEL_PX = { '58': 280, '80': 340, 'a4': 700 };
    const MARGEM_PX = { menor: 4, normal: 10, maior: 20 };

    function padrao() {
        const L = { sep: 'tracejada', margem: 'normal' };
        Object.keys(BLOCOS).forEach(function (d) {
            L[d] = { papel: '58', blocos: BLOCOS[d].map(function (b) {
                const o = { id: b[0], on: !(ON_PADRAO[d] && ON_PADRAO[d][b[0]] === false) };
                if (b[0] === 'nome') o.al = 'c';
                if (b[0] === 'logo') o.pct = 40;
                if (b[0] === 'titulo' || b[0] === 'final') o.texto = TEXTO_PADRAO[d][b[0]];
                return o;
            }) };
        });
        return L;
    }
    // Quais opções de A4 estão habilitadas em Configurações › Layout de impressão (pendente: só a Nota pode sair)
    window.impA4Opcoes = function (config, pendente) {
        const a = (window.impLayoutDe ? window.impLayoutDe(config || {}).a4 : {}) || {};
        const nf = a.nf !== false, sp = a.simples !== false;
        const ativo = a.ativo !== false && (pendente ? nf : (nf || sp));
        return { ativo: ativo, nota: nf, simples: sp && !pendente, unico: (nf && sp && !pendente) ? '' : (nf ? 'nota' : (sp && !pendente ? 'simples' : '')) };
    };
    // junta o salvo com o padrão (blocos novos entram no fim)
    window.impLayoutDe = function (config) {
        const base = padrao(), s = (config && config.layoutImp) || {};
        if (s.sep) base.sep = s.sep;
        if (s.margem) base.margem = s.margem;
        base.a4 = Object.assign({ ativo: true, nf: true, simples: true, modelo: 'nota', logo: true, empresa: true, qr: true, obs: true, ass: true }, s.a4 || {});   // modelo A4 (nota): o que aparece
        Object.keys(BLOCOS).forEach(function (d) {
            const sd = s[d]; if (!sd) return;
            if (sd.papel) base[d].papel = sd.papel;
            if (Array.isArray(sd.blocos)) {
                const mapa = {}; base[d].blocos.forEach(function (b) { mapa[b.id] = b; });
                const out = [];
                sd.blocos.forEach(function (b) {
                    if (!b || !b.id) return;
                    if (mapa[b.id]) { out.push(Object.assign({}, mapa[b.id], b)); delete mapa[b.id]; }
                    else if (/^t\d+$/.test(b.id)) out.push(Object.assign({ on: true, al: 'c', texto: '' }, b));
                });
                BLOCOS[d].forEach(function (bb, bi) {
                    const m = mapa[bb[0]]; if (!m) return;
                    let pos = 0;
                    for (let q = bi - 1; q >= 0; q--) { const ix = out.findIndex(function (x) { return x.id === BLOCOS[d][q][0]; }); if (ix >= 0) { pos = ix + 1; break; } }
                    out.splice(pos, 0, m);
                });
                base[d].blocos = out;
            }
        });
        return base;
    };

    const money = function (v) { return window.formatMoney(v); };
    const esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); };
    const FORMAS = { dinheiro: 'Dinheiro', debito: 'Débito', credito: 'Crédito', pix: 'PIX' };

    // ---------- modelo neutro ----------
    window.impDocumento = async function (tipo, c, config, opts) {
        opts = opts || {}; config = config || {};
        if (tipo === 'recibo' && c && c.pagamentoPendente && !opts.aberto) tipo = 'pendencia';   // comanda deixada em pendência usa o layout "Pendência"
        const rec = tipo === 'recibo' || tipo === 'pendencia';
        const LAY = window.impLayoutDe(config), D = LAY[tipo] || LAY.comanda;
        const calc = window.calcularTotais ? window.calcularTotais(c) : { subtotal: c.subtotal || 0, desconto: 0, total: c.total || 0 };
        const L = [];
        const sep = function () { L.push({ k: 'sep' }); };
        const tipoPix = tipo === 'pendencia' ? 'pendencia' : (rec ? 'recibo' : 'comanda');
        let prev = null;
        const aplica = function () {
            if (!prev) return; const b = prev.b;
            for (let j = prev.ini; j < L.length; j++) {
                const l = L[j];
                if (l.k !== 't' && l.k !== 'duas') continue;
                if (b.al && l.k === 't') l.al = b.al;
                if (b.neg === 0 || b.neg === 1) l.b = b.neg;
                if (b.fs) l.fs = b.fs;
                if (b.ft) l.ft = b.ft;
                if (b.cor && !l.bg) l.cor = b.cor;
            }
        };
        for (const b of D.blocos) {
            if (!b.on) continue;
            aplica(); prev = { ini: L.length, b: b };
            const id = /^t\d+$/.test(b.id) ? 'texto' : b.id;
            if (id === 'logo') {
                if (config.imprimirLogo === false) continue;
                if (opts.amostra) L.push({ k: 'logo', amostra: true, pct: b.pct || 40 });
                else if (config.urlLogo) L.push({ k: 'logo', src: config.urlLogo, pct: b.pct || 40 });
            } else if (id === 'nome') {
                if (config.imprimirNome === false) continue;
                L.push({ k: 't', t: String(config.nomeImpressao || 'Minha Empresa').toUpperCase(), b: 1, g: 1, al: b.al || 'c' });
            } else if (id === 'titulo') {
                let t = b.texto || TEXTO_PADRAO[tipo].titulo;
                if (tipo === 'recibo' && opts.aberto) t = 'RECIBO EM ABERTO';
                if (t) L.push({ k: 't', t: t, b: 1, al: 'c' });
                if (rec) {
                    if (opts.aberto) L.push({ k: 't', t: 'AGUARDANDO FECHAMENTO', b: 1, al: 'c', bg: '#fff3e0', fg: '#e65100' });
                    else if (tipo === 'pendencia') L.push({ k: 't', t: 'PENDENTE', b: 1, al: 'c', bg: '#fff3e0', fg: '#e65100' });
                    else L.push({ k: 't', t: 'PAGO', b: 1, al: 'c', bg: '#e8f5e9', fg: '#2e7d32' });
                }
            } else if (id === 'cor') {
                let cor = null;
                if (opts.amostra) cor = { hex: '#2e7d32', label: 'Caixa 1' };
                else if (window.obterCorCaixaDaComanda) { try { cor = await window.obterCorCaixaDaComanda(c); } catch (e) {} }
                if (cor) L.push({ k: 't', t: String(cor.label || cor.id || '').toUpperCase(), b: 1, al: 'c', bg: cor.hex || '#666', fg: '#fff' });
            } else if (id === 'cab') {
                sep();
                const mesa = window.formatarMesa ? window.formatarMesa(c.mesa) : (c.mesa || '-');
                L.push({ k: 'duas', l: 'Comanda: ' + c.numero, r: /^mesa/i.test(String(mesa)) ? String(mesa) : 'Mesa: ' + mesa, b: 1 });
                const data = tipo === 'cozinha' ? (opts.agora || new Date().toLocaleString('pt-BR')) : (rec ? (c.dataFechamento || opts.agora || new Date().toLocaleString('pt-BR')) : (c.dataAbertura || new Date().toLocaleString('pt-BR')));
                L.push({ k: 't', t: (tipo === 'cozinha' ? 'Hora: ' : 'Data: ') + data });
            } else if (id === 'cliente') {
                if (c.cliente) L.push({ k: 't', t: 'Cliente: ' + c.cliente });
                if (c.garcom) L.push({ k: 't', t: 'Garçom: ' + c.garcom });
            } else if (id === 'itens') {
                sep();
                const itens = window.normalizarArray(c.itens) || [];
                if (rec) L.push({ k: 't', t: 'ITENS CONSUMIDOS (' + itens.reduce(function (s, i) { return s + Number(i.quantidade || 0); }, 0) + ')', b: 1 });
                itens.forEach(function (i) {
                    const q = Number(i.quantidade || 0), nome = q + 'x ' + i.nome;
                    if (tipo === 'cozinha') {
                        L.push({ k: 't', t: nome, b: 1 });
                        const ob = i.observacao || i.obs || i.observacoes; if (ob) L.push({ k: 't', t: '  * ' + ob, small: 1 });
                    } else L.push({ k: 'duas', l: nome, r: money(Number(i.preco) * q) });
                });
            } else if (id === 'totais') {
                sep();
                if (calc.desconto > 0) { L.push({ k: 'duas', l: 'Subtotal', r: money(calc.subtotal) }); L.push({ k: 'duas', l: 'Desconto' + (c.desconto && c.desconto.tipo === 'porcentagem' ? ' (' + c.desconto.valor + '%)' : ''), r: '-' + money(calc.desconto) }); if (c.desconto && c.desconto.motivo) L.push({ k: 't', t: 'Motivo: ' + c.desconto.motivo, small: 1 }); }
                L.push({ k: 'duas', l: 'TOTAL', r: money(calc.total), b: 1, g: 1 });
                if (rec) {
                    const pg = window.normalizarArray(c.pagamentos) || [];
                    if (tipo === 'recibo' || pg.length) L.push({ k: 't', t: tipo === 'pendencia' ? 'RECEBIDO' : 'FORMA DE PAGAMENTO', b: 1, mt: 1 });
                    if (!pg.length && tipo === 'recibo') L.push({ k: 't', t: 'Nenhum pagamento registrado.', al: 'c' });
                    pg.forEach(function (p) {
                        L.push({ k: 'duas', l: FORMAS[p.forma] || p.forma, r: money(p.valor) });
                        if (p.maquininha && window.maquininhaTexto) { const mt = window.maquininhaTexto(p.maquininha); if (mt) L.push({ k: 't', t: mt, small: 1 }); }
                    });
                    if (Number(c.descontoPendencia) > 0) L.push({ k: 'duas', l: 'Desconto na pendência' + (c.descontoPendenciaMotivo ? ' (' + c.descontoPendenciaMotivo + ')' : ''), r: '-' + money(c.descontoPendencia) });
                    if (Number(c.troco) > 0) L.push({ k: 'duas', l: 'Troco', r: money(c.troco) });
                    if (tipo === 'pendencia') L.push({ k: 'duas', l: 'VALOR PENDENTE', r: money(Number(c.valorPendente || 0)), b: 1, g: 1, mt: 1 });
                }
            } else if (id === 'pendencias') {
                if (!window.pendenciasAnteriores) continue;
                let pa = { valor: 0 };
                try { pa = opts.amostra ? { valor: 0 } : await window.pendenciasAnteriores(c); } catch (e) {}
                const atual = opts.atualPend !== undefined ? Number(opts.atualPend || 0) : (c.pagamentoPendente ? Number(c.valorPendente || 0) : 0);
                if (pa.valor > 0 || atual > 0) {
                    sep();
                    L.push({ k: 'duas', l: 'Pendências anteriores', r: money(pa.valor) });
                    L.push({ k: 'duas', l: 'Pendente desta comanda', r: money(atual) });
                    L.push({ k: 'duas', l: 'TOTAL GERAL PENDENTE', r: money(pa.valor + atual), b: 1 });
                }
            } else if (id === 'qr') {
                if (tipo === 'comanda' && !opts.amostra && (c.pagamentoPendente || String(c.status || '').toLowerCase() === 'pendente')) continue;   // comanda pendente: QR só no Recibo (pendente)
                const pix = opts.amostra ? (tipo === 'pendencia' ? 16 : 26) : (tipo === 'pendencia' ? Number(c.valorPendente || 0) : (window.pixValorPago ? window.pixValorPago(c) : 0));
                if (!(pix > 0.004)) continue;
                if (opts.amostra) { L.push({ k: 'qr', amostra: true, valor: pix }); continue; }
                if (!config.pixRestaurante) continue;
                const htmlQr = window.blocoPixQR ? window.blocoPixQR(config, pix, opts.modoPix || 'impressao', tipoPix) : '';
                const imp = window.pixQrAtivo ? window.pixQrAtivo(config, 'impressao', tipoPix) : true;
                L.push({ k: 'qr', html: htmlQr, imp: imp, payload: window.gerarPixComValor(config.pixRestaurante, pix), valor: pix, chave: config.pixChave ? window.pixFormatarChave(config.pixTipo, config.pixChave) : '' });
            } else if (id === 'assinatura') {
                L.push({ k: 't', t: 'Assinatura: ' + '_'.repeat(24), al: 'c', mt: 1 });
            } else if (id === 'final') {
                const t = b.texto === undefined ? TEXTO_PADRAO[tipo].final : b.texto;
                if (t) { sep(); String(t).split('\n').forEach(function (x) { L.push({ k: 't', t: x, al: 'c' }); }); }
            } else if (id === 'texto') {
                if (!b.texto) continue;
                String(b.texto).split('\n').forEach(function (x) { L.push({ k: 't', t: x, al: b.al || 'c', b: b.b ? 1 : 0 }); });
            }
        }
        aplica();
        // limpa separadores repetidos ou nas pontas
        const out = [];
        L.forEach(function (l) { if (l.k === 'sep' && (!out.length || out[out.length - 1].k === 'sep')) return; out.push(l); });
        while (out.length && out[out.length - 1].k === 'sep') out.pop();
        return { lines: out, papel: D.papel || '58', sep: LAY.sep, margem: LAY.margem, tipo: tipo };
    };

    // ---------- HTML ----------
    function borda(sep) { return sep === 'solida' ? '1px solid #000' : (sep === 'pontos' ? '2px dotted #000' : '1px dashed #000'); }
    function estiloExtra(l, base) {
        let r = '';
        if (l.fs || l.g || l.small) r += 'font-size:' + (base * (l.fs || 100) / 100).toFixed(1) + 'px;';
        if (l.ft && window.IMP_FONTES && window.IMP_FONTES[l.ft]) r += 'font-family:' + window.IMP_FONTES[l.ft].css + ';';
        if (l.cor) r += 'color:' + l.cor + ';';
        return r;
    }
    window.impHtml = function (doc, config) {
        const F = window.impFonte ? window.impFonte(config || {}) : { family: 'monospace', tam: 100 };
        const k = F.tam / 100, W = PAPEL_PX[doc.papel] || 280, pad = MARGEM_PX[doc.margem] || 10;
        let h = '<div class="imp-cupom" style="box-sizing:border-box;width:' + Math.round(W / k) + 'px;max-width:100%;zoom:' + k + ';margin:0 auto;padding:' + pad + 'px;background:#fff;color:#000;font-family:' + F.family + ';font-size:12px;line-height:1.35;">';
        doc.lines.forEach(function (l) {
            const al = l.al === 'e' ? 'left' : (l.al === 'd' ? 'right' : 'center');
            if (l.k === 'sep') h += '<div style="border-top:' + borda(doc.sep) + ';margin:6px 0;"></div>';
            else if (l.k === 't') {
                const al2 = l.al ? al : 'left';
                h += '<div style="text-align:' + al2 + ';' + (l.b ? 'font-weight:700;' : 'font-weight:400;') + estiloExtra(l, l.g ? 16 : (l.small ? 10 : 12)) + (l.small && !l.cor ? 'color:#444;' : '') + (l.mt ? 'margin-top:8px;' : '') +
                    (l.bg ? 'background:' + l.bg + ';color:' + (l.fg || '#000') + ';padding:3px 6px;border-radius:4px;margin:3px 0;-webkit-print-color-adjust:exact;print-color-adjust:exact;' : '') + 'word-break:break-word;">' + esc(l.t) + '</div>';
            } else if (l.k === 'duas') h += '<div style="display:flex;justify-content:space-between;gap:8px;' + (l.b ? 'font-weight:700;' : '') + estiloExtra(l, l.g ? 15 : 12) + '"><span style="min-width:0;word-break:break-word;">' + esc(l.l) + '</span><span style="white-space:nowrap;">' + esc(l.r) + '</span></div>';
            else if (l.k === 'logo') {
                if (l.amostra) h += '<div style="width:' + l.pct + '%;aspect-ratio:1;max-width:80px;border-radius:50%;background:' + COR + ';color:#fff;display:flex;align-items:center;justify-content:center;margin:0 auto 4px;font-weight:800;font-size:12px;">LOGO</div>';
                else h += '<img alt="Logo" src="' + esc(l.src) + '" style="display:block;margin:0 auto 5px;width:' + l.pct + '%;max-height:90px;object-fit:contain;">';
            } else if (l.k === 'qr') {
                if (l.amostra) h += '<div style="text-align:center;"><div style="border-top:' + borda(doc.sep) + ';margin:6px 0;"></div><b>PAGAMENTO VIA PIX</b><div style="width:70px;height:70px;margin:6px auto;background:repeating-conic-gradient(#000 0 25%,#fff 0 50%) 0 0/14px 14px;"></div><div>Valor PIX: ' + money(l.valor) + '</div></div>';
                else h += l.html || '';
            }
        });
        return h + '</div>';
    };
    window.impPagina = function (inner, titulo, opts) {
        opts = opts || {};
        const a4 = !!opts.a4;
        const css = a4 ? '@page{size:A4;margin:12mm}body{margin:0;background:#fff;}.imp-cupom{width:100%!important;max-width:720px!important;margin:0 auto!important;}'
                       : '@page{margin:0}body{margin:0;background:#fff;}';
        const dica = a4 && opts.nome ? '<div id="dica-a4" style="font:12px sans-serif;color:#555;text-align:center;padding:6px;">Impressora A4: <b>' + esc(opts.nome) + '</b> (escolha-a na janela de impressão)</div><style>@media print{#dica-a4{display:none}}</style>' : '';
        return '<html><head><meta charset="utf-8"><title>' + esc(titulo) + '</title><style>' + css + '</style></head><body>' + dica + inner + '<br><br>' +
            '<script>window.onload=function(){setTimeout(function(){window.print();window.close();},400);}<\/script></body></html>';
    };
    // Destinos de impressão: 'cupom' (térmica, padrão) ou 'a4:<id>' (impressoras A4 cadastradas em Impressoras)
    window.impDestinos = function (config) {
        const l = [{ v: 'cupom', t: 'Cupom (térmica)' }];
        ((config && config.impressorasA4) || []).forEach(function (p) { if (p && p.id) l.push({ v: 'a4:' + p.id, t: 'A4 — ' + (p.nome || 'Impressora A4') }); });
        if (l.length === 1) l.push({ v: 'a4:', t: 'A4 (folha)' });
        return l;
    };
    window.impDestinoAtual = function () { return window.__impDestino || 'cupom'; };
    window.impDestinoNome = function (config, v) {
        const d = window.impDestinos(config).find(function (x) { return x.v === v; });
        return d ? d.t.replace(/^A4 — /, '') : '';
    };
    window.impPapelCols = function (papel) { return PAPEL_COLS[papel] || 32; };
    window.impSepChar = function (sep) { return sep === 'solida' ? '=' : (sep === 'pontos' ? '.' : '-'); };

    // ---------- tela de edição ----------
    let PREV_ABERTO = false; const LOGO_AMOSTRA = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><rect width="120" height="60" rx="8" fill="#C2185B"/><text x="60" y="37" font-size="20" font-family="Arial" font-weight="700" fill="#fff" text-anchor="middle">LOGO</text></svg>');
    let LAY = null, DOC = 'comanda', VISAO = 'editar', CFG = {}, timer = null; const EST = {};
    const AMOSTRA = { numero: 12, mesa: '4', dataAbertura: '11/11/2026 12:40', dataFechamento: '11/11/2026 13:20', cliente: 'Maria', garcom: 'João',
        itens: [{ nome: 'Pastel de carne', quantidade: 2, preco: 6 }, { nome: 'Suco de laranja', quantidade: 1, preco: 8 }, { nome: 'Pastel de queijo', quantidade: 1, preco: 6, observacao: 'sem cebola' }],
        pagamentos: [{ forma: 'pix', valor: 26 }], troco: 0, desconto: 0 };

    function amostraDe(d) {
        if (d !== 'pendencia') return AMOSTRA;
        return Object.assign({}, AMOSTRA, { pagamentos: [{ forma: 'dinheiro', valor: 10 }], pagamentoPendente: true, valorPendente: 16 });
    }

    // a folha A4 tem largura fixa (720px) e é reduzida para caber na tela, como a página impressa
    function folhaA4(html, ov) {
        const disp = (ov && ov.clientWidth ? ov.clientWidth : window.innerWidth) - (window.innerWidth >= 900 ? 460 : 56);
        const z = Math.max(0.3, Math.min(1, disp / 720));
        return '<div style="width:720px;zoom:' + z.toFixed(3) + ';background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.25);">' + html + '</div>';
    }
    function amostraA4(d) {
        const c = amostraDe(d);
        c.cliente = 'Maria da Silva';
        c.itens = [{ nome: 'Pastel de carne', quantidade: 2, preco: 6 }, { nome: 'Suco de laranja', quantidade: 1, preco: 8 }, { nome: 'Pastel de queijo', quantidade: 1, preco: 6, observacao: 'sem cebola' }];
        return c;
    }
    async function salvarEmpresa(k, v) {
        CFG[k] = v; clearTimeout(timerEmp);
        timerEmp = setTimeout(async function () {
            try { const arr = window.normalizarArray(await apiGet('configuracoes')); const cfg = arr[0] || {}; cfg[k] = v; await apiSave('configuracoes', [cfg]); } catch (e) {}
        }, 350);
    }
    let timerEmp = null;
    async function salvar() {
        clearTimeout(timer);
        timer = setTimeout(async function () {
            try {
                const arr = window.normalizarArray(await apiGet('configuracoes')); const cfg = arr[0] || {};
                cfg.layoutImp = JSON.parse(JSON.stringify(LAY)); CFG.layoutImp = cfg.layoutImp;
                await apiSave('configuracoes', [cfg]);
            } catch (e) { console.warn('layout não salvo', e); }
        }, 350);
    }
    const seg = function (opts, atual, fn) {
        return '<div style="display:inline-flex;border:2px solid ' + COR + ';border-radius:10px;overflow:hidden;">' + opts.map(function (o) {
            return '<span data-seg="' + fn + '" data-v="' + o[0] + '" style="padding:5px 9px;font-size:.78rem;font-weight:600;cursor:pointer;' + (atual === o[0] ? 'background:' + COR + ';color:#fff;' : 'color:' + COR + ';') + '">' + o[1] + '</span>';
        }).join('') + '</div>';
    };
    async function desenhar(ov) {
        const D = LAY[DOC], nomes = {};
        BLOCOS[DOC].forEach(function (b) { nomes[b[0]] = b[1]; });
        const larg = window.innerWidth >= 900;
        let lista = '';
        D.blocos.forEach(function (b, i) {
            const livre = /^t\d+$/.test(b.id);
            const extra = [];
            if (b.id === 'nome') extra.push(seg([['e', 'E'], ['c', 'C'], ['d', 'D']], b.al, 'al:' + i));
            if (b.id === 'logo') extra.push(seg([[25, '25%'], [40, '40%'], [60, '60%'], [100, '100%']], b.pct, 'pct:' + i));
            let corpo = '';
            if (b.id === 'titulo' || b.id === 'final') corpo = '<input data-tx="' + i + '" value="' + esc(b.texto === undefined ? TEXTO_PADRAO[DOC][b.id] : b.texto) + '" style="width:100%;box-sizing:border-box;padding:7px;border:2px solid #ddd;border-radius:8px;font-size:.85rem;margin-top:6px;">';
            if (livre) corpo = '<textarea data-tx="' + i + '" rows="2" placeholder="Ex.: Instagram @seunegocio · Wi-Fi: senha123" style="width:100%;box-sizing:border-box;padding:7px;border:2px solid #ddd;border-radius:8px;font-size:.85rem;margin-top:6px;font-family:inherit;">' + esc(b.texto || '') + '</textarea><div style="margin-top:4px;display:flex;gap:8px;align-items:center;">' + seg([['e', 'E'], ['c', 'C'], ['d', 'D']], b.al, 'al:' + i) + '<label style="font-size:.78rem;"><input type="checkbox" data-bd="' + i + '"' + (b.b ? ' checked' : '') + '> negrito</label></div>';
            const estilavel = ['qr', 'cor'].indexOf(b.id) < 0 && b.id !== 'logo';
            let painelEst = '';
            if (estilavel && EST[DOC + b.id]) {
                painelEst = '<div style="margin:8px 0 2px 24px;padding:10px;background:#fff;border-radius:10px;font-size:.8rem;">' +
                    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">Alinhamento ' + seg([['e', 'E'], ['c', 'C'], ['d', 'D']], b.al, 'al:' + i) + '</div>' +
                    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">Peso ' + seg([['', 'Padrão'], ['0', 'Normal'], ['1', 'Negrito']], b.neg === undefined ? '' : String(b.neg), 'neg:' + i) + '</div>' +
                    '<div style="margin-bottom:8px;">Tamanho da fonte: <b id="fsv' + i + '">' + (b.fs ? b.fs + '%' : 'padrão') + '</b> <a href="#" data-fsr="' + i + '" style="color:' + COR + ';margin-left:6px;">padrão</a><input type="range" data-fs="' + i + '" min="70" max="200" step="5" value="' + (b.fs || 100) + '" style="width:100%;"></div>' +
                    '<div style="margin-bottom:8px;">Fonte <select data-ft="' + i + '" style="padding:6px;border:2px solid #ddd;border-radius:8px;font-size:.85rem;max-width:62%;float:right;"><option value="">Padrão (da impressão)</option>' + Object.keys(window.IMP_FONTES).map(function (k) { return '<option value="' + k + '"' + (b.ft === k ? ' selected' : '') + '>' + window.IMP_FONTES[k].nome + '</option>'; }).join('') + '</select><div style="clear:both"></div></div>' +
                    '<div>Cor do texto <input type="color" data-cor="' + i + '" value="' + (b.cor || '#000000') + '" style="vertical-align:middle;margin-left:6px;"> <a href="#" data-corr="' + i + '" style="color:' + COR + ';margin-left:6px;">padrão (preto)</a></div>' +
                    '<div style="font-size:.7rem;color:#777;margin-top:6px;line-height:1.3;">Na térmica Bluetooth a cor não existe (sai preto). Tamanho a partir de 120% = letra de altura dupla; 150% ou mais = dupla em altura e largura; até 85% ou fonte Condensada = fonte menor da impressora.</div></div>';
            }
            lista += '<div style="padding:8px 0;border-bottom:1px solid #e0c8e8;"><div style="display:flex;align-items:center;gap:6px;">' +
                '<div style="display:flex;flex-direction:column;"><button data-up="' + i + '" style="border:0;background:none;color:#767676;font-size:.8rem;padding:0 4px;">▲</button><button data-dn="' + i + '" style="border:0;background:none;color:#767676;font-size:.8rem;padding:0 4px;">▼</button></div>' +
                '<div style="flex:1;font-weight:600;font-size:.9rem;min-width:0;">' + esc(livre ? 'Texto livre' : nomes[b.id]) + '</div>' + extra.join('') + (estilavel ? '<button data-est="' + b.id + '" title="Estilo do texto" style="border:0;background:none;color:' + COR + ';font-size:1rem;padding:0 4px;"><i class="fas fa-sliders"></i></button>' : '') +
                '<label class="toggle"><input type="checkbox" data-on="' + i + '"' + (b.on ? ' checked' : '') + '><span class="slider"></span></label>' +
                (livre ? '<button data-rm="' + i + '" style="border:0;background:none;color:#c62828;font-size:1rem;">🗑</button>' : '') + '</div>' + corpo + painelEst + '</div>';
        });
        const a4 = D.papel === 'a4' && (DOC === 'recibo' || DOC === 'pendencia');
        const OA = LAY.a4;
        const tg = function (k, t, sub) { return '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #e0c8e8;"><div style="flex:1;"><div style="font-weight:600;font-size:.9rem;">' + t + '</div>' + (sub ? '<div style="font-size:.72rem;color:#777;">' + sub + '</div>' : '') + '</div><label class="toggle"><input type="checkbox" data-a4="' + k + '"' + (OA[k] !== false ? ' checked' : '') + '><span class="slider"></span></label></div>'; };
        const inp = function (k, t, ph) { return '<label style="display:block;font-size:.78rem;color:#555;margin-top:8px;">' + t + '<input data-emp="' + k + '" value="' + esc(CFG[k] || '') + '" placeholder="' + ph + '" style="width:100%;box-sizing:border-box;padding:8px;border:2px solid #ddd;border-radius:8px;font-size:.85rem;margin-top:2px;"></label>'; };
        const cartaoA4 = '<div style="background:#E3F2FD;border-radius:12px;padding:12px;margin-bottom:10px;"><b style="font-size:.85rem;"><i class="fas fa-file-lines"></i> Impressão A4</b>' +
            tg('ativo', 'Habilitar impressão A4', 'Desligado: o app só oferece a impressão térmica (cupom)') +
            (OA.ativo !== false ? tg('nf', 'Nota (NF)', 'Folha A4 em formato de nota. Pendências sempre saem como Nota') + tg('simples', 'Recibo simples', 'Recibo de pagamento curto, só para comanda paga') +
            '<div style="font-size:.72rem;color:#777;margin-top:6px;">Pelo menos um modelo fica ligado.</div>' : '') + '</div>';
        const simples = OA.modelo === 'simples';
        const blocosA4 = '<div style="background:#FCE4EC;border-radius:12px;padding:12px;margin-bottom:10px;"><b style="font-size:.85rem;">Modelo A4 do recibo</b>' +
            '<div style="margin:8px 0;">' + seg([['nota', 'Nota (NF)'], ['simples', 'Recibo simples']].filter(function (m) { return OA[m[0] === 'nota' ? 'nf' : 'simples'] !== false; }), OA.modelo || 'nota', 'modelo') + '</div>' +
            '<div style="font-size:.72rem;color:#777;margin:0 0 8px;">É o modelo padrão do A4; na tela do recibo dá para trocar na hora. O recibo simples só vale para comanda <b>paga</b> (pendente/aguardando sai como nota).</div>' +
            '<div style="font-size:.72rem;color:#777;margin:4px 0 6px;">Cabeçalho e rodapé saem em todas as páginas; se os itens não couberem, as páginas seguintes são geradas. O aviso <b>DOCUMENTO SEM VALOR FISCAL</b> sempre é impresso.</div>' +
            tg('logo', 'Logo', 'Usa a logo das configurações') + tg('empresa', 'Dados da empresa', 'Razão social, CNPJ/CPF e endereço no topo') + (simples ? '' : tg('qr', 'QR Code Pix', 'Só aparece se o recibo estiver aguardando pagamento ou pendente') + tg('obs', 'Observações') + tg('ass', 'Assinaturas')) +
            '<button data-emp-link class="btn-outline" style="width:100%;margin-top:10px;background:#fff;"><i class="fas fa-building"></i> Editar dados da empresa (Cadastros › Empresa)</button>' +
            (simples ? '' : inp('recibosObservacao', 'Texto das observações', 'Obrigado pela preferência!')) +
            '<div style="font-size:.72rem;color:#777;margin-top:6px;">A impressora A4 é cadastrada em Configurações › Impressoras.</div></div>';
        const painel = '<div style="padding:12px;overflow-y:auto;' + (larg ? 'width:420px;flex:0 0 420px;' : '') + '">' + cartaoA4 +
            '<div style="background:#FCE4EC;border-radius:12px;padding:12px;margin-bottom:10px;"><b style="font-size:.85rem;">Documento</b><div style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0;">' +
            Object.keys(DOCS).map(function (d) { return '<span data-doc="' + d + '" style="padding:6px 12px;border-radius:16px;font-size:.8rem;font-weight:600;cursor:pointer;' + (d === DOC ? 'background:' + COR + ';color:#fff;' : 'background:#fff;') + '">' + DOCS[d] + '</span>'; }).join('') + '</div>' +
            seg([['58', 'Térmica 58mm'], ['80', 'Térmica 80mm']].concat((LAY.a4.ativo !== false || D.papel === 'a4') ? [['a4', 'A4']] : []), D.papel, 'papel') + '</div>' +
            '' + (a4 ? blocosA4 : '<div style="background:#FCE4EC;border-radius:12px;padding:12px;margin-bottom:10px;"><b style="font-size:.85rem;">Blocos (use ▲ ▼ para reordenar)</b>' + lista +
            '<button data-add class="btn-outline" style="width:100%;margin-top:10px;background:#fff;">+ Adicionar linha de texto</button></div>') +
            '<div style="background:#FCE4EC;border-radius:12px;padding:12px;margin-bottom:10px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;"><b style="font-size:.85rem;">Linha separadora</b>' + seg([['tracejada', '- - -'], ['solida', '───'], ['pontos', '···']], LAY.sep, 'sep') + '</div>' +
            '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;"><b style="font-size:.85rem;">Margem lateral</b>' + seg([['menor', 'Menor'], ['normal', 'Normal'], ['maior', 'Maior']], LAY.margem, 'margem') + '</div>' +
            '<div style="font-size:.72rem;color:#777;line-height:1.3;margin-top:4px;">A margem vale para tela e impressão comum. O tipo e o tamanho da fonte ficam em Configurações › Fonte da impressão.</div>' +
            '<button data-reset class="btn-outline" style="width:100%;margin-top:10px;background:#fff;">Restaurar layout padrão</button></div></div>';
        const cfgP = Object.assign({}, CFG, { imprimirLogo: CFG.imprimirLogo !== false, layoutImp: LAY });
        const doc = await window.impDocumento(DOC, amostraDe(DOC), cfgP, { amostra: true, aberto: false });
        const corpoPrev = a4 ? (window.impReciboA4Html ? folhaA4(window.impReciboA4Auto(amostraA4(DOC), cfgP, { modelo: LAY.a4.modelo, pagador: { nome: 'Maria da Silva', doc: '123.456.789-00' }, aberto: DOC === 'recibo' && PREV_ABERTO, pixAmostra: true, logoAmostra: LOGO_AMOSTRA, data: '11/11/2026 13:20' }), ov) : '') : window.impHtml(doc, cfgP);
        const prev = '<div style="padding:12px;overflow-y:auto;flex:1;min-width:0;"><b style="font-size:.85rem;">Pré-visualização' + (a4 ? ' — A4' : '') + '</b>' + (a4 && DOC === 'recibo' ? '<label style="display:block;font-size:.78rem;margin:6px 0;"><input type="checkbox" data-prevab' + (PREV_ABERTO ? ' checked' : '') + '> Simular recibo <b>aguardando pagamento</b> (mostra o QR Pix)</label>' : '') + '<div style="background:#eee;border-radius:12px;padding:12px;margin-top:8px;overflow-x:auto;">' + corpoPrev + '</div><div style="font-size:.72rem;color:#777;margin-top:6px;">Exemplo com dados fictícios. Na térmica Bluetooth, logo e QR saem como imagem.</div></div>';
        const abas = larg ? '' : '<div style="display:flex;background:#fff;border-bottom:1px solid #ddd;">' + [['editar', 'Editar'], ['previa', 'Pré-visualizar']].map(function (a) { return '<div data-visao="' + a[0] + '" style="flex:1;text-align:center;padding:10px;font-weight:700;font-size:.85rem;cursor:pointer;' + (VISAO === a[0] ? 'color:' + COR + ';border-bottom:3px solid ' + COR + ';' : 'color:#777;') + '">' + a[1] + '</div>'; }).join('') + '</div>';
        ov.innerHTML = '<div style="background:' + COR + ';color:#fff;padding:14px 16px;font-weight:700;display:flex;align-items:center;gap:10px;"><span data-fechar style="cursor:pointer;font-size:1.2rem;">←</span> Layout de impressão</div>' + abas +
            '<div style="display:flex;flex:1;min-height:0;overflow:hidden;">' + (larg ? painel + prev : (VISAO === 'editar' ? painel : prev)) + '</div>';
        ligar(ov);
    }
    function ligar(ov) {
        const D = LAY[DOC], re = function () { salvar(); desenhar(ov); };
        const $$ = function (s, f) { ov.querySelectorAll(s).forEach(f); };
        $$('[data-fechar]', function (e) { e.onclick = function () { ov.remove(); }; });
        $$('[data-visao]', function (e) { e.onclick = function () { VISAO = e.dataset.visao; desenhar(ov); }; });
        $$('[data-doc]', function (e) { e.onclick = function () { DOC = e.dataset.doc; desenhar(ov); }; });
        $$('[data-seg]', function (e) {
            e.onclick = function () {
                const p = e.dataset.seg.split(':'), v = e.dataset.v;
                if (p[0] === 'papel') D.papel = v;
                else if (p[0] === 'sep') LAY.sep = v;
                else if (p[0] === 'modelo') LAY.a4.modelo = v;
                else if (p[0] === 'margem') LAY.margem = v;
                else if (p[0] === 'al') D.blocos[+p[1]].al = v;
                else if (p[0] === 'neg') { if (v === '') delete D.blocos[+p[1]].neg; else D.blocos[+p[1]].neg = +v; }
                else if (p[0] === 'pct') D.blocos[+p[1]].pct = +v;
                re();
            };
        });
        $$('[data-emp-link]', function (e) { e.onclick = function () { ov.remove(); if (window.navigateTo) window.navigateTo('empresa'); }; });
        $$('[data-a4]', function (e) { e.onchange = function () {
            const k = e.dataset.a4, A = LAY.a4;
            if ((k === 'nf' || k === 'simples') && !e.checked && A[k === 'nf' ? 'simples' : 'nf'] === false) { e.checked = true; if (window.mostrarToast) window.mostrarToast('Mantenha pelo menos um modelo A4 ligado.'); return; }
            A[k] = e.checked;
            if (A.nf === false && A.modelo === 'nota') A.modelo = 'simples';
            if (A.simples === false && A.modelo === 'simples') A.modelo = 'nota';
            re(); }; });
        $$('[data-prevab]', function (e) { e.onchange = function () { PREV_ABERTO = e.checked; desenhar(ov); }; });
        $$('[data-emp]', function (e) { e.oninput = function () { salvarEmpresa(e.dataset.emp, e.value); atualizaPrev(ov); }; });
        $$('[data-est]', function (e) { e.onclick = function () { const k = DOC + e.dataset.est; EST[k] = !EST[k]; desenhar(ov); }; });
        $$('[data-fs]', function (e) { e.oninput = function () { const b = D.blocos[+e.dataset.fs]; b.fs = +e.value; const sp = ov.querySelector('#fsv' + e.dataset.fs); if (sp) sp.textContent = e.value + '%'; salvar(); atualizaPrev(ov); }; });
        $$('[data-fsr]', function (e) { e.onclick = function (ev) { ev.preventDefault(); delete D.blocos[+e.dataset.fsr].fs; re(); }; });
        $$('[data-ft]', function (e) { e.onchange = function () { const b = D.blocos[+e.dataset.ft]; if (e.value) b.ft = e.value; else delete b.ft; re(); }; });
        $$('[data-cor]', function (e) { e.oninput = function () { D.blocos[+e.dataset.cor].cor = e.value; salvar(); atualizaPrev(ov); }; });
        $$('[data-corr]', function (e) { e.onclick = function (ev) { ev.preventDefault(); delete D.blocos[+e.dataset.corr].cor; re(); }; });
        $$('[data-on]', function (e) { e.onchange = function () { D.blocos[+e.dataset.on].on = e.checked; re(); }; });
        $$('[data-bd]', function (e) { e.onchange = function () { D.blocos[+e.dataset.bd].b = e.checked; re(); }; });
        $$('[data-tx]', function (e) { e.oninput = function () { D.blocos[+e.dataset.tx].texto = e.value; salvar(); atualizaPrev(ov); }; });
        $$('[data-up]', function (e) { e.onclick = function () { const i = +e.dataset.up; if (i > 0) { const t = D.blocos[i]; D.blocos[i] = D.blocos[i - 1]; D.blocos[i - 1] = t; re(); } }; });
        $$('[data-dn]', function (e) { e.onclick = function () { const i = +e.dataset.dn; if (i < D.blocos.length - 1) { const t = D.blocos[i]; D.blocos[i] = D.blocos[i + 1]; D.blocos[i + 1] = t; re(); } }; });
        $$('[data-rm]', function (e) { e.onclick = function () { D.blocos.splice(+e.dataset.rm, 1); re(); }; });
        $$('[data-add]', function (e) { e.onclick = function () { let n = 1; const ids = D.blocos.map(function (b) { return b.id; }); while (ids.indexOf('t' + n) >= 0) n++; D.blocos.push({ id: 't' + n, on: true, al: 'c', texto: 'Novo texto' }); re(); }; });
        $$('[data-reset]', async function (e) { e.onclick = async function () { if (!await window.confirmar('Restaurar o layout padrão de todos os documentos?', { perigo: true, ok: 'Restaurar' })) return; LAY = padrao(); re(); }; });
    }
    async function atualizaPrev(ov) {   // digitação: atualiza só o cupom, sem recriar os campos
        const a4m = ov.querySelector('.imp-a4');
        if (a4m) { const cA = Object.assign({}, CFG, { imprimirLogo: CFG.imprimirLogo !== false, layoutImp: LAY }); a4m.parentNode.parentNode.innerHTML = folhaA4(window.impReciboA4Auto(amostraA4(DOC), cA, { modelo: LAY.a4.modelo, pagador: { nome: 'Maria da Silva', doc: '123.456.789-00' }, aberto: DOC === 'recibo' && PREV_ABERTO, pixAmostra: true, logoAmostra: LOGO_AMOSTRA, data: '11/11/2026 13:20' }), ov); return; }
        const caixa = ov.querySelector('.imp-cupom'); if (!caixa) return;
        const cfgP = Object.assign({}, CFG, { imprimirLogo: CFG.imprimirLogo !== false, layoutImp: LAY });
        const doc = await window.impDocumento(DOC, amostraDe(DOC), cfgP, { amostra: true });
        caixa.parentNode.innerHTML = window.impHtml(doc, cfgP);
    }
    window.abrirLayoutImpressao = async function (docIni, papelIni) {
        try { CFG = window.normalizarArray(await apiGet('configuracoes'))[0] || {}; } catch (e) { CFG = {}; }
        LAY = window.impLayoutDe(CFG); DOC = DOCS[docIni] ? docIni : 'comanda'; VISAO = 'editar'; PREV_ABERTO = false;
        if (papelIni && LAY[DOC]) LAY[DOC].papel = papelIni;
        const ov = document.createElement('div');
        ov.style.cssText = 'position:fixed;inset:0;z-index:100000;background:#f5f5f5;display:flex;flex-direction:column;';
        document.body.appendChild(ov);
        desenhar(ov);
    };
})();
