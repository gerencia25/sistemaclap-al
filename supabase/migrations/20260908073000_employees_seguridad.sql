-- =========================================================
-- CLAP · Talento Humano
-- Seguridad del maestro de empleados
--
-- Este cambio ya fue aplicado y probado manualmente
-- en Supabase antes de versionarse.
--
-- El acceso directo desde navegador queda bloqueado.
-- Las operaciones oficiales deben pasar por APIs
-- protegidas que utilizan service_role.
-- =========================================================

begin;

alter table public.employees
enable row level security;

revoke all privileges
on table public.employees
from anon;

revoke all privileges
on table public.employees
from authenticated;

drop policy if exists employees_select_policy
on public.employees;

drop policy if exists employees_insert_policy
on public.employees;

drop policy if exists employees_update_policy
on public.employees;

drop policy if exists employees_delete_policy
on public.employees;

commit;
