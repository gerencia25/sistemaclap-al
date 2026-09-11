-- ============================================================
-- CLAP V3 · Sistema de Gestión de la Calidad
-- Base de módulo, permisos documentales y storage_path
-- ============================================================

-- 1. Módulo técnico de Sistema de Gestión de la Calidad
insert into public.system_modules (
  module_code,
  name,
  description,
  route,
  status
)
select
  'SISTEMA_GESTION_CALIDAD',
  'Sistema de Gestión de la Calidad',
  'Gestión documental, codificación y administración del Sistema de Gestión de la Calidad.',
  '/sistema-gestion-calidad',
  'Activo'
where not exists (
  select 1
  from public.system_modules
  where module_code = 'SISTEMA_GESTION_CALIDAD'
);

-- 2. Permiso general de acceso a SC
insert into public.system_permissions (
  module_id,
  permission_code,
  name,
  description,
  action,
  status
)
select
  m.id,
  'SC_VIEW',
  'Ver Sistema de Gestión de la Calidad',
  'Permite acceder al módulo de Sistema de Gestión de la Calidad.',
  'Ver',
  'Activo'
from public.system_modules m
where m.module_code = 'SISTEMA_GESTION_CALIDAD'
  and not exists (
    select 1
    from public.system_permissions p
    where p.permission_code = 'SC_VIEW'
  );

-- 3. Permisos documentales propios de SC
insert into public.system_permissions (
  module_id,
  permission_code,
  name,
  description,
  action,
  status
)
select
  m.id,
  values_to_insert.permission_code,
  values_to_insert.name,
  values_to_insert.description,
  values_to_insert.action,
  'Activo'
from public.system_modules m
cross join (
  values
    (
      'SC_DOCS_VIEW',
      'Ver documentos de SC',
      'Permite consultar y descargar documentos del Sistema de Gestión de la Calidad.',
      'Ver'
    ),
    (
      'SC_DOCS_CREATE',
      'Subir documentos de SC',
      'Permite cargar documentos del Sistema de Gestión de la Calidad.',
      'Crear'
    ),
    (
      'SC_DOCS_EDIT',
      'Editar documentos de SC',
      'Permite actualizar documentos del Sistema de Gestión de la Calidad.',
      'Editar'
    ),
    (
      'SC_DOCS_DELETE',
      'Eliminar documentos de SC',
      'Permite eliminar documentos del Sistema de Gestión de la Calidad.',
      'Eliminar'
    )
) as values_to_insert(
  permission_code,
  name,
  description,
  action
)
where m.module_code = 'SISTEMA_GESTION_CALIDAD'
  and not exists (
    select 1
    from public.system_permissions p
    where p.permission_code = values_to_insert.permission_code
  );

-- 4. Path interno de Storage para migración futura a bucket privado
alter table public.process_documents
add column if not exists storage_path text;

-- 5. Backfill para documentos existentes que todavía usan URL pública
update public.process_documents
set storage_path = split_part(
  file_url,
  '/storage/v1/object/public/process-documents/',
  2
)
where storage_path is null
  and file_url like '%/storage/v1/object/public/process-documents/%';
