create or replace function public.config_create_classification_option(
  p_template_id uuid,
  p_field_key text,
  p_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_template public.item_classification_templates%rowtype;
  v_field public.item_classification_template_fields%rowtype;

  v_field_key text;
  v_name text;

  v_next_number bigint;
  v_max_number bigint;
  v_max_allowed bigint;
  v_code text;

  v_existing_id uuid;
  v_option_id uuid;
begin
  if p_template_id is null then
    raise exception 'La plantilla es obligatoria.';
  end if;

  v_field_key :=
    lower(trim(coalesce(p_field_key, '')));

  v_name :=
    trim(coalesce(p_name, ''));

  if v_field_key = '' then
    raise exception 'El campo es obligatorio.';
  end if;

  if v_name = '' then
    raise exception 'El nombre de la opción es obligatorio.';
  end if;

  -- ======================================================
  -- Validar plantilla
  -- Puede estar Activa o Inactiva porque las opciones
  -- se configuran antes de activar una plantilla nueva.
  -- ======================================================

  select *
  into v_template
  from public.item_classification_templates
  where id = p_template_id;

  if not found then
    raise exception 'La plantilla seleccionada no existe.';
  end if;

  -- ======================================================
  -- Bloquear el campo.
  -- Esto serializa la generación del siguiente código
  -- para este campo concreto.
  -- ======================================================

  select *
  into v_field
  from public.item_classification_template_fields
  where template_id = p_template_id
    and field_key = v_field_key
  for update;

  if not found then
    raise exception
      'El campo "%" no pertenece a la plantilla seleccionada.',
      v_field_key;
  end if;

  if v_field.status <> 'Activo' then
    raise exception
      'El campo "%" está inactivo.',
      v_field.field_label;
  end if;

  if v_field.field_type <> 'select' then
    raise exception
      'Solo los campos de tipo lista pueden tener opciones de clasificación.';
  end if;

  if not v_field.allow_new_options then
    raise exception
      'El campo "%" no permite agregar nuevas opciones.',
      v_field.field_label;
  end if;

  if v_field.code_length <= 0 then
    raise exception
      'La longitud configurada para el campo "%" no es válida.',
      v_field.field_label;
  end if;

  -- ======================================================
  -- Evitar nombres duplicados ignorando mayúsculas
  -- ======================================================

  select id
  into v_existing_id
  from public.item_classification_field_options
  where template_id = p_template_id
    and field_key = v_field_key
    and upper(trim(name)) = upper(v_name)
  limit 1;

  if v_existing_id is not null then
    raise exception
      'Ya existe la opción "%" en el campo "%".',
      v_name,
      v_field.field_label;
  end if;

  -- ======================================================
  -- Calcular siguiente código histórico
  -- No reutiliza códigos de opciones inactivas.
  -- ======================================================

  select coalesce(max(code::bigint), 0)
  into v_max_number
  from public.item_classification_field_options
  where template_id = p_template_id
    and field_key = v_field_key;

  v_next_number :=
    v_max_number + 1;

  v_max_allowed :=
    power(10::numeric, v_field.code_length)::bigint - 1;

  if v_next_number > v_max_allowed then
    raise exception
      'El campo "%" agotó los códigos disponibles para una longitud de % dígitos.',
      v_field.field_label,
      v_field.code_length;
  end if;

  v_code :=
    lpad(
      v_next_number::text,
      v_field.code_length,
      '0'
    );

  -- ======================================================
  -- Crear opción
  -- ======================================================

  insert into public.item_classification_field_options (
    template_id,
    field_key,
    code,
    name,
    status
  )
  values (
    p_template_id,
    v_field_key,
    v_code,
    v_name,
    'Activo'
  )
  returning id
  into v_option_id;

  return jsonb_build_object(
    'id', v_option_id,
    'template_id', p_template_id,
    'field_key', v_field_key,
    'field_label', v_field.field_label,
    'code', v_code,
    'name', v_name,
    'status', 'Activo'
  );
end;
$$;

revoke all
on function public.config_create_classification_option(
  uuid,
  text,
  text
)
from public;

revoke all
on function public.config_create_classification_option(
  uuid,
  text,
  text
)
from anon;

revoke all
on function public.config_create_classification_option(
  uuid,
  text,
  text
)
from authenticated;

grant execute
on function public.config_create_classification_option(
  uuid,
  text,
  text
)
to service_role;
