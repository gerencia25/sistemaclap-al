-- ============================================================
-- CLAP · TALENTO HUMANO
-- Seguridad de solicitudes de personal
--
-- Fecha: 2026-09-07
--
-- Este archivo versiona cambios ya aplicados y probados
-- manualmente en Supabase.
--
-- Incluye:
--   - Creación transaccional de solicitudes de personal
--   - Cancelación transaccional
--   - Ejecución de RPC únicamente desde service_role
--   - Cierre del acceso directo del navegador a:
--       employee_requests
--       employee_request_fulfillments
-- ============================================================

begin;


-- ============================================================
-- 1. CREAR SOLICITUD DE PERSONAL
--
-- Genera SCP-###### de forma transaccional.
-- El navegador no define:
--   - consecutivo
--   - estado
--   - nombre real del área requerida
--   - nombre real del cargo requerido
--
-- La API CLAP llama esta función mediante service_role.
-- ============================================================

create or replace function public.create_employee_request(
  p_requester_area text,
  p_requester_name text,
  p_requester_position text,
  p_requester_email text,
  p_request_reason text,
  p_area_id uuid,
  p_position_id uuid,
  p_requested_quantity integer,
  p_required_date date,
  p_contract_type text,
  p_replacement_employee_id uuid,
  p_detailed_description text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_request_id uuid;
  v_request_number text;

  v_next_number integer;

  v_area_name text;
  v_position_name text;

  v_now timestamptz := now();
begin

  -- ========================================================
  -- VALIDACIONES BÁSICAS
  -- ========================================================

  if nullif(trim(p_requester_area), '') is null then
    raise exception
      'El área solicitante es obligatoria.';
  end if;

  if nullif(trim(p_requester_name), '') is null then
    raise exception
      'El nombre del solicitante es obligatorio.';
  end if;

  if nullif(trim(p_requester_position), '') is null then
    raise exception
      'El cargo del solicitante es obligatorio.';
  end if;

  if nullif(trim(p_requester_email), '') is null then
    raise exception
      'El correo del solicitante es obligatorio.';
  end if;

  if nullif(trim(p_request_reason), '') is null then
    raise exception
      'El motivo de la solicitud es obligatorio.';
  end if;

  if p_area_id is null then
    raise exception
      'El área donde se requiere el personal es obligatoria.';
  end if;

  if p_position_id is null then
    raise exception
      'El cargo requerido es obligatorio.';
  end if;

  if p_requested_quantity is null
     or p_requested_quantity <= 0 then
    raise exception
      'La cantidad solicitada debe ser mayor a cero.';
  end if;


  -- ========================================================
  -- VALIDAR ÁREA ACTIVA
  -- ========================================================

  select
    ca.name
  into
    v_area_name
  from public.company_areas ca
  where ca.id = p_area_id
    and ca.status = 'Activa';

  if not found then
    raise exception
      'El área seleccionada no existe o no está activa.';
  end if;


  -- ========================================================
  -- VALIDAR CARGO ACTIVO Y PERTENECIENTE AL ÁREA
  -- ========================================================

  select
    cp.name
  into
    v_position_name
  from public.company_positions cp
  where cp.id = p_position_id
    and cp.area_id = p_area_id
    and cp.status = 'Activo';

  if not found then
    raise exception
      'El cargo seleccionado no existe, no está activo o no pertenece al área indicada.';
  end if;


  -- ========================================================
  -- VALIDAR EMPLEADO A REEMPLAZAR, SI APLICA
  -- ========================================================

  if p_replacement_employee_id is not null then

    if not exists (
      select 1
      from public.employees e
      where e.id = p_replacement_employee_id
    ) then
      raise exception
        'El empleado seleccionado para reemplazo no existe.';
    end if;

  end if;


  -- ========================================================
  -- GENERAR CONSECUTIVO DE FORMA SEGURA
  -- ========================================================

  perform pg_advisory_xact_lock(
    hashtext('CLAP_EMPLOYEE_REQUEST_NUMBER')
  );

  select
    coalesce(
      max(
        substring(request_number from 5)::integer
      ),
      0
    ) + 1
  into
    v_next_number
  from public.employee_requests
  where request_number ~ '^SCP-[0-9]+$';

  v_request_number :=
    'SCP-' ||
    lpad(
      v_next_number::text,
      6,
      '0'
    );


  -- ========================================================
  -- CREAR SOLICITUD
  --
  -- Toda solicitud nace Pendiente.
  -- Los campos de gestión se fuerzan a NULL.
  -- ========================================================

  insert into public.employee_requests (
    request_number,

    requester_area,
    requester_name,
    requester_position,
    requester_email,

    request_type,
    request_reason,

    area_id,
    position_id,

    area,
    position,

    requested_quantity,
    required_date,

    contract_type,
    replacement_employee_id,

    detailed_description,

    status,

    approved_at,
    rejected_at,
    rejection_reason,
    in_progress_at,
    cancelled_at,
    cancellation_reason,
    completed_at,
    closure_type,
    closure_reason,

    created_at,
    updated_at
  )
  values (
    v_request_number,

    trim(p_requester_area),
    trim(p_requester_name),
    trim(p_requester_position),
    trim(p_requester_email),

    'Solicitud de personal',
    trim(p_request_reason),

    p_area_id,
    p_position_id,

    v_area_name,
    v_position_name,

    p_requested_quantity,
    p_required_date,

    nullif(trim(p_contract_type), ''),
    p_replacement_employee_id,

    nullif(trim(p_detailed_description), ''),

    'Pendiente',

    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,

    v_now,
    v_now
  )
  returning id
  into v_request_id;


  -- ========================================================
  -- RESULTADO
  -- ========================================================

  return jsonb_build_object(
    'id',
    v_request_id,

    'request_number',
    v_request_number,

    'status',
    'Pendiente',

    'area',
    v_area_name,

    'position',
    v_position_name,

    'requested_quantity',
    p_requested_quantity
  );

end;
$function$;


-- ============================================================
-- SEGURIDAD RPC · CREAR SOLICITUD
-- ============================================================

revoke all
on function public.create_employee_request(
  text,
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  integer,
  date,
  text,
  uuid,
  text
)
from public;

revoke all
on function public.create_employee_request(
  text,
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  integer,
  date,
  text,
  uuid,
  text
)
from anon;

revoke all
on function public.create_employee_request(
  text,
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  integer,
  date,
  text,
  uuid,
  text
)
from authenticated;

grant execute
on function public.create_employee_request(
  text,
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  integer,
  date,
  text,
  uuid,
  text
)
to service_role;



-- ============================================================
-- 2. CANCELAR SOLICITUD DE PERSONAL
--
-- Reglas:
--   Aprobada   + cobertura 0 -> Cancelable
--   En gestión + cobertura 0 -> Cancelable
--   Cobertura > 0            -> Debe usar cierre parcial
--
-- La operación bloquea la solicitud durante la transacción.
-- ============================================================

create or replace function public.cancel_employee_request(
  p_request_id uuid,
  p_cancellation_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_request record;
  v_fulfilled_count integer := 0;
  v_reason text;
  v_now timestamptz := now();
begin

  -- ========================================================
  -- VALIDACIONES
  -- ========================================================

  if p_request_id is null then
    raise exception
      'La solicitud de personal es obligatoria.';
  end if;

  v_reason :=
    nullif(trim(p_cancellation_reason), '');

  if v_reason is null then
    raise exception
      'El motivo de la cancelación es obligatorio.';
  end if;


  -- ========================================================
  -- BLOQUEAR SOLICITUD
  -- ========================================================

  select
    er.id,
    er.request_number,
    er.status,
    er.requested_quantity
  into
    v_request
  from public.employee_requests er
  where er.id = p_request_id
  for update;

  if not found then
    raise exception
      'La solicitud de personal no existe.';
  end if;


  -- ========================================================
  -- VALIDAR ESTADO
  -- ========================================================

  if v_request.status not in (
    'Aprobada',
    'En gestión'
  ) then
    raise exception
      'Solo una solicitud Aprobada o En gestión puede ser cancelada.';
  end if;


  -- ========================================================
  -- VALIDAR COBERTURA
  -- ========================================================

  select
    count(*)
  into
    v_fulfilled_count
  from public.employee_request_fulfillments
  where request_id = p_request_id;

  if v_fulfilled_count > 0 then
    raise exception
      'La solicitud ya tiene personas vinculadas. Debes utilizar el cierre parcial.';
  end if;


  -- ========================================================
  -- CANCELAR
  -- ========================================================

  update public.employee_requests
  set
    status = 'Cancelada',
    cancelled_at = v_now,
    cancellation_reason = v_reason,
    updated_at = v_now
  where id = p_request_id;


  -- ========================================================
  -- RESULTADO
  -- ========================================================

  return jsonb_build_object(
    'id',
    v_request.id,

    'request_number',
    v_request.request_number,

    'status',
    'Cancelada',

    'cancellation_reason',
    v_reason,

    'cancelled_at',
    v_now,

    'fulfilled_count',
    v_fulfilled_count
  );

end;
$function$;


-- ============================================================
-- SEGURIDAD RPC · CANCELAR SOLICITUD
-- ============================================================

revoke all
on function public.cancel_employee_request(
  uuid,
  text
)
from public;

revoke all
on function public.cancel_employee_request(
  uuid,
  text
)
from anon;

revoke all
on function public.cancel_employee_request(
  uuid,
  text
)
from authenticated;

grant execute
on function public.cancel_employee_request(
  uuid,
  text
)
to service_role;



-- ============================================================
-- 3. EMPLOYEE_REQUESTS
--
-- La tabla no puede ser accedida directamente desde el
-- navegador.
--
-- Direcciones:
--   crean solicitudes mediante API CLAP.
--
-- Talento Humano:
--   consulta y gestiona mediante APIs protegidas.
--
-- service_role:
--   conserva el acceso del backend.
-- ============================================================

alter table public.employee_requests
enable row level security;

revoke all privileges
on table public.employee_requests
from anon;

revoke all privileges
on table public.employee_requests
from authenticated;


-- Eliminar políticas históricas/directas del navegador.

drop policy if exists employee_requests_select_policy
on public.employee_requests;

drop policy if exists employee_requests_insert_policy
on public.employee_requests;

drop policy if exists employee_requests_update_policy
on public.employee_requests;

drop policy if exists employee_requests_delete_policy
on public.employee_requests;



-- ============================================================
-- 4. EMPLOYEE_REQUEST_FULFILLMENTS
--
-- Relación solicitud <-> empleado contratado.
--
-- Toda consulta o escritura se realiza desde:
--   - APIs CLAP
--   - RPC transaccionales
-- mediante service_role.
-- ============================================================

alter table public.employee_request_fulfillments
enable row level security;

revoke all privileges
on table public.employee_request_fulfillments
from anon;

revoke all privileges
on table public.employee_request_fulfillments
from authenticated;


-- Eliminar políticas históricas/directas del navegador.

drop policy if exists authenticated_insert_employee_request_fulfillments
on public.employee_request_fulfillments;

drop policy if exists authenticated_select_employee_request_fulfillments
on public.employee_request_fulfillments;


commit;
