-- =========================================================
-- CLAP · ABASTECIMIENTO
-- Permiso específico para administrar Compras
-- =========================================================

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
  'ABASTECIMIENTO_COMPRAS_MANAGE',
  'Administrar compras',
  'Permite crear solicitudes de compra, vincular órdenes oficiales de SIIGO y gestionar la integración de compras.',
  'Administrar',
  'Activo'
from public.system_permissions
where permission_code = 'ABASTECIMIENTO_VIEW'
  and status = 'Activo'
limit 1
on conflict (permission_code)
do update
set
  name = excluded.name,
  description = excluded.description,
  action = excluded.action,
  status = excluded.status,
  updated_at = now();
