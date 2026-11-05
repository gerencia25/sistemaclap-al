
-- ============================================================
-- CLAP · ALMACENES E INVENTARIOS
-- TRASLADOS + AJUSTES
-- ============================================================


-- ============================================================
-- TRASLADOS
-- ============================================================

create table if not exists public.inventory_transfers (
  id uuid primary key default gen_random_uuid(),

  transfer_number text not null unique,
  transfer_date date not null default current_date,

  source_warehouse_id uuid not null
    references public.warehouses(id),

  destination_warehouse_id uuid not null
    references public.warehouses(id),

  reference text,
  observations text,

  transferred_by text not null,

  total_quantity numeric not null default 0,

  created_at timestamptz not null default now(),

  check (
    source_warehouse_id <>
    destination_warehouse_id
  )
);

create table if not exists public.inventory_transfer_items (
  id uuid primary key default gen_random_uuid(),

  transfer_id uuid not null
    references public.inventory_transfers(id)
    on delete cascade,

  item_id uuid not null
    references public.products(id),

  lot_id uuid not null
    references public.inventory_lots(id),

  quantity numeric not null
    check (quantity > 0),

  unit_cost numeric not null default 0,

  created_at timestamptz not null default now()
);

create index if not exists
  inventory_transfer_items_transfer_idx
on public.inventory_transfer_items (
  transfer_id
);

create index if not exists
  inventory_transfer_items_item_idx
on public.inventory_transfer_items (
  item_id
);

create index if not exists
  inventory_transfer_items_lot_idx
on public.inventory_transfer_items (
  lot_id
);

alter table public.inventory_transfers
  enable row level security;

alter table public.inventory_transfer_items
  enable row level security;



-- ============================================================
-- AJUSTES
-- ============================================================

create table if not exists public.inventory_adjustments (
  id uuid primary key default gen_random_uuid(),

  adjustment_number text not null unique,
  adjustment_date date not null default current_date,

  reason text not null,
  reference text,
  observations text,

  adjusted_by text not null,

  created_at timestamptz not null default now()
);

create table if not exists public.inventory_adjustment_items (
  id uuid primary key default gen_random_uuid(),

  adjustment_id uuid not null
    references public.inventory_adjustments(id)
    on delete cascade,

  item_id uuid not null
    references public.products(id),

  warehouse_id uuid not null
    references public.warehouses(id),

  lot_id uuid not null
    references public.inventory_lots(id),

  quantity_adjustment numeric not null
    check (quantity_adjustment <> 0),

  previous_balance numeric not null,
  new_balance numeric not null,

  unit_cost numeric not null default 0,

  created_at timestamptz not null default now()
);

create index if not exists
  inventory_adjustment_items_adjustment_idx
on public.inventory_adjustment_items (
  adjustment_id
);

create index if not exists
  inventory_adjustment_items_item_idx
on public.inventory_adjustment_items (
  item_id
);

alter table public.inventory_adjustments
  enable row level security;

alter table public.inventory_adjustment_items
  enable row level security;



-- ============================================================
-- RPC · REGISTRAR TRASLADO
-- ============================================================

