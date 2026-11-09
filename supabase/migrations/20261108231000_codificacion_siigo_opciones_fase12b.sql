-- ============================================================================
-- Sistema CLAP · Codificación histórica SIIGO · Fase 1.2
-- Fecha: 2026-11-08
--
-- ALCANCE:
--   - Agrega exactamente 4 opciones faltantes documentadas y confirmadas:
--       PTF-RT-PP / material / 06 = PVC
--       SER-PP-TR / tipo_servicio / 000000003 = SOPLADO
--       SER-PP-TR / tipo_servicio / 000000009 = RECTIFICADO
--       SER-PP-TR / linea / 1004 = ESPECIALES
--
-- NO HACE:
--   - No modifica public.products.
--   - No cambia códigos históricos.
--   - No toca SIIGO.
--   - No crea plantillas ni jerarquías.
--
-- SEGURIDAD:
--   - Aborta si la plantilla/campo no existe o está inactivo.
--   - Aborta si el mismo código ya significa otra cosa.
--   - Aborta si el mismo nombre ya existe con otro código.
--   - Idempotente.
-- ============================================================================

begin;

do $clap$
declare
  v_item jsonb;
  v_template_id uuid;
  v_template_status text;
  v_field_status text;
  v_existing_name text;
  v_existing_code text;

  v_classification text;
  v_category_code text;
  v_group_code text;
  v_subgroup_code text;
  v_field_key text;
  v_code text;
  v_name text;
begin
  for v_item in
    select value
    from jsonb_array_elements(
      '[{"classification":"PTF-RT-PP","field_key":"material","code":"06","name":"PVC"},{"classification":"SER-PP-TR","field_key":"tipo_servicio","code":"000000003","name":"SOPLADO"},{"classification":"SER-PP-TR","field_key":"tipo_servicio","code":"000000009","name":"RECTIFICADO"},{"classification":"SER-PP-TR","field_key":"linea","code":"1004","name":"ESPECIALES"}]'::jsonb
    )
  loop
    v_classification := trim(v_item->>'classification');
    v_field_key := trim(v_item->>'field_key');
    v_code := trim(v_item->>'code');
    v_name := trim(v_item->>'name');

    v_category_code := split_part(v_classification, '-', 1);
    v_group_code := split_part(v_classification, '-', 2);
    v_subgroup_code := split_part(v_classification, '-', 3);

    v_template_id := null;
    v_template_status := null;

    select id, status
      into v_template_id, v_template_status
    from public.item_classification_templates
    where category_code = v_category_code
      and group_code = v_group_code
      and subgroup_code = v_subgroup_code
    limit 1;

    if v_template_id is null then
      raise exception 'No existe plantilla para %.', v_classification;
    end if;

    if v_template_status <> 'Activo' then
      raise exception 'La plantilla % está inactiva.', v_classification;
    end if;

    if (
      select count(*)
      from public.item_classification_templates
      where category_code = v_category_code
        and group_code = v_group_code
        and subgroup_code = v_subgroup_code
    ) <> 1 then
      raise exception
        'La clasificación % no tiene exactamente una plantilla.',
        v_classification;
    end if;

    v_field_status := null;

    select status
      into v_field_status
    from public.item_classification_template_fields
    where template_id = v_template_id
      and field_key = v_field_key
    limit 1;

    if v_field_status is null then
      raise exception
        'No existe el campo % en %.',
        v_field_key,
        v_classification;
    end if;

    if v_field_status <> 'Activo' then
      raise exception
        'El campo % de % está inactivo.',
        v_field_key,
        v_classification;
    end if;

    if exists (
      select 1
      from public.item_classification_template_fields
      where template_id = v_template_id
        and field_key = v_field_key
        and option_catalog_id is not null
    ) then
      raise exception
        'El campo % de % usa catálogo transversal; Fase 1.2 no debe tocarlo.',
        v_field_key,
        v_classification;
    end if;

    v_existing_name := null;

    select name
      into v_existing_name
    from public.item_classification_field_options
    where template_id = v_template_id
      and field_key = v_field_key
      and code = v_code
    limit 1;

    if v_existing_name is not null then
      if upper(trim(v_existing_name)) <> upper(v_name) then
        raise exception
          'Conflicto en % / %: código % ya significa "%"; objetivo "%".',
          v_classification,
          v_field_key,
          v_code,
          v_existing_name,
          v_name;
      end if;

      continue;
    end if;

    v_existing_code := null;

    select code
      into v_existing_code
    from public.item_classification_field_options
    where template_id = v_template_id
      and field_key = v_field_key
      and upper(trim(name)) = upper(v_name)
    limit 1;

    if v_existing_code is not null
       and v_existing_code <> v_code then
      raise exception
        'Conflicto en % / %: "%" ya existe con código %; objetivo %.',
        v_classification,
        v_field_key,
        v_name,
        v_existing_code,
        v_code;
    end if;

    insert into public.item_classification_field_options (
      template_id,
      field_key,
      code,
      name,
      status
    )
    values (
      v_template_id,
      v_field_key,
      v_code,
      v_name,
      'Activo'
    );

    raise notice
      'Opción agregada: % / % / % = %',
      v_classification,
      v_field_key,
      v_code,
      v_name;
  end loop;

  raise notice
    'Fase 1.2 completada: 4 opciones verificadas/agregadas. Productos y SIIGO no fueron modificados.';
end
$clap$;

commit;
