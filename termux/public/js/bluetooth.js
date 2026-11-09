// ============================================================
// BLUETOOTH.JS — Impressora térmica Bluetooth (app Android)
//  • Lista os aparelhos Bluetooth pareados; escolher uma impressora testa a conexão e imprime um cupom de teste.
//  • Comanda e recibo saem na impressora escolhida (ESC/POS, 32 colunas) com o grupo de trabalho.
// ============================================================
console.log('✔ bluetooth.js carregado');
(function () {
    'use strict';
    const COLS = 32;
    const A = function () { return window.AndroidApp && typeof window.AndroidApp.btListar === 'function' ? window.AndroidApp : null; };
    window.btDisponivel = function () { return !!A(); };

    // ---------- resposta assíncrona do app ----------
    const espera = {};
    window.__btRes = function (id, ok, msg) { const f = espera[id]; if (f) { delete espera[id]; f({ ok: ok, msg: msg }); } };

    // ---------- ESC/POS ----------
    const CP860 = { 'á': 0xA0, 'é': 0x82, 'í': 0xA1, 'ó': 0xA2, 'ú': 0xA3, 'ã': 0x84, 'õ': 0x94, 'â': 0x83, 'ê': 0x88, 'ô': 0x93, 'ç': 0x87, 'à': 0x85, 'Á': 0x86, 'É': 0x90, 'Í': 0x8B, 'Ó': 0x9F, 'Ú': 0x96, 'Ã': 0x8E, 'Õ': 0x99, 'Â': 0x8F, 'Ê': 0x89, 'Ô': 0x8C, 'Ç': 0x80, 'À': 0x91, 'ü': 0x81 };
    function semAcento(t) { return String(t).normalize('NFD').replace(/[̀-ͯ]/g, ''); }
    function paraBytes(texto, acentos) {
        const out = [];
        const t = acentos ? String(texto) : semAcento(texto);
        for (const ch of t) {
            const c = ch.charCodeAt(0);
            if (c < 128) out.push(c);
            else if (acentos && CP860[ch] !== undefined) out.push(CP860[ch]);
            else out.push(0x3F);
        }
        return out;
    }
    function b64(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 4096) s += String.fromCharCode.apply(null, bytes.slice(i, i + 4096)); return btoa(s); }

    /** linhas: array de {t:'texto', b:negrito, c:centro, g:grande} */
    function montarEscPos(linhas, acentos) {
        let o = [0x1B, 0x40];                       // inicializa
        if (acentos) o = o.concat([0x1B, 0x74, 0x03]);   // página de códigos PC860 (português)
        linhas.forEach(function (l) {
            if (l.qr) {   // QR nativo ESC/POS (GS ( k): modelo 2, módulo 6, correção L
                const d = paraBytes(l.qr, false), n = d.length + 3;
                o = o.concat([0x1B, 0x61, 0x01]);
                o = o.concat([0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]);
                o = o.concat([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x06]);
                o = o.concat([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x30]);
                o = o.concat([0x1D, 0x28, 0x6B, n & 255, (n >> 8) & 255, 0x31, 0x50, 0x30]).concat(d);
                o = o.concat([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30, 0x0A]);
                return;
            }
            if (l.raster) {   // imagem monocromática (GS v 0), centralizada
                const r = l.raster, wb = Math.ceil(r.w / 8);
                o = o.concat([0x1B, 0x61, 1, 0x1D, 0x76, 0x30, 0, wb & 255, wb >> 8, r.h & 255, r.h >> 8]);
                for (let i = 0; i < r.data.length; i++) o.push(r.data[i]);
                o = o.concat([0x0A]);
                return;
            }
            o = o.concat([0x1B, 0x61, l.c ? 1 : 0, 0x1B, 0x45, l.b ? 1 : 0, 0x1D, 0x21, l.g ? 0x11 : 0x00]);
            o = o.concat(paraBytes(l.t, acentos)).concat([0x0A]);
        });
        o = o.concat([0x1B, 0x61, 0, 0x1B, 0x45, 0, 0x1D, 0x21, 0, 0x0A, 0x0A, 0x0A, 0x1D, 0x56, 0x41, 0x10]);   // avanço + corte
        return o;
    }

    window.btEnviar = function (mac, linhas, acentos) {
        return new Promise(function (resolve) {
            const ap = A();
            if (!ap) return resolve({ ok: false, msg: 'Disponível somente no app Android.' });
            const id = 'bt' + Date.now() + Math.random().toString(36).slice(2, 5);
            espera[id] = resolve;
            setTimeout(function () { if (espera[id]) { delete espera[id]; resolve({ ok: false, msg: 'Tempo esgotado (20 s). A impressora está ligada e perto?' }); } }, 20000);
            try { ap.btImprimir(mac, b64(montarEscPos(linhas, acentos)), id); }
            catch (e) { delete espera[id]; resolve({ ok: false, msg: e.message }); }
        });
    };

    // QR Code em bitmap 1-bit (funciona em qualquer térmica; não depende do comando QR da impressora)
    function qrRaster(texto, lado) {
        return new Promise(function (resolve) {
            try {
                const url = window.qrUrl(texto, lado + 'x' + lado);
                const img = new Image();
                img.onload = function () {
                    const w = Math.ceil(lado / 8) * 8, h = lado;
                    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
                    const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
                    g.imageSmoothingEnabled = false; g.drawImage(img, 0, 0, lado, lado);
                    const px = g.getImageData(0, 0, w, h).data, wb = w / 8, data = new Uint8Array(wb * h);
                    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
                        const i = (y * w + x) * 4;
                        if ((px[i] + px[i + 1] + px[i + 2]) / 3 < 128) data[y * wb + (x >> 3)] |= (0x80 >> (x & 7));
                    }
                    resolve({ w: w, h: h, data: data });
                };
                img.onerror = function () { resolve(null); };
                img.src = url;
            } catch (e) { resolve(null); }
        });
    }

    // ---------- textos ----------
    function fmt(v) { return 'R$ ' + Number(v || 0).toFixed(2).replace('.', ','); }
    function duas(esq, dir) { esq = String(esq); dir = String(dir); const esp = COLS - dir.length - 1; if (esq.length > esp) esq = esq.slice(0, Math.max(1, esp)); return esq + ' '.repeat(Math.max(1, COLS - esq.length - dir.length)) + dir; }
    const LINHA = '-'.repeat(COLS);

    window.btMontarLinhas = async function (tipo, c, config) {
        const calc = window.calcularTotais ? window.calcularTotais(c) : { subtotal: c.subtotal || 0, desconto: 0, total: c.total || 0 };
        const cor = window.obterCorCaixaDaComanda ? await window.obterCorCaixaDaComanda(c) : null;
        const L = [];
        L.push({ t: String(config.nomeImpressao || 'Comandas').toUpperCase(), b: 1, c: 1, g: 1 });
        L.push({ t: tipo === 'recibo' ? 'RECIBO DE PAGAMENTO' : 'COMANDA', c: 1, b: 1 });
        if (tipo === 'recibo') L.push({ t: c.pagamentoPendente ? 'PENDENTE (FIADO)' : 'PAGO', c: 1, b: 1 });
        if (cor) L.push({ t: String(cor.label || cor.id).toUpperCase(), c: 1, b: 1 });
        L.push({ t: LINHA });
        L.push({ t: 'Comanda: ' + c.numero + '   Mesa: ' + (window.formatarMesa ? window.formatarMesa(c.mesa) : (c.mesa || '-')), b: 1 });
        L.push({ t: 'Data: ' + (c.dataFechamento || c.dataAbertura || new Date().toLocaleString('pt-BR')) });
        if (c.cliente) L.push({ t: 'Cliente: ' + c.cliente });
        L.push({ t: LINHA });
        (window.normalizarArray(c.itens) || []).forEach(function (i) {
            L.push({ t: duas(i.quantidade + 'x ' + i.nome, fmt(Number(i.preco) * Number(i.quantidade))) });
        });
        L.push({ t: LINHA });
        if (calc.desconto > 0) { L.push({ t: duas('Subtotal', fmt(calc.subtotal)) }); L.push({ t: duas('Desconto', '-' + fmt(calc.desconto)) }); }
        L.push({ t: duas('TOTAL', fmt(calc.total)), b: 1, g: 1 });
        const pixVal = window.pixValorPago ? window.pixValorPago(c) : 0;
        const qrImp = pixVal > 0.004 && window.pixQrAtivo && window.pixQrAtivo(config, 'impressao', tipo === 'recibo' ? 'recibo' : 'comanda');
        if (qrImp) {
            L.push({ t: LINHA });
            L.push({ t: 'PAGUE COM PIX', b: 1, c: 1 });
            L.push({ qr: window.gerarPixComValor(config.pixRestaurante, pixVal) });
            L.push({ t: 'Valor PIX: ' + fmt(pixVal), c: 1 });
            if (config.pixChave) L.push({ t: 'PIX: ' + window.pixFormatarChave(config.pixTipo, config.pixChave), c: 1 });
        }
        if (tipo === 'recibo') {
            const nomes = { dinheiro: 'Dinheiro', debito: 'Debito', credito: 'Credito', pix: 'PIX' };
            (window.normalizarArray(c.pagamentos) || []).forEach(function (p) { L.push({ t: duas(nomes[p.forma] || p.forma, fmt(p.valor)) }); if (p.maquininha && window.maquininhaTexto) L.push({ t: window.maquininhaTexto(p.maquininha) }); });
            if (Number(c.troco) > 0) L.push({ t: duas('Troco', fmt(c.troco)) });
            if (window.pendenciasAnteriores) {
                const pa = await window.pendenciasAnteriores(c), atual = c.pagamentoPendente ? Number(c.valorPendente || 0) : 0;
                if (pa.valor > 0 || atual > 0) {
                    L.push({ t: LINHA });
                    L.push({ t: duas('Pendencias anteriores', fmt(pa.valor)) });
                    L.push({ t: duas('Pendente desta comanda', fmt(atual)) });
                    L.push({ t: duas('TOTAL GERAL PENDENTE', fmt(pa.valor + atual)), b: 1 });
                }
            }
            if (pixVal > 0.004 && config.exibirPixRecibo && config.pixRestaurante && window.gerarPixComValor && window.qrUrl) {
                const rr = await qrRaster(window.gerarPixComValor(config.pixRestaurante, pixVal), 192);
                if (rr) { L.push({ t: 'PAGAMENTO VIA PIX', c: 1, b: 1 }); L.push({ raster: rr }); L.push({ t: 'Valor PIX: ' + fmt(pixVal), c: 1 }); }
            }
            if (config.pixChave && !qrImp && pixVal > 0.004) L.push({ t: 'PIX: ' + (window.pixFormatarChave ? window.pixFormatarChave(config.pixTipo, config.pixChave) : config.pixChave), c: 1 });
            L.push({ t: 'Obrigado pela preferencia!', c: 1 });
        }
        return L;
    };

    /** Chamada pelos botões Imprimir: devolve true se imprimiu (ou tentou) pela Bluetooth. */
    window.btTentarImprimir = async function (tipo) {
        if (!A() || !window.comandaAtual) return false;
        let config = {};
        try { config = window.normalizarArray(await apiGet('configuracoes'))[0] || {}; } catch (e) {}
        if (!config.btImpressora || !config.btImpressora.mac || config.btUsar === false) return false;
        window.btAguarde('Imprimindo na ' + config.btImpressora.nome + '...');
        const linhas = await window.btMontarLinhas(tipo, window.comandaAtual, config);
        const r = await window.btEnviar(config.btImpressora.mac, linhas, !config.btSemAcentos);
        window.btAguardeFechar();
        if (!r.ok) {
            if (await window.confirmar('Não foi possível imprimir na impressora Bluetooth:\n' + r.msg + '\n\nImprimir pelo método normal do celular?')) return false;
        }
        return true;
    };

    // ---------- diálogo "aguarde" ----------
    window.btAguarde = function (texto) {
        window.btAguardeFechar();
        const m = document.createElement('div');
        m.id = 'bt-aguarde';
        m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:300000;display:flex;align-items:center;justify-content:center;padding:20px;';
        m.innerHTML = '<div style="background:#fff;border-radius:12px;padding:22px 20px;max-width:320px;width:100%;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.35);">' +
            '<div style="font-weight:700;margin-bottom:14px;">' + texto + '</div>' +
            '<div style="width:46px;height:46px;border:6px solid #ddd;border-top-color:#C2185B;border-radius:50%;margin:0 auto;animation:btgira 1s linear infinite;"></div></div>' +
            '<style>@keyframes btgira{to{transform:rotate(360deg)}}</style>';
        document.body.appendChild(m);
    };
    window.btAguardeFechar = function () { const m = document.getElementById('bt-aguarde'); if (m) m.remove(); };

    // ---------- seção na tela Impressoras ----------
    async function salvarCfg(campos) {
        const arr = window.normalizarArray(await apiGet('configuracoes'));
        const c = Object.assign({}, arr[0] || {}, campos);
        await apiSave('configuracoes', [c]);
        return c;
    }

    window.btDesenhar = async function () {
        const box = document.getElementById('bt-secao');
        if (!box) return;
        const ap = A();
        if (!ap) { box.innerHTML = '<div style="padding:10px;background:#fff3e0;border-radius:8px;font-size:.85rem;">A impressora Bluetooth térmica funciona no <b>app Android</b>. No navegador use a impressão do celular/computador.</div>'; return; }
        let cfg = {};
        try { cfg = window.normalizarArray(await apiGet('configuracoes'))[0] || {}; } catch (e) {}
        let r = {};
        try { r = JSON.parse(ap.btListar()); } catch (e) { r = { erro: 'Falha ao ler os dispositivos', lista: [] }; }
        const sel = cfg.btImpressora ? cfg.btImpressora.mac : '';
        let h = '<div style="text-align:center;font-weight:600;margin-bottom:10px;">Impressoras Bluetooth</div>';
        h += '<div style="display:flex;gap:10px;justify-content:center;margin-bottom:12px;">' +
             '<button class="btn-outline" style="flex:1;" onclick="btResetar()">Resetar</button>' +
             '<button class="btn-outline" style="flex:1;" onclick="btDesenhar()">Atualizar dispositivos</button></div>';
        if (r.erro) h += '<div style="color:#c62828;font-size:.85rem;padding:8px 0;text-align:center;">' + r.erro + '</div>';
        if (!r.erro && !(r.lista || []).length) h += '<div style="color:#666;font-size:.85rem;text-align:center;padding:8px;">Nenhum aparelho pareado. Pareie a impressora em Configurações do celular › Bluetooth e toque em Atualizar.</div>';
        (r.lista || []).forEach(function (d) {
            const on = d.mac === sel;
            h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 4px;border-bottom:1px solid #eee;">' +
                 '<div><div style="font-weight:600;">' + d.nome + (d.impressora ? ' 🖨️' : '') + '</div><div style="font-size:.78rem;color:#555;">' + d.mac + '</div></div>' +
                 '<label style="position:relative;width:54px;height:30px;display:inline-block;">' +
                 '<input type="checkbox" ' + (on ? 'checked' : '') + ' onchange="btEscolher(this,\'' + d.mac + '\',\'' + String(d.nome).replace(/'/g, '') + '\')" style="opacity:0;width:100%;height:100%;position:absolute;margin:0;z-index:2;">' +
                 '<span style="position:absolute;inset:0;border-radius:15px;background:' + (on ? '#C2185B' : '#ccc') + ';"></span>' +
                 '<span style="position:absolute;top:3px;left:' + (on ? '27px' : '3px') + ';width:24px;height:24px;border-radius:50%;background:#fff;"></span></label></div>';
        });
        h += '<label style="display:flex;gap:8px;align-items:center;margin-top:12px;font-size:.85rem;"><input type="checkbox" id="bt-sem-acentos" ' + (cfg.btSemAcentos ? 'checked' : '') + ' onchange="btSalvarAcentos(this.checked)"> Imprimir sem acentos (se sair símbolo estranho)</label>';
        if (sel) h += '<button class="btn-outline" style="width:100%;margin-top:10px;" onclick="btTestarAtual()"><i class="fas fa-print"></i> Imprimir teste</button>';
        box.innerHTML = h;
    };

    window.btEscolher = async function (el, mac, nome) {
        if (!el.checked) { await salvarCfg({ btImpressora: null }); return window.btDesenhar(); }
        window.btAguarde('Estamos testando a conexão com a impressora, aguarde.');
        const cfg = await salvarCfg({ btImpressora: { mac: mac, nome: nome }, btUsar: true });
        const r = await window.btEnviar(mac, [{ t: 'TESTE DE CONEXAO', b: 1, c: 1 }, { t: nome, c: 1 }, { t: 'Acentos: ação, é, ç, ú', c: 1 }, { t: LINHA }, { t: 'Impressora conectada!', c: 1 }], !cfg.btSemAcentos);
        window.btAguardeFechar();
        if (r.ok) alert('✅ Impressora conectada e teste enviado.');
        else { await salvarCfg({ btImpressora: null }); alert('❌ Não foi possível conectar: ' + r.msg + '\n\nConfira se está ligada, pareada e perto do celular.'); }
        window.btDesenhar();
    };
    window.btResetar = async function () { if (!await window.confirmar('Esquecer a impressora Bluetooth escolhida?')) return; await salvarCfg({ btImpressora: null }); window.btDesenhar(); };
    window.btSalvarAcentos = async function (v) { await salvarCfg({ btSemAcentos: !!v }); };
    window.btTestarAtual = async function () {
        const cfg = window.normalizarArray(await apiGet('configuracoes'))[0] || {};
        if (!cfg.btImpressora) return;
        window.btAguarde('Testando a conexão...');
        const r = await window.btEnviar(cfg.btImpressora.mac, [{ t: 'TESTE', b: 1, c: 1, g: 1 }, { t: 'Acentos: ação, é, ç, ú', c: 1 }], !cfg.btSemAcentos);
        window.btAguardeFechar();
        alert(r.ok ? '✅ Teste enviado.' : '❌ ' + r.msg);
    };
})();
