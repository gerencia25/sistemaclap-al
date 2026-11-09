-- ============================================================================
-- Sistema CLAP · Fase 2B
-- Normalización transaccional de códigos históricos de productos
-- Fecha: 2026-11-08
--
-- La función recibe un arreglo JSONB ya prevalidado desde el preview V3.
-- Valida TODOS los elementos antes de realizar cambios.
-- Si cualquier validación falla, toda la transacción se revierte.
--
-- Por cada producto:
--   1) conserva el código anterior en product_code_aliases
--   2) adopta clasificación y dynamic_code_data canónicos
--   3) actualiza final_code / reference / generated_reference al código canónico
--
-- NO toca SIIGO.
-- ============================================================================

begin;

create or replace function public.apply_product_code_normalizations(
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item jsonb;
  v_product public.products%rowtype;

  v_product_id uuid;
  v_siigo_product_id text;

  v_old_code text;
  v_new_code text;
  v_classification text;

  v_category_id uuid;
  v_group_id uuid;
  v_subgroup_id uuid;

  v_dynamic_code_data jsonb;
  v_dynamic_name text;

  v_count integer := 0;
begin
  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
  then
    raise exception
      'p_items debe ser un arreglo JSON.';
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception
      'p_items no puede estar vacío.';
  end if;

  -- ============================================================
  -- PRIMERA PASADA · VALIDAR TODO
  -- ============================================================

  for v_item in
    select value
    from jsonb_array_elements(p_items)
  loop
    v_product_id :=
      nullif(v_item->>'product_id', '')::uuid;

    v_siigo_product_id :=
      nullif(btrim(v_item->>'siigo_product_id'), '');

    v_old_code :=
      nullif(btrim(v_item->>'old_code'), '');

    v_new_code :=
      nullif(btrim(v_item->>'new_code'), '');

    v_classification :=
      nullif(btrim(v_item->>'classification'), '');

    v_category_id :=
      nullif(v_item->>'category_id', '')::uuid;

    v_group_id :=
      nullif(v_item->>'group_id', '')::uuid;

    v_subgroup_id :=
      nullif(v_item->>'subgroup_id', '')::uuid;

    v_dynamic_code_data :=
      v_item->'dynamic_code_data';

    v_dynamic_name :=
      nullif(btrim(v_item->>'dynamic_name'), '');

    if v_product_id is null
       or v_siigo_product_id is null
       or v_old_code is null
       or v_new_code is null
       or v_classification is null
       or v_category_id is null
       or v_group_id is null
       or v_subgroup_id is null
       or v_dynamic_code_data is null
       or jsonb_typeof(v_dynamic_code_data) <> 'object'
       or v_dynamic_name is null
    then
      raise exception
        'Elemento incompleto o inválido: %',
        v_item;
    end if;

    if upper(v_old_code) = upper(v_new_code) then
      raise exception
        'El código anterior y el nuevo son iguales para %.',
        v_old_code;
    end if;

    select *
      into v_product
    from public.products
    where id = v_product_id
    for update;

    if not found then
      raise exception
        'No existe producto %.',
        v_product_id;
    end if;

    if coalesce(v_product.siigo_product_id::text, '')
       <> v_siigo_product_id
    then
      raise exception
        'SIIGO ID cambió para %. Esperado %, actual %.',
        v_old_code,
        v_siigo_product_id,
        v_product.siigo_product_id;
    end if;

    if upper(btrim(coalesce(v_product.final_code, '')))
       <> upper(v_old_code)
    then
      raise exception
        'final_code cambió para %. Actual: %.',
        v_old_code,
        v_product.final_code;
    end if;

    if upper(btrim(coalesce(v_product.reference, '')))
       <> upper(v_old_code)
    then
      raise exception
        'reference cambió para %. Actual: %.',
        v_old_code,
        v_product.reference;
    end if;

    if v_product.generated_reference is not null
       and btrim(v_product.generated_reference) <> ''
       and upper(btrim(v_product.generated_reference))
           <> upper(v_old_code)
    then
      raise exception
        'generated_reference tiene un valor inesperado para %: %.',
        v_old_code,
        v_product.generated_reference;
    end if;

    -- Nuevo código no puede pertenecer a otro producto.
    if exists (
      select 1
      from public.products p
      where p.id <> v_product_id
        and (
          upper(btrim(coalesce(p.final_code, '')))
            = upper(v_new_code)
          or upper(btrim(coalesce(p.reference, '')))
            = upper(v_new_code)
          or upper(btrim(coalesce(p.generated_reference, '')))
            = upper(v_new_code)
        )
    ) then
      raise exception
        'El código nuevo % ya aparece en otro producto.',
        v_new_code;
    end if;

    -- Código histórico no puede pertenecer como alias a otro producto.
    if exists (
      select 1
      from public.product_code_aliases a
      where upper(btrim(a.alias_code))
              = upper(v_old_code)
        and a.product_id <> v_product_id
    ) then
      raise exception
        'El código histórico % ya pertenece como alias a otro producto.',
        v_old_code;
    end if;

    -- Nuevo código tampoco puede ser alias de otro producto.
    if exists (
      select 1
      from public.product_code_aliases a
      where upper(btrim(a.alias_code))
              = upper(v_new_code)
        and a.product_id <> v_product_id
    ) then
      raise exception
        'El código nuevo % ya existe como alias de otro producto.',
        v_new_code;
    end if;

    -- Validar que la clasificación coincide con los IDs enviados.
    if not exists (
      select 1
      from public.item_categories c
      join public.item_groups g
        on g.category_id = c.id
      join public.item_subgroups s
        on s.group_id = g.id
      where c.id = v_category_id
        and g.id = v_group_id
        and s.id = v_subgroup_id
        and upper(
          c.code || '-' || g.code || '-' || s.code
        ) = upper(v_classification)
        and c.status = 'Activo'
        and g.status = 'Activo'
        and s.status = 'Activo'
    ) then
      raise exception
        'Jerarquía inválida para % (%).',
        v_old_code,
        v_classification;
    end if;
  end loop;

  -- Evitar códigos nuevos duplicados dentro del mismo payload.
  if exists (
    select 1
    from (
      select
        upper(btrim(value->>'new_code')) as code,
        count(*) as qty
      from jsonb_array_elements(p_items)
      group by upper(btrim(value->>'new_code'))
      having count(*) > 1
    ) d
  ) then
    raise exception
      'El payload contiene códigos nuevos duplicados.';
  end if;

  -- Evitar códigos históricos duplicados dentro del mismo payload.
  if exists (
    select 1
    from (
      select
        upper(btrim(value->>'old_code')) as code,
        count(*) as qty
      from jsonb_array_elements(p_items)
      group by upper(btrim(value->>'old_code'))
      having count(*) > 1
    ) d
  ) then
    raise exception
      'El payload contiene códigos históricos duplicados.';
  end if;

  -- ============================================================
  -- SEGUNDA PASADA · APLICAR
  -- ============================================================

  for v_item in
    select value
    from jsonb_array_elements(p_items)
  loop
    v_product_id :=
      (v_item->>'product_id')::uuid;

    v_old_code :=
      btrim(v_item->>'old_code');

    v_new_code :=
      btrim(v_item->>'new_code');

    v_classification :=
      btrim(v_item->>'classification');

    v_category_id :=
      (v_item->>'category_id')::uuid;

    v_group_id :=
      (v_item->>'group_id')::uuid;

    v_subgroup_id :=
      (v_item->>'subgroup_id')::uuid;

    v_dynamic_code_data :=
      v_item->'dynamic_code_data';

    v_dynamic_name :=
      btrim(v_item->>'dynamic_name');

    insert into public.product_code_aliases (
      product_id,
      alias_code,
      alias_type,
      reason,
      source,
      status,
      created_by
    )
    values (
      v_product_id,
      v_old_code,
      'NORMALIZAR_GUION',
      'Normalización al formato canónico CAT-GRU-SUB-BLOQUE.',
      'Fase 2B · Adopción histórica SIIGO → CLAP',
      'Activo',
      'Sistema CLAP'
    )
    on conflict (
      upper(btrim(alias_code))
    )
    do nothing;

    update public.products
    set
      category_id = v_category_id,
      group_id = v_group_id,
      subgroup_id = v_subgroup_id,
      classification_code = v_classification,
      dynamic_code_data = v_dynamic_code_data,
      dynamic_name = v_dynamic_name,

      final_code = v_new_code,
      reference = v_new_code,
      generated_reference = v_new_code

    where id = v_product_id;

    if not found then
      raise exception
        'No se pudo actualizar el producto %.',
        v_product_id;
    end if;

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'updated_products', v_count,
    'created_or_existing_aliases', v_count,
    'status', 'OK'
  );
end;
$$;

revoke all
on function public.apply_product_code_normalizations(jsonb)
from public, anon, authenticated;

grant execute
on function public.apply_product_code_normalizations(jsonb)
to service_role;

commit;
