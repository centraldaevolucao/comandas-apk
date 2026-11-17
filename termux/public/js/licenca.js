/* Assinatura / licença — telas e bloqueios do plano gratuito.
   O status vem do servidor (GET /api/licenca); a verificação do código é feita lá (assinatura digital).
   Plano gratuito (ou assinatura vencida): até 30 comandas por dia e SEM Caixa (histórico/fechamento) e Relatórios. O Cardápio digital por QR é bônus para todos. */
(function () {
    'use strict';
    const COR = '#C2185B';
    // Número do WhatsApp que recebe o comprovante (com 55 + DDD). Troque pelo SEU número.
    const EDICOES = {
        essencial: { nome: 'Essencial', rank: 1, lema: 'Para vender e fechar o dia sem dor de cabeça.', inclui: ['PDV e comandas ilimitadas', 'Caixa e fechamento', 'Clientes e fiado', 'Impressão e Pix QR', 'Relatórios', 'Estoque e movimentações', 'Cardápio digital por QR (bônus)'] },
        gestao: { nome: 'Gestão', rank: 2, lema: 'Para saber quanto você realmente lucra.', inclui: ['Compras e fornecedores', 'Ficha técnica e precificação', 'Financeiro: DRE, fluxo de caixa, contas a pagar e a receber', 'Metas e dicas de margem', 'Pacote para o contador'], base: 'Tudo do Essencial, mais:' },
        completo: { nome: 'Completo', rank: 3, lema: 'Para crescer, com vários canais e lojas.', inclui: ['Delivery pelo cardápio digital', 'Nuvem, várias lojas e backup', 'Usuários e permissões', 'NFC-e por emissor parceiro', 'Integrações'], base: 'Tudo do Gestão, mais:', nota: 'Os módulos do Completo são liberados conforme ficam prontos, sem custo extra durante a assinatura.' }
    };
    // Tabela de preços (mesma regra para as três edições: ~10% no trimestral, ~16% no semestral e ~23% no anual, terminando em ,90)
    const PRECOS = { essencial: { 1: 25.90, 3: 69.90, 6: 129.90, 12: 238.90 }, gestao: { 1: 35.90, 3: 96.90, 6: 179.90, 12: 330.90 }, completo: { 1: 45.90, 3: 123.90, 6: 229.90, 12: 423.90 } };
    const PERIODOS = [
        { sufixo: 'mensal', nome: 'Mensal', meses: 1, selo: '', txt: 'Flexibilidade total. Renove quando quiser.' },
        { sufixo: 'trimestral', nome: 'Trimestral', meses: 3, selo: '⭐ Mais popular', txt: 'O equilíbrio ideal entre economia e flexibilidade.' },
        { sufixo: 'semestral', nome: 'Semestral', meses: 6, selo: '', txt: 'Compromisso médio, economia real.' },
        { sufixo: 'anual', nome: 'Anual', meses: 12, selo: '🏆 Melhor preço', txt: 'O melhor custo-benefício do ano.' }
    ];
    // Rotas por edição (a licença assinada libera; edição menor esconde as telas, os dados continuam salvos)
    const ROTAS_EDICAO = { gestao: ['compras', 'fornecedores', 'precificacao', 'financeiro'] };

    const GRUPOS = {
        cardapio: { nome: 'Cardápio digital (QR Code)', rotas: ['cardapio-dia', 'qrcodes'] }    };
    const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    const dataBR = function (iso) { if (!iso) return '—'; const p = String(iso).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso; };

    window.LICENCA = window.LICENCA || { status: null };

    window.licencaCarregar = async function () {
        try {
            const r = await window.apiGet('licenca');
            if (r && typeof r === 'object' && 'limitado' in r) { window.LICENCA.status = r; aplicarMenu(); }
        } catch (e) { /* sem resposta: mantém o último status conhecido */ }
        return window.LICENCA.status;
    };

    window.licencaLimitado = function () { const s = window.LICENCA.status; return !!(s && s.limitado); };
    /** Edição em vigor: 'gratis' | 'essencial' | 'gestao' | 'completo'. */
    window.licencaEdicao = function () { const s = window.LICENCA.status; return !s || s.limitado ? 'gratis' : (s.edicao || 'essencial'); };
    window.licencaTemEdicao = function (ed) { const e = EDICOES[window.licencaEdicao()]; return !!e && e.rank >= EDICOES[ed].rank; };

    /** Grupo/edição bloqueado para esta rota (ou null). */
    window.licencaBloqueia = function (rota) {
        const s = window.LICENCA.status; if (!s) return null;
        const ed = Object.keys(ROTAS_EDICAO).find(function (e) { return ROTAS_EDICAO[e].indexOf(rota) >= 0; });
        if (ed && !window.licencaTemEdicao(ed)) return 'ed:' + ed;
        const k = Object.keys(GRUPOS).find(function (g) { return GRUPOS[g].rotas.indexOf(rota) >= 0; });
        if (!k) return null;
        if (k === 'cardapio' && !s.cardapio) return 'cardapio';     // cardápio QR: bônus de todos (inclusive grátis); só falta se a licença o removeu
        return null;
    };

    // Esconde no menu as telas das edições que a licença não inclui
    function aplicarMenu() {
        document.querySelectorAll('.menu-item[onclick]').forEach(function (el) {
            const m = /navigateTo\('([^']+)'\)/.exec(el.getAttribute('onclick') || ''); if (!m) return;
            const ed = Object.keys(ROTAS_EDICAO).find(function (e) { return ROTAS_EDICAO[e].indexOf(m[1]) >= 0; });
            if (!ed) return;
            const ocultar = !window.licencaTemEdicao(ed);
            if (ocultar !== (el.style.display === 'none')) el.style.display = ocultar ? 'none' : '';
        });
        document.querySelectorAll('.menu-subgroup').forEach(function (g) {
            const vazio = !Array.prototype.some.call(g.querySelectorAll('.menu-item'), function (i) { return i.style.display !== 'none'; });
            if (vazio !== (g.style.display === 'none')) g.style.display = vazio ? 'none' : '';
        });
    }
    window.licencaAplicarMenu = aplicarMenu;
    let timerMenu = null;
    new MutationObserver(function () { clearTimeout(timerMenu); timerMenu = setTimeout(aplicarMenu, 60); }).observe(document.documentElement, { childList: true, subtree: true });

    // ---------- modal "recurso de assinante" ----------
    function modalUpsell(titulo, corpo) {
        const old = document.getElementById('modal-licenca'); if (old) old.remove();
        const m = document.createElement('div');
        m.id = 'modal-licenca';
        m.style.cssText = 'display:flex;align-items:center;justify-content:center;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:300000;padding:16px;';
        m.innerHTML = '<div style="background:#fff;border-radius:16px;max-width:380px;width:100%;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.35);">' +
            '<div style="background:linear-gradient(135deg,' + COR + ',#880E4F);color:#fff;padding:18px 16px;text-align:center;"><i class="fas fa-crown" style="font-size:2rem;color:#ffd54f;"></i><div style="font-weight:700;margin-top:8px;font-size:1.05rem;">' + titulo + '</div></div>' +
            '<div style="padding:16px;color:#333;line-height:1.45;">' + corpo + '</div>' +
            '<div style="display:flex;gap:10px;padding:0 16px 16px;"><button class="btn-outline" style="flex:1;" data-n>Agora não</button><button class="btn-primary" style="flex:1;" data-s><i class="fas fa-crown"></i> Ver planos</button></div></div>';
        document.body.appendChild(m);
        m.querySelector('[data-n]').onclick = function () { m.remove(); };
        m.querySelector('[data-s]').onclick = function () { m.remove(); window.navigateTo('assinatura'); };
    }

    window.licencaMostrarBloqueio = function (grupo) {
        if (String(grupo).indexOf('ed:') === 0) {
            const ed = String(grupo).slice(3), e = EDICOES[ed];
            window.LICENCA.aba = ed;
            modalUpsell('Disponível na edição ' + e.nome, 'Este recurso faz parte da edição <b>' + e.nome + '</b>.<br><span style="font-size:.85rem;color:#777;">Você pode trocar de edição quando quiser: seus dados continuam todos salvos.</span>');
            return;
        }
        const g = GRUPOS[grupo] || { nome: 'Este recurso' };
        modalUpsell('Recurso para assinantes', '<b>' + esc(g.nome) + '</b> está disponível com a assinatura (bônus nas edições Essencial e Gestão; incluído no Completo).<br><span style="font-size:.85rem;color:#777;">O plano gratuito tem tudo do Essencial, com até ' + ((window.LICENCA.status || {}).limiteComandas || 30) + ' comandas por dia.</span>');
    };

    /** Chamar antes de criar uma comanda. false = limite do plano gratuito atingido (mostra a oferta). */
    window.licencaPodeCriarComanda = async function () {
        const s = await window.licencaCarregar();
        if (!s || !s.limitado) return true;
        if (s.comandasDia >= s.limiteComandas) {
            modalUpsell('Limite do plano gratuito', 'Você já criou <b>' + s.comandasDia + ' de ' + s.limiteComandas + ' comandas</b> hoje.<br>Assine para criar comandas sem limite (ou teste 30 dias a edição Gestão ou Completo, na tela Assinatura).');
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
        if (s.estado === 'testeapp') { return '<div onclick="navigateTo(\'assinatura\')" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:#e3f2fd;color:#1565c0;border-radius:20px;padding:4px 12px;margin-bottom:8px;font-size:.72rem;font-weight:600;"><i class="fas fa-flask"></i> Teste da edição ' + EDICOES[s.edicao].nome + ': ' + s.diasRestantes + ' dia(s)</div>'; }
        if (s.estado === 'gratis' || s.estado === 'vencida') {
            txt = (s.estado === 'vencida' ? 'Assinatura vencida em ' + dataBR(s.validade) + ' · ' : 'Plano gratuito · ') + s.comandasDia + '/' + s.limiteComandas + ' comandas hoje';
            if (s.comandasDia >= s.limiteComandas) { cor = '#c62828'; bg = '#ffebee'; }
        } else if (s.estado === 'carencia') { txt = 'Assinatura vencida — acesso liberado por mais ' + Math.max(0, (s.carenciaDias || 0) + s.diasRestantes + 1) + ' dia(s). Renove!'; cor = '#c62828'; bg = '#ffebee'; }
        else if (s.aviso) { txt = (s.teste ? 'Sua licença de teste termina em ' : 'Sua assinatura vence em ') + s.diasRestantes + ' dia(s) (' + dataBR(s.validade) + ')'; }
        else return '<div onclick="navigateTo(\'assinatura\')" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:#e8f5e9;color:#2e7d32;border-radius:20px;padding:4px 12px;margin-bottom:8px;font-size:.72rem;font-weight:600;"><i class="fas fa-crown"></i> ' + (s.teste ? 'Licença de teste' : 'Edição ' + (EDICOES[s.edicao] || EDICOES.essencial).nome) + ' · ' + s.diasRestantes + ' dia(s)</div>';
        return '<div onclick="navigateTo(\'assinatura\')" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:8px;background:' + bg + ';color:' + cor + ';border-radius:10px;padding:8px 12px;margin-bottom:10px;font-size:.8rem;font-weight:600;"><span><i class="fas fa-crown"></i> ' + txt + '</span><span style="text-decoration:underline;white-space:nowrap;">' + (s.limitado ? 'Assinar' : 'Renovar') + '</span></div>';
    };

    window.licencaGarantirCaixaAberto = async function () { return false; };   // o plano gratuito agora tem Caixa como o Essencial: abre-se normalmente

    // ---------- tela Assinatura ----------
    const R = function (v) { return 'R$ ' + (Math.round(Number(v) * 100 + 1e-6) / 100).toFixed(2).replace('.', ','); };
    // Catálogo de planos da edição: id = o mesmo do app Licenças (essencial: mensal…; demais: gestao-mensal…)
    function planosCat(ed) {
        const tab = PRECOS[ed] || PRECOS.essencial, m = tab[1];
        return PERIODOS.map(function (per) {
            const p = { id: ed === 'essencial' ? per.sufixo : ed + '-' + per.sufixo, edicao: ed, nome: per.nome, meses: per.meses, preco: tab[per.meses], selo: per.selo, txt: per.txt };
            const cheio = m * p.meses;
            p.mes = p.preco / p.meses; p.eco = Math.max(0, cheio - p.preco); p.desc = cheio > 0 ? Math.round(p.eco / cheio * 100) : 0;
            return p;
        });
    }
    window.licencaPlanos = planosCat;
    async function planoPorId(id) {
        const todos = [].concat(planosCat('essencial'), planosCat('gestao'), planosCat('completo'));
        return todos.find(function (p) { return p.id === id; }) || todos[0];
    }

    window.renderAssinatura = function () {
        setTimeout(carregarTelaAssinatura, 30);
        return '<div class="app-bar"><button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button><h1>Assinatura</h1><div style="width:40px;"></div></div>' +
            '<div class="content-area" id="assinatura-conteudo" style="padding:12px;"><p class="empty-state">Carregando...</p></div>';
    };

    window.licencaAba = function (ed) { window.LICENCA.aba = ed; carregarTelaAssinatura(); };

    async function carregarTelaAssinatura() {
        const box = document.getElementById('assinatura-conteudo'); if (!box) return;
        const s = await window.licencaCarregar();
        if (!s) { box.innerHTML = '<p class="empty-state" style="color:#c62828;">Não foi possível ler a assinatura. Verifique a conexão com o servidor.</p>'; return; }
        const edAtual = s.limitado ? null : (s.edicao || 'essencial');
        const aba = EDICOES[window.LICENCA.aba] ? window.LICENCA.aba : (edAtual || 'essencial');
        const E = EDICOES[aba], planos = planosCat(aba);
        const nomeEd = edAtual ? EDICOES[edAtual].nome : '';
        const bonus = edAtual && edAtual !== 'completo' && s.cardapio ? ' + Cardápio QR (bônus)' : '';
        let cartao;
        if (s.estado === 'ativa') cartao = ['#e8f5e9', '#2e7d32', s.teste ? 'fa-flask' : 'fa-check-circle', s.teste ? 'Licença de TESTE — edição ' + nomeEd : 'Edição ' + nomeEd + ' ativa', 'Válida até <b>' + dataBR(s.validade) + '</b>' + (s.teste ? '' : '<br>Inclui: ' + nomeEd + bonus) + (s.cliente ? '<br>Cliente: ' + esc(s.cliente) : '') + '<div id="lic-contador" data-fim="' + esc(s.validade) + '" style="margin-top:10px;font-size:1.5rem;font-weight:700;font-family:monospace;color:#2e7d32;"></div><div style="font-size:.72rem;color:#777;">tempo restante (dias · hh:mm:ss)</div>'];
        else if (s.estado === 'carencia') cartao = ['#fff3e0', '#e65100', 'fa-triangle-exclamation', 'Assinatura vencida', 'Venceu em <b>' + dataBR(s.validade) + '</b>. Tudo segue liberado por poucos dias — renove para não perder o acesso.<div id="lic-contador" data-fim="' + esc(s.validade) + '" data-carencia="' + (s.carenciaDias || 0) + '" style="margin-top:10px;font-size:1.3rem;font-weight:700;font-family:monospace;color:#e65100;"></div><div style="font-size:.72rem;color:#777;">tempo até o bloqueio</div>'];
        else if (s.estado === 'vencida' && !s.cancelada) cartao = ['#ffebee', '#c62828', 'fa-lock', 'Assinatura vencida', 'Venceu em <b>' + dataBR(s.validade) + '</b>. Você está no plano gratuito.'];
        else if (s.estado === 'testeapp') cartao = ['#e3f2fd', '#1565c0', 'fa-flask', 'Teste gratuito da edição ' + EDICOES[s.edicao].nome, 'Vai até <b>' + dataBR(s.validade) + '</b>. Depois volta ao plano gratuito (ou à sua licença).<div id="lic-contador" data-fim="' + esc(s.validade) + '" style="margin-top:10px;font-size:1.5rem;font-weight:700;font-family:monospace;color:#1565c0;"></div><div style="font-size:.72rem;color:#777;">tempo restante (dias · hh:mm:ss)</div>'];
        else cartao = ['#f3f3f3', '#555', 'fa-gift', 'Plano gratuito', 'Comandas hoje: <b>' + s.comandasDia + ' de ' + s.limiteComandas + '</b><br>Tudo do Essencial, com limite de ' + s.limiteComandas + ' comandas por dia. Cardápio digital por QR incluso como bônus.'];
        if (s.cancelada && s.estado === 'vencida') cartao = ['#ffebee', '#c62828', 'fa-rotate-left', 'Assinatura cancelada (reembolso)', 'Você voltou ao plano gratuito. Pode assinar de novo quando quiser.'];
        const ta = s.testeApp || {};
        if (s.testeAppAtivo && s.estado !== 'testeapp') cartao[4] += '<br><b>Teste da edição ' + EDICOES[s.edicao].nome + '</b> até ' + dataBR(ta.fim);
        else if (ta.usado && !ta.ativo) cartao[4] += '<br><span style="font-size:.78rem;color:#777;">Seu teste gratuito (' + (EDICOES[ta.edicao] || {}).nome + ') terminou em ' + dataBR(ta.fim) + '.</span>';
        const anual = planosCat('essencial')[3];
        let h = '<div style="padding:20px 16px;background:linear-gradient(135deg,' + COR + ',#880E4F);color:#fff;border-radius:12px;margin-bottom:14px;text-align:center;"><i class="fas fa-crown" style="font-size:2.2rem;color:#ffd54f;"></i>' +
            '<div style="font-size:1.25rem;font-weight:700;margin-top:8px;">Comandas — escolha sua edição</div><div style="font-size:.85rem;opacity:.95;margin-top:6px;">Um app só: você troca de edição quando quiser e seus dados continuam salvos. A partir de <b>' + R(anual.mes) + '/mês</b> no plano anual.</div></div>';
        h += '<div style="text-align:center;padding:14px;background:' + cartao[0] + ';border-radius:12px;margin-bottom:14px;"><i class="fas ' + cartao[2] + '" style="color:' + cartao[1] + ';font-size:1.8rem;"></i><div style="font-weight:700;color:' + cartao[1] + ';margin-top:6px;">' + cartao[3] + '</div><div style="font-size:.85rem;color:#555;margin-top:4px;line-height:1.4;">' + cartao[4] + '</div></div>';

        // abas por edição
        h += '<div style="display:flex;background:#fff;border-radius:12px 12px 0 0;border-bottom:1px solid #eadae0;overflow:hidden;">' +
            Object.keys(EDICOES).map(function (k) {
                const on = k === aba, aqui = k === edAtual;
                return '<button type="button" onclick="licencaAba(\'' + k + '\')" style="flex:1;border:0;background:#fff;padding:12px 2px;font-size:.9rem;font-weight:' + (on ? 800 : 600) + ';color:' + (on ? '#A5144B' : '#6B5A62') + ';border-bottom:3px solid ' + (on ? '#A5144B' : 'transparent') + ';cursor:pointer;">' + EDICOES[k].nome + (aqui ? '<div style="font-size:.62rem;font-weight:700;color:#2e7d32;">seu plano</div>' : '') + '</button>';
            }).join('') + '</div>';
        h += '<div style="background:#fff;border-radius:0 0 12px 12px;padding:14px;margin-bottom:14px;box-shadow:0 2px 8px rgba(0,0,0,.06);font-size:.88rem;">' +
            '<div style="font-weight:700;">' + E.lema + '</div>' +
            (E.base ? '<div style="color:#777;margin-top:6px;">' + E.base + '</div>' : '<div style="color:#777;margin-top:6px;">Tudo o que o app já faz hoje:</div>') +
            '<div style="color:#444;margin-top:4px;line-height:1.6;">' + E.inclui.map(function (t) { return '✔ ' + t; }).join('<br>') + '</div>' +
            (aba === 'essencial' || aba === 'gestao' ? '<div style="margin-top:8px;"><span style="background:#1B6B3A;color:#fff;font-size:.68rem;font-weight:700;padding:2px 8px;border-radius:99px;">BÔNUS</span> Cardápio digital por QR</div>' : '') +
            (E.nota ? '<div style="font-size:.76rem;color:#777;margin-top:8px;">' + E.nota + '</div>' : '') + '</div>';

        const podeTestar = s.podeTestar && aba !== 'essencial' && !(s.teste && !s.testeAppAtivo) && !(edAtual && EDICOES[edAtual].rank >= E.rank);
        if (podeTestar) h += '<div style="background:#e3f2fd;border-radius:12px;padding:12px 14px;margin-bottom:12px;"><div style="font-weight:700;color:#1565c0;">Quer experimentar antes?</div><div style="font-size:.82rem;color:#444;margin:4px 0 8px;">Teste a edição ' + E.nome + ' por 30 dias, sem pagar. Vale uma vez por equipamento; no fim volta ao seu plano.</div><button class="btn-outline" style="width:100%;" onclick="licencaTestar(\'' + aba + '\')"><i class="fas fa-flask"></i> Testar ' + E.nome + ' por 30 dias</button></div>';
        planos.forEach(function (p) {
            const dest = p.meses === 3, ouro = p.meses === 12;
            const borda = dest ? COR : ouro ? '#f9a825' : '#e0e0e0';
            h += '<div style="position:relative;border:2px solid ' + borda + ';' + (dest ? 'box-shadow:0 0 0 3px #f8bbd0;' : '') + 'border-radius:14px;padding:12px;margin-bottom:12px;background:#fff;">' +
                (p.selo ? '<span style="position:absolute;top:-10px;right:12px;background:' + (ouro ? '#f9a825;color:#3e2723' : COR + ';color:#fff') + ';font-size:.7rem;font-weight:700;border-radius:10px;padding:3px 10px;">' + p.selo + '</span>' : '') +
                '<div style="display:flex;justify-content:space-between;align-items:center;"><b>' + p.nome + '</b>' + (p.desc ? '<span style="background:#e8f5e9;color:#2e7d32;font-weight:700;font-size:.72rem;border-radius:8px;padding:2px 7px;">-' + p.desc + '%</span>' : '') + '</div>' +
                '<div style="font-size:1.5rem;font-weight:800;color:#222;">' + R(p.preco) + (p.meses === 1 ? '<small style="font-size:.75rem;color:#777;font-weight:600;">/mês</small>' : '') + '</div>' +
                (p.meses > 1 ? '<div style="font-size:.78rem;color:#777;">equivale a <b' + (ouro ? ' style="color:#2e7d32;"' : '') + '>' + R(p.mes) + '/mês</b></div>' : '') +
                (p.eco > 0.005 ? '<div style="font-size:.8rem;font-weight:700;color:#2e7d32;margin-top:3px;">Economize ' + R(p.eco) + (p.meses === 12 ? '/ano' : '') + '</div>' : '') +
                '<div style="font-size:.78rem;color:#666;margin-top:3px;">' + esc(p.txt) + '</div>' +
                '<button class="' + (dest || ouro ? 'btn-primary' : 'btn-outline') + '" style="margin-top:8px;width:100%;" onclick="licencaAssinar(\'' + p.id + '\')">' + (edAtual === aba ? 'Renovar ' : 'Assinar ') + E.nome + ' ' + p.nome.toLowerCase() + '</button></div>';
        });
        if (edAtual && edAtual !== aba && !s.teste) {
            const sobe = EDICOES[aba].rank > EDICOES[edAtual].rank;
            h += '<div style="font-size:.78rem;color:#6B5A62;line-height:1.5;margin:-2px 4px 12px;">' + (sobe ? 'Vindo do ' + EDICOES[edAtual].nome + ', você paga só a diferença pelo tempo que falta: informe no pedido que é uma troca de edição.' : 'Voltando para o ' + E.nome + ', a mudança vale na próxima renovação e nada é apagado.') + '</div>';
        }
        h += '<div style="background:#fff;border-radius:12px;padding:12px 14px;margin-bottom:12px;font-size:.8rem;color:#444;line-height:1.5;box-shadow:0 2px 8px rgba(0,0,0,.06);">🛡️ <b>Garantia de reembolso:</b> a licença comprada tem 30 dias de teste. Desistindo nos <b>35 primeiros dias</b> (para dar tempo de ver os relatórios do mês), você recebe o <b>valor integral</b> de volta. O reembolso vale <b>uma única vez</b> por cliente.</div><div style="text-align:center;font-size:.74rem;color:#777;margin:-2px 0 12px;">🔒 Pagamento seguro por Pix • Sem cobrança automática</div>';

        h += '<div style="background:#fff;border-radius:12px;padding:14px;margin-bottom:14px;box-shadow:0 2px 8px rgba(0,0,0,.06);">' +
            '<div style="font-size:.78rem;color:#777;">ID DESTE EQUIPAMENTO (informe ao assinar)</div>' +
            '<div style="display:flex;align-items:center;gap:10px;margin-top:6px;"><div style="flex:1;font-family:monospace;font-size:1.4rem;font-weight:700;letter-spacing:2px;color:#333;">' + esc(s.instalacaoId) + '</div>' +
            '<button class="btn-outline" style="padding:8px 12px;" onclick="licencaCopiar(\'' + esc(s.instalacaoId) + '\')"><i class="far fa-copy"></i></button></div>' +
            '<div style="font-size:.74rem;color:#777;margin-top:8px;line-height:1.35;"><i class="fas fa-link"></i> A licença fica <b>vinculada a este equipamento</b> (1 licença = 1 equipamento servidor). Celulares e tablets conectados a ele como <b>cliente</b> usam a mesma licença, sem limite de aparelhos.</div></div>';

        h += '<div style="background:#fff;border-radius:12px;padding:14px;margin-bottom:14px;box-shadow:0 2px 8px rgba(0,0,0,.06);">' +
            '<div style="font-weight:700;margin-bottom:8px;">Como ' + (s.estado === 'ativa' ? 'renovar ou trocar de edição' : 'assinar') + '</div>' +
            '<div style="font-size:.88rem;color:#444;line-height:1.5;"><b>1.</b> Escolha a edição e o plano acima e pague por Pix.<br><b>2.</b> Toque em <b>Solicitar licença</b> e envie o pedido e o comprovante pelo WhatsApp.<br><b>3.</b> Você recebe um arquivo <b>.rlic</b>: toque em <b>Aplicar licença</b>.</div>' +
            '<button class="btn-outline" style="margin-top:10px;width:100%;" onclick="licencaSolicitar(\'' + planos[0].id + '\')"><i class="fas fa-paper-plane"></i> Solicitar licença (enviar pedido)</button>' +
            '<input type="file" id="lic-arquivo" accept=".rlic" style="display:none;" onchange="licencaLerArquivo(this)">' +
            '<button class="btn-primary" style="margin-top:14px;background:#2e7d32;" onclick="document.getElementById(\'lic-arquivo\').click()"><i class="fas fa-file-circle-check"></i> Aplicar licença (arquivo .rlic)</button>' +
            '<div style="font-size:.74rem;color:#777;margin-top:6px;">Recebeu o arquivo <b>Assinatura.rlic</b> pelo WhatsApp ou e-mail? Toque nele e escolha Comandas, ou use o botão acima e escolha o arquivo <b>.rlic</b>. Sem digitar nada.</div>' +
            '<details style="margin-top:10px;"><summary style="font-size:.78rem;color:#777;cursor:pointer;">Colar o código manualmente</summary>' +
            '<textarea id="lic-codigo" rows="3" placeholder="CMD1.…" style="width:100%;box-sizing:border-box;margin-top:6px;padding:10px;border:2px solid #ddd;border-radius:10px;font-family:monospace;font-size:.8rem;"></textarea>' +
            '<button class="btn-outline" style="margin-top:6px;width:100%;" onclick="licencaAtivar()"><i class="fas fa-key"></i> Ativar com o código colado</button></details></div>';
        h += window.rodapeVersaoHtml ? window.rodapeVersaoHtml('padding:6px 0 16px;') : '';
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

    // Teste gratuito de 30 dias da edição Gestão ou Completo (uma vez por equipamento; o servidor registra quando, qual edição e quem pediu)
    window.licencaTestar = async function (ed) {
        const e = EDICOES[ed]; if (!e) return;
        const ok = await window.confirmar('Iniciar o teste gratuito de 30 dias da edição ' + e.nome + '?\n\nO teste só pode ser usado uma vez neste equipamento. Ao terminar, o app volta ao plano gratuito (ou à sua licença) e os dados continuam salvos.');
        if (!ok) return;
        try {
            const caminho = window.MT ? window.MT.apiPath('licenca/teste') : '/api/licenca/teste';
            const op = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ edicao: ed }) };
            const res = window.CX ? await window.CX.fetch(caminho, op) : await fetch(caminho, op);
            const j = await res.json().catch(function () { return {}; });
            if (j.status) { window.LICENCA.status = j.status; aplicarMenu(); }
            await window.avisar(j.msg || j.error || 'Não foi possível iniciar o teste.');
            if (j.ok) { window.LICENCA.aba = ed; carregarTelaAssinatura(); }
        } catch (err) { await window.avisar('Erro ao iniciar o teste: ' + err.message); }
    };

    window.licencaLerArquivo = function (inp) {
        const f = inp.files && inp.files[0]; inp.value = '';
        if (!f) return;
        if (!/\.(rlic|lic|txt)$/i.test(f.name || '')) { window.avisar('Escolha o arquivo de licença (Assinatura.rlic, extensão .rlic).'); return; }
        if (f.size > 65536) { window.avisar('Este arquivo não parece uma licença do Comandas.'); return; }
        const r = new FileReader();
        r.onload = function () {
            const t = String(r.result || '');
            if (t.indexOf('CMD1.') < 0) { window.avisar('Este arquivo não é uma licença do Comandas (.rlic).'); return; }
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

    // Pedido de licença: arquivo .pedido (equipamento + estabelecimento) que o dono importa no app "Licenca-app"
    window.licencaSolicitar = async function (planoId) {
        if (typeof planoId !== 'string') planoId = 'mensal';
        const plano = await planoPorId(planoId);
        const s = window.LICENCA.status || {};
        let cfg = {}; try { cfg = window.normalizarArray(await window.apiGet('configuracoes'))[0] || {}; } catch (e) {}
        const dados = { app: 'Comandas', tipo: 'pedido-licenca', estabelecimento: cfg.nomeImpressao || s.cliente || '', telefone: cfg.telefone || cfg.whatsapp || '',
            equipamento: s.instalacaoId || '', plano: plano.id, edicao: plano.edicao, meses: plano.meses, valor: plano.preco, pedido_em: new Date().toISOString() };
        const troca = (!s.limitado && !s.teste && s.edicao && s.edicao !== plano.edicao) ? s.edicao : '';
        if (troca) dados.trocaDe = troca;
        const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(dados)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const conteudo = JSON.stringify(Object.assign({}, dados, { codigo: 'CMDP1.' + b64 }), null, 1);
        const nome = 'pedido-' + String(dados.equipamento).replace(/-/g, '') + '.pedido';
        const texto = 'Olá, Central da Evolução! Quero assinar o Comandas.\nEstabelecimento: ' + (dados.estabelecimento || '—') + '\nID do equipamento: ' + dados.equipamento +
            '\nEdição: ' + EDICOES[plano.edicao].nome + (troca ? ' (troca de edição; atual: ' + EDICOES[troca].nome + ')' : '') + '\nPlano: ' + plano.nome + ' (' + plano.meses + (plano.meses === 1 ? ' mês' : ' meses') + ')\nValor: ' + R(dados.valor) + '\nPedido: CMDP1.' + b64 + '\n(Vou enviar o comprovante do Pix.)';
        const C = window.CONTATO || {};
        const old = document.getElementById('modal-licenca-pedido'); if (old) old.remove();
        const m = document.createElement('div');
        m.id = 'modal-licenca-pedido';
        m.style.cssText = 'display:flex;align-items:center;justify-content:center;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:300000;padding:16px;';
        m.innerHTML = '<div style="background:#fff;border-radius:16px;max-width:360px;width:100%;overflow:hidden;">' +
            '<div style="background:' + COR + ';color:#fff;padding:14px;font-weight:700;"><i class="fas fa-paper-plane"></i> ' + EDICOES[plano.edicao].nome + ' ' + plano.nome + ' — ' + R(plano.preco) + '</div>' +
            '<div style="padding:16px;font-size:.88rem;color:#444;line-height:1.5;">Enviaremos o pedido da <b>' + esc(dados.estabelecimento || 'sua loja') + '</b> (equipamento <b>' + esc(dados.equipamento) + '</b>) para a <b>' + esc(C.empresa || '') + '</b>. Mande também o comprovante do Pix.' +
            '<button class="btn-primary" id="lp-p" style="margin-top:12px;width:100%;background:#2e7d32;"><i class="fas fa-qrcode"></i> 1. Pagar com Pix (' + R(plano.preco) + ')</button><div style="margin-top:10px;"><b>2.</b> Depois de pagar, envie o pedido:</div>' +
            '<button class="btn-primary" id="lp-w" style="margin-top:12px;width:100%;background:#1b8f4a;"><i class="fab fa-whatsapp"></i> WhatsApp ' + esc(C.whatsappFmt || '') + '</button>' +
            '<button class="btn-primary" id="lp-e" style="margin-top:8px;width:100%;background:#1976d2;"><i class="fas fa-envelope"></i> E-mail ' + esc(C.email || '') + '</button>' +
            '<button class="btn-outline" id="lp-a" style="margin-top:8px;width:100%;"><i class="fas fa-file-export"></i> Compartilhar arquivo .pedido</button>' +
            '<button class="btn-outline" id="lp-c" style="margin-top:8px;width:100%;border-color:#bbb;color:#666;">Cancelar</button></div></div>';
        document.body.appendChild(m);
        m.querySelector('#lp-p').onclick = function () { window.licencaPix(plano.id); };
        m.querySelector('#lp-w').onclick = function () { m.remove(); window.abrirLinkExterno(window.contatoWhatsAppUrl(texto)); };
        m.querySelector('#lp-e').onclick = function () { m.remove(); window.abrirLinkExterno(window.contatoEmailUrl('Pedido de licença Comandas — ' + EDICOES[plano.edicao].nome + ' ' + plano.nome + ' — ' + dados.equipamento, texto)); };
        m.querySelector('#lp-c').onclick = function () { m.remove(); };
        m.querySelector('#lp-a').onclick = function () {
            m.remove();
            if (window.Plataforma.tem('compartilharArquivo')) {
                window.Plataforma.compartilharArquivo(nome, 'application/octet-stream', btoa(unescape(encodeURIComponent(conteudo))));
            } else {
                const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([conteudo], { type: 'application/octet-stream' })); a.download = nome;
                document.body.appendChild(a); a.click(); a.remove();
            }
        };
    };
    window.licencaEnviarComprovante = window.licencaSolicitar;
    window.licencaAssinar = function (id) { window.licencaSolicitar(id); };

    // Pix copia e cola da assinatura (Central da Evolução). O valor (campo 54) e o CRC são refeitos para cada plano.
    const PIX_ASSINATURA = '00020126580014br.gov.bcb.pix013692131427-5aaa-42ba-97c2-733cfa1bf945520400005303986540519.995802BR5924Jhonny Ferreira Albuquer6009Sao Paulo62220518daqr654421878421066304B8FD';
    function crc16(t) {
        let r = 0xFFFF;
        for (let i = 0; i < t.length; i++) { r ^= t.charCodeAt(i) << 8; for (let k = 0; k < 8; k++) r = (r & 0x8000) ? ((r << 1) ^ 0x1021) & 0xFFFF : (r << 1) & 0xFFFF; }
        return r.toString(16).toUpperCase().padStart(4, '0');
    }
    function pixComValorTLV(payload, valor) {
        const itens = []; let i = 0; const p = String(payload).trim();
        while (i + 4 <= p.length) { const id = p.substr(i, 2), n = parseInt(p.substr(i + 2, 2), 10); if (isNaN(n)) return null; itens.push([id, p.substr(i + 4, n)]); i += 4 + n; }
        const v = Number(valor).toFixed(2), out = [];
        let pos = false;
        itens.forEach(function (it) {
            if (it[0] === '63' || it[0] === '54') return;
            if (it[0] === '58' && !pos) { out.push(['54', v]); pos = true; }
            out.push(it);
        });
        if (!pos) out.push(['54', v]);
        const t = out.map(function (it) { return it[0] + String(it[1].length).padStart(2, '0') + it[1]; }).join('') + '6304';
        return t + crc16(t);
    }
    window.licencaPixPayload = function (valor, chave) { return pixComValorTLV(chave || PIX_ASSINATURA, valor); };
    window.licencaPix = async function (planoId) {
        const plano = await planoPorId(typeof planoId === 'string' ? planoId : 'mensal');
        let chave = PIX_ASSINATURA;
        try { const c = window.normalizarArray(await window.apiGet('configuracoes'))[0] || {}; if (c.pixAssinatura && String(c.pixAssinatura).trim()) chave = String(c.pixAssinatura).trim(); } catch (e) {}
        const valor = plano.preco;
        if (!chave) { await window.avisar('A chave Pix da assinatura ainda não está configurada neste aparelho. Envie o pedido (botões abaixo) que a Central da Evolução responde com o Pix do plano ' + plano.nome + '.'); return; }
        const pix = (/^000201/.test(chave) ? pixComValorTLV(chave, valor) : window.gerarPixComValor(chave, valor));
        const old = document.getElementById('modal-licenca-pix'); if (old) old.remove();
        const m = document.createElement('div');
        m.id = 'modal-licenca-pix';
        m.style.cssText = 'display:flex;align-items:center;justify-content:center;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:300000;padding:16px;';
        m.innerHTML = '<div style="background:#fff;border-radius:16px;max-width:360px;width:100%;overflow:hidden;text-align:center;">' +
            '<div style="background:' + COR + ';color:#fff;padding:14px;font-weight:700;"><i class="fas fa-qrcode"></i> Pix — ' + EDICOES[plano.edicao].nome + ' ' + plano.nome + ' — ' + R(valor) + '</div>' +
            '<div style="padding:16px;"><img src="' + window.qrUrl(pix, '300x300') + '" alt="QR Pix" style="width:220px;height:220px;border:2px dashed ' + COR + ';border-radius:12px;padding:8px;">' +
            '<div style="font-size:.75rem;color:#777;margin:10px 0 4px;">Pix copia e cola</div><div style="font-size:.7rem;word-break:break-all;max-height:56px;overflow:hidden;color:#333;">' + esc(pix) + '</div>' +
            '<button class="btn-outline" style="margin-top:10px;width:100%;" id="lic-copiar-pix"><i class="far fa-copy"></i> Copiar código Pix</button>' +
            '<div style="font-size:.78rem;color:#777;margin-top:10px;">Depois de pagar, toque em <b>Solicitar licença</b>, envie o pedido e aguarde o arquivo .rlic.</div>' +
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
