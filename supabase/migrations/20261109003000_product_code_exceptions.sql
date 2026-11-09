-- ============================================================================
-- Sistema CLAP · Excepciones formales de codificación
-- Fase 2E · 2026-11-09
--
-- Objetivo:
--   Registrar productos que deliberadamente quedan fuera de la codificación
--   canónica CLAP, sin modificar el producto original ni SIIGO.
--
-- Tipos:
--   LEGACY_NO_RECODIFICAR
--   TECNICA_SIIGO
--   DUPLICADO_HISTORICO
--
-- El campo canonical_product_id permite documentar el producto vigente al que
-- corresponde un duplicado histórico, SIN fusionar ni alterar registros.
-- ============================================================================

begin;

create table if not exists public.product_code_exceptions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null
    references public.products(id)
    on delete cascade,

  exception_type text not null,
  reason text not null,

  canonical_product_id uuid null
    references public.products(id)
    on delete restrict,

  exclude_from_canonical_audit boolean not null default true,

  status text not null default 'Activo',
  source text null,
  created_by text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint product_code_exceptions_type_check
    check (
      exception_type in (
        'LEGACY_NO_RECODIFICAR',
        'TECNICA_SIIGO',
        'DUPLICADO_HISTORICO'
      )
    ),

  constraint product_code_exceptions_status_check
    check (status in ('Activo', 'Inactivo')),

  constraint product_code_exceptions_not_self_reference
    check (
      canonical_product_id is null
      or canonical_product_id <> product_id
    )
);

create unique index if not exists
  product_code_exceptions_product_unique_idx
on public.product_code_exceptions(product_id);

create index if not exists
  product_code_exceptions_type_status_idx
on public.product_code_exceptions(exception_type, status);

create index if not exists
  product_code_exceptions_canonical_product_idx
on public.product_code_exceptions(canonical_product_id)
where canonical_product_id is not null;

alter table public.product_code_exceptions
  enable row level security;

-- Solo service_role administra este registro desde scripts/migraciones.
revoke all on table public.product_code_exceptions
from public, anon, authenticated;

grant select, insert, update, delete
on table public.product_code_exceptions
to service_role;

create or replace function public.apply_product_code_exceptions(
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item jsonb;
  v_product_id uuid;
  v_product_code text;
  v_exception_type text;
  v_reason text;
  v_canonical_product_id uuid;
  v_canonical_product_code text;
  v_source text;
  v_count integer := 0;
begin
  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
  then
    raise exception 'p_items debe ser un arreglo JSON.';
  end if;

  if jsonb_array_length(p_items) <> 6 then
    raise exception
      'Fase 2E exige exactamente 6 excepciones; se recibieron %.',
      jsonb_array_length(p_items);
  end if;

  -- Validar TODO antes de insertar.
  for v_item in
    select value
    from jsonb_array_elements(p_items)
  loop
    v_product_id :=
      nullif(v_item->>'product_id', '')::uuid;

    v_product_code :=
      nullif(btrim(v_item->>'product_code'), '');

    v_exception_type :=
      nullif(btrim(v_item->>'exception_type'), '');

    v_reason :=
      nullif(btrim(v_item->>'reason'), '');

    v_canonical_product_id :=
      nullif(v_item->>'canonical_product_id', '')::uuid;

    v_canonical_product_code :=
      nullif(btrim(v_item->>'canonical_product_code'), '');

    v_source :=
      nullif(btrim(v_item->>'source'), '');

    if v_product_id is null
       or v_product_code is null
       or v_exception_type is null
       or v_reason is null
    then
      raise exception
        'Elemento incompleto: %',
        v_item;
    end if;

    if v_exception_type not in (
      'LEGACY_NO_RECODIFICAR',
      'TECNICA_SIIGO',
      'DUPLICADO_HISTORICO'
    ) then
      raise exception
        'Tipo de excepción inválido: %',
        v_exception_type;
    end if;

    if not exists (
      select 1
      from public.products p
      where p.id = v_product_id
        and upper(btrim(coalesce(p.final_code, '')))
          = upper(v_product_code)
    ) then
      raise exception
        'Producto % ya no coincide con el código esperado %.',
        v_product_id,
        v_product_code;
    end if;

    if v_exception_type = 'DUPLICADO_HISTORICO' then
      if v_canonical_product_id is null
         or v_canonical_product_code is null
      then
        raise exception
          'DUPLICADO_HISTORICO requiere producto canónico.';
      end if;

      if v_canonical_product_id = v_product_id then
        raise exception
          'Un duplicado histórico no puede apuntarse a sí mismo.';
      end if;

      if not exists (
        select 1
        from public.products p
        where p.id = v_canonical_product_id
          and upper(btrim(coalesce(p.final_code, '')))
            = upper(v_canonical_product_code)
      ) then
        raise exception
          'Producto canónico % ya no coincide con %.',
          v_canonical_product_id,
          v_canonical_product_code;
      end if;
    else
      if v_canonical_product_id is not null
         or v_canonical_product_code is not null
      then
        raise exception
          'Solo DUPLICADO_HISTORICO puede tener producto canónico.';
      end if;
    end if;
  end loop;

  -- No permitir productos repetidos en el payload.
  if exists (
    select 1
    from (
      select value->>'product_id' as product_id, count(*) qty
      from jsonb_array_elements(p_items)
      group by value->>'product_id'
      having count(*) > 1
    ) d
  ) then
    raise exception
      'El payload contiene product_id repetidos.';
  end if;

  -- Aplicar las 6 excepciones.
  for v_item in
    select value
    from jsonb_array_elements(p_items)
  loop
    v_product_id :=
      (v_item->>'product_id')::uuid;

    v_exception_type :=
      btrim(v_item->>'exception_type');

    v_reason :=
      btrim(v_item->>'reason');

    v_canonical_product_id :=
      nullif(v_item->>'canonical_product_id', '')::uuid;

    v_source :=
      nullif(btrim(v_item->>'source'), '');

    insert into public.product_code_exceptions (
      product_id,
      exception_type,
      reason,
      canonical_product_id,
      exclude_from_canonical_audit,
      status,
      source,
      created_by,
      updated_at
    )
    values (
      v_product_id,
      v_exception_type,
      v_reason,
      v_canonical_product_id,
      true,
      'Activo',
      v_source,
      'Sistema CLAP',
      now()
    )
    on conflict (product_id)
    do update set
      exception_type = excluded.exception_type,
      reason = excluded.reason,
      canonical_product_id = excluded.canonical_product_id,
      exclude_from_canonical_audit = true,
      status = 'Activo',
      source = excluded.source,
      created_by = excluded.created_by,
      updated_at = now();

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'registered_exceptions', v_count,
    'status', 'OK'
  );
end;
$$;

revoke all
on function public.apply_product_code_exceptions(jsonb)
from public, anon, authenticated;

grant execute
on function public.apply_product_code_exceptions(jsonb)
to service_role;

commit;
