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
  'CODIFICACION_EDIT_PRODUCT',
  'Editar productos',
  'Permite modificar la información editable de productos existentes en el maestro oficial, sin alterar su identidad ni clasificación.',
  'Editar',
  'Activo'
from public.system_permissions
where permission_code = 'CODIFICACION_VIEW'
  and status = 'Activo'
  and not exists (
    select 1
    from public.system_permissions
    where permission_code = 'CODIFICACION_EDIT_PRODUCT'
  )
limit 1;
