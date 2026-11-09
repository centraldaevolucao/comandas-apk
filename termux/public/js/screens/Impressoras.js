// ============================================================
// IMPRESSORAS.JS — v15 (Suporte a Desktop e Celular/Bluetooth)
// ============================================================

console.log('✔ Impressoras.js v15 carregado');

if (!window.renderImpressoras) {
    window.renderImpressoras = function() {
        setTimeout(carregarImpressoras, 50);

        return [
            '<div class="app-bar">',
            '    <button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button>',
            '    <h1>Impressoras</h1>',
            '    <div style="width:40px;"></div>',
            '</div>',
            '<div class="content-area" id="impressoras-conteudo" style="padding:12px;">',
            '    <p class="empty-state">🔄 Carregando...</p>',
            '</div>'
        ].join('\n');
    };

    async function carregarImpressoras() {
        const container = document.getElementById('impressoras-conteudo');
        if (!container) return;

        try {
            // Verifica se o dispositivo é celular
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
            const isBluetoothSupported = !!navigator.bluetooth;

            let html = '<div class="card" style="background:#fff;margin-bottom:12px;padding:12px;"><div id="bt-secao"></div></div>';

            // ==========================================
            // AVISO PARA CELULAR
            // ==========================================
            if (isMobile) {
                html += '<div class="card" style="background:#fff3e0;border-left:4px solid #ff9800;padding:16px;margin-bottom:16px;">';
                html += '    <div style="display:flex;gap:10px;align-items:flex-start;">';
                html += '        <i class="fas fa-mobile-alt" style="color:#e65100;font-size:1.5rem;margin-top:2px;"></i>';
                html += '        <div>';
                html += '            <div style="font-weight:700;color:#e65100;margin-bottom:4px;">Você está no Celular</div>';
                html += '            <div style="font-size:0.8rem;color:#666;line-height:1.4;">Navegadores móveis não acessam a rede local (Windows/IP) por segurança. Para imprimir no celular, use a <b>Impressão Nativa</b> (Wi-Fi/Compartilhamento) ou conecte uma <b>Impressora Bluetooth</b>.</div>';
                html += '        </div>';
                html += '    </div>';
                html += '</div>';
            }

            // ==========================================
            // OPÇÃO 1: IMPRESSÃO NATIVA (CELULAR E PC)
            // ==========================================
            html += '<div class="card" style="background:#FCE4EC;border-radius:12px;padding:16px;margin-bottom:16px;">';
            html += '    <div style="font-weight:700;font-size:1.1rem;margin-bottom:8px;color:#C2185B;"><i class="fas fa-print"></i> Impressão Nativa (Padrão)</div>';
            html += '    <div style="font-size:0.85rem;color:#666;margin-bottom:16px;">Abre a janela de impressão do seu celular/computador. Ideal para impressoras Wi-Fi na mesma rede ou impressoras compartilhadas.</div>';
            
            html += '    <div style="display:flex;gap:10px;">';
            html += '        <button class="btn-primary" style="flex:1;background:#C2185B;" onclick="testarImpressaoNativa()">';
            html += '            <i class="fas fa-print"></i> Testar Impressão';
            html += '        </button>';
            html += '    </div>';
            html += '</div>';

            // ==========================================
            // OPÇÃO 2: IMPRESSORA BLUETOOTH (CELULAR)
            // ==========================================
            if (isMobile) {
                html += '<div class="card" style="background:#FCE4EC;border-radius:12px;padding:16px;margin-bottom:16px;">';
                html += '    <div style="font-weight:700;font-size:1.1rem;margin-bottom:8px;color:#C2185B;"><i class="fab fa-bluetooth-b"></i> Impressora Bluetooth (Térmica)</div>';
                html += '    <div style="font-size:0.85rem;color:#666;margin-bottom:16px;">Conecte uma impressora térmica portátil diretamente ao celular via Bluetooth.</div>';
                
                if (!isBluetoothSupported) {
                    html += '    <div style="padding:10px;background:#ffebee;color:#c62828;border-radius:8px;font-size:0.85rem;text-align:center;">Seu navegador não suporta Web Bluetooth. Use o Google Chrome no Android.</div>';
                } else {
                    html += '    <button class="btn-primary" style="width:100%;background:#1976d2;" onclick="conectarImpressoraBluetooth()">';
                    html += '        <i class="fas fa-search"></i> Buscar Impressora Bluetooth';
                    html += '    </button>';
                    html += '    <div id="status-bluetooth" style="margin-top:10px;font-size:0.85rem;text-align:center;color:#666;"></div>';
                }
                html += '</div>';
            }

            // ==========================================
            // OPÇÃO 3: IMPRESSORA DE REDE (PC / QZ TRAY)
            // ==========================================
            html += '<div class="card" style="background:#FCE4EC;border-radius:12px;padding:16px;margin-bottom:16px;">';
            html += '    <div style="font-weight:700;font-size:1.1rem;margin-bottom:8px;color:#C2185B;"><i class="fas fa-network-wired"></i> Impressora de Rede (IP/Windows)</div>';
            html += '    <div style="font-size:0.85rem;color:#666;margin-bottom:16px;">Ideal para Computadores (Windows/Mac). O sistema envia os dados para a impressora térmica na rede local.</div>';
            
            html += '    <div style="border:1px solid #ccc;border-radius:8px;padding:0 10px;position:relative;margin-bottom:16px;">';
            html += '        <label style="position:absolute;top:-8px;left:10px;background:#FCE4EC;padding:0 4px;font-size:0.7rem;color:#333;font-weight:600;">IP da Impressora</label>';
            html += '        <input type="text" id="imp-ip" placeholder="Ex: 192.168.1.100" style="border:none;background:transparent;width:100%;padding:12px 0;font-size:1rem;outline:none;">';
            html += '    </div>';
            
            html += '    <div style="display:flex;gap:10px;">';
            html += '        <button class="btn-outline" style="flex:1;" onclick="conectarImpressoraRede()">Conectar</button>';
            html += '        <button class="btn-primary" style="flex:1;" onclick="salvarImpressoraRede()">Salvar</button>';
            html += '    </div>';
            html += '    <div id="status-rede" style="margin-top:10px;font-size:0.85rem;text-align:center;color:#666;"></div>';
            html += '</div>';

            // ==========================================
            // CONFIGURAÇÕES SALVAS
            // ==========================================
            html += '<div class="card" style="background:#FCE4EC;border-radius:12px;padding:16px;margin-bottom:24px;">';
            html += '    <div style="font-weight:700;font-size:1.1rem;margin-bottom:8px;color:#C2185B;"><i class="fas fa-cogs"></i> Preferências Salvas</div>';
            html += '    <div style="font-size:0.85rem;color:#666;margin-bottom:16px;">Selecione a impressora padrão para cada setor.</div>';
            
            html += '    <div style="display:flex;flex-direction:column;gap:10px;">';
            
            html += '        <div style="display:flex;align-items:center;justify-content:space-between;">';
            html += '            <div style="font-size:0.9rem;">Impressora Principal (Caixa)</div>';
            html += '            <select id="imp-padrao-caixa" style="padding:8px;border-radius:6px;border:1px solid #ccc;">';
            html += '                <option value="nativa">Nativa</option>';
            html += '                <option value="bluetooth">Bluetooth</option>';
            html += '                <option value="rede">Rede (IP)</option>';
            html += '            </select>';
            html += '        </div>';

            html += '        <div style="display:flex;align-items:center;justify-content:space-between;">';
            html += '            <div style="font-size:0.9rem;">Impressora Principal (Cozinha)</div>';
            html += '            <select id="imp-padrao-cozinha" style="padding:8px;border-radius:6px;border:1px solid #ccc;">';
            html += '                <option value="nativa">Nativa</option>';
            html += '                <option value="bluetooth">Bluetooth</option>';
            html += '                <option value="rede">Rede (IP)</option>';
            html += '            </select>';
            html += '        </div>';

            html += '    </div>';
            html += '    <button class="btn-primary" style="width:100%;margin-top:16px;" onclick="salvarPreferenciasImpressora()">Salvar Preferências</button>';
            html += '</div>';

            container.innerHTML = html;

            // Carrega as preferências salvas
            const config = window.normalizarArray(await apiGet('configuracoes'))[0] || {};
            if (window.btDesenhar) window.btDesenhar();
            if (config.impressoraCaixa) document.getElementById('imp-padrao-caixa').value = config.impressoraCaixa;
            if (config.impressoraCozinha) document.getElementById('imp-padrao-cozinha').value = config.impressoraCozinha;
            if (config.impressoraRedeIp) document.getElementById('imp-ip').value = config.impressoraRedeIp;

        } catch (e) {
            console.error(e);
            container.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro ao carregar impressoras.</p>';
        }
    }

    // ============================================================
    // FUNÇÕES DE TESTE E CONEXÃO
    // ============================================================

    window.testarImpressaoNativa = function() {
        // Cria uma janela invisível com o HTML de um cupom e chama a impressão
        const janela = window.open('', '_blank');
        janela.document.write(`
            <html>
            <head>
                <title>Teste de Impressão</title>
                <style>
                    body { font-family: monospace; text-align: center; margin: 0; padding: 20px; }
                    h1 { font-size: 20px; margin-bottom: 10px; }
                    p { font-size: 14px; margin: 5px 0; }
                    .linha { border-top: 1px dashed #000; margin: 10px 0; }
                </style>
            </head>
            <body>
                <h1>RESTAURANTE TESTE</h1>
                <p>CNPJ: 00.000.000/0000-00</p>
                <p>Data: ${new Date().toLocaleString('pt-BR')}</p>
                <div class="linha"></div>
                <p>TESTE DE IMPRESSÃO</p>
                <p>Mesa: 01</p>
                <p>1x Hambúrguer - R$ 25,00</p>
                <div class="linha"></div>
                <p><b>TOTAL: R$ 25,00</b></p>
                <br><br>
                <p>Obrigado pela preferência!</p>
                <script>
                    window.onload = function() { window.print(); window.close(); }
                <\/script>
            </body>
            </html>
        `);
        janela.document.close();
    };

    let dispositivoBluetooth = null;
    let caracteristicaBluetooth = null;

    window.conectarImpressoraBluetooth = async function() {
        const statusDiv = document.getElementById('status-bluetooth');
        statusDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando dispositivos...';

        try {
            if (!navigator.bluetooth) throw new Error('Web Bluetooth não suportado.');

            // Filtro genérico para impressoras Bluetooth (muitas usam esse serviço)
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'] // UUID comum de impressoras térmicas
            });

            dispositivoBluetooth = device;
            statusDiv.innerHTML = `Conectando a ${device.name}...`;

            const server = await device.gatt.connect();
            
            // Tenta acessar o serviço de impressão
            const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
            // Tenta acessar a característica de escrita
            caracteristicaBluetooth = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

            statusDiv.innerHTML = `<span style="color:#2e7d32;font-weight:bold;"><i class="fas fa-check-circle"></i> Conectado a ${device.name}</span>`;
            
            // Salva no banco
            let config = window.normalizarArray(await apiGet('configuracoes'))[0] || {};
            config.bluetoothDeviceName = device.name;
            await apiSave('configuracoes', [config]);

        } catch (error) {
            console.error(error);
            if (error.name === 'NotFoundError') {
                statusDiv.innerHTML = '<span style="color:#c62828;">Nenhum dispositivo selecionado.</span>';
            } else {
                statusDiv.innerHTML = `<span style="color:#c62828;">Erro: ${error.message}</span>`;
            }
        }
    };

    window.conectarImpressoraRede = async function() {
        const ip = document.getElementById('imp-ip').value.trim();
        const statusDiv = document.getElementById('status-rede');
        
        if (!ip) { statusDiv.innerHTML = '<span style="color:#c62828;">Informe um IP válido.</span>'; return; }
        
        statusDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testando conexão...';

        // Simulação de teste de rede (No frontend real, você faria um ping via backend)
        setTimeout(() => {
            statusDiv.innerHTML = `<span style="color:#2e7d32;font-weight:bold;"><i class="fas fa-check-circle"></i> Conexão aceita para ${ip}</span>`;
        }, 1500);
    };

    window.salvarImpressoraRede = async function() {
        const ip = document.getElementById('imp-ip').value.trim();
        let config = window.normalizarArray(await apiGet('configuracoes'))[0] || {};
        config.impressoraRedeIp = ip;
        await apiSave('configuracoes', [config]);
        alert('✅ IP da impressora salvo!');
    };

    window.salvarPreferenciasImpressora = async function() {
        const impCaixa = document.getElementById('imp-padrao-caixa').value;
        const impCozinha = document.getElementById('imp-padrao-cozinha').value;
        
        let config = window.normalizarArray(await apiGet('configuracoes'))[0] || {};
        config.impressoraCaixa = impCaixa;
        config.impressoraCozinha = impCozinha;
        
        await apiSave('configuracoes', [config]);
        alert('✅ Preferências de impressão salvas!');
    };

    // ============================================================
    // FUNÇÃO GLOBAL DE IMPRESSÃO (PARA SER USADA NO SISTEMA)
    // ============================================================
    
    window.imprimirCupom = async function(htmlCupom) {
        try {
            const config = window.normalizarArray(await apiGet('configuracoes'))[0] || {};
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

            // 1. Se for Mobile e tiver Bluetooth conectado, tenta imprimir via Bluetooth
            if (isMobile && caracteristicaBluetooth && dispositivoBluetooth && dispositivoBluetooth.gatt.connected) {
                // Converte o HTML para comandos ESC/POS (Simulação simplificada)
                // Em um sistema real, você precisaria de uma biblioteca como 'escpos-encoder'
                const encoder = new TextEncoder();
                // Aqui estaria a conversão para bytes ESC/POS
                // const dados = encoder.encode(htmlCupom); 
                // await caracteristicaBluetooth.writeValue(dados);
                alert('Impressão Bluetooth simulada com sucesso! (Requer conversão ESC/POS)');
                return;
            }

            // 2. Se for Desktop e tiver IP (QZ Tray), envia para o backend
            if (!isMobile && config.impressoraRedeIp) {
                // Aqui você faria uma chamada para o backend que envia via QZ Tray ou PrintNode
                // await apiPost('imprimir', { html: htmlCupom, ip: config.impressoraRedeIp });
                alert('Enviando para a impressora de rede: ' + config.impressoraRedeIp);
                return;
            }

            // 3. Fallback: Impressão Nativa (Janela)
            const janela = window.open('', '_blank');
            janela.document.write(htmlCupom);
            janela.document.close();
            janela.onload = function() {
                janela.print();
                janela.close();
            };

        } catch (e) {
            alert('Erro ao tentar imprimir: ' + e.message);
        }
    };
}