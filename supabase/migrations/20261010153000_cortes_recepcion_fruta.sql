create table if not exists public.proveedores_fruta (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(trim(nombre)) between 1 and 120),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists proveedores_fruta_nombre_lower_uidx
  on public.proveedores_fruta (lower(nombre));

alter table public.proveedores_fruta enable row level security;
revoke all on public.proveedores_fruta from anon, authenticated;
grant all on public.proveedores_fruta to service_role;

alter table public.registro_cortes
  alter column numero_placas drop not null,
  alter column fecha_corte drop not null,
  alter column productores drop not null,
  alter column lote drop not null;

alter table public.registro_cortes
  add column if not exists lugar_origen text,
  add column if not exists proveedor_id uuid references public.proveedores_fruta(id),
  add column if not exists costo_flete numeric(14, 2),
  add column if not exists factura_flete text,
  add column if not exists fecha_pago_flete date,
  add column if not exists viajes integer,
  add column if not exists numero_lotes integer,
  add column if not exists merma_5_kg numeric(14, 3),
  add column if not exists peso_real_kg numeric(14, 3),
  add column if not exists diferencia_kg numeric(14, 3),
  add column if not exists precio_unitario_kg numeric(14, 4),
  add column if not exists cantidad_total numeric(14, 2),
  add column if not exists factura_ruta text,
  add column if not exists fecha_factura_ruta date;

alter table public.registro_cortes
  add constraint registro_cortes_peso_real_nonnegative
    check (peso_real_kg is null or peso_real_kg >= 0),
  add constraint registro_cortes_viajes_positive
    check (viajes is null or viajes > 0),
  add constraint registro_cortes_numero_lotes_positive
    check (numero_lotes is null or numero_lotes > 0);

create index if not exists registro_cortes_proveedor_fecha_idx
  on public.registro_cortes (proveedor_id, fecha desc);
