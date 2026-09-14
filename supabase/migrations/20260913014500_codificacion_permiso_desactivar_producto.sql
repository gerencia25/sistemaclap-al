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
  'CODIFICACION_DEACTIVATE_PRODUCT',
  'Desactivar productos',
  'Permite desactivar productos existentes desde solicitudes de codificación.',
  'Desactivar',
  'Activo'
from public.system_permissions
where permission_code = 'CODIFICACION_VIEW'
  and status = 'Activo'
  and not exists (
    select 1
    from public.system_permissions
    where permission_code = 'CODIFICACION_DEACTIVATE_PRODUCT'
  )
limit 1;
