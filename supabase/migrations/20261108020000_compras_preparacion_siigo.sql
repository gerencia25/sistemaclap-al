-- =========================================================
-- CLAP · COMPRAS
-- Preparación de compra + integración SIIGO
-- =========================================================

alter table public.purchase_orders
add column if not exists clap_request_number text;

alter table public.purchase_orders
add column if not exists siigo_order_number text;

alter table public.purchase_orders
add column if not exists siigo_document_id text;

alter table public.purchase_orders
add column if not exists siigo_sync_status text
  not null default 'Pendiente';

alter table public.purchase_orders
add column if not exists siigo_sync_error text;

alter table public.purchase_orders
add column if not exists siigo_last_sync_at timestamptz;

alter table public.purchase_orders
add column if not exists siigo_pdf_url text;

alter table public.purchase_orders
add column if not exists siigo_payload jsonb;

alter table public.purchase_orders
add column if not exists source_system text
  not null default 'CLAP';


-- ---------------------------------------------------------
-- Estados válidos
-- ---------------------------------------------------------

alter table public.purchase_orders
drop constraint if exists
purchase_orders_siigo_sync_status_check;

alter table public.purchase_orders
add constraint
purchase_orders_siigo_sync_status_check
check (
  siigo_sync_status in (
    'Pendiente',
    'Sincronizada',
    'Error',
    'Importada',
    'No aplica'
  )
);

alter table public.purchase_orders
drop constraint if exists
purchase_orders_source_system_check;

alter table public.purchase_orders
add constraint
purchase_orders_source_system_check
check (
  source_system in (
    'CLAP',
    'SIIGO'
  )
);


-- ---------------------------------------------------------
-- Numerar registros existentes como solicitudes CLAP
-- OC-26001 de prueba pasa conceptualmente a SCMP-26001
-- sin eliminar su número técnico legado.
-- ---------------------------------------------------------

with numbered as (
  select
    id,
    mod(
      extract(year from order_date)::integer,
      100
    ) as yy,
    row_number() over (
      partition by extract(year from order_date)
      order by created_at, id
    ) as rn
  from public.purchase_orders
  where clap_request_number is null
)
update public.purchase_orders po
set clap_request_number =
  'SCMP-' ||
  lpad(numbered.yy::text, 2, '0') ||
  lpad(numbered.rn::text, 3, '0')
from numbered
where po.id = numbered.id;


create unique index if not exists
purchase_orders_clap_request_number_unique
on public.purchase_orders(clap_request_number)
where clap_request_number is not null;


-- ---------------------------------------------------------
-- Sincronizar document_sequences para SCMP
-- ---------------------------------------------------------

insert into public.document_sequences (
  document_type,
  year,
  current_number,
  updated_at
)
select
  'SCMP',
  mod(
    extract(year from order_date)::integer,
    100
  ),
  count(*)::integer,
  now()
from public.purchase_orders
group by
  mod(
    extract(year from order_date)::integer,
    100
  )
on conflict (
  document_type,
  year
)
do update
set
  current_number =
    greatest(
      public.document_sequences.current_number,
      excluded.current_number
    ),
  updated_at = now();


-- ---------------------------------------------------------
-- Consecutivo atómico:
-- SCMP-26001, SCMP-26002...
-- ---------------------------------------------------------

create or replace function
public.next_purchase_request_number(
  p_request_date date
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year integer;
  v_next_number integer;
begin

  if p_request_date is null then
    raise exception
      'La fecha de la solicitud de compra es obligatoria.';
  end if;

  v_year :=
    mod(
      extract(year from p_request_date)::integer,
      100
    );

  insert into public.document_sequences (
    document_type,
    year,
    current_number,
    updated_at
  )
  values (
    'SCMP',
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
    updated_at = now()
  returning current_number
  into v_next_number;

  return
    'SCMP-' ||
    lpad(v_year::text, 2, '0') ||
    lpad(
      v_next_number::text,
      3,
      '0'
    );

end;
$$;

revoke all on function
public.next_purchase_request_number(date)
from public, anon;

grant execute on function
public.next_purchase_request_number(date)
to authenticated;
