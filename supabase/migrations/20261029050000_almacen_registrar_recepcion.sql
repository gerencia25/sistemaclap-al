-- =========================================================
-- ALMACENES E INVENTARIOS
-- Registrar recepción de inventario de forma transaccional
-- =========================================================

create or replace function public.register_inventory_receipt(
  p_receipt_mode text,
  p_purchase_order_id uuid,
  p_supplier_id uuid,
  p_receipt_date date,
  p_supplier_invoice_number text,
  p_supplier_remission_number text,
  p_authorization_reference text,
  p_observations text,
  p_received_by text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_year integer;
  v_next_number integer;
  v_receipt_number text;

  v_receipt_id uuid;
  v_supplier_name text;
  v_payment_terms integer := 0;
  v_po_supplier_id uuid;

  v_item jsonb;

  v_item_id uuid;
  v_warehouse_id uuid;
  v_purchase_order_item_id uuid;

  v_quantity numeric;
  v_unit_price numeric;
  v_line_total numeric;

  v_internal_lot text;
  v_supplier_lot text;
  v_expiration_date date;
  v_difference_reason text;

  v_lot_id uuid;

  v_quantity_ordered numeric := 0;
  v_quantity_received_before numeric := 0;
  v_quantity_difference numeric := 0;

  v_previous_balance numeric := 0;
  v_new_balance numeric := 0;

  v_total numeric := 0;
  v_item_count integer := 0;

  v_all_received boolean := false;
  v_some_received boolean := false;
begin
  -- =======================================================
  -- VALIDACIONES GENERALES
  -- =======================================================

  if p_receipt_mode not in ('Desde OC', 'Directa') then
    raise exception 'Modo de recepción no válido.';
  end if;

  if p_supplier_id is null then
    raise exception 'Debes seleccionar un proveedor.';
  end if;

  if p_receipt_date is null then
    raise exception 'Debes indicar la fecha de recepción.';
  end if;

  if nullif(trim(coalesce(p_received_by, '')), '') is null then
    raise exception 'No se pudo identificar al usuario que realiza la recepción.';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'La recepción debe contener al menos un ítem.';
  end if;

  select
    s.name,
    coalesce(s.payment_terms_days, 0)
  into
    v_supplier_name,
    v_payment_terms
  from public.suppliers s
  where s.id = p_supplier_id
    and s.status = 'Activo';

  if not found then
    raise exception 'El proveedor seleccionado no existe o está inactivo.';
  end if;

  -- =======================================================
  -- VALIDAR OC
  -- =======================================================

  if p_receipt_mode = 'Desde OC' then
    if p_purchase_order_id is null then
      raise exception 'Debes seleccionar una orden de compra.';
    end if;

    select po.supplier_id
    into v_po_supplier_id
    from public.purchase_orders po
    where po.id = p_purchase_order_id
      and po.status in ('Abierta', 'Parcial');

    if not found then
      raise exception 'La orden de compra no existe o ya no admite recepciones.';
    end if;

    if v_po_supplier_id is distinct from p_supplier_id then
      raise exception 'El proveedor no corresponde a la orden de compra seleccionada.';
    end if;
  end if;

  if p_receipt_mode = 'Directa'
     and nullif(trim(coalesce(p_authorization_reference, '')), '') is null then
    raise exception 'Las entradas directas requieren una referencia o autorización.';
  end if;

  -- =======================================================
  -- CONSECUTIVO ATÓMICO
  -- REC-26001, REC-26002...
  -- =======================================================

  v_year :=
    mod(
      extract(year from p_receipt_date)::integer,
      100
    );

  insert into public.document_sequences (
    document_type,
    year,
    current_number,
    updated_at
  )
  values (
    'REC',
    v_year,
    1,
    now()
  )
  on conflict (document_type, year)
  do update
  set
    current_number =
      public.document_sequences.current_number + 1,
    updated_at = now()
  returning current_number
  into v_next_number;

  v_receipt_number :=
    'REC-' ||
    lpad(v_year::text, 2, '0') ||
    lpad(v_next_number::text, 3, '0');

  -- =======================================================
  -- CABECERA RECEPCIÓN
  -- =======================================================

  insert into public.purchase_receipts (
    receipt_number,
    purchase_order_id,
    supplier_id,
    receipt_date,
    supplier_invoice_number,
    supplier_remission_number,
    payment_due_date,
    payment_terms_days,
    observations,
    total,
    receipt_mode,
    authorization_reference,
    received_by
  )
  values (
    v_receipt_number,
    case
      when p_receipt_mode = 'Desde OC'
        then p_purchase_order_id
      else null
    end,
    p_supplier_id,
    p_receipt_date,
    nullif(trim(coalesce(p_supplier_invoice_number, '')), ''),
    nullif(trim(coalesce(p_supplier_remission_number, '')), ''),
    p_receipt_date + v_payment_terms,
    v_payment_terms,
    nullif(trim(coalesce(p_observations, '')), ''),
    0,
    p_receipt_mode,
    nullif(trim(coalesce(p_authorization_reference, '')), ''),
    trim(p_received_by)
  )
  returning id
  into v_receipt_id;

  -- =======================================================
  -- ÍTEMS
  -- =======================================================

  for v_item in
    select value
    from jsonb_array_elements(p_items)
  loop
    v_item_id :=
      nullif(v_item ->> 'item_id', '')::uuid;

    v_warehouse_id :=
      nullif(v_item ->> 'warehouse_id', '')::uuid;

    v_purchase_order_item_id :=
      nullif(
        v_item ->> 'purchase_order_item_id',
        ''
      )::uuid;

    v_quantity :=
      coalesce(
        nullif(
          v_item ->> 'quantity_received',
          ''
        )::numeric,
        0
      );

    v_unit_price :=
      coalesce(
        nullif(
          v_item ->> 'unit_price',
          ''
        )::numeric,
        0
      );

    v_internal_lot :=
      trim(
        coalesce(
          v_item ->> 'internal_lot',
          ''
        )
      );

    v_supplier_lot :=
      nullif(
        trim(
          coalesce(
            v_item ->> 'supplier_lot_number',
            ''
          )
        ),
        ''
      );

    v_expiration_date :=
      nullif(
        v_item ->> 'expiration_date',
        ''
      )::date;

    v_difference_reason :=
      nullif(
        trim(
          coalesce(
            v_item ->> 'difference_reason',
            ''
          )
        ),
        ''
      );

    if v_item_id is null then
      raise exception 'Todos los movimientos deben tener un producto.';
    end if;

    if v_warehouse_id is null then
      raise exception 'Todos los movimientos deben tener un almacén.';
    end if;

    if v_quantity <= 0 then
      raise exception 'Todas las cantidades recibidas deben ser mayores a cero.';
    end if;

    if v_unit_price < 0 then
      raise exception 'El costo unitario no puede ser negativo.';
    end if;

    if v_internal_lot = '' then
      raise exception 'Todos los movimientos deben tener un lote interno.';
    end if;

    perform 1
    from public.products p
    where p.id = v_item_id
      and p.status = 'Activo'
      and coalesce(p.tracks_inventory, true) = true;

    if not found then
      raise exception 'Uno de los productos no existe, está inactivo o no maneja inventario.';
    end if;

    perform 1
    from public.warehouses w
    where w.id = v_warehouse_id
      and w.status = 'Activo';

    if not found then
      raise exception 'Uno de los almacenes no existe o está inactivo.';
    end if;

    -- =====================================================
    -- VALIDAR ÍTEM DE OC
    -- =====================================================

    v_quantity_ordered := 0;
    v_quantity_received_before := 0;
    v_quantity_difference := 0;

    if p_receipt_mode = 'Desde OC' then
      if v_purchase_order_item_id is null then
        raise exception 'Cada ítem recibido desde OC debe indicar su ítem de origen.';
      end if;

      select
        poi.quantity_ordered,
        poi.quantity_received
      into
        v_quantity_ordered,
        v_quantity_received_before
      from public.purchase_order_items poi
      where poi.id = v_purchase_order_item_id
        and poi.purchase_order_id = p_purchase_order_id
        and poi.item_id = v_item_id
      for update;

      if not found then
        raise exception 'Uno de los ítems no corresponde a la orden de compra.';
      end if;

      v_quantity_difference :=
        (
          coalesce(
            v_quantity_received_before,
            0
          ) +
          v_quantity
        ) -
        coalesce(
          v_quantity_ordered,
          0
        );

      if v_quantity_difference > 0
         and v_difference_reason is null then
        raise exception 'Una sobre-recepción requiere motivo de diferencia.';
      end if;
    end if;

    -- =====================================================
    -- CREAR LOTE
    -- =====================================================

    insert into public.inventory_lots (
      lot_number,
      item_id,
      warehouse_id,
      origin_type,
      origin_reference,
      supplier_name,
      expiration_date,
      status,
      notes
    )
    values (
      v_internal_lot,
      v_item_id,
      v_warehouse_id,
      case
        when p_receipt_mode = 'Desde OC'
          then 'Compra OC'
        else 'Entrada directa'
      end,
      v_receipt_number,
      v_supplier_name,
      v_expiration_date,
      'Activo',
      case
        when v_supplier_lot is not null
          then 'Lote proveedor: ' || v_supplier_lot
        else null
      end
    )
    returning id
    into v_lot_id;

    -- =====================================================
    -- DETALLE RECEPCIÓN
    -- =====================================================

    v_line_total :=
      v_quantity * v_unit_price;

    insert into public.purchase_receipt_items (
      purchase_receipt_id,
      item_id,
      warehouse_id,
      supplier_lot_number,
      internal_lot_id,
      quantity_received,
      unit_price,
      total,
      quantity_ordered,
      quantity_difference,
      difference_reason
    )
    values (
      v_receipt_id,
      v_item_id,
      v_warehouse_id,
      v_supplier_lot,
      v_lot_id,
      v_quantity,
      v_unit_price,
      v_line_total,
      v_quantity_ordered,
      case
        when p_receipt_mode = 'Desde OC'
          then v_quantity_difference
        else 0
      end,
      v_difference_reason
    );

    -- =====================================================
    -- SALDO ACTUAL
    -- =====================================================

    select
      coalesce(ib.quantity_total, 0)
    into v_previous_balance
    from public.inventory_balances ib
    where ib.item_id = v_item_id
      and ib.warehouse_id = v_warehouse_id
      and ib.lot_id = v_lot_id
    for update;

    if not found then
      v_previous_balance := 0;
    end if;

    v_new_balance :=
      v_previous_balance + v_quantity;

    insert into public.inventory_balances (
      item_id,
      warehouse_id,
      lot_id,
      quantity_total,
      quantity_reserved,
      quantity_available,
      unit_cost,
      updated_at
    )
    values (
      v_item_id,
      v_warehouse_id,
      v_lot_id,
      v_quantity,
      0,
      v_quantity,
      v_unit_price,
      now()
    )
    on conflict (
      item_id,
      warehouse_id,
      lot_id
    )
    do update
    set
      quantity_total =
        public.inventory_balances.quantity_total +
        excluded.quantity_total,

      quantity_available =
        (
          public.inventory_balances.quantity_total +
          excluded.quantity_total
        ) -
        public.inventory_balances.quantity_reserved,

      unit_cost = excluded.unit_cost,
      updated_at = now();

    -- =====================================================
    -- KARDEX
    -- =====================================================

    insert into public.inventory_movements (
      movement_type,
      item_id,
      warehouse_id,
      lot_id,
      quantity,
      previous_balance,
      new_balance,
      reference_type,
      reference_id,
      reference_number,
      notes,
      created_by
    )
    values (
      case
        when p_receipt_mode = 'Desde OC'
          then 'Entrada compra OC'
        else 'Entrada directa'
      end,
      v_item_id,
      v_warehouse_id,
      v_lot_id,
      v_quantity,
      v_previous_balance,
      v_new_balance,
      'Recepción',
      v_receipt_id,
      v_receipt_number,
      v_difference_reason,
      trim(p_received_by)
    );

    -- =====================================================
    -- ACTUALIZAR CANTIDAD RECIBIDA DE OC
    -- =====================================================

    if p_receipt_mode = 'Desde OC' then
      update public.purchase_order_items
      set quantity_received =
        coalesce(
          quantity_received,
          0
        ) + v_quantity
      where id = v_purchase_order_item_id;
    end if;

    v_total :=
      v_total + v_line_total;

    v_item_count :=
      v_item_count + 1;
  end loop;

  -- =======================================================
  -- TOTAL RECEPCIÓN
  -- =======================================================

  update public.purchase_receipts
  set total = v_total
  where id = v_receipt_id;

  -- =======================================================
  -- ESTADO ORDEN DE COMPRA
  -- =======================================================

  if p_receipt_mode = 'Desde OC'
     and p_purchase_order_id is not null then

    select
      coalesce(
        bool_and(
          quantity_received >=
          quantity_ordered
        ),
        false
      ),
      coalesce(
        bool_or(
          quantity_received > 0
        ),
        false
      )
    into
      v_all_received,
      v_some_received
    from public.purchase_order_items
    where purchase_order_id =
      p_purchase_order_id;

    update public.purchase_orders
    set
      status =
        case
          when v_all_received
            then 'Recibida'
          when v_some_received
            then 'Parcial'
          else 'Abierta'
        end,
      updated_at = now()
    where id = p_purchase_order_id;
  end if;

  -- =======================================================
  -- RESPUESTA
  -- =======================================================

  return jsonb_build_object(
    'id',
    v_receipt_id,
    'receipt_number',
    v_receipt_number,
    'total',
    v_total,
    'items',
    v_item_count
  );
end;
$$;

revoke all
on function public.register_inventory_receipt(
  text,
  uuid,
  uuid,
  date,
  text,
  text,
  text,
  text,
  text,
  jsonb
)
from public, anon, authenticated;

grant execute
on function public.register_inventory_receipt(
  text,
  uuid,
  uuid,
  date,
  text,
  text,
  text,
  text,
  text,
  jsonb
)
to service_role;
