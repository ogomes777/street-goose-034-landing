import {attachAddressAssistant} from './address-assistant.js';
import {mountOnboardingMascot} from './onboarding-mascot.js';
import {watchCustomerNotifications} from "../src/services/NotificationRealtime.ts";
import './customer-onboarding.css';
import './customer-onboarding-street.css';
import {CustomerService,validCpf,validPhone} from '../src/services/CustomerService.ts';
import {NotificationService} from '../src/services/NotificationService.ts';
import {PushService} from '../src/services/PushService.ts';
import {supabase} from '../src/lib/supabase.ts';
const seen=new Set();let busy=false;
const fields=[['full_name','Nome completo','text','name',120],['cpf','CPF','text','off',14],['phone',"Celular WhatsApp",'tel','tel',25],['birthday','Nascimento','date','bday',10],['postal_code','CEP','text','postal-code',12],['street',"Rua avenida",'text','address-line1',160],['address_number','Número','text','off',20],['complement','Complemento','text','address-line2',100],['neighborhood','Bairro','text','off',100],['city','Cidade','text','address-level2',100],['state','UF','text','address-level1',2]];
const esc=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function waitForEntryOverlays(){
 return new Promise(resolve=>{
  function check(){
   const introReady=!document.querySelector('[data-intro-loader]')||window.SG?.introComplete===true;
   const popupReady=!document.querySelector('[data-popup]')||window.SG?.entryPopupSettled===true;
   if(!introReady||!popupReady)return;
   document.removeEventListener('sg:intro-complete',check);
   document.removeEventListener('sg:entry-popup-settled',check);
   resolve();
  }
  document.addEventListener('sg:intro-complete',check);
  document.addEventListener('sg:entry-popup-settled',check);
  check();
 });
}
export async function offerCustomerOnboarding(session){
 watchCustomerNotifications(session?.user?.id || null).catch(()=>{});
 if(session&&supabase)supabase.rpc('touch_customer_activity').then(()=>{}).catch(()=>{});
 if(!session||busy||seen.has(session.user.id))return;seen.add(session.user.id);busy=true;
 let details;try{details=await CustomerService.getMine();}catch(_){busy=false;return;}
 if(details.full_name&&details.phone){busy=false;return;}
 if((await supabase.auth.getSession()).data.session?.user.id!==session.user.id){busy=false;return;}
 const existingPrefs=await NotificationService.getMine();
 await waitForEntryOverlays();
 const latestSession=(await supabase.auth.getSession()).data.session;
 if(latestSession?.user.id!==session.user.id){busy=false;if(latestSession)void offerCustomerOnboarding(latestSession);return;}
 const updateKeys=["orderUpdates","couponUnlocked","rewardUnlocked","levelUp","rankingUp","postApproved"];
 const initialUpdates=updateKeys.every(key=>existingPrefs[key]);
 const previous=document.activeElement;const dialog=document.createElement('dialog');dialog.className='sg-onboard';dialog.setAttribute('aria-labelledby','sg-onboard-title');
 dialog.innerHTML="<button type=\"button\" data-dismiss class=\"sg-onboard-close\" aria-label=\"Preencher depois\">×</button><header><span>STREET GOOSE 034 SUA ASSINATURA</span><h2 id=\"sg-onboard-title\">Sua conta começa com você.</h2><p>Complete sua ficha para facilitar o atendimento e seus próximos pedidos. Seus dados pessoais ficam privados para você e a equipe da loja.</p></header><form><div class=\"sg-onboard-fields\">"+fields.map(([key,label,type,auto,max])=>'<label>'+label+'<input name="'+key+'" type="'+type+'" autocomplete="'+auto+'" maxlength="'+max+'" value="'+esc(details[key]||(key==='full_name'?session.user.user_metadata?.name:''))+'"'+(key==='full_name'?' required minlength="2"':'')+(key==='phone'?' required inputmode="tel"':'')+(key==='state'?' pattern="[A-Za-z]{2}"':'')+(key==='birthday'?' max="'+new Date().toISOString().slice(0,10)+'"':'')+(key==='cpf'?' inputmode="numeric"':'')+'></label>').join('')+'</div><section class="sg-onboard-notifications"><h3>Escolha o que acompanhar</h3><p>Seus avisos aparecem na conta. Autorize os canais que quiser usar.</p><button type="button" data-push>Ativar notificações neste dispositivo</button><label><input type="checkbox" name="updates" checked> Pedidos, níveis, ranking, cupons e recompensas</label><label><input type="checkbox" name="emailEnabled"> Receber meus avisos também por e-mail</label><label><input type="checkbox" name="newsletter"> Quero novidades e promoções</label><label><input type="checkbox" name="inactivity"> Quero um lembrete após 14 dias sem acessar</label></section><p data-status role="status" aria-live="polite"></p><footer><button type="button" data-dismiss>Preencher depois</button><button type="submit">Salvar meu perfil</button></footer></form>';
 document.body.append(dialog);
 const mascot=document.createElement('figure');mascot.className='sg-onboard-mascot';mascot.setAttribute('aria-hidden','true');
 mascot.innerHTML='<img src="/brand/onboarding-goose-034.webp" width="560" height="840" alt="" decoding="async">';
 dialog.querySelector('header').append(mascot);
 const grid=dialog.querySelector('.sg-onboard-fields');
 const neighborhood=grid.querySelector('[name="neighborhood"]').closest('label');
 const stateField=grid.querySelector('[name="state"]').closest('label');
 const cityField=grid.querySelector('[name="city"]').closest('label');
 const locations=document.createElement('div');locations.className='sg-onboard-locations';
 const left=document.createElement('div');left.className='sg-onboard-location-left';
 neighborhood.before(locations);left.append(neighborhood,stateField);locations.append(left,cityField);
 const disposeAddress=attachAddressAssistant(dialog.querySelector("form"));
 for(const key of ["emailEnabled","newsletter","inactivity"])dialog.querySelector('[name="'+key+'"]').checked=existingPrefs[key];
 dialog.querySelector('[name="updates"]').checked=initialUpdates;
 let disposeMascot=()=>{};
 function close(){disposeMascot();disposeAddress();dialog.close();dialog.remove();busy=false;if(previous?.isConnected)previous.focus();}
 dialog.querySelectorAll('[data-dismiss]').forEach(b=>b.onclick=close);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 dialog.querySelector('[data-push]').onclick=async e=>{const b=e.currentTarget;b.disabled=true;try{const r=await PushService.enable();dialog.querySelector('[data-status]').textContent=r.message;}catch(_){dialog.querySelector('[data-status]').textContent='Não foi possível conectar agora.';}finally{b.disabled=false;}};
 dialog.onsubmit=async e=>{e.preventDefault();const form=e.target,status=dialog.querySelector('[data-status]'),button=form.querySelector('[type="submit"]');if(!form.reportValidity())return;const input=Object.fromEntries(new FormData(form));input.state=String(input.state||'').toUpperCase();if(!validPhone(String(input.phone||''))){status.textContent='Informe seu celular com DDD.';form.elements.phone.focus();return;}if(input.cpf&&!validCpf(String(input.cpf))){status.textContent='Confira o CPF informado.';form.elements.cpf.focus();return;}button.disabled=true;
 try{if(!await CustomerService.saveMine(input,session.user.id)){status.textContent='Não foi possível salvar. Entre novamente se sua sessão mudou.';return;}const updates=Boolean(input.updates),patch={emailEnabled:Boolean(input.emailEnabled),newsletter:Boolean(input.newsletter),inactivity:Boolean(input.inactivity)};if(updates!==initialUpdates)for(const key of updateKeys)patch[key]=updates;if(!await NotificationService.updateMine(patch)){status.textContent='Ficha salva. Tente novamente para salvar os avisos.';return;}window.SG?.toast?.('FICHA PESSOAL SALVA');close();}catch(_){status.textContent='Não foi possível concluir. Tente novamente.';}finally{button.disabled=false;}};
 dialog.showModal();
 disposeMascot=mountOnboardingMascot(dialog,mascot);
}
