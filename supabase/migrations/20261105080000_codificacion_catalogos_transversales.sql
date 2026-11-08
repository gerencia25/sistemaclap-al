-- =========================================================
-- CLAP · Catálogos transversales de opciones
-- 2026-11-05
--
-- Objetivo:
--   Evitar duplicar catálogos como COLOR en cada plantilla.
--
-- Compatibilidad:
--   NO elimina item_classification_field_options.
--   Las opciones anteriores permanecen como legado durante
--   la transición.
-- =========================================================

create table if not exists public.item_option_catalogs (
  id uuid primary key default gen_random_uuid(),

  code text not null unique,
  name text not null,
  description text,

  status text not null default 'Activo'
    check (status in ('Activo', 'Inactivo')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.item_option_catalog_values (
  id uuid primary key default gen_random_uuid(),

  catalog_id uuid not null
    references public.item_option_catalogs(id)
    on delete cascade,

  code text not null,
  name text not null,

  status text not null default 'Activo'
    check (status in ('Activo', 'Inactivo')),

  display_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (catalog_id, code),
  unique (catalog_id, name)
);

create index if not exists
  idx_item_option_catalog_values_catalog
on public.item_option_catalog_values (
  catalog_id,
  status,
  display_order
);

alter table
  public.item_classification_template_fields
add column if not exists
  option_catalog_id uuid
  references public.item_option_catalogs(id)
  on delete restrict;

create index if not exists
  idx_template_fields_option_catalog
on public.item_classification_template_fields(
  option_catalog_id
);

alter table
  public.item_option_catalogs
enable row level security;

alter table
  public.item_option_catalog_values
enable row level security;


-- =========================================================
-- CATÁLOGO TRANSVERSAL · COLORES
-- =========================================================

insert into public.item_option_catalogs (
  code,
  name,
  description,
  status
)
values (
  'COLORES',
  'Colores',
  'Catálogo transversal de colores utilizado por las plantillas de codificación.',
  'Activo'
)
on conflict (code)
do update set
  name = excluded.name,
  description = excluded.description,
  status = 'Activo',
  updated_at = now();


-- =========================================================
-- MIGRAR LOS 19 COLORES EXISTENTES
-- Toma los valores oficiales ya registrados.
-- =========================================================

with color_catalog as (
  select id
  from public.item_option_catalogs
  where code = 'COLORES'
),
existing_colors as (
  select
    o.code,
    min(o.name) as name
  from public.item_classification_field_options o
  where
    lower(o.field_key) = 'color'
    and o.status = 'Activo'
  group by o.code
)
insert into public.item_option_catalog_values (
  catalog_id,
  code,
  name,
  status,
  display_order
)
select
  color_catalog.id,
  existing_colors.code,
  existing_colors.name,
  'Activo',
  case
    when existing_colors.code ~ '^[0-9]+$'
      then existing_colors.code::integer
    else 9999
  end
from existing_colors
cross join color_catalog
on conflict (catalog_id, code)
do update set
  name = excluded.name,
  status = 'Activo',
  display_order = excluded.display_order,
  updated_at = now();


-- =========================================================
-- ENLAZAR TODOS LOS CAMPOS COLOR AL MISMO CATÁLOGO
-- =========================================================

update public.item_classification_template_fields
set option_catalog_id = (
  select id
  from public.item_option_catalogs
  where code = 'COLORES'
)
where
  lower(field_key) = 'color'
  and field_type = 'select';


-- =========================================================
-- FUTURAS PLANTILLAS:
-- cualquier nuevo campo "color" se enlaza automáticamente.
-- =========================================================

create or replace function
public.assign_shared_option_catalog()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if
    lower(new.field_key) = 'color'
    and new.field_type = 'select'
    and new.option_catalog_id is null
  then
    select id
    into new.option_catalog_id
    from public.item_option_catalogs
    where
      code = 'COLORES'
      and status = 'Activo'
    limit 1;
  end if;

  return new;
end;
$$;

drop trigger if exists
  trg_assign_shared_option_catalog
on public.item_classification_template_fields;

create trigger
  trg_assign_shared_option_catalog
before insert or update
on public.item_classification_template_fields
for each row
execute function
  public.assign_shared_option_catalog();


-- =========================================================
-- CORRECCIÓN DE LA PLANTILLA PVC
--
-- PE y PP utilizan *_name y KG.
-- PVC quedó recién creada con valores crudos.
-- La dejamos alineada con el estándar.
-- =========================================================

update public.item_classification_templates
set
  name_pattern =
    '{referencia_name} {codigo_name} {presentacion_name} {peso_name} KG {color_name}',
  updated_at = now()
where full_code = 'MPP-OR-PV';
