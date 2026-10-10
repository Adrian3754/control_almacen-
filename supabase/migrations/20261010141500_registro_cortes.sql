create table if not exists public.registro_cortes (
  id uuid primary key default gen_random_uuid(),
  numero_registro bigint generated always as identity unique,
  fecha date not null,
  numero_placas text not null check (char_length(trim(numero_placas)) between 1 and 20),
  fecha_corte date not null,
  productores text not null check (char_length(trim(productores)) between 1 and 1000),
  peso_kg numeric(14, 3) not null check (peso_kg > 0),
  lote text not null check (char_length(trim(lote)) between 1 and 80),
  registrado_por text not null,
  created_at timestamptz not null default now()
);

create index if not exists registro_cortes_fecha_idx
  on public.registro_cortes (fecha desc, numero_registro desc);
create index if not exists registro_cortes_lote_idx
  on public.registro_cortes (lower(lote));

alter table public.registro_cortes enable row level security;
revoke all on public.registro_cortes from anon, authenticated;
grant all on public.registro_cortes to service_role;
grant usage, select on sequence public.registro_cortes_numero_registro_seq to service_role;
