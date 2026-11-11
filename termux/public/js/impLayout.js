// Layout de impressão: um único motor para comanda, recibo e via da cozinha.
// - impDocumento(tipo, c, config, opts) -> { lines, papel, sep, margem }  (modelo neutro)
// - impHtml(doc, config)               -> HTML (tela, impressão comum, imagem do WhatsApp)
// - impPagina(inner, titulo)           -> página completa que abre o diálogo de impressão
// - a Bluetooth (bluetooth.js) converte as mesmas linhas em ESC/POS
// - abrirLayoutImpressao()             -> tela de edição com pré-visualização
(function () {
    'use strict';
    const COR = '#C2185B';
    const DOCS = { comanda: 'Comanda', recibo: 'Recibo', cozinha: 'Cozinha' };
    const BLOCOS = {
        comanda: [['logo', 'Logo'], ['nome', 'Nome do estabelecimento'], ['titulo', 'Título do documento'], ['cor', 'Faixa de cor do caixa'], ['cab', 'Comanda / Mesa / Data'], ['cliente', 'Cliente e garçom'], ['itens', 'Itens'], ['totais', 'Totais'], ['qr', 'QR Code PIX'], ['final', 'Mensagem final']],
        recibo: [['logo', 'Logo'], ['nome', 'Nome do estabelecimento'], ['titulo', 'Título e situação'], ['cor', 'Faixa de cor do caixa'], ['cab', 'Comanda / Mesa / Data'], ['cliente', 'Cliente e garçom'], ['itens', 'Itens'], ['totais', 'Totais e pagamentos'], ['pendencias', 'Pendências'], ['qr', 'QR Code PIX'], ['assinatura', 'Linha de assinatura'], ['final', 'Mensagem final']],
        cozinha: [['nome', 'Nome do estabelecimento'], ['titulo', 'Título do documento'], ['cab', 'Comanda / Mesa / Hora'], ['cliente', 'Cliente e garçom'], ['itens', 'Itens (sem preço)'], ['final', 'Mensagem final']]
    };
    const TEXTO_PADRAO = {
        comanda: { titulo: 'COMPROVANTE DE CONSUMO', final: 'Obrigado pela preferência!' },
        recibo: { titulo: 'RECIBO DE PAGAMENTO', final: 'Obrigado pela preferência!' },
        cozinha: { titulo: 'PEDIDO - COZINHA', final: '' }
    };
    const SUBS = { logo: 'Centralizado', itens: 'Qtd · Nome · Valor', final: 'Texto da mensagem' };
    const ON_PADRAO = { cozinha: { final: false } };
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
    // junta o salvo com o padrão (blocos novos entram no fim)
    window.impLayoutDe = function (config) {
        const base = padrao(), s = (config && config.layoutImp) || {};
        if (s.sep) base.sep = s.sep;
        if (s.margem) base.margem = s.margem;
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
                Object.keys(mapa).forEach(function (k) { out.push(mapa[k]); });
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
        const LAY = window.impLayoutDe(config), D = LAY[tipo] || LAY.comanda;
        const calc = window.calcularTotais ? window.calcularTotais(c) : { subtotal: c.subtotal || 0, desconto: 0, total: c.total || 0 };
        const L = [];
        const sep = function () { L.push({ k: 'sep' }); };
        const tipoPix = tipo === 'recibo' ? 'recibo' : 'comanda';
        for (const b of D.blocos) {
            if (!b.on) continue;
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
                if (tipo === 'recibo') {
                    if (opts.aberto) L.push({ k: 't', t: 'AGUARDANDO FECHAMENTO', b: 1, al: 'c', bg: '#fff3e0', fg: '#e65100' });
                    else if (c.pagamentoPendente) L.push({ k: 't', t: 'PENDENTE (FIADO)', b: 1, al: 'c', bg: '#fff3e0', fg: '#e65100' });
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
                const data = tipo === 'cozinha' ? (opts.agora || new Date().toLocaleString('pt-BR')) : (tipo === 'recibo' ? (c.dataFechamento || opts.agora || new Date().toLocaleString('pt-BR')) : (c.dataAbertura || new Date().toLocaleString('pt-BR')));
                L.push({ k: 't', t: (tipo === 'cozinha' ? 'Hora: ' : 'Data: ') + data });
            } else if (id === 'cliente') {
                if (c.cliente) L.push({ k: 't', t: 'Cliente: ' + c.cliente });
                if (c.garcom) L.push({ k: 't', t: 'Garçom: ' + c.garcom });
            } else if (id === 'itens') {
                sep();
                const itens = window.normalizarArray(c.itens) || [];
                if (tipo === 'recibo') L.push({ k: 't', t: 'ITENS CONSUMIDOS (' + itens.reduce(function (s, i) { return s + Number(i.quantidade || 0); }, 0) + ')', b: 1 });
                itens.forEach(function (i) {
                    const q = Number(i.quantidade || 0), nome = q + 'x ' + i.nome;
                    if (tipo === 'cozinha') {
                        L.push({ k: 't', t: nome, b: 1 });
                        const ob = i.observacao || i.obs || i.observacoes; if (ob) L.push({ k: 't', t: '  * ' + ob, small: 1 });
                    } else L.push({ k: 'duas', l: nome, r: money(Number(i.preco) * q) });
                });
            } else if (id === 'totais') {
                if (tipo === 'cozinha') continue;
                sep();
                if (calc.desconto > 0) { L.push({ k: 'duas', l: 'Subtotal', r: money(calc.subtotal) }); L.push({ k: 'duas', l: 'Desconto', r: '-' + money(calc.desconto) }); }
                L.push({ k: 'duas', l: 'TOTAL', r: money(calc.total), b: 1, g: 1 });
                if (tipo === 'recibo') {
                    const pg = window.normalizarArray(c.pagamentos) || [];
                    L.push({ k: 't', t: 'FORMA DE PAGAMENTO', b: 1, mt: 1 });
                    if (!pg.length) L.push({ k: 't', t: 'Nenhum pagamento registrado.', al: 'c' });
                    pg.forEach(function (p) {
                        L.push({ k: 'duas', l: FORMAS[p.forma] || p.forma, r: money(p.valor) });
                        if (p.maquininha && window.maquininhaTexto) { const mt = window.maquininhaTexto(p.maquininha); if (mt) L.push({ k: 't', t: mt, small: 1 }); }
                    });
                    if (Number(c.troco) > 0) L.push({ k: 'duas', l: 'Troco', r: money(c.troco) });
                }
            } else if (id === 'pendencias') {
                if (tipo !== 'recibo' || !window.pendenciasAnteriores) continue;
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
                if (tipo === 'cozinha') continue;
                const pix = opts.amostra ? 26 : (window.pixValorPago ? window.pixValorPago(c) : 0);
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
        // limpa separadores repetidos ou nas pontas
        const out = [];
        L.forEach(function (l) { if (l.k === 'sep' && (!out.length || out[out.length - 1].k === 'sep')) return; out.push(l); });
        while (out.length && out[out.length - 1].k === 'sep') out.pop();
        return { lines: out, papel: D.papel || '58', sep: LAY.sep, margem: LAY.margem, tipo: tipo };
    };

    // ---------- HTML ----------
    function borda(sep) { return sep === 'solida' ? '1px solid #000' : (sep === 'pontos' ? '2px dotted #000' : '1px dashed #000'); }
    window.impHtml = function (doc, config) {
        const F = window.impFonte ? window.impFonte(config || {}) : { family: 'monospace', tam: 100 };
        const k = F.tam / 100, W = PAPEL_PX[doc.papel] || 280, pad = MARGEM_PX[doc.margem] || 10;
        let h = '<div class="imp-cupom" style="box-sizing:border-box;width:' + Math.round(W / k) + 'px;max-width:100%;zoom:' + k + ';margin:0 auto;padding:' + pad + 'px;background:#fff;color:#000;font-family:' + F.family + ';font-size:12px;line-height:1.35;">';
        doc.lines.forEach(function (l) {
            const al = l.al === 'e' ? 'left' : (l.al === 'd' ? 'right' : 'center');
            if (l.k === 'sep') h += '<div style="border-top:' + borda(doc.sep) + ';margin:6px 0;"></div>';
            else if (l.k === 't') {
                const al2 = l.al ? al : 'left';
                h += '<div style="text-align:' + al2 + ';' + (l.b ? 'font-weight:700;' : '') + (l.g ? 'font-size:16px;' : '') + (l.small ? 'font-size:10px;color:#444;' : '') + (l.mt ? 'margin-top:8px;' : '') +
                    (l.bg ? 'background:' + l.bg + ';color:' + (l.fg || '#000') + ';padding:3px 6px;border-radius:4px;margin:3px 0;-webkit-print-color-adjust:exact;print-color-adjust:exact;' : '') + 'word-break:break-word;">' + esc(l.t) + '</div>';
            } else if (l.k === 'duas') h += '<div style="display:flex;justify-content:space-between;gap:8px;' + (l.b ? 'font-weight:700;' : '') + (l.g ? 'font-size:15px;' : '') + '"><span style="min-width:0;word-break:break-word;">' + esc(l.l) + '</span><span style="white-space:nowrap;">' + esc(l.r) + '</span></div>';
            else if (l.k === 'logo') {
                if (l.amostra) h += '<div style="width:' + l.pct + '%;aspect-ratio:1;max-width:80px;border-radius:50%;background:' + COR + ';color:#fff;display:flex;align-items:center;justify-content:center;margin:0 auto 4px;font-weight:800;font-size:12px;">LOGO</div>';
                else h += '<img src="' + esc(l.src) + '" style="display:block;margin:0 auto 5px;width:' + l.pct + '%;max-height:90px;object-fit:contain;">';
            } else if (l.k === 'qr') {
                if (l.amostra) h += '<div style="text-align:center;"><div style="border-top:' + borda(doc.sep) + ';margin:6px 0;"></div><b>PAGAMENTO VIA PIX</b><div style="width:70px;height:70px;margin:6px auto;background:repeating-conic-gradient(#000 0 25%,#fff 0 50%) 0 0/14px 14px;"></div><div>Valor PIX: ' + money(l.valor) + '</div></div>';
                else h += l.html || '';
            }
        });
        return h + '</div>';
    };
    window.impPagina = function (inner, titulo) {
        return '<html><head><meta charset="utf-8"><title>' + esc(titulo) + '</title><style>@page{margin:0}body{margin:0;background:#fff;}</style></head><body>' + inner + '<br><br>' +
            '<script>window.onload=function(){setTimeout(function(){window.print();window.close();},400);}<\/script></body></html>';
    };
    window.impPapelCols = function (papel) { return PAPEL_COLS[papel] || 32; };
    window.impSepChar = function (sep) { return sep === 'solida' ? '=' : (sep === 'pontos' ? '.' : '-'); };

    // ---------- tela de edição ----------
    let LAY = null, DOC = 'comanda', VISAO = 'editar', CFG = {}, timer = null;
    const AMOSTRA = { numero: 12, mesa: '4', dataAbertura: '11/11/2026 12:40', dataFechamento: '11/11/2026 13:20', cliente: 'Maria', garcom: 'João',
        itens: [{ nome: 'Pastel de carne', quantidade: 2, preco: 6 }, { nome: 'Suco de laranja', quantidade: 1, preco: 8 }, { nome: 'Pastel de queijo', quantidade: 1, preco: 6, observacao: 'sem cebola' }],
        pagamentos: [{ forma: 'pix', valor: 26 }], troco: 0, desconto: 0 };

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
            lista += '<div style="padding:8px 0;border-bottom:1px solid #e0c8e8;"><div style="display:flex;align-items:center;gap:6px;">' +
                '<div style="display:flex;flex-direction:column;"><button data-up="' + i + '" style="border:0;background:none;color:#999;font-size:.8rem;padding:0 4px;">▲</button><button data-dn="' + i + '" style="border:0;background:none;color:#999;font-size:.8rem;padding:0 4px;">▼</button></div>' +
                '<div style="flex:1;font-weight:600;font-size:.9rem;min-width:0;">' + esc(livre ? 'Texto livre' : nomes[b.id]) + '</div>' + extra.join('') +
                '<label class="toggle"><input type="checkbox" data-on="' + i + '"' + (b.on ? ' checked' : '') + '><span class="slider"></span></label>' +
                (livre ? '<button data-rm="' + i + '" style="border:0;background:none;color:#c62828;font-size:1rem;">🗑</button>' : '') + '</div>' + corpo + '</div>';
        });
        const painel = '<div style="padding:12px;overflow-y:auto;' + (larg ? 'width:420px;flex:0 0 420px;' : '') + '">' +
            '<div style="background:#FCE4EC;border-radius:12px;padding:12px;margin-bottom:10px;"><b style="font-size:.85rem;">Documento</b><div style="display:flex;gap:6px;margin:8px 0;">' +
            Object.keys(DOCS).map(function (d) { return '<span data-doc="' + d + '" style="padding:6px 12px;border-radius:16px;font-size:.8rem;font-weight:600;cursor:pointer;' + (d === DOC ? 'background:' + COR + ';color:#fff;' : 'background:#fff;') + '">' + DOCS[d] + '</span>'; }).join('') + '</div>' +
            seg([['58', 'Térmica 58mm'], ['80', 'Térmica 80mm'], ['a4', 'A4']], D.papel, 'papel') + '</div>' +
            '<div style="background:#FCE4EC;border-radius:12px;padding:12px;margin-bottom:10px;"><b style="font-size:.85rem;">Blocos (use ▲ ▼ para reordenar)</b>' + lista +
            '<button data-add class="btn-outline" style="width:100%;margin-top:10px;background:#fff;">+ Adicionar linha de texto</button></div>' +
            '<div style="background:#FCE4EC;border-radius:12px;padding:12px;margin-bottom:10px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;"><b style="font-size:.85rem;">Linha separadora</b>' + seg([['tracejada', '- - -'], ['solida', '───'], ['pontos', '···']], LAY.sep, 'sep') + '</div>' +
            '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;"><b style="font-size:.85rem;">Margem lateral</b>' + seg([['menor', 'Menor'], ['normal', 'Normal'], ['maior', 'Maior']], LAY.margem, 'margem') + '</div>' +
            '<div style="font-size:.72rem;color:#777;line-height:1.3;margin-top:4px;">A margem vale para tela e impressão comum. O tipo e o tamanho da fonte ficam em Configurações › Fonte da impressão.</div>' +
            '<button data-reset class="btn-outline" style="width:100%;margin-top:10px;background:#fff;">Restaurar layout padrão</button></div></div>';
        const cfgP = Object.assign({}, CFG, { imprimirLogo: CFG.imprimirLogo !== false, layoutImp: LAY });
        const doc = await window.impDocumento(DOC, AMOSTRA, cfgP, { amostra: true, aberto: false });
        const prev = '<div style="padding:12px;overflow-y:auto;flex:1;min-width:0;"><b style="font-size:.85rem;">Pré-visualização</b><div style="background:#eee;border-radius:12px;padding:12px;margin-top:8px;overflow-x:auto;">' + window.impHtml(doc, cfgP) + '</div><div style="font-size:.72rem;color:#777;margin-top:6px;">Exemplo com dados fictícios. Na térmica Bluetooth, logo e QR saem como imagem.</div></div>';
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
                else if (p[0] === 'margem') LAY.margem = v;
                else if (p[0] === 'al') D.blocos[+p[1]].al = v;
                else if (p[0] === 'pct') D.blocos[+p[1]].pct = +v;
                re();
            };
        });
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
        const caixa = ov.querySelector('.imp-cupom'); if (!caixa) return;
        const cfgP = Object.assign({}, CFG, { imprimirLogo: CFG.imprimirLogo !== false, layoutImp: LAY });
        const doc = await window.impDocumento(DOC, AMOSTRA, cfgP, { amostra: true });
        caixa.parentNode.innerHTML = window.impHtml(doc, cfgP);
    }
    window.abrirLayoutImpressao = async function () {
        try { CFG = window.normalizarArray(await apiGet('configuracoes'))[0] || {}; } catch (e) { CFG = {}; }
        LAY = window.impLayoutDe(CFG); DOC = 'comanda'; VISAO = 'editar';
        const ov = document.createElement('div');
        ov.style.cssText = 'position:fixed;inset:0;z-index:100000;background:#f5f5f5;display:flex;flex-direction:column;';
        document.body.appendChild(ov);
        desenhar(ov);
    };
})();
