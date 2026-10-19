/* Street Goose 034 — /termos, /privacidade e /trocas.
   Texto escrito a partir do que o site faz de verdade (dados coletados,
   serviços usados, como pedir exclusão). Dados da empresa vêm de
   window.SG_COMPANY_CONFIG e só aparecem quando preenchidos. */
import "./legal-page.css";

var UPDATED = "19 de outubro de 2026";

function esc(value) { return window.SG && window.SG.esc ? window.SG.esc(value) : String(value || ""); }

function whatsappLink(text) {
  return window.SG && window.SG.waLink ? window.SG.waLink(text) : "https://wa.me/553497281423";
}

function companyBlock() {
  var c = window.SG_COMPANY_CONFIG || {};
  var rows = [
    ["Marca", "Street Goose 034"],
    ["Razão social", c.legalName],
    ["CNPJ", c.cnpj],
    ["Endereço", c.address],
    ["Cidade", c.city],
    ["E-mail", c.email]
  ].filter(function (row) { return row[1]; });
  return '<dl class="legal-company">' + rows.map(function (row) {
    return "<div><dt>" + row[0] + "</dt><dd>" + esc(row[1]) + "</dd></div>";
  }).join("") +
    '<div><dt>WhatsApp</dt><dd><a href="' + esc(whatsappLink("Olá! Tenho uma dúvida sobre os termos e a privacidade da Street Goose 034.")) + '" target="_blank" rel="noopener">+55 34 9728-1423</a></dd></div></dl>';
}

