# Compras e inventario de materiales

## Base de datos

Aplica las migraciones en orden desde el SQL Editor del proyecto Supabase:

1. `migrations/20261010123000_material_inventory.sql`
2. `migrations/20261010124700_material_initial_stock.sql`
3. `migrations/20261014110000_inventory_push_notifications.sql`
4. `migrations/20261015140000_material_requisitions.sql`

La segunda migración agrega la cantidad inicial disponible al alta de materiales. Las dos últimas habilitan las notificaciones push y las requisiciones con fechas estimadas. Si ya aplicaste migraciones anteriores, aplica únicamente las que todavía falten. El módulo no usa datos de muestra: si faltan las tablas, mostrará el error de configuración.

## Alertas por correo con Resend

1. Crea una API key en Resend y verifica el dominio del correo que enviará los avisos.
2. Agrega estas variables al `.env.local` para desarrollo. No uses el prefijo `NEXT_PUBLIC_` para la API key:

   ```env
   RESEND_API_KEY=re_xxxxxxxxx
   RESEND_FROM_EMAIL="M. López <alertas@tu-dominio-verificado.com>"
   INVENTORY_PURCHASES_EMAIL=compras@tu-empresa.com
   ```

3. En Vercel, agrega las mismas variables al entorno **Preview** y despliega nuevamente la rama para probar. Después de validar, configúralas también en **Production**.

Al crear un material puedes registrar la cantidad que ya tienes. Si esa cantidad está en el mínimo o por debajo, se genera un aviso para Compras. Después, solo se generan nuevas alertas cuando una recepción, consumo o ajuste hace que la existencia pase de estar arriba del mínimo a quedar en el mínimo o por debajo. Si Resend falla, el movimiento queda registrado, la alerta conserva el error y el personal con nivel 1 o 2 puede reintentar el envío desde el módulo.

## Recordatorios diarios de requisiciones

1. Configura `CRON_SECRET` en Vercel. Usa un valor aleatorio y privado; no lo agregues al repositorio.
2. Despliega `vercel.json` a producción para programar el envío diario a las 9:00 a. m. de Ciudad de México.
3. Cada requisición pendiente mostrará el tiempo restante o vencido y recibirá un aviso diario en los dispositivos administrativos con notificaciones push activadas. Al marcarla recibida o cancelada, el aviso deja de enviarse.
