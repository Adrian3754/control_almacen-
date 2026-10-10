update public.registro_cortes
set cantidad_total = round(
  (peso_kg - coalesce(merma_5_kg, round(peso_kg * 0.05, 3)))
  * precio_unitario_kg,
  2
)
where precio_unitario_kg is not null;
