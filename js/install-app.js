import {mountInteractionGuide} from './interaction-guide.js';
import {PushService} from "../src/services/PushService.ts";
import './install-app.css';
import './live-activity.js';
import './closing-premium.css';
import './final-four-polish.css';
import './theme-audio-finale-polish.css';
import './final-four-interactions.js';
let installPrompt;
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
let registration;
if ('serviceWorker' in navigator && window.isSecureContext) registration = navigator.serviceWorker.register('/sw.js');
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; refresh(); });
window.addEventListener('appinstalled', () => { storeInstalledChoice(); refresh(); });
const section = document.createElement('section');
section.className = 'sg-install';
section.setAttribute('aria-label', 'Street Goose na sua tela inicial');
section.innerHTML = "<div class=\"sg-install-story\"><span class=\"sg-install-eyebrow\">STREET GOOSE SEU ACESSO EXCLUSIVO</span><div class=\"sg-install-emblem\" aria-hidden=\"true\"><span>034</span><i></i><i></i></div><h2>Sua Street.<br>Um toque de distância.</h2><p>Seu nível. Seus próximos drops. Cada conquista, mais perto de você.</p><ol class=\"sg-install-steps\"><li><b>01</b><span>Adicione à tela inicial<small>Um ícone para abrir sua Street.</small></span></li><li><b>02</b><span>Autorize os avisos<small>Pedidos e conquistas, mesmo com o site fechado.</small></span></li><li><b>03</b><span>Escolha seus canais<small>Você decide quais avisos receber.</small></span></li></ol></div><div class=\"sg-install-actions\"><div class=\"sg-install-pass-stage\" aria-hidden=\"true\"><div class=\"sg-install-pass\"><span>STREET GOOSE</span><b>034</b><small>MEMBER ACCESS STREET CULTURE</small><i class=\"sg-pass-chip\"><em></em></i><div class=\"sg-pass-dust\"></div><div class=\"sg-pass-glint\"></div></div></div><span class=\"sg-install-eyebrow\">SUA STREET, SEMPRE POR PERTO</span><div class=\"sg-action-guide\"><div class=\"sg-action-guide-art\" aria-hidden=\"true\"><span class=\"sg-guide-fallback\"></span></div><div class=\"sg-action-guide-copy\"><span>SEU PRÓXIMO TOQUE</span><strong>Leve a Street para sua tela.</strong><small>Use os botões abaixo para adicionar o ícone e escolher seus avisos.</small></div></div><button type=\"button\" data-install disabled>Adicionar à tela inicial <span aria-hidden=\"true\"></span></button><button type=\"button\" data-push>Ativar notificações neste dispositivo</button><a href=\"/conta\">Escolher meus avisos por e-mail</a><p class=\"sg-install-footnote\">No iPhone, adicione pelo Safari e abra pelo ícone. Em outros aparelhos, a instalação pode ser opcional para o push. A entrega depende da permissão e da conexão do dispositivo.</p><p data-install-status role=\"status\" aria-live=\"polite\"></p></div>";
const footer = document.querySelector('body > footer');
if (footer) footer.before(section); else document.body.append(section);
section.querySelector('.sg-install-pass').insertAdjacentHTML('afterbegin',
  '<div class="sg-pass-window-controls" aria-hidden="true"><i></i><i></i><i></i></div><div class="sg-pass-emboss" aria-hidden="true"></div>');
section.querySelector('.sg-install-steps li:nth-child(2)').insertAdjacentHTML('beforeend',
  '<span class="sg-steps-bell" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4M3 4 1 6m20-2 2 2"/></svg></span>');
// Decorative only: notification permission still happens only on explicit user click.
section.querySelector('[data-push]').insertAdjacentHTML('afterbegin',
  '<svg class="sg-push-button-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/></svg>');
