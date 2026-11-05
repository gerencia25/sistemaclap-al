
-- ============================================================
-- CLAP · ALMACENES E INVENTARIOS
-- HARDENING PARA ENTREGA
-- ============================================================

alter table if exists public.inventory_dispatches
  enable row level security;

alter table if exists public.inventory_dispatch_items
  enable row level security;

alter table if exists public.inventory_transfers
  enable row level security;

alter table if exists public.inventory_transfer_items
  enable row level security;

alter table if exists public.inventory_adjustments
  enable row level security;

alter table if exists public.inventory_adjustment_items
  enable row level security;
