import { describe,it,expect,vi } from "vitest";
import { calculateLupaOffer } from "../../js/lupa-promo-rules.js";
import { buildOrderWhatsAppMessage } from "../../js/checkout-message.js";

const item=(id:string,price:number|null,qty=1,category="lupa")=>({
  product:{id,name:"Lupa "+id,price,category,soldOut:false,priceLabel:price?("R$ "+(price/100).toFixed(2)):"Consultar"},
  qty
});
describe("Oferta Street Goose / 2 lupas por R$ 290",()=>{
  it("usa preço REAL R$197: duas unidades economizam R$104",()=>{
    const q=calculateLupaOffer([item("lupa-01",19700),item("lupa-02",19700)],["lupa-01","lupa-02"]);
    expect(q).toMatchObject({subtotal:39400,discount:10400,total:29000,pairs:1,eligibleCount:2});
  });
  it("não aplica a não participantes nem acessórios",()=>{
    const q=calculateLupaOffer([item("lupa-01",19700),item("lupa-03",19700),item("acessorios-01",19400,1,"acessorios")],["lupa-01","lupa-02","acessorios-01"]);
    expect(q.discount).toBe(0);
  });
  it("mesmo modelo duas vezes conta um par, três deixam uma no preço normal",()=>{
    const q=calculateLupaOffer([item("lupa-01",19700,3)],["lupa-01"]);
    expect(q).toMatchObject({subtotal:59100,discount:10400,total:48700,pairs:1});
  });
  it("dois pares descontam duas vezes, e remover 1 desfaz um desconto",()=>{
    expect(calculateLupaOffer([item("lupa-01",19700,4)],["lupa-01"]).total).toBe(58000);
    expect(calculateLupaOffer([item("lupa-01",19700)],["lupa-01"]).discount).toBe(0);
  });
  it("protege preço não cadastrado e não dá desconto negativo",()=>{
    const q=calculateLupaOffer([item("lupa-01",null,2),item("lupa-02",12000,2)],["lupa-01","lupa-02"]);
    expect(q).toMatchObject({discount:0,total:24000,hasUnpriced:true});
  });
  it("permite preços reais diferentes sem falsificar economia",()=>{
    const q=calculateLupaOffer([item("lupa-01",20000),item("lupa-02",19700)],["lupa-01","lupa-02"]);
    expect(q).toMatchObject({discount:10700,total:29000});
  });
});
describe("Texto do WhatsApp",()=>{
  it("usa valores gravados no servidor quando confirmados",()=>{
    (globalThis as any).window={SG:{
      formatPrice:(c:number)=>"R$ "+(c/100).toFixed(2).replace(".",","),
      subtotalLabel:()=>"R$ 394,00",
      promo:{quote:()=>({pairs:1,discount:10400,total:29000})}
    }};
    const msg=buildOrderWhatsAppMessage([item("lupa-01",19700,2)],{name:"Cliente",phone:"34999999999",street:"Rua Principal",number:"10",city:"Araxá",state:"MG"},{orderId:"abcdefgh-123",orderSummary:{subtotalCents:39400,promoDiscountCents:10400,discountCents:10400,totalCents:29000,couponCode:null}});
    expect(msg).toContain("pedido #ABCDEFGH");
    expect(msg).toContain("2 LUPAS POR R$ 290");
    expect(msg).toContain("R$ 104,00");
    expect(msg).toContain("R$ 290,00");
    expect(msg).toContain("Rua Principal, 10");
    expect(msg).not.toContain("Total estimado");
  });
  it("sem confirmação chama o total de estimado, nunca de final",()=>{
    (globalThis as any).window={SG:{
      formatPrice:(c:number)=>"R$ "+(c/100).toFixed(2),
      subtotalLabel:()=>"R$ 394,00",
      promo:{quote:()=>({pairs:1,discount:10400,total:29000})}
    }};
    const msg=buildOrderWhatsAppMessage([item("lupa-01",19700,2)],{name:"Cliente"});
    expect(msg).toContain("Total estimado");
    expect(msg).toContain("Favor confirmar");
  });
});
