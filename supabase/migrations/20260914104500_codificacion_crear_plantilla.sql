create or replace function public.config_create_classification_template(
  p_category_id uuid,
  p_group_id uuid,
  p_subgroup_id uuid,
  p_fields jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_category public.item_categories%rowtype;
  v_group public.item_groups%rowtype;
  v_subgroup public.item_subgroups%rowtype;

  v_template_id uuid;
  v_full_code text;
  v_template_name text;
  v_code_pattern text := '';
  v_name_pattern text := '';
  v_numeric_length integer := 0;

  v_field jsonb;
  v_field_key text;
  v_field_label text;
  v_field_type text;
  v_required boolean;
  v_display_order integer;
  v_code_length integer;
  v_contributes_to_code boolean;
  v_contributes_to_name boolean;
  v_allow_new_options boolean;

  v_seen_keys text[] := array[]::text[];
  v_seen_orders integer[] := array[]::integer[];

  v_existing_id uuid;
begin
  if p_category_id is null then
    raise exception 'La categoría es obligatoria.';
  end if;

  if p_group_id is null then
    raise exception 'El grupo es obligatorio.';
  end if;

  if p_subgroup_id is null then
    raise exception 'El subgrupo es obligatorio.';
  end if;

  if p_fields is null
     or jsonb_typeof(p_fields) <> 'array'
     or jsonb_array_length(p_fields) = 0 then
    raise exception 'La plantilla debe tener al menos un campo.';
  end if;

  -- ======================================================
  -- Validar jerarquía
  -- ======================================================

  select *
  into v_category
  from public.item_categories
  where id = p_category_id
  for share;

  if not found then
    raise exception 'La categoría seleccionada no existe.';
  end if;

  if v_category.status <> 'Activo' then
    raise exception 'La categoría seleccionada está inactiva.';
  end if;

  select *
  into v_group
  from public.item_groups
  where id = p_group_id
    and category_id = p_category_id
  for share;

  if not found then
    raise exception 'El grupo no pertenece a la categoría seleccionada.';
  end if;

  if v_group.status <> 'Activo' then
    raise exception 'El grupo seleccionado está inactivo.';
  end if;

  select *
  into v_subgroup
  from public.item_subgroups
  where id = p_subgroup_id
    and group_id = p_group_id
  for share;

  if not found then
    raise exception 'El subgrupo no pertenece al grupo seleccionado.';
  end if;

  if v_subgroup.status <> 'Activo' then
    raise exception 'El subgrupo seleccionado está inactivo.';
  end if;

  v_full_code :=
    v_category.code || '-' ||
    v_group.code || '-' ||
    v_subgroup.code;

  v_template_name :=
    upper(
      trim(
        v_category.code || ' ' ||
        v_group.name || ' ' ||
        v_subgroup.name
      )
    );

  -- ======================================================
  -- No permitir otra plantilla para la misma clasificación
  -- ======================================================

  select id
  into v_existing_id
  from public.item_classification_templates
  where category_code = v_category.code
    and group_code = v_group.code
    and subgroup_code = v_subgroup.code
  limit 1;

  if v_existing_id is not null then
    raise exception
      'Ya existe una plantilla para la clasificación %.',
      v_full_code;
  end if;

  -- ======================================================
  -- Validar campos y construir patrones
  -- ======================================================

  for v_field in
    select value
    from jsonb_array_elements(p_fields)
    order by (value->>'display_order')::integer
  loop
    v_field_key :=
      lower(trim(coalesce(v_field->>'field_key', '')));

    v_field_label :=
      trim(coalesce(v_field->>'field_label', ''));

    v_field_type :=
      lower(trim(coalesce(v_field->>'field_type', 'select')));

    v_required :=
      coalesce((v_field->>'required')::boolean, true);

    v_display_order :=
      coalesce((v_field->>'display_order')::integer, 0);

    v_code_length :=
      coalesce((v_field->>'code_length')::integer, 0);

    v_contributes_to_code :=
      coalesce(
        (v_field->>'contributes_to_code')::boolean,
        true
      );

    v_contributes_to_name :=
      coalesce(
        (v_field->>'contributes_to_name')::boolean,
        true
      );

    v_allow_new_options :=
      coalesce(
        (v_field->>'allow_new_options')::boolean,
        true
      );

    if v_field_key = '' then
      raise exception 'Todos los campos deben tener una clave.';
    end if;

    if v_field_key !~ '^[a-z][a-z0-9_]*$' then
      raise exception
        'La clave "%" no es válida. Usa letras minúsculas, números y guion bajo.',
        v_field_key;
    end if;

    if v_field_key = any(v_seen_keys) then
      raise exception
        'La clave de campo "%" está repetida.',
        v_field_key;
    end if;

    v_seen_keys :=
      array_append(v_seen_keys, v_field_key);

    if v_field_label = '' then
      raise exception
        'El campo "%" debe tener un nombre visible.',
        v_field_key;
    end if;

    if v_field_type not in ('select', 'number') then
      raise exception
        'El tipo "%" no está permitido en plantillas de codificación.',
        v_field_type;
    end if;

    if v_display_order <= 0 then
      raise exception
        'El orden de los campos debe iniciar en 1.';
    end if;

    if v_display_order = any(v_seen_orders) then
      raise exception
        'El orden % está repetido.',
        v_display_order;
    end if;

    v_seen_orders :=
      array_append(
        v_seen_orders,
        v_display_order
      );

    if v_contributes_to_code then
      if not v_required then
        raise exception
          'El campo "%" aporta al código y por eso debe ser obligatorio.',
          v_field_label;
      end if;

      if v_code_length <= 0 then
        raise exception
          'El campo "%" debe tener una longitud mayor a 0.',
          v_field_label;
      end if;

      v_numeric_length :=
        v_numeric_length + v_code_length;

      v_code_pattern :=
        v_code_pattern ||
        format('{%s}', v_field_key);
    end if;

    if v_contributes_to_name then
      if v_name_pattern <> '' then
        v_name_pattern :=
          v_name_pattern || ' ';
      end if;

      if v_field_type = 'select' then
        v_name_pattern :=
          v_name_pattern ||
          format('{%s_name}', v_field_key);
      else
        v_name_pattern :=
          v_name_pattern ||
          format('{%s}', v_field_key);
      end if;
    end if;
  end loop;

  if v_numeric_length <= 0 then
    raise exception
      'La plantilla debe tener al menos un campo que aporte al código.';
  end if;

  if trim(v_name_pattern) = '' then
    raise exception
      'La plantilla debe tener al menos un campo que aporte al nombre.';
  end if;

  -- ======================================================
  -- Crear plantilla
  -- Nace INACTIVA hasta terminar opciones/configuración
  -- ======================================================

  insert into public.item_classification_templates (
    category_code,
    group_code,
    subgroup_code,
    full_code,
    name,
    code_pattern,
    name_pattern,
    numeric_code_length,
    status
  )
  values (
    v_category.code,
    v_group.code,
    v_subgroup.code,
    v_full_code,
    v_template_name,
    v_code_pattern,
    trim(v_name_pattern),
    v_numeric_length,
    'Inactivo'
  )
  returning id
  into v_template_id;

  -- ======================================================
  -- Crear campos
  -- ======================================================

  for v_field in
    select value
    from jsonb_array_elements(p_fields)
    order by (value->>'display_order')::integer
  loop
    insert into public.item_classification_template_fields (
      template_id,
      field_key,
      field_label,
      field_type,
      required,
      display_order,
      code_length,
      contributes_to_code,
      contributes_to_name,
      allow_new_options,
      status
    )
    values (
      v_template_id,
      lower(trim(v_field->>'field_key')),
      trim(v_field->>'field_label'),
      lower(trim(coalesce(v_field->>'field_type', 'select'))),
      coalesce((v_field->>'required')::boolean, true),
      (v_field->>'display_order')::integer,
      coalesce((v_field->>'code_length')::integer, 0),
      coalesce(
        (v_field->>'contributes_to_code')::boolean,
        true
      ),
      coalesce(
        (v_field->>'contributes_to_name')::boolean,
        true
      ),
      coalesce(
        (v_field->>'allow_new_options')::boolean,
        true
      ),
      'Activo'
    );
  end loop;

  return jsonb_build_object(
    'id', v_template_id,
    'full_code', v_full_code,
    'name', v_template_name,
    'code_pattern', v_code_pattern,
    'name_pattern', trim(v_name_pattern),
    'numeric_code_length', v_numeric_length,
    'status', 'Inactivo',
    'fields_count', jsonb_array_length(p_fields)
  );
end;
$$;

revoke all
on function public.config_create_classification_template(
  uuid,
  uuid,
  uuid,
  jsonb
)
from public;

revoke all
on function public.config_create_classification_template(
  uuid,
  uuid,
  uuid,
  jsonb
)
from anon;

revoke all
on function public.config_create_classification_template(
  uuid,
  uuid,
  uuid,
  jsonb
)
from authenticated;

grant execute
on function public.config_create_classification_template(
  uuid,
  uuid,
  uuid,
  jsonb
)
to service_role;
