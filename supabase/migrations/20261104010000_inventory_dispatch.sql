
-- ============================================================
-- CLAP · ALMACENES E INVENTARIOS
-- SALIDAS DE INVENTARIO
-- ============================================================

create table if not exists public.inventory_dispatches (
  id uuid primary key default gen_random_uuid(),
  dispatch_number text not null unique,
  dispatch_date date not null default current_date,

  reason text not null,
  destination text,
  reference text,
  observations text,

  dispatched_by text not null,

  total_quantity numeric not null default 0,

  created_at timestamptz not null default now()
);

create table if not exists public.inventory_dispatch_items (
  id uuid primary key default gen_random_uuid(),

  dispatch_id uuid not null
    references public.inventory_dispatches(id)
    on delete cascade,

  item_id uuid not null
    references public.products(id),

  warehouse_id uuid not null
    references public.warehouses(id),

  lot_id uuid
    references public.inventory_lots(id),

  quantity numeric not null
    check (quantity > 0),

  unit_cost numeric not null default 0,
  total_cost numeric not null default 0,

  created_at timestamptz not null default now()
);

create index if not exists
  inventory_dispatch_items_dispatch_idx
on public.inventory_dispatch_items (
  dispatch_id
);

create index if not exists
  inventory_dispatch_items_item_idx
on public.inventory_dispatch_items (
  item_id
);

create index if not exists
  inventory_dispatch_items_lot_idx
on public.inventory_dispatch_items (
  lot_id
);


-- ============================================================
-- RPC TRANSACCIONAL
-- ============================================================

