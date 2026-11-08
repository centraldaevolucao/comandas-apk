/* Seletor de cliente pesquisável (lista A-Z, filtra enquanto digita, seta mostra todos).
   window.clientePicker.anexar(inputEl, { onSelect(cli|null), limparAoDigitar, onNovo })
   Estado no próprio input: dataset.clienteId / dataset.telefone / dataset.cpf */
(function () {
    'use strict';
    const COR = '#C2185B';
    const norm = function (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
    const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

    async function carregar() {
        let l = [];
        try { l = window.normalizarArray(await apiGet('clientes')); } catch (e) { l = window.clientesCache || []; }
        window.clientesCache = l;
        return l.filter(function (c) { return c && c.nome; }).sort(function (a, b) { return String(a.nome).localeCompare(String(b.nome), 'pt-BR', { sensitivity: 'base' }); });
    }

    let aberto = null;
    function fechar() { if (aberto) { aberto.remove(); aberto = null; } }
    document.addEventListener('mousedown', function (e) { if (aberto && !aberto.contains(e.target) && !(e.target.closest && e.target.closest('.cp-wrap'))) fechar(); }, true);
    document.addEventListener('touchstart', function (e) { if (aberto && !aberto.contains(e.target) && !(e.target.closest && e.target.closest('.cp-wrap'))) fechar(); }, true);

    // ---- cadastro rápido (+Novo) ----
    window.cadastroRapidoCliente = function (cb, nomeInicial) {
        const ov = document.createElement('div');
        ov.style.cssText = 'display:flex;align-items:center;justify-content:center;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:300000;padding:16px;';
        const f = function (id, rot, ph, v) { return '<label style="display:block;font-size:.8rem;color:#666;margin-top:10px;">' + rot + '</label><input id="' + id + '" value="' + esc(v || '') + '" placeholder="' + ph + '" style="width:100%;box-sizing:border-box;padding:11px;border:2px solid #ddd;border-radius:10px;font-size:1rem;">'; };
        ov.innerHTML = '<div style="background:#fff;border-radius:16px;max-width:380px;width:100%;overflow:hidden;"><div style="background:' + COR + ';color:#fff;padding:14px 16px;font-weight:700;"><i class="fas fa-user-plus"></i> Novo cliente</div>' +
            '<div style="padding:6px 16px 4px;">' + f('cr-nome', 'Nome *', 'Nome completo', nomeInicial) + f('cr-tel', 'Telefone / WhatsApp', '(00) 00000-0000') + f('cr-cpf', 'CPF/CNPJ', 'Opcional') + '</div>' +
            '<div style="display:flex;gap:10px;padding:14px 16px 16px;"><button data-c class="btn-outline" style="flex:1;">Cancelar</button><button data-o class="btn-primary" style="flex:1;">Cadastrar</button></div></div>';
        document.body.appendChild(ov);
        const v = function (id) { return ov.querySelector('#' + id).value.trim(); };
        ov.querySelector('[data-c]').onclick = function () { ov.remove(); };
        ov.querySelector('[data-o]').onclick = async function () {
            const nome = v('cr-nome');
            if (!nome) { if (window.avisar) window.avisar('Informe o nome do cliente.'); return; }
            const lista = window.normalizarArray(await apiGet('clientes'));
            const cli = { id: Date.now(), nome: nome, telefone: v('cr-tel'), cpf: v('cr-cpf') };
            lista.push(cli);
            await apiSave('clientes', lista);
            window.clientesCache = lista;
            ov.remove();
            if (cb) cb(cli);
        };
        setTimeout(function () { const i = ov.querySelector('#cr-nome'); if (i) i.focus(); }, 80);
    };

    function anexar(inp, opts) {
        opts = opts || {};
        if (inp.dataset.cpOk) return;
        inp.dataset.cpOk = '1';
        const wrap = document.createElement('div');
        wrap.className = 'cp-wrap';
        wrap.style.cssText = 'position:relative;';
        inp.parentNode.insertBefore(wrap, inp);
        wrap.appendChild(inp);
        inp.style.paddingRight = '44px';
        inp.setAttribute('autocomplete', 'off');
        const seta = document.createElement('button');
        seta.type = 'button';
        seta.setAttribute('aria-label', 'Mostrar clientes');
        seta.style.cssText = 'position:absolute;right:0;top:0;bottom:0;width:42px;border:none;background:transparent;color:' + COR + ';font-size:1rem;cursor:pointer;';
        seta.innerHTML = '<i class="fas fa-chevron-down"></i>';
        wrap.appendChild(seta);

        function escolher(cli) {
            if (cli) { inp.value = opts.limpaTexto ? '' : cli.nome; inp.dataset.clienteId = cli.id; inp.dataset.telefone = cli.telefone || ''; inp.dataset.cpf = cli.cpf || ''; inp.dataset.nomeSel = cli.nome; }
            else { delete inp.dataset.clienteId; delete inp.dataset.telefone; delete inp.dataset.cpf; delete inp.dataset.nomeSel; if (opts.limpaTexto || opts.semCadastroLimpa) inp.value = ''; }
            fechar();
            if (opts.onSelect) opts.onSelect(cli || null);
        }

        let tok = 0;
        async function mostrar(filtrar) {
            const meu = ++tok;
            const todos = await carregar();
            if (meu !== tok) return;
            const q = filtrar ? norm(inp.value) : '';
            const lista = q ? todos.filter(function (c) { return norm(c.nome).indexOf(q) >= 0 || norm(c.telefone).indexOf(q) >= 0 || norm(c.cpf).indexOf(q) >= 0; }) : todos;
            fechar();
            const box = document.createElement('div');
            const r = inp.getBoundingClientRect();
            const abaixo = window.innerHeight - r.bottom;
            const alt = Math.min(260, Math.max(140, abaixo > 180 ? abaixo - 10 : r.top - 10));
            box.style.cssText = 'position:fixed;left:' + r.left + 'px;width:' + r.width + 'px;max-height:' + alt + 'px;overflow-y:auto;background:#fff;border:2px solid ' + COR + ';border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.3);z-index:300001;' + (abaixo > 180 ? 'top:' + (r.bottom + 4) + 'px;' : 'bottom:' + (window.innerHeight - r.top + 4) + 'px;');
            const item = function (html, extra) { return '<div class="cp-it" style="padding:11px 12px;border-bottom:1px solid #f0f0f0;cursor:pointer;font-size:.95rem;' + (extra || '') + '">' + html + '</div>'; };
            let h = item('<i class="fas fa-user-slash" style="margin-right:6px;"></i> Sem cadastro (digitar nome)', 'color:#666;');
            h += lista.map(function (c) { return item('<b>' + esc(c.nome) + '</b>' + (c.telefone ? '<div style="font-size:.78rem;color:#888;">' + esc(c.telefone) + '</div>' : '')); }).join('');
            if (!lista.length) h += '<div style="padding:10px 12px;color:#999;font-size:.85rem;">Nenhum cliente encontrado.</div>';
            h += item('<i class="fas fa-plus"></i> Novo cliente', 'color:' + COR + ';font-weight:700;border-bottom:none;');
            box.innerHTML = h;
            const its = box.querySelectorAll('.cp-it');
            its[0].onclick = function () { escolher(null); };
            lista.forEach(function (c, i) { its[i + 1].onclick = function () { escolher(c); }; });
            its[its.length - 1].onclick = function () { fechar(); (opts.onNovo || function () { window.cadastroRapidoCliente(function (cli) { escolher(cli); }, inp.value); })(); };
            document.body.appendChild(box);
            aberto = box;
        }
        inp.addEventListener('focus', function () { mostrar(false); });
        inp.addEventListener('input', function () {
            if (opts.limparAoDigitar && inp.dataset.clienteId && inp.value !== inp.dataset.nomeSel) { delete inp.dataset.clienteId; delete inp.dataset.telefone; delete inp.dataset.cpf; if (opts.onSelect) opts.onSelect(null, true); }
            mostrar(true);
        });
        seta.onclick = function (e) { e.preventDefault(); if (aberto) fechar(); else { if (document.activeElement === inp) mostrar(false); else inp.focus(); } };
    }

    // Botão "+ Novo" ao lado do rótulo: cadastra e já seleciona no campo.
    window.novoClienteNaComanda = function (inputId) {
        const inp = document.getElementById(inputId);
        window.cadastroRapidoCliente(function (cli) {
            if (!inp) return;
            inp.value = cli.nome; inp.dataset.clienteId = cli.id; inp.dataset.telefone = cli.telefone || ''; inp.dataset.cpf = cli.cpf || ''; inp.dataset.nomeSel = cli.nome;
        }, inp ? inp.value : '');
    };

    window.clientePicker = { anexar: anexar, carregar: carregar };
})();