const INSTALL_FLAG = 'sg034_install_confirmed_v2';
function alreadyConfirmed() { try { return localStorage.getItem(INSTALL_FLAG) === 'yes'; } catch (_) { return false; } }
function storeInstalledChoice() { try { localStorage.setItem(INSTALL_FLAG, 'yes'); } catch (_) { /* storage disabled */ } }
// Embedded social browsers generally cannot install PWA shortcuts directly.
const inAppBrowser = /TikTok|musical_ly|BytedanceWebview|Instagram|FBAN|FBAV/i.test(navigator.userAgent || '');
const platform = (() => {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
})();
const guide = document.createElement('dialog');
guide.className = 'sg-install-dialog';
guide.setAttribute('aria-label', 'Como adicionar a Street Goose à tela inicial');
document.body.append(guide);
const tutorial = {
  ios: ['Abra este site pelo Safari no iPhone ou iPad.', 'Toque no botão Compartilhar, representado por um quadrado com seta para cima. Se não aparecer, procure em Mais opções.', 'Escolha Adicionar à Tela de Início e confirme em Adicionar.', 'Abra a Street Goose pelo novo ícone. A partir dele você poderá permitir notificações, quando suportadas.'],
  android: ['No Chrome, toque nos três pontos do menu do navegador.', 'Escolha Instalar aplicativo ou Adicionar à tela inicial.', 'Confirme a instalação e abra a Street Goose pelo ícone criado.'],
  desktop: ['Abra o menu do Chrome ou Edge (três pontos na barra do navegador).', 'Procure Instalar Street Goose, Instalar aplicativo ou Apps e confirme.', 'Abra o aplicativo pelo ícone criado no computador.']
};
function showGuide() {
  const heading = inAppBrowser ? 'Abra a Street no navegador.' :
    platform === 'ios' ? 'Sua Street no iPhone.' : platform === 'android' ? 'Sua Street no Android.' : 'Sua Street no computador.';
  const instructions = inAppBrowser ? [
    'No TikTok ou Instagram, abra o menu de opções deste site e escolha Abrir no navegador, Safari ou Chrome, se disponível.',
    'Se não aparecer essa opção, copie o endereço da Street Goose e abra manualmente no Safari ou Chrome.',
    'Já no navegador, toque em Adicionar à tela inicial e siga as instruções de instalação.'
  ] : tutorial[platform];
  guide.innerHTML = '<div class="sg-install-dialog-inner"><div class="sg-install-dialog-top"><span>STREET GOOSE / 034</span><button class="sg-install-dialog-close" type="button" data-guide-close aria-label="Fechar tutorial">×</button></div>' +
   '<h3>' + heading + '</h3><p>Por segurança, o navegador controla a instalação. Siga estes passos para criar o ícone:</p>' +
   '<ol class="sg-install-dialog-steps">' + instructions.map(step => '<li>' + step + '</li>').join('') + '</ol>' +
   (inAppBrowser ? '<button type="button" class="sg-install-dialog-action" data-guide-copy>Copiar endereço da Street Goose</button>' :
    '<button type="button" class="sg-install-dialog-action" data-guide-done>Já adicionei à tela inicial</button>') +
   '<button type="button" class="sg-install-dialog-secondary" data-guide-later>Vou fazer depois</button><p data-guide-status role="status" aria-live="polite"></p></div>';
  guide.querySelector('[data-guide-close]').addEventListener('click', () => guide.close());
  guide.querySelector('[data-guide-later]').addEventListener('click', () => guide.close());
  if (inAppBrowser) {
    guide.querySelector('[data-guide-copy]').addEventListener('click', async () => {
      const status = guide.querySelector('[data-guide-status]');
      const url = 'https://www.streetgoose034.com.br/';
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard indisponível');
        await navigator.clipboard.writeText(url);
        status.textContent = 'Endereço copiado. Abra o Safari ou Chrome e cole na barra de endereço.';
      } catch (_) {
        status.textContent = 'Abra este endereço no Safari ou Chrome: ' + url;
      }
    });
  } else {
    guide.querySelector('[data-guide-done]').addEventListener('click', () => {
      storeInstalledChoice(); guide.close(); refresh();
    });
  }
  if (!guide.open) guide.showModal();
}
const helpButton = document.createElement('button');
helpButton.type = 'button';
helpButton.className = 'sg-install-help';
helpButton.textContent = 'Ver instruções de instalação novamente';
helpButton.hidden = true;
helpButton.addEventListener('click', showGuide);
section.querySelector('[data-install]').after(helpButton);
function refresh() {
  const installed = Boolean(standalone());
  const confirmed = installed || alreadyConfirmed();
  const button = section.querySelector('[data-install]');
  button.hidden = confirmed;
  helpButton.hidden = !confirmed || installed;
  if (confirmed) section.querySelector('[data-install-status]').textContent =
    installed ? 'Você já está usando a Street Goose como aplicativo.' :
      'Ícone confirmado. Abra a Street Goose pela tela inicial para usar a experiência instalada.';
}
const installAction = section.querySelector('[data-install]');
installAction.addEventListener('click', async () => {
  const status = section.querySelector('[data-install-status]');
  if (standalone()) { refresh(); return; }
  // Social-app webviews may expose prompt hooks that never complete.
  // Do not mark installed or invoke them here: hand off to a real browser.
  if (inAppBrowser) { showGuide(); return; }
  if (installPrompt) {
    const prompt = installPrompt; installPrompt = null;
    try {
      await prompt.prompt();
      const result = await prompt.userChoice;
      if (result.outcome === 'accepted') {
        status.textContent = 'Instalação solicitada. Quando finalizar, abra pelo novo ícone.';
      } else {
        status.textContent = 'Instalação cancelada. Você pode tentar novamente pelo menu do navegador.';
        showGuide();
      }
    } catch (_) {
      showGuide();
    }
  } else {
    showGuide();
  }
});
// Keep the action disabled until its handler is bound. Without this, quick
// touches while heavy landing modules initialize can silently do nothing.
installAction.disabled = false;
refresh();
if (registration) registration.catch(() => { section.querySelector('[data-install-status]').textContent = 'A instalação não está disponível agora. Você pode continuar usando o site.'; });

