insert into public.system_permissions (
  module_id,
  permission_code,
  name,
  description,
  action,
  status
)
select
  root.module_id,
  values_to_insert.permission_code,
  values_to_insert.name,
  values_to_insert.description,
  'Ver',
  'Activo'
from public.system_permissions root
cross join (
  values
    (
      'ABASTECIMIENTO_VIEW',
      'Ver abastecimiento',
      'Permite acceder a la gestión de abastecimiento y compras.'
    ),
    (
      'ALMACEN_INVENTARIOS_VIEW',
      'Ver almacenes e inventarios',
      'Permite acceder a la gestión de almacenes, existencias e inventarios.'
    ),
    (
      'LOGISTICA_VIEW',
      'Ver logística',
      'Permite acceder a la gestión logística y de despachos.'
    ),
    (
      'MEZCLAS_VIEW',
      'Ver mezclas',
      'Permite acceder a la gestión y control del proceso de mezclas.'
    )
) as values_to_insert (
  permission_code,
  name,
  description
)
where root.permission_code = 'ABASTECIMIENTO_LOGISTICA_VIEW'
  and root.status = 'Activo'
  and not exists (
    select 1
    from public.system_permissions existing
    where existing.permission_code =
      values_to_insert.permission_code
  );

-- =========================================================
-- PERMISOS OPERATIVOS · ALMACENES E INVENTARIOS
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
  m.id,
  v.permission_code,
  v.name,
  v.description,
  v.action,
  'Activo'
from public.system_modules m
cross join (
  values
    (
      'ALMACEN_RECEIVE',
      'Registrar entradas de almacén',
      'Permite registrar recepciones y entradas que aumentan las existencias.',
      'Crear'
    ),
    (
      'ALMACEN_DISPATCH',
      'Registrar salidas de almacén',
      'Permite registrar salidas de materiales o productos del almacén.',
      'Crear'
    ),
    (
      'ALMACEN_ADJUST',
      'Realizar ajustes de inventario',
      'Permite realizar ajustes autorizados de inventario dejando trazabilidad.',
      'Editar'
    )
) as v (
  permission_code,
  name,
  description,
  action
)
where m.module_code = 'ABASTECIMIENTO_LOGISTICA'
  and m.status = 'Activo'
  and not exists (
    select 1
    from public.system_permissions p
    where p.permission_code = v.permission_code
  );

-- =========================================================
-- PERMISO · ADMINISTRACIÓN DE ALMACENES Y UBICACIONES
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
  m.id,
  'ALMACEN_LOCATIONS_MANAGE',
  'Administrar almacenes y ubicaciones',
  'Permite crear, editar y cambiar el estado de almacenes y ubicaciones de inventario.',
  'Administrar',
  'Activo'
from public.system_modules m
where m.module_code = 'ABASTECIMIENTO_LOGISTICA'
  and m.status = 'Activo'
  and not exists (
    select 1
    from public.system_permissions p
    where p.permission_code = 'ALMACEN_LOCATIONS_MANAGE'
  );
