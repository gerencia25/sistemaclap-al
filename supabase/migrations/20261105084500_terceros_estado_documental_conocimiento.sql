-- =========================================================
-- CLAP · Estado documental de conocimiento de terceros
-- =========================================================

-- ---------------------------------------------------------
-- 1. Estados en solicitudes
-- ---------------------------------------------------------

alter table public.third_party_requests
add column if not exists customer_knowledge_status text;

alter table public.third_party_requests
add column if not exists supplier_knowledge_status text;

update public.third_party_requests
set
  customer_knowledge_status =
    case
      when category = 'Cliente'
        then case
          when customer_knowledge_file_url is not null
            then 'Completo'
          else 'Pendiente'
        end
      else 'No aplica'
    end,

  supplier_knowledge_status =
    case
      when category = 'Proveedor'
        then case
          when supplier_knowledge_file_url is not null
            then 'Completo'
          else 'Pendiente'
        end
      else 'No aplica'
    end
where
  customer_knowledge_status is null
  or supplier_knowledge_status is null;

alter table public.third_party_requests
alter column customer_knowledge_status
set default 'No aplica';

alter table public.third_party_requests
alter column supplier_knowledge_status
set default 'No aplica';

alter table public.third_party_requests
alter column customer_knowledge_status
set not null;

alter table public.third_party_requests
alter column supplier_knowledge_status
set not null;

alter table public.third_party_requests
drop constraint if exists
third_party_requests_customer_knowledge_status_check;

alter table public.third_party_requests
add constraint
third_party_requests_customer_knowledge_status_check
check (
  customer_knowledge_status in (
    'Pendiente',
    'Completo',
    'No aplica'
  )
);

alter table public.third_party_requests
drop constraint if exists
third_party_requests_supplier_knowledge_status_check;

alter table public.third_party_requests
add constraint
third_party_requests_supplier_knowledge_status_check
check (
  supplier_knowledge_status in (
    'Pendiente',
    'Completo',
    'No aplica'
  )
);


-- ---------------------------------------------------------
-- 2. Estado persistente en el maestro de terceros
-- ---------------------------------------------------------

alter table public.third_parties
add column if not exists customer_knowledge_status text;

alter table public.third_parties
add column if not exists supplier_knowledge_status text;

update public.third_parties
set
  customer_knowledge_status =
    case
      when is_customer
        then 'Pendiente'
      else 'No aplica'
    end,

  supplier_knowledge_status =
    case
      when is_supplier
        then 'Pendiente'
      else 'No aplica'
    end
where
  customer_knowledge_status is null
  or supplier_knowledge_status is null;


-- Recuperar estados desde solicitudes históricas vinculadas.
with latest_request as (
  select distinct on (created_third_party_id)
    created_third_party_id,
    customer_knowledge_status,
    supplier_knowledge_status
  from public.third_party_requests
  where created_third_party_id is not null
  order by
    created_third_party_id,
    updated_at desc nulls last,
    created_at desc nulls last
)
update public.third_parties tp
set
  customer_knowledge_status =
    case
      when tp.is_customer
        then lr.customer_knowledge_status
      else 'No aplica'
    end,

  supplier_knowledge_status =
    case
      when tp.is_supplier
        then lr.supplier_knowledge_status
      else 'No aplica'
    end
from latest_request lr
where tp.id = lr.created_third_party_id;


alter table public.third_parties
alter column customer_knowledge_status
set default 'No aplica';

alter table public.third_parties
alter column supplier_knowledge_status
set default 'No aplica';

alter table public.third_parties
alter column customer_knowledge_status
set not null;

alter table public.third_parties
alter column supplier_knowledge_status
set not null;

alter table public.third_parties
drop constraint if exists
third_parties_customer_knowledge_status_check;

alter table public.third_parties
add constraint
third_parties_customer_knowledge_status_check
check (
  customer_knowledge_status in (
    'Pendiente',
    'Completo',
    'No aplica'
  )
);

alter table public.third_parties
drop constraint if exists
third_parties_supplier_knowledge_status_check;

alter table public.third_parties
add constraint
third_parties_supplier_knowledge_status_check
check (
  supplier_knowledge_status in (
    'Pendiente',
    'Completo',
    'No aplica'
  )
);


