// ============================================================
// CONFIGURACOES.JS — Configurações gerais do app
// ============================================================

console.log('✔ Configuracoes.js carregado');

if (!window.renderConfiguracoes) {
    window.renderConfiguracoes = function () {
        setTimeout(carregarConfiguracoes, 50);

        return [
            '<div class="app-bar">',
            '    <button class="icon-btn" onclick="abrirMenu()"><i class="fas fa-bars"></i></button>',
            '    <h1>Configurações</h1>',
            '    <div style="width:40px;"></div>',
            '</div>',
            '<div class="content-area" id="config-conteudo" style="padding:12px;">',
            '    <p class="empty-state">🔄 Carregando...</p>',
            '</div>'
        ].join('\n');
    };

    async function carregarConfiguracoes() {
        const container = document.getElementById('config-conteudo');
        if (!container) return;

        try {
            let config = {};
            try {
                const configArr = await apiGet('configuracoes');
                const arr = window.normalizarArray(configArr);
                config = arr[0] || {};
            } catch (e) {
                config = {};
            }

            const c = {
                comandasOrdemAlfabetica: config.comandasOrdemAlfabetica || false,
                filtrarProdutosPorGrupo: config.filtrarProdutosPorGrupo || false,
                imprimirPedidosAutomatico: config.imprimirPedidosAutomatico || false,
                fonteImpressaoGrande: config.fonteImpressaoGrande || false,
                nomeImpressao: config.nomeImpressao || 'Minha Empresa',
                urlLogo: config.urlLogo || '',
                habilitarImpressaoLocal: config.habilitarImpressaoLocal || false,
                colaboradorPadrao: config.colaboradorPadrao || '',
                garcomPercentual: config.garcomPercentual || 0,
                couvert: config.couvert || 0,
                minutosAlerta: config.minutosAlerta || 45,
                tempoAlertaPedido: config.tempoAlertaPedido || 30,
                numeracaoPedidos: config.numeracaoPedidos || false,
                proximoNumeroPedido: config.proximoNumeroPedido || 1,
                permitirFechamentoCego: config.permitirFechamentoCego || false,
                formaPagamentoPadrao: config.formaPagamentoPadrao || 'Crédito',
                bloquearEstoqueZerado: config.bloquearEstoqueZerado || false,
                numeracaoAutomaticaComandas: config.numeracaoAutomaticaComandas !== false,
                proximoNumeroComanda: config.proximoNumeroComanda || 1,
                reiniciarNumeracaoNoCaixa: config.reiniciarNumeracaoNoCaixa === true,
                ativarControleCaixa: config.ativarControleCaixa !== false,
                exibirPixRecibo: config.exibirPixRecibo === true,
                pixQrImpressao: (config.pixQrImpressao !== undefined ? config.pixQrImpressao : config.exibirPixRecibo) === true,
                pixQrWhatsapp: config.pixQrWhatsapp === true,
                pixQrComandaImp: (config.pixQrComandaImp !== undefined ? config.pixQrComandaImp : (config.pixQrImpressao !== undefined ? config.pixQrImpressao : config.exibirPixRecibo)) === true,
                pixQrReciboImp: (config.pixQrReciboImp !== undefined ? config.pixQrReciboImp : (config.pixQrImpressao !== undefined ? config.pixQrImpressao : config.exibirPixRecibo)) === true,
                pixQrComandaCompart: (config.pixQrComandaCompart !== undefined ? config.pixQrComandaCompart : config.pixQrWhatsapp) === true,
                pixQrReciboCompart: (config.pixQrReciboCompart !== undefined ? config.pixQrReciboCompart : config.pixQrWhatsapp) === true,
                pagDinheiro: config.pagDinheiro !== false,
                pagDebito: config.pagDebito !== false,
                pagCredito: config.pagCredito !== false,
                pagPix: config.pagPix !== false
            };

            let colaboradores = [];
            try {
                colaboradores = window.normalizarArray(await apiGet('colaboradores'));
            } catch (e) {}

            let opcoesColabs = '<option value="">Selecione...</option>';
            colaboradores.forEach(function (col) {
                const sel = String(col.nome) === String(c.colaboradorPadrao) ? ' selected' : '';
                opcoesColabs += '<option value="' + col.nome + '"' + sel + '>' + col.nome + '</option>';
            });

            const disp = window.detectarDispositivo();

            let html = '';

            // ============ SEÇÃO 1: DISPOSITIVO ============
            html += '<h2 style="font-size:1.1rem;font-weight:700;text-align:center;margin-bottom:16px;color:#333;">Configurações desse dispositivo</h2>';

            html += cardToggle(
                'Comandas em ordem alfabética',
                'Por padrão a ordem é feita por tempo do último consumo.',
                'cfg-cmd-alfabetica',
                c.comandasOrdemAlfabetica
            );

            html += cardToggle(
                'Filtrar produtos por grupo',
                'Ao adicionar um produto à comanda o filtro será por grupo.',
                'cfg-filtro-grupo',
                c.filtrarProdutosPorGrupo
            );

            // ============ IMPRESSORAS ============
            html += '<style>#config-conteudo [id^="cfg-"],#config-conteudo select,#config-conteudo input{min-width:0;max-width:100%;box-sizing:border-box;}#config-conteudo .card{overflow:hidden;max-width:100%;box-sizing:border-box;}</style>';
            html += '<div class="card" style="background:#FCE4EC;border-radius:12px;padding:16px;margin-bottom:12px;">';
            html += '    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;border-bottom:1px solid #e0c8e8;padding-bottom:16px;margin-bottom:16px;">';
            html += '        <div style="font-weight:600;font-size:0.95rem;">Imprimir pedidos automático</div>';
            html += '        <label class="toggle"><input type="checkbox" id="cfg-imp-auto" ' + (c.imprimirPedidosAutomatico ? 'checked' : '') + '><span class="slider"></span></label>';
            html += '    </div>';

            html += '    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;border-bottom:1px solid #e0c8e8;padding-bottom:16px;margin-bottom:16px;">';
            html += '        <div style="font-weight:600;font-size:0.95rem;">Fonte da impressão grande?</div>';
            html += '        <label class="toggle"><input type="checkbox" id="cfg-fonte-grande" ' + (c.fonteImpressaoGrande ? 'checked' : '') + '><span class="slider"></span></label>';
            html += '    </div>';

            html += '    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;border-bottom:1px solid #e0c8e8;padding-bottom:16px;margin-bottom:16px;">';
            html += '        <div><div style="font-weight:600;font-size:0.95rem;">QR Code PIX — impressão da COMANDA</div><div style="font-size:0.72rem;color:#666;">Papel e Bluetooth</div></div>';
            html += '        <label class="toggle"><input type="checkbox" id="cfg-qr-cmd-imp" ' + (c.pixQrComandaImp ? 'checked' : '') + '><span class="slider"></span></label>';
            html += '    </div>';

            html += '    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;border-bottom:1px solid #e0c8e8;padding-bottom:16px;margin-bottom:16px;">';
            html += '        <div><div style="font-weight:600;font-size:0.95rem;">QR Code PIX — impressão do RECIBO</div><div style="font-size:0.72rem;color:#666;">Papel e Bluetooth</div></div>';
            html += '        <label class="toggle"><input type="checkbox" id="cfg-qr-rec-imp" ' + (c.pixQrReciboImp ? 'checked' : '') + '><span class="slider"></span></label>';
            html += '    </div>';

            html += '    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;border-bottom:1px solid #e0c8e8;padding-bottom:16px;margin-bottom:16px;">';
            html += '        <div><div style="font-weight:600;font-size:0.95rem;">QR Code PIX — compartilhar COMANDA</div><div style="font-size:0.72rem;color:#666;">WhatsApp, e-mail e outros</div></div>';
            html += '        <label class="toggle"><input type="checkbox" id="cfg-qr-cmd-wa" ' + (c.pixQrComandaCompart ? 'checked' : '') + '><span class="slider"></span></label>';
            html += '    </div>';

            html += '    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;border-bottom:1px solid #e0c8e8;padding-bottom:16px;margin-bottom:16px;">';
            html += '        <div><div style="font-weight:600;font-size:0.95rem;">QR Code PIX — compartilhar RECIBO</div><div style="font-size:0.72rem;color:#666;">WhatsApp, e-mail e outros</div></div>';
            html += '        <label class="toggle"><input type="checkbox" id="cfg-qr-rec-wa" ' + (c.pixQrReciboCompart ? 'checked' : '') + '><span class="slider"></span></label>';
            html += '    </div>';

            html += '    <div style="border:1px solid #333;border-radius:8px;padding:0 10px;position:relative;margin-bottom:16px;">';
            html += '        <label style="position:absolute;top:-8px;left:10px;background:#FCE4EC;padding:0 4px;font-size:0.7rem;color:#333;font-weight:600;">Nome nas impressões</label>';
            html += '        <div style="display:flex;align-items:center;gap:10px;">';
            html += '            <input type="text" id="cfg-nome-impressao" value="' + c.nomeImpressao + '" style="border:none;background:transparent;flex:1;padding:12px 0;font-size:1rem;outline:none;text-align:center;min-width:0;width:100%;box-sizing:border-box;">';
            html += '            <button class="btn-limpar" onclick="salvarConfiguracoes()"><i class="fas fa-save" style="color:#C2185B;font-size:1.2rem;"></i></button>';
            html += '        </div>';
            html += '    </div>';

            window._cfgImg = { logo: c.urlLogo || '', icone: c.urlIcone || '' };
            [['logo', 'Logo (Recibo/Comanda)', 'cfg-url-logo', 'https://exemplo.com/logo.png'], ['icone', 'Ícone do estabelecimento', 'cfg-url-icone', 'https://exemplo.com/icone.png']].forEach(function (it) {
                const v = window._cfgImg[it[0]];
                const ehData = /^data:/.test(v);
                html += '    <div style="border:1px solid #333;border-radius:8px;padding:0 10px 10px;position:relative;margin-bottom:16px;">';
                html += '        <label style="position:absolute;top:-8px;left:10px;background:#FCE4EC;padding:0 4px;font-size:0.7rem;color:#333;font-weight:600;">' + it[1] + '</label>';
                html += '        <div style="display:flex;align-items:center;gap:10px;">';
                html += '            <div id="prev-' + it[0] + '" style="width:48px;height:48px;border:1px dashed #bbb;border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#fff;margin-top:10px;">' + (v ? '<img src="' + v + '" style="max-width:100%;max-height:100%;">' : '<i class="fas fa-image" style="color:#bbb;"></i>') + '</div>';
                html += '            <input type="text" id="' + it[2] + '" value="' + (ehData ? 'Imagem do dispositivo' : v) + '" placeholder="' + it[3] + '" style="border:none;background:transparent;flex:1;padding:12px 0;font-size:1rem;outline:none;min-width:0;">';
                html += '            <button class="btn-limpar" onclick="salvarConfiguracoes()"><i class="fas fa-save" style="color:#C2185B;font-size:1.2rem;"></i></button>';
                html += '        </div>';
                html += '        <div style="display:flex;gap:8px;margin-top:6px;">';
                html += '            <button type="button" class="btn-outline" style="flex:1;" onclick="cfgEscolherImagem(\'' + it[0] + '\')"><i class="fas fa-folder-open"></i> Escolher do dispositivo</button>';
                html += '            <button type="button" class="btn-outline" style="border-color:#c62828;color:#c62828;" onclick="cfgLimparImagem(\'' + it[0] + '\')"><i class="fas fa-times"></i></button>';
                html += '        </div>';
                html += '    </div>';
            });

            html += '    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #e0c8e8;cursor:pointer;" onclick="navigateTo(\'impressoras\')">';
            html += '        <div style="font-weight:600;font-size:0.95rem;">Conectar impressora geral</div>';
            html += '        <i class="fas fa-print" style="color:#C2185B;font-size:1.2rem;"></i>';
            html += '    </div>';

            html += '    <div style="padding:12px 0;border-bottom:1px solid #e0c8e8;">';
            html += '        <div style="font-weight:600;font-size:0.95rem;margin-bottom:4px;">Habilitar impressão por local</div>';
            html += '        <div style="font-size:0.75rem;color:#666;line-height:1.4;display:flex;justify-content:space-between;align-items:center;gap:10px;">';
            html += '            <span style="flex:1;">Imprimir por local (cozinha, bar e outros).</span>';
            html += '            <label class="toggle"><input type="checkbox" id="cfg-imp-local" ' + (c.habilitarImpressaoLocal ? 'checked' : '') + '><span class="slider"></span></label>';
            html += '        </div>';
            html += '    </div>';

            html += '    <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;cursor:pointer;" onclick="navigateTo(\'impressoras-local\')">';
            html += '        <div>';
            html += '            <div style="font-weight:600;font-size:0.95rem;">Conectar impressoras por local</div>';
            html += '            <div style="font-size:0.75rem;color:#666;">Cozinha, bar e outros.</div>';
            html += '        </div>';
            html += '        <i class="fas fa-print" style="color:#C2185B;font-size:1.2rem;"></i>';
            html += '    </div>';
            html += '</div>';

            // ============ MAQUININHAS ============
            html += '<div class="card" style="background:#FCE4EC;border-radius:12px;padding:16px;margin-bottom:12px;cursor:pointer;" onclick="maquininhaConfigurar()">';
            html += '    <div style="display:flex;justify-content:space-between;align-items:center;">';
            html += '        <div><div style="font-weight:600;font-size:0.95rem;">Maquininhas de cartão</div><div style="font-size:0.75rem;color:#666;">Selecione e configure várias maquininhas (débito, crédito e PIX). Vincule ao garçom em Colaboradores.</div></div>';
            html += '        <i class="fas fa-credit-card" style="color:#C2185B;font-size:1.3rem;"></i>';
            html += '    </div>';
            html += '</div>';

            // ============ COLABORADOR PADRÃO ============
            html += '<div class="card" style="background:#FCE4EC;border-radius:12px;padding:16px;margin-bottom:12px;">';
            html += '    <div style="font-weight:700;font-size:1rem;text-align:center;margin-bottom:8px;">Colaborador padrão</div>';
            html += '    <div style="text-align:center;margin-bottom:8px;"><i class="fas fa-caret-down" style="color:#C2185B;font-size:1.2rem;"></i></div>';
            html += '    <select id="cfg-colab-padrao" style="width:100%;border:none;border-bottom:1px solid #ccc;background:transparent;padding:8px 0;font-size:0.9rem;text-align:center;outline:none;margin-bottom:8px;appearance:none;">' + opcoesColabs + '</select>';
            html += '    <div style="font-size:0.75rem;color:#666;line-height:1.4;">Colaborador vinculado automaticamente ao criar comanda.</div>';
            html += '</div>';

            // ============ TIPO DE DISPOSITIVO ============
            html += '<div class="card" style="background:#FCE4EC;border-radius:12px;padding:16px;margin-bottom:24px;cursor:pointer;" onclick="navigateTo(\'tipo-dispositivo\')">';
            html += '    <div style="display:flex;justify-content:space-between;align-items:center;">';
            html += '        <div style="font-weight:600;font-size:0.95rem;">Tipo de dispositivo <span style="font-weight:400;color:#888;font-size:0.85rem;">(' + disp.label + ')</span></div>';
            html += '        <i class="fas ' + disp.icone + '" style="color:#C2185B;font-size:1.3rem;"></i>';
            html += '    </div>';
            html += '</div>';

            html += '<div class="card" style="background:#e3f2fd;border-radius:12px;padding:16px;margin-bottom:24px;cursor:pointer;" onclick="navigateTo(\'rede\')">';
            html += '    <div style="display:flex;justify-content:space-between;align-items:center;">';
            html += '        <div><div style="font-weight:600;font-size:0.95rem;">Rede e conexão</div><div style="font-size:0.75rem;color:#666;margin-top:2px;">Endereços, diagnóstico, Wi-Fi/Hotspot/Cloudflare</div></div>';
            html += '        <i class="fas fa-network-wired" style="color:#1565c0;font-size:1.3rem;"></i>';
            html += '    </div>';
            html += '</div>';

            // ============ SEÇÃO 2: GERAIS ============
            html += '<h2 style="font-size:1.1rem;font-weight:700;text-align:center;margin:24px 0 16px;color:#333;">Configurações gerais do app</h2>';

            // --- Grupos de Trabalho (link para tela dedicada) ---
            html += '<div class="card" style="background:#FCE4EC;border-radius:12px;padding:16px;margin-bottom:12px;cursor:pointer;" onclick="navigateTo(\'grupos-trabalho\')">';
            html += '    <div style="display:flex;justify-content:space-between;align-items:center;">';
            html += '        <div>';
            html += '            <div style="font-weight:600;font-size:0.95rem;">🎨 Grupos de Trabalho</div>';
            html += '            <div style="font-size:0.75rem;color:#666;margin-top:2px;">Cores do caixa (turnos/equipes)</div>';
            html += '        </div>';
            html += '        <i class="fas fa-chevron-right" style="color:#C2185B;"></i>';
            html += '    </div>';
            html += '</div>';

            // --- Valores Adicionais (sanfona) ---
            html += '<div class="card" style="background:#FCE4EC;border-radius:12px;padding:16px;margin-bottom:12px;">';
            html += '    <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;" onclick="toggleSecaoConfig(\'sec-valores-adicionais\')">';
            html += '        <div style="font-weight:600;font-size:0.95rem;">💰 Valores Adicionais</div>';
            html += '        <i class="fas fa-chevron-down" id="icon-sec-valores-adicionais" style="color:#C2185B; transition: transform 0.3s;"></i>';
            html += '    </div>';
            html += '    <div id="sec-valores-adicionais" style="display:none; margin-top:16px; border-top:1px solid #e0c8e8; padding-top:16px;">';
            html += '        <div style="font-size:0.85rem;color:#333;text-align:center;margin-bottom:16px;line-height:1.4;">Cobrados automaticamente em toda nova comanda aberta.</div>';
            html += '        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">';
            html += '            <div style="text-align:center;font-size:0.85rem;width:80px;">Garçom<br>Atual ' + c.garcomPercentual + '%</div>';
            html += '            <input type="number" id="cfg-garcom" value="' + c.garcomPercentual + '" style="flex:1;margin:0 12px;padding:12px;border:1px solid #333;border-radius:6px;text-align:center;font-size:1.1rem;background:#fff;outline:none;">';
            html += '        </div>';
            html += '        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">';
            html += '            <div style="text-align:center;font-size:0.85rem;width:80px;">Couvert<br>Atual R$ ' + Number(c.couvert).toFixed(2).replace('.', ',') + '</div>';
            html += '            <input type="number" step="0.01" id="cfg-couvert" value="' + c.couvert + '" style="flex:1;margin:0 12px;padding:12px;border:1px solid #333;border-radius:6px;text-align:center;font-size:1.1rem;background:#fff;outline:none;">';
            html += '        </div>';
            html += '        <div style="text-align:center;">';
            html += '            <button class="btn-outline" style="background:#fff;padding:10px 30px;border-radius:20px;" onclick="salvarConfiguracoes()">Salvar Valores</button>';
            html += '        </div>';
            html += '    </div>';
            html += '</div>';

            // --- Formas de Pagamento (sanfona) ---
            html += '<div class="card" style="background:#FCE4EC;border-radius:12px;padding:16px;margin-bottom:12px;">';
            html += '    <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;" onclick="toggleSecaoConfig(\'sec-formas-pagamento\')">';
            html += '        <div style="font-weight:600;font-size:0.95rem;">Formas de Pagamento</div>';
            html += '        <i class="fas fa-chevron-down" id="icon-sec-formas-pagamento" style="color:#C2185B; transition: transform 0.3s;"></i>';
            html += '    </div>';
            html += '    <div id="sec-formas-pagamento" style="display:none; margin-top:16px; border-top:1px solid #e0c8e8; padding-top:16px;">';
            html += cardToggleSimples('💵 Dinheiro', 'cfg-pg-dinheiro', c.pagDinheiro);
            html += cardToggleSimples('💳 Débito', 'cfg-pg-debito', c.pagDebito);
            html += cardToggleSimples('💳 Crédito', 'cfg-pg-credito', c.pagCredito);
            html += cardToggleSimples('📱 PIX', 'cfg-pg-pix', c.pagPix);
            html += '        <div style="text-align:center;margin-top:12px;">';
            html += '            <button class="btn-outline" style="background:#fff;padding:10px 30px;border-radius:20px;" onclick="salvarConfiguracoes()">Salvar Formas</button>';
            html += '        </div>';
            html += '    </div>';
            html += '</div>';

            // --- Minutos alertar comanda ---
            html += '<div class="card" style="background:#FCE4EC;border-radius:12px;padding:16px;margin-bottom:12px;">';
            html += '    <div style="border:1px solid #333;border-radius:8px;padding:0 10px;position:relative;">';
            html += '        <label style="position:absolute;top:-8px;left:10px;background:#FCE4EC;padding:0 4px;font-size:0.7rem;color:#333;font-weight:600;">Minutos alertar comanda</label>';
            html += '        <div style="display:flex;align-items:center;gap:10px;">';
            html += '            <input type="number" id="cfg-minutos-alerta" value="' + c.minutosAlerta + '" style="border:none;background:transparent;flex:1;padding:12px 0;font-size:1.1rem;outline:none;text-align:center;min-width:0;width:100%;box-sizing:border-box;">';
            html += '            <button class="btn-limpar" onclick="salvarConfiguracoes()"><i class="fas fa-save" style="color:#C2185B;font-size:1.2rem;"></i></button>';
            html += '        </div>';
            html += '    </div>';
            html += '    <div style="font-size:0.75rem;color:#666;margin-top:8px;line-height:1.4;">Tempo sem consumo para gerar alerta visual.</div>';
            html += '</div>';

            // --- Cadastrar PIX ---
            html += '<div class="card" style="background:#FCE4EC;border-radius:12px;padding:16px;margin-bottom:12px;cursor:pointer;" onclick="navigateTo(\'pix\')">';
            html += '    <div style="display:flex;justify-content:space-between;align-items:center;">';
            html += '        <div style="font-weight:600;font-size:0.95rem;">Cadastrar PIX do Restaurante</div>';
            html += '        <i class="fas fa-qrcode" style="color:#C2185B;font-size:1.2rem;"></i>';
            html += '    </div>';
            html += '</div>';

            // --- Senha ---
            html += '<div class="card" style="background:#FCE4EC;border-radius:12px;padding:16px;margin-bottom:12px;cursor:pointer;" onclick="navigateTo(\'senha\')">';
            html += '    <div style="display:flex;justify-content:space-between;align-items:center;">';
            html += '        <div style="font-weight:600;font-size:0.95rem;">Habilitar senha de acessos</div>';
            html += '        <i class="fas fa-lock" style="color:#C2185B;font-size:1.2rem;"></i>';
            html += '    </div>';
            html += '</div>';

            // --- Tempo pedido em alerta ---
            html += '<div class="card" style="background:#FCE4EC;border-radius:12px;padding:16px;margin-bottom:12px;">';
            html += '    <div style="border:1px solid #333;border-radius:8px;padding:0 10px;position:relative;">';
            html += '        <label style="position:absolute;top:-8px;left:10px;background:#FCE4EC;padding:0 4px;font-size:0.7rem;color:#333;font-weight:600;">Tempo (min) pedido em alerta</label>';
            html += '        <div style="display:flex;align-items:center;gap:10px;">';
            html += '            <input type="number" id="cfg-tempo-pedido" value="' + c.tempoAlertaPedido + '" style="border:none;background:transparent;flex:1;padding:12px 0;font-size:1.1rem;outline:none;text-align:center;min-width:0;width:100%;box-sizing:border-box;">';
            html += '            <button class="btn-limpar" onclick="salvarConfiguracoes()"><i class="fas fa-save" style="color:#C2185B;font-size:1.2rem;"></i></button>';
            html += '        </div>';
            html += '    </div>';
            html += '</div>';

            // --- Numeração pedidos ---
            html += '<div class="card" style="background:#FCE4EC;border-radius:12px;padding:16px;margin-bottom:12px;">';
            html += '    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:12px;">';
            html += '        <div style="flex:1;">';
            html += '            <div style="font-weight:600;font-size:0.95rem;">Numeração nos pedidos?</div>';
            html += '            <div style="font-size:0.75rem;color:#666;margin-top:4px;line-height:1.4;">Atribui um número para cada item enviado à produção.</div>';
            html += '        </div>';
            html += '        <label class="toggle"><input type="checkbox" id="cfg-num-pedidos" ' + (c.numeracaoPedidos ? 'checked' : '') + '><span class="slider"></span></label>';
            html += '    </div>';
            html += '    <div style="display:flex;align-items:center;gap:10px;">';
            html += '        <button class="btn-outline" style="padding:6px 10px;font-size:0.75rem;color:#C2185B;border-color:transparent;" onclick="resetarNumeracaoPedidos()">Resetar<br>numeração</button>';
            html += '        <div style="border:1px solid #333;border-radius:8px;padding:0 10px;position:relative;flex:1;min-width:0;">';
            html += '            <label style="position:absolute;top:-8px;left:10px;background:#FCE4EC;padding:0 4px;font-size:0.7rem;color:#333;font-weight:600;">Próximo número</label>';
            html += '            <div style="display:flex;align-items:center;gap:10px;">';
            html += '                <input type="number" id="cfg-prox-num-pedido" value="' + c.proximoNumeroPedido + '" style="border:none;background:transparent;flex:1;padding:12px 0;font-size:1.1rem;outline:none;text-align:center;min-width:0;width:100%;box-sizing:border-box;">';
            html += '                <button class="btn-limpar" onclick="salvarConfiguracoes()"><i class="fas fa-save" style="color:#C2185B;font-size:1.2rem;"></i></button>';
            html += '            </div>';
            html += '        </div>';
            html += '    </div>';
            html += '</div>';

            // --- Fechamento cego + forma padrão ---
            html += '<div class="card" style="background:#FCE4EC;border-radius:12px;padding:16px;margin-bottom:12px;">';
            html += '    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;border-bottom:1px solid #e0c8e8;padding-bottom:16px;margin-bottom:16px;">';
            html += '        <div style="flex:1;">';
            html += '            <div style="font-weight:600;font-size:0.95rem;">Permitir fechamento cego?</div>';
            html += '            <div style="font-size:0.75rem;color:#666;margin-top:4px;line-height:1.4;">A comanda poderá ser fechada sem passar o valor exato.</div>';
            html += '        </div>';
            html += '        <label class="toggle"><input type="checkbox" id="cfg-fech-cego" ' + (c.permitirFechamentoCego ? 'checked' : '') + '><span class="slider"></span></label>';
            html += '    </div>';
            html += '    <div style="font-size:0.75rem;color:#666;margin-bottom:8px;line-height:1.4;">Forma de pagamento padrão no fechamento.</div>';
            html += '    <div style="display:flex;align-items:center;gap:10px;">';
            html += '        <select id="cfg-forma-padrao" style="flex:1;border:1px solid #333;border-radius:8px;padding:12px;font-size:0.95rem;background:#fff;outline:none;">';
            ['Crédito', 'Débito', 'Dinheiro', 'PIX'].forEach(function (f) {
                const sel = f === c.formaPagamentoPadrao ? ' selected' : '';
                html += '<option value="' + f + '"' + sel + '>' + f + '</option>';
            });
            html += '        </select>';
            html += '        <button class="btn-limpar" onclick="salvarConfiguracoes()"><i class="fas fa-save" style="color:#C2185B;font-size:1.2rem;"></i></button>';
            html += '    </div>';
            html += '</div>';

            // --- Bloquear estoque zerado ---
            html += cardToggle(
                'Bloquear estoque zerado?',
                'Produtos sem estoque não aparecem na busca.',
                'cfg-bloq-estoque',
                c.bloquearEstoqueZerado
            );

            // --- Numeração automática comandas ---
            html += '<div class="card" style="background:#FCE4EC;border-radius:12px;padding:16px;margin-bottom:12px;">';
            html += '    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:12px;">';
            html += '        <div style="flex:1;">';
            html += '            <div style="font-weight:600;font-size:0.95rem;">Numeração automática nas comandas?</div>';
            html += '            <div style="font-size:0.75rem;color:#666;margin-top:4px;line-height:1.4;">Cada comanda criada recebe um número sequencial.</div>';
            html += '        </div>';
            html += '        <label class="toggle"><input type="checkbox" id="cfg-num-automatica" ' + (c.numeracaoAutomaticaComandas ? 'checked' : '') + '><span class="slider"></span></label>';
            html += '    </div>';
            html += '    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:12px;padding-top:10px;border-top:1px solid rgba(0,0,0,0.08);">';
            html += '        <div style="flex:1;">';
            html += '            <div style="font-weight:600;font-size:0.9rem;">Recomeçar do 1 a cada abertura de caixa</div>';
            html += '            <div style="font-size:0.75rem;color:#666;margin-top:4px;line-height:1.4;">Ao abrir um caixa novo, a primeira comanda é a número 1.</div>';
            html += '        </div>';
            html += '        <label class="toggle"><input type="checkbox" id="cfg-num-reinicia-caixa" ' + (c.reiniciarNumeracaoNoCaixa ? 'checked' : '') + '><span class="slider"></span></label>';
            html += '    </div>';
            html += '    <div style="display:flex;align-items:center;gap:10px;">';
            html += '        <button class="btn-outline" style="padding:6px 10px;font-size:0.75rem;color:#C2185B;border-color:transparent;" onclick="resetarNumeracaoComandas()">Resetar<br>numeração</button>';
            html += '        <div style="border:1px solid #333;border-radius:8px;padding:0 10px;position:relative;flex:1;min-width:0;">';
            html += '            <label style="position:absolute;top:-8px;left:10px;background:#FCE4EC;padding:0 4px;font-size:0.7rem;color:#333;font-weight:600;">Próximo número</label>';
            html += '            <div style="display:flex;align-items:center;gap:10px;">';
            html += '                <input type="number" id="cfg-prox-num-cmd" value="' + c.proximoNumeroComanda + '" style="border:none;background:transparent;flex:1;padding:12px 0;font-size:1.1rem;outline:none;text-align:center;min-width:0;width:100%;box-sizing:border-box;">';
            html += '                <button class="btn-limpar" onclick="salvarConfiguracoes()"><i class="fas fa-save" style="color:#C2185B;font-size:1.2rem;"></i></button>';
            html += '            </div>';
            html += '        </div>';
            html += '    </div>';
            html += '</div>';

            // --- Controle de caixa ---
            html += cardToggle(
                'Ativar controle de caixa?',
                'Abertura/fechamento, sangrias, suprimentos e histórico.',
                'cfg-ctrl-caixa',
                c.ativarControleCaixa
            );

            // --- Backup ---
            html += '<div class="card" style="background:#FCE4EC;border-radius:12px;padding:16px;margin-bottom:24px;cursor:pointer;" onclick="navigateTo(\'backup\')">';
            html += '    <div style="display:flex;justify-content:space-between;align-items:center;">';
            html += '        <div style="font-weight:600;font-size:0.95rem;">Backup</div>';
            html += '        <i class="fas fa-cloud-upload-alt" style="color:#C2185B;font-size:1.2rem;"></i>';
            html += '    </div>';
            html += '</div>';

            container.innerHTML = html;
            // Toggle/seleção de forma padrão: cada mudança é salva na hora
            container.querySelectorAll('input[type="checkbox"], #cfg-forma-padrao').forEach(function (e) {
                e.addEventListener('change', function () { window.salvarConfiguracoes(true); });
            });
        } catch (e) {
            console.error('❌ Erro ao carregar configurações:', e);
            container.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro: ' + e.message + '</p>';
        }
    }

    // ============================================================
    // HELPERS DE RENDERIZAÇÃO
    // ============================================================
    function cardToggle(titulo, descricao, idInput, valor) {
        return '<div class="card" style="background:#FCE4EC;border-radius:12px;padding:16px;margin-bottom:12px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">' +
            '    <div style="flex:1;">' +
            '        <div style="font-weight:600;font-size:0.95rem;">' + titulo + '</div>' +
            '        <div style="font-size:0.75rem;color:#666;margin-top:4px;line-height:1.4;">' + descricao + '</div>' +
            '    </div>' +
            '    <label class="toggle">' +
            '        <input type="checkbox" id="' + idInput + '" ' + (valor ? 'checked' : '') + '>' +
            '        <span class="slider"></span>' +
            '    </label>' +
            '</div>' +
            '</div>';
    }

    function cardToggleSimples(label, idInput, valor) {
        return '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid #e0c8e8;">' +
            '<div style="font-size:0.9rem;">' + label + '</div>' +
            '<label class="toggle"><input type="checkbox" id="' + idInput + '" ' + (valor ? 'checked' : '') + '><span class="slider"></span></label>' +
            '</div>';
    }

    // ============================================================
    // CONTROLE DAS SANFONAS
    // ============================================================
    window.toggleSecaoConfig = function (id) {
        const content = document.getElementById(id);
        const icon = document.getElementById('icon-' + id);
        if (!content || !icon) return;

        if (content.style.display === 'none') {
            content.style.display = 'block';
            icon.style.transform = 'rotate(180deg)';
        } else {
            content.style.display = 'none';
            icon.style.transform = 'rotate(0deg)';
        }
    };

    // ============================================================
    // SALVAR CONFIGURAÇÕES
    // ============================================================
    let _filaSalvar = Promise.resolve();
    window.salvarConfiguracoes = function (silencioso) {
        _filaSalvar = _filaSalvar.then(function () { return salvarConfiguracoesAgora(silencioso === true); }, function () { return salvarConfiguracoesAgora(silencioso === true); });
        return _filaSalvar;
    };
    async function salvarConfiguracoesAgora(silencioso) {
        try {
            let config = {};
            try {
                const arr = window.normalizarArray(await apiGet('configuracoes'));
                config = arr[0] || {};
            } catch (e) {}

            const el = (id) => document.getElementById(id);
            const val = (id) => el(id) ? el(id).value : '';
            const chk = (id) => el(id) ? el(id).checked : false;

            config.comandasOrdemAlfabetica = chk('cfg-cmd-alfabetica');
            config.filtrarProdutosPorGrupo = chk('cfg-filtro-grupo');
            config.imprimirPedidosAutomatico = chk('cfg-imp-auto');
            config.fonteImpressaoGrande = chk('cfg-fonte-grande');
            config.nomeImpressao = (val('cfg-nome-impressao') || '').trim();
            const lerImg = function (chave, idCampo) {
                const t = (val(idCampo) || '').trim();
                if (t === 'Imagem do dispositivo') return (window._cfgImg && window._cfgImg[chave]) || '';
                return t;
            };
            config.urlLogo = lerImg('logo', 'cfg-url-logo');
            config.urlIcone = lerImg('icone', 'cfg-url-icone');
            config.habilitarImpressaoLocal = chk('cfg-imp-local');
            config.colaboradorPadrao = val('cfg-colab-padrao');

            if (el('cfg-garcom')) config.garcomPercentual = parseFloat(val('cfg-garcom')) || 0;
            if (el('cfg-couvert')) config.couvert = parseFloat(val('cfg-couvert')) || 0;

            config.pagDinheiro = chk('cfg-pg-dinheiro');
            config.pagDebito = chk('cfg-pg-debito');
            config.pagCredito = chk('cfg-pg-credito');
            config.pagPix = chk('cfg-pg-pix');

            config.minutosAlerta = parseInt(val('cfg-minutos-alerta')) || 45;
            config.tempoAlertaPedido = parseInt(val('cfg-tempo-pedido')) || 30;

            config.pixQrComandaImp = chk('cfg-qr-cmd-imp');
            config.pixQrReciboImp = chk('cfg-qr-rec-imp');
            config.pixQrComandaCompart = chk('cfg-qr-cmd-wa');
            config.pixQrReciboCompart = chk('cfg-qr-rec-wa');
            config.pixQrImpressao = config.pixQrComandaImp || config.pixQrReciboImp;   // compatibilidade
            config.exibirPixRecibo = config.pixQrImpressao;
            config.pixQrWhatsapp = config.pixQrComandaCompart || config.pixQrReciboCompart;

            config.numeracaoPedidos = chk('cfg-num-pedidos');
            config.proximoNumeroPedido = parseInt(val('cfg-prox-num-pedido')) || 1;

            config.permitirFechamentoCego = chk('cfg-fech-cego');
            config.formaPagamentoPadrao = val('cfg-forma-padrao');
            config.bloquearEstoqueZerado = chk('cfg-bloq-estoque');

            config.numeracaoAutomaticaComandas = chk('cfg-num-automatica');
            config.proximoNumeroComanda = parseInt(val('cfg-prox-num-cmd')) || 1;
            config.reiniciarNumeracaoNoCaixa = chk('cfg-num-reinicia-caixa');
            config.ativarControleCaixa = chk('cfg-ctrl-caixa');

            config.ultimaAtualizacao = new Date().toLocaleString('pt-BR');

            await apiSave('configuracoes', [config]);

            if (typeof window.mostrarToast === 'function') {
                window.mostrarToast('✅ Configurações salvas');
            } else if (!silencioso) {
                alert('✅ Configurações salvas');
            }

            if (!silencioso) carregarConfiguracoes();   // salvamento automático não redesenha (mantém a posição da tela)
        } catch (e) {
            console.error('Erro ao salvar:', e);
            alert('Erro ao salvar: ' + e.message);
        }
    }

    window.resetarNumeracaoPedidos = async function () {
        if (!await window.confirmar('Deseja resetar a numeração dos pedidos para 1?')) return;
        const el = document.getElementById('cfg-prox-num-pedido');
        if (el) el.value = 1;
        await window.salvarConfiguracoes();
    };

    window.resetarNumeracaoComandas = async function () {
        if (!await window.confirmar('Deseja resetar a numeração das comandas para 1?')) return;
        const el = document.getElementById('cfg-prox-num-cmd');
        if (el) el.value = 1;
        await window.salvarConfiguracoes();
    };
}

window.cfgEscolherImagem = function (qual) {
    window.escolherImagemDoDispositivo(qual === 'logo' ? 600 : 192, function (dataUrl) {
        window._cfgImg = window._cfgImg || {};
        window._cfgImg[qual] = dataUrl;
        const campo = document.getElementById(qual === 'logo' ? 'cfg-url-logo' : 'cfg-url-icone');
        if (campo) campo.value = 'Imagem do dispositivo';
        const pv = document.getElementById('prev-' + qual);
        if (pv) pv.innerHTML = '<img src="' + dataUrl + '" style="max-width:100%;max-height:100%;">';
        if (typeof window.salvarConfiguracoes === 'function') window.salvarConfiguracoes();
    });
};
window.cfgLimparImagem = function (qual) {
    window._cfgImg = window._cfgImg || {};
    window._cfgImg[qual] = '';
    const campo = document.getElementById(qual === 'logo' ? 'cfg-url-logo' : 'cfg-url-icone');
    if (campo) campo.value = '';
    const pv = document.getElementById('prev-' + qual);
    if (pv) pv.innerHTML = '<i class="fas fa-image" style="color:#bbb;"></i>';
    if (typeof window.salvarConfiguracoes === 'function') window.salvarConfiguracoes();
};
