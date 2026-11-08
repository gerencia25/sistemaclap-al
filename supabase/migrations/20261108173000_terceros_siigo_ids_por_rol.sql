alter table public.third_parties
  add column if not exists siigo_customer_id text,
  add column if not exists siigo_supplier_id text;

comment on column public.third_parties.siigo_customer_id is
  'Identificador del tercero en SIIGO cuando actúa como Customer.';

comment on column public.third_parties.siigo_supplier_id is
  'Identificador del tercero en SIIGO cuando actúa como Supplier.';

-- El campo histórico siigo_third_party_id se conserva
-- temporalmente por compatibilidad.

-- Registros exclusivamente proveedores:
update public.third_parties
set siigo_supplier_id = siigo_third_party_id
where siigo_third_party_id is not null
  and is_supplier = true
  and is_customer = false
  and siigo_supplier_id is null;

-- Registros exclusivamente clientes:
update public.third_parties
set siigo_customer_id = siigo_third_party_id
where siigo_third_party_id is not null
  and is_customer = true
  and is_supplier = false
  and siigo_customer_id is null;

create unique index if not exists
  third_parties_siigo_customer_id_uidx
on public.third_parties (siigo_customer_id)
where siigo_customer_id is not null
  and btrim(siigo_customer_id) <> '';

create unique index if not exists
  third_parties_siigo_supplier_id_uidx
on public.third_parties (siigo_supplier_id)
where siigo_supplier_id is not null
  and btrim(siigo_supplier_id) <> '';
