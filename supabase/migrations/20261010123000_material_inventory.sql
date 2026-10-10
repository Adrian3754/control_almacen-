create table if not exists public.materiales_area (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  area text not null,
  unidad text not null,
  stock_actual numeric(14, 3) not null default 0 check (stock_actual >= 0),
  stock_minimo numeric(14, 3) not null default 0 check (stock_minimo >= 0),
  activo boolean not null default true,
  creado_por text,
  created_at timestamptz not null default now()
);

create unique index if not exists materiales_area_nombre_area_unique
  on public.materiales_area (lower(nombre), lower(area));

create table if not exists public.movimientos_materiales (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materiales_area(id),
  tipo text not null check (tipo in ('compra', 'consumo', 'ajuste')),
  cantidad numeric(14, 3) not null check (cantidad <> 0),
  stock_anterior numeric(14, 3) not null,
  stock_nuevo numeric(14, 3) not null check (stock_nuevo >= 0),
  detalle text,
  registrado_por text,
  created_at timestamptz not null default now()
);

create table if not exists public.compras_materiales (
  id uuid primary key default gen_random_uuid(),
  movimiento_id uuid not null unique references public.movimientos_materiales(id),
  material_id uuid not null references public.materiales_area(id),
  proveedor text,
  referencia text,
  cantidad_solicitada numeric(14, 3) not null check (cantidad_solicitada > 0),
  cantidad_recibida numeric(14, 3) not null check (cantidad_recibida > 0),
  costo_unitario numeric(14, 4) check (costo_unitario is null or costo_unitario >= 0),
  recibido_por text,
  created_at timestamptz not null default now()
);

create table if not exists public.alertas_materiales (
  id uuid primary key default gen_random_uuid(),
  movimiento_id uuid unique references public.movimientos_materiales(id),
  material_id uuid not null references public.materiales_area(id),
  stock_actual numeric(14, 3) not null,
  stock_minimo numeric(14, 3) not null,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'enviando', 'enviado', 'error')),
  destinatario text,
  error text,
  enviado_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists movimientos_materiales_created_at_idx
  on public.movimientos_materiales (created_at desc);
create index if not exists compras_materiales_created_at_idx
  on public.compras_materiales (created_at desc);
create index if not exists alertas_materiales_created_at_idx
  on public.alertas_materiales (created_at desc);

alter table public.materiales_area enable row level security;
alter table public.movimientos_materiales enable row level security;
alter table public.compras_materiales enable row level security;
alter table public.alertas_materiales enable row level security;

revoke all on public.materiales_area from anon, authenticated;
revoke all on public.movimientos_materiales from anon, authenticated;
revoke all on public.compras_materiales from anon, authenticated;
revoke all on public.alertas_materiales from anon, authenticated;
grant all on public.materiales_area to service_role;
grant all on public.movimientos_materiales to service_role;
grant all on public.compras_materiales to service_role;
grant all on public.alertas_materiales to service_role;

