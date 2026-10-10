update public.registro_cortes
set diferencia_kg = peso_real_kg - peso_kg
where peso_real_kg is not null
  and peso_kg is not null;
