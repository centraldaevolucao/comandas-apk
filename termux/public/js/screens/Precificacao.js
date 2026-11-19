// ============================================================
// PRECIFICACAO.JS — Ficha técnica, CMV e preço sugerido
// - Ficha técnica por produto: ingredientes (de outros produtos ou avulsos) → custo
// - Parâmetros: impostos, taxa de cartão/Pix, despesas fixas rateadas e margem desejada (%)
// - Preço sugerido = custo ÷ (1 − (impostos + taxas + despesas fixas + margem))
// - Margem real no preço atual, lista de produtos abaixo da meta e botão "Aplicar preço"
// ============================================================
(function () {
    'use strict';
    if (window.renderPrecificacao) return;
    console.log('✔ Precificacao.js carregado');

    const COR = '#C2185B';
    const esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); };
    const R = function (v) { return window.formatMoney ? window.formatMoney(v) : 'R$ ' + Number(v || 0).toFixed(2).replace('.', ','); };
    const r2 = function (v) { return Math.round(Number(v || 0) * 100) / 100; };
    const num = function (v) { return parseFloat(String(v == null ? '' : v).replace(',', '.')) || 0; };
    const lista = function (x) { return window.normalizarArray(x); };
    const pct = function (v) { return (Math.round(v * 10) / 10).toString().replace('.', ',') + '%'; };
    const toast = function (t) { if (window.mostrarToast) window.mostrarToast(t); };

    const PADRAO = { imposto: 6, taxa: 2.5, fixas: 22, margem: 15 };
    window.precState = { produtos: [], cfg: Object.assign({}, PADRAO), filtro: 'todos', busca: '', ed: null };

    /** Regras de cálculo (expostas para os relatórios/DRE usarem depois). */
    window.precCalc = function (custo, preco, cfg) {
        cfg = cfg || window.precState.cfg;
        const variaveis = (num(cfg.imposto) + num(cfg.taxa) + num(cfg.fixas)) / 100;
        const alvo = num(cfg.margem) / 100;
        const divisor = 1 - variaveis - alvo;
        const sugerido = divisor > 0.05 && custo > 0 ? custo / divisor : 0;
        let redondo = sugerido ? Math.ceil(sugerido) - 0.1 : 0;       // termina em ,90
        if (redondo && redondo < sugerido) redondo += 1;
        const lucro = preco > 0 ? preco * (1 - variaveis) - custo : 0;
        return { divisor: divisor, sugerido: r2(sugerido), redondo: r2(redondo), lucro: r2(lucro), margem: preco > 0 ? (lucro / preco) * 100 : 0, cmv: preco > 0 ? (custo / preco) * 100 : 0 };
    };

    function modal(id, titulo, corpo, largura) {
        const old = document.getElementById(id); if (old) old.remove();
        const m = document.createElement('div');
        m.id = id; m.className = 'modal-overlay'; m.style.zIndex = '200000';
        m.innerHTML = '<div class="modal-content" style="max-width:' + (largura || 460) + 'px;max-height:92vh;display:flex;flex-direction:column;">' +
            '<div class="modal-header" style="background:' + COR + ';color:#fff;"><strong>' + titulo + '</strong>' +
            '<button class="btn-limpar" onclick="document.getElementById(\'' + id + '\').remove()" style="color:#fff;" aria-label="Fechar"><i class="fas fa-xmark"></i></button></div>' +
            '<div class="modal-body" style="overflow-y:auto;"><style>#' + id + ' label{display:block;margin-bottom:3px;}#' + id + ' input,#' + id + ' select{width:100%;box-sizing:border-box;min-width:0;}#' + id + ' .row-add button{flex:none;width:auto;white-space:nowrap;}</style>' + corpo + '</div></div>';
        document.body.appendChild(m); return m;
    }
    const fechar = function (id) { const m = document.getElementById(id); if (m) m.remove(); };

    async function carregar() {
        const s = window.precState;
        const r = await Promise.all([apiGet('produtos').catch(function () { return []; }), apiGet('configPrecificacao').catch(function () { return []; })]);
        s.produtos = lista(r[0]).filter(function (p) { return p.inativo !== true; });
        const c = lista(r[1])[0];
        s.cfg = Object.assign({}, PADRAO, c || {});
    }

    // ===================== LISTA =====================
    window.renderPrecificacao = function () {
        setTimeout(window.precAtualizar, 40);
        return [
            '<div class="app-bar"><button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button><h1>Precificação</h1>',
            '<button class="icon-btn" onclick="precParametros()" title="Parâmetros"><i class="fas fa-sliders"></i></button></div>',
            '<div id="prec-topo"></div>',
            '<div class="input-busca"><input type="text" id="prec-busca" placeholder="Pesquisar produto" oninput="precBusca(this.value)"></div>',
            '<div class="content-area" id="prec-lista" style="padding:12px;"><p class="empty-state">🔄 Carregando...</p></div>'
        ].join('\n');
    };
    window.precBusca = function (v) { window.precState.busca = v; precDesenhar(); };
    window.precFiltro = function (f) { window.precState.filtro = f; precDesenhar(); };
    window.precAtualizar = async function () {
        const box = document.getElementById('prec-lista'); if (!box) return;
        try { await carregar(); } catch (e) { box.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro: ' + esc(e.message) + '</p>'; return; }
        precDesenhar();
    };
    function linhaDe(p) {
        const custo = num(p.valorCusto), preco = num(p.valorVenda);
        return { p: p, custo: custo, preco: preco, c: window.precCalc(custo, preco) };
    }
    function precDesenhar() {
        const s = window.precState, box = document.getElementById('prec-lista'); if (!box) return;
        const todas = s.produtos.map(linhaDe);
        const semCusto = todas.filter(function (x) { return x.custo <= 0; });
        const abaixo = todas.filter(function (x) { return x.custo > 0 && x.preco > 0 && x.c.margem < num(s.cfg.margem); });
        const top = document.getElementById('prec-topo');
        if (top) top.innerHTML =
            '<div style="display:flex;gap:10px;padding:12px 16px;background:#fff;border-bottom:1px solid #eee;">' +
            '<div style="flex:1;text-align:center;"><div style="font-size:.7rem;color:#777;">Meta de margem</div><div style="font-weight:800;font-size:1.1rem;">' + pct(num(s.cfg.margem)) + '</div></div>' +
            '<div style="flex:1;text-align:center;"><div style="font-size:.7rem;color:#777;">Abaixo da meta</div><div style="font-weight:800;font-size:1.1rem;color:' + (abaixo.length ? '#c62828' : '#2e7d32') + ';">' + abaixo.length + '</div></div>' +
            '<div style="flex:1;text-align:center;"><div style="font-size:.7rem;color:#777;">Sem custo</div><div style="font-weight:800;font-size:1.1rem;color:' + (semCusto.length ? '#e65100' : '#2e7d32') + ';">' + semCusto.length + '</div></div></div>' +
            '<div style="display:flex;gap:8px;padding:10px 16px;background:#fff;border-bottom:1px solid #eee;overflow-x:auto;">' +
            [['todos', 'Todos'], ['abaixo', 'Abaixo da meta'], ['semcusto', 'Sem custo']].map(function (f) {
                const on = s.filtro === f[0];
                return '<button onclick="precFiltro(\'' + f[0] + '\')" style="white-space:nowrap;border:1px solid ' + COR + ';border-radius:99px;padding:6px 14px;font-size:.8rem;font-weight:600;background:' + (on ? COR : '#fff') + ';color:' + (on ? '#fff' : COR) + ';">' + f[1] + '</button>';
            }).join('') + '</div>';
        let l = todas;
        if (s.filtro === 'abaixo') l = abaixo; else if (s.filtro === 'semcusto') l = semCusto;
        const t = (s.busca || '').trim().toLowerCase();
        if (t) l = l.filter(function (x) { return String(x.p.nome).toLowerCase().indexOf(t) >= 0; });
        // pior margem primeiro; sem custo no fim
        l = l.slice().sort(function (a, b) { if ((a.custo > 0) !== (b.custo > 0)) return a.custo > 0 ? -1 : 1; return a.c.margem - b.c.margem; });
        if (!l.length) { box.innerHTML = '<p class="empty-state">Nenhum produto neste filtro.</p>'; return; }
        box.innerHTML = l.map(function (x) {
            const meta = num(s.cfg.margem);
            const tem = x.custo > 0 && x.preco > 0;
            const cor = !tem ? '#757575' : (x.c.margem >= meta ? '#2e7d32' : (x.c.margem >= meta * 0.6 ? '#e65100' : '#c62828'));
            const rot = !tem ? 'Sem custo' : pct(x.c.margem);
            return '<div class="card" style="padding:12px 14px;margin-bottom:10px;cursor:pointer;" onclick="precAbrir(\'' + esc(x.p.id) + '\')">' +
                '<div style="display:flex;justify-content:space-between;align-items:center;"><b>' + esc(x.p.nome) + '</b>' +
                '<span style="font-size:.75rem;font-weight:700;color:' + cor + ';">' + (tem ? 'margem ' : '') + rot + '</span></div>' +
                '<div style="display:flex;justify-content:space-between;font-size:.8rem;color:#666;margin-top:3px;"><span>Custo ' + (x.custo > 0 ? R(x.custo) : '—') + ' · Venda ' + R(x.preco) + '</span>' +
                (x.c.sugerido ? '<span>Sugerido <b style="color:#2B1A22;">' + R(x.c.redondo) + '</b></span>' : '') + '</div>' +
                (lista(x.p.ficha).length ? '<div style="font-size:.7rem;color:#6b6b6b;margin-top:2px;"><i class="fas fa-list-check"></i> ficha técnica com ' + lista(x.p.ficha).length + ' item(ns)</div>' : '') + '</div>';
        }).join('');
    }

    // ===================== PARÂMETROS =====================
    window.precParametros = function () {
        const c = window.precState.cfg;
        const campo = function (id, rot, v, dica) { return '<label style="font-size:.8rem;color:#555;">' + rot + '</label><input type="number" step="0.1" min="0" id="' + id + '" value="' + num(v) + '" style="margin-bottom:' + (dica ? '2px' : '10px') + ';">' + (dica ? '<div style="font-size:.7rem;color:#6b6b6b;margin-bottom:10px;">' + dica + '</div>' : ''); };
        modal('modal-prec-cfg', 'Parâmetros de preço',
            campo('pc-imp', 'Impostos sobre a venda (%)', c.imposto, 'Ex.: Simples Nacional. Confirme a alíquota com seu contador.') +
            campo('pc-taxa', 'Taxa média de cartão/Pix (%)', c.taxa) +
            campo('pc-fix', 'Despesas fixas rateadas (%)', c.fixas, 'Aluguel, pessoal, energia etc. como % do faturamento (veja no DRE).') +
            campo('pc-mar', 'Margem de lucro desejada (%)', c.margem) +
            '<button class="btn-primary" style="width:100%;" onclick="precSalvarCfg()">Salvar</button>', 420);
    };
    window.precSalvarCfg = async function () {
        const cfg = { imposto: num(document.getElementById('pc-imp').value), taxa: num(document.getElementById('pc-taxa').value), fixas: num(document.getElementById('pc-fix').value), margem: num(document.getElementById('pc-mar').value) };
        if (cfg.imposto + cfg.taxa + cfg.fixas + cfg.margem >= 95) { await window.avisar('A soma dos percentuais deve ficar abaixo de 95%.'); return; }
        await apiSave('configPrecificacao', [cfg]);
        window.precState.cfg = Object.assign({}, PADRAO, cfg);
        fechar('modal-prec-cfg'); toast('Parâmetros salvos'); precDesenhar();
    };

    // ===================== PRODUTO: FICHA + PREÇO =====================
    window.precAbrir = function (id) {
        const p = window.precState.produtos.find(function (x) { return String(x.id) === String(id); }); if (!p) return;
        window.precState.ed = { id: p.id, nome: p.nome, preco: num(p.valorVenda), custoManual: num(p.valorCusto), itens: lista(p.ficha).map(function (i) { return Object.assign({}, i); }) };
        modal('modal-prec', esc(p.nome), '<div id="prec-ed"></div>', 480);
        edRender();
    };
    function custoFicha() { return r2(window.precState.ed.itens.reduce(function (t, i) { return t + num(i.quantidade) * num(i.custoUnit); }, 0)); }
    function custoAtual() { const ed = window.precState.ed; return ed.itens.length ? custoFicha() : ed.custoManual; }
    function edLer() {
        const ed = window.precState.ed; if (!ed) return;
        ed.itens.forEach(function (it, i) {
            const q = document.getElementById('pf-q' + i), c = document.getElementById('pf-c' + i), n = document.getElementById('pf-n' + i);
            if (q) it.quantidade = num(q.value); if (c) it.custoUnit = num(c.value); if (n) it.nome = n.value;
        });
        const cm = document.getElementById('pf-cm'); if (cm) ed.custoManual = num(cm.value);
        const pr = document.getElementById('pf-preco'); if (pr) ed.preco = num(pr.value);
    }
    function edRender() {
        const s = window.precState, ed = s.ed, box = document.getElementById('prec-ed'); if (!box) return;
        const usados = ed.itens.map(function (i) { return i.produtoId == null ? '' : String(i.produtoId); });
        const outros = s.produtos.filter(function (p) { return String(p.id) !== String(ed.id) && usados.indexOf(String(p.id)) < 0; }).sort(function (a, b) { return String(a.nome).localeCompare(String(b.nome), 'pt-BR'); });
        const custo = custoAtual(), c = window.precCalc(custo, ed.preco), cfg = s.cfg;
        const ok = c.margem >= num(cfg.margem);
        box.innerHTML =
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><b style="font-size:.9rem;">Ficha técnica (por unidade vendida)</b></div>' +
            (ed.itens.length ? ed.itens.map(function (it, i) {
                return '<div style="border:1px solid #eee;border-radius:10px;padding:8px 10px;margin-bottom:8px;">' +
                    '<div style="display:flex;gap:6px;align-items:center;"><input type="text" id="pf-n' + i + '" value="' + esc(it.nome) + '" ' + (it.produtoId != null ? 'readonly style="background:#f5f5f5;"' : 'placeholder="Descrição (ex.: embalagem)"') + ' oninput="precRecalc()">' +
                    '<button class="btn-limpar" onclick="precItemDel(' + i + ')" style="color:#c62828;" aria-label="Remover"><i class="fas fa-trash"></i></button></div>' +
                    '<div style="display:flex;gap:8px;margin-top:6px;align-items:end;">' +
                    '<div style="flex:1;"><label style="font-size:.7rem;color:#777;">Quantidade</label><input type="number" min="0" step="0.001" id="pf-q' + i + '" value="' + (it.quantidade || '') + '" oninput="precRecalc()"></div>' +
                    '<div style="flex:1;"><label style="font-size:.7rem;color:#777;">Custo unitário</label><input type="number" min="0" step="0.01" id="pf-c' + i + '" value="' + (it.custoUnit || '') + '" oninput="precRecalc()"></div>' +
                    '<div style="flex:1;text-align:right;"><div style="font-size:.7rem;color:#777;">Subtotal</div><b id="pf-s' + i + '">' + R(num(it.quantidade) * num(it.custoUnit)) + '</b></div></div></div>';
            }).join('') : '<div style="color:#6b6b6b;font-size:.82rem;margin-bottom:8px;">Sem ficha técnica: o custo é o valor informado abaixo. Adicione ingredientes para calcular o custo automaticamente.</div>' +
                '<label style="font-size:.78rem;color:#555;">Custo do produto (R$)</label><input type="number" min="0" step="0.01" id="pf-cm" value="' + (ed.custoManual || '') + '" oninput="precRecalc()" style="margin-bottom:8px;">') +
            '<div class="row-add" style="display:flex;gap:8px;margin:6px 0 12px;"><select id="pf-add" style="flex:1;"><option value="">Adicionar produto da lista…</option>' +
            outros.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.nome) + (num(p.valorCusto) > 0 ? ' (' + R(p.valorCusto) + ')' : '') + '</option>'; }).join('') + '</select>' +
            '<button class="btn-primary" onclick="precItemAdd()">Adicionar</button></div>' +
            '<button class="btn-outline" style="width:100%;margin-bottom:12px;" onclick="precItemAvulso()">+ Item avulso (embalagem, gás, mão de obra…)</button>' +
            '<div style="background:#f5f5f5;border-radius:10px;padding:10px 12px;font-size:.88rem;margin-bottom:10px;">' +
            '<div style="display:flex;justify-content:space-between;"><span>Custo (CMV) <small style="color:#6b6b6b;">' + (ed.itens.length ? 'pela ficha' : 'informado') + '</small></span><b id="pf-custo">' + R(custo) + '</b></div></div>' +
            '<label style="font-size:.8rem;color:#555;">Preço de venda atual (R$)</label><input type="number" min="0" step="0.01" id="pf-preco" value="' + (ed.preco || '') + '" oninput="precRecalc()" style="margin-bottom:10px;">' +
            '<div id="pf-res"></div>';
        precResultado();
    }
    function precResultado() {
        const s = window.precState, ed = s.ed, box = document.getElementById('pf-res'); if (!box) return;
        const custo = custoAtual(), c = window.precCalc(custo, ed.preco), cfg = s.cfg, meta = num(cfg.margem);
        if (custo <= 0) { box.innerHTML = '<div style="font-size:.82rem;color:#e65100;">Informe o custo (ou monte a ficha técnica) para calcular o preço ideal.</div>'; return; }
        if (c.divisor <= 0.05) { box.innerHTML = '<div style="font-size:.82rem;color:#c62828;">Os percentuais em Parâmetros somam demais; reduza para calcular.</div>'; return; }
        const cor = c.margem >= meta ? '#2e7d32' : '#c62828';
        box.innerHTML =
            '<div style="display:flex;gap:10px;">' +
            '<div style="flex:1;background:' + COR + ';color:#fff;border-radius:12px;padding:12px;"><div style="font-size:.72rem;opacity:.9;">Preço sugerido</div><div style="font-size:1.4rem;font-weight:800;">' + R(c.redondo) + '</div><div style="font-size:.68rem;opacity:.9;">cálculo: ' + R(c.sugerido) + '</div></div>' +
            '<div style="flex:1;background:#fff;border:1px solid #EBD9E0;border-radius:12px;padding:12px;"><div style="font-size:.72rem;color:#777;">No preço atual</div><div style="font-size:1.4rem;font-weight:800;color:' + (ed.preco > 0 ? cor : '#999') + ';">' + (ed.preco > 0 ? pct(c.margem) : '—') + '</div><div style="font-size:.68rem;color:#777;">' + (ed.preco > 0 ? 'lucro ' + R(c.lucro) + ' por un.' : 'sem preço') + '</div></div></div>' +
            '<div style="font-size:.72rem;color:#777;margin:8px 2px;">Considera impostos ' + pct(num(cfg.imposto)) + ', taxas ' + pct(num(cfg.taxa)) + ', despesas fixas ' + pct(num(cfg.fixas)) + ' e margem desejada ' + pct(meta) + '. CMV no preço atual: ' + (ed.preco > 0 ? pct(c.cmv) : '—') + '.</div>' +
            (ed.preco > 0 && c.redondo > ed.preco ? '<div style="font-size:.82rem;color:#4A3A42;background:#FFF4E5;border-radius:10px;padding:8px 10px;margin-bottom:8px;">Com ' + R(c.redondo) + ' o lucro por unidade passa de <b>' + R(c.lucro) + '</b> para <b>' + R(window.precCalc(custo, c.redondo).lucro) + '</b>.</div>' : '') +
            '<button class="btn-primary" style="width:100%;" onclick="precSalvar(true)">Salvar e aplicar ' + R(c.redondo) + '</button>' +
            '<button class="btn-outline" style="width:100%;margin-top:8px;" onclick="precSalvar(false)">Salvar sem mudar o preço</button>';
    }
    window.precRecalc = function () {
        edLer();
        const ed = window.precState.ed;
        ed.itens.forEach(function (it, i) { const e = document.getElementById('pf-s' + i); if (e) e.textContent = R(num(it.quantidade) * num(it.custoUnit)); });
        const c = document.getElementById('pf-custo'); if (c) c.textContent = R(custoAtual());
        precResultado();
    };
    window.precItemAdd = function () {
        edLer();
        const sel = document.getElementById('pf-add'); if (!sel || !sel.value) return;
        const p = window.precState.produtos.find(function (x) { return String(x.id) === String(sel.value); }); if (!p) return;
        window.precState.ed.itens.push({ produtoId: p.id, nome: p.nome, quantidade: 1, custoUnit: num(p.valorCusto) });
        edRender();
    };
    window.precItemAvulso = function () { edLer(); window.precState.ed.itens.push({ produtoId: null, nome: '', quantidade: 1, custoUnit: 0 }); edRender(); };
    window.precItemDel = function (i) { edLer(); window.precState.ed.itens.splice(i, 1); edRender(); };
    window.precSalvar = async function (aplicar) {
        edLer();
        const ed = window.precState.ed;
        const itens = ed.itens.filter(function (i) { return num(i.quantidade) > 0 && String(i.nome || '').trim(); }).map(function (i) { return { produtoId: i.produtoId, nome: String(i.nome).trim(), quantidade: num(i.quantidade), custoUnit: num(i.custoUnit) }; });
        const custo = itens.length ? r2(itens.reduce(function (t, i) { return t + i.quantidade * i.custoUnit; }, 0)) : ed.custoManual;
        try {
            const todos = lista(await apiGet('produtos'));
            const k = todos.findIndex(function (p) { return String(p.id) === String(ed.id); });
            if (k < 0) { await window.avisar('Produto não encontrado.'); return; }
            todos[k].ficha = itens;
            todos[k].valorCusto = custo;
            if (aplicar) todos[k].valorVenda = window.precCalc(custo, ed.preco).redondo || ed.preco;
            else if (ed.preco > 0) todos[k].valorVenda = ed.preco;
            await apiSave('produtos', todos);
            fechar('modal-prec'); toast(aplicar ? 'Preço aplicado' : 'Ficha salva');
            await window.precAtualizar();
        } catch (e) { await window.avisar('Erro ao salvar: ' + e.message); }
    };
})();