var PAGES = {
  "/termos": {
    title: "Termos de uso",
    kicker: "STREET GOOSE 034",
    lead: "As regras para usar o site, sua conta, a comunidade e o programa de XP.",
    body: function () {
      return '' +
        "<h2>1. Quem somos</h2>" + companyBlock() +
        "<p>Ao navegar ou criar uma conta em streetgoose034.com.br você concorda com estes termos e com a <a href=\"/privacidade\">política de privacidade</a>.</p>" +

        "<h2>2. Sua conta</h2>" +
        "<ul><li>Você pode entrar com Google ou com e-mail e senha. Mantenha sua senha só com você.</li>" +
        "<li>As informações que você cadastra precisam ser verdadeiras: elas são usadas para atender e entregar seus pedidos.</li>" +
        "<li>Você pode baixar seus dados ou pedir a exclusão da conta em <a href=\"/conta\">Minha conta</a>.</li>" +
        "<li>Contas usadas para fraude, abuso ou para burlar o programa de XP podem ser suspensas.</li></ul>" +

        "<h2>3. Pedidos e pagamento</h2>" +
        "<ul><li>Hoje o pedido é montado na sacola do site e finalizado com a nossa equipe pelo WhatsApp. Preço, disponibilidade, frete e forma de pagamento são confirmados nessa conversa antes de qualquer cobrança.</li>" +
        "<li>O pedido só é considerado fechado depois da confirmação do pagamento.</li>" +
        "<li>As fotos mostram as peças reais; cores podem variar levemente conforme a tela.</li>" +
        "<li>Trocas, devoluções e garantia seguem a <a href=\"/trocas\">política de trocas e devoluções</a> e o Código de Defesa do Consumidor.</li></ul>" +

        "<h2>4. SG Community</h2>" +
        "<ul><li>Publique só fotos suas ou que você tenha autorização para usar. Ao publicar, você autoriza a Street Goose 034 a exibir a foto no site e na comunidade.</li>" +
        "<li>Toda publicação passa pela aprovação da equipe. Conteúdo ofensivo, discriminatório, ilegal, com nudez ou que exponha outras pessoas sem consentimento é recusado ou removido.</li>" +
        "<li>Você pode apagar seus comentários quando quiser. Para tirar uma foto publicada, fale com a gente pelo WhatsApp.</li></ul>" +

        "<h2>5. XP, ranking, cupons e recompensas</h2>" +
        "<ul><li>Pedidos pagos rendem 1 XP por R$ 1 (mínimo de 50 XP por pedido) e cada foto aprovada na comunidade rende 30 XP. Reembolso desfaz o XP do pedido.</li>" +
        "<li>XP, níveis, cupons e recompensas não têm valor em dinheiro, não são transferíveis e seguem as regras mostradas no site no momento do uso.</li>" +
        "<li>O ranking público mostra seu apelido, nível e XP. Contas novas entram nele automaticamente; você pode sair quando quiser em Minha conta.</li>" +
        "<li>Podemos ajustar o XP em caso de erro, fraude ou cancelamento.</li></ul>" +

        "<h2>6. Conteúdo do site</h2>" +
        "<p>Marca, logotipo, fotos, vídeos, textos e animações são da Street Goose 034 ou usados com autorização. Não copie nem use comercialmente sem permissão por escrito.</p>" +

        "<h2>7. Responsabilidade</h2>" +
        "<p>Trabalhamos para manter o site no ar e seguro, mas ele pode passar por instabilidades ou manutenções. Nada nestes termos limita os seus direitos como consumidor.</p>" +

        "<h2>8. Mudanças e foro</h2>" +
        "<p>Podemos atualizar estes termos; a data abaixo mostra a versão em vigor. Vale a legislação brasileira, e você pode resolver qualquer questão no foro do seu domicílio.</p>";
    }
  },

  "/privacidade": {
    title: "Política de privacidade",
    kicker: "LGPD",
    lead: "Quais dados a Street Goose 034 guarda, para quê, com quem compartilha e como você controla tudo.",
    body: function () {
      return '' +
        "<h2>1. Controlador dos dados</h2>" + companyBlock() +

        "<h2>2. Dados que coletamos</h2>" +
        "<ul><li><strong>Conta:</strong> nome, e-mail e senha (guardada só em formato criptografado). Se você entra com Google, recebemos seu nome e e-mail da conta Google.</li>" +
        "<li><strong>Ficha pessoal:</strong> nome completo, CPF, celular, data de nascimento e endereço, quando você preenche.</li>" +
        "<li><strong>Pedidos:</strong> peças, valores, cupom, endereço de entrega e o histórico de atendimento.</li>" +
        "<li><strong>Comunidade e ranking:</strong> fotos, legendas, curtidas, comentários, apelido, foto de perfil, XP e nível.</li>" +
        "<li><strong>Preferências:</strong> quais avisos você quer receber (no site, por e-mail ou no aparelho) e se quer novidades.</li>" +
        "<li><strong>Uso do site:</strong> data do último acesso à conta e, só se você ativar o “Pulso da Street”, escolhas da coleção de forma anônima.</li></ul>" +
        "<p>Não usamos pixels de publicidade. O Google Analytics 4 (GA4) só é ativado se você aceitar os cookies de análise. Nesse caso, recebemos estatísticas de páginas visitadas e interações com a loja, sem enviar nome, CPF, e-mail ou telefone nos eventos.</p>" +

        "<h2>3. Para que usamos</h2>" +
        "<ul><li>Criar e proteger sua conta.</li>" +
        "<li>Atender, entregar e emitir documentos dos seus pedidos (o CPF é usado para isso).</li>" +
        "<li>Calcular XP, níveis, cupons e o ranking.</li>" +
        "<li>Enviar avisos sobre pedidos, níveis e recompensas e, se você autorizar, novidades e lembretes.</li>" +
        "<li>Prevenir fraude e abuso e cumprir obrigações legais.</li></ul>" +

        "<h2>4. Bases legais</h2>" +
        "<p>Execução do contrato (conta e pedidos), cumprimento de obrigação legal (documentos fiscais e defesa do consumidor), legítimo interesse (segurança e prevenção a fraude) e consentimento (novidades, notificações no aparelho, “Pulso da Street” e cookies do Google Analytics 4), que você pode retirar a qualquer momento.</p>" +

        "<h2>5. Com quem compartilhamos</h2>" +
        "<p>Não vendemos seus dados. Usamos apenas os serviços necessários para o site funcionar:</p>" +
        "<ul><li><strong>Supabase</strong> — banco de dados, login e arquivos, com servidores em São Paulo.</li>" +
        "<li><strong>Vercel</strong> e <strong>Cloudflare</strong> — hospedagem, entrega do site, verificação anti-robô e estatísticas de visita anônimas, sem cookies.</li>" +
        "<li><strong>Google</strong> — login com Google, planilhas usadas pela equipe para organizar pedidos e Google Analytics 4 para medir a navegação somente após sua autorização.</li>" +
        "<li><strong>Resend</strong> — envio dos e-mails de aviso.</li>" +
        "<li><strong>WhatsApp</strong> — atendimento e fechamento dos pedidos.</li>" +
        "<li><strong>ViaCEP</strong> — preencher o endereço a partir do CEP.</li>" +
        "<li><strong>Have I Been Pwned</strong> — ao criar senha, conferimos se ela já vazou na internet. Só um trecho codificado da senha é enviado, nunca a senha.</li>" +
        "<li>Serviços de notificação do seu navegador, quando você ativa avisos no aparelho.</li></ul>" +
        "<p>Também podemos compartilhar dados quando a lei ou uma autoridade exigir.</p>" +

        "<h2>6. O que fica público</h2>" +
        "<p>Seu apelido, foto de perfil, nível e XP no ranking (você pode sair dele) e as fotos aprovadas na comunidade. Nome completo, CPF, contato e endereço nunca ficam públicos.</p>" +

        "<h2>7. Armazenamento no seu aparelho</h2>" +
        "<p>O site guarda no navegador a sacola, os favoritos, tema, idioma, volume da música, um cache do catálogo, a sessão de login e sua preferência sobre cookies de análise. Se você autorizar, o Google Analytics 4 também pode gravar cookies de medição (como _ga). Você pode recusar ou retirar essa autorização a qualquer momento.</p>" +

        "<h2>8. Por quanto tempo</h2>" +
        "<p>Mantemos os dados enquanto sua conta existir. Dados de pedidos são guardados pelo prazo exigido pelas leis fiscais e de defesa do consumidor, mesmo depois da exclusão da conta.</p>" +

        "<h2>9. Seus direitos</h2>" +
        "<ul><li>Ver e baixar seus dados: <a href=\"/conta\">Minha conta</a> → “Baixar meus dados”.</li>" +
        "<li>Corrigir dados: Minha conta.</li>" +
        "<li>Excluir a conta: Minha conta → “Pedir exclusão da conta”, ou pelo WhatsApp.</li>" +
        "<li>Retirar consentimentos: preferências de aviso, ranking e “Pulso da Street”, a qualquer momento. Para rever o Google Analytics, clique em <a href=\"#\" data-sg034-consent-open>Configurar cookies</a>.</li>" +
        "<li>Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).</li></ul>" +

        "<h2>10. Segurança</h2>" +
        "<p>Conexão criptografada, senhas protegidas, acesso aos dados restrito a você e à equipe autorizada, e verificação anti-robô no login.</p>" +

        "<h2>11. Menores de idade</h2>" +
        "<p>Se você tem menos de 18 anos, use o site com acompanhamento de um responsável.</p>" +

        "<h2>12. Mudanças</h2>" +
        "<p>Podemos atualizar esta política; a data abaixo mostra a versão em vigor.</p>";
    }
  },

  "/trocas": {
    title: "Trocas e devoluções",
    kicker: "SEUS DIREITOS",
    lead: "Arrependimento, defeito e garantia, do jeito que o Código de Defesa do Consumidor garante.",
    body: function () {
      return '' +
        "<h2>1. Desistência em até 7 dias</h2>" +
        "<ul><li>Comprou pelo site ou pelo WhatsApp e se arrependeu? Você pode desistir em até <strong>7 dias corridos depois de receber</strong> a peça, sem precisar explicar o motivo (art. 49 do CDC).</li>" +
        "<li>Devolvemos <strong>todo o valor pago, incluindo o frete</strong>, pelo mesmo meio de pagamento.</li>" +
        "<li>O frete da devolução é por nossa conta.</li>" +
        "<li>Envie a peça como recebeu, sem sinais de uso, com embalagem e acessórios.</li></ul>" +

        "<h2>2. Defeito</h2>" +
        "<ul><li>Você tem <strong>90 dias</strong> para reclamar de defeito (óculos e acessórios são produtos duráveis — art. 26 do CDC). Se o defeito só aparecer com o uso, o prazo começa quando ele aparecer.</li>" +
        "<li>Temos até 30 dias para resolver. Se não resolvermos, você escolhe: troca por outra peça igual, devolução do dinheiro ou abatimento no preço (art. 18 do CDC).</li>" +
        "<li>Defeito não inclui desgaste natural, quedas, arranhões por uso ou mau uso.</li></ul>" +

        "<h2>3. Peça errada ou danificada na entrega</h2>" +
        "<p>Recebeu o modelo errado ou a peça chegou danificada? Fale com a gente assim que receber, com fotos da peça e da embalagem. A troca e o frete são por nossa conta.</p>" +

        "<h2>4. Como pedir</h2>" +
        "<ol><li>Chame no <a href=\"" + esc(whatsappLink("Olá! Quero solicitar uma troca/devolução. Número do pedido: ")) + "\" target=\"_blank\" rel=\"noopener\">WhatsApp</a> com o número do pedido (está em Minha conta → Pedidos).</li>" +
        "<li>Diga o motivo e, em caso de defeito ou dano, mande fotos.</li>" +
        "<li>Combinamos o envio da peça com você.</li>" +
        "<li>Assim que recebermos e conferirmos a peça, fazemos a troca ou o reembolso.</li></ol>" +

        "<h2>5. XP</h2>" +
        "<p>Em devoluções com reembolso, o XP ganho com o pedido é desfeito.</p>" +

        "<h2>6. Contato</h2>" + companyBlock();
    }
  }
};

