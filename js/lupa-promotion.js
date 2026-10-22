/* Street Goose 034 — one shared, auditable promotion quote.
   Promotion is eligible ONLY for specific lupa IDs selected by the owner.
   Display estimates never authorize discounts; create_whatsapp_order
   recalculates the final amount from protected product_prices. */
import { PriceService } from "../src/services/PriceService.ts";
import { calculateLupaOffer } from "./lupa-promo-rules.js";
const ids = new Set();
let ready = false;
function quote(rows) {
  return {...calculateLupaOffer(rows,ids),ready};
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
