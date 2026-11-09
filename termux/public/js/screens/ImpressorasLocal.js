// ============================================================
// IMPRESSORASLOCAL.JS — Impressoras por local via data/impressoras.json
// ============================================================

console.log('✔ ImpressorasLocal.js carregado');

if (window.renderImpressorasporLocal) {
    console.log('⚠️ ImpressorasLocal.js já carregado');
} else {
    async function lerImpressoras() {
        try {
            const dados = await apiGet('impressoras');
            if (dados && typeof dados === 'object' && !Array.isArray(dados)) {
                return {
                    salvas: Array.isArray(dados.salvas) ? dados.salvas : [],
                    geral: dados.geral || null,
                    porLocal: dados.porLocal || { cozinha: null, bar: null, outros: null }
                };
            }
            return { salvas: [], geral: null, porLocal: { cozinha: null, bar: null, outros: null } };
        } catch (e) {
            return { salvas: [], geral: null, porLocal: { cozinha: null, bar: null, outros: null } };
        }
    }

    async function gravarImpressoras(dados) {
        try {
            const atual = await lerImpressoras();
            await apiSave('impressoras', Object.assign({}, atual, dados));
        } catch (e) {
            console.error('Erro ao gravar impressoras:', e);
        }
    }

    window.renderImpressorasporLocal = function() {
        setTimeout(carregarImpLocal, 50);
        return [
            '<div class="app-bar">',
            '    <button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button>',
            '    <h1>Impressoras por Local</h1>',
            '    <div style="width:40px;"></div>',
            '</div>',
            '<div class="content-area" id="imp-local-conteudo" style="padding:12px;">',
            '    <p class="empty-state">🔄 Carregando...</p>',
            '</div>'
        ].join('\n');
    };

    async function carregarImpLocal() {
        const container = document.getElementById('imp-local-conteudo');
        if (!container) return;

        const locais = [
            { id: 'cozinha', label: 'Cozinha', icone: 'fa-utensils' },
            { id: 'bar',     label: 'Bar',     icone: 'fa-wine-glass' },
            { id: 'outros',  label: 'Outros',  icone: 'fa-map-marker-alt' }
        ];

        const impressoras = await lerImpressoras();
        const mapaSalvo = impressoras.porLocal || {};
        const lista = impressoras.salvas || [];

        let html = '';

        html += '<div class="card" style="background:#FCE4EC;">';
        html += '    <div style="font-size:0.85rem;color:#333;line-height:1.5;">';
        html += '        <i class="fas fa-info-circle" style="color:#C2185B;"></i>';
        html += '        Ative uma impressora diferente para cada local. Se o local não tiver impressora vinculada, será usada a impressora geral.';
        html += '    </div>';
        html += '</div>';

        locais.forEach(function(loc) {
            const nomeVinculado = mapaSalvo[loc.id] || '';
            const impVinculada = lista.find(function(i) { return i.nome === nomeVinculado; });

            html += '<div class="card">';
            html += '    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">';
            html += '        <div style="width:36px;height:36px;border-radius:50%;background:#C2185B20;display:flex;align-items:center;justify-content:center;">';
            html += '            <i class="fas ' + loc.icone + '" style="color:#C2185B;"></i>';
            html += '        </div>';
            html += '        <div style="font-weight:600;font-size:0.95rem;">' + loc.label + '</div>';
            html += '    </div>';

            html += '    <div class="field" style="margin-bottom:8px;">';
            html += '        <label>Impressora vinculada</label>';
            html += '        <select onchange="vincularImpressoraLocal(\'' + loc.id + '\', this.value)" style="width:100%;padding:10px;border:1.5px solid #ccc;border-radius:8px;font-family:var(--font-family);">';
            html += '            <option value="">-- Usar impressora geral --</option>';
            lista.forEach(function(i) {
                const sel = i.nome === nomeVinculado ? ' selected' : '';
                html += '<option value="' + i.nome + '"' + sel + '>' + i.nome + '</option>';
            });
            html += '        </select>';
            html += '    </div>';

            html += '    <div style="display:flex;gap:6px;">';
            html += '        <button class="btn-outline" style="flex:1;font-size:0.8rem;padding:8px;" onclick="testarImpressoraLocal(\'' + loc.id + '\')"><i class="fas fa-vial"></i> Testar</button>';
            html += '        <button class="btn-outline" style="flex:1;font-size:0.8rem;padding:8px;border-color:#c62828;color:#c62828;" onclick="limparImpressoraLocal(\'' + loc.id + '\')"><i class="fas fa-times"></i> Limpar</button>';
            html += '    </div>';

            if (impVinculada) {
                html += '    <div style="font-size:0.72rem;color:#2e7d32;margin-top:8px;">';
                html += '        ✓ Vinculada a: <b>' + impVinculada.nome + '</b>';
                html += '    </div>';
            }

            html += '</div>';
        });

        container.innerHTML = html;
    }

    window.vincularImpressoraLocal = async function(local, nomeImpressora) {
        const impressoras = await lerImpressoras();
        const porLocal = impressoras.porLocal || {};

        if (nomeImpressora) {
            porLocal[local] = nomeImpressora;
            if (typeof window.mostrarToast === 'function') window.mostrarToast('✅ Impressora vinculada ao ' + local);
        } else {
            delete porLocal[local];
        }

        await gravarImpressoras({ porLocal: porLocal });
        carregarImpLocal();
    };

    window.limparImpressoraLocal = async function(local) {
        if (!await window.confirmar('Remover vínculo de impressora deste local?')) return;
        vincularImpressoraLocal(local, '');
    };

    window.testarImpressoraLocal = async function(local) {
        const impressoras = await lerImpressoras();
        const nome = (impressoras.porLocal || {})[local];

        if (!nome) { alert('Nenhuma impressora vinculada. Será usada a impressora geral.'); return; }

        const idx = (impressoras.salvas || []).findIndex(function(i) { return i.nome === nome; });
        if (idx < 0) { alert('Impressora não encontrada'); return; }

        if (typeof window.testarImpressora === 'function') window.testarImpressora(idx);
    };

    console.log('✔ ImpressorasLocal.js — pronto');
}