create or replace function public.register_inventory_transfer(
  p_transfer_date date,
  p_destination_warehouse_id uuid,
  p_reference text,
  p_observations text,
  p_transferred_by text,
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

  v_transfer_id uuid;
  v_transfer_number text;

  v_transfer_date date;

  v_item jsonb;
  v_balance_id uuid;
  v_quantity numeric;

  v_source record;
  v_destination record;

  v_source_warehouse_id uuid;

  v_source_previous numeric;
  v_source_new numeric;
  v_source_available numeric;
  v_source_available_new numeric;

  v_destination_previous numeric;
  v_destination_new numeric;
  v_destination_available numeric;
  v_destination_available_new numeric;

  v_total_quantity numeric := 0;
begin

  v_transfer_date :=
    coalesce(
      p_transfer_date,
      current_date
    );

  if p_destination_warehouse_id is null then
    raise exception
      'Debes seleccionar el almacén destino.';
  end if;

  perform 1
  from public.warehouses w
  where w.id =
    p_destination_warehouse_id
    and w.status =
      'Activo';

  if not found then
    raise exception
      'El almacén destino no existe o está inactivo.';
  end if;

  if nullif(
    trim(p_transferred_by),
    ''
  ) is null then
    raise exception
      'No se pudo identificar al responsable del traslado.';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0
  then
    raise exception
      'Debes agregar al menos un producto al traslado.';
  end if;


  -- ==========================================================
  -- CONSECUTIVO TRA-26001
  -- ==========================================================

  v_year :=
    mod(
      extract(
        year from v_transfer_date
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
    'TRA',
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
  returning current_number
  into v_next_number;

  v_transfer_number :=
    'TRA-' ||
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
  -- VALIDAR PRIMER ORIGEN ANTES DE CREAR CABECERA
  -- ==========================================================

  v_item :=
    p_items -> 0;

  v_balance_id :=
    nullif(
      v_item ->> 'balance_id',
      ''
    )::uuid;

  select
    ib.warehouse_id
  into
    v_source_warehouse_id
  from public.inventory_balances ib
  where ib.id =
    v_balance_id;

  if v_source_warehouse_id is null then
    raise exception
      'No se pudo determinar el almacén origen.';
  end if;

  if v_source_warehouse_id =
     p_destination_warehouse_id
  then
    raise exception
      'El almacén origen y destino no pueden ser el mismo.';
  end if;


  -- ==========================================================
  -- CABECERA
  -- ==========================================================

  insert into public.inventory_transfers (
    transfer_number,
    transfer_date,
    source_warehouse_id,
    destination_warehouse_id,
    reference,
    observations,
    transferred_by,
    total_quantity
  )
  values (
    v_transfer_number,
    v_transfer_date,
    v_source_warehouse_id,
    p_destination_warehouse_id,
    nullif(
      trim(p_reference),
      ''
    ),
    nullif(
      trim(p_observations),
      ''
    ),
    trim(
      p_transferred_by
    ),
    0
  )
  returning id
  into v_transfer_id;


  -- ==========================================================
  -- ITEMS
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
        'Todas las cantidades trasladadas deben ser mayores a cero.';
    end if;


    -- ========================================================
    -- BLOQUEAR ORIGEN
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
      v_source
    from public.inventory_balances ib
    where ib.id =
      v_balance_id
    for update;

    if not found then
      raise exception
        'Una de las existencias seleccionadas ya no existe.';
    end if;

    if v_source.warehouse_id <>
       v_source_warehouse_id
    then
      raise exception
        'Todos los productos del traslado deben salir del mismo almacén.';
    end if;

    if v_source.lot_id is null then
      raise exception
        'La existencia seleccionada no tiene lote interno CLAP.';
    end if;

    if v_quantity >
       v_source.quantity_available
    then
      raise exception
        'No hay cantidad disponible suficiente para trasladar. Disponible: %',
        v_source.quantity_available;
    end if;


    v_source_previous :=
      v_source.quantity_total;

    v_source_available :=
      v_source.quantity_available;

    v_source_new :=
      v_source_previous -
      v_quantity;

    v_source_available_new :=
      v_source_available -
      v_quantity;

    if v_source_new < 0
       or v_source_available_new < 0
    then
      raise exception
        'El traslado dejaría el inventario origen en negativo.';
    end if;


    -- ========================================================
    -- BLOQUEAR / LEER DESTINO
    -- ========================================================

    select
      ib.id,
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
      v_destination
    from public.inventory_balances ib
    where ib.item_id =
      v_source.item_id
      and ib.warehouse_id =
        p_destination_warehouse_id
      and ib.lot_id =
        v_source.lot_id
    for update;

    if found then
      v_destination_previous :=
        v_destination.quantity_total;

      v_destination_available :=
        v_destination.quantity_available;

      v_destination_new :=
        v_destination_previous +
        v_quantity;

      v_destination_available_new :=
        v_destination_available +
        v_quantity;

      update public.inventory_balances
      set
        quantity_total =
          v_destination_new,

        quantity_available =
          v_destination_available_new,

        unit_cost =
          case
            when coalesce(
              unit_cost,
              0
            ) = 0
              then v_source.unit_cost
            else unit_cost
          end,

        updated_at =
          now()
      where id =
        v_destination.id;

    else

      v_destination_previous := 0;
      v_destination_available := 0;
      v_destination_new :=
        v_quantity;
      v_destination_available_new :=
        v_quantity;

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
        v_source.item_id,
        p_destination_warehouse_id,
        v_source.lot_id,
        v_quantity,
        0,
        v_quantity,
        v_source.unit_cost,
        now()
      );

    end if;


    -- ========================================================
    -- DESCONTAR ORIGEN
    -- ========================================================

    update public.inventory_balances
    set
      quantity_total =
        v_source_new,

      quantity_available =
        v_source_available_new,

      updated_at =
        now()
    where id =
      v_source.id;


    -- ========================================================
    -- DETALLE
    -- ========================================================

    insert into public.inventory_transfer_items (
      transfer_id,
      item_id,
      lot_id,
      quantity,
      unit_cost
    )
    values (
      v_transfer_id,
      v_source.item_id,
      v_source.lot_id,
      v_quantity,
      v_source.unit_cost
    );


    -- ========================================================
    -- KARDEX ORIGEN
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
      'Traslado salida',
      v_source.item_id,
      v_source_warehouse_id,
      v_source.lot_id,
      -v_quantity,
      v_source_previous,
      v_source_new,
      'Traslado',
      v_transfer_id,
      v_transfer_number,
      nullif(
        trim(p_observations),
        ''
      ),
      trim(
        p_transferred_by
      ),
      now()
    );


    -- ========================================================
    -- KARDEX DESTINO
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
      'Traslado entrada',
      v_source.item_id,
      p_destination_warehouse_id,
      v_source.lot_id,
      v_quantity,
      v_destination_previous,
      v_destination_new,
      'Traslado',
      v_transfer_id,
      v_transfer_number,
      nullif(
        trim(p_observations),
        ''
      ),
      trim(
        p_transferred_by
      ),
      now()
    );

    v_total_quantity :=
      v_total_quantity +
      v_quantity;

  end loop;


  update public.inventory_transfers
  set
    total_quantity =
      v_total_quantity
  where id =
    v_transfer_id;


  return jsonb_build_object(
    'transfer_id',
    v_transfer_id,
    'transfer_number',
    v_transfer_number,
    'total_quantity',
    v_total_quantity
  );

