-- ============================================================================
-- Sistema CLAP · Corrección puntual de codificación
-- PTF-AL-TP / material / 07: HIPS -> PEBD
-- Fecha: 2026-11-08
--
-- Evidencia:
--   - Todos los productos SIIGO PTF-AL-TP cuyo bloque material termina en 07
--     están nombrados como PEBD.
--   - Los productos PTF-AL-TP con material 04 están nombrados como PP.
--   - La matriz histórica objetivo define 07 = PEBD para esta clasificación.
--
-- ALCANCE:
--   - Corrige únicamente el nombre de la opción 07 dentro de PTF-AL-TP/material.
--
-- NO HACE:
--   - No modifica códigos.
--   - No modifica public.products.
--   - No toca SIIGO.
--   - No modifica opciones de otras plantillas.
-- ============================================================================

begin;

do $clap$
declare
  v_template_id uuid;
  v_option_id uuid;
  v_name text;
  v_status text;
begin
  select id
    into v_template_id
  from public.item_classification_templates
  where category_code = 'PTF'
    and group_code = 'AL'
    and subgroup_code = 'TP'
    and status = 'Activo'
  limit 1;

  if v_template_id is null then
    raise exception
      'No existe una plantilla activa PTF-AL-TP.';
  end if;

  if (
    select count(*)
    from public.item_classification_templates
    where category_code = 'PTF'
      and group_code = 'AL'
      and subgroup_code = 'TP'
  ) <> 1 then
    raise exception
      'PTF-AL-TP no tiene exactamente una plantilla.';
  end if;

  if not exists (
    select 1
    from public.item_classification_template_fields
    where template_id = v_template_id
      and field_key = 'material'
      and status = 'Activo'
      and option_catalog_id is null
  ) then
    raise exception
      'El campo material de PTF-AL-TP no existe, está inactivo o usa catálogo transversal.';
  end if;

  select id, name, status
    into v_option_id, v_name, v_status
  from public.item_classification_field_options
  where template_id = v_template_id
    and field_key = 'material'
    and code = '07'
  limit 1;

  if v_option_id is null then
    raise exception
      'No existe PTF-AL-TP / material / 07.';
  end if;

  if v_status <> 'Activo' then
    raise exception
      'PTF-AL-TP / material / 07 existe pero está inactivo.';
  end if;

  if upper(trim(v_name)) = 'PEBD' then
    raise notice
      'PTF-AL-TP / material / 07 ya está correcto: PEBD.';
    return;
  end if;

  if upper(trim(v_name)) <> 'HIPS' then
    raise exception
      'Conflicto: PTF-AL-TP / material / 07 actualmente significa "%"; se esperaba HIPS antes de corregir.',
      v_name;
  end if;

  if exists (
    select 1
    from public.item_classification_field_options
    where template_id = v_template_id
      and field_key = 'material'
      and upper(trim(name)) = 'PEBD'
      and code <> '07'
  ) then
    raise exception
      'Conflicto: PEBD ya existe con otro código dentro de PTF-AL-TP/material.';
  end if;

  update public.item_classification_field_options
  set name = 'PEBD'
  where id = v_option_id;

  raise notice
    'Corrección aplicada: PTF-AL-TP / material / 07 = PEBD.';
end
$clap$;

commit;
