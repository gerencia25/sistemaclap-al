insert into public.system_permissions (
  module_id,
  permission_code,
  name,
  description,
  action,
  status
)
select
  module_id,
  'CODIFICACION_REQUEST',
  'Solicitar códigos',
  'Permite registrar solicitudes de creación o desactivación de códigos para su gestión por Codificación.',
  'Solicitar',
  'Activo'
from public.system_permissions
where permission_code = 'CODIFICACION_VIEW'
  and status = 'Activo'
  and not exists (
    select 1
    from public.system_permissions
    where permission_code = 'CODIFICACION_REQUEST'
  )
limit 1;
