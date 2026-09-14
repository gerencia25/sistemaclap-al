create or replace function public.sc_deactivate_product_from_request(
  p_request_id uuid,
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
  v_product_code text;
begin
  if p_request_id is null then
    raise exception 'La solicitud es obligatoria.';
  end if;

  if nullif(btrim(p_reviewed_by), '') is null then
    raise exception 'El usuario que gestiona la solicitud es obligatorio.';
  end if;

  /*
   * Bloqueamos la solicitud para evitar que dos usuarios
   * intenten gestionarla al mismo tiempo.
   */
  select *
  into v_request
  from public.item_code_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'La solicitud no existe.';
  end if;

  if v_request.request_type <> 'Desactivación' then
    raise exception
      'La solicitud no corresponde a una desactivación.';
  end if;

  if v_request.status <> 'Pendiente' then
    raise exception
      'La solicitud ya fue gestionada. Estado actual: %.',
      v_request.status;
  end if;

  if v_request.product_id_to_deactivate is null then
    raise exception
      'La solicitud no tiene un producto asociado para desactivar.';
  end if;

  /*
   * Bloqueamos también el producto objetivo.
   */
  select *
  into v_product
  from public.products
  where id = v_request.product_id_to_deactivate
  for update;

  if not found then
    raise exception
      'El producto asociado a la solicitud no existe.';
  end if;

  if v_product.status <> 'Activo' then
    raise exception
      'El producto no está activo. Estado actual: %.',
      v_product.status;
  end if;

  /*
   * El producto se desactiva.
   * No se crea ningún producto nuevo.
   */
  update public.products
  set status = 'Inactivo'
  where id = v_product.id;

  /*
   * Cerramos la solicitud como Desactivado.
   */
  update public.item_code_requests
  set
    status = 'Desactivado',
    reviewed_at = now(),
    completed_at = now(),
    reviewed_by = btrim(p_reviewed_by),
    updated_at = now()
  where id = v_request.id
    and status = 'Pendiente';

  if not found then
    raise exception
      'La solicitud cambió de estado mientras se procesaba.';
  end if;

  v_product_code :=
    coalesce(
      nullif(btrim(v_product.final_code), ''),
      nullif(btrim(v_product.reference), ''),
      nullif(btrim(v_product.generated_reference), '')
    );

  return jsonb_build_object(
    'request_id', v_request.id,
    'request_number', v_request.request_number,
    'product_id', v_product.id,
    'product_code', v_product_code,
    'product_name', v_product.name,
    'product_status', 'Inactivo',
    'request_status', 'Desactivado'
  );
end;
$$;

revoke all
on function public.sc_deactivate_product_from_request(uuid, text)
from public;

revoke all
on function public.sc_deactivate_product_from_request(uuid, text)
from anon;

revoke all
on function public.sc_deactivate_product_from_request(uuid, text)
from authenticated;

grant execute
on function public.sc_deactivate_product_from_request(uuid, text)
to service_role;
