-- =========================================================
-- CLAP · Terceros
-- Sincroniza adjuntos de la solicitud con el expediente
-- documental oficial del tercero.
-- =========================================================


-- =========================================================
-- 1. FUNCIÓN DE SINCRONIZACIÓN
-- =========================================================

create or replace function
public.sync_third_party_request_documents(
  p_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request record;
  v_document record;
  v_next_version integer;
begin

  select *
  into v_request
  from public.third_party_requests
  where id = p_request_id
    and created_third_party_id is not null;

  if not found then
    return;
  end if;


  -- -------------------------------------------------------
  -- Convertir los cuatro posibles adjuntos de la solicitud
  -- en documentos oficiales del tercero.
  -- -------------------------------------------------------

  for v_document in

    select *
    from (
      values
        (
          'RUT'::text,
          v_request.rut_file_name,
          v_request.rut_file_url
        ),
        (
          'CAMARA_COMERCIO'::text,
          v_request.chamber_commerce_file_name,
          v_request.chamber_commerce_file_url
        ),
        (
          'CONOCIMIENTO_CLIENTE'::text,
          v_request.customer_knowledge_file_name,
          v_request.customer_knowledge_file_url
        ),
        (
          'CONOCIMIENTO_PROVEEDOR'::text,
          v_request.supplier_knowledge_file_name,
          v_request.supplier_knowledge_file_url
        )
    ) as documents(
      document_type,
      file_name,
      file_url
    )

    where file_url is not null
      and nullif(trim(file_url), '') is not null

  loop

    -- -----------------------------------------------------
    -- Si ya existe documento vigente de ese tipo,
    -- NO lo sobrescribimos.
    --
    -- Esto protege documentos que DF haya cargado o
    -- reemplazado posteriormente.
    -- -----------------------------------------------------

    if exists (
      select 1
      from public.third_party_documents
      where
        third_party_id =
          v_request.created_third_party_id
        and document_type =
          v_document.document_type
        and is_current = true
    ) then
      continue;
    end if;


    select
      coalesce(max(version), 0) + 1
    into v_next_version
    from public.third_party_documents
    where
      third_party_id =
        v_request.created_third_party_id
      and document_type =
        v_document.document_type;


    insert into public.third_party_documents (
      third_party_id,
      document_type,
      file_name,
      file_url,
      storage_path,
      mime_type,
      source_request_id,
      version,
      is_current,
      status,
      uploaded_by,
      created_at,
      updated_at
    )
    values (
      v_request.created_third_party_id,
      v_document.document_type,

      coalesce(
        nullif(trim(v_document.file_name), ''),
        v_document.document_type || '.pdf'
      ),

      v_document.file_url,

      null,

      'application/pdf',

      v_request.id,

      v_next_version,

      true,

      'Activo',

      nullif(
        trim(v_request.requester_email),
        ''
      ),

      now(),

      now()
    )
    on conflict do nothing;

  end loop;

end;
$$;


revoke all on function
public.sync_third_party_request_documents(uuid)
from public, anon, authenticated;

grant execute on function
public.sync_third_party_request_documents(uuid)
to service_role;


-- =========================================================
-- 2. TRIGGER
--
-- Cuando una solicitud queda vinculada a un tercero,
-- sincroniza automáticamente sus documentos.
--
-- También vuelve a revisar si posteriormente se agrega
-- algún adjunto a la solicitud.
-- =========================================================

create or replace function
public.trg_sync_third_party_request_documents()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

  if new.created_third_party_id is null then
    return new;
  end if;


  if tg_op = 'INSERT' then

    perform
      public.sync_third_party_request_documents(
        new.id
      );

  elsif
    old.created_third_party_id
      is distinct from
      new.created_third_party_id

    or old.rut_file_url
      is distinct from
      new.rut_file_url

    or old.chamber_commerce_file_url
      is distinct from
      new.chamber_commerce_file_url

    or old.customer_knowledge_file_url
      is distinct from
      new.customer_knowledge_file_url

    or old.supplier_knowledge_file_url
      is distinct from
      new.supplier_knowledge_file_url

  then

    perform
      public.sync_third_party_request_documents(
        new.id
      );

  end if;


  return new;

end;
$$;


drop trigger if exists
trg_sync_third_party_request_documents
on public.third_party_requests;


create trigger
trg_sync_third_party_request_documents
after insert or update
on public.third_party_requests
for each row
execute function
public.trg_sync_third_party_request_documents();


-- =========================================================
-- 3. REPARACIÓN RETROACTIVA
--
-- Esto arregla ST-000002 y cualquier otra solicitud
-- histórica vinculada después de la migración inicial.
-- =========================================================

do $$
declare
  v_request record;
begin

  for v_request in
    select id
    from public.third_party_requests
    where created_third_party_id is not null
  loop

    perform
      public.sync_third_party_request_documents(
        v_request.id
      );

  end loop;

end;
$$;
