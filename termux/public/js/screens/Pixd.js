// ============================================================
// PIXD.JS — Cadastro do PIX do Desenvolvedor (Assinatura)
// ============================================================

console.log('✔ Pixd.js carregado');

if (window.renderPIXD) {
    console.log('⚠️ Pixd.js já carregado');
} else {
    window._chavePixDev = '';

    window.renderPIXD = function() {
        setTimeout(carregarPixD, 50);

        return [
            '<div class="app-bar" style="background:#111; color:#fff;">',
            '    <button class="icon-btn" onclick="navigateTo(\'admin-assinaturas\')" style="color:#fff;"><i class="fas fa-arrow-left"></i></button>',
            '    <h1>PIX da Assinatura (Dev)</h1>',
            '    <div style="width:40px;"></div>',
            '</div>',
            '<div class="content-area" id="pixd-conteudo" style="padding:16px; background:#f5f5f5;">',
            '    <p class="empty-state">🔄 Carregando...</p>',
            '</div>'
        ].join('\n');
    };

    async function carregarPixD() {
        const container = document.getElementById('pixd-conteudo');
        if (!container) return;

        try {
            let config = {};
            try {
                const configArr = await apiGet('configuracoes');
                const arr = window.normalizarArray(configArr);
                config = arr[0] || {};
            } catch (e) {}

            window._chavePixDev = config.pixAssinatura || '';

            let html = '';

            html += '<div class="card" style="background:#fff; padding:20px; border-radius:12px; margin-bottom:16px; border-left:4px solid #1976d2; box-shadow:0 4px 12px rgba(25,118,210,0.1);">';
            html += '    <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">';
            html += '        <i class="fas fa-shield-alt" style="color:#1976d2; font-size:1.4rem;"></i>';
            html += '        <strong style="color:#1976d2; font-size:1rem;">Chave PIX para Receber Assinaturas</strong>';
            html += '    </div>';
            
            html += '    <div class="field" style="margin-bottom:16px;">';
            html += '        <button class="btn-outline" style="width:100%; justify-content:center; padding:12px; border-color:' + (window._chavePixDev ? '#1976d2' : '#c62828') + '; color:' + (window._chavePixDev ? '#1976d2' : '#c62828') + '; display:flex; align-items:center; gap:8px;" onclick="abrirModalPixD()">';
            if (window._chavePixDev) {
                html += '            <i class="fas fa-check-circle"></i> Chave PIX Cadastrada <i class="fas fa-edit" style="margin-left:auto;"></i>';
            } else {
                html += '            <i class="fas fa-plus-circle"></i> Cadastrar Chave PIX <i class="fas fa-edit" style="margin-left:auto;"></i>';
            }
            html += '        </button>';
            html += '    </div>';
            html += '</div>';

            if (window._chavePixDev) {
                html += '<div class="card" style="background:#fff; padding:16px;">';
                html += '    <label style="font-size:0.8rem; font-weight:600; color:#333; margin-bottom:4px; display:block;">Pix Copia e Cola (Base)</label>';
                html += '    <textarea readonly style="width:100%; height:60px; padding:10px; border:1px solid #ddd; border-radius:8px; font-size:0.7rem; font-family:monospace; background:#f9f9f9; color:#555; resize:none;">' + window._chavePixDev + '</textarea>';
                html += '</div>';
            }

            container.innerHTML = html;
        } catch (e) {
            console.error('Erro ao carregar PixD:', e);
            container.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro: ' + e.message + '</p>';
        }
    }

    window.abrirModalPixD = function() {
        const anterior = document.getElementById('modal-pixd');
        if (anterior) anterior.remove();

        const modal = document.createElement('div');
        modal.id = 'modal-pixd';
        modal.className = 'modal-overlay';
        modal.style.zIndex = '99999';
        modal.onclick = function (e) { if (e.target === modal) fecharModalPixD(); };

        // CABEÇALHO REESTRUTURADO: flex: 1 no título e botão sem 'position:absolute'
        modal.innerHTML =
            '<div class="modal-content" style="max-width:480px; border-radius: 16px;">' +
            '    <div class="modal-header" style="background: #1976d2; color:#fff; border-radius: 16px 16px 0 0; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center;">' +
            '        <strong style="font-size: 1.1rem; flex: 1; margin: 0;"><i class="fas fa-key"></i> PIX do Desenvolvedor</strong>' +
            '        <button type="button" class="btn-limpar" onclick="fecharModalPixD()" style="color:#fff; background: transparent; border: none; padding: 5px; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 50%;"><i class="fas fa-xmark" style="font-size: 1.2rem;"></i></button>' +
            '    </div>' +
            '    <div class="modal-body" style="padding: 20px;">' +
            '        <p style="font-size:0.85rem; color:#666; margin-bottom:15px;">' +
            '            Cole a string completa do PIX (Copia e Cola) da sua conta pessoal/empresa.' +
            '        </p>' +
            '        <div class="field">' +
            '            <label>Chave PIX ou String Copia e Cola</label>' +
            '            <textarea id="input-modal-pixd" style="width:100%; height:100px; padding:10px; border:1.5px solid #ccc; border-radius:8px; font-size:0.8rem; font-family:monospace; resize:none;">' + window._chavePixDev + '</textarea>' +
            '        </div>' +
            '        <button class="btn-primary" style="background:#1976d2; width:100%; padding:14px; margin-top:10px;" onclick="salvarChavePixD()">' +
            '            <i class="fas fa-check"></i> Confirmar Chave' +
            '        </button>' +
            '    </div>' +
            '</div>';

        document.body.appendChild(modal);
        setTimeout(function() { const el = document.getElementById('input-modal-pixd'); if (el) el.focus(); }, 100);
    };

    window.fecharModalPixD = function() {
        const m = document.getElementById('modal-pixd');
        if (m) m.remove();
    };

    window.salvarChavePixD = async function() {
        const input = document.getElementById('input-modal-pixd');
        if (!input) return;
        
        const novaChave = input.value.trim();
        window._chavePixDev = novaChave;
        
        fecharModalPixD();
        
        try {
            let config = {};
            try {
                const configArr = await apiGet('configuracoes');
                const arr = window.normalizarArray(configArr);
                config = arr[0] || {};
            } catch (e) {}

            config.pixAssinatura = window._chavePixDev;

            await apiSave('configuracoes', [config]);

            if (typeof window.mostrarToast === 'function') {
                window.mostrarToast('✅ PIX do Desenvolvedor salvo');
            }
            carregarPixD();
        } catch (e) {
            alert('Erro ao salvar PIX: ' + e.message);
        }
    };

    console.log('✔ Pixd.js carregado');
}