/* Shared eligibility, arithmetic and totals for the 2-for-290 preview.
   Server SQL independently recomputes the identical discount on real prices. */
export function calculateLupaOffer(rows, eligibleIds) {
  const eligible = [], ids=eligibleIds instanceof Set ? eligibleIds : new Set(eligibleIds || []);
  let subtotal=0,hasUnpriced=false;
  for(const row of rows || []) {
    if(!row||!row.product||!Number.isFinite(row.qty))continue;
    const p=row.product,qty=Math.max(0,Math.min(20,Math.trunc(row.qty)));
    if(!Number.isInteger(p.price)||p.price<=0){hasUnpriced=true;continue;}
    subtotal+=p.price*qty;
    if(p.category==="lupa"&&!p.soldOut&&ids.has(p.id)){
      for(let i=0;i<qty;i++)eligible.push(p.price);
    }
  }
  eligible.sort((a,b)=>b-a);
  let discount=0,pairs=0;
  for(let i=0;i+1<eligible.length;i+=2){
    const saving=Math.max(0,eligible[i]+eligible[i+1]-29000);
    if(saving>0){discount+=saving;pairs++;}
  }
  return {subtotal,discount,total:Math.max(0,subtotal-discount),pairs,eligibleCount:eligible.length,hasUnpriced};
}
