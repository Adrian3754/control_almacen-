This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Alertas push de inventario

Las notificaciones push se envían a los dispositivos donde un administrador o supervisor inició sesión y activó los avisos. Se generan cuando el inventario crea una alerta por existencias en el mínimo; al cerrar sesión, se elimina la suscripción de ese dispositivo.

Para habilitarlas:

1. Aplica `supabase/migrations/20261014110000_inventory_push_notifications.sql` en el proyecto Supabase.
2. Genera una pareja de claves VAPID una sola vez con `npx web-push generate-vapid-keys`.
3. Configura estas variables en el entorno local y en el proveedor de despliegue. No publiques ni compartas la clave privada:
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: clave pública VAPID.
   - `VAPID_PRIVATE_KEY`: clave privada VAPID.
   - `VAPID_SUBJECT`: un contacto como `mailto:soporte@example.com`.
4. Reconstruye y despliega la aplicación; cada administrador activa el permiso desde Compras e inventario en cada dispositivo.

El sitio debe servirse por HTTPS. En iPhone/iPad, las notificaciones requieren iOS/iPadOS 16.4 o posterior y abrir la aplicación desde su icono agregado a la pantalla de inicio.

## Requisiciones y recordatorios de Compras

Las requisiciones permiten capturar el departamento solicitante, varios materiales, el motivo y la fecha estimada. Mientras sigan pendientes, Compras muestra los días restantes o el tiempo vencido y envía un recordatorio push diario a los dispositivos administrativos que tengan activados los avisos. Al marcarlas recibidas o canceladas, dejan de generar recordatorios.

Para habilitarlo:

1. Aplica `supabase/migrations/20261015140000_material_requisitions.sql` después de las migraciones del módulo de materiales.
2. Configura `CRON_SECRET` en el entorno de producción de Vercel con un valor aleatorio y privado. Puedes generarlo localmente con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
3. Despliega a producción el archivo `vercel.json`; su tarea programada ejecuta los recordatorios diariamente a las 9:00 a. m. de Ciudad de México. La tarea también requiere las variables VAPID y Supabase ya configuradas para las notificaciones push.

En desarrollo o Preview, el recordatorio se puede probar manualmente con una petición `GET` a `/api/compras/reminders` y el encabezado `Authorization: Bearer <CRON_SECRET>`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