create or replace function public.crear_material_area(
  p_nombre text,
  p_area text,
  p_unidad text,
  p_stock_minimo numeric,
  p_creado_por text
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
  v_alerta_id uuid;
begin
  if nullif(trim(p_nombre), '') is null or nullif(trim(p_area), '') is null
     or nullif(trim(p_unidad), '') is null then
    raise exception 'El nombre, el área y la unidad son obligatorios.';
  end if;
  if p_stock_minimo is null or p_stock_minimo < 0 then
    raise exception 'La existencia mínima debe ser igual o mayor que cero.';
  end if;

  insert into public.materiales_area (
    nombre, area, unidad, stock_minimo, creado_por
  )
  values (
    trim(p_nombre), trim(p_area), trim(p_unidad), p_stock_minimo,
    nullif(trim(p_creado_por), '')
  )
  returning * into v_material;

  if v_material.stock_minimo > 0 then
    insert into public.alertas_materiales (
      material_id, stock_actual, stock_minimo
    )
    values (
      v_material.id, v_material.stock_actual, v_material.stock_minimo
    )
    returning id into v_alerta_id;
  end if;

  return query
  select v_material.id, v_material.nombre, v_material.area, v_material.unidad,
         v_material.stock_actual, v_material.stock_minimo, v_material.activo,
         v_material.created_at, v_alerta_id;
end;
$$;

revoke all on function public.crear_material_area(text, text, text, numeric, text)
  from public, anon, authenticated;
grant execute on function public.crear_material_area(text, text, text, numeric, text)
  to service_role;

create or replace function public.registrar_movimiento_material(
  p_material_id uuid,
  p_tipo text,
  p_cantidad numeric,
  p_registrado_por text,
  p_detalle text default null,
  p_proveedor text default null,
  p_referencia text default null,
  p_cantidad_solicitada numeric default null,
  p_costo_unitario numeric default null
)
returns table (
  movimiento_id uuid,
  material_id uuid,
  nombre text,
  area text,
  unidad text,
  stock_actual numeric,
  stock_minimo numeric,
  alerta_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_material public.materiales_area%rowtype;
  v_stock_nuevo numeric(14, 3);
  v_stock_anterior numeric(14, 3);
  v_cantidad_solicitada numeric(14, 3);
  v_movimiento_id uuid;
  v_alerta_id uuid;
begin
  if p_tipo not in ('compra', 'consumo', 'ajuste') then
    raise exception 'Tipo de movimiento no válido.';
  end if;

  if p_cantidad is null or p_cantidad = 0 then
    raise exception 'La cantidad debe ser distinta de cero.';
  end if;

  if p_tipo in ('compra', 'consumo') and p_cantidad < 0 then
    raise exception 'La cantidad debe ser mayor que cero.';
  end if;

  select *
    into v_material
    from public.materiales_area
   where id = p_material_id and activo = true
   for update;

  if not found then
    raise exception 'No se encontró el material o está inactivo.';
  end if;

  v_stock_anterior := v_material.stock_actual;
  v_stock_nuevo := v_stock_anterior + p_cantidad;

  if p_tipo = 'consumo' then
    v_stock_nuevo := v_stock_anterior - p_cantidad;
  end if;

  if v_stock_nuevo < 0 then
    raise exception 'El consumo o ajuste no puede dejar existencias negativas.';
  end if;

  if p_tipo = 'compra' then
    v_cantidad_solicitada := coalesce(p_cantidad_solicitada, p_cantidad);
    if v_cantidad_solicitada < p_cantidad or v_cantidad_solicitada <= 0 then
      raise exception 'La cantidad recibida no puede superar la cantidad solicitada.';
    end if;
  elsif p_cantidad_solicitada is not null or p_costo_unitario is not null or
        p_proveedor is not null or p_referencia is not null then
    raise exception 'Los datos de proveedor y orden solo aplican a una compra.';
  end if;

  insert into public.movimientos_materiales (
    material_id, tipo, cantidad, stock_anterior, stock_nuevo, detalle, registrado_por
  )
  values (
    p_material_id, p_tipo, p_cantidad, v_stock_anterior, v_stock_nuevo,
    nullif(trim(p_detalle), ''), nullif(trim(p_registrado_por), '')
  )
  returning id into v_movimiento_id;

  update public.materiales_area
     set stock_actual = v_stock_nuevo
   where id = p_material_id;

  if p_tipo = 'compra' then
    insert into public.compras_materiales (
      movimiento_id, material_id, proveedor, referencia,
      cantidad_solicitada, cantidad_recibida, costo_unitario, recibido_por
    )
    values (
      v_movimiento_id, p_material_id, nullif(trim(p_proveedor), ''),
      nullif(trim(p_referencia), ''), v_cantidad_solicitada, p_cantidad,
      p_costo_unitario, nullif(trim(p_registrado_por), '')
    );
  end if;

  if v_stock_anterior > v_material.stock_minimo
     and v_stock_nuevo <= v_material.stock_minimo then
    insert into public.alertas_materiales (
      movimiento_id, material_id, stock_actual, stock_minimo
    )
    values (
      v_movimiento_id, p_material_id, v_stock_nuevo, v_material.stock_minimo
    )
    returning id into v_alerta_id;
  end if;

  return query
  select v_movimiento_id, v_material.id, v_material.nombre, v_material.area,
         v_material.unidad, v_stock_nuevo, v_material.stock_minimo, v_alerta_id;
end;
$$;

revoke all on function public.registrar_movimiento_material(
  uuid, text, numeric, text, text, text, text, numeric, numeric
) from public, anon, authenticated;
grant execute on function public.registrar_movimiento_material(
  uuid, text, numeric, text, text, text, text, numeric, numeric
) to service_role;
