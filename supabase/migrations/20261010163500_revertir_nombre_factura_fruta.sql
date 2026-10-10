do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'registro_cortes'
      and column_name = 'factura_fruta'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'registro_cortes'
      and column_name = 'factura_ruta'
  ) then
    alter table public.registro_cortes
      rename column factura_fruta to factura_ruta;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'registro_cortes'
      and column_name = 'fecha_factura_fruta'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'registro_cortes'
      and column_name = 'fecha_factura_ruta'
  ) then
    alter table public.registro_cortes
      rename column fecha_factura_fruta to fecha_factura_ruta;
  end if;
end
$$;
