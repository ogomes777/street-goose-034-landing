/* SG034 — one WhatsApp message for drawer and full checkout.
   A price is "confirmed" only after the server saved the order. */
export function buildOrderWhatsAppMessage(rows, customer, opts={}) {
  const fmt=(c)=>window.SG.formatPrice(Math.max(0,Math.round(c)));
  const promo=window.SG.promo ? window.SG.promo.quote(rows) : null;
  const verified=opts.orderSummary || null;
  const lines=[
    "Olá, equipe Street Goose 034!",
    opts.orderId ? "Quero finalizar o pedido #" + String(opts.orderId).slice(0,8).toUpperCase() + "." :
      "Quero finalizar meu pedido pela loja.",
    "",
    "*PEÇAS DA SACOLA*"
  ];
  rows.forEach(row=>{
    const p=row.product, qty=row.qty;
    const unit=Number.isInteger(p.price)&&p.price>0 ? fmt(p.price)+" cada" : "valor a consultar";
    lines.push("• "+qty+"x "+p.name+" — "+unit);
  });
  lines.push("");
  if(verified){
    lines.push("Subtotal: "+fmt(verified.subtotalCents));
    if(verified.promoDiscountCents>0){
      lines.push("*PROMOÇÃO STREET GOOSE | 2 LUPAS POR R$ 290*");
      lines.push("Desconto da promoção: -"+fmt(verified.promoDiscountCents));
    }
    if(verified.couponCode && verified.discountCents-verified.promoDiscountCents>0){
      lines.push("Cupom "+verified.couponCode+": -"+fmt(verified.discountCents-verified.promoDiscountCents));
    }
    lines.push("*Total dos produtos: "+fmt(verified.totalCents)+"*");
  } else {
    if(promo && promo.pairs>0){
      lines.push("*Promoção 2 lupas por R$ 290 solicitada* ("+promo.pairs+" combo"+(promo.pairs>1?"s":"")+")");
      lines.push("Economia estimada: -"+fmt(promo.discount));
      lines.push("Total estimado dos produtos: "+fmt(promo.total));
      lines.push("Favor confirmar a promoção e os valores antes do pagamento.");
    } else {
      lines.push("Total de referência: "+window.SG.subtotalLabel(rows));
    }
    if(opts.couponCode) lines.push("Cupom informado: "+opts.couponCode+" (validar no pedido).");
  }
  lines.push("Frete e disponibilidade a confirmar no atendimento.","");
  lines.push("*DADOS PARA ATENDIMENTO*");
  if(customer.name)lines.push("Nome: "+customer.name);
  if(customer.phone)lines.push("Contato: "+customer.phone);
  if(customer.email)lines.push("E-mail: "+customer.email);
  const street=[customer.street,customer.number].filter(Boolean).join(", ");
  const complement=customer.complement?" — "+customer.complement:"";
  const city=[customer.city,customer.state].filter(Boolean).join("/");
  const dest=[street+complement,customer.neighborhood,city,customer.cep?"CEP "+customer.cep:""].filter(Boolean).join(" · ");
  if(dest)lines.push("Endereço: "+dest);
  lines.push("Podem confirmar a disponibilidade, o frete e as opções de pagamento? Obrigado!");
  return lines.join("\n");
}
