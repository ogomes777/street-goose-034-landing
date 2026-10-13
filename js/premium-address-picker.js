const folded=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
let pickerId=0;
export function premiumAddressPicker(select,input,kind){
 const id=++pickerId,container=document.createElement('div');container.className='sg-location-picker';select.hidden=true;input.removeAttribute('list');
 const trigger=document.createElement('button');trigger.type='button';trigger.className='sg-location-trigger';trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-haspopup','listbox');
 const icon=document.createElement('span');icon.className='sg-location-icon';icon.textContent='⌖';icon.setAttribute('aria-hidden','true');
 const caption=document.createElement('span'),eyebrow=document.createElement('small'),value=document.createElement('strong');eyebrow.textContent=kind==='state'?'SELEÇÃO DE ESTADO':'SELEÇÃO DE CIDADE';caption.append(eyebrow,value);
 const arrow=document.createElement('span');arrow.className='sg-location-arrow';arrow.textContent='⌄';arrow.setAttribute('aria-hidden','true');trigger.append(icon,caption,arrow);
 const panel=document.createElement('div');panel.className='sg-location-panel';panel.hidden=true;
 const search=document.createElement('input');search.type='search';search.className='sg-location-search';search.placeholder=kind==='state'?'Buscar estado ou UF…':'Buscar sua cidade…';search.setAttribute('aria-label',kind==='state'?'Pesquisar estados':'Pesquisar cidades');search.setAttribute('role','combobox');search.setAttribute('aria-autocomplete','list');search.setAttribute('aria-expanded','false');search.setAttribute('aria-controls',`sg-location-list-${id}`);
 const meta=document.createElement('p');meta.className='sg-location-meta';meta.setAttribute('role','status');
 const list=document.createElement('div');list.className='sg-location-list';list.id=`sg-location-list-${id}`;list.setAttribute('role','listbox');list.setAttribute('aria-label',kind==='state'?'Estados brasileiros':'Cidades do estado');trigger.setAttribute('aria-controls',list.id);
 const more=document.createElement('button');more.type='button';more.className='sg-location-more';more.textContent='Mostrar mais opções';
 panel.append(search,meta,list,more);container.append(trigger,panel);select.after(container);
 let options=[],filtered=[],active=-1,limit=60,open=false;
 function updateCaption(){const selected=select.options[select.selectedIndex];value.textContent=selected?.value?selected.textContent:(kind==='state'?'Escolher estado':'Escolher cidade');trigger.setAttribute('aria-label',`${kind==='state'?'Escolher estado':'Escolher cidade'}: ${selected?.value?selected.textContent:'nenhum selecionado'}`);}
 function setActive(index){if(!filtered.length)return;active=Math.max(0,Math.min(index,Math.min(filtered.length,limit)-1));for(const [i,row] of [...list.children].entries())row.classList.toggle('is-active',i===active);const row=list.children[active];search.setAttribute('aria-activedescendant',row.id);row.scrollIntoView({block:'nearest'});}
 function choose(item){select.value=item.value;select.dispatchEvent(new Event('change',{bubbles:true}));updateCaption();close(true);}
 function render(){const query=folded(search.value.trim());filtered=options.filter(item=>folded(item.label+' '+item.value).includes(query));list.replaceChildren();active=-1;search.removeAttribute('aria-activedescendant');
  for(const [index,item] of filtered.slice(0,limit).entries()){const row=document.createElement('div');row.id=`sg-location-option-${id}-${index}`;row.className='sg-location-option';row.setAttribute('role','option');row.setAttribute('aria-selected',String(select.value===item.value));const text=document.createElement('span');text.textContent=item.label;const check=document.createElement('span');check.textContent=select.value===item.value?'✓':'↗';check.setAttribute('aria-hidden','true');row.append(text,check);row.addEventListener('pointerdown',event=>event.preventDefault());row.addEventListener('click',()=>choose(item));list.append(row);}
  meta.textContent=options.length?`${filtered.length} ${filtered.length===1?'opção encontrada':'opções encontradas'}${filtered.length>limit?' · refine a busca ou mostre mais':''}`:(kind==='city'?'Escolha um estado para ver as cidades.':'Carregando estados…');
  if(options.length&&!filtered.length)meta.textContent='Nenhum resultado. Tente outro nome ou digite no campo acima.';
  more.hidden=filtered.length<=limit;
 }
 function refresh(){options=[...select.options].filter(o=>o.value).map(o=>({value:o.value,label:o.textContent}));updateCaption();if(open)render();}
 function close(restore=false){open=false;panel.hidden=true;trigger.setAttribute('aria-expanded','false');search.setAttribute('aria-expanded','false');search.removeAttribute('aria-activedescendant');if(restore)trigger.focus();}
 function show(){open=true;panel.hidden=false;trigger.setAttribute('aria-expanded','true');search.setAttribute('aria-expanded','true');search.value='';limit=60;render();search.focus();}
 trigger.addEventListener('click',()=>open?close():show());trigger.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();show();setActive(0);}});
 search.addEventListener('input',()=>{limit=60;render();});
 container.addEventListener('keydown',event=>{if(event.key==='Escape'&&open){event.preventDefault();event.stopPropagation();close(true);}else if(event.target===search){if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();setActive(active+(event.key==='ArrowDown'?1:-1));}else if(event.key==='Enter'){event.preventDefault();if(active>=0)choose(filtered[active]);}}});
 container.addEventListener('focusout',()=>{queueMicrotask(()=>{if(open&&!container.contains(document.activeElement))close();});});
 function outside(event){if(open&&!container.contains(event.target))close();}document.addEventListener('pointerdown',outside);
 more.addEventListener('click',()=>{limit+=60;render();search.focus();});select.addEventListener('change',refresh);function inputChange(){queueMicrotask(updateCaption);}input.addEventListener('change',inputChange);
 const observer=new MutationObserver(refresh);observer.observe(select,{childList:true,subtree:true});refresh();
 return ()=>{observer.disconnect();document.removeEventListener('pointerdown',outside);select.removeEventListener('change',refresh);input.removeEventListener('change',inputChange);};
}
