import {supabase} from '../lib/supabase';
import {AdminService} from './AdminService';
export type Topic='overview'|'finance'|'orders'|'products'|'customers'|'community'|'coupons'|'newsletter'|'xp';
export interface Metric{label:string;value:number;money?:boolean}
export interface CrmAnswer{title:string;summary:string;metrics:Metric[];notes:string[];source:string;generatedAt:string;from:string;to:string;chart:Metric[]}
const brl=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n/100);
export function interpretQuestion(input:string){
 const q=input.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 let topic:Topic|null=null;
 if(/resumo geral|visao geral|toda a loja|como esta a loja/.test(q))topic='overview';
 else if(/cupom|cupons|recompensa|brinde/.test(q))topic='coupons';
 else if(/newsletter|assinant|inscrit/.test(q))topic='newsletter';
 else if(/ranking|nivel|niveis|\bxp\b/.test(q))topic='xp';
 else if(/comunidade|postage|moderacao|aprovacao/.test(q))topic='community';
 else if(/cliente|cadastro|perfil|lead/.test(q))topic='customers';
 else if(/mais vend|mais saem|campea|mais vendido|finance|vendi|vendeu|gasto|entrou|saiu|entrada|saida|saldo|fatur|receit|despes|ticket|venda|receber|lucro/.test(q))topic='finance';
 else if(/estoque|esgotad|catalogo|produto/.test(q))topic='products';
 else if(/pedido|entrega|reembolso|cancelad/.test(q))topic='orders';
 const d=q.match(/(?:ultimos?\s+)?(\d{1,3})\s*dias?/);
 return {topic,days:d?Math.min(365,Math.max(1,Number(d[1]))):null,month:/este mes|esse mes|mes atual/.test(q),today:/\bhoje\b/.test(q),topProducts:/mais vend|mais saem|campea|mais vendido/.test(q)};
}
export function makePeriod(days:number,month=false,today=false,now=new Date()){
 const end=new Date(now),start=new Date(now);
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now),p=(name:string)=>parts.find(v=>v.type===name)!.value;
 if(month||today)start.setTime(new Date(`${p('year')}-${p('month')}-${month?'01':p('day')}T00:00:00-03:00`).getTime());
 else start.setTime(end.getTime()-Math.min(365,Math.max(1,days))*86400000);
 return {from:start.toISOString(),to:end.toISOString()};
}
export const CrmAssistantService={
 async ask(question:string,days=30):Promise<CrmAnswer>{
  if(!supabase||!await AdminService.isAdmin())throw Error('Acesso exclusivo da equipe da loja.');
  const intent=interpretQuestion(question);if(!intent.topic)throw Error('Escolha uma das áreas ou peça um resumo de financeiro, pedidos, catálogo, clientes, comunidade, cupons, newsletter ou XP. Experimente: quanto entrou e saiu este mês?');
  const period=makePeriod(intent.days??days,intent.month,intent.today),topic=intent.topic;
  const {data,error}=await supabase.rpc('admin_assistant_report',{p_from:period.from,p_to:period.to});
  if(error||!data)throw Error('Não foi possível consultar os registros. Tente novamente.');
  const metrics:Metric[]=[],notes:string[]=[],chart:Metric[]=[];
  let title='',summary='',source='Banco da loja';
  const add=(label:string,value:unknown,money=false)=>metrics.push({label,value:Number(value)||0,money});
  if(topic==='finance'||topic==='overview'){
   const countDays=(Date.parse(period.to)-Date.parse(period.from))/86400000;
   const f=await AdminService.financeSummary(period.from,period.to,countDays>90?'month':countDays>31?'week':'day');if(!f.ok)throw Error('Não foi possível consultar o financeiro.');
   const d=f.data;title='Financeiro';source='finance_entries, orders';
   if(intent.topProducts){title='Produtos mais vendidos';d.top_products.forEach(p=>{add(p.name,p.qty);chart.push({label:p.name,value:p.cents,money:true});});summary='Produtos com vendas registradas no período, conforme o relatório financeiro.';if(!metrics.length)notes.push('Nenhuma venda registrada neste período.');}
   else{
    add('Entradas',d.in_cents,true);add('Saídas',d.out_cents,true);add('Saldo do período',d.in_cents-d.out_cents,true);add('A receber agora',d.receivable_cents,true);add('Ticket médio',d.avg_ticket_cents,true);
    summary=`Entraram ${brl(d.in_cents)} e saíram ${brl(d.out_cents)}. O saldo do período é ${brl(d.in_cents-d.out_cents)}.`;
    d.series.forEach(p=>chart.push({label:new Date(p.d).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit'}),value:p.in-p.out,money:true}));
    notes.push('Saldo de caixa não é lucro contábil. Inclui somente lançamentos registrados. A receber é o total atual de pedidos aguardando pagamento.','Gráfico: entradas menos saídas por intervalo.');
   }
  }
  if(topic==='orders'||topic==='overview'){
   const names:Record<string,string>={pending_payment:'Aguardando pagamento',paid:'Pagos',fulfilled:'Enviados',cancelled:'Cancelados',refunded:'Reembolsados'};
   Object.entries(names).forEach(([k,v])=>add(v,data.orders[k]));if(topic==='orders'){title='Pedidos';source='orders';summary='Pedidos criados no período, separados pela situação atual.';}notes.push('Situação atual dos pedidos criados no período. Pedidos pagos não substituem os lançamentos de caixa.');
  }
  if(topic==='products'){title='Catálogo';source='products';add('Registrados no banco',data.products.registered);add('Visíveis',data.products.visible);add('Esgotados',data.products.sold_out);add('Ocultos',data.products.hidden);summary='Disponibilidade atual dos produtos registrados no banco.';notes.push('Disponibilidade não é quantidade de unidades. Produtos estáticos sem registro no banco não entram nessa contagem.');}
  if(topic==='customers'||topic==='overview'){add('Clientes cadastrados',data.customers.total);add('Novos no período',data.customers.new);if(topic==='customers'){title='Clientes';source='profiles';summary='Base cadastrada e novos perfis no período.';add('Participam do ranking',data.customers.ranking_opt_in);}}
  if(topic==='community'){title='Comunidade';source='community_posts';add('Aguardando moderação',data.community.pending);add('Aprovadas',data.community.approved);add('Rejeitadas',data.community.rejected);summary='Publicações criadas no período, separadas pelo status atual.';}
  if(topic==='coupons'){title='Cupons e recompensas';source='coupons, rewards';add('Cupons válidos agora',data.coupons.valid);add('Usos acumulados',data.coupons.uses_total);add('Recompensas ativas',data.rewards.active);summary='Benefícios atuais e uso acumulado dos cupons.';notes.push('Esses números são atuais ou acumulados; não se limitam ao período selecionado.');}
  if(topic==='newsletter'){title='Newsletter';source='newsletter_subscribers';add('Inscrições ativas',data.newsletter.active);add('Novas no período',data.newsletter.new);summary='Base atual e inscrições feitas no período.';}
  if(topic==='xp'){title='Evolução XP';source='xp_ledger';add('XP concedido',data.xp.earned);add('XP retirado',data.xp.removed);add('Movimentações',data.xp.events);summary='Movimentações registradas no período. Esta consulta não altera pontos nem níveis.';notes.push('Este resumo mostra movimentações de XP, não a classificação individual do ranking.');}
  if(topic==='overview'){title='Visão geral';summary+=' O resumo também reúne pedidos e clientes.';source+='; profiles';}
  if(!chart.length)metrics.forEach(m=>chart.push({...m}));
  return {title,summary,metrics,notes,source,generatedAt:data.generated_at,...period,chart};
 }
};
