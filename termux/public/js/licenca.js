/* Assinatura / licença — telas e bloqueios do plano gratuito.
   O status vem do servidor (GET /api/licenca); a verificação do código é feita lá (assinatura digital).
   Plano gratuito (ou assinatura vencida): até 30 comandas por mês e SEM Caixa (histórico/fechamento), Relatórios e Cardápio digital. */
(function () {
    'use strict';
    const COR = '#C2185B';
    // Número do WhatsApp que recebe o comprovante (com 55 + DDD). Troque pelo SEU número.
    window.LICENCA_WHATSAPP = window.LICENCA_WHATSAPP || '5511999999999';
    const VALOR_PADRAO = 13.99;

    const GRUPOS = {
        caixa: { nome: 'Caixa (fechamento, resumo e histórico)', rotas: ['caixa', 'resumo-caixa', 'historico-caixa'] },
        relatorios: { nome: 'Relatórios', rotas: ['relatorios', 'comandas-arquivadas', 'produtos-vendidos', 'totais-especie', 'relatorio-estoque'] },
        cardapio: { nome: 'Cardápio digital (QR Code)', rotas: ['cardapio-dia', 'qrcodes'] }
    };
    const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    const dataBR = function (iso) { if (!iso) return '—'; const p = String(iso).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso; };

    window.LICENCA = window.LICENCA || { status: null };

    window.licencaCarregar = async function () {
        try {
            const r = await window.apiGet('licenca');
            if (r && typeof r === 'object' && 'limitado' in r) window.LICENCA.status = r;
        } catch (e) { /* sem resposta: mantém o último status conhecido */ }
        return window.LICENCA.status;
    };

    window.licencaLimitado = function () { const s = window.LICENCA.status; return !!(s && s.limitado); };

    /** Grupo bloqueado para esta rota (ou null). */
    window.licencaBloqueia = function (rota) {
        if (!window.licencaLimitado()) return null;
        const k = Object.keys(GRUPOS).find(function (g) { return GRUPOS[g].rotas.indexOf(rota) >= 0; });
        return k || null;
    };

    // ---------- modal "recurso de assinante" ----------
    function modalUpsell(titulo, corpo) {
        const old = document.getElementById('modal-licenca'); if (old) old.remove();
        const m = document.createElement('div');
        m.id = 'modal-licenca';
        m.style.cssText = 'display:flex;align-items:center;justify-content:center;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:300000;padding:16px;';
        m.innerHTML = '<div style="background:#fff;border-radius:16px;max-width:380px;width:100%;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.35);">' +
            '<div style="background:linear-gradient(135deg,' + COR + ',#880E4F);color:#fff;padding:18px 16px;text-align:center;"><i class="fas fa-crown" style="font-size:2rem;color:#ffd54f;"></i><div style="font-weight:700;margin-top:8px;font-size:1.05rem;">' + titulo + '</div></div>' +
            '<div style="padding:16px;color:#333;line-height:1.45;">' + corpo + '</div>' +
            '<div style="display:flex;gap:10px;padding:0 16px 16px;"><button class="btn-outline" style="flex:1;" data-n>Agora não</button><button class="btn-primary" style="flex:1;" data-s><i class="fas fa-crown"></i> Assinar</button></div></div>';
        document.body.appendChild(m);
        m.querySelector('[data-n]').onclick = function () { m.remove(); };
        m.querySelector('[data-s]').onclick = function () { m.remove(); window.navigateTo('assinatura'); };
    }

    window.licencaMostrarBloqueio = function (grupo) {
        const g = GRUPOS[grupo] || { nome: 'Este recurso' };
        modalUpsell('Recurso para assinantes', '<b>' + esc(g.nome) + '</b> está disponível apenas com a assinatura ativa.<br><span style="font-size:.85rem;color:#777;">No plano gratuito você usa o PDV, comandas (até ' + ((window.LICENCA.status || {}).limiteComandas || 30) + ' por mês), todos os cadastros livres.</span>');
    };

    /** Chamar antes de criar uma comanda. false = limite do plano gratuito atingido (mostra a oferta). */
    window.licencaPodeCriarComanda = async function () {
        const s = await window.licencaCarregar();
        if (!s || !s.limitado) return true;
        if (s.comandasMes >= s.limiteComandas) {
            modalUpsell('Limite do plano gratuito', 'Você já criou <b>' + s.comandasMes + ' de ' + s.limiteComandas + ' comandas</b> neste mês.<br>Assine para criar comandas sem limite e liberar Caixa, Relatórios e Cardápio digital.');
            return false;
        }
        return true;
    };

    // O servidor também recusa (402): mostra a mensagem dele
    window.addEventListener('licenca:bloqueio', function (e) {
        modalUpsell('Plano gratuito', esc((e.detail && e.detail.msg) || 'Recurso para assinantes.'));
        window.licencaCarregar();
    });

    // ---------- faixa de aviso (PDV) ----------
    window.licencaFaixa = function () {
        const s = window.LICENCA.status; if (!s) return '';
        let txt = '', cor = '#e65100', bg = '#fff3e0';
        if (s.estado === 'gratis' || s.estado === 'vencida') {
            txt = (s.estado === 'vencida' ? 'Assinatura vencida em ' + dataBR(s.validade) + ' · ' : 'Plano gratuito · ') + s.comandasMes + '/' + s.limiteComandas + ' comandas no mês';
            if (s.comandasMes >= s.limiteComandas) { cor = '#c62828'; bg = '#ffebee'; }
        } else if (s.estado === 'carencia') { txt = 'Assinatura vencida — acesso liberado por mais ' + Math.max(0, (s.carenciaDias || 0) + s.diasRestantes + 1) + ' dia(s). Renove!'; cor = '#c62828'; bg = '#ffebee'; }
        else if (s.aviso) { txt = 'Sua assinatura vence em ' + s.diasRestantes + ' dia(s) (' + dataBR(s.validade) + ')'; }
        else return '<div onclick="navigateTo(\'assinatura\')" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:#e8f5e9;color:#2e7d32;border-radius:20px;padding:4px 12px;margin-bottom:8px;font-size:.72rem;font-weight:600;"><i class="fas fa-crown"></i> Assinatura ativa · ' + s.diasRestantes + ' dia(s)</div>';
        return '<div onclick="navigateTo(\'assinatura\')" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:8px;background:' + bg + ';color:' + cor + ';border-radius:10px;padding:8px 12px;margin-bottom:10px;font-size:.8rem;font-weight:600;"><span><i class="fas fa-crown"></i> ' + txt + '</span><span style="text-decoration:underline;white-space:nowrap;">' + (s.limitado ? 'Assinar' : 'Renovar') + '</span></div>';
    };

    // No plano gratuito o caixa abre sozinho (não existe tela de caixa): o PDV funciona direto.
    window.licencaGarantirCaixaAberto = async function () {
        if (!window.licencaLimitado()) return false;
        const atual = await window.obterCaixaAbertoAtual();
        if (atual) return false;
        const cor = ((window.CORES_CAIXA || [])[0] || {}).id || 'azul';
        await window.apiSave('caixaAtual', [{ id: Date.now(), cor: cor, valorInicial: 0, status: 'aberto', dataAbertura: new Date().toLocaleString('pt-BR'), usuario: 'Operador', observacao: 'Aberto automaticamente (plano gratuito)', modoGratis: true }]);
        return true;
    };

    // ---------- tela Assinatura ----------
    async function valorAssinatura() {
        try { const c = window.normalizarArray(await window.apiGet('configuracoes'))[0] || {}; return Number(c.valorAssinatura) || VALOR_PADRAO; } catch (e) { return VALOR_PADRAO; }
    }
    const R = function (v) { return 'R$ ' + Number(v).toFixed(2).replace('.', ','); };

    window.renderAssinatura = function () {
        setTimeout(carregarTelaAssinatura, 30);
        return '<div class="app-bar"><button class="icon-btn" onclick="voltar()"><i class="fas fa-arrow-left"></i></button><h1>Assinatura</h1><div style="width:40px;"></div></div>' +
            '<div class="content-area" id="assinatura-conteudo" style="padding:12px;"><p class="empty-state">Carregando...</p></div>';
    };

    async function carregarTelaAssinatura() {
        const box = document.getElementById('assinatura-conteudo'); if (!box) return;
        const s = await window.licencaCarregar();
        if (!s) { box.innerHTML = '<p class="empty-state" style="color:#c62828;">Não foi possível ler a assinatura. Verifique a conexão com o servidor.</p>'; return; }
        const valor = await valorAssinatura();
        let cartao;
        if (s.estado === 'ativa') cartao = ['#e8f5e9', '#2e7d32', 'fa-check-circle', 'Assinatura ativa', 'Válida até <b>' + dataBR(s.validade) + '</b>' + (s.cliente ? '<br>Cliente: ' + esc(s.cliente) : '') + '<div id="lic-contador" data-fim="' + esc(s.validade) + '" style="margin-top:10px;font-size:1.5rem;font-weight:700;font-family:monospace;color:#2e7d32;"></div><div style="font-size:.72rem;color:#777;">tempo restante (dias · hh:mm:ss)</div>'];
        else if (s.estado === 'carencia') cartao = ['#fff3e0', '#e65100', 'fa-triangle-exclamation', 'Assinatura vencida', 'Venceu em <b>' + dataBR(s.validade) + '</b>. Tudo segue liberado por poucos dias — renove para não perder o acesso.<div id="lic-contador" data-fim="' + esc(s.validade) + '" data-carencia="' + (s.carenciaDias || 0) + '" style="margin-top:10px;font-size:1.3rem;font-weight:700;font-family:monospace;color:#e65100;"></div><div style="font-size:.72rem;color:#777;">tempo até o bloqueio</div>'];
        else if (s.estado === 'vencida') cartao = ['#ffebee', '#c62828', 'fa-lock', 'Assinatura vencida', 'Venceu em <b>' + dataBR(s.validade) + '</b>. Você está no plano gratuito.'];
        else cartao = ['#f3f3f3', '#555', 'fa-gift', 'Plano gratuito', 'Comandas neste mês: <b>' + s.comandasMes + ' de ' + s.limiteComandas + '</b>'];
        let h = '<div style="padding:22px 16px;background:linear-gradient(135deg,' + COR + ',#880E4F);color:#fff;border-radius:12px;margin-bottom:14px;text-align:center;"><i class="fas fa-crown" style="font-size:2.4rem;color:#ffd54f;"></i>' +
            '<div style="font-size:1.25rem;font-weight:700;margin-top:8px;">Comandas Premium</div><div style="font-size:.85rem;opacity:.95;margin-top:6px;">Comandas ilimitadas, Caixa, Relatórios e Cardápio digital por <b>' + R(valor) + '/mês</b></div></div>';
        h += '<div style="text-align:center;padding:14px;background:' + cartao[0] + ';border-radius:12px;margin-bottom:14px;"><i class="fas ' + cartao[2] + '" style="color:' + cartao[1] + ';font-size:1.8rem;"></i><div style="font-weight:700;color:' + cartao[1] + ';margin-top:6px;">' + cartao[3] + '</div><div style="font-size:.85rem;color:#555;margin-top:4px;line-height:1.4;">' + cartao[4] + '</div></div>';

        h += '<div style="background:#fff;border-radius:12px;padding:14px;margin-bottom:14px;box-shadow:0 2px 8px rgba(0,0,0,.06);font-size:.88rem;">' +
            '<div style="display:flex;gap:10px;"><div style="flex:1;"><b>Gratuito</b><div style="color:#666;margin-top:4px;line-height:1.6;">✔ PDV e comandas<br>✔ ' + s.limiteComandas + ' comandas/mês<br>✔ Todos os cadastros (produtos, clientes, grupos, mesas, equipe)<br>✘ Caixa<br>✘ Relatórios<br>✘ Cardápio digital</div></div>' +
            '<div style="flex:1;"><b style="color:' + COR + ';">Premium</b><div style="color:#666;margin-top:4px;line-height:1.6;">✔ Tudo do gratuito<br>✔ Comandas ilimitadas<br>✔ Caixa completo<br>✔ Relatórios<br>✔ Cardápio digital<br>✔ Suporte</div></div></div></div>';

        h += '<div style="background:#fff;border-radius:12px;padding:14px;margin-bottom:14px;box-shadow:0 2px 8px rgba(0,0,0,.06);">' +
            '<div style="font-size:.78rem;color:#777;">ID DESTE EQUIPAMENTO (informe ao assinar)</div>' +
            '<div style="display:flex;align-items:center;gap:10px;margin-top:6px;"><div style="flex:1;font-family:monospace;font-size:1.4rem;font-weight:700;letter-spacing:2px;color:#333;">' + esc(s.instalacaoId) + '</div>' +
            '<button class="btn-outline" style="padding:8px 12px;" onclick="licencaCopiar(\'' + esc(s.instalacaoId) + '\')"><i class="far fa-copy"></i></button></div>' +
            '<div style="font-size:.74rem;color:#777;margin-top:8px;line-height:1.35;"><i class="fas fa-link"></i> A licença fica <b>vinculada a este equipamento</b> (1 licença = 1 equipamento servidor). Celulares e tablets conectados a ele como <b>cliente</b> usam a mesma licença, sem limite de aparelhos.</div></div>';

        h += '<div style="background:#fff;border-radius:12px;padding:14px;margin-bottom:14px;box-shadow:0 2px 8px rgba(0,0,0,.06);">' +
            '<div style="font-weight:700;margin-bottom:8px;">Como ' + (s.estado === 'ativa' ? 'renovar' : 'assinar') + '</div>' +
            '<div style="font-size:.88rem;color:#444;line-height:1.5;"><b>1.</b> Pague ' + R(valor) + ' por Pix.<br><b>2.</b> Toque em <b>Solicitar licença</b> e envie o pedido e o comprovante pelo WhatsApp.<br><b>3.</b> Você recebe um arquivo <b>.lic</b>: toque em <b>Aplicar licença</b>.</div>' +
            '<button class="btn-primary" style="margin-top:10px;" onclick="licencaPix()"><i class="fas fa-qrcode"></i> Pagar com Pix (' + R(valor) + ')</button>' +
            '<button class="btn-outline" style="margin-top:8px;width:100%;" onclick="licencaSolicitar()"><i class="fas fa-paper-plane"></i> Solicitar licença (enviar pedido)</button>' +
            '<input type="file" id="lic-arquivo" accept="*/*" style="display:none;" onchange="licencaLerArquivo(this)">' +
            '<button class="btn-primary" style="margin-top:14px;background:#2e7d32;" onclick="document.getElementById(\'lic-arquivo\').click()"><i class="fas fa-file-circle-check"></i> Aplicar licença (arquivo .lic)</button>' +
            '<div style="font-size:.74rem;color:#777;margin-top:6px;">Recebeu o arquivo <b>.lic</b> pelo WhatsApp ou e-mail? Toque nele e escolha Comandas, ou use o botão acima. Sem digitar nada.</div>' +
            '<details style="margin-top:10px;"><summary style="font-size:.78rem;color:#777;cursor:pointer;">Colar o código manualmente</summary>' +
            '<textarea id="lic-codigo" rows="3" placeholder="CMD1.…" style="width:100%;box-sizing:border-box;margin-top:6px;padding:10px;border:2px solid #ddd;border-radius:10px;font-family:monospace;font-size:.8rem;"></textarea>' +
            '<button class="btn-outline" style="margin-top:6px;width:100%;" onclick="licencaAtivar()"><i class="fas fa-key"></i> Ativar com o código colado</button></details></div>';
        box.innerHTML = h;
        iniciarContador();
    }

    let timerContador = null;
    function iniciarContador() {
        if (timerContador) clearInterval(timerContador);
        const el = document.getElementById('lic-contador'); if (!el) return;
        const p = String(el.dataset.fim).split('-');
        const car = Number(el.dataset.carencia || 0);
        const fim = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]) + car, 23, 59, 59).getTime();   // fim do dia (horário local)
        const z = function (n) { return String(n).padStart(2, '0'); };
        const tick = function () {
            const e = document.getElementById('lic-contador');
            if (!e) { clearInterval(timerContador); return; }
            const ms = Math.max(0, fim - Date.now()); const seg = Math.floor(ms / 1000);
            e.textContent = Math.floor(seg / 86400) + 'd ' + z(Math.floor(seg % 86400 / 3600)) + ':' + z(Math.floor(seg % 3600 / 60)) + ':' + z(seg % 60);
            if (ms === 0) { clearInterval(timerContador); window.licencaCarregar().then(carregarTelaAssinatura); }
        };
        tick(); timerContador = setInterval(tick, 1000);
    }

    // Aplica o conteúdo de um .lic (ou o código puro): o servidor confere a assinatura e o equipamento
    window.licencaAplicarTexto = async function (texto) {
        try {
            const caminho = window.MT ? window.MT.apiPath('licenca/ativar') : '/api/licenca/ativar';
            const op = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo: String(texto || '') }) };
            const res = window.CX ? await window.CX.fetch(caminho, op) : await fetch(caminho, op);
            const j = await res.json().catch(function () { return {}; });
            if (j.status) window.LICENCA.status = j.status;
            await window.avisar(j.msg || j.error || 'Não foi possível aplicar a licença.');
            if (j.ok) { if (document.getElementById('assinatura-conteudo')) carregarTelaAssinatura(); else window.navigateTo('assinatura'); }
            return !!j.ok;
        } catch (e) { await window.avisar('Erro ao aplicar a licença: ' + e.message); return false; }
    };

    window.licencaLerArquivo = function (inp) {
        const f = inp.files && inp.files[0]; inp.value = '';
        if (!f) return;
        if (f.size > 65536) { window.avisar('Este arquivo não parece uma licença do Comandas.'); return; }
        const r = new FileReader();
        r.onload = function () {
            const t = String(r.result || '');
            if (t.indexOf('CMD1.') < 0) { window.avisar('Este arquivo não é uma licença do Comandas (.lic).'); return; }
            window.licencaAplicarTexto(t);
        };
        r.onerror = function () { window.avisar('Não foi possível ler o arquivo.'); };
        r.readAsText(f);
    };

    window.licencaCopiar = function (t) {
        try { navigator.clipboard.writeText(t); if (window.mostrarToast) window.mostrarToast('📋 Copiado'); } catch (e) {}
    };

    window.licencaAtivar = async function () {
        const cod = (document.getElementById('lic-codigo').value || '').trim();
        if (!cod) { await window.avisar('Cole o código de ativação.'); return; }
        window.licencaAplicarTexto(cod);
    };

    // Pedido de licença: arquivo .pedido (equipamento + estabelecimento) que o dono importa no app "Comandas Licenças"
    window.licencaSolicitar = async function () {
        const s = window.LICENCA.status || {};
        let cfg = {}; try { cfg = window.normalizarArray(await window.apiGet('configuracoes'))[0] || {}; } catch (e) {}
        const dados = { app: 'Comandas', tipo: 'pedido-licenca', estabelecimento: cfg.nomeImpressao || s.cliente || '', telefone: cfg.telefone || cfg.whatsapp || '',
            equipamento: s.instalacaoId || '', valor: await valorAssinatura(), pedido_em: new Date().toISOString() };
        const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(dados)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const conteudo = JSON.stringify(Object.assign({}, dados, { codigo: 'CMDP1.' + b64 }), null, 1);
        const nome = 'pedido-' + String(dados.equipamento).replace(/-/g, '') + '.pedido';
        const texto = 'Olá! Quero assinar o Comandas.\nEstabelecimento: ' + (dados.estabelecimento || '—') + '\nID do equipamento: ' + dados.equipamento + '\nPedido: CMDP1.' + b64;
        if (window.AndroidApp && window.AndroidApp.compartilharArquivo) {
            window.AndroidApp.compartilharArquivo(nome, 'application/octet-stream', btoa(unescape(encodeURIComponent(conteudo))));
        } else {
            const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([conteudo], { type: 'application/octet-stream' })); a.download = nome;
            document.body.appendChild(a); a.click(); a.remove();
            if (window.LICENCA_WHATSAPP && window.LICENCA_WHATSAPP !== '5511999999999') window.open('https://wa.me/' + window.LICENCA_WHATSAPP + '?text=' + encodeURIComponent(texto), '_blank');
        }
    };
    window.licencaEnviarComprovante = window.licencaSolicitar;

    window.licencaPix = async function () {
        let chave = typeof CHAVE_PIX_PADRAO !== 'undefined' ? CHAVE_PIX_PADRAO : '';
        try { const c = window.normalizarArray(await window.apiGet('configuracoes'))[0] || {}; if (c.pixAssinatura && String(c.pixAssinatura).trim()) chave = String(c.pixAssinatura).trim(); } catch (e) {}
        const valor = await valorAssinatura();
        if (!chave || !window.gerarPixComValor) { await window.avisar('Pix da assinatura não configurado.'); return; }
        const pix = window.gerarPixComValor(chave, valor);
        const old = document.getElementById('modal-licenca-pix'); if (old) old.remove();
        const m = document.createElement('div');
        m.id = 'modal-licenca-pix';
        m.style.cssText = 'display:flex;align-items:center;justify-content:center;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:300000;padding:16px;';
        m.innerHTML = '<div style="background:#fff;border-radius:16px;max-width:360px;width:100%;overflow:hidden;text-align:center;">' +
            '<div style="background:' + COR + ';color:#fff;padding:14px;font-weight:700;"><i class="fas fa-qrcode"></i> Pagamento Pix — ' + R(valor) + '</div>' +
            '<div style="padding:16px;"><img src="' + window.qrUrl(pix, '300x300') + '" alt="QR Pix" style="width:220px;height:220px;border:2px dashed ' + COR + ';border-radius:12px;padding:8px;">' +
            '<div style="font-size:.75rem;color:#777;margin:10px 0 4px;">Pix copia e cola</div><div style="font-size:.7rem;word-break:break-all;max-height:56px;overflow:hidden;color:#333;">' + esc(pix) + '</div>' +
            '<button class="btn-outline" style="margin-top:10px;width:100%;" id="lic-copiar-pix"><i class="far fa-copy"></i> Copiar código Pix</button>' +
            '<div style="font-size:.78rem;color:#777;margin-top:10px;">Depois de pagar, toque em <b>Solicitar licença</b>, envie o pedido e aguarde o arquivo .lic.</div>' +
            '<button class="btn-primary" style="margin-top:10px;width:100%;" id="lic-fechar-pix">Fechar</button></div></div>';
        document.body.appendChild(m);
        m.querySelector('#lic-copiar-pix').onclick = function () { window.licencaCopiar(pix); };
        m.querySelector('#lic-fechar-pix').onclick = function () { m.remove(); };
    };

    // Carrega o status ao iniciar e depois a cada 10 min / ao voltar para o app
    window.licencaCarregar().then(function () {
        const rota = (location.hash || '').slice(1);
        const g = window.licencaBloqueia(rota);
        if (g) { window.navigateTo('pdv'); window.licencaMostrarBloqueio(g); }
    });
    setInterval(window.licencaCarregar, 600000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) window.licencaCarregar(); });
})();
