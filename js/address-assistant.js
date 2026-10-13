import {lookupPostalCode,postalDigits,formatPostalCode} from '../src/services/AddressService.ts';
import './address-assistant.css';
let localitiesPromise,sequence=0;
function localities(){if(!localitiesPromise)localitiesPromise=fetch('/data/br-address-localities.json').then(r=>{if(!r.ok)throw new Error('localities');return r.json();}).catch(e=>{localitiesPromise=null;throw e;});return localitiesPromise;}
const normalize=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function attachAddressAssistant(form){
 const postal=form.querySelector('[name="postal_code"]'),state=form.querySelector('[name="state"]'),city=form.querySelector('[name="city"]');
 if(!postal||!state||!city)return ()=>{};
 const id=++sequence;let disposed=false,timer,controller,version=0,data,cityVersion=0;
 const addressKeys=['street','neighborhood','city','state'];
 const note=document.createElement('div');note.className='sg-address-note';
 const title=document.createElement('strong');title.textContent='Seu endereço, com menos passos.';
 const copy=document.createElement('small');copy.textContent='Digite o CEP para buscar rua, bairro, cidade e estado. Número e complemento são preenchidos por você.';
 const button=document.createElement('button');button.type='button';button.className='sg-address-search';button.textContent='Buscar CEP';
 const status=document.createElement('p');status.id=`sg-address-status-${id}`;status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 note.append(title,copy,button,status);postal.closest('label').after(note);
 postal.maxLength=9;postal.inputMode='numeric';postal.placeholder='00000-000';postal.setAttribute('aria-describedby',status.id);
 state.placeholder='UF ou nome do estado';state.removeAttribute('maxlength');state.maxLength=30;state.removeAttribute('pattern');
 const stateList=document.createElement('datalist'),cityList=document.createElement('datalist');stateList.id=`sg-state-list-${id}`;cityList.id=`sg-city-list-${id}`;state.setAttribute('list',stateList.id);city.setAttribute('list',cityList.id);form.append(stateList,cityList);
 const statePicker=document.createElement('select');statePicker.className='sg-address-picker';statePicker.setAttribute('aria-label','Selecionar estado');
 const cityPicker=document.createElement('select');cityPicker.className='sg-address-picker';cityPicker.setAttribute('aria-label','Selecionar cidade');
 state.closest('label').append(statePicker);city.closest('label').append(cityPicker);
 function option(value,label){const o=document.createElement('option');o.value=value;o.textContent=label;return o;}
 statePicker.append(option('','Escolher estado'));cityPicker.append(option('','Escolha um estado primeiro'));
 function canonicalState(){const value=state.value.trim();if(!data)return value.toUpperCase();return Object.keys(data.states).find(uf=>normalize(uf)===normalize(value)||normalize(data.states[uf])===normalize(value))||value.toUpperCase();}
 function updateStateValidation(){const uf=canonicalState();if(data&&uf in data.states){state.value=uf;state.setCustomValidity('');statePicker.value=uf;}else if(state.value.trim())state.setCustomValidity('Escolha um estado brasileiro ou informe a sigla (UF).');else state.setCustomValidity('');return uf;}
 async function updateCities(clear=false){const request=++cityVersion;const uf=updateStateValidation();if(clear){city.value='';cityPicker.value='';}cityList.replaceChildren();cityPicker.replaceChildren(option('','Escolher cidade'));
  try{data=data||await localities();if(disposed||request!==cityVersion)return;const names=data.cities[uf]||[];for(const name of names){cityList.append(option(name,name));cityPicker.append(option(name,name));}cityPicker.value=names.includes(city.value)?city.value:'';city.placeholder=names.length?'Digite ou escolha sua cidade':'Digite sua cidade';}catch(_){if(!disposed)city.placeholder='Digite sua cidade';}
 }
 localities().then(result=>{if(disposed)return;data=result;for(const [uf,name] of Object.entries(data.states).sort((a,b)=>a[1].localeCompare(b[1],'pt-BR'))){const o=option(uf,`${name} · ${uf}`);stateList.append(o);statePicker.append(option(uf,`${name} · ${uf}`));}updateCities();}).catch(()=>{if(!disposed){state.maxLength=2;state.pattern='[A-Za-z]{2}';state.placeholder='UF (ex.: MG)';}});
 async function lookup(){clearTimeout(timer);const cep=postalDigits(postal.value);controller?.abort();const request=++version;
  if(cep.length!==8){status.textContent='Informe os 8 dígitos do CEP, ou preencha o endereço manualmente.';button.disabled=false;return;}
  const requestController=new AbortController();controller=requestController;const timeout=setTimeout(()=>requestController.abort(),8000);const initial=Object.fromEntries(addressKeys.map(key=>[key,form.elements.namedItem(key)?.value||'']));
  status.textContent='Buscando endereço…';button.disabled=true;note.classList.add('is-loading');
  try{const address=await lookupPostalCode(cep,requestController.signal);if(disposed||request!==version||postalDigits(postal.value)!==cep)return;
   for(const key of addressKeys){const input=form.elements.namedItem(key);if(input&&input.value===initial[key]){input.value=address[key];}}
   await updateCities();if(disposed||request!==version)return;status.textContent=address.street&&address.neighborhood?'Endereço encontrado. Confira os dados e informe o número.':'CEP encontrado. Complete a rua ou o bairro que não veio na consulta e informe o número.';
  }catch(error){if(!disposed&&request===version)status.textContent=error.name==='AbortError'?'A consulta demorou. Tente novamente ou preencha manualmente.':error.message||'Não foi possível consultar. Preencha manualmente.';}
  finally{clearTimeout(timeout);if(!disposed&&request===version){button.disabled=false;note.classList.remove('is-loading');}}
 }
 function postalInput(){postal.value=formatPostalCode(postal.value);clearTimeout(timer);controller?.abort();version++;button.disabled=false;note.classList.remove('is-loading');status.textContent='';if(postalDigits(postal.value).length===8)timer=setTimeout(lookup,450);}
 function stateChange(){updateCities(true);}function stateChoice(){state.value=statePicker.value;updateCities(true);}function cityChoice(){if(cityPicker.value)city.value=cityPicker.value;}function cityChange(){cityPicker.value=city.value;}
 postal.addEventListener('input',postalInput);button.addEventListener('click',lookup);state.addEventListener('change',stateChange);state.addEventListener('input',()=>state.setCustomValidity(''));statePicker.addEventListener('change',stateChoice);cityPicker.addEventListener('change',cityChoice);city.addEventListener('change',cityChange);
 form.addEventListener('submit',updateStateValidation,true);
 return ()=>{disposed=true;version++;clearTimeout(timer);controller?.abort();};
}
