import {getVercelOidcToken} from "@vercel/oidc";
import {createClient} from '@supabase/supabase-js';
import {CrmError,MODELS,gateway,runConversation} from '../server/crm-ai.mjs';
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const fail=(status,code,message)=>res.status(status).json({error:code,message});
 if(req.method!=='POST')return fail(405,'method','Use POST.');
 const origin=req.headers.origin;const allowed=new Set(['https://www.streetgoose034.com.br','https://streetgoose034.com.br',...(process.env.VERCEL_URL?['https://'+process.env.VERCEL_URL]:[])]);
 if(origin&&!allowed.has(origin))return fail(403,'origin','Origem não permitida.');
 const authorization=String(req.headers.authorization||'');if(!authorization.startsWith('Bearer '))return fail(401,'login_required','Entre na conta da equipe.');
 try{
  const url=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_ANON_KEY;if(!url||!key)throw new CrmError('database_setup','Configuração do banco indisponível.',503);
  const db=createClient(url,key,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  const user=await db.auth.getUser(authorization.slice(7));if(user.error||!user.data.user)return fail(401,'session_expired','Entre novamente na conta.');
  const admin=await db.rpc('is_admin');if(admin.error||admin.data!==true)return fail(403,'forbidden','Acesso exclusivo da equipe da loja.');
  let body=typeof req.body==='string'?JSON.parse(req.body):req.body;if(!body||typeof body!=='object')throw new CrmError('body','Solicitação inválida.');
  let token=process.env.AI_GATEWAY_API_KEY;
  if(!token){try{token=await getVercelOidcToken();}catch(_){token=process.env.VERCEL_OIDC_TOKEN;}}
  if(body.action==='status')return res.status(200).json({configured:Boolean(token),chatModel:MODELS.chat,transcriptionModel:MODELS.transcribe,speechModel:MODELS.speech,liveVerified:false});
  if(!token)throw new CrmError('provider_setup','Ative OIDC ou configure AI_GATEWAY_API_KEY na Vercel.',503);
  if(!['chat','transcribe','speech'].includes(body.action))throw new CrmError('action','Ação não permitida.');
  const limit=await db.rpc('crm_assistant_quota');if(limit.error||limit.data!==true)throw new CrmError('rate_limit','Limite de solicitações atingido. Aguarde antes de tentar novamente.',429);
  if(body.action==='chat')return res.status(200).json(await runConversation(db,token,body));
  if(body.action==='transcribe'){
   const mime=String(body.mediaType||'').split(';')[0];if(!['audio/webm','audio/mp4','audio/mpeg','audio/wav','audio/ogg','audio/x-m4a'].includes(mime))throw new CrmError('audio_format','Formato de áudio não suportado.');
   if(typeof body.audio!=='string'||body.audio.length>3500000||body.audio.length<4||!/^[A-Za-z0-9+/]+={0,2}$/.test(body.audio))throw new CrmError('audio_size','Áudio inválido ou grande demais. Grave até um minuto.');
   const data=await gateway(token,'/v4/ai/transcription-model',{audio:body.audio,mediaType:mime},{'ai-gateway-protocol-version':'0.0.1','ai-transcription-model-specification-version':'4','ai-model-id':process.env.CRM_TRANSCRIPTION_MODEL||MODELS.transcribe});
   if(typeof data.text!=='string'||!data.text.trim())throw new CrmError('empty_transcription','Não foi possível identificar fala. Grave novamente.');
   return res.status(200).json({text:data.text.trim().slice(0,1600)});
  }
  if(typeof body.text!=='string'||!body.text.trim()||body.text.length>3000)throw new CrmError('speech_text','Texto de voz inválido ou longo demais.');
  const data=await gateway(token,'/v4/ai/speech-model',{text:body.text,voice:'alloy',outputFormat:'mp3'},{'ai-gateway-protocol-version':'0.0.1','ai-speech-model-specification-version':'4','ai-model-id':process.env.CRM_SPEECH_MODEL||MODELS.speech});
  if(typeof data.audio!=='string'||data.audio.length>4000000||!/^[A-Za-z0-9+/]+={0,2}$/.test(data.audio))throw new CrmError('speech_response','O provedor não entregou um áudio válido.',502);
  return res.status(200).json({audio:data.audio,mediaType:'audio/mpeg'});
 }catch(e){return fail(e instanceof CrmError?e.status:503,e instanceof CrmError?e.code:'service_error',e instanceof CrmError?e.message:'Não foi possível concluir agora. Tente novamente.');}
}
