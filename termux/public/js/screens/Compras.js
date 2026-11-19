// ============================================================
// COMPRAS.JS — Fornecedores e compras (pedido → recebimento)
// - Fornecedores: nome, telefone/WhatsApp, observação
// - Compras: pedido ao fornecedor (itens, custo, vencimento), envio por WhatsApp
// - Sugestão: produtos abaixo do estoque mínimo
// - Receber mercadoria: soma no estoque, atualiza o custo médio do produto
//   e registra a entrada em "Movimentação de Estoque"
// ============================================================
(function () {
    'use strict';
    if (window.renderCompras) return;
    console.log('✔ Compras.js carregado');

    const COR = '#C2185B';
    const esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); };
    const R = function (v) { return window.formatMoney ? window.formatMoney(v) : 'R$ ' + Number(v || 0).toFixed(2).replace('.', ','); };
    const r2 = function (v) { return Math.round(Number(v || 0) * 100) / 100; };
    const lista = function (x) { return window.normalizarArray(x); };
    const dataBR = function (iso) { if (!iso) return ''; const p = String(iso).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso; };
    const hojeISO = function () { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    const STATUS = { pedido: ['Pedido', '#1565c0', '#e3f2fd'], recebida: ['Recebida', '#2e7d32', '#e8f5e9'], cancelada: ['Cancelada', '#757575', '#eeeeee'] };

    window.comprasState = { compras: [], fornecedores: [], produtos: [], filtro: 'todas', ed: null };

    function modal(id, titulo, corpo, largura) {
        const old = document.getElementById(id); if (old) old.remove();
        const m = document.createElement('div');
        m.id = id; m.className = 'modal-overlay'; m.style.zIndex = '200000';
        m.innerHTML = '<div class="modal-content" style="max-width:' + (largura || 460) + 'px;max-height:92vh;display:flex;flex-direction:column;">' +
            '<div class="modal-header" style="background:' + COR + ';color:#fff;"><strong>' + titulo + '</strong>' +
            '<button class="btn-limpar" onclick="document.getElementById(\'' + id + '\').remove()" style="color:#fff;" aria-label="Fechar"><i class="fas fa-xmark"></i></button></div>' +
            '<div class="modal-body" style="overflow-y:auto;"><style>#' + id + ' label{display:block;margin-bottom:3px;}#' + id + ' input,#' + id + ' select{width:100%;box-sizing:border-box;min-width:0;}#' + id + ' .row-add button{flex:none;width:auto;white-space:nowrap;}</style>' + corpo + '</div></div>';
        document.body.appendChild(m);
        return m;
    }
    const fechar = function (id) { const m = document.getElementById(id); if (m) m.remove(); };
    const toast = function (t) { if (window.mostrarToast) window.mostrarToast(t); };

    async function carregar() {
        const s = window.comprasState;
        const r = await Promise.all([
            apiGet('compras').catch(function () { return []; }),
            apiGet('fornecedores').catch(function () { return []; }),
            apiGet('produtos').catch(function () { return []; })
        ]);
        s.compras = lista(r[0]); s.fornecedores = lista(r[1]);
        s.produtos = lista(r[2]).filter(function (p) { return p.inativo !== true; });
    }
    function abaixoDoMinimo() {
        return window.comprasState.produtos.filter(function (p) { const mn = Number(p.estoqueMinimo || 0); return mn > 0 && Number(p.estoque || 0) <= mn; });
    }
    function proximoNumero() { return window.comprasState.compras.reduce(function (m, c) { return Math.max(m, Number(c.numero || 0)); }, 0) + 1; }

    // ===================== COMPRAS: LISTA =====================
    window.renderCompras = function () {
        setTimeout(window.comprasAtualizar, 40);
        return [
            '<div class="app-bar"><button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button><h1>Compras</h1>',
            '<button class="icon-btn" onclick="navigateTo(\'fornecedores\')" title="Fornecedores"><i class="fas fa-truck"></i></button></div>',
            '<div id="compras-topo"></div>',
            '<div class="content-area" id="compras-lista" style="padding:12px;"><p class="empty-state">🔄 Carregando...</p></div>',
            '<button class="fab" onclick="compraNova()">+</button>'
        ].join('\n');
    };

    window.comprasAtualizar = async function () {
        const box = document.getElementById('compras-lista'); if (!box) return;
        try { await carregar(); } catch (e) { box.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro: ' + esc(e.message) + '</p>'; return; }
        const s = window.comprasState, ab = abaixoDoMinimo();
        const pend = s.compras.filter(function (c) { return c.status === 'pedido'; });
        const aPagar = s.compras.filter(function (c) { return c.status === 'recebida' && !c.pago; });
        const totalPagar = r2(aPagar.reduce(function (t, c) { return t + Number(c.total || 0); }, 0));
        const top = document.getElementById('compras-topo');
        if (top) top.innerHTML =
            (ab.length ? '<div style="padding:12px 16px;background:#fff3e0;border-bottom:1px solid #ffe0b2;display:flex;justify-content:space-between;align-items:center;gap:10px;">' +
                '<div style="font-size:.85rem;color:#e65100;"><i class="fas fa-triangle-exclamation"></i> <b>' + ab.length + ' produto(s)</b> no estoque mínimo ou abaixo</div>' +
                '<button class="btn-primary" style="padding:8px 12px;font-size:.8rem;" onclick="compraNova(true)">Montar pedido sugerido</button></div>' : '') +
            '<div style="display:flex;gap:10px;padding:12px 16px;background:#fff;border-bottom:1px solid #eee;">' +
            '<div style="flex:1;text-align:center;"><div style="font-size:.7rem;color:#777;">Pedidos aguardando</div><div style="font-weight:800;font-size:1.1rem;">' + pend.length + '</div></div>' +
            '<div style="flex:1;text-align:center;"><div style="font-size:.7rem;color:#777;">A pagar (recebidas)</div><div style="font-weight:800;font-size:1.1rem;color:' + (totalPagar > 0 ? '#c62828' : '#2e7d32') + ';">' + R(totalPagar) + '</div></div></div>' +
            '<div style="display:flex;gap:8px;padding:10px 16px;background:#fff;border-bottom:1px solid #eee;overflow-x:auto;">' +
            [['todas', 'Todas'], ['pedido', 'Pedidos'], ['recebida', 'Recebidas'], ['aberto', 'A pagar'], ['cancelada', 'Canceladas']].map(function (f) {
                const on = s.filtro === f[0];
                return '<button onclick="comprasFiltro(\'' + f[0] + '\')" style="white-space:nowrap;border:1px solid ' + COR + ';border-radius:99px;padding:6px 14px;font-size:.8rem;font-weight:600;background:' + (on ? COR : '#fff') + ';color:' + (on ? '#fff' : COR) + ';">' + f[1] + '</button>';
            }).join('') + '</div>';
        let l = s.compras.slice().sort(function (a, b) { return Number(b.numero || 0) - Number(a.numero || 0); });
        if (s.filtro === 'aberto') l = l.filter(function (c) { return c.status === 'recebida' && !c.pago; });
        else if (s.filtro !== 'todas') l = l.filter(function (c) { return c.status === s.filtro; });
        if (!l.length) { box.innerHTML = '<p class="empty-state">Nenhuma compra' + (s.filtro === 'todas' ? ' ainda. Toque em + para criar um pedido.' : ' neste filtro.') + '</p>'; return; }
        box.innerHTML = l.map(function (c) {
            const st = STATUS[c.status] || STATUS.pedido;
            const venc = c.vencimento ? '<span style="color:' + (c.status === 'recebida' && !c.pago && c.vencimento < hojeISO() ? '#c62828' : '#777') + ';">Vence ' + dataBR(c.vencimento) + (c.pago ? ' · paga' : '') + '</span>' : '';
            return '<div class="card" style="padding:12px 14px;margin-bottom:10px;cursor:pointer;" onclick="compraDetalhe(\'' + esc(c.id) + '\')">' +
                '<div style="display:flex;justify-content:space-between;align-items:center;"><b>#' + esc(c.numero) + ' · ' + esc(c.fornecedor || 'Sem fornecedor') + '</b>' +
                '<span style="font-size:.7rem;font-weight:700;padding:3px 10px;border-radius:99px;color:' + st[1] + ';background:' + st[2] + ';">' + st[0] + '</span></div>' +
                '<div style="display:flex;justify-content:space-between;font-size:.82rem;color:#666;margin-top:4px;"><span>' + lista(c.itens).length + ' item(ns) · ' + esc(dataBR(c.criadoEm)) + '</span><b style="color:#2B1A22;font-size:.95rem;">' + R(c.total) + '</b></div>' +
                (venc ? '<div style="font-size:.75rem;margin-top:3px;">' + venc + '</div>' : '') + '</div>';
        }).join('');
    };
    window.comprasFiltro = function (f) { window.comprasState.filtro = f; window.comprasAtualizar(); };

    // ===================== COMPRAS: EDITOR =====================
    window.compraNova = async function (sugerir) {
        if (!window.comprasState.produtos.length) { try { await carregar(); } catch (e) {} }
        const s = window.comprasState;
        s.ed = { id: null, fornecedorId: '', vencimento: '', obs: '', itens: [] };
        if (sugerir === true) sugerirItens();
        editorAbrir();
    };
    window.compraEditar = function (id) {
        const c = window.comprasState.compras.find(function (x) { return String(x.id) === String(id); });
        if (!c || c.status !== 'pedido') return;
        window.comprasState.ed = { id: c.id, numero: c.numero, fornecedorId: c.fornecedorId || '', vencimento: c.vencimento || '', obs: c.obs || '', itens: lista(c.itens).map(function (i) { return Object.assign({}, i); }) };
        fechar('modal-compra-det'); editorAbrir();
    };
    function sugerirItens() {
        const ed = window.comprasState.ed;
        abaixoDoMinimo().forEach(function (p) {
            if (ed.itens.some(function (i) { return String(i.produtoId) === String(p.id); })) return;
            const mn = Number(p.estoqueMinimo || 0), falta = Math.max(1, mn * 2 - Number(p.estoque || 0));   // repõe até o dobro do mínimo
            ed.itens.push({ produtoId: p.id, nome: p.nome, quantidade: falta, custo: Number(p.valorCusto || 0) });
        });
    }
    window.compraSugerir = function () { editorLer(); sugerirItens(); editorRender(); toast(abaixoDoMinimo().length ? 'Itens abaixo do mínimo adicionados' : 'Nenhum produto abaixo do mínimo'); };
    function editorAbrir() {
        modal('modal-compra', window.comprasState.ed.id ? 'Editar pedido #' + window.comprasState.ed.numero : 'Novo pedido de compra', '<div id="compra-ed"></div>', 480);
        editorRender();
    }
    function editorLer() {   // guarda o que foi digitado antes de redesenhar
        const ed = window.comprasState.ed; if (!ed) return;
        const f = document.getElementById('ce-forn'); if (f) ed.fornecedorId = f.value;
        const v = document.getElementById('ce-venc'); if (v) ed.vencimento = v.value;
        const o = document.getElementById('ce-obs'); if (o) ed.obs = o.value;
        ed.itens.forEach(function (it, i) {
            const q = document.getElementById('ce-q' + i), c = document.getElementById('ce-c' + i);
            if (q) it.quantidade = Math.max(0, parseInt(q.value) || 0);
            if (c) it.custo = Math.max(0, parseFloat(String(c.value).replace(',', '.')) || 0);
        });
    }
    function editorTotal() { return r2(window.comprasState.ed.itens.reduce(function (t, i) { return t + Number(i.quantidade || 0) * Number(i.custo || 0); }, 0)); }
    function editorRender() {
        const s = window.comprasState, ed = s.ed, box = document.getElementById('compra-ed'); if (!box) return;
        const usados = ed.itens.map(function (i) { return String(i.produtoId); });
        const livres = s.produtos.filter(function (p) { return usados.indexOf(String(p.id)) < 0; }).sort(function (a, b) { return String(a.nome).localeCompare(String(b.nome), 'pt-BR'); });
        box.innerHTML =
            '<label style="font-size:.8rem;color:#555;">Fornecedor</label>' +
            '<div class="row-add" style="display:flex;gap:8px;margin-bottom:10px;"><select id="ce-forn" style="flex:1;"><option value="">Selecione…</option>' +
            s.fornecedores.map(function (f) { return '<option value="' + esc(f.id) + '"' + (String(f.id) === String(ed.fornecedorId) ? ' selected' : '') + '>' + esc(f.nome) + '</option>'; }).join('') + '</select>' +
            '<button class="btn-outline" onclick="fornecedorEditar(null, true)" style="white-space:nowrap;">+ Novo</button></div>' +
            '<label style="font-size:.8rem;color:#555;">Vencimento do pagamento (opcional)</label><input type="date" id="ce-venc" value="' + esc(ed.vencimento) + '" style="margin-bottom:10px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin:6px 0;"><b style="font-size:.9rem;">Itens</b>' +
            '<button class="btn-outline" style="padding:5px 10px;font-size:.78rem;" onclick="compraSugerir()"><i class="fas fa-wand-magic-sparkles"></i> Sugerir abaixo do mínimo</button></div>' +
            (ed.itens.length ? ed.itens.map(function (it, i) {
                return '<div style="border:1px solid #eee;border-radius:10px;padding:8px 10px;margin-bottom:8px;">' +
                    '<div style="display:flex;justify-content:space-between;align-items:center;"><b style="font-size:.88rem;">' + esc(it.nome) + '</b><button class="btn-limpar" onclick="compraItemDel(' + i + ')" style="color:#c62828;" aria-label="Remover item"><i class="fas fa-trash"></i></button></div>' +
                    '<div style="display:flex;gap:8px;margin-top:6px;align-items:end;">' +
                    '<div style="flex:1;"><label style="font-size:.7rem;color:#777;">Quantidade</label><input type="number" min="1" id="ce-q' + i + '" value="' + (it.quantidade || '') + '" oninput="compraRecalc()"></div>' +
                    '<div style="flex:1;"><label style="font-size:.7rem;color:#777;">Custo unitário</label><input type="number" min="0" step="0.01" id="ce-c' + i + '" value="' + (it.custo || '') + '" oninput="compraRecalc()"></div>' +
                    '<div style="flex:1;text-align:right;"><div style="font-size:.7rem;color:#777;">Subtotal</div><b id="ce-s' + i + '">' + R(Number(it.quantidade || 0) * Number(it.custo || 0)) + '</b></div></div></div>';
            }).join('') : '<div style="color:#6b6b6b;font-size:.85rem;padding:8px 0;">Nenhum item. Adicione abaixo ou use a sugestão.</div>') +
            '<div class="row-add" style="display:flex;gap:8px;margin:8px 0;"><select id="ce-add" style="flex:1;"><option value="">Adicionar produto…</option>' +
            livres.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.nome) + ' (estoque ' + Number(p.estoque || 0) + ')</option>'; }).join('') + '</select>' +
            '<button class="btn-primary" onclick="compraItemAdd()">Adicionar</button></div>' +
            '<label style="font-size:.8rem;color:#555;">Observação</label><input type="text" id="ce-obs" value="' + esc(ed.obs) + '" placeholder="Ex.: entregar na sexta" style="margin-bottom:10px;">' +
            '<div style="background:#FCE4EC;border-radius:10px;padding:10px 12px;display:flex;justify-content:space-between;font-size:1rem;"><span>Total do pedido</span><b id="ce-total" style="color:' + COR + ';">' + R(editorTotal()) + '</b></div>' +
            '<button class="btn-primary" style="width:100%;margin-top:12px;" onclick="compraSalvar()">Salvar pedido</button>';
    }
    window.compraRecalc = function () {
        editorLer();
        const ed = window.comprasState.ed;
        ed.itens.forEach(function (it, i) { const e = document.getElementById('ce-s' + i); if (e) e.textContent = R(Number(it.quantidade || 0) * Number(it.custo || 0)); });
        const t = document.getElementById('ce-total'); if (t) t.textContent = R(editorTotal());
    };
    window.compraItemAdd = function () {
        editorLer();
        const sel = document.getElementById('ce-add'); if (!sel || !sel.value) return;
        const p = window.comprasState.produtos.find(function (x) { return String(x.id) === String(sel.value); }); if (!p) return;
        window.comprasState.ed.itens.push({ produtoId: p.id, nome: p.nome, quantidade: 1, custo: Number(p.valorCusto || 0) });
        editorRender();
    };
    window.compraItemDel = function (i) { editorLer(); window.comprasState.ed.itens.splice(i, 1); editorRender(); };
    window.compraSalvar = async function () {
        editorLer();
        const s = window.comprasState, ed = s.ed;
        const forn = s.fornecedores.find(function (f) { return String(f.id) === String(ed.fornecedorId); });
        if (!forn) { await window.avisar('Escolha o fornecedor.'); return; }
        const itens = ed.itens.filter(function (i) { return Number(i.quantidade) > 0; });
        if (!itens.length) { await window.avisar('Adicione ao menos um item com quantidade.'); return; }
        const dados = { fornecedorId: forn.id, fornecedor: forn.nome, fornecedorTel: forn.telefone || '', vencimento: ed.vencimento || '', obs: (ed.obs || '').trim(), itens: itens, total: editorTotal() };
        try {
            const todas = lista(await apiGet('compras'));
            if (ed.id) {
                const i = todas.findIndex(function (c) { return String(c.id) === String(ed.id); });
                if (i >= 0) todas[i] = Object.assign({}, todas[i], dados);
            } else {
                todas.push(Object.assign({ id: Date.now(), numero: proximoNumero(), status: 'pedido', pago: false, criadoEm: hojeISO() }, dados));
            }
            await apiSave('compras', todas);
            fechar('modal-compra'); toast('Pedido salvo');
            await window.comprasAtualizar();
        } catch (e) { await window.avisar('Erro ao salvar: ' + e.message); }
    };

    // ===================== COMPRAS: DETALHE E AÇÕES =====================
    window.compraDetalhe = function (id) {
        const c = window.comprasState.compras.find(function (x) { return String(x.id) === String(id); }); if (!c) return;
        const st = STATUS[c.status] || STATUS.pedido;
        const itens = lista(c.itens).map(function (i) {
            return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:.88rem;"><span>' + esc(i.quantidade) + ' × ' + esc(i.nome) + '<br><small style="color:#6b6b6b;">' + R(i.custo) + ' cada</small></span><b>' + R(Number(i.quantidade) * Number(i.custo)) + '</b></div>';
        }).join('');
        const btn = function (txt, fn, estilo) { return '<button class="btn-primary" style="width:100%;margin-top:8px;' + (estilo || '') + '" onclick="' + fn + '">' + txt + '</button>'; };
        const out = function (txt, fn) { return '<button class="btn-outline" style="width:100%;margin-top:8px;" onclick="' + fn + '">' + txt + '</button>'; };
        let acoes = '';
        if (c.status === 'pedido') acoes = btn('<i class="fas fa-box-open"></i> Receber mercadoria', 'compraReceber(\'' + c.id + '\')') + out('<i class="fab fa-whatsapp"></i> Enviar pedido por WhatsApp', 'compraWhats(\'' + c.id + '\')') + out('Editar pedido', 'compraEditar(\'' + c.id + '\')') + out('Cancelar pedido', 'compraCancelar(\'' + c.id + '\')');
        else if (c.status === 'recebida') acoes = (c.pago ? out('Marcar como não paga', 'compraPago(\'' + c.id + '\', false)') : btn('Marcar como paga', 'compraPago(\'' + c.id + '\', true)', 'background:#2e7d32;')) + out('<i class="fab fa-whatsapp"></i> Enviar por WhatsApp', 'compraWhats(\'' + c.id + '\')');
        modal('modal-compra-det', 'Compra #' + esc(c.numero),
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><b>' + esc(c.fornecedor) + '</b><span style="font-size:.7rem;font-weight:700;padding:3px 10px;border-radius:99px;color:' + st[1] + ';background:' + st[2] + ';">' + st[0] + '</span></div>' +
            itens +
            '<div style="display:flex;justify-content:space-between;padding:10px 0;font-size:1.05rem;"><span>Total</span><b style="color:' + COR + ';">' + R(c.total) + '</b></div>' +
            (c.vencimento ? '<div style="font-size:.82rem;color:#666;">Pagamento: ' + dataBR(c.vencimento) + (c.pago ? ' · <b style="color:#2e7d32;">paga em ' + dataBR(c.pagoEm) + '</b>' : '') + '</div>' : '') +
            (c.recebidoEm ? '<div style="font-size:.82rem;color:#666;">Recebida em ' + dataBR(c.recebidoEm) + '</div>' : '') +
            (c.obs ? '<div style="font-size:.82rem;color:#666;margin-top:4px;">Obs.: ' + esc(c.obs) + '</div>' : '') + acoes, 440);
    };
    async function salvarCompra(id, mudar) {
        const todas = lista(await apiGet('compras'));
        const i = todas.findIndex(function (c) { return String(c.id) === String(id); });
        if (i < 0) return false;
        mudar(todas[i]); await apiSave('compras', todas); return true;
    }
    window.compraWhats = function (id) {
        const c = window.comprasState.compras.find(function (x) { return String(x.id) === String(id); }); if (!c) return;
        // telefone atual do cadastro do fornecedor (o copiado no pedido pode estar desatualizado ou vazio)
        const fcad = window.comprasState.fornecedores.find(function (f) { return String(f.id) === String(c.fornecedorId) || (c.fornecedor && String(f.nome || '').trim().toLowerCase() === String(c.fornecedor).trim().toLowerCase()); });
        const tel = String((fcad && fcad.telefone) || c.fornecedorTel || '').replace(/\D/g, '');
        const num = tel ? (tel.length <= 11 ? '55' + tel : tel) : '';
        const linhas = lista(c.itens).map(function (i) { return '• ' + i.quantidade + ' × ' + i.nome; });
        const texto = 'Olá! Segue o pedido de compra #' + c.numero + ':\n\n' + linhas.join('\n') + (c.obs ? '\n\nObs.: ' + c.obs : '') + '\n\nPor favor, confirme o prazo de entrega. Obrigado!';
        window.open('https://wa.me/' + num + '?text=' + encodeURIComponent(texto), '_blank');
    };
    window.compraCancelar = async function (id) {
        if (!await window.confirmar('Cancelar este pedido?')) return;
        await salvarCompra(id, function (c) { c.status = 'cancelada'; });
        fechar('modal-compra-det'); await window.comprasAtualizar();
    };
    window.compraPago = async function (id, pago) {
        await salvarCompra(id, function (c) { c.pago = !!pago; c.pagoEm = pago ? hojeISO() : ''; });
        fechar('modal-compra-det'); toast(pago ? 'Compra marcada como paga' : 'Compra marcada como não paga'); await window.comprasAtualizar();
    };
    window.compraReceber = async function (id) {
        const c = window.comprasState.compras.find(function (x) { return String(x.id) === String(id); }); if (!c || c.status !== 'pedido') return;
        const resumo = lista(c.itens).map(function (i) { return '• ' + i.quantidade + ' × ' + i.nome; }).join('\n');
        if (!await window.confirmar('Confirmar o recebimento da compra #' + c.numero + '?\n\n' + resumo + '\n\nO estoque e o custo dos produtos serão atualizados.')) return;
        try {
            const produtos = lista(await apiGet('produtos'));
            const movs = lista(await apiGet('movimentacoes'));
            const agora = new Date();
            const dataHora = agora.toLocaleDateString('pt-BR') + ' ' + String(agora.getHours()).padStart(2, '0') + ':' + String(agora.getMinutes()).padStart(2, '0');
            let n = 0;
            lista(c.itens).forEach(function (it, k) {
                const p = produtos.find(function (x) { return String(x.id) === String(it.produtoId); });
                if (!p) return;
                const antes = Number(p.estoque || 0), qtd = Number(it.quantidade || 0), custo = Number(it.custo || 0);
                const depois = antes + qtd;
                // custo médio ponderado (estoque que já havia × custo atual + compra × custo novo)
                if (custo > 0) p.valorCusto = depois > 0 ? r2((Math.max(0, antes) * Number(p.valorCusto || custo) + qtd * custo) / depois) : custo;
                p.estoque = depois;
                movs.push({ id: Date.now() + k, tipo: 'entrada', produtoId: p.id, produto: p.nome, quantidade: qtd, estoqueAntes: antes, estoqueDepois: depois,
                    motivoId: 'compra', motivo: 'Compra / Reposição', colaboradorId: null, colaboradorNome: '', observacao: 'Compra #' + c.numero + ' — ' + c.fornecedor,
                    dataHora: dataHora, data: agora.toLocaleDateString('pt-BR'), usuario: (function () { try { return localStorage.getItem('garcomAtual') || 'Operador'; } catch (e) { return 'Operador'; } })() });
                n++;
            });
            await apiSave('produtos', produtos);
            await apiSave('movimentacoes', movs);
            await salvarCompra(id, function (x) { x.status = 'recebida'; x.recebidoEm = hojeISO(); });
            fechar('modal-compra-det'); toast('Mercadoria recebida: ' + n + ' produto(s) atualizado(s)');
            await window.comprasAtualizar();
        } catch (e) { await window.avisar('Erro ao receber: ' + e.message); }
    };

    // ===================== FORNECEDORES =====================
    window.renderFornecedores = function () {
        setTimeout(window.fornecedoresAtualizar, 40);
        return [
            '<div class="app-bar"><button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button><h1>Fornecedores</h1>',
            '<button class="icon-btn" onclick="navigateTo(\'compras\')" title="Compras"><i class="fas fa-cart-shopping"></i></button></div>',
            '<div class="content-area" id="fornecedores-lista" style="padding:12px;"><p class="empty-state">🔄 Carregando...</p></div>',
            '<button class="fab" onclick="fornecedorEditar(null)">+</button>'
        ].join('\n');
    };
    window.fornecedoresAtualizar = async function () {
        const box = document.getElementById('fornecedores-lista'); if (!box) return;
        try { await carregar(); } catch (e) { box.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro: ' + esc(e.message) + '</p>'; return; }
        const s = window.comprasState;
        if (!s.fornecedores.length) { box.innerHTML = '<p class="empty-state">Nenhum fornecedor. Toque em + para cadastrar.</p>'; return; }
        box.innerHTML = s.fornecedores.slice().sort(function (a, b) { return String(a.nome).localeCompare(String(b.nome), 'pt-BR'); }).map(function (f) {
            const qtd = s.compras.filter(function (c) { return String(c.fornecedorId) === String(f.id) && c.status !== 'cancelada'; }).length;
            const total = r2(s.compras.filter(function (c) { return String(c.fornecedorId) === String(f.id) && c.status === 'recebida'; }).reduce(function (t, c) { return t + Number(c.total || 0); }, 0));
            return '<div class="card" style="padding:12px 14px;margin-bottom:10px;cursor:pointer;" onclick="fornecedorEditar(\'' + esc(f.id) + '\')">' +
                '<div style="display:flex;justify-content:space-between;"><b>' + esc(f.nome) + '</b><span style="font-size:.8rem;color:#666;">' + esc(f.telefone || 'sem telefone') + '</span></div>' +
                '<div style="font-size:.78rem;color:#777;margin-top:3px;">' + qtd + ' compra(s) · ' + R(total) + ' recebido(s)' + (f.obs ? ' · ' + esc(f.obs) : '') + '</div></div>';
        }).join('');
    };
    window.fornecedorEditar = function (id, deCompra) {
        const f = id ? window.comprasState.fornecedores.find(function (x) { return String(x.id) === String(id); }) : null;
        if (deCompra) editorLer();
        modal('modal-forn', f ? 'Editar fornecedor' : 'Novo fornecedor',
            '<label style="font-size:.8rem;color:#555;">Nome</label><input type="text" id="fo-nome" value="' + esc(f ? f.nome : '') + '" style="margin-bottom:10px;">' +
            '<label style="font-size:.8rem;color:#555;">Telefone / WhatsApp (com DDD)</label><input type="tel" id="fo-tel" value="' + esc(f ? f.telefone : '') + '" placeholder="(91) 90000-0000" style="margin-bottom:10px;">' +
            '<label style="font-size:.8rem;color:#555;">Observação</label><input type="text" id="fo-obs" value="' + esc(f ? f.obs : '') + '" placeholder="Prazo, forma de pagamento…" style="margin-bottom:12px;">' +
            '<button class="btn-primary" style="width:100%;" onclick="fornecedorSalvar(' + (f ? '\'' + esc(f.id) + '\'' : 'null') + ',' + (deCompra ? 'true' : 'false') + ')">Salvar</button>' +
            (f ? '<button class="btn-outline" style="width:100%;margin-top:8px;color:#c62828;border-color:#c62828;" onclick="fornecedorExcluir(\'' + esc(f.id) + '\')">Excluir fornecedor</button>' : ''), 420);
    };
    window.fornecedorSalvar = async function (id, deCompra) {
        const nome = (document.getElementById('fo-nome').value || '').trim();
        if (!nome) { await window.avisar('Informe o nome do fornecedor.'); return; }
        const dados = { nome: nome, telefone: (document.getElementById('fo-tel').value || '').trim(), obs: (document.getElementById('fo-obs').value || '').trim() };
        try {
            const todos = lista(await apiGet('fornecedores'));
            let novoId = id;
            if (id) { const i = todos.findIndex(function (f) { return String(f.id) === String(id); }); if (i >= 0) todos[i] = Object.assign({}, todos[i], dados); }
            else { novoId = Date.now(); todos.push(Object.assign({ id: novoId }, dados)); }
            await apiSave('fornecedores', todos);
            fechar('modal-forn');
            if (deCompra) { window.comprasState.fornecedores = todos; window.comprasState.ed.fornecedorId = novoId; editorRender(); }
            else await window.fornecedoresAtualizar();
            toast('Fornecedor salvo');
        } catch (e) { await window.avisar('Erro: ' + e.message); }
    };
    window.fornecedorExcluir = async function (id) {
        const usado = window.comprasState.compras.some(function (c) { return String(c.fornecedorId) === String(id); });
        if (!await window.confirmar(usado ? 'Este fornecedor tem compras registradas. As compras continuam no histórico. Excluir mesmo assim?' : 'Excluir este fornecedor?')) return;
        const todos = lista(await apiGet('fornecedores')).filter(function (f) { return String(f.id) !== String(id); });
        await apiSave('fornecedores', todos);
        fechar('modal-forn'); await window.fornecedoresAtualizar();
    };
})();
