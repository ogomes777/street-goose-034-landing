import {PushService} from "../src/services/PushService.ts";
import './install-app.css';
import './live-activity.js';
let installPrompt;
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
let registration;
if ('serviceWorker' in navigator && window.isSecureContext) registration = navigator.serviceWorker.register('/sw.js');
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; refresh(); });
window.addEventListener('appinstalled', refresh);
const section = document.createElement('section');
section.className = 'sg-install';
section.setAttribute('aria-label', 'Street Goose na sua tela inicial');
section.innerHTML = '<div class="sg-install-story"><span class="sg-install-eyebrow">STREET GOOSE · SEU ACESSO EXCLUSIVO</span><div class="sg-install-emblem" aria-hidden="true"><span>034</span><i></i><i></i></div><h2>Sua Street.<br>Um toque de distância.</h2><p>Seu nível. Seus próximos drops. Cada conquista, mais perto de você.</p><ol class="sg-install-steps"><li><b>01</b><span>Adicione à tela inicial<small>Um ícone para abrir sua Street.</small></span></li><li><b>02</b><span>Autorize os avisos<small>Pedidos e conquistas, mesmo com o site fechado.</small></span></li><li><b>03</b><span>Escolha seus canais<small>Você decide quais avisos receber.</small></span></li></ol></div><div class="sg-install-actions"><span class="sg-install-eyebrow">SEU PRÓXIMO MOVIMENTO</span><button type="button" data-install>Adicionar à tela inicial <span aria-hidden="true">↗</span></button><button type="button" data-push>Ativar notificações neste dispositivo</button><a href="/conta">Escolher meus avisos por e-mail</a><p class="sg-install-footnote">No iPhone, adicione pelo Safari e abra pelo ícone. Em outros aparelhos, a instalação pode ser opcional para o push. A entrega depende da permissão e da conexão do dispositivo.</p><p data-install-status role="status" aria-live="polite"></p></div>';
const footer = document.querySelector('body > footer');
if (footer) footer.before(section); else document.body.append(section);
function refresh() {
 const button = section.querySelector('[data-install]');
 button.hidden = Boolean(standalone());
 if (standalone()) section.querySelector('[data-install-status]').textContent = 'Você já está usando a Street Goose como aplicativo.';
}
section.querySelector('[data-install]').addEventListener('click', async () => {
 const status = section.querySelector('[data-install-status]');
 if (installPrompt) {
  const prompt = installPrompt; installPrompt = null;
  try { await prompt.prompt(); const result = await prompt.userChoice; status.textContent = result.outcome === 'accepted' ? 'Instalação solicitada. Confira a tela inicial.' : 'Você pode adicionar quando quiser.'; } catch (_) { status.textContent = 'Abra o menu do navegador e escolha Instalar aplicativo.'; }
 } else {
  status.textContent = /iPad|iPhone|iPod/.test(navigator.userAgent) ? 'No Safari: toque em Compartilhar → Adicionar à Tela de Início. Depois abra pelo ícone para configurar notificações.' : 'No menu do navegador, escolha Instalar aplicativo ou Adicionar à tela inicial. A opção depende do navegador.';
 }
});
refresh();
if (registration) registration.catch(() => { section.querySelector('[data-install-status]').textContent = 'A instalação não está disponível agora. Você pode continuar usando o site.'; });

section.querySelector("[data-push]").addEventListener("click",async e=>{const b=e.currentTarget;b.disabled=true;try{const r=await PushService.enable();section.querySelector("[data-install-status]").textContent=r.message;}catch(_){section.querySelector("[data-install-status]").textContent="Não foi possível conectar agora.";}finally{b.disabled=false;}});
