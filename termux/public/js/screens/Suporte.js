// ============================================================
// SUPORTE.JS — Contato e informações de suporte
// ============================================================

console.log('✔ Suporte.js carregado');

if (window.renderSuporte) {
    console.log('⚠️ Suporte.js já carregado');
} else {
    window.renderSuporte = function() {
        return [
            '<div class="app-bar">',
            '    <button class="icon-btn" onclick="navigateTo(\'comandas\')"><i class="fas fa-arrow-left"></i></button>',
            '    <h1>Suporte</h1>',
            '    <div style="width:40px;"></div>',
            '</div>',

            '<div class="content-area" style="padding:12px;">',

            // Cabeçalho
            '    <div style="text-align:center;padding:30px 20px;background:linear-gradient(135deg, #1976d2 0%, #0d47a1 100%);color:#fff;border-radius:12px;margin-bottom:16px;">',
            '        <i class="fas fa-headset" style="font-size:3rem;opacity:0.9;"></i>',
            '        <h2 style="margin-top:12px;font-size:1.3rem;">Como podemos ajudar?</h2>',
            '        <p style="margin-top:8px;font-size:0.85rem;opacity:0.9;line-height:1.5;">',
            '            Nossa equipe está pronta para resolver qualquer dúvida ou problema.',
            '        </p>',
            '    </div>',

            // Canais
            '    <div class="card">',
            '        <div class="card-title"><i class="fas fa-comments"></i> Fale conosco</div>',

            '        <a href="https://wa.me/5511999999999?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20o%20app" target="_blank" ' +
            '           style="display:flex;align-items:center;gap:14px;padding:14px 0;text-decoration:none;color:inherit;border-bottom:1px solid #f0f0f0;">',
            '            <div style="width:44px;height:44px;border-radius:50%;background:#25d36620;display:flex;align-items:center;justify-content:center;flex-shrink:0;">',
            '                <i class="fab fa-whatsapp" style="color:#25d366;font-size:1.3rem;"></i>',
            '            </div>',
            '            <div style="flex:1;">',
            '                <div style="font-weight:600;">WhatsApp</div>',
            '                <div style="font-size:0.78rem;color:#666;">(11) 99999-9999 · Resposta rápida</div>',
            '            </div>',
            '            <i class="fas fa-external-link-alt" style="color:#ccc;"></i>',
            '        </a>',

            '        <a href="mailto:suporte@restauranteapp.com" ' +
            '           style="display:flex;align-items:center;gap:14px;padding:14px 0;text-decoration:none;color:inherit;border-bottom:1px solid #f0f0f0;">',
            '            <div style="width:44px;height:44px;border-radius:50%;background:#1976d220;display:flex;align-items:center;justify-content:center;flex-shrink:0;">',
            '                <i class="fas fa-envelope" style="color:#1976d2;font-size:1.3rem;"></i>',
            '            </div>',
            '            <div style="flex:1;">',
            '                <div style="font-weight:600;">E-mail</div>',
            '                <div style="font-size:0.78rem;color:#666;">suporte@restauranteapp.com</div>',
            '            </div>',
            '            <i class="fas fa-external-link-alt" style="color:#ccc;"></i>',
            '        </a>',

            '        <a href="tel:+551140028922" ' +
            '           style="display:flex;align-items:center;gap:14px;padding:14px 0;text-decoration:none;color:inherit;">',
            '            <div style="width:44px;height:44px;border-radius:50%;background:#ff980020;display:flex;align-items:center;justify-content:center;flex-shrink:0;">',
            '                <i class="fas fa-phone" style="color:#ff9800;font-size:1.3rem;"></i>',
            '            </div>',
            '            <div style="flex:1;">',
            '                <div style="font-weight:600;">Telefone</div>',
            '                <div style="font-size:0.78rem;color:#666;">(11) 4002-8922 · Seg-Sex 9h-18h</div>',
            '            </div>',
            '            <i class="fas fa-external-link-alt" style="color:#ccc;"></i>',
            '        </a>',
            '    </div>',

            // FAQ
            '    <div class="card">',
            '        <div class="card-title"><i class="fas fa-question-circle"></i> Perguntas frequentes</div>',

            '        <details style="padding:10px 0;border-bottom:1px solid #f0f0f0;">',
            '            <summary style="cursor:pointer;font-weight:600;font-size:0.9rem;">Como faço backup dos meus dados?</summary>',
            '            <p style="margin-top:8px;font-size:0.85rem;color:#666;line-height:1.5;">',
            '                Acesse <b>Configurações → Backup</b>. O sistema gera um arquivo .json com todos os dados.',
            '            </p>',
            '        </details>',

            '        <details style="padding:10px 0;border-bottom:1px solid #f0f0f0;">',
            '            <summary style="cursor:pointer;font-weight:600;font-size:0.9rem;">Como gerar o QR Code das mesas?</summary>',
            '            <p style="margin-top:8px;font-size:0.85rem;color:#666;line-height:1.5;">',
            '                Menu → <b>QR Codes das Mesas</b>. Você pode imprimir individualmente ou todos de uma vez.',
            '            </p>',
            '        </details>',

            '        <details style="padding:10px 0;border-bottom:1px solid #f0f0f0;">',
            '            <summary style="cursor:pointer;font-weight:600;font-size:0.9rem;">Não consigo fechar o caixa</summary>',
            '            <p style="margin-top:8px;font-size:0.85rem;color:#666;line-height:1.5;">',
            '                Verifique se todas as comandas estão finalizadas. O sistema bloqueia o fechamento enquanto houver comandas em aberto.',
            '            </p>',
            '        </details>',

            '        <details style="padding:10px 0;">',
            '            <summary style="cursor:pointer;font-weight:600;font-size:0.9rem;">Como alterar minha assinatura?</summary>',
            '            <p style="margin-top:8px;font-size:0.85rem;color:#666;line-height:1.5;">',
            '                Menu → <b>Assinatura do app</b>. Lá você encontra os planos disponíveis e pode renovar ou cancelar.',
            '            </p>',
            '        </details>',
            '    </div>',

            // Horário
            '    <div class="card" style="background:#e8f5e9;">',
            '        <div class="card-title" style="color:#2e7d32;"><i class="fas fa-clock"></i> Horário de atendimento</div>',
            '        <div style="font-size:0.9rem;color:#555;line-height:1.6;">',
            '            <div style="display:flex;justify-content:space-between;padding:3px 0;"><span>Segunda a sexta</span><strong>9h às 18h</strong></div>',
            '            <div style="display:flex;justify-content:space-between;padding:3px 0;"><span>Sábado</span><strong>9h às 13h</strong></div>',
            '            <div style="display:flex;justify-content:space-between;padding:3px 0;"><span>Domingo e feriados</span><strong>Fechado</strong></div>',
            '        </div>',
            '    </div>',

            // Versão
            '    <div style="text-align:center;padding:20px;font-size:0.75rem;color:#888;">',
            '        <div><i class="fas fa-code"></i> App Restaurante v1.0.0</div>',
            '        <div style="margin-top:4px;">© 2026 · Todos os direitos reservados</div>',
            '    </div>',

            '</div>'
        ].join('\n');
    };

    console.log('✔ Suporte.js carregado');
}