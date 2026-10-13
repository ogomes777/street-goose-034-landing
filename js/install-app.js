import {PushService} from "../src/services/PushService.ts";
import './install-app.css';
let installPrompt;
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
let registration;
if ('serviceWorker' in navigator && window.isSecureContext) registration = navigator.serviceWorker.register('/sw.js');
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; refresh(); });
window.addEventListener('appinstalled', refresh);
const section = document.createElement('section');
section.className = 'sg-install';
section.setAttribute('aria-label', 'Street Goose na sua tela inicial');
section.innerHTML = '<div><span class="sg-install-eyebrow">STREET GOOSE · SEMPRE PERTO</span><h2>Sua Street. Um toque de distância.</h2><p>Adicione o ícone à tela inicial para abrir sua conta, acompanhar pedidos e descobrir suas recompensas.</p></div><div class="sg-install-actions"><button type="button" data-install>Adicionar à tela inicial</button><button type="button" data-push>Ativar notificações neste dispositivo</button><a href="/conta">Escolher meus avisos por e-mail</a><p data-install-status role="status" aria-live="polite"></p></div>';
const footer = document.querySelector('footer');
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
