-- =========================================================
-- CLAP · Catálogos transversales
-- Capa de compatibilidad con opciones por plantilla
-- =========================================================

-- ---------------------------------------------------------
-- Sincroniza un catálogo compartido hacia las opciones
-- históricas de cada plantilla que lo utiliza.
-- ---------------------------------------------------------

create or replace function
public.sync_shared_option_catalog_to_legacy(
  p_catalog_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Valores que ya no existen en el catálogo:
  -- se conservan por trazabilidad pero quedan inactivos.
  update public.item_classification_field_options o
  set status = 'Inactivo'
  from public.item_classification_template_fields f
  where
    f.template_id = o.template_id
    and f.field_key = o.field_key
    and f.option_catalog_id = p_catalog_id
    and not exists (
      select 1
      from public.item_option_catalog_values v
      where
        v.catalog_id = p_catalog_id
        and v.code = o.code
    );

  -- Crear o actualizar el espejo para cada plantilla.
  insert into public.item_classification_field_options (
    template_id,
    field_key,
    code,
    name,
    status
  )
  select
    f.template_id,
    f.field_key,
    v.code,
    v.name,
    v.status
  from public.item_classification_template_fields f
  cross join public.item_option_catalog_values v
  where
    f.option_catalog_id = p_catalog_id
    and v.catalog_id = p_catalog_id
  on conflict (
    template_id,
    field_key,
    code
  )
  do update set
    name = excluded.name,
    status = excluded.status;
end;
$$;


-- ---------------------------------------------------------
-- Trigger: cualquier cambio en un valor transversal
-- actualiza automáticamente todas las plantillas.
-- ---------------------------------------------------------

create or replace function
public.trg_sync_shared_catalog_value()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.sync_shared_option_catalog_to_legacy(
      old.catalog_id
    );

    return old;
  end if;

  if
    tg_op = 'UPDATE'
    and old.catalog_id is distinct from new.catalog_id
  then
    perform public.sync_shared_option_catalog_to_legacy(
      old.catalog_id
    );
  end if;

  perform public.sync_shared_option_catalog_to_legacy(
    new.catalog_id
  );

  return new;
end;
$$;

drop trigger if exists
  trg_sync_shared_catalog_value
on public.item_option_catalog_values;

create trigger
  trg_sync_shared_catalog_value
after insert or update or delete
on public.item_option_catalog_values
for each row
execute function
  public.trg_sync_shared_catalog_value();


-- ---------------------------------------------------------
-- RPC segura para crear una opción transversal.
-- Usa lock para evitar repetir consecutivos simultáneos.
-- ---------------------------------------------------------

create or replace function
public.config_create_shared_catalog_option(
  p_catalog_id uuid,
  p_name text,
  p_code_length integer
)
returns public.item_option_catalog_values
language plpgsql
security definer
set search_path = public
as $$
declare
  v_catalog public.item_option_catalogs%rowtype;
  v_next integer;
  v_max integer;
  v_code text;
  v_result public.item_option_catalog_values%rowtype;
begin
  if p_catalog_id is null then
    raise exception 'El catálogo es obligatorio.';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception 'El nombre de la opción es obligatorio.';
  end if;

  if p_code_length is null or p_code_length <= 0 then
    raise exception 'La longitud del código no es válida.';
  end if;

  select *
  into v_catalog
  from public.item_option_catalogs
  where id = p_catalog_id
  for update;

  if not found then
    raise exception 'El catálogo transversal no existe.';
  end if;

  if v_catalog.status <> 'Activo' then
    raise exception 'El catálogo transversal está inactivo.';
  end if;

  perform pg_advisory_xact_lock(
    hashtext(
      'item_option_catalog:' ||
      p_catalog_id::text
    )
  );

  if exists (
    select 1
    from public.item_option_catalog_values
    where
      catalog_id = p_catalog_id
      and lower(trim(name)) =
          lower(trim(p_name))
  ) then
    raise exception
      'Ya existe una opción con el nombre "%".',
      trim(p_name);
  end if;

  select
    coalesce(
      max(code::integer),
      0
    ) + 1
  into v_next
  from public.item_option_catalog_values
  where
    catalog_id = p_catalog_id
    and code ~ '^[0-9]+$';

  v_max :=
    power(10, p_code_length)::integer - 1;

  if v_next > v_max then
    raise exception
      'No hay códigos disponibles de % dígitos.',
      p_code_length;
  end if;

  v_code :=
    lpad(
      v_next::text,
      p_code_length,
      '0'
    );

  insert into public.item_option_catalog_values (
    catalog_id,
    code,
    name,
    status,
    display_order
  )
  values (
    p_catalog_id,
    v_code,
    upper(trim(p_name)),
    'Activo',
    v_next
  )
  returning *
  into v_result;

  return v_result;
end;
$$;

revoke all on function
public.config_create_shared_catalog_option(
  uuid,
  text,
  integer
)
from public;

revoke all on function
public.config_create_shared_catalog_option(
  uuid,
  text,
  integer
)
from anon;

revoke all on function
public.config_create_shared_catalog_option(
  uuid,
  text,
  integer
)
from authenticated;

grant execute on function
public.config_create_shared_catalog_option(
  uuid,
  text,
  integer
)
to service_role;


-- ---------------------------------------------------------
-- Sincronización inicial.
-- Esto hará que MPP-OR-PV reciba también los 19 colores.
-- ---------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select distinct option_catalog_id
    from public.item_classification_template_fields
    where option_catalog_id is not null
  loop
    perform public.sync_shared_option_catalog_to_legacy(
      r.option_catalog_id
    );
  end loop;
end;
$$;
