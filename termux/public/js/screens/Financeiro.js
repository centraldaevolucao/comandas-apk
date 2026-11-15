// ============================================================
// FINANCEIRO.JS — DRE, fluxo de caixa e contas a pagar/receber
// - DRE do mês (competência): receita das comandas fechadas − impostos − CMV − despesas − taxas
// - Fluxo de caixa: entradas (pagamentos recebidos) e saídas (despesas e compras pagas) por dia
// - Contas: despesas (com repetição mensal), compras recebidas a pagar e pendências (fiado) a receber
// Os percentuais de imposto e taxa vêm de "Precificação → Parâmetros".
// ============================================================
(function () {
    'use strict';
    if (window.renderFinanceiro) return;
    console.log('✔ Financeiro.js carregado');

    const COR = '#C2185B';
    const esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); };
    const R = function (v) { return window.formatMoney ? window.formatMoney(v) : 'R$ ' + Number(v || 0).toFixed(2).replace('.', ','); };
    const r2 = function (v) { return Math.round(Number(v || 0) * 100) / 100; };
    const num = function (v) { return parseFloat(String(v == null ? '' : v).replace(',', '.')) || 0; };
    const lista = function (x) { return window.normalizarArray(x); };
    const pct = function (v) { return (Math.round(v * 10) / 10).toString().replace('.', ',') + '%'; };
    const toast = function (t) { if (window.mostrarToast) window.mostrarToast(t); };
    const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const CATEGORIAS = ['Pessoal e encargos', 'Aluguel', 'Energia, água e gás', 'Marketing', 'Impostos e taxas', 'Manutenção', 'Internet e telefone', 'Outras'];
    const iso = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    const dataBR = function (s) { if (!s) return ''; const p = String(s).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : s; };
    const doMes = function (isoStr, ano, mes) { const p = String(isoStr || '').split('-'); return p.length === 3 && Number(p[0]) === ano && Number(p[1]) - 1 === mes; };

    const hoje = new Date();
    window.finState = { aba: 'dre', ano: hoje.getFullYear(), mes: hoje.getMonth(), comandas: [], produtos: [], despesas: [], compras: [], cfg: { imposto: 6, taxa: 2.5, fixas: 22, margem: 15 }, filtroContas: 'pendentes' };

    function modal(id, titulo, corpo, largura) {
        const old = document.getElementById(id); if (old) old.remove();
        const m = document.createElement('div');
        m.id = id; m.className = 'modal-overlay'; m.style.zIndex = '200000';
        m.innerHTML = '<div class="modal-content" style="max-width:' + (largura || 440) + 'px;max-height:92vh;display:flex;flex-direction:column;">' +
            '<div class="modal-header" style="background:' + COR + ';color:#fff;"><strong>' + titulo + '</strong>' +
            '<button class="btn-limpar" onclick="document.getElementById(\'' + id + '\').remove()" style="color:#fff;" aria-label="Fechar"><i class="fas fa-xmark"></i></button></div>' +
            '<div class="modal-body" style="overflow-y:auto;"><style>#' + id + ' label{display:block;margin-bottom:3px;}#' + id + ' input,#' + id + ' select{width:100%;box-sizing:border-box;min-width:0;}</style>' + corpo + '</div></div>';
        document.body.appendChild(m); return m;
    }
    const fechar = function (id) { const m = document.getElementById(id); if (m) m.remove(); };

    async function carregar() {
        const s = window.finState;
        const r = await Promise.all(['comandas', 'produtos', 'despesas', 'compras', 'configPrecificacao'].map(function (n) { return apiGet(n).catch(function () { return []; }); }));
        s.comandas = lista(r[0]); s.produtos = lista(r[1]); s.despesas = lista(r[2]); s.compras = lista(r[3]);
        const c = lista(r[4])[0]; if (c) s.cfg = Object.assign(s.cfg, c);
    }

    // ---------- cálculos ----------
    function totalComanda(c) { return window.calcularTotais ? window.calcularTotais(c).total : 0; }
    function comandasDoMes(s) {
        return s.comandas.filter(function (c) {
            if (!window.comandaEstaFechada(c)) return false;
            const d = window.parseDataBR(c.dataAbertura); return d && d.getFullYear() === s.ano && d.getMonth() === s.mes;
        });
    }
    function custoItem(s, it) {
        let p = s.produtos.find(function (x) { return it.produtoId != null && String(x.id) === String(it.produtoId); });
        if (!p) p = s.produtos.find(function (x) { return String(x.nome) === String(it.nome); });
        return p ? num(p.valorCusto) : 0;
    }
    window.finDRE = function (s) {
        s = s || window.finState;
        const cs = comandasDoMes(s);
        let bruta = 0, cmv = 0, semCusto = 0, cartaoPix = 0, pendente = 0;
        cs.forEach(function (c) {
            bruta += totalComanda(c); pendente += num(c.valorPendente);
            lista(c.itens).forEach(function (it) { if (it.statusProducao === 'faltou') return; const cu = custoItem(s, it); if (cu <= 0) semCusto++; cmv += cu * num(it.quantidade); });
            lista(c.pagamentos).forEach(function (p) { if (p.forma && p.forma !== 'dinheiro') cartaoPix += num(p.valor); });
        });
        const imposto = bruta * num(s.cfg.imposto) / 100, taxas = cartaoPix * num(s.cfg.taxa) / 100;
        const porCat = {};
        s.despesas.filter(function (d) { return doMes(d.vencimento, s.ano, s.mes); }).forEach(function (d) { const k = d.categoria || 'Outras'; porCat[k] = (porCat[k] || 0) + num(d.valor); });
        const despesas = Object.keys(porCat).reduce(function (t, k) { return t + porCat[k]; }, 0);
        const liquida = bruta - imposto, lucroBruto = liquida - cmv, resultado = lucroBruto - despesas - taxas;
        return { qtd: cs.length, bruta: r2(bruta), imposto: r2(imposto), liquida: r2(liquida), cmv: r2(cmv), lucroBruto: r2(lucroBruto), taxas: r2(taxas), porCat: porCat, despesas: r2(despesas), resultado: r2(resultado), margem: bruta > 0 ? resultado / bruta * 100 : 0, pendente: r2(pendente), semCusto: semCusto };
    };
    function fluxoDoMes(s) {
        const dias = {}, add = function (k, e, sa) { const d = dias[k] || (dias[k] = { e: 0, s: 0 }); d.e += e; d.s += sa; };
        s.comandas.forEach(function (c) {
            if (!window.comandaEstaFechada(c)) return;
            const d = window.parseDataBR(c.dataFechamento || c.dataAbertura); if (!d || d.getFullYear() !== s.ano || d.getMonth() !== s.mes) return;
            const v = lista(c.pagamentos).reduce(function (t, p) { return t + num(p.valor); }, 0); if (v > 0) add(iso(d), v, 0);
        });
        s.despesas.forEach(function (d) { if (d.pago && doMes(d.pagoEm, s.ano, s.mes)) add(d.pagoEm, 0, num(d.valor)); });
        s.compras.forEach(function (c) { if (c.status === 'recebida' && c.pago && doMes(c.pagoEm, s.ano, s.mes)) add(c.pagoEm, 0, num(c.total)); });
        return dias;
    }

    // ===================== TELA =====================
    window.renderFinanceiro = function () {
        setTimeout(window.finAtualizar, 40);
        return [
            '<div class="app-bar"><button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button><h1>Financeiro</h1>',
            '<button class="icon-btn" onclick="navigateTo(\'precificacao\')" title="Precificação"><i class="fas fa-tags"></i></button></div>',
            '<div id="fin-topo"></div>',
            '<div class="content-area" id="fin-corpo" style="padding:12px;"><p class="empty-state">🔄 Carregando...</p></div>'
        ].join('\n');
    };
    window.finAtualizar = async function () {
        const box = document.getElementById('fin-corpo'); if (!box) return;
        try { await carregar(); } catch (e) { box.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro: ' + esc(e.message) + '</p>'; return; }
        finDesenhar();
    };
    window.finAba = function (a) { window.finState.aba = a; finDesenhar(); };
    window.finMes = function (d) { const s = window.finState; let m = s.mes + d, a = s.ano; if (m < 0) { m = 11; a--; } if (m > 11) { m = 0; a++; } s.mes = m; s.ano = a; finDesenhar(); };
    function finDesenhar() {
        const s = window.finState, top = document.getElementById('fin-topo'), box = document.getElementById('fin-corpo'); if (!box) return;
        if (top) top.innerHTML =
            (s.aba !== 'contas' ? '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 16px;background:#fff;border-bottom:1px solid #eee;">' +
                '<button class="icon-btn" style="color:' + COR + ';" onclick="finMes(-1)" aria-label="Mês anterior"><i class="fas fa-chevron-left"></i></button>' +
                '<b>' + MESES[s.mes] + '/' + s.ano + '</b>' +
                '<button class="icon-btn" style="color:' + COR + ';" onclick="finMes(1)" aria-label="Próximo mês"><i class="fas fa-chevron-right"></i></button></div>' : '') +
            '<div style="display:flex;gap:8px;padding:10px 16px;background:#fff;border-bottom:1px solid #eee;">' +
            [['dre', 'DRE'], ['fluxo', 'Fluxo de caixa'], ['contas', 'Contas']].map(function (a) {
                const on = s.aba === a[0];
                return '<button onclick="finAba(\'' + a[0] + '\')" style="flex:1;border:1px solid ' + COR + ';border-radius:99px;padding:7px 10px;font-size:.82rem;font-weight:600;background:' + (on ? COR : '#fff') + ';color:' + (on ? '#fff' : COR) + ';">' + a[1] + '</button>';
            }).join('') + '</div>';
        box.innerHTML = s.aba === 'dre' ? htmlDRE(s) : s.aba === 'fluxo' ? htmlFluxo(s) : htmlContas(s);
    }

    // ---------- DRE ----------
    function htmlDRE(s) {
        const d = window.finDRE(s);
        const lin = function (rot, v, neg, ex) { return '<div style="display:flex;justify-content:space-between;padding:' + (ex ? '10px 12px' : '5px 12px') + ';font-size:' + (ex ? '.95rem' : '.85rem') + ';' + (ex ? 'background:#fff;border:1px solid #EBD9E0;border-radius:10px;margin:4px 0;' : 'color:#4A3A42;') + '"><' + (ex ? 'b' : 'span') + (neg ? ' style="color:#B3261E"' : '') + '>' + rot + '</' + (ex ? 'b' : 'span') + '><' + (ex ? 'b' : 'span') + (neg ? ' style="color:#B3261E"' : '') + '>' + (neg ? '− ' : '') + R(v) + '</' + (ex ? 'b' : 'span') + '></div>'; };
        if (!d.qtd && !d.despesas) return '<p class="empty-state">Sem vendas fechadas nem despesas em ' + MESES[s.mes] + '/' + s.ano + '.</p>';
        const cats = Object.keys(d.porCat).sort(function (a, b) { return d.porCat[b] - d.porCat[a]; });
        const corRes = d.resultado >= 0 ? '#1B6B3A' : '#B3261E';
        return '<div style="font-size:.72rem;color:#777;margin:0 4px 6px;">' + d.qtd + ' comanda(s) fechada(s) · regime de competência (data da comanda)</div>' +
            lin('Receita bruta', d.bruta, false, true) +
            lin('(−) Impostos (' + pct(num(s.cfg.imposto)) + ', estimado)', d.imposto, true) +
            lin('Receita líquida', d.liquida, false, true) +
            lin('(−) CMV · custo das mercadorias', d.cmv, true) +
            '<div style="display:flex;justify-content:space-between;padding:10px 12px;background:#FBE4EC;border:1px solid #EBC4D3;border-radius:10px;margin:4px 0;font-size:.95rem;"><b>Lucro bruto</b><b style="color:#A5144B;">' + R(d.lucroBruto) + '</b></div>' +
            '<div style="font-size:.72rem;font-weight:700;color:#777;letter-spacing:.05em;padding:8px 12px 2px;">DESPESAS OPERACIONAIS (por vencimento)</div>' +
            (cats.length ? cats.map(function (k) { return lin(esc(k), d.porCat[k], true); }).join('') : '<div style="padding:4px 12px;font-size:.82rem;color:#888;">Nenhuma despesa lançada neste mês. Cadastre em Contas.</div>') +
            lin('Taxas de cartão e Pix (' + pct(num(s.cfg.taxa)) + ', estimado)', d.taxas, true) +
            '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px;background:' + COR + ';color:#fff;border-radius:12px;margin-top:8px;"><div><div style="font-size:.75rem;opacity:.9;">Resultado do mês</div><div style="font-size:1.5rem;font-weight:800;">' + R(d.resultado) + '</div></div><div style="text-align:right;"><div style="font-size:.75rem;opacity:.9;">Margem</div><div style="font-size:1.2rem;font-weight:800;">' + pct(d.margem) + '</div></div></div>' +
            (d.pendente > 0 ? '<div style="font-size:.78rem;color:#6A4300;background:#FFF4E5;border-radius:10px;padding:8px 12px;margin-top:8px;">Inclui <b>' + R(d.pendente) + '</b> ainda pendentes (fiado) que não entraram no caixa.</div>' : '') +
            (d.semCusto ? '<div style="font-size:.78rem;color:#6A4300;background:#FFF4E5;border-radius:10px;padding:8px 12px;margin-top:8px;">' + d.semCusto + ' item(ns) vendido(s) sem custo cadastrado: o CMV está subestimado. Preencha em <b>Precificação</b>.</div>' : '') +
            '<button class="btn-outline" style="width:100%;margin-top:10px;" onclick="finCompartilhar()"><i class="fab fa-whatsapp"></i> Enviar resumo por WhatsApp</button>';
    }
    window.finCompartilhar = function () {
        const s = window.finState, d = window.finDRE(s);
        const t = 'DRE ' + MESES[s.mes] + '/' + s.ano + '\nReceita bruta: ' + R(d.bruta) + '\nImpostos (est.): ' + R(d.imposto) + '\nCMV: ' + R(d.cmv) + '\nLucro bruto: ' + R(d.lucroBruto) + '\nDespesas: ' + R(d.despesas) + '\nTaxas (est.): ' + R(d.taxas) + '\nResultado: ' + R(d.resultado) + ' (' + pct(d.margem) + ')';
        window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank');
    };

    // ---------- FLUXO ----------
    function htmlFluxo(s) {
        const dias = fluxoDoMes(s), ks = Object.keys(dias).sort();
        const e = r2(ks.reduce(function (t, k) { return t + dias[k].e; }, 0)), sa = r2(ks.reduce(function (t, k) { return t + dias[k].s; }, 0));
        if (!ks.length) return '<p class="empty-state">Sem entradas nem saídas pagas em ' + MESES[s.mes] + '/' + s.ano + '.</p>';
        const max = Math.max.apply(null, ks.map(function (k) { return Math.max(dias[k].e, dias[k].s); })) || 1;
        let acum = 0;
        return '<div style="display:flex;gap:10px;margin-bottom:10px;">' +
            '<div style="flex:1;background:#fff;border:1px solid #EBD9E0;border-radius:12px;padding:12px;"><div style="font-size:.7rem;color:#777;">Entradas</div><div style="font-weight:800;color:#1B6B3A;">' + R(e) + '</div></div>' +
            '<div style="flex:1;background:#fff;border:1px solid #EBD9E0;border-radius:12px;padding:12px;"><div style="font-size:.7rem;color:#777;">Saídas</div><div style="font-weight:800;color:#B3261E;">' + R(sa) + '</div></div>' +
            '<div style="flex:1;background:' + COR + ';color:#fff;border-radius:12px;padding:12px;"><div style="font-size:.7rem;opacity:.9;">Saldo</div><div style="font-weight:800;">' + R(e - sa) + '</div></div></div>' +
            '<div style="font-size:.72rem;color:#777;margin:0 4px 6px;">Entradas: pagamentos recebidos nas comandas. Saídas: despesas e compras marcadas como pagas.</div>' +
            ks.map(function (k) {
                const d = dias[k]; acum += d.e - d.s;
                return '<div class="card" style="padding:10px 12px;margin-bottom:8px;"><div style="display:flex;justify-content:space-between;font-size:.85rem;"><b>' + dataBR(k).slice(0, 5) + '</b><span style="color:#777;">saldo acumulado ' + R(acum) + '</span></div>' +
                    '<div style="display:flex;align-items:center;gap:8px;margin-top:6px;"><div style="flex:1;height:8px;background:#F0E2E7;border-radius:4px;"><div style="width:' + (d.e / max * 100) + '%;height:8px;background:#2e7d32;border-radius:4px;"></div></div><span style="font-size:.78rem;width:92px;text-align:right;">+ ' + R(d.e) + '</span></div>' +
                    (d.s > 0 ? '<div style="display:flex;align-items:center;gap:8px;margin-top:4px;"><div style="flex:1;height:8px;background:#F0E2E7;border-radius:4px;"><div style="width:' + (d.s / max * 100) + '%;height:8px;background:#c62828;border-radius:4px;"></div></div><span style="font-size:.78rem;width:92px;text-align:right;">− ' + R(d.s) + '</span></div>' : '') + '</div>';
            }).join('');
    }

    // ---------- CONTAS ----------
    function contasPagar(s) {
        const l = [];
        s.despesas.forEach(function (d) { l.push({ tipo: 'despesa', id: d.id, desc: d.descricao, sub: d.categoria || 'Outras', valor: num(d.valor), venc: d.vencimento || '', pago: !!d.pago, pagoEm: d.pagoEm || '' }); });
        s.compras.forEach(function (c) { if (c.status === 'recebida') l.push({ tipo: 'compra', id: c.id, desc: 'Compra #' + c.numero + ' · ' + (c.fornecedor || ''), sub: 'Mercadoria', valor: num(c.total), venc: c.vencimento || '', pago: !!c.pago, pagoEm: c.pagoEm || '' }); });
        return l;
    }
    function pendenciasFiado(s) {
        const m = {};
        s.comandas.forEach(function (c) { const v = num(c.valorPendente); if (v > 0.009 && window.comandaEstaFechada(c)) { const n = c.cliente || 'Sem nome'; const x = m[n] || (m[n] = { nome: n, v: 0, q: 0 }); x.v += v; x.q++; } });
        return Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) { return b.v - a.v; });
    }
    function htmlContas(s) {
        const todas = contasPagar(s), hj = iso(new Date());
        const abertas = todas.filter(function (x) { return !x.pago; }), pagas = todas.filter(function (x) { return x.pago; });
        const venc = abertas.filter(function (x) { return x.venc && x.venc < hj; }), totAb = r2(abertas.reduce(function (t, x) { return t + x.valor; }, 0));
        const fiado = pendenciasFiado(s), totFiado = r2(fiado.reduce(function (t, x) { return t + x.v; }, 0));
        const f = s.filtroContas;
        let l = f === 'pagas' ? pagas : abertas;
        l = l.slice().sort(function (a, b) { return (a.venc || '9999').localeCompare(b.venc || '9999'); });
        return '<div style="display:flex;gap:10px;margin-bottom:10px;">' +
            '<div style="flex:1;background:#fff;border:1px solid #EBD9E0;border-radius:12px;padding:12px;"><div style="font-size:.7rem;color:#777;">A pagar</div><div style="font-weight:800;">' + R(totAb) + '</div>' + (venc.length ? '<div style="font-size:.7rem;color:#c62828;">' + venc.length + ' vencida(s)</div>' : '') + '</div>' +
            '<div style="flex:1;background:#fff;border:1px solid #EBD9E0;border-radius:12px;padding:12px;"><div style="font-size:.7rem;color:#777;">A receber (fiado)</div><div style="font-weight:800;color:#e65100;">' + R(totFiado) + '</div><div style="font-size:.7rem;color:#777;">' + fiado.length + ' cliente(s)</div></div></div>' +
            '<div style="display:flex;gap:8px;margin-bottom:10px;">' + [['pendentes', 'A pagar'], ['pagas', 'Pagas']].map(function (a) { const on = f === a[0]; return '<button onclick="finFiltroContas(\'' + a[0] + '\')" style="border:1px solid ' + COR + ';border-radius:99px;padding:6px 14px;font-size:.8rem;font-weight:600;background:' + (on ? COR : '#fff') + ';color:' + (on ? '#fff' : COR) + ';">' + a[1] + '</button>'; }).join('') +
            '<button class="btn-primary" style="margin-left:auto;padding:6px 14px;font-size:.8rem;" onclick="finDespesa(null)">+ Despesa</button></div>' +
            (l.length ? l.map(function (x) {
                const atras = !x.pago && x.venc && x.venc < hj;
                return '<div class="card" style="padding:10px 12px;margin-bottom:8px;cursor:pointer;" onclick="finConta(\'' + x.tipo + '\',\'' + esc(x.id) + '\')">' +
                    '<div style="display:flex;justify-content:space-between;"><b style="font-size:.9rem;">' + esc(x.desc) + '</b><b>' + R(x.valor) + '</b></div>' +
                    '<div style="display:flex;justify-content:space-between;font-size:.76rem;color:#777;margin-top:2px;"><span>' + esc(x.sub) + '</span><span style="color:' + (atras ? '#c62828;font-weight:700' : '#777') + ';">' + (x.pago ? 'paga em ' + dataBR(x.pagoEm) : (x.venc ? (atras ? 'vencida em ' : 'vence ') + dataBR(x.venc) : 'sem vencimento')) + '</span></div></div>';
            }).join('') : '<p class="empty-state">' + (f === 'pagas' ? 'Nenhuma conta paga.' : 'Nenhuma conta a pagar.') + '</p>') +
            (fiado.length ? '<div style="font-size:.72rem;font-weight:700;color:#777;letter-spacing:.05em;margin:14px 4px 6px;">A RECEBER · PENDÊNCIAS (FIADO)</div>' +
                fiado.slice(0, 8).map(function (x) { return '<div class="card" style="padding:10px 12px;margin-bottom:6px;display:flex;justify-content:space-between;font-size:.88rem;"><span>' + esc(x.nome) + ' <small style="color:#888;">· ' + x.q + ' comanda(s)</small></span><b style="color:#e65100;">' + R(x.v) + '</b></div>'; }).join('') +
                '<button class="btn-outline" style="width:100%;" onclick="navigateTo(\'pendencias\')">Abrir Pendências</button>' : '');
    }
    window.finFiltroContas = function (f) { window.finState.filtroContas = f; finDesenhar(); };

    window.finDespesa = function (id) {
        const d = id ? window.finState.despesas.find(function (x) { return String(x.id) === String(id); }) : null;
        const hj = iso(new Date());
        modal('modal-desp', d ? 'Editar despesa' : 'Nova despesa',
            '<label style="font-size:.8rem;color:#555;">Descrição</label><input type="text" id="de-desc" value="' + esc(d ? d.descricao : '') + '" placeholder="Ex.: Aluguel" style="margin-bottom:10px;">' +
            '<label style="font-size:.8rem;color:#555;">Categoria</label><select id="de-cat" style="margin-bottom:10px;">' + CATEGORIAS.map(function (c) { return '<option' + ((d ? d.categoria : '') === c ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select>' +
            '<div style="display:flex;gap:8px;margin-bottom:10px;"><div style="flex:1;"><label style="font-size:.8rem;color:#555;">Valor (R$)</label><input type="number" step="0.01" min="0" id="de-val" value="' + (d ? d.valor : '') + '"></div>' +
            '<div style="flex:1;"><label style="font-size:.8rem;color:#555;">Vencimento</label><input type="date" id="de-venc" value="' + (d ? d.vencimento : hj) + '"></div></div>' +
            '<label style="display:flex;align-items:center;gap:8px;font-size:.88rem;margin-bottom:6px;"><input type="checkbox" id="de-rep" style="width:auto;"' + (d && d.recorrente ? ' checked' : '') + '> Repete todo mês</label>' +
            (d ? '' : '<label style="display:flex;align-items:center;gap:8px;font-size:.88rem;margin-bottom:10px;"><input type="checkbox" id="de-pago" style="width:auto;"> Já está paga</label>') +
            '<button class="btn-primary" style="width:100%;" onclick="finDespesaSalvar(' + (d ? '\'' + esc(d.id) + '\'' : 'null') + ')">Salvar</button>', 420);
    };
    window.finDespesaSalvar = async function (id) {
        const desc = (document.getElementById('de-desc').value || '').trim(), val = num(document.getElementById('de-val').value), venc = document.getElementById('de-venc').value;
        if (!desc) { await window.avisar('Informe a descrição.'); return; }
        if (val <= 0) { await window.avisar('Informe o valor.'); return; }
        if (!venc) { await window.avisar('Informe o vencimento.'); return; }
        const dados = { descricao: desc, categoria: document.getElementById('de-cat').value, valor: val, vencimento: venc, recorrente: document.getElementById('de-rep').checked };
        const pagoChk = document.getElementById('de-pago');
        const todas = lista(await apiGet('despesas'));
        if (id) { const i = todas.findIndex(function (x) { return String(x.id) === String(id); }); if (i >= 0) todas[i] = Object.assign({}, todas[i], dados); }
        else {
            const n = Object.assign({ id: Date.now(), pago: false, pagoEm: '' }, dados);
            if (pagoChk && pagoChk.checked) { n.pago = true; n.pagoEm = iso(new Date()); if (n.recorrente) gerarProxima(todas, n); }
            todas.push(n);
        }
        await apiSave('despesas', todas); fechar('modal-desp'); toast('Despesa salva'); await window.finAtualizar();
    };
    function gerarProxima(todas, d) {   // despesa que repete: cria a do mês seguinte (uma vez)
        if (d.proximaGerada) return;
        const p = String(d.vencimento).split('-'); const dt = new Date(Number(p[0]), Number(p[1]), 1);
        const ult = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
        dt.setDate(Math.min(Number(p[2]), ult));
        todas.push(Object.assign({}, d, { id: Date.now() + 1, vencimento: iso(dt), pago: false, pagoEm: '', proximaGerada: false }));
        d.proximaGerada = true;
    }
    window.finConta = function (tipo, id) {
        const s = window.finState, x = contasPagar(s).find(function (y) { return y.tipo === tipo && String(y.id) === String(id); }); if (!x) return;
        modal('modal-conta', esc(x.desc),
            '<div style="display:flex;justify-content:space-between;font-size:1.1rem;margin-bottom:6px;"><span>Valor</span><b style="color:' + COR + ';">' + R(x.valor) + '</b></div>' +
            '<div style="font-size:.85rem;color:#666;margin-bottom:12px;">' + esc(x.sub) + (x.venc ? ' · vence ' + dataBR(x.venc) : '') + (x.pago ? ' · paga em ' + dataBR(x.pagoEm) : '') + '</div>' +
            '<button class="btn-primary" style="width:100%;' + (x.pago ? '' : 'background:#2e7d32;') + '" onclick="finPagar(\'' + tipo + '\',\'' + esc(id) + '\',' + (!x.pago) + ')">' + (x.pago ? 'Marcar como não paga' : 'Marcar como paga') + '</button>' +
            (tipo === 'despesa' ? '<button class="btn-outline" style="width:100%;margin-top:8px;" onclick="fechar_conta();finDespesa(\'' + esc(id) + '\')">Editar</button><button class="btn-outline" style="width:100%;margin-top:8px;color:#c62828;border-color:#c62828;" onclick="finExcluir(\'' + esc(id) + '\')">Excluir</button>'
                : '<button class="btn-outline" style="width:100%;margin-top:8px;" onclick="fechar_conta();navigateTo(\'compras\')">Abrir em Compras</button>'), 400);
    };
    window.fechar_conta = function () { fechar('modal-conta'); };
    window.finPagar = async function (tipo, id, pagar) {
        const nome = tipo === 'despesa' ? 'despesas' : 'compras';
        const todas = lista(await apiGet(nome)), i = todas.findIndex(function (x) { return String(x.id) === String(id); });
        if (i < 0) return;
        todas[i].pago = !!pagar; todas[i].pagoEm = pagar ? iso(new Date()) : '';
        if (tipo === 'despesa' && pagar && todas[i].recorrente) gerarProxima(todas, todas[i]);
        await apiSave(nome, todas); fechar('modal-conta'); toast(pagar ? 'Marcada como paga' : 'Marcada como não paga'); await window.finAtualizar();
    };
    window.finExcluir = async function (id) {
        if (!await window.confirmar('Excluir esta despesa?')) return;
        await apiSave('despesas', lista(await apiGet('despesas')).filter(function (x) { return String(x.id) !== String(id); }));
        fechar('modal-conta'); await window.finAtualizar();
    };
})();
