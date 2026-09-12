-- =========================================================
-- SC · CODIFICACIÓN
-- Creación atómica de producto desde solicitud de código
--
-- Garantiza:
-- 1. La solicitud existe.
-- 2. Sigue en estado Pendiente.
-- 3. Corresponde a una solicitud de Creación.
-- 4. Se crea el producto oficial.
-- 5. Se vincula el producto a la solicitud.
-- 6. La solicitud queda cerrada como Creado.
--
-- Si cualquier paso falla, toda la operación se revierte.
-- =========================================================

create or replace function public.sc_create_product_from_request(
  p_request_id uuid,
  p_product jsonb,
  p_reviewed_by text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request public.item_code_requests%rowtype;
  v_product public.products%rowtype;
  v_now timestamptz := now();
  v_final_code text;
  v_product_name text;
  v_category_id uuid;
  v_category_code text;
  v_category_name text;
  v_group_id uuid;
  v_group_code text;
  v_subgroup_id uuid;
  v_subgroup_code text;
  v_classification_code text;
begin
  -- Bloqueamos la solicitud para evitar doble gestión simultánea.
  select *
  into v_request
  from public.item_code_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'La solicitud no existe.';
  end if;

  if v_request.status <> 'Pendiente' then
    raise exception
      'La solicitud ya fue gestionada. Estado actual: %.',
      v_request.status;
  end if;

  if v_request.request_type <> 'Creación' then
    raise exception
      'Esta operación solo permite solicitudes de Creación.';
  end if;

  v_final_code := nullif(
    btrim(coalesce(p_product->>'final_code', '')),
    ''
  );

  v_product_name := nullif(
    btrim(coalesce(p_product->>'name', '')),
    ''
  );

  v_category_id := nullif(
    btrim(coalesce(p_product->>'category_id', '')),
    ''
  )::uuid;

  v_group_id := nullif(
    btrim(coalesce(p_product->>'group_id', '')),
    ''
  )::uuid;

  v_subgroup_id := nullif(
    btrim(coalesce(p_product->>'subgroup_id', '')),
    ''
  )::uuid;

  if v_final_code is null then
    raise exception 'El código final del producto es obligatorio.';
  end if;

  if v_product_name is null then
    raise exception 'El nombre del producto es obligatorio.';
  end if;

  if v_category_id is null then
    raise exception 'La categoría del producto es obligatoria.';
  end if;

  select
    code,
    name
  into
    v_category_code,
    v_category_name
  from public.item_categories
  where id = v_category_id;

  if not found then
    raise exception 'La categoría seleccionada no existe.';
  end if;

  if upper(btrim(v_category_code)) <> upper(btrim(v_request.classification_code)) then
    raise exception
      'La categoría seleccionada (%) no corresponde a la clasificación solicitada (%).',
      v_category_code,
      v_request.classification_code;
  end if;

  if v_group_id is null then
    raise exception 'El grupo del producto es obligatorio.';
  end if;

  select code
  into v_group_code
  from public.item_groups
  where id = v_group_id
    and category_id = v_category_id;

  if not found then
    raise exception
      'El grupo seleccionado no pertenece a la categoría indicada.';
  end if;

  if v_subgroup_id is null then
    raise exception 'El subgrupo del producto es obligatorio.';
  end if;

  select code
  into v_subgroup_code
  from public.item_subgroups
  where id = v_subgroup_id
    and group_id = v_group_id;

  if not found then
    raise exception
      'El subgrupo seleccionado no pertenece al grupo indicado.';
  end if;

  v_classification_code :=
    btrim(v_category_code) || '-' ||
    btrim(v_group_code) || '-' ||
    btrim(v_subgroup_code);

  if upper(v_final_code) not like upper(v_classification_code) || '-%' then
    raise exception
      'El código final (%) no corresponde a la clasificación calculada (%).',
      v_final_code,
      v_classification_code;
  end if;

  if nullif(btrim(coalesce(p_reviewed_by, '')), '') is null then
    raise exception 'El usuario revisor es obligatorio.';
  end if;

  insert into public.products (
    reference,
    name,
    category,
    color,
    unit,
    suggested_price,
    status,
    image_url,
    product_type,
    supply_type,
    production_process,
    material,
    mouth_size,
    capacity_ml,
    width_cm,
    length_m,
    finish,
    technical_description,
    item_type,
    can_be_sold,
    can_be_purchased,
    can_be_manufactured,
    tracks_inventory,
    tracks_lots,
    tracks_serials,
    requires_formula,
    requires_components,
    requires_route,
    requires_maintenance,
    depreciable,
    category_id,
    group_id,
    subgroup_id,
    classification_code,
    final_code,
    dynamic_code_data,
    dynamic_name,
    generated_reference,
    technical_sheet_url,
    technical_sheet_filename,
    item_master_data
  )
  values (
    coalesce(
      nullif(btrim(p_product->>'reference'), ''),
      v_final_code
    ),
    v_product_name,
    v_category_name,
    nullif(p_product->>'color', ''),
    coalesce(
      nullif(p_product->>'unit', ''),
      'Unidad'
    ),
    coalesce(
      nullif(p_product->>'suggested_price', '')::numeric,
      0
    ),
    coalesce(
      nullif(p_product->>'status', ''),
      'Activo'
    ),
    nullif(p_product->>'image_url', ''),
    coalesce(
      nullif(p_product->>'product_type', ''),
      'Simple'
    ),
    coalesce(
      nullif(p_product->>'supply_type', ''),
      'Fabricado'
    ),
    nullif(p_product->>'production_process', ''),
    nullif(p_product->>'material', ''),
    nullif(p_product->>'mouth_size', ''),
    nullif(p_product->>'capacity_ml', '')::numeric,
    nullif(p_product->>'width_cm', '')::numeric,
    nullif(p_product->>'length_m', '')::numeric,
    nullif(p_product->>'finish', ''),
    nullif(p_product->>'technical_description', ''),
    nullif(p_product->>'item_type', ''),
    coalesce((p_product->>'can_be_sold')::boolean, true),
    coalesce((p_product->>'can_be_purchased')::boolean, false),
    coalesce((p_product->>'can_be_manufactured')::boolean, false),
    coalesce((p_product->>'tracks_inventory')::boolean, true),
    coalesce((p_product->>'tracks_lots')::boolean, false),
    coalesce((p_product->>'tracks_serials')::boolean, false),
    coalesce((p_product->>'requires_formula')::boolean, false),
    coalesce((p_product->>'requires_components')::boolean, false),
    coalesce((p_product->>'requires_route')::boolean, false),
    coalesce((p_product->>'requires_maintenance')::boolean, false),
    coalesce((p_product->>'depreciable')::boolean, false),
    v_category_id,
    v_group_id,
    v_subgroup_id,
    v_classification_code,
    v_final_code,
    coalesce(p_product->'dynamic_code_data', '{}'::jsonb),
    nullif(p_product->>'dynamic_name', ''),
    coalesce(
      nullif(p_product->>'generated_reference', ''),
      v_final_code
    ),
    nullif(p_product->>'technical_sheet_url', ''),
    nullif(p_product->>'technical_sheet_filename', ''),
    coalesce(p_product->'item_master_data', '{}'::jsonb)
  )
  returning *
  into v_product;

  update public.item_code_requests
  set
    status = 'Creado',
    created_product_id = v_product.id,
    created_product_code = v_product.final_code,
    created_product_name = v_product.name,
    completed_at = v_now,
    reviewed_at = v_now,
    reviewed_by = p_reviewed_by,
    updated_at = v_now
  where id = v_request.id;

  return jsonb_build_object(
    'success', true,
    'request_id', v_request.id,
    'request_number', v_request.request_number,
    'product_id', v_product.id,
    'product_code', v_product.final_code,
    'product_name', v_product.name,
    'status', 'Creado',
    'completed_at', v_now
  );
end;
$$;

revoke all
on function public.sc_create_product_from_request(uuid, jsonb, text)
from public;

revoke all
on function public.sc_create_product_from_request(uuid, jsonb, text)
from anon;

revoke all
on function public.sc_create_product_from_request(uuid, jsonb, text)
from authenticated;

grant execute
on function public.sc_create_product_from_request(uuid, jsonb, text)
to service_role;
