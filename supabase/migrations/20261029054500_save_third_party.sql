create or replace function public.save_third_party(
  p_data jsonb,
  p_contacts jsonb default '[]'::jsonb,
  p_third_party_id uuid default null,
  p_request_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_third_party_id uuid;
  v_duplicate_id uuid;
  v_contact jsonb;
  v_contact_index integer := 0;
begin
  -- =====================================================
  -- VALIDACIONES GENERALES
  -- =====================================================

  if not (
    coalesce((p_data ->> 'is_customer')::boolean, false)
    or coalesce((p_data ->> 'is_supplier')::boolean, false)
    or coalesce((p_data ->> 'is_other')::boolean, false)
  ) then
    raise exception 'Debes seleccionar al menos un rol: Cliente, Proveedor u Otro.';
  end if;

  if nullif(trim(p_data ->> 'identification_number'), '') is null then
    raise exception 'Debes ingresar la identificación del tercero.';
  end if;

  if coalesce(p_data ->> 'person_type', 'Empresa') = 'Empresa'
     and nullif(trim(p_data ->> 'business_name'), '') is null then
    raise exception 'Debes ingresar la razón social.';
  end if;

  if coalesce(p_data ->> 'person_type', 'Empresa') = 'Persona'
     and nullif(trim(p_data ->> 'first_name'), '') is null
     and nullif(trim(p_data ->> 'last_name'), '') is null then
    raise exception 'Debes ingresar nombres o apellidos de la persona.';
  end if;

  -- Evita duplicados por tipo + identificación
  select tp.id
  into v_duplicate_id
  from public.third_parties tp
  where tp.identification_type =
        coalesce(nullif(trim(p_data ->> 'identification_type'), ''), 'NIT')
    and tp.identification_number =
        trim(p_data ->> 'identification_number')
    and (
      p_third_party_id is null
      or tp.id <> p_third_party_id
    )
  limit 1;

  if v_duplicate_id is not null then
    raise exception
      'Ya existe un tercero registrado con ese tipo y número de identificación.';
  end if;

  -- =====================================================
  -- CREAR / EDITAR TERCERO
  -- =====================================================

  if p_third_party_id is null then

    insert into public.third_parties (
      is_customer,
      is_supplier,
      is_other,
      person_type,
      identification_type,
      identification_number,
      verification_digit,
      first_name,
      last_name,
      business_name,
      commercial_name,
      country,
      department,
      city,
      address,
      phone_indicative,
      phone,
      email,
      electronic_invoice_email,
      fiscal_responsibility,
      iva_regime,
      ciiu_activity,
      postal_code,
      is_vat_responsible,
      is_grand_taxpayer,
      is_self_withholder,
      is_vat_withholding_agent,
      payment_terms,
      currency,
      credit_limit,
      price_list,
      seller,
      collector,
      siigo_sync_enabled,
      siigo_sync_status,
      observations,
      status,
      updated_at
    )
    values (
      coalesce((p_data ->> 'is_customer')::boolean, false),
      coalesce((p_data ->> 'is_supplier')::boolean, false),
      coalesce((p_data ->> 'is_other')::boolean, false),

      coalesce(nullif(trim(p_data ->> 'person_type'), ''), 'Empresa'),
      coalesce(nullif(trim(p_data ->> 'identification_type'), ''), 'NIT'),
      trim(p_data ->> 'identification_number'),
      nullif(trim(p_data ->> 'verification_digit'), ''),

      nullif(trim(p_data ->> 'first_name'), ''),
      nullif(trim(p_data ->> 'last_name'), ''),
      nullif(trim(p_data ->> 'business_name'), ''),
      nullif(trim(p_data ->> 'commercial_name'), ''),

      coalesce(nullif(trim(p_data ->> 'country'), ''), 'Colombia'),
      nullif(trim(p_data ->> 'department'), ''),
      nullif(trim(p_data ->> 'city'), ''),
      nullif(trim(p_data ->> 'address'), ''),

      nullif(trim(p_data ->> 'phone_indicative'), ''),
      nullif(trim(p_data ->> 'phone'), ''),
      nullif(trim(p_data ->> 'email'), ''),

      nullif(trim(p_data ->> 'electronic_invoice_email'), ''),
      nullif(trim(p_data ->> 'fiscal_responsibility'), ''),
      nullif(trim(p_data ->> 'iva_regime'), ''),
      nullif(trim(p_data ->> 'ciiu_activity'), ''),
      nullif(trim(p_data ->> 'postal_code'), ''),

      coalesce((p_data ->> 'is_vat_responsible')::boolean, false),
      coalesce((p_data ->> 'is_grand_taxpayer')::boolean, false),
      coalesce((p_data ->> 'is_self_withholder')::boolean, false),
      coalesce((p_data ->> 'is_vat_withholding_agent')::boolean, false),

      nullif(trim(p_data ->> 'payment_terms'), ''),
      coalesce(nullif(trim(p_data ->> 'currency'), ''), 'COP'),
      coalesce((p_data ->> 'credit_limit')::numeric, 0),

      nullif(trim(p_data ->> 'price_list'), ''),
      nullif(trim(p_data ->> 'seller'), ''),
      nullif(trim(p_data ->> 'collector'), ''),

      coalesce((p_data ->> 'siigo_sync_enabled')::boolean, true),
      coalesce(nullif(trim(p_data ->> 'siigo_sync_status'), ''), 'Pendiente'),

      nullif(trim(p_data ->> 'observations'), ''),
      coalesce(nullif(trim(p_data ->> 'status'), ''), 'Activo'),
      now()
    )
    returning id into v_third_party_id;

  else

    if not exists (
      select 1
      from public.third_parties
      where id = p_third_party_id
    ) then
      raise exception 'El tercero que intentas editar no existe.';
    end if;

    update public.third_parties
    set
      is_customer =
        coalesce((p_data ->> 'is_customer')::boolean, false),

      is_supplier =
        coalesce((p_data ->> 'is_supplier')::boolean, false),

      is_other =
        coalesce((p_data ->> 'is_other')::boolean, false),

      person_type =
        coalesce(nullif(trim(p_data ->> 'person_type'), ''), 'Empresa'),

      identification_type =
        coalesce(nullif(trim(p_data ->> 'identification_type'), ''), 'NIT'),

      identification_number =
        trim(p_data ->> 'identification_number'),

      verification_digit =
        nullif(trim(p_data ->> 'verification_digit'), ''),

      first_name =
        nullif(trim(p_data ->> 'first_name'), ''),

      last_name =
        nullif(trim(p_data ->> 'last_name'), ''),

      business_name =
        nullif(trim(p_data ->> 'business_name'), ''),

      commercial_name =
        nullif(trim(p_data ->> 'commercial_name'), ''),

      country =
        coalesce(nullif(trim(p_data ->> 'country'), ''), 'Colombia'),

      department =
        nullif(trim(p_data ->> 'department'), ''),

      city =
        nullif(trim(p_data ->> 'city'), ''),

      address =
        nullif(trim(p_data ->> 'address'), ''),

      phone_indicative =
        nullif(trim(p_data ->> 'phone_indicative'), ''),

      phone =
        nullif(trim(p_data ->> 'phone'), ''),

      email =
        nullif(trim(p_data ->> 'email'), ''),

      electronic_invoice_email =
        nullif(trim(p_data ->> 'electronic_invoice_email'), ''),

      fiscal_responsibility =
        nullif(trim(p_data ->> 'fiscal_responsibility'), ''),

      iva_regime =
        nullif(trim(p_data ->> 'iva_regime'), ''),

      ciiu_activity =
        nullif(trim(p_data ->> 'ciiu_activity'), ''),

      postal_code =
        nullif(trim(p_data ->> 'postal_code'), ''),

      is_vat_responsible =
        coalesce((p_data ->> 'is_vat_responsible')::boolean, false),

      is_grand_taxpayer =
        coalesce((p_data ->> 'is_grand_taxpayer')::boolean, false),

      is_self_withholder =
        coalesce((p_data ->> 'is_self_withholder')::boolean, false),

      is_vat_withholding_agent =
        coalesce((p_data ->> 'is_vat_withholding_agent')::boolean, false),

      payment_terms =
        nullif(trim(p_data ->> 'payment_terms'), ''),

      currency =
        coalesce(nullif(trim(p_data ->> 'currency'), ''), 'COP'),

      credit_limit =
        coalesce((p_data ->> 'credit_limit')::numeric, 0),

      price_list =
        nullif(trim(p_data ->> 'price_list'), ''),

      seller =
        nullif(trim(p_data ->> 'seller'), ''),

      collector =
        nullif(trim(p_data ->> 'collector'), ''),

      siigo_sync_enabled =
        coalesce((p_data ->> 'siigo_sync_enabled')::boolean, true),

      siigo_sync_status =
        coalesce(
          nullif(trim(p_data ->> 'siigo_sync_status'), ''),
          'Pendiente'
        ),

      observations =
        nullif(trim(p_data ->> 'observations'), ''),

      status =
        coalesce(nullif(trim(p_data ->> 'status'), ''), 'Activo'),

      updated_at = now()

    where id = p_third_party_id;

    v_third_party_id := p_third_party_id;

  end if;

  -- =====================================================
  -- CONTACTOS
  -- Se reemplazan como conjunto para evitar duplicados.
  -- Todo ocurre dentro de la misma transacción.
  -- =====================================================

  delete from public.third_party_contacts
  where third_party_id = v_third_party_id;

  for v_contact in
    select value
    from jsonb_array_elements(
      coalesce(p_contacts, '[]'::jsonb)
    )
  loop
    if nullif(trim(v_contact ->> 'first_name'), '') is null then
      raise exception
        'Cada contacto agregado debe tener al menos nombre.';
    end if;

    v_contact_index := v_contact_index + 1;

    insert into public.third_party_contacts (
      third_party_id,
      first_name,
      last_name,
      email,
      position,
      phone_indicative,
      phone,
      is_primary,
      status,
      updated_at
    )
    values (
      v_third_party_id,
      trim(v_contact ->> 'first_name'),
      nullif(trim(v_contact ->> 'last_name'), ''),
      nullif(trim(v_contact ->> 'email'), ''),
      nullif(trim(v_contact ->> 'position'), ''),
      nullif(trim(v_contact ->> 'phone_indicative'), ''),
      nullif(trim(v_contact ->> 'phone'), ''),
      v_contact_index = 1,
      'Activo',
      now()
    );
  end loop;

  -- =====================================================
  -- SOLICITUD ENLAZADA
  -- =====================================================

  if p_request_id is not null then

    if not exists (
      select 1
      from public.third_party_requests
      where id = p_request_id
    ) then
      raise exception 'La solicitud de tercero asociada no existe.';
    end if;

    update public.third_party_requests
    set
      status = 'Creado',
      created_third_party_id = v_third_party_id,
      completed_at = coalesce(completed_at, now()),
      updated_at = now()
    where id = p_request_id;

  end if;

  return jsonb_build_object(
    'id', v_third_party_id,
    'status', 'ok'
  );
end;
$$;

revoke all on function public.save_third_party(
  jsonb,
  jsonb,
  uuid,
  uuid
) from public;

revoke all on function public.save_third_party(
  jsonb,
  jsonb,
  uuid,
  uuid
) from anon;

revoke all on function public.save_third_party(
  jsonb,
  jsonb,
  uuid,
  uuid
) from authenticated;

grant execute on function public.save_third_party(
  jsonb,
  jsonb,
  uuid,
  uuid
) to service_role;