create or replace function public.register_inventory_dispatch(
  p_dispatch_date date,
  p_reason text,
  p_destination text,
  p_reference text,
  p_observations text,
  p_dispatched_by text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year integer;
  v_next_number integer;

  v_dispatch_id uuid;
  v_dispatch_number text;

  v_dispatch_date date;

  v_item jsonb;
  v_balance_id uuid;
  v_quantity numeric;

  v_balance record;

  v_previous_balance numeric;
  v_new_balance numeric;

  v_reserved numeric;
  v_available numeric;
  v_new_available numeric;

  v_unit_cost numeric;
  v_total_quantity numeric := 0;
begin

  -- ==========================================================
  -- VALIDACIONES GENERALES
  -- ==========================================================

  v_dispatch_date :=
    coalesce(
      p_dispatch_date,
      current_date
    );

  if nullif(trim(p_reason), '') is null then
    raise exception
      'Debes indicar el motivo de la salida.';
  end if;

  if nullif(trim(p_dispatched_by), '') is null then
    raise exception
      'No se pudo identificar al responsable de la salida.';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0
  then
    raise exception
      'Debes agregar al menos un producto a la salida.';
  end if;


  -- ==========================================================
  -- CONSECUTIVO SAL-26001
  -- ==========================================================

  v_year :=
    mod(
      extract(
        year from v_dispatch_date
      )::integer,
      100
    );

  insert into public.document_sequences (
    document_type,
    year,
    current_number,
    updated_at
  )
  values (
    'SAL',
    v_year,
    1,
    now()
  )
  on conflict (
    document_type,
    year
  )
  do update
  set
    current_number =
      public.document_sequences.current_number + 1,
    updated_at =
      now()
  returning
    current_number
  into
    v_next_number;

  v_dispatch_number :=
    'SAL-' ||
    lpad(
      v_year::text,
      2,
      '0'
    ) ||
    lpad(
      v_next_number::text,
      3,
      '0'
    );


  -- ==========================================================
  -- CABECERA
  -- ==========================================================

  insert into public.inventory_dispatches (
    dispatch_number,
    dispatch_date,
    reason,
    destination,
    reference,
    observations,
    dispatched_by,
    total_quantity
  )
  values (
    v_dispatch_number,
    v_dispatch_date,
    trim(p_reason),
    nullif(trim(p_destination), ''),
    nullif(trim(p_reference), ''),
    nullif(trim(p_observations), ''),
    trim(p_dispatched_by),
    0
  )
  returning id
  into v_dispatch_id;


  -- ==========================================================
  -- PRODUCTOS
  -- ==========================================================

  for v_item in
    select value
    from jsonb_array_elements(
      p_items
    )
  loop

    v_balance_id :=
      nullif(
        v_item ->> 'balance_id',
        ''
      )::uuid;

    v_quantity :=
      nullif(
        v_item ->> 'quantity',
        ''
      )::numeric;

    if v_balance_id is null then
      raise exception
        'Uno de los productos no tiene una existencia válida.';
    end if;

    if v_quantity is null
       or v_quantity <= 0
    then
      raise exception
        'Todas las cantidades de salida deben ser mayores a cero.';
    end if;


    -- ========================================================
    -- BLOQUEO DEL SALDO
    -- ========================================================

    select
      ib.id,
      ib.item_id,
      ib.warehouse_id,
      ib.lot_id,
      coalesce(
        ib.quantity_total,
        0
      ) as quantity_total,
      coalesce(
        ib.quantity_reserved,
        0
      ) as quantity_reserved,
      coalesce(
        ib.quantity_available,
        0
      ) as quantity_available,
      coalesce(
        ib.unit_cost,
        0
      ) as unit_cost
    into
      v_balance
    from public.inventory_balances ib
    where ib.id =
      v_balance_id
    for update;

    if not found then
      raise exception
        'La existencia seleccionada ya no existe.';
    end if;

    if v_balance.lot_id is null then
      raise exception
        'La existencia seleccionada no tiene lote interno CLAP.';
    end if;

    v_previous_balance :=
      v_balance.quantity_total;

    v_reserved :=
      v_balance.quantity_reserved;

    v_available :=
      v_balance.quantity_available;

    v_unit_cost :=
      v_balance.unit_cost;

    if v_quantity >
       v_available
    then
      raise exception
        'No hay cantidad disponible suficiente. Disponible: %',
        v_available;
    end if;

    v_new_balance :=
      v_previous_balance -
      v_quantity;

    v_new_available :=
      v_new_balance -
      v_reserved;

    if v_new_balance < 0
       or v_new_available < 0
    then
      raise exception
        'La salida dejaría el inventario en negativo.';
    end if;


    -- ========================================================
    -- DETALLE SALIDA
    -- ========================================================

    insert into public.inventory_dispatch_items (
      dispatch_id,
      item_id,
      warehouse_id,
      lot_id,
      quantity,
      unit_cost,
      total_cost
    )
    values (
      v_dispatch_id,
      v_balance.item_id,
      v_balance.warehouse_id,
      v_balance.lot_id,
      v_quantity,
      v_unit_cost,
      v_quantity *
        v_unit_cost
    );


    -- ========================================================
    -- ACTUALIZAR EXISTENCIAS
    -- ========================================================

    update public.inventory_balances
    set
      quantity_total =
        v_new_balance,

      quantity_available =
        v_new_available,

      updated_at =
        now()
    where id =
      v_balance_id;


    -- ========================================================
    -- KARDEX
    -- ========================================================

    insert into public.inventory_movements (
      movement_date,
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
      created_by,
      created_at
    )
    values (
      now(),
      'Salida de almacén',

      v_balance.item_id,
      v_balance.warehouse_id,
      v_balance.lot_id,

      -v_quantity,

      v_previous_balance,
      v_new_balance,

      'Salida',
      v_dispatch_id,
      v_dispatch_number,

      trim(
        concat_ws(
          ' · ',
          nullif(
            trim(p_reason),
            ''
          ),
          nullif(
            trim(p_destination),
            ''
          ),
          nullif(
            trim(p_reference),
            ''
          )
        )
      ),

      trim(
        p_dispatched_by
      ),

      now()
    );

    v_total_quantity :=
      v_total_quantity +
      v_quantity;

  end loop;


  -- ==========================================================
  -- TOTAL CABECERA
  -- ==========================================================

  update public.inventory_dispatches
  set
    total_quantity =
      v_total_quantity
  where id =
    v_dispatch_id;


  return jsonb_build_object(
    'dispatch_id',
    v_dispatch_id,

    'dispatch_number',
    v_dispatch_number,

    'total_quantity',
    v_total_quantity
  );

end;
$$;


revoke all
on function public.register_inventory_dispatch(
  date,
  text,
  text,
  text,
  text,
  text,
  jsonb
)
from public;

grant execute
on function public.register_inventory_dispatch(
  date,
  text,
  text,
  text,
  text,
  text,
  jsonb
)
to service_role;
