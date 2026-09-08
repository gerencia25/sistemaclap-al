-- =========================================================
-- CLAP · Talento Humano
-- Seguridad de estructura organizacional
--
-- Estos cambios ya fueron aplicados y probados
-- manualmente en Supabase antes de versionarse.
--
-- Regla:
-- anon          -> sin acceso
-- authenticated -> solo SELECT
-- service_role  -> acceso completo
--
-- Crear y editar áreas/cargos debe pasar por APIs
-- protegidas con AREAS_CARGOS_MANAGE.
-- =========================================================

begin;

-- =========================================================
-- ÁREAS
-- =========================================================

alter table public.company_areas
enable row level security;

revoke all privileges
on table public.company_areas
from anon;

revoke all privileges
on table public.company_areas
from authenticated;

grant select
on table public.company_areas
to authenticated;

drop policy if exists company_areas_select_policy
on public.company_areas;

drop policy if exists company_areas_insert_policy
on public.company_areas;

drop policy if exists company_areas_update_policy
on public.company_areas;

drop policy if exists company_areas_delete_policy
on public.company_areas;

drop policy if exists company_areas_authenticated_select
on public.company_areas;

create policy company_areas_authenticated_select
on public.company_areas
for select
to authenticated
using (true);

-- =========================================================
-- CARGOS
-- =========================================================

alter table public.company_positions
enable row level security;

revoke all privileges
on table public.company_positions
from anon;

revoke all privileges
on table public.company_positions
from authenticated;

grant select
on table public.company_positions
to authenticated;

drop policy if exists company_positions_select_policy
on public.company_positions;

drop policy if exists company_positions_insert_policy
on public.company_positions;

drop policy if exists company_positions_update_policy
on public.company_positions;

drop policy if exists company_positions_delete_policy
on public.company_positions;

drop policy if exists company_positions_authenticated_select
on public.company_positions;

create policy company_positions_authenticated_select
on public.company_positions
for select
to authenticated
using (true);

commit;
