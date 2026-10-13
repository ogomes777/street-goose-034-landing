export function postalDigits(value: string): string {return value.replace(/\D/g,'').slice(0,8);}
export function formatPostalCode(value: string): string {const d=postalDigits(value);return d.length>5?d.slice(0,5)+'-'+d.slice(5):d;}
export type PostalAddress={street:string;neighborhood:string;city:string;state:string};
export async function lookupPostalCode(value:string,signal?:AbortSignal):Promise<PostalAddress>{
 const cep=postalDigits(value);if(cep.length!==8)throw new Error('Informe os 8 dígitos do CEP.');
 const response=await fetch(`https://viacep.com.br/ws/${cep}/json/`,{signal,credentials:'omit',referrerPolicy:'no-referrer'});
 if(!response.ok)throw new Error('Consulta indisponível. Você pode preencher manualmente.');
 const data=await response.json();if(data.erro)throw new Error('CEP não encontrado. Confira ou preencha manualmente.');
 if(typeof data.localidade!=='string'||!data.localidade.trim()||typeof data.uf!=='string'||!/^[A-Z]{2}$/.test(data.uf))throw new Error('Endereço não disponível. Preencha manualmente.');
 return {street:typeof data.logradouro==='string'?data.logradouro.slice(0,160):'',neighborhood:typeof data.bairro==='string'?data.bairro.slice(0,100):'',city:data.localidade.slice(0,100),state:data.uf};
}
