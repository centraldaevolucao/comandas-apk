// ============================================================
// ACOES.JS — Ações que faltavam (botões sem função)
//  • Filtros de relatórios (barra, chips, dropdowns, fixar)
//  • Caixa: Sangria, Suprimento e Fechar caixa
//  • Cozinha: gaveta "Cardápio" (celular/tablet)
//  • Toque/rolagem: ajustes globais para touch e mouse
// ============================================================
console.log('✔ acoes.js carregado');

(function () {
    'use strict';

    const esc = (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const arr = (v) => (window.normalizarArray ? window.normalizarArray(v) : (Array.isArray(v) ? v : []));
    const toast = (m) => (typeof window.mostrarToast === 'function' ? window.mostrarToast(m) : null);
    const money = (v) => (typeof window.formatMoney === 'function' ? window.formatMoney(v) : 'R$ ' + Number(v || 0).toFixed(2));
    const agora = () => new Date().toLocaleString('pt-BR');

    // Converte "1.234,56" / "12,5" / "12.5" em número
    function lerValor(txt) {
        let s = String(txt == null ? '' : txt).replace(/[^\d,.-]/g, '');
        if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
        const n = parseFloat(s);
        return isNaN(n) ? 0 : n;
    }

    function criarModal(id, titulo, corTitulo, corpoHtml) {
        const antigo = document.getElementById(id);
        if (antigo) antigo.remove();
        const m = document.createElement('div');
        m.id = id;
        m.className = 'modal-overlay';
        m.style.zIndex = '99999';
        m.innerHTML =
            '<div class="modal-content" style="max-width:440px;">' +
            '  <div class="modal-header" style="background:' + corTitulo + ';color:#fff;">' +
            '    <strong>' + titulo + '</strong>' +
            '    <button type="button" class="btn-limpar" style="color:#fff;" data-fechar="1" aria-label="Fechar"><i class="fas fa-xmark"></i></button>' +
            '  </div>' +
            '  <div class="modal-body">' + corpoHtml + '</div>' +
            '</div>';
        m.addEventListener('click', function (e) {
            if (e.target === m || (e.target.closest && e.target.closest('[data-fechar]'))) m.remove();
        });
        document.body.appendChild(m);
        return m;
    }

    // ========================================================
    // CAIXA — SANGRIA / SUPRIMENTO
    // ========================================================
    async function caixaAbertoAtual() {
        const bruto = await apiGet('caixaAtual').catch(() => []);
        const c = Array.isArray(bruto) ? bruto[0] : bruto;
        return (c && c.status === 'aberto') ? c : null;
    }

    function abrirModalMovimento(tipo) {
        const ehSangria = tipo === 'sangria';
        const cor = ehSangria ? '#e65100' : '#2e7d32';
        const m = criarModal('modal-movimento-caixa',
            ehSangria ? '⬆️ Sangria (retirada de dinheiro)' : '⬇️ Suprimento (entrada de dinheiro)', cor,
            '<div class="field"><label for="mov-valor">Valor (R$)</label>' +
            '<input id="mov-valor" type="text" inputmode="decimal" autocomplete="off" placeholder="0,00"></div>' +
            '<div class="field"><label for="mov-motivo">Motivo</label>' +
            '<input id="mov-motivo" type="text" autocomplete="off" placeholder="' + (ehSangria ? 'Ex.: pagamento de fornecedor' : 'Ex.: troco inicial') + '"></div>' +
            '<button type="button" class="btn-primary" id="mov-salvar" style="width:100%;background:' + cor + ';">' +
            '<i class="fas fa-check"></i> Confirmar ' + (ehSangria ? 'sangria' : 'suprimento') + '</button>' +
            '<button type="button" class="btn-outline" data-fechar="1" style="width:100%;margin-top:10px;">Cancelar</button>');

        const inp = m.querySelector('#mov-valor');
        setTimeout(function () { try { inp.focus(); } catch (e) {} }, 100);

        m.querySelector('#mov-salvar').addEventListener('click', async function () {
            const btn = this;
            const valor = lerValor(inp.value);
            const motivo = (m.querySelector('#mov-motivo').value || '').trim();
            if (!(valor > 0)) { alert('Informe um valor maior que zero.'); inp.focus(); return; }
            btn.disabled = true;
            try {
                const caixa = await caixaAbertoAtual();
                if (!caixa) { alert('Não há caixa aberto.'); m.remove(); return; }
                const lista = arr(await apiGet('sangrias').catch(() => []));
                lista.push({
                    id: Date.now(), caixaId: caixa.id, tipo: tipo, valor: valor,
                    motivo: motivo, data: agora(), usuario: caixa.usuario || 'Operador'
                });
                await apiSave('sangrias', lista);
                m.remove();
                toast(ehSangria ? '✅ Sangria registrada' : '✅ Suprimento registrado');
                if (typeof window.carregarCaixa === 'function') window.carregarCaixa();
                if (typeof window.carregarResumoCaixa === 'function') window.carregarResumoCaixa();
            } catch (e) {
                alert('Erro ao registrar: ' + e.message);
                btn.disabled = false;
            }
        });
    }

    window.abrirModalSangria = function () { abrirModalMovimento('sangria'); };
    window.abrirModalSuprimento = function () { abrirModalMovimento('suprimento'); };

    // ========================================================
    // CAIXA — FECHAR CAIXA
    // ========================================================
    window.abrirModalFecharCaixa = async function () {
        let caixa, comandas, sangrias;
        try {
            caixa = await caixaAbertoAtual();
            comandas = arr(await apiGet('comandas'));
            sangrias = arr(await apiGet('sangrias').catch(() => []));
        } catch (e) { alert('Erro ao carregar o caixa: ' + e.message); return; }
        if (!caixa) { alert('Não há caixa aberto.'); if (window.carregarCaixa) window.carregarCaixa(); return; }

        const doCaixa = comandas.filter(function (c) { return String(c.caixaId) === String(caixa.id); });
        const abertas = doCaixa.filter(window.comandaEstaAtiva || function () { return false; });
        const fechadas = doCaixa.filter(window.comandaEstaFechada || function () { return false; });

        let vendas = 0;
        fechadas.forEach(function (c) { vendas += Number(c.total || 0); });
        const tf = window.totaisPorForma(fechadas);            // já com o TROCO descontado do dinheiro
        const dinheiro = tf.dinheiro.total;
        const outras = tf.debito.total + tf.credito.total + tf.pix.total + tf.outros.total;
        // identificação das transações de cada modalidade
        const transacoes = { dinheiro: [], debito: [], credito: [], pix: [], outros: [] };
        fechadas.forEach(function (c) {
            window.pagamentosLiquidos(c).forEach(function (p) {
                const k = transacoes[p.forma] ? p.forma : 'outros';
                transacoes[k].push('#' + c.numero + ' ' + money(p.valor));
            });
        });
        let sang = 0, supr = 0;
        sangrias.filter(function (s) { return String(s.caixaId) === String(caixa.id); }).forEach(function (s) {
            if (s.tipo === 'sangria') sang += Number(s.valor || 0);
            else if (s.tipo === 'suprimento') supr += Number(s.valor || 0);
        });
        const inicial = Number(caixa.valorInicial || 0);
        const esperado = inicial + dinheiro - sang + supr;

        const aviso = abertas.length
            ? '<div style="padding:10px 12px;background:#fff3e0;border-left:4px solid #ff9800;border-radius:8px;margin-bottom:12px;font-size:0.85rem;color:#e65100;">' +
              '<i class="fas fa-exclamation-triangle"></i> Há <b>' + abertas.length + '</b> comanda(s) em aberto neste caixa. Finalize ou cancele antes de fechar.</div>'
            : '';

        const linha = function (rot, val, forte) {
            return '<div style="display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid #f0f0f0;' + (forte ? 'font-weight:700;' : '') + '">' +
                '<span>' + rot + '</span><span>' + val + '</span></div>';
        };

        const detalhe = function (rot, t, itens) {
            return '<details style="border-bottom:1px solid #f0f0f0;padding:6px 0;"><summary style="display:flex;justify-content:space-between;gap:10px;cursor:pointer;list-style:none;">' +
                '<span>' + rot + ' <small style="color:#888;">(' + t.qtd + ' ' + (t.qtd === 1 ? 'transação' : 'transações') + ')</small></span><b>' + money(t.total) + '</b></summary>' +
                '<div style="font-size:0.78rem;color:#666;padding:6px 0 2px 10px;line-height:1.6;">' + (itens.length ? itens.map(esc).join('<br>') : 'Nenhuma transação.') + '</div></details>';
        };
        const m = criarModal('modal-fechar-caixa', '🔒 Fechar caixa', '#c62828',
            aviso +
            '<div style="font-size:0.9rem;margin-bottom:12px;">' +
            linha('Fundo inicial', money(inicial)) +
            detalhe('Dinheiro', tf.dinheiro, transacoes.dinheiro) +
            detalhe('Débito', tf.debito, transacoes.debito) +
            detalhe('Crédito', tf.credito, transacoes.credito) +
            detalhe('PIX', tf.pix, transacoes.pix) +
            (tf.outros.qtd ? detalhe('Outras formas', tf.outros, transacoes.outros) : '') +
            linha('Total recebido (todas as formas)', money(tf.geral), true) +
            linha('Total de vendas (comandas fechadas)', money(vendas)) +
            (tf.troco > 0 ? linha('Troco devolvido (já descontado do dinheiro)', money(tf.troco)) : '') +
            (Math.abs(vendas - tf.geral) >= 0.01 ? linha('Diferença vendas × recebido (fiado/ajustes)', money(vendas - tf.geral)) : '') +
            linha('Sangrias', '- ' + money(sang)) +
            linha('Suprimentos', '+ ' + money(supr)) +
            linha('Dinheiro esperado na gaveta', money(esperado), true) +
            '</div>' +
            '<div class="field"><label for="fc-contado">Dinheiro contado na gaveta (R$)</label>' +
            '<input id="fc-contado" type="text" inputmode="decimal" autocomplete="off" value="' + esc(esperado.toFixed(2).replace('.', ',')) + '"></div>' +
            '<div id="fc-dif" style="font-weight:700;margin:-6px 0 12px;font-size:0.9rem;"></div>' +
            '<div class="field"><label for="fc-obs">Observação (opcional)</label>' +
            '<input id="fc-obs" type="text" autocomplete="off"></div>' +
            '<button type="button" class="btn-primary" id="fc-confirmar" style="width:100%;background:#c62828;"' + (abertas.length ? ' disabled style="width:100%;background:#999;"' : '') + '>' +
            '<i class="fas fa-lock"></i> Confirmar fechamento</button>' +
            '<button type="button" class="btn-outline" data-fechar="1" style="width:100%;margin-top:10px;">Voltar</button>');

        const inp = m.querySelector('#fc-contado');
        const difEl = m.querySelector('#fc-dif');
        const atualizaDif = function () {
            const d = lerValor(inp.value) - esperado;
            const ok = Math.abs(d) < 0.01;
            difEl.style.color = ok ? '#2e7d32' : (d > 0 ? '#2e7d32' : '#c62828');
            difEl.textContent = ok ? 'Confere ✔' : 'Diferença: ' + (d > 0 ? '+' : '') + money(d);
        };
        inp.addEventListener('input', atualizaDif);
        atualizaDif();

        m.querySelector('#fc-confirmar').addEventListener('click', async function () {
            const btn = this;
            if (abertas.length) { alert('Finalize as comandas abertas antes de fechar o caixa.'); return; }
            const contado = lerValor(inp.value);
            const dif = contado - esperado;
            if (!await window.confirmar('Fechar o caixa agora?' + (Math.abs(dif) >= 0.01 ? '\n\nDiferença de ' + money(dif) : ''))) return;
            btn.disabled = true;
            try {
                const fechado = Object.assign({}, caixa, {
                    status: 'fechado', dataFechamento: agora(),
                    valorEsperado: esperado, valorContado: contado, diferenca: dif,
                    totaisPorForma: tf, trocoTotal: tf.troco, transacoesPorForma: transacoes,
                    totalVendas: vendas, totalSangrias: sang, totalSuprimentos: supr,
                    observacaoFechamento: (m.querySelector('#fc-obs').value || '').trim()
                });
                const historico = arr(await apiGet('caixas').catch(() => []));
                historico.push(fechado);
                await apiSave('caixas', historico);
                await apiSave('caixaAtual', []);
                m.remove();
                toast('🔒 Caixa fechado');
                if (typeof window.carregarCaixa === 'function') window.carregarCaixa();
            } catch (e) {
                alert('Erro ao fechar o caixa: ' + e.message);
                btn.disabled = false;
            }
        });
    };

    // ========================================================
    // RELATÓRIOS — BARRA DE FILTROS
    // ========================================================
    const TIPOS = [
        { v: 'vendas', t: 'Vendas' }, { v: 'produtos', t: 'Produtos' },
        { v: 'clientes', t: 'Clientes' }, { v: 'caixa', t: 'Caixa (auditoria)' }
    ];
    const PERIODOS = [
        { v: 'hoje', t: 'Hoje' }, { v: 'ontem', t: 'Ontem' }, { v: '7dias', t: 'Últimos 7 dias' },
        { v: 'mes', t: 'Este mês' }, { v: 'periodo', t: 'Período personalizado…' }
    ];
    const ESPECIES = [
        { v: 'todas', t: 'Todas' }, { v: 'dinheiro', t: 'Dinheiro' }, { v: 'debito', t: 'Débito' },
        { v: 'credito', t: 'Crédito' }, { v: 'pix', t: 'PIX' }
    ];

    function estadoRel() {
        window.relatoriosState = window.relatoriosState || {
            tipoRelatorio: 'vendas', filtroDataTipo: 'hoje', dataInicio: '', dataFim: '',
            filtroCaixa: 'todos', filtroCliente: '', filtroProduto: '', filtroEspecie: 'todas'
        };
        return window.relatoriosState;
    }
    const achar = (lista, v) => (lista.find(function (x) { return x.v === v; }) || { t: v }).t;

    function rotuloChip(id, valor) {
        const el = document.getElementById('chip-' + id);
        if (!el) return;
        const nome = { tipo: 'Tipo', periodo: 'Período', caixa: 'Caixa', especie: 'Espécie', cliente: 'Cliente', produto: 'Produto' }[id];
        el.innerHTML = nome + ': <b>' + esc(valor) + '</b>';
    }

    window.atualizarChipsFiltros = function () {
        const st = estadoRel();
        rotuloChip('tipo', achar(TIPOS, st.tipoRelatorio));
        let per = achar(PERIODOS, st.filtroDataTipo);
        if (st.filtroDataTipo === 'periodo' && st.dataInicio && st.dataFim) per = st.dataInicio + ' a ' + st.dataFim;
        rotuloChip('periodo', per);
        const cor = (window.CORES_CAIXA || []).find(function (c) { return c.id === st.filtroCaixa; });
        rotuloChip('caixa', st.filtroCaixa === 'todos' ? 'Todos' : (cor ? cor.label : st.filtroCaixa));
        rotuloChip('especie', achar(ESPECIES, st.filtroEspecie));
        rotuloChip('cliente', st.filtroCliente ? st.filtroCliente : 'Todos');
        rotuloChip('produto', st.filtroProduto ? st.filtroProduto : 'Todos');
        ['tipo', 'periodo', 'caixa', 'especie', 'cliente', 'produto'].forEach(function (id) {
            const el = document.getElementById('chip-' + id);
            if (el) el.classList.toggle('ativo', window.__dropdownFiltroAtivo === id);
        });
    };

    function recarregarRelatorio() {
        window.atualizarChipsFiltros();
        if (typeof window.carregarDadosRelatorios === 'function') window.carregarDadosRelatorios();
    }

    window.abrirBarraFiltros = function () {
        const b = document.body;
        const aberta = b.classList.toggle('barra-filtros-aberta');
        if (!aberta && !b.classList.contains('barra-filtros-fixada')) window.fecharDropdownFiltro();
        window.atualizarChipsFiltros();
        // aplica já, sem esperar o ciclo de 150ms
        const barra = document.getElementById('barra-filtros-relatorio');
        if (barra) barra.style.display = (aberta || b.classList.contains('barra-filtros-fixada')) ? 'block' : 'none';
    };

    window.toggleFixarBarraFiltros = function () {
        const b = document.body;
        const fixa = b.classList.toggle('barra-filtros-fixada');
        const pin = document.getElementById('btn-pin-filtro');
        if (pin) pin.classList.toggle('pinned', fixa);
        toast(fixa ? '📌 Filtros fixados' : 'Filtros desafixados');
    };

    window.fecharDropdownFiltro = function () {
        window.__dropdownFiltroAtivo = null;
        const c = document.getElementById('dropdown-container');
        if (c) { c.classList.remove('aberto'); c.innerHTML = ''; }
        if (window.atualizarChipsFiltros) window.atualizarChipsFiltros();
    };

    function itemOpcao(onclick, texto, sel) {
        return '<div class="drop-item' + (sel ? ' selecionado' : '') + '" role="button" tabindex="0" onclick="' + onclick + '">' +
            '<span>' + esc(texto) + '</span>' + (sel ? '<i class="fas fa-check"></i>' : '') + '</div>';
    }

    window.escolherFiltro = function (campo, valor) {
        const st = estadoRel();
        if (campo === 'tipo') st.tipoRelatorio = valor;
        else if (campo === 'especie') st.filtroEspecie = valor;
        else if (campo === 'caixa') st.filtroCaixa = valor;
        else if (campo === 'periodo') {
            st.filtroDataTipo = valor;
            if (valor === 'periodo') { window.abrirDropdownFiltro('periodo', true); return; }
        }
        window.fecharDropdownFiltro();
        recarregarRelatorio();
    };

    window.aplicarFiltroTexto = function (campo) {
        const el = document.getElementById('filtro-texto-' + campo);
        const st = estadoRel();
        const v = el ? el.value.trim() : '';
        if (campo === 'cliente') st.filtroCliente = v;
        else st.filtroProduto = v;
        window.fecharDropdownFiltro();
        recarregarRelatorio();
    };

    window.limparFiltroTexto = function (campo) {
        const st = estadoRel();
        if (campo === 'cliente') st.filtroCliente = ''; else st.filtroProduto = '';
        window.fecharDropdownFiltro();
        recarregarRelatorio();
    };

    const isoParaBR = (iso) => { const p = String(iso || '').split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : ''; };
    const brParaIso = (br) => { const p = String(br || '').split('/'); return p.length === 3 ? p[2] + '-' + p[1] + '-' + p[0] : ''; };

    window.aplicarPeriodoFiltro = function () {
        const ini = (document.getElementById('filtro-data-ini') || {}).value;
        const fim = (document.getElementById('filtro-data-fim') || {}).value;
        if (!ini || !fim) { alert('Informe a data inicial e a final.'); return; }
        if (ini > fim) { alert('A data inicial não pode ser maior que a final.'); return; }
        const st = estadoRel();
        st.filtroDataTipo = 'periodo';
        st.dataInicio = isoParaBR(ini);
        st.dataFim = isoParaBR(fim);
        window.fecharDropdownFiltro();
        recarregarRelatorio();
    };

    window.abrirDropdownFiltro = function (id, forcar) {
        const cont = document.getElementById('dropdown-container');
        if (!cont) return;
        if (window.__dropdownFiltroAtivo === id && !forcar) { window.fecharDropdownFiltro(); return; }
        window.__dropdownFiltroAtivo = id;
        const st = estadoRel();
        let h = '';
        if (id === 'tipo') {
            h = TIPOS.map(function (o) { return itemOpcao("escolherFiltro('tipo','" + o.v + "')", o.t, st.tipoRelatorio === o.v); }).join('');
        } else if (id === 'periodo') {
            h = PERIODOS.map(function (o) { return itemOpcao("escolherFiltro('periodo','" + o.v + "')", o.t, st.filtroDataTipo === o.v); }).join('');
            if (st.filtroDataTipo === 'periodo') {
                h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px;">' +
                    '<div class="field" style="margin:0;"><label for="filtro-data-ini">De</label><input type="date" id="filtro-data-ini" value="' + esc(brParaIso(st.dataInicio)) + '"></div>' +
                    '<div class="field" style="margin:0;"><label for="filtro-data-fim">Até</label><input type="date" id="filtro-data-fim" value="' + esc(brParaIso(st.dataFim)) + '"></div>' +
                    '</div><button type="button" class="btn-primary" style="width:100%;margin-top:12px;" onclick="aplicarPeriodoFiltro()"><i class="fas fa-check"></i> Aplicar período</button>';
            }
        } else if (id === 'caixa') {
            h = itemOpcao("escolherFiltro('caixa','todos')", 'Todos', st.filtroCaixa === 'todos') +
                (window.CORES_CAIXA || []).map(function (c) { return itemOpcao("escolherFiltro('caixa','" + c.id + "')", c.label, st.filtroCaixa === c.id); }).join('');
        } else if (id === 'especie') {
            h = ESPECIES.map(function (o) { return itemOpcao("escolherFiltro('especie','" + o.v + "')", o.t, st.filtroEspecie === o.v); }).join('');
        } else if (id === 'cliente' || id === 'produto') {
            const atual = id === 'cliente' ? st.filtroCliente : st.filtroProduto;
            h = '<input type="search" class="search-input" id="filtro-texto-' + id + '" autocomplete="off" placeholder="' +
                (id === 'cliente' ? 'Nome do cliente' : 'Nome do produto') + '" value="' + esc(atual) + '" ' +
                'onkeydown="if(event.key===\'Enter\'){aplicarFiltroTexto(\'' + id + '\')}">' +
                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
                '<button type="button" class="btn-outline" onclick="limparFiltroTexto(\'' + id + '\')">Limpar</button>' +
                '<button type="button" class="btn-primary" onclick="aplicarFiltroTexto(\'' + id + '\')"><i class="fas fa-check"></i> Aplicar</button></div>';
        }
        cont.innerHTML = h;
        cont.classList.add('aberto');
        window.atualizarChipsFiltros();
        const campo = cont.querySelector('input');
        if (campo && campo.type === 'search') setTimeout(function () { try { campo.focus(); } catch (e) {} }, 60);
    };

    // ========================================================
    // COZINHA — GAVETA DO CARDÁPIO
    // ========================================================
    async function preencherDrawerCozinha() {
        const lista = document.getElementById('drawer-cardapio-lista');
        if (!lista) return;
        try {
            const produtos = arr(await apiGet('produtos'));
            let cfg = await apiGet('cardapioDia').catch(() => []);
            let sel = {};
            if (Array.isArray(cfg) && cfg.length) sel = cfg[0].selecionados || {};
            else if (cfg && typeof cfg === 'object') sel = cfg.selecionados || {};
            const doDia = produtos.filter(function (p) { return p.inativo !== true && sel[p.id] === true; })
                .sort(function (a, b) { return String(a.nome || '').localeCompare(String(b.nome || '')); });
            if (!doDia.length) {
                lista.innerHTML = '<p style="text-align:center;padding:20px;color:#999;">Nenhum produto no cardápio de hoje.</p>';
                return;
            }
            lista.innerHTML = doDia.map(function (p) {
                const acabou = p.acabouCozinha === true;
                return '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px;background:' + (acabou ? '#ffebee' : '#fff') +
                    ';border-radius:8px;border:1px solid #eee;margin-bottom:8px;">' +
                    '<div style="flex:1;min-width:0;font-weight:600;font-size:0.9rem;color:' + (acabou ? '#c62828' : '#333') + ';' +
                    (acabou ? 'text-decoration:line-through;' : '') + 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(p.nome) +
                    (acabou ? ' <span style="background:#c62828;color:#fff;font-size:0.6rem;padding:2px 6px;border-radius:6px;text-decoration:none;display:inline-block;">ACABOU</span>' : '') + '</div>' +
                    '<label class="toggle" style="margin:0;flex-shrink:0;"><input type="checkbox"' + (!acabou ? ' checked' : '') +
                    ' onchange="toggleAcabouProduto(\'' + esc(p.id) + '\')"><span class="slider"></span></label></div>';
            }).join('');
        } catch (e) {
            lista.innerHTML = '<p style="color:#c62828;padding:20px;">Erro ao buscar produtos.</p>';
        }
    }

    window.abrirListaLateralCozinha = function () {
        const ov = document.getElementById('overlay-drawer-cozinha');
        const dr = document.getElementById('drawer-cardapio-cozinha');
        if (!ov || !dr) return;
        preencherDrawerCozinha();
        ov.style.display = 'block';
        requestAnimationFrame(function () { ov.style.opacity = '1'; dr.style.left = '0'; });
    };

    window.fecharListaLateralCozinha = function () {
        const ov = document.getElementById('overlay-drawer-cozinha');
        const dr = document.getElementById('drawer-cardapio-cozinha');
        if (dr) dr.style.left = '-350px';
        if (ov) { ov.style.opacity = '0'; setTimeout(function () { ov.style.display = 'none'; }, 300); }
    };

    // Mantém a gaveta e a lista lateral sincronizadas quando o item é alterado
    const toggleOriginal = window.toggleAcabouProduto;
    if (typeof toggleOriginal === 'function') {
        window.toggleAcabouProduto = async function (id) {
            await toggleOriginal(id);
            const dr = document.getElementById('drawer-cardapio-cozinha');
            if (dr && dr.style.left === '0px') preencherDrawerCozinha();
        };
    }

    // Botão flutuante "Cardápio": só na Cozinha e em telas estreitas
    setInterval(function () {
        const btn = document.getElementById('btn-cardapio-lateral');
        if (!btn) return;
        const hash = (location.hash || '').replace('#', '');
        const mostrar = hash === 'cozinha' && window.innerWidth <= 900 &&
            !document.body.classList.contains('cliente-qrcode') && !document.body.classList.contains('modo-garcom');
        btn.style.display = mostrar ? 'flex' : 'none';
        if (!mostrar) {
            const dr = document.getElementById('drawer-cardapio-cozinha');
            if (dr && dr.style.left === '0px') window.fecharListaLateralCozinha();
        }
    }, 300);

    // ========================================================
    // TOQUE / ROLAGEM
    // ========================================================
    // Em telas de toque, rolar uma lista nunca deve "clicar" por engano e o
    // duplo-toque não deve dar zoom. Também marca o body para o CSS.
    const toque = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    document.documentElement.classList.add(toque ? 'is-touch' : 'is-mouse');

    // Enter nos campos de busca/modal não deve recarregar nada; ESC fecha modais.
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        const modais = document.querySelectorAll('.modal-overlay');
        if (modais.length) modais[modais.length - 1].remove();
        else if (document.body.classList.contains('barra-filtros-aberta')) window.abrirBarraFiltros();
    });

    // Rolagem com mouse sobre faixas horizontais (abas/chips) = roda do mouse rola para o lado
    document.addEventListener('wheel', function (e) {
        const el = e.target.closest && e.target.closest('#menu-abas-pdv, #menu-abas-cozinha, #cozinha-chips, #cardapio-grupos-chips, #cardapio-dia-chips, .chips-filtro-wrapper, #caixa-chips, #historico-chips');
        if (!el || el.scrollWidth <= el.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
        el.scrollLeft += e.deltaY;
        e.preventDefault();
    }, { passive: false });

    // Botão "Voltar" do Android (e tecla Voltar): fecha primeiro o que estiver aberto por cima da tela.
    // Retorna true se fechou alguma coisa (o app não deve voltar de tela nesse caso).
    window.__voltarAndroid = function () {
        const doc = document.getElementById('visualizador-documento');
        if (doc) { doc.remove(); return true; }
        const modais = document.querySelectorAll('.modal-overlay');
        if (modais.length) { modais[modais.length - 1].remove(); return true; }
        const dr = document.getElementById('drawer-cardapio-cozinha');
        if (dr && dr.style.left === '0px') { window.fecharListaLateralCozinha(); return true; }
        const menu = document.getElementById('menu-lateral');
        if (menu && menu.classList.contains('open') && window.innerWidth < 1024) {
            if (typeof window.fecharMenu === 'function') window.fecharMenu();
            return true;
        }
        const b = document.body;
        if (b.classList.contains('barra-filtros-aberta') && !b.classList.contains('barra-filtros-fixada')) {
            window.abrirBarraFiltros();
            return true;
        }
        return false;
    };

    // Último "voltar": sempre cai no Menu Principal (exceto o cardápio do cliente aberto pelo QR Code, que sai do app).
    window.__voltarPasso = function () {
        if (/^\/mesa\//.test(location.pathname)) return 'mesa';          // cardápio do cliente (QR): comportamento normal
        if (window.__semConfigLocal) return 'nativo';
        const pd = window.perfilDados ? window.perfilDados() : null;
        const principal = pd ? (pd.menu ? 'home' : window.perfilRotaInicial()) : 'home';
        const rota = (location.hash || '#home').substring(1) || 'home';
        if (rota === principal) return 'sair';                                  // já no Menu Principal
        window.__navPop = true;
        try {
            if (window.__profundidade && window.__profundidade() > 1) history.back();   // ainda há telas para voltar
            else window.navigateTo(principal);                                          // último voltar: Menu Principal
        } finally { setTimeout(function () { window.__navPop = false; }, 50); }
        return 'voltou';
    };

    // Teclado na tela (celular/tablet): mantém o campo digitado visível
    document.addEventListener('focusin', function (e) {
        const t = e.target;
        if (!toque || !t || !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
        if (t.type === 'checkbox' || t.type === 'radio' || t.type === 'file') return;
        setTimeout(function () {
            try { if (document.activeElement === t) t.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (err) {}
        }, 350);
    });

    // Envolve cada <table> num contêiner que rola para o lado (celular/tablet)
    function envolverTabelas(raiz) {
        (raiz || document).querySelectorAll('table').forEach(function (t) {
            if (t.parentElement && t.parentElement.classList.contains('tabela-rolagem')) return;
            const w = document.createElement('div');
            w.className = 'tabela-rolagem';
            t.parentNode.insertBefore(w, t);
            w.appendChild(t);
        });
    }
    let agendado = false;
    new MutationObserver(function () {
        if (agendado) return;
        agendado = true;
        setTimeout(function () { agendado = false; envolverTabelas(document.getElementById('app')); envolverTabelas(document.querySelector('.modal-overlay')); }, 60);
    }).observe(document.documentElement, { childList: true, subtree: true });

    // ========================================================
    // PONTE COM O APP ANDROID / NAVEGADOR DO CELULAR E TABLET
    // (impressão, download, links externos, endereço na rede)
    // ========================================================
    const noApp = !!(window.AndroidApp && typeof window.AndroidApp.imprimir === 'function');
    window.__noApp = noApp;

    // Endereço que OUTROS aparelhos conseguem acessar (QR Code das mesas, links)
    window.__ipServidor = '';
    window.__portaServidor = location.port || '';
    window.urlBaseRede = function () {
        if (window.__urlExterna) return window.__urlExterna;   // link externo temporário (Cloudflare)
        const h = location.hostname;
        const local = (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '[::1]');
        if (local && window.__ipServidor && window.__ipServidor !== '127.0.0.1') {
            return 'http://' + window.__ipServidor + (window.__portaServidor ? ':' + window.__portaServidor : '');
        }
        return location.origin;
    };
    (function descobrirIp() {
        let ip = '';
        try { if (noApp && window.AndroidApp.ipLocal) ip = String(window.AndroidApp.ipLocal() || ''); } catch (e) {}
        if (ip && ip !== '?') { window.__ipServidor = ip; return; }
        fetch('/api/info-servidor').then(function (r) { return r.json(); }).then(function (d) {
            if (d && d.ip) window.__ipServidor = d.ip;
            if (d && d.porta) window.__portaServidor = String(d.porta);
        }).catch(function () {});
    })();

    // ----- Documentos para imprimir (cupom, relatórios, QR Code) -----
    function tituloDoHtml(html) {
        const m = /<title>([\s\S]*?)<\/title>/i.exec(html);
        return m ? m[1].trim() : 'Documento';
    }
    function semAutoImpressao(html) {
        // remove os <script> "window.onload = ... window.print()" (o botão Imprimir faz isso do jeito certo)
        return html.replace(/<script>\s*window\.onload\s*=[\s\S]*?<\/script>/gi, '');
    }
    function mostrarDocumento(htmlBruto) {
        const html = semAutoImpressao(htmlBruto);
        const titulo = tituloDoHtml(html);
        const antigo = document.getElementById('visualizador-documento');
        if (antigo) antigo.remove();
        const ov = document.createElement('div');
        ov.id = 'visualizador-documento';
        ov.style.cssText = 'position:fixed;inset:0;z-index:200000;background:#555;display:flex;flex-direction:column;';
        ov.innerHTML =
            '<div style="background:#C2185B;color:#fff;display:flex;align-items:center;gap:8px;padding:8px 10px;padding-top:calc(8px + env(safe-area-inset-top,0px));flex-shrink:0;">' +
            '<button type="button" data-acao="fechar" class="icon-btn" style="background:none;border:none;color:#fff;font-size:1.2rem;min-width:44px;min-height:44px;" aria-label="Fechar"><i class="fas fa-arrow-left"></i></button>' +
            '<div style="flex:1;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(titulo) + '</div>' +
            '<button type="button" data-acao="imprimir" class="btn-primary" style="background:#fff;color:#C2185B;border:none;border-radius:22px;padding:10px 18px;font-weight:700;"><i class="fas fa-print"></i> Imprimir / PDF</button>' +
            '</div>' +
            '<iframe style="flex:1;border:0;background:#fff;width:100%;min-height:0;" title="Documento"></iframe>';
        document.body.appendChild(ov);
        const fr = ov.querySelector('iframe');
        fr.srcdoc = html;
        ov.addEventListener('click', function (e) {
            const b = e.target.closest && e.target.closest('[data-acao]');
            if (!b) return;
            if (b.getAttribute('data-acao') === 'fechar') { ov.remove(); return; }
            if (noApp) { try { window.AndroidApp.imprimir(html, titulo); } catch (err) { alert('Erro ao imprimir: ' + err.message); } return; }
            try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (err) { window.print(); }
        });
    }

    function janelaVirtual() {
        let partes = [];
        const doc = {
            open: function () { partes = []; return doc; },
            write: function () { partes.push.apply(partes, arguments); },
            writeln: function () { partes.push.apply(partes, arguments); partes.push('\n'); },
            close: function () { if (partes.length) { const h = partes.join(''); partes = []; mostrarDocumento(h); } }
        };
        const w = { document: doc, closed: false, focus: function () {}, blur: function () {}, print: function () {}, close: function () { w.closed = true; }, onload: null, location: { href: '' } };
        return w;
    }

    const abrirNativo = window.open ? window.open.bind(window) : null;
    window.open = function (url, alvo, recursos) {
        const u = url == null ? '' : String(url);
        if (!u || u === 'about:blank') {
            // janela em branco usada só para montar um documento e imprimir
            if (!noApp && !toque && abrirNativo) {
                const w = abrirNativo(u, alvo, recursos);
                if (w) return w;
            }
            return janelaVirtual();
        }
        if (noApp && window.AndroidApp.abrirUrl) { window.AndroidApp.abrirUrl(u); return null; }
        return abrirNativo ? abrirNativo(u, alvo || '_blank', recursos) : null;
    };

    // ----- Download de arquivos gerados na tela (backup .json, exportação .csv) -----
    function blobParaBase64(blob) {
        return new Promise(function (ok, erro) {
            const fr = new FileReader();
            fr.onload = function () { ok(String(fr.result).split(',')[1] || ''); };
            fr.onerror = function () { erro(fr.error); };
            fr.readAsDataURL(blob);
        });
    }
    const cliqueOriginal = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
        const a = this;
        if (noApp && a.download && /^blob:/.test(a.href) && window.AndroidApp.salvarArquivo) {
            fetch(a.href).then(function (r) { return r.blob(); }).then(function (b) {
                return blobParaBase64(b).then(function (b64) {
                    window.AndroidApp.salvarArquivo(a.download, b.type || 'application/octet-stream', b64);
                });
            }).catch(function (e) { alert('Não foi possível salvar o arquivo: ' + e.message); });
            return;
        }
        return cliqueOriginal.apply(this, arguments);
    };
    // O revokeObjectURL logo após o click derrubaria o fetch acima: adia a liberação
    const revogar = URL.revokeObjectURL.bind(URL);
    URL.revokeObjectURL = function (u) { setTimeout(function () { try { revogar(u); } catch (e) {} }, 15000); };

    // Compartilhar: no app usa o menu "Compartilhar" do Android
    if (noApp && window.AndroidApp.compartilhar) {
        try { navigator.share = function (d) { window.AndroidApp.compartilhar((d && d.title) || '', ((d && d.text) || '') + ((d && d.url) ? '\n' + d.url : '')); return Promise.resolve(); }; } catch (e) {}
    }
})();
