drop function if exists public.crear_material_area(text, text, text, numeric, text);

create or replace function public.crear_material_area(
  p_nombre text,
  p_area text,
  p_unidad text,
  p_stock_minimo numeric,
  p_creado_por text,
  p_stock_actual numeric
)
returns table (
  material_id uuid,
  nombre text,
  area text,
  unidad text,
  stock_actual numeric,
  stock_minimo numeric,
  activo boolean,
  created_at timestamptz,
  alerta_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_material public.materiales_area%rowtype;
  v_movimiento_id uuid;
  v_alerta_id uuid;
begin
  if nullif(trim(p_nombre), '') is null or nullif(trim(p_area), '') is null
     or nullif(trim(p_unidad), '') is null then
    raise exception 'El nombre, el área y la unidad son obligatorios.';
  end if;
  if p_stock_minimo is null or p_stock_minimo < 0 then
    raise exception 'La existencia mínima debe ser igual o mayor que cero.';
  end if;
  if p_stock_actual is null or p_stock_actual < 0 or p_stock_actual > 1000000000 then
    raise exception 'La cantidad disponible debe ser un número entre cero y mil millones.';
  end if;

  insert into public.materiales_area (
    nombre, area, unidad, stock_actual, stock_minimo, creado_por
  )
  values (
    trim(p_nombre), trim(p_area), trim(p_unidad), p_stock_actual,
    p_stock_minimo, nullif(trim(p_creado_por), '')
  )
  returning * into v_material;

  if v_material.stock_actual > 0 then
    insert into public.movimientos_materiales (
      material_id, tipo, cantidad, stock_anterior, stock_nuevo, detalle, registrado_por
    )
    values (
      v_material.id, 'ajuste', v_material.stock_actual, 0,
      v_material.stock_actual, 'Existencia inicial al registrar el material.',
      nullif(trim(p_creado_por), '')
    )
    returning id into v_movimiento_id;
  end if;

  if v_material.stock_minimo > 0
     and v_material.stock_actual <= v_material.stock_minimo then
    insert into public.alertas_materiales (
      movimiento_id, material_id, stock_actual, stock_minimo
    )
    values (
      v_movimiento_id, v_material.id, v_material.stock_actual, v_material.stock_minimo
    )
    returning id into v_alerta_id;
  end if;

  return query
  select v_material.id, v_material.nombre, v_material.area, v_material.unidad,
         v_material.stock_actual, v_material.stock_minimo, v_material.activo,
         v_material.created_at, v_alerta_id;
end;
$$;

revoke all on function public.crear_material_area(text, text, text, numeric, text, numeric)
  from public, anon, authenticated;
grant execute on function public.crear_material_area(text, text, text, numeric, text, numeric)
  to service_role;
