/* Street Goose 034 — título, descrição e indexação de cada rota.
   Fonte única: o build (vite.config.ts) grava estes dados no HTML de cada
   URL pública (o que buscadores e redes sociais leem sem rodar JS) e o
   router.js troca o título da aba ao navegar dentro do site.
   Só fatos verificáveis no próprio site: nada de cidade, frete, estoque ou
   avaliação que a loja ainda não confirmou. */
export const SITE_ORIGIN = "https://www.streetgoose034.com.br";
export const SITE_NAME = "Street Goose 034";

// index: true entra no sitemap e pode aparecer no Google.
export const ROUTE_META = {
  "/": {
    index: true,
    title: "Street Goose 034 | Lupas, Óculos e Moda Streetwear",
    description: "Conheça a Street Goose 034: lupas, óculos, relógios, perfumes, moletons e acessórios streetwear. Explore as categorias e peça pelo WhatsApp.",
  },
  "/categoria/lupas": {
    index: true,
    title: "Lupas e Óculos de Estilo Urbano | Street Goose 034",
    h1: "Lupas e Óculos",
    description: "Explore lupas e óculos de estilo urbano na Street Goose 034. Veja as peças da coleção e consulte modelos, preços e disponibilidade pelo WhatsApp.",
  },
  "/categoria/acessorios": {
    index: true,
    title: "Acessórios Streetwear: Mochilas e Coletes | Street Goose 034",
    h1: "Acessórios",
    description: "Encontre mochilas, coletes, chapéus e acessórios streetwear na Street Goose 034. Explore as fotos das peças e consulte os detalhes pelo WhatsApp.",
  },
  "/categoria/relogios": {
    index: true,
    title: "Relógios de Estilo Urbano | Street Goose 034",
    h1: "Relógios",
    description: "Explore relógios de estilo urbano na Street Goose 034. Confira a coleção de acessórios de pulso, veja as peças e fale com a loja pelo WhatsApp.",
  },
  "/categoria/perfumes": {
    index: true,
    title: "Perfumes e Fragrâncias | Street Goose 034",
    h1: "Perfumes",
    description: "Descubra perfumes e fragrâncias na Street Goose 034. Veja as opções do catálogo e consulte o preço e a disponibilidade de cada perfume no WhatsApp.",
  },
  "/categoria/trajes": {
    index: true,
    title: "Moletons e Roupas Streetwear | Street Goose 034",
    h1: "Moletons e Trajes",
    description: "Conheça os moletons e as blusas de frio streetwear da Street Goose 034. Explore os visuais, confira as peças e finalize o pedido pelo WhatsApp.",
  },
  "/recompensas": {
    index: true,
    title: "Recompensas e níveis | Street Goose 034",
    description: "Como funciona o programa de XP da Street Goose 034: pedidos e fotos aprovadas somam pontos, sobem seu nível e liberam recompensas.",
  },
  "/ranking": {
    index: true,
    title: "Ranking | Street Goose 034",
    description: "Ranking dos membros da Street Goose 034 que escolheram aparecer: XP, níveis e quem está em destaque na comunidade.",
  },
  "/comunidade": {
    index: true,
    title: "Comunidade | Street Goose 034",
    description: "Mural da comunidade Street Goose 034: visuais dos clientes com as peças da loja, aprovados pela equipe.",
  },
  "/termos": {
    index: true,
    title: "Termos de uso | Street Goose 034",
    description: "As regras para usar o site da Street Goose 034, sua conta, a comunidade e o programa de XP.",
  },
  "/privacidade": {
    index: true,
    title: "Política de privacidade | Street Goose 034",
    description: "Quais dados a Street Goose 034 guarda, para quê, com quem compartilha e como você controla tudo, conforme a LGPD.",
  },
  "/trocas": {
    index: true,
    title: "Trocas e devoluções | Street Goose 034",
    description: "Arrependimento, defeito e garantia na Street Goose 034, do jeito que o Código de Defesa do Consumidor garante.",
  },
  // Páginas de uso pessoal ou internas: abrem normalmente, mas não entram
  // no Google (noindex no HTML e no cabeçalho X-Robots-Tag).
  "/busca": { index: false, title: "Busca | Street Goose 034" },
  "/favoritos": { index: false, title: "Favoritos | Street Goose 034" },
  "/sacola": { index: false, title: "Sacola | Street Goose 034" },
  "/checkout": { index: false, title: "Finalizar pedido | Street Goose 034" },
  "/conta": { index: false, title: "Minha conta | Street Goose 034" },
  "/conta/pedidos": { index: false, title: "Meus pedidos | Street Goose 034" },
  "/pedido/:id": { index: false, title: "Pedido | Street Goose 034" },
  "/admin": { index: false, title: "Painel da loja | Street Goose 034" },
};

