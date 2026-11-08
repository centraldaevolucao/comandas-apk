// ============================================================
// PIX.JS — Cadastro do PIX do Restaurante (para recibos)
// ============================================================

console.log('✔ Pix.js carregado');

if (window.renderPIX) {
    console.log('⚠️ Pix.js já carregado');
} else {
    window._chavePixRestaurante = '';

    window.renderPIX = function() {
        setTimeout(carregarPix, 50);

        return [
            '<div class="app-bar">',
            '    <button class="icon-btn" onclick="navigateTo(\'configuracoes\')"><i class="fas fa-arrow-left"></i></button>',
            '    <h1>PIX do Restaurante</h1>',
            '    <div style="width:40px;"></div>',
            '</div>',
            '<div class="content-area" id="pix-conteudo" style="padding:16px;">',
            '    <p class="empty-state">🔄 Carregando...</p>',
            '</div>'
        ].join('\n');
    };

    async function carregarPix() {
        const container = document.getElementById('pix-conteudo');
        if (!container) return;

        try {
            let config = {};
            try {
                const configArr = await apiGet('configuracoes');
                const arr = window.normalizarArray(configArr);
                config = arr[0] || {};
            } catch (e) {}

            window._chavePixRestaurante = config.pixRestaurante || '';
            window._pixCfg = config;
            const exibirRecibo = config.exibirPixRecibo || false;

            let html = '';

            html += '<div class="card" style="background:#FCE4EC; padding:20px; border-radius:12px; margin-bottom:16px; border-left:4px solid #C2185B; box-shadow:0 4px 12px rgba(106,27,154,0.1);">';
            html += '    <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">';
            html += '        <i class="fas fa-qrcode" style="color:#C2185B; font-size:1.4rem;"></i>';
            html += '        <strong style="color:#C2185B; font-size:1rem;">Configuração do PIX (Vendas)</strong>';
            html += '    </div>';
            
            html += '    <div class="field" style="margin-bottom:16px;">';
            html += '        <label style="font-size:0.85rem; font-weight:600; color:#333;">Chave PIX do Restaurante</label>';
            html += '        <button class="btn-outline" style="width:100%; justify-content:center; padding:12px; border-color:' + (window._chavePixRestaurante ? '#4caf50' : '#c62828') + '; color:' + (window._chavePixRestaurante ? '#2e7d32' : '#c62828') + '; display:flex; align-items:center; gap:8px;" onclick="abrirModalPixConfig()">';
            if (window._chavePixRestaurante) {
                html += '            <i class="fas fa-check-circle"></i> Chave PIX Cadastrada <i class="fas fa-edit" style="margin-left:auto;"></i>';
            } else {
                html += '            <i class="fas fa-plus-circle"></i> Cadastrar Chave PIX <i class="fas fa-edit" style="margin-left:auto;"></i>';
            }
            html += '        </button>';
            html += '    </div>';

            html += '    <div class="card-row" style="border-top:1px solid #e0c8e8; padding-top:12px;">';
            html += '        <div>';
            html += '            <strong style="font-size:0.9rem;">Exibir QR Code no Recibo</strong>';
            html += '            <small style="color:#888;font-size:0.75rem;display:block;">Se ativo, imprime o QR Code PIX com o valor no final do recibo do cliente.</small>';
            html += '        </div>';
            html += '        <label class="toggle"><input type="checkbox" id="pix-exibir-recibo" ' + (exibirRecibo ? 'checked' : '') + ' onchange="salvarConfigPixSimples()"><span class="slider"></span></label>';
            html += '    </div>';
            html += '</div>';

            if (window._chavePixRestaurante) {
                html += '<div class="card" style="background:#fff; padding:16px;">';
                html += '    <label style="font-size:0.8rem; font-weight:600; color:#333; margin-bottom:4px; display:block;">Pix Copia e Cola (Base)</label>';
                html += '    <textarea readonly style="width:100%; height:60px; padding:10px; border:1px solid #ddd; border-radius:8px; font-size:0.7rem; font-family:monospace; background:#f9f9f9; color:#555; resize:none;">' + window._chavePixRestaurante + '</textarea>';
                html += '</div>';
            }

            container.innerHTML = html;
        } catch (e) {
            console.error('Erro ao carregar Pix:', e);
            container.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro: ' + e.message + '</p>';
        }
    }

    window.abrirModalPixConfig = function() {
        const anterior = document.getElementById('modal-pix-config');
        if (anterior) anterior.remove();

        const modal = document.createElement('div');
        modal.id = 'modal-pix-config';
        modal.className = 'modal-overlay';
        modal.style.zIndex = '99999';
        modal.onclick = function (e) { if (e.target === modal) fecharModalPixConfig(); };

        // CABEÇALHO REESTRUTURADO: flex: 1 no título e botão sem 'position:absolute'
        modal.innerHTML =
            '<div class="modal-content" style="max-width:480px; border-radius: 16px;">' +
            '    <div class="modal-header" style="background: #C2185B; color:#fff; border-radius: 16px 16px 0 0; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center;">' +
            '        <strong style="font-size: 1.1rem; flex: 1; margin: 0;"><i class="fas fa-key"></i> PIX do Restaurante</strong>' +
            '        <button type="button" class="btn-limpar" onclick="fecharModalPixConfig()" style="color:#fff; background: transparent; border: none; padding: 5px; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 50%;"><i class="fas fa-xmark" style="font-size: 1.2rem;"></i></button>' +
            '    </div>' +
            '    <div class="modal-body" style="padding: 20px;">' +
                        '        <button type="button" class="btn-outline" style="width:100%;margin-bottom:12px;border-color:#C2185B;color:#C2185B;" onclick="pixLerQrImagem()"><i class="fas fa-qrcode"></i> Ler QR Code do PIX (imagem do aparelho)</button>' +
            '        <div class="field"><label>Tipo da chave</label>' +
            '            <select id="pix-tipo" onchange="pixTrocouTipo()" style="width:100%;padding:10px;border:1.5px solid #ccc;border-radius:8px;">' +
            '                <option value="cpf">CPF</option><option value="cnpj">CNPJ</option><option value="celular">Celular</option><option value="email">E-mail</option><option value="aleatoria">Chave aleatória</option><option value="copiacola">Colar "Copia e Cola" do banco</option>' +
            '            </select></div>' +
            '        <div class="field"><label id="pix-label">Chave PIX</label>' +
            '            <textarea id="input-modal-pix" style="width:100%; height:70px; padding:10px; border:1.5px solid #ccc; border-radius:8px; font-size:0.9rem; font-family:monospace; resize:none;"></textarea>' +
            '            <small id="pix-erro" style="color:#c62828;display:none;"></small>' +
            '        </div>' +
            '        <div class="field"><label>Nome do recebedor (aparece no PIX)</label><input type="text" id="pix-nome" maxlength="25" style="width:100%;padding:10px;border:1.5px solid #ccc;border-radius:8px;"></div>' +
            '        <div class="field"><label>Cidade</label><input type="text" id="pix-cidade" maxlength="15" style="width:100%;padding:10px;border:1.5px solid #ccc;border-radius:8px;"></div>' +
'        <button class="btn-primary" style="background:#C2185B; width:100%; padding:14px; margin-top:10px;" onclick="salvarChavePixConfig()">' +
            '            <i class="fas fa-check"></i> Confirmar Chave' +
            '        </button>' +
            '    </div>' +
            '</div>';

        document.body.appendChild(modal);
        setTimeout(function() { const el = document.getElementById('input-modal-pix'); if (el) el.focus(); }, 100);
    };

    window.fecharModalPixConfig = function() {
        const m = document.getElementById('modal-pix-config');
        if (m) m.remove();
    };

    window.pixLerQrImagem = function () {
        window.escolherImagemDoDispositivo(1600, async function (dataUrl) {
            const erro = document.getElementById('pix-erro');
            const txt = await window.lerQrDeImagem(dataUrl);
            const d = window.pixLerPayload(txt);
            if (!d) { erro.textContent = txt ? 'Esse QR Code não é um PIX.' : 'Não consegui ler um QR Code nessa imagem. Use um print nítido do QR do seu banco ou digite a chave.'; erro.style.display = 'block'; return; }
            erro.style.display = 'none';
            document.getElementById('pix-tipo').value = 'copiacola';
            window.pixTrocouTipo();
            document.getElementById('input-modal-pix').value = d.payload;
            if (d.nome) document.getElementById('pix-nome').value = d.nome;
            if (d.cidade) document.getElementById('pix-cidade').value = d.cidade;
            window._pixLido = d;
            alert('✅ QR lido. Chave: ' + (d.chave || '(não identificada)') + (d.nome ? '\nRecebedor: ' + d.nome : '') + '\nConfira e toque em Salvar.');
        });
    };

    window.pixTrocouTipo = function () {
        const t = document.getElementById('pix-tipo').value;
        const ph = { cpf: '000.000.000-00', cnpj: '00.000.000/0000-00', celular: '(11) 91234-5678', email: 'nome@email.com', aleatoria: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', copiacola: '00020126...' }[t];
        const i = document.getElementById('input-modal-pix'); if (i) i.placeholder = ph;
    };

    window.salvarChavePixConfig = async function() {
        const input = document.getElementById('input-modal-pix');
        if (!input) return;
        const tipo = document.getElementById('pix-tipo').value;
        const erro = document.getElementById('pix-erro');
        const mostrarErro = function (m) { erro.textContent = m; erro.style.display = 'block'; };
        const valor = input.value.trim();
        const nome = (document.getElementById('pix-nome').value || '').trim();
        const cidade = (document.getElementById('pix-cidade').value || '').trim();
        if (tipo === 'copiacola') {
            if (!/^000201/.test(valor) || !/6304[0-9A-Fa-f]{4}$/.test(valor)) return mostrarErro('Texto "Copia e Cola" inválido (deve começar com 000201 e terminar com o CRC).');
            const lido = window.pixLerPayload(valor) || {};
            window._pixNovo = { pixTipo: lido.tipo || 'copiacola', pixChave: lido.chave || '', pixRestaurante: valor, pixNome: nome || lido.nome || '', pixCidade: cidade || lido.cidade || '' };
        } else {
            const v = window.pixValidarChave(tipo, valor);
            if (!v.ok) return mostrarErro(v.msg);
            if (!nome) return mostrarErro('Informe o nome do recebedor.');
            window._pixNovo = { pixTipo: tipo, pixChave: v.chave, pixRestaurante: window.pixMontarPayload(v.chave, nome, cidade), pixNome: nome, pixCidade: cidade };
        }
        window._chavePixRestaurante = window._pixNovo.pixRestaurante;
        fecharModalPixConfig();
        await salvarConfigPixSimples();
    };

    window.salvarConfigPixSimples = async function() {
        try {
            let config = {};
            try {
                const configArr = await apiGet('configuracoes');
                const arr = window.normalizarArray(configArr);
                config = arr[0] || {};
            } catch (e) {}

            config.pixRestaurante = window._chavePixRestaurante;
            if (window._pixNovo) { Object.assign(config, window._pixNovo); window._pixNovo = null; }
            
            const chkRecibo = document.getElementById('pix-exibir-recibo');
            if (chkRecibo) { config.exibirPixRecibo = chkRecibo.checked; config.pixQrImpressao = chkRecibo.checked; config.pixQrComandaImp = chkRecibo.checked; config.pixQrReciboImp = chkRecibo.checked; }

            await apiSave('configuracoes', [config]);

            if (typeof window.mostrarToast === 'function') {
                window.mostrarToast('✅ PIX do Restaurante salvo');
            } else {
                alert('✅ PIX do Restaurante salvo');
            }
            carregarPix();
        } catch (e) {
            alert('Erro ao salvar PIX: ' + e.message);
        }
    };

    console.log('✔ Pix.js carregado');
}