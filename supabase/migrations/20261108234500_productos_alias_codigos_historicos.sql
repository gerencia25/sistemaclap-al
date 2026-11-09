-- ============================================================================
-- Sistema CLAP · Productos · Alias / códigos históricos
-- Fecha: 2026-11-08
--
-- OBJETIVO
--   Conservar códigos anteriores cuando un producto adopte un código canónico.
--
-- PRINCIPIOS
--   - Un alias histórico identifica exactamente un producto.
--   - Un mismo alias no puede pertenecer a dos productos.
--   - Los alias NO reemplazan products.final_code.
--   - Esta migración NO cambia ningún producto.
--   - Esta migración NO toca SIIGO.
-- ============================================================================

begin;

create table if not exists public.product_code_aliases (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null
    references public.products(id)
    on delete cascade,

  alias_code text not null,
  alias_type text not null default 'Historico',
  reason text,
  source text,
  status text not null default 'Activo',

  created_at timestamptz not null default now(),
  created_by text,

  constraint product_code_aliases_alias_code_not_blank
    check (nullif(btrim(alias_code), '') is not null),

  constraint product_code_aliases_status_check
    check (status in ('Activo', 'Inactivo'))
);

-- Un código histórico debe resolver a un único producto,
-- ignorando mayúsculas/minúsculas y espacios externos.
create unique index if not exists
  product_code_aliases_alias_code_unique_idx
on public.product_code_aliases (
  upper(btrim(alias_code))
);

create index if not exists
  product_code_aliases_product_id_idx
on public.product_code_aliases (product_id);

create index if not exists
  product_code_aliases_status_idx
on public.product_code_aliases (status);

alter table public.product_code_aliases
  enable row level security;

comment on table public.product_code_aliases is
  'Códigos anteriores o alternos de productos. Permite conservar trazabilidad cuando cambia products.final_code.';

comment on column public.product_code_aliases.alias_code is
  'Código histórico o alterno que anteriormente identificó al producto.';

comment on column public.product_code_aliases.alias_type is
  'Tipo de alias, por ejemplo NORMALIZAR_GUION o CORRECCION_HISTORICA.';

comment on column public.product_code_aliases.reason is
  'Motivo humano del cambio o conservación del código histórico.';

comment on column public.product_code_aliases.source is
  'Origen de la decisión, por ejemplo Matriz SIIGO / adopción CLAP.';

-- Resolución segura de un código: primero código vigente y luego alias activo.
-- Se deja como RPC de lectura para uso futuro por servidor/importadores.
create or replace function public.resolve_product_by_code(
  p_code text
)
returns table (
  product_id uuid,
  matched_code text,
  match_type text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code text;
begin
  v_code := nullif(btrim(coalesce(p_code, '')), '');

  if v_code is null then
    return;
  end if;

  -- 1. Código vigente.
  return query
  select
    p.id,
    p.final_code,
    'CURRENT'::text
  from public.products p
  where upper(btrim(p.final_code)) = upper(v_code)
  limit 1;

  if found then
    return;
  end if;

  -- 2. Código histórico.
  return query
  select
    a.product_id,
    a.alias_code,
    'ALIAS'::text
  from public.product_code_aliases a
  where upper(btrim(a.alias_code)) = upper(v_code)
    and a.status = 'Activo'
  limit 1;
end;
$$;

revoke all
on function public.resolve_product_by_code(text)
from public, anon, authenticated;

grant execute
on function public.resolve_product_by_code(text)
to service_role;

commit;
