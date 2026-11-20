-- CLAP: permiso específico para recuperar sincronizaciones SIIGO.
-- No asigna el permiso automáticamente a ningún rol.

INSERT INTO public.system_permissions (
    module_id,
    permission_code,
    name,
    description,
    action,
    status
)
SELECT
    'f4eda540-3a78-407f-b642-56cc17398a37'::uuid,
    'CODIFICACION_RETRY_SIIGO',
    'Reintentar sincronización con SIIGO',
    'Permite reintentar la sincronización de productos existentes de CLAP con SIIGO, previa verificación del código para evitar duplicados.',
    'Editar',
    'Activo'
WHERE NOT EXISTS (
    SELECT 1
    FROM public.system_permissions
    WHERE permission_code = 'CODIFICACION_RETRY_SIIGO'
);
