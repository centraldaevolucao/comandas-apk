/* Ordenação de produtos (Produtos e Cardápio): A-Z, Z-A, preço, mais/menos pedidos, promoção. */
(function () {
    'use strict';
    const cmp = function (a, b) { return String(a || '').localeCompare(String(b || ''), 'pt-BR', { sensitivity: 'base', numeric: true }); };
    window.ORDENS_PRODUTO = [
        ['padrao', 'Favoritos + A → Z'], ['az', 'A → Z'], ['za', 'Z → A'],
        ['preco-maior', 'Maior preço'], ['preco-menor', 'Menor preço'],
        ['mais-pedidos', 'Mais pedidos'], ['menos-pedidos', 'Menos pedidos'],
        ['promocao', 'Promoções primeiro'], ['grupo', 'Por grupo']
    ];
    let cache = null, quando = 0;
    // Quantidade vendida por produto (id e nome), somando todas as comandas não canceladas.
    window.popularidadeProdutos = async function () {
        if (cache && Date.now() - quando < 60000) return cache;
        const mapa = {};
        try {
            window.normalizarArray(await apiGet('comandas')).forEach(function (c) {
                if (c.status === 'cancelada') return;
                window.normalizarArray(c.itens).forEach(function (i) {
                    const q = Number(i.quantidade || 0);
                    if (i.produtoId != null) mapa['id:' + i.produtoId] = (mapa['id:' + i.produtoId] || 0) + q;
                    if (i.nome) mapa['n:' + String(i.nome).toLowerCase()] = (mapa['n:' + String(i.nome).toLowerCase()] || 0) + q;
                });
            });
        } catch (e) {}
        cache = mapa; quando = Date.now();
        return mapa;
    };
    const vendidos = function (p, pop) { return (pop && (pop['id:' + p.id] != null ? pop['id:' + p.id] : pop['n:' + String(p.nome || '').toLowerCase()])) || 0; };
    const preco = function (p) { return (p.promocaoAtiva && Number(p.precoPromocional) > 0) ? Number(p.precoPromocional) : Number(p.valorVenda || 0); };
    window.ordenarProdutos = function (lista, ordem, pop, nomeGrupo) {
        const f = {
            az: function (a, b) { return cmp(a.nome, b.nome); },
            za: function (a, b) { return cmp(b.nome, a.nome); },
            'preco-maior': function (a, b) { return preco(b) - preco(a) || cmp(a.nome, b.nome); },
            'preco-menor': function (a, b) { return preco(a) - preco(b) || cmp(a.nome, b.nome); },
            'mais-pedidos': function (a, b) { return vendidos(b, pop) - vendidos(a, pop) || cmp(a.nome, b.nome); },
            'menos-pedidos': function (a, b) { return vendidos(a, pop) - vendidos(b, pop) || cmp(a.nome, b.nome); },
            promocao: function (a, b) { return (b.promocaoAtiva ? 1 : 0) - (a.promocaoAtiva ? 1 : 0) || cmp(a.nome, b.nome); },
            grupo: function (a, b) { return cmp(nomeGrupo ? nomeGrupo(a.grupo) : a.grupo, nomeGrupo ? nomeGrupo(b.grupo) : b.grupo) || cmp(a.nome, b.nome); }
        }[ordem] || function (a, b) { return (b.favorito ? 1 : 0) - (a.favorito ? 1 : 0) || cmp(a.nome, b.nome); };
        return lista.slice().sort(f);
    };
    window.seletorOrdemProdutos = function (atual, handler) {
        return '<div style="padding:0 16px 10px;display:flex;align-items:center;gap:8px;"><label style="font-size:0.8rem;color:#666;white-space:nowrap;"><i class="fas fa-arrow-down-a-z"></i> Ordenar</label>' +
            '<select id="ordem-produtos" onchange="' + handler + '(this.value)" style="flex:1;padding:10px;border:1.5px solid #ccc;border-radius:8px;font-family:var(--font-family);">' +
            window.ORDENS_PRODUTO.map(function (o) { return '<option value="' + o[0] + '"' + (atual === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>';
    };
})();
