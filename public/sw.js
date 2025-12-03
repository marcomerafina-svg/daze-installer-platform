self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  const data = event.data.json();
  const title = data.title || 'Nuova Lead Ricevuta';
  const options = {
    body: data.body || 'Hai ricevuto una nuova lead',
    icon: '/favicon-192.png',
    badge: '/badge-72.png',
    tag: data.leadId || 'new-lead',
    data: {
      leadId: data.leadId,
      url: data.url || '/installer/pipeline',
    },
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'Visualizza Lead',
      },
      {
        action: 'dismiss',
        title: 'Chiudi',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(urlToOpen.split('?')[0]) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
