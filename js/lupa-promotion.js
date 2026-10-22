/* Street Goose 034 — one shared, auditable promotion quote.
   Promotion is eligible ONLY for specific lupa IDs selected by the owner.
   Display estimates never authorize discounts; create_whatsapp_order
   recalculates the final amount from protected product_prices. */
import { PriceService } from "../src/services/PriceService.ts";
const ids = new Set();
let ready = false;
function quote(rows) {
  const items = (rows || []).filter(r => r && r.product && Number.isFinite(r.qty));
  const prices = [], eligible = [];
  let subtotal = 0, hasUnpriced = false;
  for (const row of items) {
    const p=row.product, qty=Math.max(0,Math.min(20,Math.trunc(row.qty)));
    if (!Number.isInteger(p.price) || p.price<=0) {hasUnpriced=true;continue;}
    subtotal += p.price * qty;
    if (p.category==="lupa" && !p.soldOut && ids.has(p.id)) {
      for (let i=0;i<qty;i++) eligible.push(p.price);
    }
  }
  eligible.sort((a,b)=>b-a);
  let discount=0,pairs=0;
  for(let i=0;i+1<eligible.length;i+=2) {
    const savings=Math.max(0,eligible[i]+eligible[i+1]-29000);
    if(savings>0){discount+=savings;pairs++;}
  }
  return {subtotal,discount,total:Math.max(0,subtotal-discount),
    pairs,eligibleCount:eligible.length,hasUnpriced,ready};
}
async function refresh() {
  let list;
  try { list=await PriceService.fetchLupaPromoIds(); } catch(_) { list=null; }
  if(!list) return false;
  ids.clear(); list.forEach(x=>ids.add(x));
  ready=true;
  document.dispatchEvent(new CustomEvent("sg:promo-change"));
  return true;
}
window.SG.promo = {quote,refresh,isEligible:(id)=>ids.has(id),get ready(){return ready;}};
document.addEventListener("sg:prices",()=>{document.dispatchEvent(new CustomEvent("sg:promo-change"));});
refresh();
