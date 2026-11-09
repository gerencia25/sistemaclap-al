-- ============================================================================
-- Sistema CLAP · Corrección de plantilla INS-EM-AC
-- Fecha: 2026-11-09
--
-- Evidencia de la matriz maestra:
--   REFERENCIA  = 3 dígitos
--   TIPO        = 4 dígitos
--   MEDIDA      = 4 dígitos
--   CALIBRE     = 2 dígitos
-- Total numérico = 13 dígitos
--
-- CLAP estaba configurado como 3 + 4 + 3 + 3.
-- Esto hacía que códigos históricos correctos se segmentaran mal.
--
-- Ejemplos que deben quedar interpretables SIN cambiar su código:
--   INS-EM-AC-1010001000302
--     101 | 0001 | 0003 | 02
--     CARTÓN KRAF | ROLLO | 1,5 mt | 3,5 mm
--
--   INS-EM-AC-1030001000201
--     103 | 0001 | 0002 | 01
--     CINTA PEGANTE SIN LOGO | ROLLO | 100 mt | 48 micras
--
-- NO modifica products.
-- NO cambia códigos de productos.
-- NO crea aliases.
-- NO toca SIIGO.
-- ============================================================================

begin;

do $clap$
declare
  v_template_id uuid;
  v_count integer;
