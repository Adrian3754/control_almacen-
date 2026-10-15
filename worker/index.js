self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(payload.title || "Alerta de inventario", {
      body: payload.body || "Hay una solicitud de Compras que requiere atención.",
      icon: "/icons/192x192%20pixeles.jpg",
      badge: "/icons/192x192%20pixeles.jpg",
      tag: payload.tag || "inventory-alert",
      data: { url: payload.url || "/inventario" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/inventario", self.location.origin);
  if (target.origin !== self.location.origin) return;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const client = clients.find((windowClient) => new URL(windowClient.url).origin === self.location.origin);
      if (client) {
        return client.navigate(target.href).then(() => client.focus());
      }
      return self.clients.openWindow(target.href);
    })
  );
});
