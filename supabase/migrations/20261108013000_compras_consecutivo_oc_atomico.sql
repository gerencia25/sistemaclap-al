-- =========================================================
-- CLAP · Compras
-- Consecutivo atómico de órdenes de compra
-- OC-26001, OC-26002...
-- =========================================================

create or replace function
public.next_purchase_order_number(
  p_order_date date
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year integer;
  v_next_number integer;
  v_number text;
begin

  if p_order_date is null then
    raise exception
      'La fecha de la orden es obligatoria.';
  end if;

  v_year :=
    mod(
      extract(year from p_order_date)::integer,
      100
    );

  insert into public.document_sequences (
    document_type,
    year,
    current_number,
    updated_at
  )
  values (
    'OC',
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

  v_number :=
    'OC-' ||
    lpad(v_year::text, 2, '0') ||
    lpad(v_next_number::text, 3, '0');

  return v_number;

end;
$$;

revoke all on function
public.next_purchase_order_number(date)
from public, anon;

grant execute on function
public.next_purchase_order_number(date)
to authenticated;
