// ============================================================
// EMPRESA.JS — Cadastro da empresa (dados usados no Recibo A4 / Recibo simples)
// ============================================================
console.log('✔ Empresa.js carregado');

(function () {
    const CAMPOS = ['empresaRazao', 'empresaFantasia', 'empresaCnpj', 'empresaIE', 'empresaIM', 'empresaRegime',
        'empresaCep', 'empresaLogradouro', 'empresaNumero', 'empresaComplemento', 'empresaBairro', 'empresaCidade', 'empresaUF',
        'empresaTelefone', 'empresaEmail', 'empresaSite', 'empresaResponsavel', 'empresaRespDoc'];
    const esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    window.__empCfg = {};

    function campo(id, rotulo, ph, extra) {
        extra = extra || {};
        return '<div class="field" style="' + (extra.flex ? 'flex:' + extra.flex + ';min-width:0;' : '') + '"><label for="emp-' + id + '">' + rotulo + '</label>' +
            '<input type="' + (extra.tipo || 'text') + '" id="emp-' + id + '" maxlength="' + (extra.max || 80) + '" placeholder="' + esc(ph || '') + '" value="' + esc(window.__empCfg[id]) + '"' + (extra.on ? ' ' + extra.on : '') + '></div>';
    }
    function sec(t, i) { return '<div style="font-weight:800;color:#C2185B;margin:18px 0 6px;"><i class="fas ' + i + '"></i> ' + t + '</div>'; }

    window.renderEmpresa = function () {
        setTimeout(carregar, 30);
        return '<div class="app-bar"><button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button><h1>Empresa</h1>' +
            '<button class="icon-btn" onclick="abrirMenu()"><i class="fas fa-bars"></i></button></div>' +
            '<div id="emp-corpo" style="padding:14px 16px 90px;"><div style="color:#6b6b6b;">Carregando…</div></div>';
    };

    async function carregar() {
        let cfg = {};
        try { cfg = window.normalizarArray(await apiGet('configuracoes'))[0] || {}; } catch (e) {}
        CAMPOS.forEach(function (k) { window.__empCfg[k] = cfg[k] || ''; });
        const el = document.getElementById('emp-corpo'); if (!el) return;
        el.innerHTML =
            '<div style="font-size:.8rem;color:#555;background:#FCE4EC;border-radius:10px;padding:10px;">Esses dados saem no <b>cabeçalho do recibo A4 (nota)</b> e no <b>Recibo simples</b> (quem recebeu). Preencha só o que for usar; nada é inventado pelo app.</div>' +
            sec('Identificação', 'fa-building') +
            campo('empresaRazao', 'Razão social / nome completo', 'Ex.: Sabor & Cia Alimentos LTDA') +
            campo('empresaFantasia', 'Nome fantasia', 'Ex.: Restaurante Sabor & Cia') +
            campo('empresaCnpj', 'CNPJ ou CPF', '00.000.000/0000-00', { max: 18, on: 'oninput="empMascara(this)"' }) +
            '<div style="display:flex;gap:8px;">' + campo('empresaIE', 'Inscrição estadual', 'Isento', { flex: 1, max: 20 }) + campo('empresaIM', 'Inscrição municipal', '', { flex: 1, max: 20 }) + '</div>' +
            '<div class="field"><label for="emp-empresaRegime">Enquadramento</label><select id="emp-empresaRegime">' +
            ['', 'MEI', 'Simples Nacional', 'Lucro Presumido', 'Lucro Real', 'Pessoa física / autônomo'].map(function (o) { return '<option value="' + o + '"' + (window.__empCfg.empresaRegime === o ? ' selected' : '') + '>' + (o || '— não informar —') + '</option>'; }).join('') + '</select></div>' +
            sec('Endereço', 'fa-location-dot') +
            campo('empresaCep', 'CEP', '00000-000', { max: 9, on: 'onblur="empBuscarCep()"' }) +
            '<small id="emp-cep-info" style="color:#6b6b6b;font-size:.75rem;">Digite o CEP para preencher o endereço.</small>' +
            campo('empresaLogradouro', 'Rua / Avenida', '') +
            '<div style="display:flex;gap:8px;">' + campo('empresaNumero', 'Número', '123', { flex: 1, max: 10 }) + campo('empresaComplemento', 'Complemento', 'Sala 2', { flex: 2, max: 40 }) + '</div>' +
            campo('empresaBairro', 'Bairro', '') +
            '<div style="display:flex;gap:8px;">' + campo('empresaCidade', 'Cidade', '', { flex: 3 }) + campo('empresaUF', 'UF', 'PA', { flex: 1, max: 2 }) + '</div>' +
            '<button type="button" class="btn-outline" style="width:100%;margin-top:6px;" onclick="empGps()"><i class="fas fa-location-crosshairs"></i> Preencher cidade e UF pelo GPS</button><small id="emp-gps-info" style="color:#6b6b6b;font-size:.75rem;"></small>' +
            sec('Contato', 'fa-phone') +
            campo('empresaTelefone', 'Telefone', '(00) 00000-0000', { tipo: 'tel', max: 20 }) +
            campo('empresaEmail', 'E-mail', 'contato@empresa.com', { tipo: 'email', max: 80 }) +
            campo('empresaSite', 'Site / Instagram', '@suaempresa', { max: 80 }) +
            sec('Quem assina o recibo', 'fa-signature') +
            campo('empresaResponsavel', 'Nome completo do responsável (se vazio, usa a razão social)', '') +
            campo('empresaRespDoc', 'CPF/CNPJ do responsável (se vazio, usa o da empresa)', '', { max: 18, on: 'oninput="empMascara(this)"' }) +
            '<div style="font-size:.78rem;color:#555;margin-top:10px;">A <b>logo</b> é a das Configurações › Logo. O <b>texto das observações</b> e o <b>modelo A4</b> ficam em Configurações › Layout de impressão.</div>' +
            '<button class="btn-primary" style="width:100%;margin-top:16px;" onclick="empSalvar()"><i class="fas fa-save"></i> Salvar dados da empresa</button>';
    }

    window.empMascara = function (el) {
        const d = el.value.replace(/\D/g, '').slice(0, 14);
        el.value = d.length <= 11 ? d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
            : d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
    };

    window.empBuscarCep = async function () {
        const cep = (document.getElementById('emp-empresaCep').value || '').replace(/\D/g, '');
        const info = document.getElementById('emp-cep-info');
        if (cep.length !== 8) return;
        if (info) info.textContent = 'Buscando…';
        try {
            const r = await (await fetch('https://viacep.com.br/ws/' + cep + '/json/')).json();
            if (r.erro) { if (info) info.textContent = 'CEP não encontrado — preencha à mão.'; return; }
            const set = function (k, v) { const e = document.getElementById('emp-' + k); if (e && v) e.value = v; };
            set('empresaLogradouro', r.logradouro); set('empresaBairro', r.bairro); set('empresaCidade', r.localidade); set('empresaUF', r.uf);
            if (info) info.textContent = 'Endereço preenchido. Informe o número.';
        } catch (e) { if (info) info.textContent = 'Sem internet — preencha o endereço à mão.'; }
    };

    window.empGps = async function () {
        const info = document.getElementById('emp-gps-info'); if (info) info.textContent = 'Buscando sua localização…';
        const r = await window.gpsCidadeUF(true);
        if (!r) { if (info) info.textContent = 'Não consegui a localização (permissão negada, sem GPS ou sem internet). Preencha à mão.'; return; }
        document.getElementById('emp-empresaCidade').value = r.cidade; document.getElementById('emp-empresaUF').value = r.uf;
        if (info) info.textContent = 'Localização: ' + r.cidade + '/' + r.uf + '. Confira e salve.';
    };

    window.empSalvar = async function () {
        let arr = []; try { arr = window.normalizarArray(await apiGet('configuracoes')); } catch (e) {}
        const cfg = arr[0] || {};
        CAMPOS.forEach(function (k) { const e = document.getElementById('emp-' + k); if (e) cfg[k] = String(e.value || '').trim(); });
        cfg.empresaUF = (cfg.empresaUF || '').toUpperCase();
        // endereço em uma linha (usado no cabeçalho do recibo A4)
        const l1 = [cfg.empresaLogradouro, cfg.empresaNumero].filter(Boolean).join(', ') + (cfg.empresaComplemento ? ' - ' + cfg.empresaComplemento : '');
        const l2 = [cfg.empresaBairro, [cfg.empresaCidade, cfg.empresaUF].filter(Boolean).join('/')].filter(Boolean).join(' - ');
        cfg.empresaEndereco = [l1, l2, cfg.empresaCep ? 'CEP ' + cfg.empresaCep : ''].filter(function (x) { return x && x.trim(); }).join(' - ');
        await apiSave('configuracoes', [cfg]);
        if (window.mostrarToast) window.mostrarToast('✅ Dados da empresa salvos'); else alert('Dados da empresa salvos');
    };
})();
