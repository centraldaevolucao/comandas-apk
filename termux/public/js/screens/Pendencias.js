// Pendências (fiado) por cliente — soma de TODAS as comandas pendentes, independente do caixa em que foram fechadas.
(function () {
    'use strict';
    let dados = { comandas: [], clientes: [] };
    let aberto = '';       // chave do grupo expandido
    let termo = '';

    const R = function (v) { return window.formatMoney(Number(v || 0)); };
    const esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); };
    const temPend = function (c) { return c && c.pagamentoPendente === true && Number(c.valorPendente || 0) > 0.009; };
    const jq = function (v) { return "'" + String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"; };

    function agrupar() {
        const mapa = {};
        dados.comandas.filter(temPend).forEach(function (c) {
            const cli = dados.clientes.find(function (x) {
                return (c.clienteId && String(x.id) === String(c.clienteId)) ||
                    (c.cliente && x.nome && String(x.nome).trim().toLowerCase() === String(c.cliente).trim().toLowerCase());
            });
            const nome = cli ? cli.nome : (c.cliente || 'Sem cliente identificado');
            const chave = cli ? 'c' + cli.id : 'n' + nome.trim().toLowerCase();
            if (!mapa[chave]) mapa[chave] = { chave: chave, nome: nome, telefone: cli ? cli.telefone : '', total: 0, comandas: [] };
            mapa[chave].total += Number(c.valorPendente || 0);
            mapa[chave].comandas.push(c);
        });
        return Object.keys(mapa).map(function (k) { return mapa[k]; })
            .sort(function (a, b) { return b.total - a.total; });
    }

    window.renderPendencias = function () {
        setTimeout(window.pendenciasCarregar, 30);
        return '<div class="app-bar">' +
            '<button class="icon-btn" onclick="navigateTo(\'clientes\')"><i class="fas fa-arrow-left"></i></button>' +
            '<h1>Pendências</h1>' +
            '<button class="icon-btn" onclick="abrirMenu()"><i class="fas fa-bars"></i></button></div>' +
            '<div id="pend-resumo" style="padding:14px 16px;background:linear-gradient(135deg,#e65100,#bf360c);color:#fff;"></div>' +
            '<div class="input-busca"><input type="text" id="pend-busca" placeholder="Pesquisar cliente" oninput="pendenciasFiltrar()">' +
            '<button class="btn-limpar" onclick="pendenciasLimpar()"><i class="fas fa-xmark"></i></button></div>' +
            '<div class="content-area" id="pend-lista"><p class="empty-state">🔄 Carregando...</p></div>';
    };

    window.pendenciasCarregar = async function () {
        try {
            dados.comandas = window.normalizarArray(await apiGet('comandas'));
            dados.clientes = window.normalizarArray(await apiGet('clientes'));
        } catch (e) { dados = { comandas: [], clientes: [] }; }
        desenhar();
    };

    function desenhar() {
        const lista = document.getElementById('pend-lista'); if (!lista) return;
        let grupos = agrupar();
        const totalGeral = grupos.reduce(function (s, g) { return s + g.total; }, 0);
        const qtdCmd = grupos.reduce(function (s, g) { return s + g.comandas.length; }, 0);
        document.getElementById('pend-resumo').innerHTML =
            '<div style="font-size:.75rem;opacity:.9;">📝 Total pendente (todos os caixas)</div>' +
            '<div style="font-size:1.8rem;font-weight:700;margin-top:2px;">' + R(totalGeral) + '</div>' +
            '<div style="font-size:.78rem;opacity:.9;">' + grupos.length + ' cliente(s) · ' + qtdCmd + ' comanda(s)</div>';
        const t = termo.trim().toLowerCase();
        if (t) grupos = grupos.filter(function (g) { return g.nome.toLowerCase().indexOf(t) >= 0 || String(g.telefone || '').indexOf(t) >= 0; });
        if (!grupos.length) { lista.innerHTML = '<p class="empty-state">' + (t ? 'Nenhum cliente encontrado.' : '✅ Nenhuma pendência em aberto.') + '</p>'; return; }
        lista.innerHTML = grupos.map(function (g) {
            const exp = aberto === g.chave;
            let h = '<div style="background:#fff;border-radius:12px;margin-bottom:10px;border-left:4px solid #ff9800;box-shadow:0 2px 4px rgba(0,0,0,.05);overflow:hidden;">' +
                '<div onclick="pendenciasAbrir(' + jq(g.chave) + ')" style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;cursor:pointer;">' +
                '<div><div style="font-weight:700;color:#333;">' + esc(g.nome) + '</div>' +
                '<div style="font-size:.75rem;color:#777;">' + g.comandas.length + ' comanda(s)' + (g.telefone ? ' · ' + esc(g.telefone) : '') + '</div></div>' +
                '<div style="text-align:right;"><div style="font-weight:700;color:#e65100;font-size:1.05rem;">' + R(g.total) + '</div>' +
                '<i class="fas fa-chevron-' + (exp ? 'up' : 'down') + '" style="color:#999;font-size:.8rem;"></i></div></div>';
            if (exp) {
                h += '<div style="padding:0 14px 12px;border-top:1px dashed #eee;">';
                g.comandas.slice().sort(function (a, b) { return String(a.dataFechamento || '').localeCompare(String(b.dataFechamento || '')); }).forEach(function (c) {
                    h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid #f3f3f3;">' +
                        '<div><div style="font-weight:600;font-size:.88rem;">Comanda ' + esc(c.numero) + '</div>' +
                        '<div style="font-size:.72rem;color:#888;">' + esc(c.dataFechamento || c.dataAbertura || '') + '</div></div>' +
                        '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end;"><b style="color:#e65100;">' + R(c.valorPendente) + '</b>' +
                        '<button class="btn-outline" style="padding:5px 9px;font-size:.75rem;border-color:#1976d2;color:#1976d2;" onclick="pendenciaVer(' + jq(c.id) + ')"><i class="fas fa-eye"></i> Ver</button>' +
                        '<button class="btn-outline" style="padding:5px 9px;font-size:.75rem;border-color:#6a1b9a;color:#6a1b9a;" onclick="reabrirPendencia(' + jq(c.id) + ')"><i class="fas fa-lock-open"></i> Reabrir</button>' +
                        '<button class="btn-outline" style="padding:5px 9px;font-size:.75rem;border-color:#2e7d32;color:#2e7d32;" onclick="pendenciaReceber(' + jq(g.chave) + ',' + jq(c.id) + ')"><i class="fas fa-hand-holding-usd"></i> Receber</button></div></div>';
                });
                h += '<button class="btn-outline" style="width:100%;margin-top:12px;border-color:#455a64;color:#455a64;" onclick="pendenciaVerCliente(' + jq(g.chave) + ')"><i class="fas fa-list"></i> Ver itens de todas / exportar / compartilhar</button>';
                if (g.comandas.length > 1) h += '<button class="btn-outline" style="width:100%;margin-top:8px;border-color:#1976d2;color:#1976d2;" onclick="pendenciasUnir(' + jq(g.chave) + ')"><i class="fas fa-object-group"></i> Unir as ' + g.comandas.length + ' pendências em uma comanda</button>';
                h += '<button class="btn-primary" style="width:100%;margin-top:8px;background:#2e7d32;" onclick="pendenciaReceber(' + jq(g.chave) + ')"><i class="fas fa-check-double"></i> Receber / finalizar tudo (' + R(g.total) + ')</button></div>';
            }
            return h + '</div>';
        }).join('');
    }

    window.pendenciasAbrir = function (k) { aberto = aberto === k ? '' : k; desenhar(); };
    window.pendenciasFiltrar = function () { termo = document.getElementById('pend-busca').value || ''; desenhar(); };
    window.pendenciasLimpar = function () { const i = document.getElementById('pend-busca'); if (i) i.value = ''; termo = ''; desenhar(); };

    // ---- unir pendências de um cliente em uma só comanda ----
    window.pendenciasUnir = async function (chave) {
        if (!dados.comandas.length) await window.pendenciasCarregar();
        const g = agrupar().find(function (x) { return x.chave === chave; });
        if (!g || g.comandas.length < 2) { await window.avisar('Este cliente tem menos de duas pendências para unir.'); return; }
        const soma = g.comandas.reduce(function (t, c) { return t + Number(c.valorPendente || 0); }, 0);
        const esc2 = await escolherGrupo({
            titulo: 'Unir pendências', icone: 'fa-object-group', cor: '#1976d2', ok: 'Unir',
            texto: 'Unir as <b>' + g.comandas.length + ' pendências</b> de <b>' + esc(g.nome) + '</b> (' + R(soma) + ') em UMA comanda?<br><span style="font-size:.8rem;color:#777;">A primeira comanda recebe os itens e os pagamentos parciais; as demais serão EXCLUÍDAS.</span>',
            verItens: function () { window.pendenciaVerCliente(chave); },
            rotulo: 'Lançar a comanda unida no caixa atual, no grupo:'
        });
        if (!esc2) return;
        try {
            const lista = window.normalizarArray(await apiGet('comandas'));
            const ids = g.comandas.map(function (c) { return String(c.id); });
            const alvo = lista.filter(function (x) { return ids.indexOf(String(x.id)) >= 0; });   // ordem de cadastro
            const base = alvo[0];
            base.itens = window.normalizarArray(base.itens);
            base.pagamentos = window.normalizarArray(base.pagamentos);
            const unidas = [base.numero];
            let totalValor = Number(base.total != null ? base.total : base.itens.reduce(function (t, i) { return t + Number(i.preco) * Number(i.quantidade); }, 0));
            let pendente = Number(base.valorPendente || 0);
            alvo.slice(1).forEach(function (o) {
                window.normalizarArray(o.itens).forEach(function (item) {
                    const ex = base.itens.find(function (i) { return i.produtoId === item.produtoId && Number(i.preco) === Number(item.preco) && !i.observacao && !item.observacao; });
                    if (ex) ex.quantidade = Number(ex.quantidade) + Number(item.quantidade); else base.itens.push(item);
                });
                window.normalizarArray(o.pagamentos).forEach(function (pg) { base.pagamentos.push(pg); });
                totalValor += Number(o.total != null ? o.total : window.normalizarArray(o.itens).reduce(function (t, i) { return t + Number(i.preco) * Number(i.quantidade); }, 0));
                pendente += Number(o.valorPendente || 0);
                unidas.push(o.numero);
            });
            base.subtotal = totalValor; base.total = totalValor;
            base.valorPendente = pendente; base.pagamentoPendente = true; base.status = 'pendente';
            await aplicarGrupo(base, esc2.cor);
            base.unidaDe = (base.unidaDe || []).concat(unidas.slice(1));
            const excluir = ids.slice(1);
            await apiSave('comandas', lista.filter(function (x) { return excluir.indexOf(String(x.id)) === -1; }));
            if (window.mostrarToast) window.mostrarToast('✅ Pendências unidas na comanda ' + base.numero);
            if (document.getElementById('modal-pend-unir')) window.pendenciasUnirModal(); else await window.pendenciasCarregar();
        } catch (e) { await window.avisar('Erro ao unir: ' + e.message); }
    };

    /** Lista (usada também pelo Caixa) dos clientes com 2+ pendências para unir. */
    window.pendenciasUnirModal = async function () {
        try {
            dados.comandas = window.normalizarArray(await apiGet('comandas'));
            dados.clientes = window.normalizarArray(await apiGet('clientes'));
        } catch (e) {}
        const gs = agrupar().filter(function (g) { return g.comandas.length > 1; });
        const old = document.getElementById('modal-pend-unir'); if (old) old.remove();
        const m = document.createElement('div');
        m.id = 'modal-pend-unir'; m.className = 'modal-overlay'; m.style.zIndex = '200000';
        m.innerHTML = '<div class="modal-content" style="max-width:380px;border-radius:16px;overflow:hidden;max-height:90vh;display:flex;flex-direction:column;">' +
            '<div class="modal-header" style="background:#1976d2;color:#fff;display:flex;justify-content:space-between;align-items:center;"><strong><i class="fas fa-object-group"></i> Unir pendências</strong>' +
            '<button class="btn-limpar" onclick="document.getElementById(\'modal-pend-unir\').remove()" style="color:#fff;"><i class="fas fa-xmark"></i></button></div>' +
            '<div class="modal-body" style="overflow-y:auto;">' +
            (gs.length ? gs.map(function (g) {
                return '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px;background:#fffde7;border-left:4px solid #fbc02d;border-radius:8px;margin-bottom:8px;">' +
                    '<div><b>' + esc(g.nome) + '</b><div style="font-size:.75rem;color:#777;">' + g.comandas.length + ' pendências · ' + R(g.total) + '</div></div>' +
                    '<button class="btn-primary" style="width:auto;padding:8px 12px;font-size:.8rem;background:#1976d2;" onclick="pendenciasUnir(' + jq(g.chave) + ')">Unir</button></div>';
            }).join('') : '<p class="empty-state">Nenhum cliente com 2 ou mais pendências.</p>') +
            '</div></div>';
        document.body.appendChild(m);
    };

    // ---- recebimento ----
    window.pendenciaReceber = function (chave, comandaId) {
        const g = agrupar().find(function (x) { return x.chave === chave; });
        if (!g) return;
        const alvo = comandaId != null && comandaId !== '' ? g.comandas.filter(function (c) { return String(c.id) === String(comandaId); }) : g.comandas;
        if (!alvo.length) return;
        const total = alvo.reduce(function (s, c) { return s + Number(c.valorPendente || 0); }, 0);
        window.__pendAlvo = { ids: alvo.map(function (c) { return String(c.id); }), total: total, forma: 'dinheiro' };
        const old = document.getElementById('modal-pend'); if (old) old.remove();
        const m = document.createElement('div');
        m.id = 'modal-pend'; m.className = 'modal-overlay'; m.style.zIndex = '200000';
        const forma = function (id, ic, t) { return '<button type="button" data-f="' + id + '" onclick="pendenciaForma(\'' + id + '\')" class="btn-outline" style="padding:10px;"><i class="fas ' + ic + '"></i> ' + t + '</button>'; };
        m.innerHTML = '<div class="modal-content" style="max-width:380px;border-radius:16px;overflow:hidden;">' +
            '<div class="modal-header" style="background:#C2185B;color:#fff;display:flex;justify-content:space-between;align-items:center;"><strong><i class="fas fa-hand-holding-usd"></i> Receber pendência</strong>' +
            '<button class="btn-limpar" onclick="pendenciaFechar()" style="color:#fff;"><i class="fas fa-xmark"></i></button></div>' +
            '<div class="modal-body"><div style="background:#fff3e0;border-radius:10px;padding:12px;text-align:center;margin-bottom:12px;">' +
            '<div style="font-size:.75rem;color:#666;">' + esc(g.nome) + ' · ' + alvo.length + ' comanda(s)</div>' +
            '<div style="font-size:1.5rem;font-weight:700;color:#e65100;">' + R(total) + '</div></div>' +
            '<label style="font-size:.78rem;font-weight:700;color:#555;">FORMA DE PAGAMENTO</label>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:6px 0 12px;">' + forma('dinheiro', 'fa-money-bill-wave', 'Dinheiro') + forma('debito', 'fa-credit-card', 'Débito') + forma('credito', 'fa-credit-card', 'Crédito') + forma('pix', 'fa-qrcode', 'PIX') + '</div>' +
            '<label style="font-size:.78rem;font-weight:700;color:#555;">CAIXA / GRUPO DE TRABALHO (ao quitar, a venda entra no caixa atual)</label>' +
            '<div id="pend-grupo-box" style="margin:6px 0 12px;"></div>' +
            '<label style="font-size:.78rem;font-weight:700;color:#555;">VALOR RECEBIDO (R$) — parcial permitido</label>' +
            '<input type="number" step="0.01" id="pend-valor" value="' + total.toFixed(2) + '" style="width:100%;padding:12px;border:1px solid #ccc;border-radius:8px;font-size:1.2rem;text-align:right;margin:6px 0 14px;">' +
            '<div style="display:flex;gap:8px;"><button class="btn-outline" style="flex:1;" onclick="pendenciaFechar()">Cancelar</button>' +
            '<button class="btn-primary" style="flex:1;background:#2e7d32;" onclick="pendenciaConfirmar()"><i class="fas fa-check"></i> Confirmar</button></div></div></div>';
        document.body.appendChild(m);
        montarSeletorGrupo(document.getElementById('pend-grupo-box'), 'pend-grupo');
        window.pendenciaForma('dinheiro');
    };
    window.pendenciaForma = function (f) {
        window.__pendAlvo.forma = f;
        document.querySelectorAll('#modal-pend [data-f]').forEach(function (b) {
            const on = b.getAttribute('data-f') === f;
            b.style.background = on ? '#FCE4EC' : ''; b.style.borderColor = on ? '#C2185B' : ''; b.style.color = on ? '#C2185B' : ''; b.style.fontWeight = on ? '700' : '';
        });
    };
    window.pendenciaFechar = function () { const m = document.getElementById('modal-pend'); if (m) m.remove(); };

    window.pendenciaConfirmar = async function () {
        const a = window.__pendAlvo; if (!a) return;
        let valor = parseFloat(document.getElementById('pend-valor').value) || 0;
        if (valor <= 0) { await window.avisar('Informe um valor maior que zero.'); return; }
        if (valor > a.total + 0.009) { await window.avisar('O valor não pode ser maior que a pendência (' + R(a.total) + ').'); return; }
        if (!await window.confirmar('Confirmar o recebimento de ' + R(valor) + (valor < a.total - 0.009 ? ' (parcial — restará ' + R(a.total - valor) + ')' : ' e finalizar a pendência') + '?', { titulo: 'Receber pendência', ok: 'Confirmar' })) return;
        try {
            const lista = window.normalizarArray(await apiGet('comandas'));
            const agora = new Date().toLocaleString('pt-BR');
            let restante = valor;
            let caixaAtual = null; const quitadas = [];
            const selG = document.getElementById('pend-grupo'); const corEscolhida = selG ? selG.value : '';
            try { caixaAtual = await window.obterCaixaAbertoAtual(); } catch (e) {}
            a.ids.forEach(function (id) {   // mais antigas primeiro (ordem da lista)
                if (restante <= 0.009) return;
                const c = lista.find(function (x) { return String(x.id) === id; });
                if (!c || !temPend(c)) return;
                const pago = Math.min(restante, Number(c.valorPendente || 0));
                restante -= pago;
                c.pagamentos = window.normalizarArray(c.pagamentos);
                c.pagamentos.push({ forma: a.forma, valor: pago, valorBase: pago, parcelas: 1, dataPagamento: agora, origem: 'pendencia' });
                c.valorPendente = Math.max(0, Number(c.valorPendente || 0) - pago);
                if (c.valorPendente <= 0.009) {
                    c.valorPendente = 0; c.pagamentoPendente = false; c.dataPagamentoFiado = agora;
                    if (String(c.status).toLowerCase() === 'pendente') {   // pendência quitada → a venda fecha agora, no caixa aberto
                        c.status = 'fechada'; c.dataFechamento = agora;
                        if (caixaAtual) { c.caixaIdOrigem = c.caixaId; c.caixaId = caixaAtual.id; c.corGrupo = corEscolhida || caixaAtual.cor || c.corGrupo; }
                        quitadas.push(c);
                    }
                }
            });
            await apiSave('comandas', lista);
            window.pendenciaFechar();
            if (window.mostrarToast) window.mostrarToast('✅ Recebido: ' + R(valor));
            await window.pendenciasCarregar();
            if (quitadas.length === 1 && window.abrirPreviewImpressao) {   // recibo final liberado só após quitar
                window.comandaAtual = quitadas[0]; window.recebimentoAtual = null;
                window.abrirPreviewImpressao('recibo');
            }
        } catch (e) { await window.avisar('Erro ao registrar: ' + e.message); }
    };

    // ============================================================
    // Grupo de trabalho (caixa) ao unir / quitar
    // ============================================================
    async function corAtual() { try { await window.carregarCoresCaixa(); } catch (e) {} let cx = null; try { cx = await window.obterCaixaAbertoAtual(); } catch (e) {} return { caixa: cx, cor: cx ? cx.cor : '' }; }

    async function montarSeletorGrupo(box, id) {
        if (!box) return;
        const a = await corAtual();
        box.innerHTML = '<select id="' + id + '" style="width:100%;padding:10px;border:1.5px solid #ccc;border-radius:8px;font-size:.95rem;">' +
            (window.CORES_CAIXA || []).map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === a.cor ? ' selected' : '') + '>' + esc(c.label || c.id) + (c.id === a.cor ? ' (caixa atual)' : '') + '</option>'; }).join('') + '</select>' +
            (a.caixa ? '' : '<div style="font-size:.72rem;color:#c62828;margin-top:4px;">Nenhum caixa aberto no momento.</div>');
    }

    async function aplicarGrupo(c, cor) {
        const a = await corAtual();
        if (!a.caixa) return;
        if (String(c.caixaId) !== String(a.caixa.id)) c.caixaIdOrigem = c.caixaIdOrigem || c.caixaId;
        c.caixaId = a.caixa.id;
        c.corGrupo = cor || a.cor || c.corGrupo;
    }

    /** Modal com texto + seletor de grupo; resolve {cor} ou null. */
    function escolherGrupo(o) {
        return new Promise(function (resolve) {
            const m = document.createElement('div');
            m.className = 'modal-overlay'; m.style.zIndex = '250000';
            m.innerHTML = '<div class="modal-content" style="max-width:380px;border-radius:16px;overflow:hidden;">' +
                '<div class="modal-header" style="background:' + o.cor + ';color:#fff;"><strong><i class="fas ' + o.icone + '"></i> ' + esc(o.titulo) + '</strong></div>' +
                '<div class="modal-body"><div style="line-height:1.4;">' + o.texto + '</div>' +
                (o.verItens ? '<button class="btn-outline" data-v style="width:100%;margin-top:10px;"><i class="fas fa-eye"></i> Ver itens antes de unir</button>' : '') +
                '<label style="display:block;font-size:.78rem;font-weight:700;color:#555;margin-top:12px;">' + esc(o.rotulo) + '</label><div id="eg-box" style="margin-top:6px;"></div>' +
                '<div style="display:flex;gap:8px;margin-top:14px;"><button class="btn-outline" data-c style="flex:1;">Cancelar</button><button class="btn-primary" data-o style="flex:1;background:' + o.cor + ';">' + esc(o.ok) + '</button></div></div></div>';
            document.body.appendChild(m);
            montarSeletorGrupo(m.querySelector('#eg-box'), 'eg-sel');
            const fim = function (v) { m.remove(); resolve(v); };
            m.querySelector('[data-c]').onclick = function () { fim(null); };
            m.querySelector('[data-o]').onclick = function () { const s2 = m.querySelector('#eg-sel'); fim({ cor: s2 ? s2.value : '' }); };
            const bv = m.querySelector('[data-v]'); if (bv) bv.onclick = o.verItens;
        });
    }

    // ============================================================
    // Reabrir pendência no caixa atual
    // ============================================================
    window.reabrirPendencia = async function (id) {
        try {
            const lista = window.normalizarArray(await apiGet('comandas'));
            const c = lista.find(function (x) { return String(x.id) === String(id); });
            if (!c) { await window.avisar('Comanda não encontrada.'); return false; }
            const a = await corAtual();
            if (!a.caixa) { await window.avisar('Abra o caixa para reabrir esta comanda no caixa atual.'); return false; }
            const em = lista.some(function (x) { return String(x.id) !== String(id) && String(x.numero) === String(c.numero) && window.comandaEstaAtiva && window.comandaEstaAtiva(x); });
            if (em) { await window.avisar('Já existe outra comanda aberta com o número ' + c.numero + '. Feche-a ou renumere antes de reabrir.'); return false; }
            if (!await window.confirmar('Reabrir a comanda ' + c.numero + ' no caixa atual?\n\nOs pagamentos parciais já recebidos serão mantidos e a comanda volta a ficar ABERTA para novos itens e para o recebimento.', { titulo: 'Reabrir pendência', ok: 'Reabrir', perigo: false })) return false;
            c.caixaIdOrigem = c.caixaIdOrigem || c.caixaId;
            c.caixaId = a.caixa.id; c.corGrupo = a.cor || c.corGrupo;
            c.status = 'aberta'; c.pagamentoPendente = false; c.valorPendente = 0;
            c.reabertaEm = new Date().toLocaleString('pt-BR');
            delete c.dataPendencia; delete c.aguardandoRecebimento; delete c.recebimentoTemp;
            await apiSave('comandas', lista);
            if (window.mostrarToast) window.mostrarToast('🔓 Comanda ' + c.numero + ' reaberta no caixa atual');
            ['modal-pend-ver', 'modal-pend-cli'].forEach(function (i) { const e = document.getElementById(i); if (e) e.remove(); });
            if (document.getElementById('pend-lista')) await window.pendenciasCarregar();
            else if (window.carregarComandas) { try { window.carregarComandas(); } catch (e) {} }
            else if (window.navigateTo && window.rotaAtual) { /* tela atualiza ao reentrar */ }
            return true;
        } catch (e) { await window.avisar('Erro ao reabrir: ' + e.message); return false; }
    };

    // ============================================================
    // Ver itens (antes e depois de unir) + imprimir / exportar / compartilhar
    // ============================================================
    const totalItens = function (c) { return window.normalizarArray(c.itens).reduce(function (t, i) { return t + Number(i.preco || 0) * Number(i.quantidade || 0); }, 0); };
    const pagoParcial = function (c) { return window.normalizarArray(c.pagamentos).reduce(function (t, p) { return t + Number(p.valor || 0); }, 0); };
    const moldura = function (id, titulo, cor, corpo, botoes) {
        const old = document.getElementById(id); if (old) old.remove();
        const m = document.createElement('div');
        m.id = id; m.className = 'modal-overlay'; m.style.zIndex = '250000';
        m.onclick = function (e) { if (e.target === m) m.remove(); };
        m.innerHTML = '<div class="modal-content" style="max-width:420px;border-radius:16px;overflow:hidden;max-height:92vh;display:flex;flex-direction:column;">' +
            '<div class="modal-header" style="background:' + cor + ';color:#fff;display:flex;justify-content:space-between;align-items:center;"><strong>' + titulo + '</strong>' +
            '<button class="btn-limpar" style="color:#fff;" onclick="document.getElementById(\'' + id + '\').remove()"><i class="fas fa-xmark"></i></button></div>' +
            '<div class="modal-body" style="overflow-y:auto;">' + corpo + '</div>' +
            '<div style="padding:10px 14px 14px;border-top:1px solid #eee;display:flex;flex-wrap:wrap;gap:8px;">' + botoes + '</div></div>';
        document.body.appendChild(m);
        return m;
    };
    const btn = function (onclick, icone, txt, cor, cheio) { return '<button class="btn-outline" style="' + (cheio ? 'flex:1 1 100%;' : 'flex:1 1 45%;') + 'padding:9px;font-size:.82rem;border-color:' + cor + ';color:' + cor + ';" onclick="' + onclick + '"><i class="fas ' + icone + '"></i> ' + txt + '</button>'; };
    const linhasItens = function (c) {
        const its = window.normalizarArray(c.itens);
        if (!its.length) return '<div style="color:#999;font-size:.85rem;padding:6px 0;">Sem itens.</div>';
        return its.map(function (i) {
            return '<div style="display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px dashed #eee;font-size:.88rem;"><span>' + esc(i.quantidade) + 'x ' + esc(i.nome) + (i.observacao ? '<div style="font-size:.7rem;color:#888;">' + esc(i.observacao) + '</div>' : '') + '</span><span>' + R(Number(i.preco || 0) * Number(i.quantidade || 0)) + '</span></div>';
        }).join('');
    };
    const textoComanda = function (c) {
        let t = '*Comanda ' + c.numero + '* — ' + (c.cliente || 'Cliente') + '\n';
        window.normalizarArray(c.itens).forEach(function (i) { t += i.quantidade + 'x ' + i.nome + ' - ' + window.formatMoney(Number(i.preco || 0) * Number(i.quantidade || 0)) + '\n'; });
        t += 'Total: ' + window.formatMoney(totalItens(c)) + '\n';
        if (pagoParcial(c) > 0) t += 'Já pago: ' + window.formatMoney(pagoParcial(c)) + '\n';
        t += '*Pendente: ' + window.formatMoney(c.valorPendente || 0) + '*\n';
        return t;
    };

    async function enviarTexto(texto, tel, modo, titulo) {
        if (modo === 'outros') {
            if (window.AndroidApp && window.AndroidApp.compartilhar) { window.AndroidApp.compartilhar(titulo, texto); return; }
            if (navigator.share) { try { await navigator.share({ title: titulo, text: texto }); } catch (e) {} return; }
            try { await navigator.clipboard.writeText(texto); if (window.mostrarToast) window.mostrarToast('📋 Texto copiado'); } catch (e) {}
            return;
        }
        window.open('https://wa.me/' + (tel || '') + '?text=' + encodeURIComponent(texto), '_blank');   // com número: abre direto a conversa
    }

    function buscar(id) { return dados.comandas.find(function (x) { return String(x.id) === String(id); }); }

    window.pendenciaVer = function (id) {
        const c = buscar(id); if (!c) return;
        const g = agrupar().find(function (x) { return x.comandas.some(function (y) { return String(y.id) === String(id); }); });
        const corpo = '<div style="font-size:.8rem;color:#777;margin-bottom:6px;">' + esc(c.cliente || 'Sem cliente') + ' · ' + esc(c.dataFechamento || c.dataPendencia || c.dataAbertura || '') + (c.unidaDe && c.unidaDe.length ? ' · unida com #' + esc(c.unidaDe.join(', #')) : '') + '</div>' +
            linhasItens(c) +
            '<div style="margin-top:10px;font-size:.9rem;"><div style="display:flex;justify-content:space-between;"><span>Total da comanda</span><b>' + R(totalItens(c)) + '</b></div>' +
            (pagoParcial(c) > 0 ? '<div style="display:flex;justify-content:space-between;color:#2e7d32;"><span>Já recebido</span><b>' + R(pagoParcial(c)) + '</b></div>' : '') +
            '<div style="display:flex;justify-content:space-between;color:#e65100;font-size:1.05rem;"><span>Pendente</span><b>' + R(c.valorPendente) + '</b></div></div>';
        const idq = jq(c.id);
        moldura('modal-pend-ver', '<i class="fas fa-file-lines"></i> Comanda ' + esc(c.numero) + ' (pendente)', '#e65100', corpo,
            btn('pendenciaImprimir(' + idq + ",'comanda')", 'fa-print', 'Visualizar / Imprimir comanda', '#1976d2', true) +
            btn('pendenciaImprimir(' + idq + ",'recibo')", 'fa-receipt', 'Recibo (pendente)', '#455a64') +
            btn('pendenciaCompartilhar(' + idq + ",'wa')", 'fa-whatsapp', 'WhatsApp', '#25d366') +
            btn('pendenciaCompartilhar(' + idq + ",'outros')", 'fa-share-nodes', 'Outros', '#455a64') +
            btn('reabrirPendencia(' + idq + ')', 'fa-lock-open', 'Reabrir no caixa atual', '#6a1b9a', true) +
            (g ? btn("document.getElementById('modal-pend-ver').remove();pendenciaReceber(" + jq(g.chave) + ',' + idq + ')', 'fa-hand-holding-usd', 'Receber', '#2e7d32', true) : ''));
    };

    window.pendenciaImprimir = function (id, tipo) {
        const c = buscar(id); if (!c) return;
        const m = document.getElementById('modal-pend-ver'); if (m) m.remove();
        window.comandaAtual = c; window.recebimentoAtual = null; window.pagamentosTemp = [];
        window.abrirPreviewImpressao(tipo);
    };

    window.pendenciaCompartilhar = async function (id, modo) {
        const c = buscar(id); if (!c) return;
        const tel = modo === 'wa' ? await window.telefoneWhatsApp(c, true) : '';
        await enviarTexto(textoComanda(c), tel, modo === 'wa' ? 'wa' : 'outros', 'Comanda ' + c.numero);
    };

    // visão consolidada do cliente (todas as pendências, itens de cada comanda)
    window.pendenciaVerCliente = function (chave) {
        const g = agrupar().find(function (x) { return x.chave === chave; }); if (!g) return;
        const corpo = g.comandas.map(function (c) {
            return '<div style="border:1px solid #ffe0b2;border-radius:10px;padding:8px 10px;margin-bottom:8px;background:#fffaf0;">' +
                '<div style="display:flex;justify-content:space-between;font-weight:700;"><span>Comanda ' + esc(c.numero) + '</span><span style="color:#e65100;">' + R(c.valorPendente) + '</span></div>' +
                '<div style="font-size:.7rem;color:#888;margin-bottom:4px;">' + esc(c.dataFechamento || c.dataPendencia || c.dataAbertura || '') + '</div>' + linhasItens(c) + '</div>';
        }).join('') + '<div style="display:flex;justify-content:space-between;font-size:1.1rem;font-weight:700;color:#e65100;margin-top:6px;"><span>TOTAL PENDENTE</span><span>' + R(g.total) + '</span></div>';
        const cq = jq(chave);
        moldura('modal-pend-cli', '<i class="fas fa-list"></i> ' + esc(g.nome), '#455a64', corpo,
            btn('pendenciaCompartilharCliente(' + cq + ",'wa')", 'fa-whatsapp', 'WhatsApp', '#25d366') +
            btn('pendenciaCompartilharCliente(' + cq + ",'outros')", 'fa-share-nodes', 'Outros', '#455a64') +
            btn('pendenciaExportarCliente(' + cq + ",'pdf')", 'fa-file-pdf', 'PDF', '#c62828') +
            btn('pendenciaExportarCliente(' + cq + ",'csv')", 'fa-file-csv', 'CSV', '#2e7d32') +
            btn('pendenciaExportarCliente(' + cq + ",'print')", 'fa-print', 'Imprimir', '#1976d2', true));
    };

    window.pendenciaCompartilharCliente = async function (chave, modo) {
        const g = agrupar().find(function (x) { return x.chave === chave; }); if (!g) return;
        let t = '*Pendências de ' + g.nome + '*\n\n' + g.comandas.map(textoComanda).join('\n') + '\n*TOTAL PENDENTE: ' + window.formatMoney(g.total) + '*';
        let tel = '';
        if (modo === 'wa') { tel = String(g.telefone || '').replace(/\D/g, ''); if (tel && !tel.startsWith('55') && tel.length <= 11) tel = '55' + tel; if (tel.length < 12) tel = await window.telefoneWhatsApp(g.comandas[0], true); }
        await enviarTexto(t, tel, modo === 'wa' ? 'wa' : 'outros', 'Pendências de ' + g.nome);
    };

    window.pendenciaExportarCliente = function (chave, tipo) {
        const g = agrupar().find(function (x) { return x.chave === chave; }); if (!g || !window.exportarRelatorio) return;
        const linhas = [];
        g.comandas.forEach(function (c) {
            window.normalizarArray(c.itens).forEach(function (i) { linhas.push(['#' + c.numero, String(i.quantidade), String(i.nome), R(i.preco), R(Number(i.preco || 0) * Number(i.quantidade || 0))]); });
            linhas.push(['#' + c.numero, '', 'Pendente da comanda', '', R(c.valorPendente)]);
        });
        window.exportarRelatorio(tipo, { titulo: 'Pendências - ' + g.nome, filtros: [['Cliente', g.nome], ['Comandas', String(g.comandas.length)]], colunas: ['Comanda', 'Qtd', 'Item', 'Unitário', 'Valor'], alinhar: ['l', 'r', 'l', 'r', 'r'], linhas: linhas, totais: [['Total pendente', R(g.total)]], totalGeral: g.total });
    };
})();
