// No cache interception: authentication and checkout always use the network.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('push', event => {
 let payload = {}; try { payload = event.data ? event.data.json() : {}; } catch (_) { return; }
 const url = new URL(payload.url || '/conta', self.location.origin);
 if (url.origin !== self.location.origin) return;
 event.waitUntil(self.registration.showNotification(payload.title || 'Street Goose 034', {body: payload.body || '', icon:'/icons/street-192.png', badge:'/icons/street-192.png', tag:payload.id, data:{url:url.href}}));
});
self.addEventListener('notificationclick', event => {
 event.notification.close();
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients => {
  const target = new URL(event.notification.data?.url || '/conta', self.location.origin);
  if(target.origin !== self.location.origin) return;
  for(const client of clients) if('focus' in client) {await client.navigate(target.href); return client.focus();}
  return self.clients.openWindow(target.href);
 }));
});
