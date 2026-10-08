/* Street Goose 034 — escape para HTML montado por string (innerHTML).
   Todo valor que vem de usuário ou do backend — legenda, nome, apelido,
   produto do pedido, campo de formulário — passa por aqui antes de entrar
   no markup, inclusive dentro de atributos (alt, value, src). */
const ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ENTITIES[c]);
}
