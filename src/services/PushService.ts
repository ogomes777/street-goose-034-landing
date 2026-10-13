import {supabase} from '../lib/supabase';
import {NotificationService} from './NotificationService';
export const PushService={
 async enable():Promise<{ok:boolean;message:string}>{
  if(!supabase)return {ok:false,message:'Entre na sua conta para ativar.'};
  if(!('Notification' in window)||!('PushManager' in window)||!('serviceWorker' in navigator))return {ok:false,message:'No iPhone, adicione pelo Safari à Tela de Início e abra pelo ícone. Este navegador pode não oferecer notificações push.'};
  const {data:{session}}=await supabase.auth.getSession();if(!session)return {ok:false,message:'Entre na conta e toque novamente em Ativar notificações.'};
  if(await Notification.requestPermission()!=='granted')return {ok:false,message:'A permissão não foi concedida. Você pode alterá-la nas configurações do navegador.'};
  try{
   const {data:key,error}=await supabase.rpc('push_public_key');if(error||!key)throw Error('configuration');
   await navigator.serviceWorker.register('/sw.js');const registration=await navigator.serviceWorker.ready;
   const bytes=Uint8Array.from(atob(key.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
   let subscription=await registration.pushManager.getSubscription();
   if(subscription?.options.applicationServerKey&&!Array.from(new Uint8Array(subscription.options.applicationServerKey)).every((v,i)=>v===bytes[i])){await subscription.unsubscribe();subscription=null;}
   subscription ||= await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
   const {error:saveError}=await supabase.from('push_subscriptions').upsert({user_id:session.user.id,endpoint:subscription.endpoint,keys:subscription.toJSON().keys},{onConflict:'endpoint'});if(saveError)throw saveError;
   if(!await NotificationService.updateMine({pushEnabled:true}))throw Error('preferences');
   return {ok:true,message:'Este dispositivo está conectado para receber os avisos escolhidos.'};
  }catch(_){return {ok:false,message:'A conexão do dispositivo não terminou. Toque novamente para tentar.'};}
 },
 async disable(){if(!supabase||!('serviceWorker' in navigator))return false;const subscription=await (await navigator.serviceWorker.getRegistration('/'))?.pushManager.getSubscription();if(subscription){const {error}=await supabase.from('push_subscriptions').delete().eq('endpoint',subscription.endpoint);if(error)return false;await subscription.unsubscribe();}return NotificationService.updateMine({pushEnabled:false});}
};