export function metaForPath(path) {
  if (/^\/pedido\/[^/]+$/.test(path)) return ROUTE_META["/pedido/:id"];
  return ROUTE_META[path] || null;
}


// Conteúdo editorial útil, próprio de cada categoria, com texto visível
// tanto no HTML do build quanto na navegação SPA. Não supõe marcas,
// autenticidade, tamanhos, envio, preço ou estoque sem aprovação comercial.
export const CATEGORY_SEO_CONTENT = {
  lupas: {
    heading: "Lupas e óculos para um visual de rua",
    paragraphs: [
      "Na Street Goose 034, as lupas e os óculos de estilo urbano fazem parte da identidade de cada look. Explore as fotos da coleção, compare as peças e encontre o formato visual que combina com o seu estilo.",
      "Quer conferir detalhes de uma lupa? Abra a peça desejada e fale com a loja pelo WhatsApp para confirmar modelo, valor e disponibilidade antes de concluir o pedido."
    ]
  },
  acessorios: {
    heading: "Mochilas, coletes e acessórios streetwear",
    paragraphs: [
      "Os acessórios completam o visual com personalidade. Nesta seleção da Street Goose 034, você encontra opções como mochilas, chapéus e coletes para combinar com peças de roupa e óculos da coleção.",
      "Veja as imagens dos acessórios e consulte a loja pelo WhatsApp para verificar características, valores e disponibilidade da peça escolhida."
    ]
  },
  relogios: {
    heading: "Relógios para completar o estilo urbano",
    paragraphs: [
      "Um relógio é um detalhe que muda a composição do visual. Explore os relógios da Street Goose 034 e compare os modelos apresentados no catálogo para encontrar uma opção que combine com seu jeito de vestir.",
      "As fotos ajudam a conhecer cada peça. Para conferir detalhes do modelo, preço e disponibilidade, entre em contato pelo WhatsApp antes de fechar o pedido."
    ]
  },
  perfumes: {
    heading: "Perfumes e fragrâncias para marcar presença",
    paragraphs: [
      "O perfume também faz parte da identidade pessoal. Explore as fragrâncias presentes na coleção Street Goose 034 e veja as opções disponíveis para consulta diretamente com a equipe da loja.",
      "Cada perfume tem seu próprio valor, por isso o catálogo não exibe um preço único para a categoria. Escolha uma opção e consulte preço e disponibilidade pelo WhatsApp."
    ]
  },
  trajes: {
    heading: "Moletons e blusas de frio streetwear",
    paragraphs: [
      "Os moletons e as blusas de frio da Street Goose 034 fazem parte da seleção de roupas para compor visuais urbanos. Conheça a coleção, veja as imagens das peças e combine o estilo com as lupas e os acessórios da loja.",
      "Antes do pedido, fale com a equipe pelo WhatsApp para confirmar os detalhes da peça, tamanhos quando aplicável, valor e disponibilidade."
    ]
  }
};

// Texto âncora descritivo, mas curto, para links internos visíveis.
export const CATEGORY_LINK_TEXT = {
  lupas: "Lupas e óculos",
  acessorios: "Mochilas e acessórios",
  relogios: "Relógios",
  perfumes: "Perfumes",
  trajes: "Moletons e trajes"
};
