# Módulo de cortes y recepción de fruta

El módulo `/cortes` registra recepciones de yaca de campo a planta: día, origen, proveedor, flete, folios, fechas de pago, viajes, lotes y pesos. El campo **No.** es un consecutivo generado por la base de datos. Los proveedores se seleccionan desde la tabla `proveedores_fruta`; se pueden agregar desde «Administrar proveedores de fruta».

Antes de usarlo, aplica en orden estas migraciones desde el SQL Editor del proyecto Supabase:

1. `migrations/20261010141500_registro_cortes.sql`
2. `migrations/20261010153000_cortes_recepcion_fruta.sql`
3. `migrations/20261010154500_corregir_total_cortes_merma.sql`
4. `migrations/20261010160000_corregir_flete_por_peso_neto.sql`
5. `migrations/20261010161500_corregir_signo_diferencia_peso.sql`

La segunda migración amplía `registro_cortes` para las recepciones y crea la tabla de proveedores. La tercera corrige los totales de registros guardados anteriormente para descontar la merma. La cuarta recalcula los fletes históricos usando el peso después de merma. La quinta actualiza las diferencias existentes al signo acordado. El módulo es independiente de `cortes_diarios` y del cierre de producción usado por Reportes; esos flujos no se modifican.

Si anteriormente aplicaste la migración que renombraba las columnas de factura de ruta a fruta, aplica `migrations/20261010163500_revertir_nombre_factura_fruta.sql` para devolver sus nombres originales.

## Cálculos

- **5% / merma:** peso de campo × 0.05.
- **Costo de flete:** (peso después de merma × $1.40/kg) + IVA del 16%.
- **Diferencia:** peso real − peso de campo. Es negativa cuando el peso de campo es mayor y positiva cuando el peso real es mayor.
- **Peso después de merma:** peso de campo − 5% de merma.
- **Cantidad total:** peso después de merma × precio unitario por kg, que inicia en $11 y se puede modificar por registro.

El peso real y precio unitario se capturan manualmente. Los cálculos se vuelven a validar y guardar en el servidor.

El módulo requiere una sesión iniciada y una fila de empleado vigente en `perfiles`. Si faltan las migraciones, la pantalla muestra un mensaje de configuración en lugar de datos de ejemplo.