begin
  select count(*)
    into v_count
  from public.item_classification_templates
  where category_code = 'INS'
    and group_code = 'EM'
    and subgroup_code = 'AC';

  if v_count <> 1 then
    raise exception
      'Se esperaba exactamente una plantilla INS-EM-AC; existen %.',
      v_count;
  end if;

  select id
    into v_template_id
  from public.item_classification_templates
  where category_code = 'INS'
    and group_code = 'EM'
    and subgroup_code = 'AC'
    and status = 'Activo';

  if v_template_id is null then
    raise exception
      'La plantilla INS-EM-AC no existe o no está activa.';
  end if;

  if (
    select numeric_code_length
    from public.item_classification_templates
    where id = v_template_id
  ) <> 13 then
    raise exception
      'INS-EM-AC no tiene numeric_code_length=13.';
  end if;

  -- Validar los cuatro campos base.
  if (
    select count(*)
    from public.item_classification_template_fields
    where template_id = v_template_id
      and field_key in (
        'referencia',
        'tipo',
        'medida',
        'calibre'
      )
      and status = 'Activo'
      and field_type = 'select'
  ) <> 4 then
    raise exception
      'INS-EM-AC no tiene los cuatro campos select activos esperados.';
  end if;

  -- Esta clasificación usa opciones propias, no catálogos transversales.
  if exists (
    select 1
    from public.item_classification_template_fields
    where template_id = v_template_id
      and field_key in ('medida', 'calibre')
      and option_catalog_id is not null
  ) then
    raise exception
      'medida/calibre de INS-EM-AC usan catálogo transversal; se cancela la corrección.';
  end if;

  -- ------------------------------------------------------------
  -- MEDIDA · longitud correcta 4
  -- ------------------------------------------------------------

  update public.item_classification_template_fields
  set code_length = 4
  where template_id = v_template_id
    and field_key = 'medida'
    and code_length <> 4;

  -- 001 -> 0001 = 50 mt
  if exists (
    select 1
    from public.item_classification_field_options
    where template_id = v_template_id
      and field_key = 'medida'
      and code = '0001'
      and upper(trim(name)) <> upper('50 mt')
  ) then
    raise exception
      'Conflicto: medida 0001 ya existe con otro significado.';
  end if;

  if not exists (
    select 1
    from public.item_classification_field_options
    where template_id = v_template_id
      and field_key = 'medida'
      and code = '0001'
  ) then
    update public.item_classification_field_options
    set code = '0001'
    where template_id = v_template_id
      and field_key = 'medida'
      and code = '001'
      and upper(trim(name)) = upper('50 mt');
  end if;

  -- 002 -> 0002 = 100 mt
  if exists (
    select 1
    from public.item_classification_field_options
    where template_id = v_template_id
      and field_key = 'medida'
      and code = '0002'
      and upper(trim(name)) <> upper('100 mt')
  ) then
    raise exception
      'Conflicto: medida 0002 ya existe con otro significado.';
  end if;

  if not exists (
    select 1
    from public.item_classification_field_options
    where template_id = v_template_id
      and field_key = 'medida'
      and code = '0002'
  ) then
    update public.item_classification_field_options
    set code = '0002'
    where template_id = v_template_id
      and field_key = 'medida'
      and code = '002'
      and upper(trim(name)) = upper('100 mt');
  end if;

  -- Crear 0003 = 1,5 mt si no existe.
  if exists (
    select 1
    from public.item_classification_field_options
    where template_id = v_template_id
      and field_key = 'medida'
      and code = '0003'
      and upper(trim(name)) <> upper('1,5 mt')
  ) then
    raise exception
      'Conflicto: medida 0003 ya existe con otro significado.';
  end if;

  if not exists (
    select 1
    from public.item_classification_field_options
    where template_id = v_template_id
      and field_key = 'medida'
      and code = '0003'
  ) then
    insert into public.item_classification_field_options (
      template_id,
      field_key,
      code,
      name,
      status
    )
    values (
      v_template_id,
      'medida',
      '0003',
      '1,5 mt',
      'Activo'
    );
  end if;

  -- ------------------------------------------------------------
  -- CALIBRE · longitud correcta 2
  -- ------------------------------------------------------------

  update public.item_classification_template_fields
  set code_length = 2
  where template_id = v_template_id
    and field_key = 'calibre'
    and code_length <> 2;

  -- 001 -> 01 = 48 micras
  if exists (
    select 1
    from public.item_classification_field_options
    where template_id = v_template_id
      and field_key = 'calibre'
      and code = '01'
      and upper(trim(name)) <> upper('48 micras')
  ) then
    raise exception
      'Conflicto: calibre 01 ya existe con otro significado.';
  end if;

  if not exists (
    select 1
    from public.item_classification_field_options
    where template_id = v_template_id
      and field_key = 'calibre'
      and code = '01'
  ) then
    update public.item_classification_field_options
    set code = '01'
    where template_id = v_template_id
      and field_key = 'calibre'
      and code = '001'
      and upper(trim(name)) = upper('48 micras');
  end if;

  -- Crear 02 = 3,5 mm si no existe.
  if exists (
    select 1
    from public.item_classification_field_options
    where template_id = v_template_id
      and field_key = 'calibre'
      and code = '02'
      and upper(trim(name)) <> upper('3,5 mm')
  ) then
    raise exception
      'Conflicto: calibre 02 ya existe con otro significado.';
  end if;

  if not exists (
    select 1
    from public.item_classification_field_options
    where template_id = v_template_id
      and field_key = 'calibre'
      and code = '02'
  ) then
    insert into public.item_classification_field_options (
      template_id,
      field_key,
      code,
      name,
      status
    )
    values (
      v_template_id,
      'calibre',
      '02',
      '3,5 mm',
      'Activo'
    );
  end if;

  -- ------------------------------------------------------------
  -- Validación final exacta
  -- ------------------------------------------------------------

  if (
    select sum(code_length)
    from public.item_classification_template_fields
    where template_id = v_template_id
      and contributes_to_code = true
      and status = 'Activo'
  ) <> 13 then
    raise exception
      'La suma final de longitudes codificables de INS-EM-AC no es 13.';
  end if;

  if (
    select count(*)
    from public.item_classification_field_options
    where template_id = v_template_id
      and field_key = 'medida'
      and status = 'Activo'
      and (
        (code = '0001' and upper(trim(name)) = upper('50 mt'))
        or
        (code = '0002' and upper(trim(name)) = upper('100 mt'))
        or
        (code = '0003' and upper(trim(name)) = upper('1,5 mt'))
      )
  ) <> 3 then
    raise exception
      'Las opciones finales de medida INS-EM-AC no quedaron completas.';
  end if;

  if (
    select count(*)
    from public.item_classification_field_options
    where template_id = v_template_id
      and field_key = 'calibre'
      and status = 'Activo'
      and (
        (code = '01' and upper(trim(name)) = upper('48 micras'))
        or
        (code = '02' and upper(trim(name)) = upper('3,5 mm'))
      )
  ) <> 2 then
    raise exception
      'Las opciones finales de calibre INS-EM-AC no quedaron completas.';
  end if;

  raise notice
    'INS-EM-AC corregida: 3 + 4 + 4 + 2 = 13.';
end
$clap$;

commit;
