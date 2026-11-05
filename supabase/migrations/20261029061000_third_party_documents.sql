create table if not exists public.third_party_documents (
  id uuid primary key default gen_random_uuid(),

  third_party_id uuid not null
    references public.third_parties(id)
    on delete cascade,

  document_type text not null
    check (
      document_type in (
        'RUT',
        'CAMARA_COMERCIO',
        'CONOCIMIENTO_CLIENTE',
        'CONOCIMIENTO_PROVEEDOR'
      )
    ),

  file_name text not null,
  file_url text not null,
  storage_path text,

  mime_type text not null default 'application/pdf',

  source_request_id uuid
    references public.third_party_requests(id)
    on delete set null,

  version integer not null default 1,
  is_current boolean not null default true,
  status text not null default 'Activo',

  uploaded_by text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists
  third_party_documents_third_party_id_idx
on public.third_party_documents(third_party_id);

create unique index if not exists
  third_party_documents_current_unique_idx
on public.third_party_documents(
  third_party_id,
  document_type
)
where is_current = true;

-- =========================================================
-- MIGRAR DOCUMENTOS EXISTENTES DESDE LAS SOLICITUDES
-- Se toma el documento más reciente por tercero y tipo.
-- =========================================================

with existing_documents as (

  select
    id as request_id,
    created_third_party_id as third_party_id,
    'RUT'::text as document_type,
    rut_file_name as file_name,
    rut_file_url as file_url,
    coalesce(updated_at, created_at) as document_date
  from public.third_party_requests
  where created_third_party_id is not null
    and rut_file_url is not null

  union all

  select
    id,
    created_third_party_id,
    'CAMARA_COMERCIO',
    chamber_commerce_file_name,
    chamber_commerce_file_url,
    coalesce(updated_at, created_at)
  from public.third_party_requests
  where created_third_party_id is not null
    and chamber_commerce_file_url is not null

  union all

  select
    id,
    created_third_party_id,
    'CONOCIMIENTO_CLIENTE',
    customer_knowledge_file_name,
    customer_knowledge_file_url,
    coalesce(updated_at, created_at)
  from public.third_party_requests
  where created_third_party_id is not null
    and customer_knowledge_file_url is not null

  union all

  select
    id,
    created_third_party_id,
    'CONOCIMIENTO_PROVEEDOR',
    supplier_knowledge_file_name,
    supplier_knowledge_file_url,
    coalesce(updated_at, created_at)
  from public.third_party_requests
  where created_third_party_id is not null
    and supplier_knowledge_file_url is not null
),

ranked_documents as (
  select
    *,
    row_number() over (
      partition by third_party_id, document_type
      order by document_date desc nulls last
    ) as rn
  from existing_documents
)

insert into public.third_party_documents (
  third_party_id,
  document_type,
  file_name,
  file_url,
  source_request_id,
  version,
  is_current,
  status
)
select
  third_party_id,
  document_type,
  coalesce(
    nullif(file_name, ''),
    document_type || '.pdf'
  ),
  file_url,
  request_id,
  1,
  true,
  'Activo'
from ranked_documents rd
where rd.rn = 1
  and not exists (
    select 1
    from public.third_party_documents tpd
    where tpd.third_party_id = rd.third_party_id
      and tpd.document_type = rd.document_type
      and tpd.is_current = true
  );

alter table public.third_party_documents
  enable row level security;

revoke all
on public.third_party_documents
from anon, authenticated;
