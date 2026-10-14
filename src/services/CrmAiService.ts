import {supabase} from '../lib/supabase';
import type {CrmAnswer} from './CrmAssistantService';
export interface HistoryMessage{role:'user'|'assistant';content:string}
async function request(body:Record<string,unknown>){
 if(!supabase)throw Error('Conexão com o banco indisponível.');
 const {data,error}=await supabase.auth.getSession();if(error||!data.session)throw Error('Entre na conta da equipe.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),110000);
 try{
  const response=await fetch('/api/crm-assistant',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token},body:JSON.stringify(body),signal:controller.signal});
  let result;try{result=await response.json();}catch(_){throw Error('O servidor não respondeu corretamente. Tente novamente.');}
  if(!response.ok)throw Error(result.message||'Não foi possível concluir agora.');return result;
 }catch(e){if(e instanceof Error&&e.name==='AbortError')throw Error('A consulta demorou demais. Divida a pergunta e tente novamente.');throw e;}
 finally{clearTimeout(timer);}
}
export const CrmAiService={
 status:()=>request({action:'status'}),
 ask:(question:string,history:HistoryMessage[]=[],days=30)=>request({action:'chat',question,history,days}) as Promise<CrmAnswer>,
 async transcribe(blob:Blob):Promise<string>{
  if(blob.size>2500000||blob.size<1)throw Error('Áudio grande demais ou vazio. Grave até um minuto.');
  const audio=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(Error('Não foi possível ler o áudio.'));reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.readAsDataURL(blob);});
  const result=await request({action:'transcribe',audio,mediaType:blob.type});return result.text;
 },
 async speech(text:string):Promise<Blob>{
  const result=await request({action:'speech',text:text.slice(0,3000)});const bytes=Uint8Array.from(atob(result.audio),(c)=>c.charCodeAt(0));return new Blob([bytes],{type:result.mediaType});
 }
};
