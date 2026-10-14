import './crm-assistant.css';
import {CrmAssistantService} from '../src/services/CrmAssistantService.ts';
const areas=[['Financeiro','Resuma o financeiro'],['Pedidos','Resuma os pedidos'],['Catálogo','Resuma o catálogo'],['Clientes','Resuma os clientes'],['Comunidade','Resuma a comunidade'],['Cupons','Resuma os cupons e recompensas'],['Newsletter','Resuma a newsletter'],['XP','Resuma o XP']];
const format=m=>m.money?new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(m.value/100):new Intl.NumberFormat('pt-BR').format(m.value);
export function mountCrmAssistant(host){
 const esc=window.SG.esc;
 const glyphs='01{}[]<>/;:=+-ABCDEFGHIJKLMNOPQRSTUVWXYZ034';
 const matrix='<div class="crm-os-matrix" aria-hidden="true">'+Array.from({length:24},(_,i)=>'<i style="--col:'+i+';--speed:'+(4+i%5*.7)+'s;--delay:-'+(i*.63)+'s">'+esc(Array.from({length:54},(_,j)=>glyphs[(i*17+j*13+j*j)%glyphs.length]).join(''))+'</i>').join('')+'</div>';
 host.innerHTML='<section class="crm-ai crm-os" aria-label="Assistente de dados da loja">'+matrix+'<div class="crm-os-nebula" aria-hidden="true"></div><div class="crm-os-system"><span>SG SYSTEM 034</span><span><i></i> CONSULTAS AO BANCO</span></div><div class="crm-ai-head"><div class="crm-ai-orb" aria-hidden="true"><i class="crm-os-ring"></i><i class="crm-os-ring outer"></i><i class="crm-galaxy-disk"></i><i class="crm-galaxy-stars"></i><span>034</span></div><div><p class="crm-ai-kicker">Street Goose Intelligence</p><h2>Sua loja, em uma resposta</h2></div></div><p class="crm-ai-mode">Consulte os dados reais da loja por texto. A voz depende dos recursos do seu navegador.</p><div class="crm-ai-chips">'+areas.map(([label,q])=>'<button type="button" data-crm-question="'+q+'">'+label+'</button>').join('')+'</div><form data-crm-form><label for="crm-ai-question">O que você quer esclarecer?</label><textarea id="crm-ai-question" maxlength="1600" placeholder="Me resuma quanto entrou e saiu nos últimos 30 dias"></textarea><div class="crm-ai-actions"><select hidden aria-label="Modo de consulta" data-crm-mode><option value="guided">Assistente da loja</option></select><select hidden aria-label="Período" data-crm-period><option value="30">Últimos 30 dias</option><option value="7">Últimos 7 dias</option><option value="90">Últimos 90 dias</option><option value="365">Últimos 365 dias</option></select><fieldset class="crm-ai-period"><legend>Janela de análise</legend><div><button type="button" data-period="7" aria-pressed="false"><b>7</b><span>dias</span></button><button type="button" data-period="30" aria-pressed="true"><b>30</b><span>dias</span></button><button type="button" data-period="90" aria-pressed="false"><b>90</b><span>dias</span></button><button type="button" data-period="365" aria-pressed="false"><b>365</b><span>dias</span></button></div></fieldset><button type="button" data-crm-new>Nova conversa</button><button type="button" data-crm-record>Gravar áudio</button><button type="button" data-crm-transcribe hidden>Transcrever áudio</button><button type="button" data-crm-discard hidden>Descartar áudio</button><button type="submit">Enviar pergunta</button></div><div class="crm-ai-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><audio data-crm-preview controls hidden></audio><p class="crm-ai-status" role="status" aria-live="polite"></p></form><div class="crm-ai-log" data-crm-log></div></section>';
 const panel=host.firstElementChild,form=host.querySelector('form'),input=host.querySelector('textarea'),status=host.querySelector('.crm-ai-status'),record=host.querySelector('[data-crm-record]'),preview=host.querySelector('audio'),discard=host.querySelector('[data-crm-discard]'),log=host.querySelector('[data-crm-log]');
 let disposed=false,busy=false,stream=null,recorder=null,recognition=null,blobUrl=null,timer=null,seconds=0,recording=false,starting=false,stopping=false,utterance=null,requestId=0,audioBlob=null,transcribing=false;
 const history=[],audioUrls=new Set(),mode=host.querySelector("[data-crm-mode]"),modeText=host.querySelector(".crm-ai-mode");
 const say=text=>{if(!disposed)status.textContent=text;};
 if(!(window.SpeechRecognition||window.webkitSpeechRecognition)){record.hidden=true;modeText.textContent+=' Neste navegador, use texto para perguntar.';}
 else record.textContent='Perguntar por voz';
 const stopTracks=()=>{stream?.getTracks().forEach(t=>t.stop());stream=null;};
 function stopRecording(){recording=false;clearInterval(timer);try{recognition?.stop();}catch(_){}if(recorder?.state==='recording'){stopping=true;recorder.stop();}stopTracks();panel.classList.remove('is-recording');record.textContent='Gravar áudio';}
 function clearAudio(){if(blobUrl)URL.revokeObjectURL(blobUrl);blobUrl=null;preview.pause();preview.removeAttribute('src');audioBlob=null;host.querySelector("[data-crm-transcribe]").hidden=true;preview.hidden=true;discard.hidden=true;}
 record.onclick=async()=>{
  if(starting||stopping||busy||transcribing)return;if(recording){stopRecording();return;}
  if(!(window.SpeechRecognition||window.webkitSpeechRecognition)||!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){say('Este navegador não permite gravar. Você pode escrever sua pergunta.');return;}
  starting=true;record.disabled=true;clearAudio();
  try{
   const acquired=await navigator.mediaDevices.getUserMedia({audio:true});
   if(disposed){acquired.getTracks().forEach(t=>t.stop());return;}stream=acquired;input.value='';
   const mime=["audio/webm","audio/mp4"].find(t=>MediaRecorder.isTypeSupported(t));
   recorder=new MediaRecorder(stream,{audioBitsPerSecond:32000,...(mime?{mimeType:mime}:{})});const currentRecorder=recorder,chunks=[];
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   recorder.onstop=()=>{stopping=false;if(disposed)return;audioBlob=new Blob(chunks,{type:currentRecorder.mimeType});blobUrl=URL.createObjectURL(audioBlob);host.querySelector("[data-crm-transcribe]").hidden=true;preview.src=blobUrl;preview.hidden=false;discard.hidden=false;say('Confira o texto reconhecido antes de enviar. Se estiver incompleto, edite a pergunta. A gravação fica apenas nesta sessão.');};
   recorder.onerror=()=>{stopRecording();say('A gravação falhou. Tente novamente ou escreva.');};
   const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
   if(Speech&&mode.value==='guided'){recognition=new Speech();recognition.lang='pt-BR';recognition.continuous=true;recognition.interimResults=false;let transcript='';recognition.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++)if(e.results[i].isFinal)transcript+=e.results[i][0].transcript+' ';if(!disposed)input.value=transcript.trim().slice(0,600);};recognition.onerror=()=>say('A transcrição não está disponível. A gravação continua; escreva a pergunta após ouvir.');try{recognition.start();}catch(_){}}
   recorder.start();recording=true;seconds=0;panel.classList.add('is-recording');record.textContent='Parar gravação';say('Ditando por até um minuto. Seu navegador pode usar o serviço de reconhecimento de voz dele. Confira o texto antes de enviar.');timer=setInterval(()=>{if(++seconds>=60)stopRecording();},1000);
  }catch(_){stopRecording();say('Não foi possível acessar o microfone. Confira a permissão do navegador.');}
  finally{starting=false;if(!disposed)record.disabled=false;}
 };
 discard.onclick=()=>{clearAudio();say('Áudio descartado.');};
 host.querySelector('[data-crm-new]').onclick=()=>{if(busy||recording||starting||stopping||transcribing){say('Aguarde a operação terminar.');return;}history.length=0;log.querySelectorAll('audio').forEach(a=>a.pause());audioUrls.forEach(url=>URL.revokeObjectURL(url));audioUrls.clear();log.innerHTML='';input.value='';clearAudio();window.speechSynthesis?.cancel();say('Nova conversa.');};
 host.querySelectorAll('[data-period]').forEach(b=>b.onclick=()=>{host.querySelector('[data-crm-period]').value=b.dataset.period;host.querySelectorAll('[data-period]').forEach(other=>other.setAttribute('aria-pressed',String(other===b)));});
 host.querySelectorAll('[data-crm-question]').forEach(b=>b.onclick=()=>{input.value=b.dataset.crmQuestion;host.querySelectorAll('[data-crm-question]').forEach(other=>other.setAttribute('aria-pressed',String(other===b)));input.focus();});
 form.onsubmit=async e=>{
  e.preventDefault();e.stopPropagation();if(busy||starting||stopping||recording||transcribing){say('Pare a gravação antes de consultar.');return;}
  if(!input.value.trim()&&!audioBlob){say("Escreva uma pergunta ou grave um áudio.");return;}busy=true;const submit=form.querySelector('[type=submit]');submit.disabled=true;record.disabled=true;const id=++requestId;let question=input.value.trim();say('Consultando os registros da loja...');
  try{
   if(!question)throw Error('Não foi possível reconhecer a fala. Escreva sua pergunta para consultar.');
   if(disposed||id!==requestId)return;
   const answer=await CrmAssistantService.ask(question,Number(host.querySelector('[data-crm-period]').value));
   if(disposed||id!==requestId)return;
   history.push({role:'user',content:question},{role:'assistant',content:(answer.summary+'\n'+answer.metrics.map(m=>m.label+': '+format(m)).join('\n')+'\nFonte: '+answer.source).slice(0,2500)});while(history.length>8)history.shift();
   renderAnswer(answer,question);say('Resposta pronta, com referências dos dados consultados.');
  }
  catch(e){say(e.message||'Não foi possível consultar agora.');}
  finally{busy=false;if(!disposed){submit.disabled=false;record.disabled=false;}}
 };
 function renderAnswer(a,q){
  const article=document.createElement('article');article.className='crm-ai-answer';const max=Math.max(1,...a.chart.map(p=>Math.abs(p.value)));
  article.innerHTML='<p class="crm-ai-question">'+esc(q)+'</p><h3>'+esc(a.title)+'</h3><p>'+esc(a.summary)+'</p><div class="crm-ai-metrics">'+a.metrics.map(m=>'<div class="crm-ai-metric"><span>'+esc(m.label)+'</span><b>'+esc(format(m))+'</b></div>').join('')+'</div><div class="crm-ai-chart" role="group" aria-label="Gráfico de '+esc(a.title)+'">'+a.chart.map(m=>'<div class="crm-ai-row"><span>'+esc(m.label)+'</span><div class="crm-ai-track" aria-hidden="true"><i class="crm-ai-bar'+(m.value<0?' negative':'')+'" style="width:'+Math.abs(m.value)/max*100+'%"></i></div><b>'+esc(format(m))+'</b></div>').join('')+'</div><ul>'+a.notes.map(n=>'<li>'+esc(n)+'</li>').join('')+'</ul><p class="crm-ai-source">Fonte: '+esc(a.source)+'<br>Período: '+new Date(a.from).toLocaleString('pt-BR')+' até '+new Date(a.to).toLocaleString('pt-BR')+'<br>Consultado em '+new Date(a.generatedAt).toLocaleString('pt-BR')+'</p><div class="crm-ai-actions"><button type="button" data-crm-listen>Gerar áudio</button><button type="button" data-crm-image>Baixar imagem</button></div>';
  const voiceText=(a.summary+' '+a.metrics.map(m=>m.label+': '+format(m)).join('. ')).slice(0,3000);
  const native=article.querySelector('[data-crm-listen]');native.textContent='Ouvir resposta';native.disabled=!window.speechSynthesis;native.onclick=()=>{
   if(!window.speechSynthesis){say('Leitura em voz indisponível.');return;}
   speechSynthesis.cancel();utterance=new SpeechSynthesisUtterance(voiceText);utterance.lang='pt-BR';speechSynthesis.speak(utterance);
  };
  article.querySelector('[data-crm-image]').onclick=()=>exportImage(a);
  log.prepend(article);while(log.children.length>5)log.lastElementChild.remove();
 }
 function exportImage(a){
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=360+a.metrics.length*55+a.chart.length*35+a.notes.length*220;const c=canvas.getContext('2d');if(!c)return;
  c.fillStyle='#111214';c.fillRect(0,0,canvas.width,canvas.height);c.fillStyle='#d7bd88';c.font='bold 24px sans-serif';c.fillText('STREET GOOSE 034',50,55);c.fillStyle='#fff';c.font='bold 36px sans-serif';c.fillText(a.title,50,115);c.font='20px sans-serif';c.fillText(new Date(a.from).toLocaleDateString('pt-BR')+' até '+new Date(a.to).toLocaleDateString('pt-BR'),50,155);
  const wrap=(text,x,y,width,lineHeight)=>{let line='';for(const word of text.split(' ')){if(c.measureText(line+word).width>width&&line){c.fillText(line,x,y);y+=lineHeight;line='';}line+=word+' ';}c.fillText(line,x,y);return y+lineHeight;};
  let y=210;a.metrics.forEach(m=>{c.fillStyle='#c3c1bc';c.fillText(m.label,50,y);c.fillStyle='#f2d6a9';c.fillText(format(m),680,y);y+=55;});
  const max=Math.max(1,...a.chart.map(m=>Math.abs(m.value)));y+=25;a.chart.forEach(m=>{c.fillStyle='#ccc';c.font='16px sans-serif';c.fillText(m.label.length>28?m.label.slice(0,27)+'…':m.label,50,y);c.fillStyle=m.value<0?'#da6e62':'#d7bd88';c.fillRect(310,y-14,380*Math.abs(m.value)/max,14);c.fillStyle='#fff';c.fillText(format(m),750,y);y+=35;});
  y+=30;c.fillStyle='#aaa';c.font='17px sans-serif';a.notes.forEach(n=>{y=wrap(n,50,y,970,24)+14;});wrap('Fonte: '+a.source+' | '+new Date(a.generatedAt).toLocaleString('pt-BR'),50,y+20,970,24);
  canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='street-goose-relatorio.png';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},'image/png');
 }
 return ()=>{disposed=true;history.length=0;audioUrls.forEach(url=>URL.revokeObjectURL(url));audioUrls.clear();++requestId;stopRecording();clearAudio();try{recognition?.abort();}catch(_){}if(utterance)window.speechSynthesis?.cancel();host.innerHTML='';};
}
