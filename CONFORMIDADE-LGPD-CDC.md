# Conformidade LGPD / CDC — Restaurante-app 2.32.0

> **Isto é um trabalho técnico e não substitui a revisão de um advogado.** Os textos foram escritos a partir do que o app realmente faz. Se o app mudar, mude os textos (`js/legal.js`) e aumente `VERSAO_TERMOS` (em `server.py` e `legal.js`): todos terão de aceitar de novo.

## Tabela final (34 itens)
Legenda: **Feito** = aplicado e testado · **N/A** = não se aplica ao app (motivo) · **Depende de você** = falta decisão/dado seu.

| # | Item | Situação | O que mudou / motivo |
|---|------|----------|----------------------|
| 1 | Caixinha de aceite de Termos e Política | **Feito** | Tela "Antes de começar" bloqueia o uso até marcar Termos+Política e "tenho 18 anos". Vale também para o modo garçom. |
| 2 | Registrar data, hora e versão do aceite | **Feito** | `POST /api/aceite` grava (hora do servidor, versão, quem, o que aceitou) em `aceites`. Nova versão = novo aceite. |
| 3 | Conferir idade | **Feito** | Declaração obrigatória de 18+. O app é para estabelecimentos e não tem conteúdo adulto. |
| 4 | Consentimento dos pais (menores de 12) | **Feito (por bloqueio)** | Menores de 18 não podem usar; não coletamos dados de crianças. A Política avisa que, se o estabelecimento cadastrar menores, precisa do consentimento (art. 14 §1º). |
| 5 | Aceite separado de marketing, desmarcado | **Feito** | Caixa própria, desmarcada; revogável em "Privacidade e meus dados". Avaliação: autorização de WhatsApp também vem desmarcada. O app não envia marketing sozinho. |
| 6 | Parar de coletar dados desnecessários | **Feito** | Formulários conferidos: todos os campos têm uso; CPF é opcional (cardápio QR tem aviso e botão Pular). Nada precisou ser removido. |
| 7 | Bloquear rastreadores até aceitar + recusar tudo | **N/A** | Não há cookies de rastreio; só os essenciais (sessão 24 h e chave do aparelho do colaborador 30 dias). Um banner seria enganoso. A Política explica; se um dia entrar analytics, pedir consentimento antes. |
| 8 | Revisar SDKs/analytics/terceiros | **Feito** | Nenhum analytics/anúncio/SDK de rastreio. Ver inventário abaixo. |
| 9 | Não treinar IA com dados | **Feito** | O app não envia dados a IA. Declarado nos Termos e na Política. |
| 10 | Baixar dados e pedir exclusão (art. 18) | **Feito** | Menu "Privacidade e meus dados": baixar JSON, apagar dados pessoais; excluir cliente anonimiza as comandas. Pedidos por e-mail/WhatsApp, 15 dias. Fica só o que a lei exige (valores de vendas, 5 anos). |
| 11 | Senhas com hash; chaves fora do repositório | **Feito + Depende de você** | Senhas/resposta de segurança/senha mestre em PBKDF2-SHA256 com sal; senhas antigas migram no 1º login. Chave privada de licenças nunca vai ao Git (conferido). **Pendente:** a chave de assinatura do APK (`comandas.keystore`, senha `comandas123`) está no repositório por herança. Agora o build lê **GitHub Secrets** (`KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, opcional `KEY_ALIAS`). Passos: (1) `base64 -w0 comandas.keystore` → Secret `KEYSTORE_BASE64`; (2) Secret `KEYSTORE_PASSWORD` = `comandas123`; (3) rode o Actions e confirme o APK; (4) `git rm --cached comandas.keystore` e commit. A chave antiga continua no histórico do Git: se o repositório é/foi público, considere trocá-la (exige que os usuários reinstalem o app). Não fiz isso sozinho para não quebrar atualizações. |
| 12 | Roteiro de vazamento (ANPD em 3 dias úteis) | **Feito** | Roteiro abaixo; compromisso na Política. **Você** precisa definir quem executa. |
| 13 | Aviso de renovação automática | **N/A (e avisado)** | Não existe renovação/cobrança automática. A tela Assinatura e os Termos dizem isso claramente. |
| 14 | Cancelamento fácil no app | **N/A (e avisado)** | Não há assinatura recorrente: "cancelar" = não renovar. Reembolso: política e passo a passo (WhatsApp/e-mail). |
| 15 | Política de reembolso e 7 dias | **Feito** | Tela "Política de Reembolso": 7 dias de arrependimento (CDC art. 49) para toda compra + garantia extra de 35 dias (1 vez por cliente). A restrição "uma vez" vale só para a garantia extra, nunca para os 7 dias legais. |
| 16 | Sem taxa escondida / preço total | **Feito + Depende de você** | Tela mostra "Total a pagar" e "sem taxas adicionais". Confirme que isso é verdade (inclusive tarifas do seu banco no Pix). |
| 17 | Remover avaliação falsa | **N/A** | Não há depoimentos/avaliações de terceiros no app (a tela Avaliação é feedback enviado a você, não publicado). |
| 18 | Remover promessa que não dá para provar | **Feito** | Removidos: "Pacote para o contador", "NFC-e", "Nuvem, várias lojas", "Integrações" como itens inclusos (agora "em desenvolvimento, sem data"); selos "Mais popular" e "Melhor preço"; "O melhor custo-benefício"; "saber quanto você realmente lucra". |
| 19 | Remover selos de segurança que não tem | **Feito** | Nenhum SOC 2/ISO encontrado; "Pagamento seguro por Pix" virou "Pagamento por Pix". |
| 20 | Não prometer tempo no ar | **Feito** | Termos §7: sem garantia de disponibilidade; recursos futuros sem data. |
| 21 | Licenças de código aberto | **Feito** | Inventário abaixo + tela "Créditos e licenças". Nenhuma GPL/AGPL dentro do app. Atenção: **PyInstaller (GPL v2 com exceção)** só empacota o Desktop; **Font Awesome** exige atribuição (feita). Confirme a licença do Chaquopy no site deles antes de publicar. |
| 22 | Fornecedores para contrato de tratamento (DPA) | **Depende de você** | Lista abaixo. Só vale DPA com quem recebe dado: Cloudflare, Mercado Pago (e ViaCEP, pública). Você não usa hospedagem, e-mail em massa nem IA. |
| 23 | Lista de empresas na Política | **Feito** | Seção 7 da Política. |
| 24 | Canal de denúncia de conteúdo/direito autoral | **Feito** | Termos §9 (e-mail + WhatsApp). Os usuários só publicam o próprio cardápio/logo. |
| 25 | Contato de privacidade (art. 41 §1º) | **Feito + Depende de você** | Usa o e-mail e WhatsApp de suporte. Informe o **nome do encarregado** em `contato.js` (`encarregado`); até lá aparece "Central da Evolução". |
| 26 | Nome da empresa, CNPJ, endereço, contato em destaque | **Depende de você** | Campos prontos em `js/contato.js` (`razaoSocial`, `cnpj`, `endereco`); aparecem nos Termos/Política quando preenchidos. **Não inventei nada.** Atenção: a chave Pix de cobrança está em nome de **pessoa física**; o Decreto 7.962/2013 exige identificar quem vende (CNPJ ou CPF) e o endereço. |
| 27 | Política e Termos em português com link no rodapé | **Feito** | Links no rodapé do menu, Suporte, login e cardápio QR; páginas públicas `/#termos`, `/#privacidade`, `/#reembolso`, `/#creditos`. |
| 28 | Prazos de retenção | **Feito** | Tabela abaixo; limpeza automática ao abrir e a cada 12 h. |
| 29 | Padrões enganosos | **Feito** | Não há contagem falsa (o contador mostra a data real do prazo de carência). Preços e botões conferidos; caixas de consentimento desmarcadas. |
| 30 | Avisar conteúdo gerado por IA | **Feito** | Nenhum conteúdo é gerado por IA em uso. Termos §12 e Créditos informam que o app foi desenvolvido com apoio de IA; o Suporte usa textos pré-escritos. |
| 31 | Direito de uso de imagens, fontes e textos | **Feito + Depende de você** | Ícones: Font Awesome Free (atribuído). Sem fontes externas. Confirme que o **ícone do app (`img/icon-*.png`)** e a logo são seus. |
| 32 | Acessibilidade básica | **Feito (básico)** | Zoom liberado (antes bloqueado); cinzas de baixo contraste escurecidos; `alt` nas imagens; foco visível; Enter/Espaço em itens clicáveis; nome (`aria-label`) em botões só de ícone. Não é auditoria WCAG completa. |
| 33 | Link de descadastro em e-mail de marketing | **N/A** | O app não envia e-mail de marketing. A Política já prevê "SAIR" se um dia enviar. |
| 34 | Conferir cada mudança | **Feito** | Servidor testado por requisições reais; telas testadas no navegador (aceite, páginas legais, assinatura, seletor A4, QR, exportar). Não testado em Android/Windows reais. |

## Inventário de terceiros (itens 8, 21, 22, 23)
| Quem | O que recebe | Quando | DPA? |
|------|--------------|--------|------|
| ViaCEP | CEP digitado | Ao buscar endereço | Não (consulta pública) |
| Cloudflare (túnel + download do cloudflared) | Tráfego do cardápio/pedidos; IP | Só se ligar o link externo | **Sim, recomendado** |
| Mercado Pago | Valor e código do pagamento, token do usuário | Só se usar a maquininha | **Sim** (termos do MP) |
| WhatsApp/Meta, e-mail | Conteúdo que o usuário envia | Quando o usuário toca em enviar | Não (ato do usuário) |
| Banco do Pix | Pagamentos | Assinatura e caixa | Não |
| GitHub / lojas de app | Distribuição do app | Sem acesso aos dados | Não |
| Analytics, anúncios, hospedagem, e-mail em massa, IA | — | **Não usados** | — |

Bibliotecas: Font Awesome Free 7.3.1 (CC BY 4.0 / OFL / MIT), QRCode.js (MIT), ZXing 3.5.3 (Apache 2.0), AndroidX Core (Apache 2.0), Chaquopy (MIT), Python/SQLite, Ed25519 RFC 8032, cloudflared (Apache 2.0); Desktop: PyInstaller (GPL v2 + exceção), Inno Setup.

## Roteiro de vazamento (item 12)
1. **Conter** (hora 0): descobrir o que aconteceu; trocar senhas; revogar o link externo (Rede > parar link); isolar o aparelho.
2. **Registrar**: data/hora, quem descobriu, que dados e quantos titulares, causa provável.
3. **Avaliar risco** (até 1 dia útil): há risco ou dano relevante (CPF, endereço, senhas, fiado, dados de crianças)? Se sim, comunicar.
4. **Comunicar em até 3 dias úteis** (LGPD art. 48; Res. CD/ANPD nº 15/2024): ANPD (formulário em gov.br/anpd) e os titulares afetados, em linguagem simples: o que houve, quais dados, riscos, o que já foi feito, o que a pessoa pode fazer, contato do encarregado.
5. **Corrigir e documentar**: causa raiz, correção, e guardar o registro do incidente por 5 anos.
Responsável: definir nome e substituto (depende de você).

## Retenção (item 28)
| Dado | Prazo | Como apaga |
|------|-------|-----------|
| Comandas, caixa, compras, financeiro (valores) | 5 anos | Depois: nome/CPF/telefone saem; ficam valores |
| Clientes e colaboradores | Enquanto mantidos pelo estabelecimento | Botão excluir / Privacidade e meus dados |
| Chamados de mesa | 30 dias | Automático |
| Auditoria | 12 meses | Automático |
| Avaliações do app | 24 meses | Automático |
| Sessão de login | até 24 h | Ao sair / expirar |
| Registro de aceite | Enquanto usar + prazo de defesa | Mantido por obrigação/legítimo interesse |

## O que depende de você (resumo)
1. Razão social, CNPJ/CPF e endereço (`js/contato.js`) — **e identificar o recebedor do Pix**.
2. Nome do encarregado de dados e do substituto no roteiro de vazamento.
3. Confirmar "sem taxas adicionais" e o texto de reembolso (35 dias; devolução por Pix).
4. Cadastrar os GitHub Secrets da assinatura e remover `comandas.keystore` do repositório (item 11).
5. Fechar DPA com Cloudflare e Mercado Pago, se usar esses recursos.
6. Confirmar que ícone e logo são seus e a licença do Chaquopy.
7. **Levar tudo a um advogado**: foro, limitação de responsabilidade e cláusulas dos Termos.
