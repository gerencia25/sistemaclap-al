create or replace function public.save_third_party_document(
  p_third_party_id uuid,
  p_document_type text,
  p_file_name text,
  p_file_url text,
  p_storage_path text,
  p_uploaded_by text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next_version integer;
  v_document_id uuid;
begin
  if not exists (
    select 1
    from public.third_parties
    where id = p_third_party_id
  ) then
    raise exception 'El tercero no existe.';
  end if;

  if p_document_type not in (
    'RUT',
    'CAMARA_COMERCIO',
    'CONOCIMIENTO_CLIENTE',
    'CONOCIMIENTO_PROVEEDOR'
  ) then
    raise exception 'Tipo de documento no válido.';
  end if;

  if nullif(trim(p_file_name), '') is null then
    raise exception 'El nombre del archivo es obligatorio.';
  end if;

  if lower(p_file_name) not like '%.pdf' then
    raise exception 'Los documentos nuevos deben cargarse únicamente en formato PDF.';
  end if;

  select coalesce(max(version), 0) + 1
  into v_next_version
  from public.third_party_documents
  where third_party_id = p_third_party_id
    and document_type = p_document_type;

  update public.third_party_documents
  set
    is_current = false,
    updated_at = now()
  where third_party_id = p_third_party_id
    and document_type = p_document_type
    and is_current = true;

  insert into public.third_party_documents (
    third_party_id,
    document_type,
    file_name,
    file_url,
    storage_path,
    mime_type,
    version,
    is_current,
    status,
    uploaded_by,
    created_at,
    updated_at
  )
  values (
    p_third_party_id,
    p_document_type,
    trim(p_file_name),
    p_file_url,
    p_storage_path,
    'application/pdf',
    v_next_version,
    true,
    'Activo',
    p_uploaded_by,
    now(),
    now()
  )
  returning id into v_document_id;

  return jsonb_build_object(
    'id', v_document_id,
    'version', v_next_version,
    'status', 'ok'
  );
end;
$$;

revoke all on function public.save_third_party_document(
  uuid,
  text,
  text,
  text,
  text,
  text
) from public;

revoke all on function public.save_third_party_document(
  uuid,
  text,
  text,
  text,
  text,
  text
) from anon;

revoke all on function public.save_third_party_document(
  uuid,
  text,
  text,
  text,
  text,
  text
) from authenticated;

grant execute on function public.save_third_party_document(
  uuid,
  text,
  text,
  text,
  text,
  text
) to service_role;
