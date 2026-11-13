alter table public.measurement_units
add column if not exists siigo_unit_code text;

comment on column public.measurement_units.siigo_unit_code is
'Código oficial de unidad de medida utilizado al crear el producto en SIIGO.';

update public.measurement_units
set siigo_unit_code = case upper(btrim(code))
  when 'UND' then '94'
  when 'KG'  then 'KGM'
  when 'G'   then 'GGR'
  when 'M'   then 'MTR'
  when 'LB'  then 'LBR'
  else siigo_unit_code
end
where upper(btrim(code)) in (
  'UND',
  'KG',
  'G',
  'M',
  'LB'
);
