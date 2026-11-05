-- =========================================================
-- CLAP · CODIFICACIÓN
-- Comportamiento operativo por categoría de producto
-- =========================================================

alter table public.item_categories
  add column if not exists can_be_sold boolean not null default false,
  add column if not exists can_be_purchased boolean not null default false,
  add column if not exists can_be_manufactured boolean not null default false,
  add column if not exists tracks_inventory boolean not null default false,
  add column if not exists tracks_lots boolean not null default false,
  add column if not exists tracks_serials boolean not null default false;

-- Producto terminado fabricado
update public.item_categories
set
  can_be_sold = true,
  can_be_purchased = false,
  can_be_manufactured = true,
  tracks_inventory = true
where upper(code) = 'PTF';

-- Producto terminado comercializado
update public.item_categories
set
  can_be_sold = true,
  can_be_purchased = true,
  can_be_manufactured = false,
  tracks_inventory = true
where upper(code) = 'PTC';

-- Materias primas
update public.item_categories
set
  can_be_sold = false,
  can_be_purchased = true,
  can_be_manufactured = false,
  tracks_inventory = true
where upper(code) in ('MPP', 'MPC');

-- Insumos
update public.item_categories
set
  can_be_sold = false,
  can_be_purchased = true,
  can_be_manufactured = false,
  tracks_inventory = true
where upper(code) = 'INS';

comment on column public.item_categories.can_be_sold
  is 'Indica si los productos de esta categoría son vendibles por defecto.';

comment on column public.item_categories.can_be_purchased
  is 'Indica si los productos de esta categoría pueden comprarse por defecto.';

comment on column public.item_categories.can_be_manufactured
  is 'Indica si los productos de esta categoría pueden fabricarse por defecto.';

comment on column public.item_categories.tracks_inventory
  is 'Indica si los productos de esta categoría controlan existencias por defecto.';

comment on column public.item_categories.tracks_lots
  is 'Indica si los productos de esta categoría controlan lotes por defecto.';

comment on column public.item_categories.tracks_serials
  is 'Indica si los productos de esta categoría controlan seriales por defecto.';
