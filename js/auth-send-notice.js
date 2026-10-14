// An acknowledgement is not proof of email delivery. Never include an OTP here.
export async function announceAuthRequest(message) {
  if (window.SG?.toast) window.SG.toast(message, {duration: 5500});
  if (!('Notification' in window) || Notification.permission !== 'granted' || !('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) return;
    await registration.showNotification('Solicitação de acesso aceita', {
      body: message,
      icon: '/icons/street-192.png',
      tag: 'street-auth-request',
      data: {url: new URL('/', window.location.origin).href},
    });
  } catch (_) { /* The visible status stays available if the OS rejects a notice. */ }
}
