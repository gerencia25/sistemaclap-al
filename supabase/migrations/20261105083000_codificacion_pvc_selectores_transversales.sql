-- =========================================================
-- CLAP · PVC y catálogos transversales
--
-- Convierte MPP-OR-PV al mismo modelo controlado de PE/PP.
-- Transversaliza Presentación y Peso [kg].
-- =========================================================


-- =========================================================
-- 1. VALIDAR QUE PE / PP NO TENGAN CONFLICTOS
-- =========================================================

do $$
declare
  v_conflicts integer;
begin
  select count(*)
  into v_conflicts
  from (
    select
      o.field_key,
      o.code
    from public.item_classification_field_options o
    join public.item_classification_templates t
      on t.id = o.template_id
    where
      t.full_code in (
        'MPP-OR-PE',
        'MPP-OR-PP'
      )
      and o.field_key in (
        'presentacion',
        'peso'
      )
    group by
      o.field_key,
      o.code
    having
      count(
        distinct upper(trim(o.name))
      ) > 1
  ) conflicts;

  if v_conflicts > 0 then
    raise exception
      'Existen códigos con nombres diferentes entre PE y PP para Presentación o Peso.';
  end if;
end;
$$;


-- =========================================================
-- 2. CATÁLOGO TRANSVERSAL · PRESENTACIONES
-- =========================================================

insert into public.item_option_catalogs (
  code,
  name,
  description,
  status
)
values (
  'PRESENTACIONES',
  'Presentaciones',
  'Presentaciones reutilizables en plantillas de codificación.',
  'Activo'
)
on conflict (code)
do update set
  name = excluded.name,
  description = excluded.description,
  status = 'Activo',
  updated_at = now();


with catalog as (
  select id
  from public.item_option_catalogs
  where code = 'PRESENTACIONES'
),
source_values as (
  select
    o.code,
    min(upper(trim(o.name))) as name
  from public.item_classification_field_options o
  join public.item_classification_templates t
    on t.id = o.template_id
  where
    t.full_code in (
      'MPP-OR-PE',
      'MPP-OR-PP'
    )
    and o.field_key = 'presentacion'
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
  catalog.id,
  source_values.code,
  source_values.name,
  'Activo',
  case
    when source_values.code ~ '^[0-9]+$'
      then source_values.code::integer
    else 9999
  end
from source_values
cross join catalog
on conflict (catalog_id, code)
do update set
  name = excluded.name,
  status = excluded.status,
  display_order = excluded.display_order,
  updated_at = now();


-- =========================================================
-- 3. CATÁLOGO TRANSVERSAL · PESOS KG
-- =========================================================

insert into public.item_option_catalogs (
  code,
  name,
  description,
  status
)
values (
  'PESOS_KG',
  'Pesos en kilogramos',
  'Pesos reutilizables expresados en kilogramos para plantillas de codificación.',
  'Activo'
)
on conflict (code)
do update set
  name = excluded.name,
  description = excluded.description,
  status = 'Activo',
  updated_at = now();


with catalog as (
  select id
  from public.item_option_catalogs
  where code = 'PESOS_KG'
),
source_values as (
  select
    o.code,
    min(trim(o.name)) as name
  from public.item_classification_field_options o
  join public.item_classification_templates t
    on t.id = o.template_id
  where
    t.full_code in (
      'MPP-OR-PE',
      'MPP-OR-PP'
    )
    and o.field_key = 'peso'
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
  catalog.id,
  source_values.code,
  source_values.name,
  'Activo',
  case
    when source_values.code ~ '^[0-9]+$'
      then source_values.code::integer
    else 9999
  end
from source_values
cross join catalog
on conflict (catalog_id, code)
do update set
  name = excluded.name,
  status = excluded.status,
  display_order = excluded.display_order,
  updated_at = now();


-- =========================================================
-- 4. PVC · CONVERTIR CAMPOS LIBRES A SELECTORES
-- =========================================================

update public.item_classification_template_fields f
set
  field_type = 'select',
  allow_new_options = true
from public.item_classification_templates t
where
  t.id = f.template_id
  and t.full_code = 'MPP-OR-PV'
  and f.field_key in (
    'referencia',
    'codigo',
    'presentacion',
    'peso'
  );


update public.item_classification_template_fields f
set field_label = 'Peso [kg]'
from public.item_classification_templates t
where
  t.id = f.template_id
  and t.full_code = 'MPP-OR-PV'
  and f.field_key = 'peso';


-- =========================================================
-- 5. ENLAZAR PRESENTACIÓN Y PESO EN PE / PP / PVC
-- =========================================================

update public.item_classification_template_fields f
set option_catalog_id = (
  select id
  from public.item_option_catalogs
  where code = 'PRESENTACIONES'
)
from public.item_classification_templates t
where
  t.id = f.template_id
  and t.full_code in (
    'MPP-OR-PE',
    'MPP-OR-PP',
    'MPP-OR-PV'
  )
  and f.field_key = 'presentacion'
  and f.field_type = 'select';


update public.item_classification_template_fields f
set option_catalog_id = (
  select id
  from public.item_option_catalogs
  where code = 'PESOS_KG'
)
from public.item_classification_templates t
where
  t.id = f.template_id
  and t.full_code in (
    'MPP-OR-PE',
    'MPP-OR-PP',
    'MPP-OR-PV'
  )
  and f.field_key = 'peso'
  and f.field_type = 'select';


-- =========================================================
-- 6. OPCIONES ESPECÍFICAS DE PVC
--
-- Referencia = familia/tipo de PVC
-- Código     = grado específico
-- =========================================================

insert into public.item_classification_field_options (
  template_id,
  field_key,
  code,
  name,
  status
)
select
  t.id,
  'referencia',
  '10',
  'PVC BLANDO',
  'Activo'
from public.item_classification_templates t
where t.full_code = 'MPP-OR-PV'
on conflict (
  template_id,
  field_key,
  code
)
do update set
  name = excluded.name,
  status = 'Activo';


insert into public.item_classification_field_options (
  template_id,
  field_key,
  code,
  name,
  status
)
select
  t.id,
  'codigo',
  '0001',
  'D-87',
  'Activo'
from public.item_classification_templates t
where t.full_code = 'MPP-OR-PV'
on conflict (
  template_id,
  field_key,
  code
)
do update set
  name = excluded.name,
  status = 'Activo';


-- =========================================================
-- 7. SINCRONIZAR ESPEJO LEGADO
-- =========================================================

select public.sync_shared_option_catalog_to_legacy(
  (
    select id
    from public.item_option_catalogs
    where code = 'PRESENTACIONES'
  )
);

select public.sync_shared_option_catalog_to_legacy(
  (
    select id
    from public.item_option_catalogs
    where code = 'PESOS_KG'
  )
);
