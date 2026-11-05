-- =========================================================
-- MAESTRO ÚNICO DE PROVEEDORES
-- supplier_id deja de apuntar a suppliers
-- y pasa a apuntar al maestro oficial third_parties.
-- =========================================================

alter table public.purchase_orders
  drop constraint if exists purchase_orders_supplier_id_fkey;

alter table public.purchase_orders
  add constraint purchase_orders_supplier_id_fkey
  foreign key (supplier_id)
  references public.third_parties(id)
  on delete restrict;


alter table public.purchase_receipts
  drop constraint if exists purchase_receipts_supplier_id_fkey;

alter table public.purchase_receipts
  add constraint purchase_receipts_supplier_id_fkey
  foreign key (supplier_id)
  references public.third_parties(id)
  on delete restrict;


alter table public.accounts_payable
  drop constraint if exists accounts_payable_supplier_id_fkey;

alter table public.accounts_payable
  add constraint accounts_payable_supplier_id_fkey
  foreign key (supplier_id)
  references public.third_parties(id)
  on delete restrict;

comment on column public.purchase_orders.supplier_id
  is 'Proveedor del maestro oficial public.third_parties. Debe tener is_supplier = true.';

comment on column public.purchase_receipts.supplier_id
  is 'Proveedor del maestro oficial public.third_parties. Debe tener is_supplier = true.';

comment on column public.accounts_payable.supplier_id
  is 'Proveedor del maestro oficial public.third_parties. Debe tener is_supplier = true.';