export function legalPagePaths() { return Object.keys(PAGES); }

export function mountLegalPage(root, params, onClose) {
  var path = (params && params.path) || location.pathname.replace(/\/$/, "");
  var page = PAGES[path] || PAGES["/termos"];
  var links = Object.keys(PAGES).map(function (key) {
    return '<a href="' + key + '"' + (key === path ? ' aria-current="page"' : "") + ">" + PAGES[key].title + "</a>";
  }).join("");
  root.classList.add("is-legal");
  root.innerHTML =
    '<div class="app-page-head"><h1>' + page.title + "</h1>" +
    '<button class="app-page-close" type="button" data-app-close aria-label="Fechar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
    '<div class="app-page-body legal-body"><article class="legal-doc">' +
      '<p class="legal-kicker">' + page.kicker + "</p>" +
      '<p class="legal-lead">' + page.lead + "</p>" +
      '<nav class="legal-nav" aria-label="Documentos">' + links + "</nav>" +
      page.body() +
      '<p class="legal-updated">Última atualização: ' + UPDATED + "</p>" +
    "</article></div>";
  root.scrollTop = 0;

  root.querySelector("[data-app-close]").addEventListener("click", onClose);
  function onKeydown(e) { if (e.key === "Escape") onClose(); }
  document.addEventListener("keydown", onKeydown);
  return function teardown() {
    document.removeEventListener("keydown", onKeydown);
    root.classList.remove("is-legal");
  };
}
