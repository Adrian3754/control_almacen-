create table if not exists public.requisiciones_materiales (
  id uuid primary key default gen_random_uuid(),
  departamento_solicitante text not null,
  fecha_solicitud date not null,
  fecha_estimada date not null,
  motivo text not null,
  solicitado_por text not null,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'completa', 'cancelada')),
  completada_at timestamptz,
  ultimo_recordatorio_en date,
  created_at timestamptz not null default now(),
  check (fecha_estimada >= fecha_solicitud)
);

create table if not exists public.requisicion_materiales_detalles (
  id uuid primary key default gen_random_uuid(),
  requisicion_id uuid not null
    references public.requisiciones_materiales(id) on delete cascade,
  descripcion text not null,
  cantidad numeric(14, 3) not null check (cantidad > 0),
  unidad text not null
);

create index if not exists requisiciones_materiales_fecha_estado_idx
  on public.requisiciones_materiales (estado, fecha_estimada, ultimo_recordatorio_en);

create index if not exists requisicion_materiales_detalles_requisicion_idx
  on public.requisicion_materiales_detalles (requisicion_id);

alter table public.requisiciones_materiales enable row level security;
alter table public.requisicion_materiales_detalles enable row level security;

revoke all on public.requisiciones_materiales from anon, authenticated;
revoke all on public.requisicion_materiales_detalles from anon, authenticated;
grant all on public.requisiciones_materiales to service_role;
grant all on public.requisicion_materiales_detalles to service_role;

create or replace function public.crear_requisicion_material(
  p_departamento_solicitante text,
  p_fecha_solicitud date,
  p_fecha_estimada date,
  p_motivo text,
  p_solicitado_por text,
  p_detalles jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requisicion_id uuid;
  v_detalle jsonb;
begin
  if nullif(trim(p_departamento_solicitante), '') is null
     or length(trim(p_departamento_solicitante)) > 120
     or nullif(trim(p_motivo), '') is null
     or length(trim(p_motivo)) > 500
     or nullif(trim(p_solicitado_por), '') is null then
    raise exception 'El departamento, el motivo y la persona solicitante son obligatorios.';
  end if;
  if p_fecha_solicitud is null or p_fecha_estimada is null
     or p_fecha_estimada < p_fecha_solicitud then
    raise exception 'Las fechas de la requisición no son válidas.';
  end if;
  if jsonb_typeof(p_detalles) is distinct from 'array' then
    raise exception 'La requisición debe incluir una lista de materiales.';
  end if;
  if jsonb_array_length(p_detalles) < 1
     or jsonb_array_length(p_detalles) > 50 then
    raise exception 'La requisición debe incluir de 1 a 50 materiales.';
  end if;

  for v_detalle in select value from jsonb_array_elements(p_detalles)
  loop
    if jsonb_typeof(v_detalle) is distinct from 'object'
       or nullif(trim(v_detalle ->> 'descripcion'), '') is null
       or length(trim(v_detalle ->> 'descripcion')) > 200
       or nullif(trim(v_detalle ->> 'unidad'), '') is null
       or length(trim(v_detalle ->> 'unidad')) > 30
       or jsonb_typeof(v_detalle -> 'cantidad') is distinct from 'number'
       or (v_detalle ->> 'cantidad')::numeric <= 0
       or (v_detalle ->> 'cantidad')::numeric > 1000000000 then
      raise exception 'Los datos de uno o más materiales no son válidos.';
    end if;
  end loop;

  insert into public.requisiciones_materiales (
    departamento_solicitante,
    fecha_solicitud,
    fecha_estimada,
    motivo,
    solicitado_por
  )
  values (
    trim(p_departamento_solicitante),
    p_fecha_solicitud,
    p_fecha_estimada,
    trim(p_motivo),
    trim(p_solicitado_por)
  )
  returning id into v_requisicion_id;

  insert into public.requisicion_materiales_detalles (
    requisicion_id,
    descripcion,
    cantidad,
    unidad
  )
  select
    v_requisicion_id,
    trim(detalle ->> 'descripcion'),
    (detalle ->> 'cantidad')::numeric,
    trim(detalle ->> 'unidad')
  from jsonb_array_elements(p_detalles) as entries(detalle);

  return v_requisicion_id;
end;
$$;

revoke all on function public.crear_requisicion_material(text, date, date, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.crear_requisicion_material(text, date, date, text, text, jsonb)
  to service_role;

alter table public.inventory_push_subscriptions
  alter column expires_at drop not null;

update public.inventory_push_subscriptions
set expires_at = null;