end;
$$;


revoke all
on function public.register_inventory_transfer(
  date,
  uuid,
  text,
  text,
  text,
  jsonb
)
from public;

grant execute
on function public.register_inventory_transfer(
  date,
  uuid,
  text,
  text,
  text,
  jsonb
)
to service_role;



-- ============================================================
-- RPC · REGISTRAR AJUSTE
-- ============================================================

create or replace function public.register_inventory_adjustment(
  p_adjustment_date date,
  p_reason text,
  p_reference text,
  p_observations text,
  p_adjusted_by text,
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

  v_adjustment_id uuid;
  v_adjustment_number text;

  v_adjustment_date date;

  v_item jsonb;
  v_balance_id uuid;
  v_quantity_adjustment numeric;

  v_balance record;

  v_previous_balance numeric;
  v_previous_available numeric;

  v_new_balance numeric;
  v_new_available numeric;

  v_movement_type text;
begin

  v_adjustment_date :=
    coalesce(
      p_adjustment_date,
      current_date
    );

  if nullif(
    trim(p_reason),
    ''
  ) is null then
    raise exception
      'Debes indicar el motivo del ajuste.';
  end if;

  if nullif(
    trim(p_adjusted_by),
    ''
  ) is null then
    raise exception
      'No se pudo identificar al responsable del ajuste.';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0
  then
    raise exception
      'Debes agregar al menos un producto al ajuste.';
  end if;


  -- ==========================================================
  -- CONSECUTIVO AJU-26001
  -- ==========================================================

  v_year :=
    mod(
      extract(
        year from v_adjustment_date
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
    'AJU',
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
  returning current_number
  into v_next_number;

  v_adjustment_number :=
    'AJU-' ||
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

  insert into public.inventory_adjustments (
    adjustment_number,
    adjustment_date,
    reason,
    reference,
    observations,
    adjusted_by
  )
  values (
    v_adjustment_number,
    v_adjustment_date,
    trim(
      p_reason
    ),
    nullif(
      trim(p_reference),
      ''
    ),
    nullif(
      trim(p_observations),
      ''
    ),
    trim(
      p_adjusted_by
    )
  )
  returning id
  into v_adjustment_id;


  -- ==========================================================
  -- ITEMS
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

    v_quantity_adjustment :=
      nullif(
        v_item ->> 'quantity_adjustment',
        ''
      )::numeric;

    if v_balance_id is null then
      raise exception
        'Uno de los productos no tiene una existencia válida.';
    end if;

    if v_quantity_adjustment is null
       or v_quantity_adjustment = 0
    then
      raise exception
        'La cantidad de ajuste no puede ser cero.';
    end if;


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
        'Una de las existencias seleccionadas ya no existe.';
    end if;

    if v_balance.lot_id is null then
      raise exception
        'La existencia seleccionada no tiene lote interno CLAP.';
    end if;


    v_previous_balance :=
      v_balance.quantity_total;

    v_previous_available :=
      v_balance.quantity_available;


    if v_quantity_adjustment < 0
       and abs(
         v_quantity_adjustment
       ) >
       v_previous_available
    then
      raise exception
        'El ajuste negativo supera la cantidad disponible. Disponible: %',
        v_previous_available;
    end if;


    v_new_balance :=
      v_previous_balance +
      v_quantity_adjustment;

    v_new_available :=
      v_previous_available +
      v_quantity_adjustment;

    if v_new_balance < 0
       or v_new_available < 0
       or v_new_balance <
          v_balance.quantity_reserved
    then
      raise exception
        'El ajuste dejaría el inventario en un estado inválido.';
    end if;


    update public.inventory_balances
    set
      quantity_total =
        v_new_balance,

      quantity_available =
        v_new_available,

      updated_at =
        now()
    where id =
      v_balance.id;


    insert into public.inventory_adjustment_items (
      adjustment_id,
      item_id,
      warehouse_id,
      lot_id,
      quantity_adjustment,
      previous_balance,
      new_balance,
      unit_cost
    )
    values (
      v_adjustment_id,
      v_balance.item_id,
      v_balance.warehouse_id,
      v_balance.lot_id,
      v_quantity_adjustment,
      v_previous_balance,
      v_new_balance,
      v_balance.unit_cost
    );


    v_movement_type :=
      case
        when v_quantity_adjustment > 0
          then 'Ajuste positivo'
        else 'Ajuste negativo'
      end;


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
      v_movement_type,
      v_balance.item_id,
      v_balance.warehouse_id,
      v_balance.lot_id,
      v_quantity_adjustment,
      v_previous_balance,
      v_new_balance,
      'Ajuste',
      v_adjustment_id,
      v_adjustment_number,
      trim(
        concat_ws(
          ' · ',
          nullif(
            trim(p_reason),
            ''
          ),
          nullif(
            trim(p_reference),
            ''
          ),
          nullif(
            trim(p_observations),
            ''
          )
        )
      ),
      trim(
        p_adjusted_by
      ),
      now()
    );

  end loop;


  return jsonb_build_object(
    'adjustment_id',
    v_adjustment_id,
    'adjustment_number',
    v_adjustment_number
  );

end;
$$;


revoke all
on function public.register_inventory_adjustment(
  date,
  text,
  text,
  text,
  text,
  jsonb
)
from public;

grant execute
on function public.register_inventory_adjustment(
  date,
  text,
  text,
  text,
  text,
  jsonb
)
to service_role;
