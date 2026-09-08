-- =========================================================
-- CLAP · Talento Humano
-- Seguridad de historial laboral y salarial
--
-- Estos cambios ya fueron aplicados y probados
-- manualmente en Supabase antes de versionarse.
--
-- El acceso directo desde navegador queda bloqueado.
-- Las operaciones oficiales pasan por APIs protegidas
-- que utilizan service_role.
-- =========================================================

begin;

-- =========================================================
-- PERIODOS LABORALES
-- =========================================================

alter table public.employee_employment_periods
enable row level security;

revoke all privileges
on table public.employee_employment_periods
from anon;

revoke all privileges
on table public.employee_employment_periods
from authenticated;

drop policy if exists authenticated_select_employee_employment_periods
on public.employee_employment_periods;

-- =========================================================
-- HISTORIAL SALARIAL
-- =========================================================

alter table public.employee_salary_history
enable row level security;

revoke all privileges
on table public.employee_salary_history
from anon;

revoke all privileges
on table public.employee_salary_history
from authenticated;

commit;
