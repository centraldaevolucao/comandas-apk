// ============================================================
// LEGAL.JS — Termos de Uso, Política de Privacidade, Reembolso, Créditos (licenças de código aberto),
// aceite registrado (LGPD art. 8º §2º) e central "Privacidade e meus dados" (LGPD art. 18).
// Os textos descrevem o que o app FAZ de fato. Se o app mudar, mude aqui e aumente VERSAO_TERMOS (aqui e em server.py):
// todos precisarão aceitar de novo. Não substitui a revisão de um advogado.
// ============================================================
(function () {
    'use strict';
    const COR = '#C2185B';
    const VERSAO = '2026-11-18';                     // = VERSAO_TERMOS do server.py
    const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    const C = function () { return window.CONTATO || {}; };
    const emailPriv = function () { return C().emailPrivacidade || C().email || ''; };
    const base = function () { return (window.MT && window.MT.apiBase) ? window.MT.apiBase() : ''; };
    const ehQR = function () { return String(location.pathname).indexOf('/mesa/') === 0; };

    // ---------- identificação do fornecedor (só mostra o que foi preenchido) ----------
    function blocoEmpresa() {
        const c = C(), l = [];
        l.push('<b>' + esc(c.razaoSocial || c.empresa || '') + '</b>' + (c.razaoSocial && c.empresa && c.razaoSocial !== c.empresa ? ' (' + esc(c.empresa) + ')' : ''));
        if (c.cnpj) l.push('CNPJ/CPF: ' + esc(c.cnpj));
        if (c.endereco) l.push('Endereço: ' + esc(c.endereco));
        l.push('WhatsApp: ' + esc(c.whatsappFmt || '') + ' · E-mail: ' + esc(c.email || ''));
        if (c.horarios && c.horarios[0]) l.push('Atendimento: ' + esc(c.horarios[0]));
        return l.join('<br>');
    }

    // ---------- textos ----------
    const TERMOS = function () {
        return [
            ['1. Quem somos e o que é o app', 'O Restaurante-app / Comandas ("app") é um sistema de comandas, PDV, caixa e gestão para bares e restaurantes, oferecido por:<br>' + blocoEmpresa() + '<br>Estes Termos valem entre a Central da Evolução ("nós") e o estabelecimento que usa o app ("você").'],
            ['2. Quem pode usar', 'O app é destinado a pessoas com <b>18 anos ou mais</b> que atuam em estabelecimentos comerciais. Ao aceitar, você declara ter 18 anos ou mais e poderes para usar o app pelo estabelecimento.'],
            ['3. Seus dados ficam com você', 'O app funciona no seu aparelho (celular, tablet ou computador). Comandas, clientes, produtos, caixa e demais registros ficam <b>no banco de dados do próprio aparelho</b>; nós não recebemos esses dados. Por isso <b>você é o responsável por fazer backups</b> (menu Backup) e por manter o aparelho seguro. Para clientes e funcionários cujos dados você cadastra, <b>você é o controlador</b> (LGPD) e deve ter base legal para tratá-los.'],
            ['4. Planos, preços e pagamento', 'Há um plano gratuito (com limite de comandas por dia) e edições pagas (Essencial, Gestão e Completo), nos períodos mensal, trimestral, semestral e anual. O valor exibido na tela Assinatura é o <b>total a pagar</b>, sem taxas adicionais nossas. O pagamento é feito por Pix e a licença é liberada após a confirmação. Cada licença vale para <b>um equipamento servidor</b>.'],
            ['5. Sem renovação automática', 'Não fazemos cobrança recorrente nem guardamos dados de cartão. A licença vale pelo período pago; ao vencer, o app volta ao plano gratuito e <b>seus dados continuam salvos</b>. Para renovar, você pede e paga de novo. Para "cancelar", basta não renovar.'],
            ['6. Arrependimento e reembolso', 'Você pode desistir da compra em até <b>7 dias</b> contados do pagamento e receber o valor integral de volta (Código de Defesa do Consumidor, art. 49). Além disso, oferecemos uma garantia extra de 35 dias, uma vez por cliente. Veja a <a href="#" onclick="legalAbrir(\'reembolso\');return false;" style="color:' + COR + ';">Política de reembolso</a>.'],
            ['7. Disponibilidade e recursos', 'O app roda no seu aparelho e não depende de um servidor nosso para as operações do dia a dia, mas <b>não garantimos funcionamento ininterrupto nem ausência de erros</b>, e não oferecemos tempo mínimo de disponibilidade. Recursos citados como "em desenvolvimento" (por exemplo NFC-e, nuvem, várias lojas e outras integrações) <b>não têm data prometida</b>. Serviços de terceiros que você ligar ao app (Mercado Pago, Cloudflare, WhatsApp, ViaCEP) têm termos próprios e podem falhar.'],
            ['8. Obrigações fiscais', 'O app não emite nota fiscal. Cumprir as obrigações fiscais, trabalhistas e sanitárias do estabelecimento é responsabilidade sua.'],
            ['9. Conteúdo que você publica', 'Logos, fotos, nomes de produtos, textos e cardápios que você coloca no app (inclusive os exibidos por QR Code aos seus clientes) são de sua responsabilidade: você declara ter direito de usá-los. Você nos autoriza a exibi-los apenas dentro do app. <b>Denúncias de conteúdo ou de direito autoral:</b> escreva para ' + esc(emailPriv()) + ' (ou WhatsApp ' + esc(C().whatsappFmt || '') + ') com o link/imagem, quem é o titular e a prova do direito. Analisamos e orientamos a retirada quando cabível.'],
            ['10. Uso proibido', 'Não é permitido copiar o app para revenda, burlar o sistema de licenças, usá-lo para fraudar clientes ou tratar dados de terceiros sem base legal.'],
            ['11. Propriedade intelectual', 'O app e sua marca pertencem à Central da Evolução. Bibliotecas de terceiros seguem suas próprias licenças (veja "Créditos e licenças").'],
            ['12. Inteligência artificial', 'O app foi desenvolvido com apoio de ferramentas de inteligência artificial e o código é de responsabilidade do desenvolvedor. O app <b>não gera conteúdo para você com IA</b> e <b>não usa seus dados para treinar IA</b>. As respostas do Suporte são textos pré-escritos, buscados por palavras-chave.'],
            ['13. Mudanças nestes Termos', 'Se mudarmos os Termos ou a Política de Privacidade, a versão muda (hoje: <b>' + VERSAO + '</b>) e o app pedirá novo aceite.'],
            ['14. Lei aplicável e contato', 'Valem as leis do Brasil. Dúvidas, reclamações e pedidos: ' + esc(C().email || '') + ' ou WhatsApp ' + esc(C().whatsappFmt || '') + '.']
        ];
    };

    const PRIVACIDADE = function () {
        const enc = C().encarregado || C().empresa || '';
        return [
            ['1. Resumo', '• O app <b>não tem analytics, anúncios nem rastreadores</b>.<br>• Os dados do seu estabelecimento ficam <b>no seu aparelho</b>.<br>• Você pode baixar, corrigir e apagar dados pelo menu <b>Privacidade e meus dados</b>.<br>• Não usamos seus dados para treinar inteligência artificial.'],
            ['2. Quem é responsável', 'Dados que <b>você cadastra</b> (clientes, funcionários, comandas): o <b>estabelecimento</b> é o controlador; o app é a ferramenta e esses dados ficam só no seu aparelho. Dados que <b>você nos envia</b> (pedido de licença, suporte, comprovante de Pix): controlador é a<br>' + blocoEmpresa()],
            ['3. Contato de privacidade (encarregado)', 'Quem responde pelos dados: <b>' + esc(enc) + '</b>.<br>Fale conosco: ' + esc(emailPriv()) + ' · WhatsApp ' + esc(C().whatsappFmt || '') + '.'],
            ['4. Quais dados e para quê', '<b>Usuários e funcionários:</b> nome, e-mail, função, permissões e senha (guardada só como hash, nunca em texto) — para acesso e controle de permissões.<br><b>Clientes do estabelecimento:</b> nome, telefone, CPF (opcional), endereços e observações — para atendimento, delivery, pendências e comprovantes.<br><b>Comandas e caixa:</b> itens, valores, formas de pagamento — para operação, relatórios e obrigações contábeis.<br><b>Aceite dos Termos:</b> data, hora, versão, declaração de maioridade e escolha sobre marketing — para provar o consentimento.<br><b>Avaliação do app (opcional):</b> nota, comentário e, se você marcar, permissão para respondermos por WhatsApp.<br><b>Pedido de licença:</b> nome do estabelecimento, telefone, ID do equipamento, plano — para emitir sua licença.'],
            ['5. Bases legais', 'Execução do contrato (operar o app e a licença), cumprimento de obrigação legal (registros de vendas), consentimento (marketing, identificação opcional no cardápio por QR) e legítimo interesse (segurança e prova do aceite).'],
            ['6. Cookies e rastreadores', 'O app usa <b>somente cookies essenciais</b>: o de sessão (mantém você logado; dura até 24 horas) e, nos aparelhos de colaboradores, uma chave de acesso do aparelho (dura até 30 dias). Ambos são HttpOnly. Usa também o armazenamento local do navegador/app para preferências. <b>Não usamos cookies de análise, publicidade ou rastreamento</b>; por isso não há banner de cookies. Se isso mudar, pediremos seu consentimento antes, com botão para recusar tudo.'],
            ['7. Empresas e serviços que podem receber dados', 'Nenhuma empresa recebe seus dados automaticamente para analytics. Estas são as únicas que podem tocar em dados, e só quando você usa o recurso:<br>• <b>ViaCEP</b> (viacep.com.br): recebe o CEP que você digita para preencher o endereço.<br>• <b>Cloudflare</b>: se você ligar o link externo (túnel), o tráfego do cardápio/pedidos passa pela rede da Cloudflare; o programa cloudflared também é baixado dos servidores da Cloudflare/GitHub.<br>• <b>Mercado Pago</b>: só se você configurar a maquininha; recebe o valor e o código do pagamento, com o token que você informou.<br>• <b>WhatsApp (Meta)</b> e <b>e-mail</b>: quando você toca em enviar comprovante, pedido ou comanda, o conteúdo vai ao aplicativo escolhido por você.<br>• <b>Seu banco/Pix</b>: processa os pagamentos de assinatura e os Pix do seu caixa.<br>• <b>Google Play / lojas de aplicativos e GitHub</b>: distribuição do app, sem acesso aos seus dados do app.<br>Não usamos hospedagem em nuvem, serviço de e-mail em massa nem IA com dados de usuários.'],
            ['8. Inteligência artificial', 'Seus dados <b>não são enviados a serviços de IA</b> nem usados para treiná-la.'],
            ['9. Por quanto tempo guardamos', 'Comandas, caixa, compras e financeiro: <b>5 anos</b> (obrigações fiscais/contábeis); depois disso, nome, CPF e telefone saem das comandas e ficam só os valores.<br>Cadastro de clientes e funcionários: enquanto você mantiver; você pode apagar a qualquer momento.<br>Chamados de mesa: 30 dias. Registro de auditoria: 12 meses. Avaliações do app: 24 meses.<br>Sessão de login: até 24 horas ou até sair.<br>Registro de aceite: enquanto você usar o app e pelo prazo de defesa em processos.<br>Vencido o prazo, o app apaga ou anonimiza automaticamente.'],
            ['10. Seus direitos (LGPD, art. 18)', 'Você pode pedir: confirmação do tratamento, acesso, correção, anonimização/bloqueio/eliminação, portabilidade, informação sobre compartilhamento e <b>revogação do consentimento</b>. É gratuito. No app, abra <b>Privacidade e meus dados</b> para baixar uma cópia (arquivo JSON) ou apagar. Pedidos que dependam de nós: ' + esc(emailPriv()) + '. Respondemos em até 15 dias. Para eliminação, mantemos apenas o que a lei obriga (valores de vendas, 5 anos). Você também pode reclamar à ANPD (gov.br/anpd).'],
            ['11. Segurança', 'Senhas são guardadas com hash PBKDF2 e sal; o acesso depende de login e permissões; a licença usa assinatura digital. Nenhum sistema é 100% seguro; mantenha o aparelho com senha e faça backups.'],
            ['12. Incidentes de segurança', 'Se ocorrer um incidente que possa causar risco ou dano relevante a titulares, comunicaremos a ANPD e as pessoas afetadas em até <b>3 dias úteis</b> do conhecimento (LGPD art. 48; Resolução CD/ANPD nº 15/2024), dizendo o que aconteceu, quais dados e o que fazer.'],
            ['13. Crianças e adolescentes', 'O app não é destinado a menores de 18 anos e <b>não coletamos conscientemente dados de crianças</b>. Se o estabelecimento cadastrar dados de menores (por exemplo, em pedidos), deve ter o consentimento específico de um dos pais ou responsável (LGPD art. 14, §1º).'],
            ['14. Marketing', 'Só enviamos comunicações de marketing se você marcar a caixa específica, que vem <b>desmarcada</b>. Pode retirar a autorização na tela Privacidade e meus dados. Toda mensagem de marketing terá a opção de sair (responder SAIR ou usar o link de descadastro).'],
            ['15. Alterações', 'Versão desta Política: <b>' + VERSAO + '</b>. Mudanças relevantes pedem novo aceite.']
        ];
    };

    const REEMBOLSO = function () {
        return [
            ['1. Como funciona o pagamento', 'Você paga o plano por Pix, uma única vez por período (1, 3, 6 ou 12 meses). <b>Não há renovação automática</b> nem cobrança recorrente: nada é cobrado sem você pedir e pagar.'],
            ['2. Direito de arrependimento — 7 dias (lei)', 'Como a compra é feita pela internet/telefone, você pode desistir em até <b>7 dias corridos</b> a partir do pagamento ou da liberação da licença, <b>sem dar motivo</b>, e receber o valor <b>integral</b> de volta (Código de Defesa do Consumidor, art. 49). Esse direito vale para cada compra.'],
            ['3. Garantia extra — 35 dias (nossa)', 'Além da lei, quem desistir em até 35 dias da compra também recebe o valor integral. Esta garantia extra vale <b>uma única vez por cliente</b>.'],
            ['4. Como pedir', 'Envie o ID do equipamento e o comprovante pelo WhatsApp ' + esc(C().whatsappFmt || '') + ' ou e-mail ' + esc(C().email || '') + ', dizendo que deseja o reembolso. Devolvemos pelo mesmo meio de pagamento (Pix) assim que o pedido for confirmado, e a licença volta ao plano gratuito. Seus dados no aparelho não são apagados.'],
            ['5. Troca de edição e vencimento', 'Ao subir de edição você paga só a diferença pelo tempo que falta. Quando a licença vence, o app volta ao plano gratuito e os dados continuam salvos.'],
            ['6. Valores', 'O valor mostrado na tela Assinatura é o total, sem taxas adicionais nossas.']
        ];
    };

    const CREDITOS = function () {
        return [
            ['Bibliotecas e licenças de terceiros', 'O app usa estes componentes. Nenhum usa licença GPL/AGPL <i>dentro do app</i>; as condições de atribuição estão abaixo.<br><br>' +
                '• <b>Font Awesome Free 7.3.1</b> (Fonticons, Inc.) — ícones sob CC BY 4.0, fontes SIL OFL 1.1, código MIT. Exige atribuição: © Fonticons, Inc. — fontawesome.com/license/free.<br>' +
                '• <b>QRCode for JavaScript</b> (© 2009 Kazuhiko Arase) — MIT. "QR Code" é marca registrada da DENSO WAVE INCORPORATED.<br>' +
                '• <b>ZXing core 3.5.3</b> — Apache License 2.0 (leitura de QR Code do Pix no Android).<br>' +
                '• <b>AndroidX Core 1.12.0</b> — Apache License 2.0.<br>' +
                '• <b>Chaquopy</b> (executa o Python no Android) — MIT.<br>' +
                '• <b>Python 3.11</b> e biblioteca padrão — licença PSF. <b>SQLite</b> — domínio público.<br>' +
                '• <b>Ed25519 (RFC 8032)</b> — código de referência do IETF, usado para verificar licenças.<br>' +
                '• <b>cloudflared</b> (Cloudflare) — Apache License 2.0; baixado só se você ligar o link externo.<br>' +
                '• Versão para computador: <b>PyInstaller</b> (GPL v2 com exceção que permite programas próprios sob outra licença) e <b>Inno Setup</b> (licença própria permissiva), usados só para empacotar.<br><br>' +
                'As bibliotecas MIT/Apache/BSD pedem que o texto da licença acompanhe o app; os textos completos estão em opensource.org/licenses e apache.org/licenses/LICENSE-2.0.'],
            ['Imagens, fontes e textos', 'Os ícones do app são do Font Awesome Free (acima). O ícone do aplicativo e os textos das telas foram criados para este app. Logos e fotos que você cadastra são de sua responsabilidade.'],
            ['Conteúdo criado com IA', 'O app foi desenvolvido com apoio de inteligência artificial. Nenhum conteúdo é gerado por IA durante o uso.']
        ];
    };

    function paginaHtml(titulo, secoes, rodape) {
        return '<div style="max-width:760px;margin:0 auto;padding:14px 16px 24px;font-size:.92rem;line-height:1.6;color:#333;">' +
            '<h2 style="margin:6px 0 4px;color:' + COR + ';font-size:1.25rem;">' + esc(titulo) + '</h2>' +
            '<div style="font-size:.78rem;color:#777;margin-bottom:12px;">Versão ' + VERSAO + ' · em português · ' + esc(C().empresa || '') + '</div>' +
            secoes.map(function (s) { return '<h3 style="margin:16px 0 4px;font-size:1rem;color:#222;">' + esc(s[0]) + '</h3><div>' + s[1] + '</div>'; }).join('') +
            (rodape || '') + '</div>';
    }
    function telaApp(titulo, secoes) {
        return '<div class="app-bar"><button class="icon-btn" onclick="voltarTela()" aria-label="Voltar"><i class="fas fa-arrow-left"></i></button><h1>' + esc(titulo) + '</h1><div style="width:40px;"></div></div>' +
            '<div class="content-area" style="padding:0;">' + paginaHtml(titulo, secoes, '<div style="margin-top:18px;">' + (window.rodapeVersaoHtml ? window.rodapeVersaoHtml('') : '') + '</div>') + '</div>';
    }
    window.renderTermos = function () { return telaApp('Termos de Uso', TERMOS()); };
    window.renderPrivacidade = function () { return telaApp('Política de Privacidade', PRIVACIDADE()); };
    window.renderReembolso = function () { return telaApp('Política de Reembolso', REEMBOLSO()); };
    window.renderCreditos = function () { return telaApp('Créditos e licenças', CREDITOS()); };

    // ---------- páginas públicas (#termos etc., sem login: usadas pelo link do cardápio QR e rodapés) ----------
    const PUBLICAS = { termos: ['Termos de Uso', TERMOS], privacidade: ['Política de Privacidade', PRIVACIDADE], reembolso: ['Política de Reembolso', REEMBOLSO], creditos: ['Créditos e licenças', CREDITOS] };
    window.legalPaginaPublica = function (nome) {
        nome = String(nome || '').replace(/^#/, '');
        const p = PUBLICAS[nome]; if (!p) return null;
        return '<div style="background:#fff;min-height:100vh;"><div style="background:' + COR + ';color:#fff;padding:12px 16px;display:flex;align-items:center;gap:12px;"><a href="#" onclick="if(history.length>1){history.back()}else{location.hash=\'\';location.reload()}return false;" style="color:#fff;font-size:1.2rem;" aria-label="Voltar"><i class="fas fa-arrow-left"></i></a><b>' + esc(p[0]) + '</b></div>' +
            paginaHtml(p[0], p[1](), '<div style="margin-top:18px;">' + (window.rodapeVersaoHtml ? window.rodapeVersaoHtml('') : '') + '</div>') + '</div>';
    };
    window.legalEhPublica = function (hash) { return !!PUBLICAS[String(hash || '').replace(/^#/, '')]; };

    window.legalAbrir = function (rota) {
        if (ehQR() || typeof window.navigateTo !== 'function' || document.body.classList.contains('cliente-qrcode')) window.open('/#' + rota, '_blank');
        else window.navigateTo(rota);
    };
    window.legalLinksHtml = function () {
        const a = function (r, t) { return '<a href="#' + r + '" onclick="legalAbrir(\'' + r + '\');return false;" style="color:inherit;text-decoration:underline;">' + t + '</a>'; };
        return a('termos', 'Termos de Uso') + ' · ' + a('privacidade', 'Privacidade') + ' · ' + a('reembolso', 'Reembolso') + ' · ' + a('creditos', 'Créditos');
    };

    // ---------- aceite (item 1 a 5) ----------
    async function statusAceite() {
        try { const r = await fetch(base() + '/api/aceite', { credentials: 'include' }); return await r.json(); } catch (e) { return null; }
    }
    window.legalGarantirAceite = async function () {
        const st = await statusAceite();
        if (!st || st.aceito) return;                         // sem resposta: não trava o uso; aceito: ok
        await new Promise(function (resolve) {
            const m = document.createElement('div');
            m.id = 'modal-aceite'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-labelledby', 'aceite-titulo');
            m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:2500000;display:flex;align-items:center;justify-content:center;padding:14px;';
            const lk = function (r, t) { return '<a href="#' + r + '" onclick="legalAbrir(\'' + r + '\');return false;" style="color:' + COR + ';font-weight:700;">' + t + '</a>'; };
            m.innerHTML = '<div style="background:#fff;border-radius:16px;max-width:440px;width:100%;max-height:92vh;overflow-y:auto;padding:20px;box-shadow:0 10px 40px rgba(0,0,0,.4);">' +
                '<h2 id="aceite-titulo" style="margin:0 0 6px;font-size:1.2rem;color:' + COR + ';"><i class="fas fa-shield-halved"></i> Antes de começar</h2>' +
                '<p style="font-size:.88rem;color:#555;margin:0 0 12px;line-height:1.5;">Leia os documentos abaixo. Registramos a data, a hora e a versão do seu aceite.</p>' +
                '<label style="display:flex;gap:10px;align-items:flex-start;margin:10px 0;font-size:.9rem;line-height:1.45;cursor:pointer;"><input type="checkbox" id="ac-termos" style="width:22px;height:22px;flex:0 0 22px;margin-top:1px;"><span>Li e aceito os ' + lk('termos', 'Termos de Uso') + ' e a ' + lk('privacidade', 'Política de Privacidade') + ' <small style="color:#6b6b6b;">(obrigatório)</small></span></label>' +
                '<label style="display:flex;gap:10px;align-items:flex-start;margin:10px 0;font-size:.9rem;line-height:1.45;cursor:pointer;"><input type="checkbox" id="ac-18" style="width:22px;height:22px;flex:0 0 22px;margin-top:1px;"><span>Declaro que tenho <b>18 anos ou mais</b> <small style="color:#6b6b6b;">(obrigatório)</small></span></label>' +
                '<div style="border-top:1px solid #eee;margin:12px 0;"></div>' +
                '<label style="display:flex;gap:10px;align-items:flex-start;margin:10px 0;font-size:.88rem;line-height:1.45;cursor:pointer;"><input type="checkbox" id="ac-mkt" style="width:22px;height:22px;flex:0 0 22px;margin-top:1px;"><span>Quero receber novidades e ofertas da ' + esc(C().empresa || '') + ' por WhatsApp ou e-mail <small style="color:#6b6b6b;">(opcional — pode mudar quando quiser)</small></span></label>' +
                '<div id="ac-erro" style="color:#c62828;font-size:.82rem;min-height:18px;" role="alert"></div>' +
                '<button id="ac-ok" class="btn-primary" style="width:100%;padding:14px;font-size:1rem;opacity:.5;" disabled>Continuar</button>' +
                '<div style="font-size:.74rem;color:#6b6b6b;text-align:center;margin-top:8px;">Se você não tem 18 anos, não pode usar o app.</div></div>';
            document.body.appendChild(m);
            const t = m.querySelector('#ac-termos'), i18 = m.querySelector('#ac-18'), ok = m.querySelector('#ac-ok');
            const atualizar = function () { const v = t.checked && i18.checked; ok.disabled = !v; ok.style.opacity = v ? 1 : .5; };
            t.onchange = atualizar; i18.onchange = atualizar;
            ok.onclick = async function () {
                ok.disabled = true;
                try {
                    const r = await fetch(base() + '/api/aceite', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ termos: true, maior18: true, marketing: m.querySelector('#ac-mkt').checked, versao: VERSAO, origem: 'primeiro-acesso' }) });
                    const j = await r.json();
                    if (!j.ok) throw new Error(j.msg || 'Falha');
                    m.remove(); resolve();
                } catch (e) { m.querySelector('#ac-erro').textContent = 'Não foi possível registrar o aceite. Tente de novo.'; ok.disabled = false; }
            };
            setTimeout(function () { t.focus(); }, 50);
        });
    };

    // ---------- central: Privacidade e meus dados (itens 5, 10, 25) ----------
    window.renderMeusDados = function () {
        setTimeout(carregarMeusDados, 30);
        return '<div class="app-bar"><button class="icon-btn" onclick="voltarTela()" aria-label="Voltar"><i class="fas fa-arrow-left"></i></button><h1>Privacidade e meus dados</h1><div style="width:40px;"></div></div>' +
            '<div class="content-area" id="meus-dados" style="padding:12px;"><p class="empty-state">Carregando...</p></div>';
    };
    async function carregarMeusDados() {
        const box = document.getElementById('meus-dados'); if (!box) return;
        const st = await statusAceite(); const reg = st && st.registro;
        const card = function (t, corpo) { return '<div style="background:#fff;border-radius:12px;padding:14px;margin-bottom:12px;box-shadow:0 2px 8px rgba(0,0,0,.06);"><div style="font-weight:700;margin-bottom:6px;">' + t + '</div><div style="font-size:.85rem;color:#444;line-height:1.5;">' + corpo + '</div></div>'; };
        box.innerHTML =
            card('<i class="fas fa-file-signature"></i> Seu aceite', reg ? 'Versão <b>' + esc(reg.versao) + '</b> aceita em <b>' + esc(new Date(reg.dataHora).toLocaleString('pt-BR')) + '</b>.<br>Marketing: <b>' + (reg.marketing ? 'autorizado' : 'não autorizado') + '</b>.' : 'Nenhum aceite registrado.') +
            card('<i class="fas fa-bullhorn"></i> Marketing', '<label style="display:flex;gap:10px;align-items:center;cursor:pointer;"><input type="checkbox" id="md-mkt" style="width:22px;height:22px;" ' + (reg && reg.marketing ? 'checked' : '') + '> <span>Aceito receber novidades e ofertas por WhatsApp/e-mail</span></label><button class="btn-outline" style="margin-top:8px;width:100%;" onclick="legalSalvarMarketing()">Salvar escolha</button>') +
            card('<i class="fas fa-download"></i> Baixar meus dados', 'Gera um arquivo <b>JSON</b> com os dados pessoais guardados neste aparelho (usuários sem senha, colaboradores, clientes, avaliações, aceites e comandas com dados de clientes). Gratuito.<button class="btn-primary" style="margin-top:8px;width:100%;" onclick="legalBaixarDados()"><i class="fas fa-download"></i> Baixar arquivo</button>') +
            card('<i class="fas fa-user-slash"></i> Apagar dados de um cliente', 'Na tela <b>Clientes</b>, abra o cliente e use <b>Excluir</b>; o nome, CPF e telefone dele também são retirados das comandas (ficam só os valores, que a lei manda guardar por 5 anos). Para apagar todos de uma vez, use o botão abaixo.') +
            card('<i class="fas fa-trash"></i> Apagar todos os dados pessoais', 'Apaga clientes, avaliações e chamados e remove nomes, CPF e telefones das comandas. <b>Ficam</b>: valores de vendas/caixa (obrigação legal), os usuários com acesso ao sistema (para você não ficar sem entrar) e o registro de aceite. Não dá para desfazer — faça um backup antes.<button class="btn-outline" style="margin-top:8px;width:100%;border-color:#c62828;color:#c62828;" onclick="legalApagarPessoais()"><i class="fas fa-trash"></i> Apagar dados pessoais</button>') +
            card('<i class="fas fa-user-shield"></i> Contato de privacidade', 'Responsável: <b>' + esc(C().encarregado || C().empresa || '') + '</b><br>' + esc(emailPriv()) + ' · WhatsApp ' + esc(C().whatsappFmt || '') + '<br>Pedidos de acesso, correção, eliminação ou dúvidas: respondemos em até 15 dias.') +
            card('<i class="fas fa-scale-balanced"></i> Documentos', window.legalLinksHtml());
    }
    window.legalSalvarMarketing = async function () {
        const v = document.getElementById('md-mkt').checked;
        const r = await fetch(base() + '/api/aceite', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revogarMarketing: true, marketing: v }) });
        const j = await r.json();
        if (j.ok) { if (window.mostrarToast) window.mostrarToast('✅ Escolha salva'); carregarMeusDados(); } else alert(j.msg || 'Não foi possível salvar.');
    };
    window.legalBaixarDados = async function () {
        try {
            const r = await fetch(base() + '/api/privacidade/exportar', { credentials: 'include' });
            if (!r.ok) throw new Error('falha');
            const txt = await r.text();
            if (window.Plataforma && window.Plataforma.tem('compartilharArquivo')) { window.Plataforma.compartilharArquivo('meus-dados-restaurante.json', 'application/json', btoa(unescape(encodeURIComponent(txt)))); return; }
            const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' })); a.download = 'meus-dados-restaurante.json';
            document.body.appendChild(a); a.click(); a.remove();
        } catch (e) { alert('Só é possível baixar pelo aparelho que guarda os dados (servidor).'); }
    };
    window.legalApagarPessoais = async function () {
        const t = prompt('Isto apaga clientes, avaliações e nomes/CPF/telefones das comandas. Não dá para desfazer.\nDigite APAGAR para confirmar:');
        if (t === null) return;
        const r = await fetch(base() + '/api/privacidade/apagar-pessoais', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmar: t }) });
        const j = await r.json().catch(function () { return {}; });
        alert(j.ok ? 'Dados pessoais apagados.' : (j.msg || 'Não foi possível apagar (só no aparelho servidor).'));
    };
    // exclusão de um cliente a partir da tela Clientes (anonimiza nas comandas)
    window.legalAnonimizarCliente = async function (id) {
        try { await fetch(base() + '/api/privacidade/anonimizar', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clienteId: id }) }); } catch (e) {}
    };

    // ---------- acessibilidade básica (item 32): nomes para botões só com ícone e teclado em elementos clicáveis ----------
    function ajustarAcessibilidade() {
        try {
            document.querySelectorAll('button:not([aria-label]), a:not([aria-label])').forEach(function (b) {
                if ((b.textContent || '').trim()) return;
                b.setAttribute('aria-label', b.getAttribute('title') || (b.querySelector('.fa-arrow-left') ? 'Voltar' : (b.querySelector('.fa-xmark, .fa-times') ? 'Fechar' : 'Botão')));
            });
            document.querySelectorAll('div[onclick], span[onclick], li[onclick], tr[onclick]').forEach(function (e) {
                if (!e.hasAttribute('tabindex')) e.setAttribute('tabindex', '0');
                if (!e.hasAttribute('role')) e.setAttribute('role', 'button');
            });
        } catch (e) {}
    }
    document.addEventListener('keydown', function (ev) {
        const t = ev.target;
        if ((ev.key === 'Enter' || ev.key === ' ') && t && t.getAttribute && t.getAttribute('role') === 'button' && t.hasAttribute('onclick') && !/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) { ev.preventDefault(); t.click(); }
    });
    let _tA = null;
    new MutationObserver(function () { clearTimeout(_tA); _tA = setTimeout(ajustarAcessibilidade, 300); }).observe(document.documentElement, { childList: true, subtree: true });
})();
