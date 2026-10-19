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
    title: "Street Goose 034 | Lupas, relógios, perfumes e streetwear",
    description: "Curadoria Street Goose 034: lupas, relógios, perfumes, trajes e acessórios com presença de rua. Escolha a peça e feche o pedido direto com a loja pelo WhatsApp.",
  },
  "/categoria/lupas": {
    index: true,
    title: "Lupas | Street Goose 034",
    h1: "Lupas",
    description: "Lupas e óculos com presença de rua na curadoria Street Goose 034. Veja as peças, os preços e fale com a loja pelo WhatsApp para fechar o pedido.",
  },
  "/categoria/acessorios": {
    index: true,
    title: "Acessórios | Street Goose 034",
    h1: "Acessórios",
    description: "Mochilas, chapéus, coletes e outros acessórios da curadoria Street Goose 034. Veja as peças e fale com a loja pelo WhatsApp.",
  },
  "/categoria/relogios": {
    index: true,
    title: "Relógios | Street Goose 034",
    h1: "Relógios",
    description: "Relógios selecionados pela Street Goose 034 para fechar o visual. Veja as peças, os preços e fale com a loja pelo WhatsApp.",
  },
  "/categoria/perfumes": {
    index: true,
    title: "Perfumes | Street Goose 034",
    h1: "Perfumes",
    description: "Perfumes da curadoria Street Goose 034. Cada fragrância tem preço próprio: escolha a peça e consulte valor e disponibilidade pelo WhatsApp.",
  },
  "/categoria/trajes": {
    index: true,
    title: "Trajes e moletons | Street Goose 034",
    h1: "Trajes",
    description: "Moletons e blusas de frio da curadoria Street Goose 034. Veja as peças, os preços e fale com a loja pelo WhatsApp.",
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
