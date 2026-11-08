// ============================================================
// ATALHOS.JS — Menu Principal (Launcher para Celular)
// Ajuste: Remoção total do espaço no topo e alinhamento perfeito
// ============================================================

console.log('✔ Atalhos.js carregado');

if (!window.renderAtalhos) {
    window.renderAtalhos = function () {
        // O setTimeout busca a logo no SQLite e insere no HTML
        setTimeout(async () => {
            let logoHTML = '';

            try {
                const configArr = window.normalizarArray(await apiGet('configuracoes'));
                const config = configArr[0] || {};
                const urlLogo = config.urlLogo || '';

                if (urlLogo) {
                    logoHTML = `<img src="${urlLogo}" style="max-width: 100%; max-height: 100%; object-fit: contain; padding: 8px; box-sizing: border-box;">`;
                } else if (config.urlIcone) {
                    logoHTML = `<img src="${config.urlIcone}" style="max-width: 100%; max-height: 100%; object-fit: contain; padding: 8px; box-sizing: border-box;">`;
                } else {
                    logoHTML = `<i class="fas fa-utensils" style="font-size: 3rem; color: var(--primary-color);"></i>`;
                }
            } catch (e) {
                console.error('Erro ao carregar config:', e);
                logoHTML = `<i class="fas fa-utensils" style="font-size: 3rem; color: var(--primary-color);"></i>`;
            }

            const headerDiv = document.getElementById('home-logo-header');
            if (headerDiv) {
                headerDiv.innerHTML = `
                    <div style="width: 100%; height: 100px; background: #fff; border-radius: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); display: flex; align-items: center; justify-content: center; overflow: hidden; box-sizing: border-box;">
                        ${logoHTML}
                    </div>
                `;
            }
        }, 50);

        // HTML estrutural da tela
        return `
            <div class="app-bar">
                <button class="icon-btn" onclick="abrirMenu()"><i class="fas fa-bars"></i></button>
                <h1>Menu Principal</h1>
                <div style="width: 40px;"></div>
            </div>

            <!-- 
                🔒 FORÇANDO O CONTEÚDO A COLAR NA APPBAR 
                O 'padding-top: 15px !important' anula qualquer regra do global.css 
            -->
            <div class="content-area" style="padding: 15px 15px calc(40px + env(safe-area-inset-bottom, 20px)) 15px !important; background: #f4f4f4; margin: 0; overflow-x: hidden;">
                
                <!-- Container da Logo -->
                <div id="home-logo-header" style="width: 100%; display: block; margin: 0; padding: 0;"></div>

                <!-- Grade de Botões (O gap de 15px separa a logo do primeiro card) -->
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 15px;">
                    
                    <!-- PDV -->
                    <div onclick="navigateTo('pdv')" style="background: #fff; border-radius: 15px; padding: 20px 0; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.05); cursor: pointer; height: 100px; box-sizing: border-box;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: #e3f2fd; display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
                            <i class="fas fa-cash-register" style="font-size: 1.3rem; color: #1976d2;"></i>
                        </div>
                        <span style="font-weight: 600; color: #333; font-size: 0.9rem;">PDV</span>
                    </div>

                    <!-- Cozinha -->
                    <div onclick="navigateTo('cozinha')" style="background: #fff; border-radius: 15px; padding: 20px 0; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.05); cursor: pointer; height: 100px; box-sizing: border-box;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: #ffebee; display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
                            <i class="fas fa-fire" style="font-size: 1.3rem; color: #c62828;"></i>
                        </div>
                        <span style="font-weight: 600; color: #333; font-size: 0.9rem;">Cozinha</span>
                    </div>

                    <!-- Caixa -->
                    <div onclick="navigateTo('caixa')" style="background: #fff; border-radius: 15px; padding: 20px 0; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.05); cursor: pointer; height: 100px; box-sizing: border-box;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: #e8f5e9; display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
                            <i class="fas fa-money-bill-wave" style="font-size: 1.3rem; color: #2e7d32;"></i>
                        </div>
                        <span style="font-weight: 600; color: #333; font-size: 0.9rem;">Caixa</span>
                    </div>

                    <!-- Comandas -->
                    <div onclick="navigateTo('comandas')" style="background: #fff; border-radius: 15px; padding: 20px 0; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.05); cursor: pointer; height: 100px; box-sizing: border-box;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: #FCE4EC; display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
                            <i class="fas fa-clipboard-list" style="font-size: 1.3rem; color: #C2185B;"></i>
                        </div>
                        <span style="font-weight: 600; color: #333; font-size: 0.9rem;">Comandas</span>
                    </div>

                    <!-- Garçom -->
                    <div onclick="navigateTo('garcom')" style="background: #fff; border-radius: 15px; padding: 20px 0; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.05); cursor: pointer; height: 100px; box-sizing: border-box;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: #fff3e0; display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
                            <i class="fas fa-user-tie" style="font-size: 1.3rem; color: #e65100;"></i>
                        </div>
                        <span style="font-weight: 600; color: #333; font-size: 0.9rem;">Garçom</span>
                    </div>

                    <!-- Relatórios -->
                    <div onclick="navigateTo('relatorios')" style="background: #fff; border-radius: 15px; padding: 20px 0; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.05); cursor: pointer; height: 100px; box-sizing: border-box;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: #e0f7fa; display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
                            <i class="fas fa-chart-line" style="font-size: 1.3rem; color: #00838f;"></i>
                        </div>
                        <span style="font-weight: 600; color: #333; font-size: 0.9rem;">Relatórios</span>
                    </div>

                    <!-- Produtos -->
                    <div onclick="navigateTo('produtos')" style="background: #fff; border-radius: 15px; padding: 20px 0; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.05); cursor: pointer; height: 100px; box-sizing: border-box;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: #fce4ec; display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
                            <i class="fas fa-box" style="font-size: 1.3rem; color: #c2185b;"></i>
                        </div>
                        <span style="font-weight: 600; color: #333; font-size: 0.9rem;">Estoque</span>
                    </div>

                    <!-- Clientes -->
                    <div onclick="navigateTo('clientes')" style="background: #fff; border-radius: 15px; padding: 20px 0; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.05); cursor: pointer; height: 100px; box-sizing: border-box;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: #e8eaf6; display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
                            <i class="fas fa-users" style="font-size: 1.3rem; color: #3f51b5;"></i>
                        </div>
                        <span style="font-weight: 600; color: #333; font-size: 0.9rem;">Clientes</span>
                    </div>

                    <div onclick="navigateTo('pendencias')" style="background: #fff; border-radius: 15px; padding: 20px 0; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.05); cursor: pointer; height: 100px; box-sizing: border-box;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: #fff3e0; display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
                            <i class="fas fa-file-invoice-dollar" style="font-size: 1.3rem; color: #e65100;"></i>
                        </div>
                        <span style="font-weight: 600; color: #333; font-size: 0.9rem;">Pendências</span>
                    </div>

                    <div onclick="maquininhaConfigurar()" style="background: #fff; border-radius: 15px; padding: 20px 0; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.05); cursor: pointer; height: 100px; box-sizing: border-box;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: #fce4ec; display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
                            <i class="fas fa-credit-card" style="font-size: 1.3rem; color: #C2185B;"></i>
                        </div>
                        <span style="font-weight: 600; color: #333; font-size: 0.9rem;">Maquininha</span>
                    </div>

                </div>
            </div>
        `;
    };
}