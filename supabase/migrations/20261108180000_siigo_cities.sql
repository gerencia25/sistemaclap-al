create table if not exists public.siigo_cities (
  country_code text not null,
  country_name text not null,
  state_code text not null,
  state_name text not null,
  city_code text not null,
  city_name text not null,

  country_key text not null,
  state_key text not null,
  city_key text not null,

  source text not null default 'SIIGO',
  updated_at timestamptz not null default now(),

  constraint siigo_cities_pkey
    primary key (
      country_code,
      state_code,
      city_code
    )
);

comment on table public.siigo_cities is
  'Catálogo técnico de países, departamentos/estados y ciudades utilizado por la API de SIIGO.';

comment on column public.siigo_cities.country_key is
  'Nombre normalizado del país para búsqueda desde CLAP.';

comment on column public.siigo_cities.state_key is
  'Nombre normalizado del departamento/estado para búsqueda desde CLAP.';

comment on column public.siigo_cities.city_key is
  'Nombre normalizado de la ciudad para búsqueda desde CLAP.';

create index if not exists
  siigo_cities_lookup_idx
on public.siigo_cities (
  country_key,
  state_key,
  city_key
);

create index if not exists
  siigo_cities_city_key_idx
on public.siigo_cities (
  city_key
);

alter table public.siigo_cities
  enable row level security;

revoke all
on table public.siigo_cities
from anon, authenticated;

grant select, insert, update, delete
on table public.siigo_cities
to service_role;