section.querySelector("[data-push]").addEventListener("click",async e=>{const b=e.currentTarget;b.disabled=true;try{const r=await PushService.enable();section.querySelector("[data-install-status]").textContent=r.message;}catch(_){section.querySelector("[data-install-status]").textContent="Não foi possível conectar agora.";}finally{b.disabled=false;}});

// Pointer-driven, GPU-composited. Touch stays scrollable; no WebGL loop.
const passStage = section.querySelector('.sg-install-pass-stage');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let passFrame = 0, passPoint = null, tapReset = 0, passBounds = null;
function resetPass() {
  cancelAnimationFrame(passFrame);
  passFrame = 0; passPoint = null; passBounds = null;
  passStage.classList.remove('is-tracking');
  passStage.style.removeProperty('--sg-card-tilt-x');
  passStage.style.removeProperty('--sg-card-tilt-y');
  passStage.style.removeProperty('--shine-x');
  passStage.style.removeProperty('--shine-y');
}
function movePass(event) {
  if (reducedMotion.matches || document.hidden || !passStage.isConnected) return;
  if (event.pointerType === 'touch' && event.buttons === 0) return;
  const bounds = passBounds || (passBounds = passStage.getBoundingClientRect());
  if (!bounds.width || !bounds.height) return;
  const x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
  const y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
  passPoint = {x,y};
  if (passFrame) return;
  passFrame = requestAnimationFrame(() => {
    passFrame = 0;
    if (!passPoint) return;
    passStage.classList.add('is-tracking');
    passStage.style.setProperty('--sg-card-tilt-x', `${-passPoint.y * 12}deg`);
    passStage.style.setProperty('--sg-card-tilt-y', `${passPoint.x * 16}deg`);
    passStage.style.setProperty('--shine-x', `${(passPoint.x + 1) * 50}%`);
    passStage.style.setProperty('--shine-y', `${(passPoint.y + 1) * 50}%`);
  });
}
passStage.addEventListener('pointerenter', () => { passBounds = passStage.getBoundingClientRect(); }, {passive:true});
passStage.addEventListener('pointerdown', event => { passBounds = passStage.getBoundingClientRect(); movePass(event); }, {passive:true});
passStage.addEventListener('pointermove', movePass, {passive:true});
passStage.addEventListener('pointerup', event => {
  if (event.pointerType === 'touch' && !reducedMotion.matches) {
    passStage.classList.add('is-tapped');
    clearTimeout(tapReset);
    tapReset = setTimeout(() => passStage.classList.remove('is-tapped'), 480);
  }
  resetPass();
}, {passive:true});
for (const type of ['pointerleave','pointercancel']) passStage.addEventListener(type, resetPass, {passive:true});
window.addEventListener('resize', () => { passBounds = null; }, {passive:true});
reducedMotion.addEventListener('change', resetPass);
document.addEventListener('visibilitychange', () => { if (document.hidden) resetPass(); });
if('IntersectionObserver' in window){const motionObserver=new IntersectionObserver(entries=>{for(const entry of entries)entry.target.classList.toggle('sg-motion-paused',!entry.isIntersecting);},{rootMargin:'80px'});for(const panel of document.querySelectorAll('.sg-install,.sg-live-activity'))motionObserver.observe(panel);}

mountInteractionGuide(section.querySelector('.sg-action-guide-art'));
