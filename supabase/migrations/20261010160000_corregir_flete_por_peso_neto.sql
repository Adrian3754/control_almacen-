update public.registro_cortes
set costo_flete = round(
  (peso_kg - coalesce(merma_5_kg, round(peso_kg * 0.05, 3)))
  * 1.40
  * 1.16,
  2
)
where peso_kg is not null;