-- ---------------------------------------------------------
-- 3. La solicitud determina automáticamente el estado
-- ---------------------------------------------------------

create or replace function
public.set_third_party_request_knowledge_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.customer_knowledge_status :=
    case
      when new.category = 'Cliente'
        then case
          when new.customer_knowledge_file_url is not null
            then 'Completo'
          else 'Pendiente'
        end
      else 'No aplica'
    end;

  new.supplier_knowledge_status :=
    case
      when new.category = 'Proveedor'
        then case
          when new.supplier_knowledge_file_url is not null
            then 'Completo'
          else 'Pendiente'
        end
      else 'No aplica'
    end;

  return new;
end;
$$;

drop trigger if exists
trg_third_party_request_knowledge_status
on public.third_party_requests;

create trigger
trg_third_party_request_knowledge_status
before insert or update
on public.third_party_requests
for each row
execute function
public.set_third_party_request_knowledge_status();


-- ---------------------------------------------------------
-- 4. Al vincular una solicitud con el tercero,
--    copiar el estado documental al maestro.
-- ---------------------------------------------------------

create or replace function
public.sync_third_party_knowledge_from_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_third_party_id is not null then
    update public.third_parties
    set
      customer_knowledge_status =
        case
          when is_customer
            then new.customer_knowledge_status
          else 'No aplica'
        end,

      supplier_knowledge_status =
        case
          when is_supplier
            then new.supplier_knowledge_status
          else 'No aplica'
        end
    where id = new.created_third_party_id;
  end if;

  return new;
end;
$$;

drop trigger if exists
trg_sync_third_party_knowledge_from_request
on public.third_party_requests;

create trigger
trg_sync_third_party_knowledge_from_request
after insert or update
on public.third_party_requests
for each row
execute function
public.sync_third_party_knowledge_from_request();


-- ---------------------------------------------------------
-- 5. Cuando DF cargue posteriormente un documento,
--    actualizar automáticamente el estado.
-- ---------------------------------------------------------

create or replace function
public.refresh_third_party_knowledge_status(
  p_third_party_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_customer boolean;
  v_is_supplier boolean;
  v_customer_current text;
  v_supplier_current text;
begin
  select
    is_customer,
    is_supplier,
    customer_knowledge_status,
    supplier_knowledge_status
  into
    v_is_customer,
    v_is_supplier,
    v_customer_current,
    v_supplier_current
  from public.third_parties
  where id = p_third_party_id;

  if not found then
    return;
  end if;

  update public.third_parties
  set
    customer_knowledge_status =
      case
        when not v_is_customer then
          'No aplica'

        when exists (
          select 1
          from public.third_party_documents d
          where
            d.third_party_id = p_third_party_id
            and d.document_type = 'CONOCIMIENTO_CLIENTE'
            and d.is_current = true
        ) then
          'Completo'

        when v_customer_current = 'No aplica' then
          'No aplica'

        else
          'Pendiente'
      end,

    supplier_knowledge_status =
      case
        when not v_is_supplier then
          'No aplica'

        when exists (
          select 1
          from public.third_party_documents d
          where
            d.third_party_id = p_third_party_id
            and d.document_type = 'CONOCIMIENTO_PROVEEDOR'
            and d.is_current = true
        ) then
          'Completo'

        when v_supplier_current = 'No aplica' then
          'No aplica'

        else
          'Pendiente'
      end
  where id = p_third_party_id;
end;
$$;


create or replace function
public.trg_refresh_third_party_knowledge_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_third_party_knowledge_status(
      old.third_party_id
    );

    return old;
  end if;

  perform public.refresh_third_party_knowledge_status(
    new.third_party_id
  );

  if
    tg_op = 'UPDATE'
    and old.third_party_id is distinct from new.third_party_id
  then
    perform public.refresh_third_party_knowledge_status(
      old.third_party_id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists
trg_refresh_third_party_knowledge_status
on public.third_party_documents;

create trigger
trg_refresh_third_party_knowledge_status
after insert or update or delete
on public.third_party_documents
for each row
execute function
public.trg_refresh_third_party_knowledge_status();
