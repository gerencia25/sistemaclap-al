-- ============================================================================
-- Sistema CLAP · Codificación histórica SIIGO · Fase 1.1
-- Fecha: 2026-11-08
--
-- ALCANCE:
--   - Agrega únicamente 26 opciones faltantes documentadas en la matriz histórica.
--   - Todas corresponden a productos reales vinculados a SIIGO.
--   - Normaliza solo presentación textual evidente (mm/mL/espacios), NO códigos.
--
-- NO HACE:
--   - No modifica public.products.
--   - No cambia códigos históricos.
--   - No toca SIIGO.
--   - No crea plantillas ni jerarquías.
--   - No resuelve los 8 casos de revisión manual real.
--
-- SEGURIDAD:
--   - Si la plantilla o campo no existe/está inactivo, aborta.
--   - Si el mismo código ya significa otra cosa, aborta.
--   - Si el mismo nombre ya existe con otro código, aborta.
--   - Es idempotente.
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
      '[{"classification":"MPC-CP-MB","field_key":"codigo","code":"0003","name":"PL-YE0017"},{"classification":"PTF-AL-TP","field_key":"acabado","code":"09","name":"RECTANGULAR LISA 3 DIVISIONES"},{"classification":"PTF-AL-TP","field_key":"boca","code":"026","name":"B. 190 mm x 230 mm"},{"classification":"PTF-AL-TP","field_key":"boca","code":"027","name":"B. 401-101 EM"},{"classification":"PTF-AL-TP","field_key":"boca","code":"028","name":"B. 401-103 EC"},{"classification":"PTF-AL-TP","field_key":"boca","code":"029","name":"B. 502-129 EM"},{"classification":"PTF-AL-TP","field_key":"boca","code":"030","name":"B. 307 EC"},{"classification":"PTF-AL-TP","field_key":"boca","code":"031","name":"B. 211 EC"},{"classification":"PTF-AL-TP","field_key":"tipo","code":"1006","name":"SOBRE TAPA"},{"classification":"PTF-AL-TP","field_key":"tipo","code":"1007","name":"TAPÓN A PRESIÓN"},{"classification":"PTF-ES-TP","field_key":"boca","code":"004","name":"B. 30 mm"},{"classification":"PTF-ES-TP","field_key":"boca","code":"005","name":"B. 90 mm"},{"classification":"PTF-ES-TP","field_key":"tipo","code":"1003","name":"SUB MASTER"},{"classification":"PTF-FM-EN","field_key":"boca","code":"023","name":"B. 59 mm"},{"classification":"PTF-FM-EN","field_key":"capacidad","code":"019","name":"350 mL"},{"classification":"PTF-FM-TP","field_key":"acabado","code":"07","name":"PERFORADO"},{"classification":"PTF-FM-TP","field_key":"boca","code":"025","name":"B. 22 mm"},{"classification":"PTF-FM-TP","field_key":"boca","code":"026","name":"B. 19 mm"},{"classification":"PTF-FM-TP","field_key":"boca","code":"027","name":"B. 59 mm"},{"classification":"PTF-FM-TP","field_key":"tipo","code":"1006","name":"TAPÓN A PRESIÓN"},{"classification":"PTF-RT-PO","field_key":"dimensiones","code":"002","name":"3,7 x 2,5 cm"},{"classification":"PTF-RT-PO","field_key":"dimensiones","code":"003","name":"2,5 cm"},{"classification":"PTF-RT-PO","field_key":"dimensiones","code":"004","name":"30 x 4 cm"},{"classification":"PTF-RT-PO","field_key":"tipo","code":"003","name":"RÍGIDO"},{"classification":"PTF-RT-PO","field_key":"tipo","code":"007","name":"ROPETRÁFICO P-37"},{"classification":"PTF-RT-PO","field_key":"tipo","code":"012","name":"PUNTO DE PAGO"}]'::jsonb
    )
  loop
    v_classification := trim(v_item->>'classification');
    v_field_key := trim(v_item->>'field_key');
    v_code := trim(v_item->>'code');
    v_name := trim(v_item->>'name');

    v_category_code := split_part(v_classification, '-', 1);
    v_group_code := split_part(v_classification, '-', 2);
    v_subgroup_code := split_part(v_classification, '-', 3);

    if v_category_code = ''
       or v_group_code = ''
       or v_subgroup_code = '' then
      raise exception
        'Clasificación inválida en Fase 1.1: %.',
        v_classification;
    end if;

    -- ------------------------------------------------------------------------
    -- Plantilla activa y única
    -- ------------------------------------------------------------------------
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
      raise exception
        'No existe plantilla para %.',
        v_classification;
    end if;

    if v_template_status <> 'Activo' then
      raise exception
        'La plantilla % existe pero está inactiva.',
        v_classification;
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

    -- ------------------------------------------------------------------------
    -- Campo activo
    -- ------------------------------------------------------------------------
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

    -- Esta fase solo agrega opciones propias de plantilla.
    if exists (
      select 1
      from public.item_classification_template_fields
      where template_id = v_template_id
        and field_key = v_field_key
        and option_catalog_id is not null
    ) then
      raise exception
        'El campo % de % usa catálogo transversal; no debe cargarse en Fase 1.1.',
        v_field_key,
        v_classification;
    end if;

    -- ------------------------------------------------------------------------
    -- Validar código existente
    -- ------------------------------------------------------------------------
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

      -- Ya existe correctamente: idempotencia.
      continue;
    end if;

    -- ------------------------------------------------------------------------
    -- No duplicar el mismo significado con otro código.
    -- ------------------------------------------------------------------------
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
        'Conflicto en % / %: la opción "%" ya existe con código %; objetivo %.',
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
    'Fase 1.1 completada: 26 opciones históricas agregadas/verificadas. Productos y SIIGO no fueron modificados.';
end
$clap$;

commit;
