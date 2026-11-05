-- ============================================================
-- CLAP · Catálogo centralizado de unidades de medida
-- Configuración → Listas y parámetros → Unidades de medida
-- ============================================================

create table if not exists public.measurement_units (
  id uuid primary key default gen_random_uuid(),

  code text not null,
  name text not null,
  symbol text not null,

  description text,
  status text not null default 'Activo',
  display_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint measurement_units_code_not_blank
    check (btrim(code) <> ''),

  constraint measurement_units_name_not_blank
    check (btrim(name) <> ''),

  constraint measurement_units_symbol_not_blank
    check (btrim(symbol) <> ''),

  constraint measurement_units_status_check
    check (status in ('Activo', 'Inactivo')),

  constraint measurement_units_display_order_check
    check (display_order >= 0)
);

create unique index if not exists measurement_units_code_unique
  on public.measurement_units (upper(code));

comment on table public.measurement_units is
  'Catálogo centralizado de unidades de medida utilizadas por Codificación, Inventarios, Compras, Producción y demás módulos de CLAP.';

comment on column public.measurement_units.code is
  'Código estable de la unidad, por ejemplo KG, ML, UND.';

comment on column public.measurement_units.name is
  'Nombre descriptivo, por ejemplo Kilogramo, Mililitro, Unidad.';

comment on column public.measurement_units.symbol is
  'Símbolo mostrado en cantidades y movimientos, por ejemplo kg, mL, und.';

-- ============================================================
-- Catálogo inicial
-- Estas opciones NO quedan quemadas en código.
-- Después podrán administrarse desde Listas y parámetros.
-- ============================================================

insert into public.measurement_units
  (code, name, symbol, description, display_order)
values
  ('UND', 'Unidad',          'und', 'Unidad individual',                10),
  ('KG',  'Kilogramo',       'kg',  'Unidad de masa',                   20),
  ('G',   'Gramo',           'g',   'Unidad de masa',                   30),
  ('MG',  'Miligramo',       'mg',  'Unidad de masa',                   40),
  ('T',   'Tonelada',        't',   'Unidad de masa',                   50),

  ('L',   'Litro',           'L',   'Unidad de volumen',                60),
  ('ML',  'Mililitro',       'mL',  'Unidad de volumen',                70),
  ('GAL', 'Galón',           'gal', 'Unidad de volumen',                80),

  ('M',   'Metro',           'm',   'Unidad de longitud',               90),
  ('CM',  'Centímetro',      'cm',  'Unidad de longitud',              100),
  ('MM',  'Milímetro',       'mm',  'Unidad de longitud',              110),

  ('M2',  'Metro cuadrado',  'm²',  'Unidad de área',                  120),
  ('M3',  'Metro cúbico',    'm³',  'Unidad de volumen tridimensional',130),

  ('OZ',  'Onza',            'oz',  'Unidad de masa',                  140),
  ('LB',  'Libra',           'lb',  'Unidad de masa',                  150)
on conflict do nothing;

