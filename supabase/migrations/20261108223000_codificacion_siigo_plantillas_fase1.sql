-- ============================================================================
-- Sistema CLAP · Codificación histórica SIIGO · Fase 1
-- Fecha: 2026-11-08
--
-- ALCANCE:
--   - SOLO 13 clasificaciones que hoy tienen productos reales vinculados a SIIGO
--     y que aún no tienen una plantilla completa en CLAP.
--   - Completa jerarquías faltantes únicamente cuando son necesarias.
--   - Crea plantillas, campos y opciones históricas depuradas.
--   - Enlaza todos los campos Color al catálogo transversal COLORES.
--   - Agrega 20=TRANSPARENTE y 21=DORADO al catálogo global.
--
-- NO HACE:
--   - No actualiza public.products.
--   - No cambia códigos históricos.
--   - No toca SIIGO.
--   - No crea plantillas para clasificaciones sin productos SIIGO.
--   - No modifica las plantillas que ya estaban activas antes de esta fase.
--
-- DEPURACIONES EXPLÍCITAS:
--   1) PTF-FM-JG: capacidades históricas "mm" se normalizan a "mL".
--   2) MPP-OR-PD: se descarta la fila basura ",,,,,,".
--   3) PTF-AL-CJ: la matriz repetía 021/022 para 90, 100 y 120 mm.
--      Se preserva 021=120 mm por evidencia del producto histórico
--      PTF-AL-CJ-1010210181204. Se asignan 023-026 a 90/100 mm.
--   4) Colores: un único catálogo transversal.
--      20=TRANSPARENTE, 21=DORADO.
-- ============================================================================

begin;

do $clap$
declare
  v_def jsonb;
  v_field jsonb;
  v_option jsonb;
  v_fields_for_rpc jsonb;

  v_category_id uuid;
  v_group_id uuid;
  v_subgroup_id uuid;
  v_template_id uuid;
  v_field_id uuid;
  v_color_catalog_id uuid;

  v_status text;
  v_existing_name text;
  v_created jsonb;

  v_expected_fields integer;
  v_actual_fields integer;
  v_expected_length integer;
  v_actual_length integer;

  v_current_label text;
  v_current_type text;
  v_current_order integer;
  v_current_code_length integer;
  v_current_required boolean;
  v_current_code boolean;
  v_current_name boolean;

  v_code text;
  v_name text;
begin
  -- --------------------------------------------------------------------------
  -- 1. Catálogo transversal de colores
  -- --------------------------------------------------------------------------
  select id
    into v_color_catalog_id
  from public.item_option_catalogs
  where code = 'COLORES'
    and status = 'Activo'
  limit 1;

  if v_color_catalog_id is null then
    raise exception
      'No existe un catálogo transversal COLORES activo. Se cancela la migración.';
  end if;

  select name
    into v_existing_name
  from public.item_option_catalog_values
  where catalog_id = v_color_catalog_id
    and code = '20'
  limit 1;

  if v_existing_name is not null
     and upper(trim(v_existing_name)) <> 'TRANSPARENTE' then
    raise exception
      'Conflicto en COLORES: el código 20 ya significa "%".',
      v_existing_name;
  end if;

  if v_existing_name is null then
    insert into public.item_option_catalog_values (
      catalog_id,
      code,
      name,
      status,
      display_order
    )
    values (
      v_color_catalog_id,
      '20',
      'TRANSPARENTE',
      'Activo',
      20
    );
  end if;

  select name
    into v_existing_name
  from public.item_option_catalog_values
  where catalog_id = v_color_catalog_id
    and code = '21'
  limit 1;

  if v_existing_name is not null
     and upper(trim(v_existing_name)) <> 'DORADO' then
    raise exception
      'Conflicto en COLORES: el código 21 ya significa "%".',
      v_existing_name;
  end if;

  if v_existing_name is null then
    insert into public.item_option_catalog_values (
      catalog_id,
      code,
      name,
      status,
      display_order
    )
    values (
      v_color_catalog_id,
      '21',
      'DORADO',
      'Activo',
      21
    );
  end if;

  -- --------------------------------------------------------------------------
  -- 2. Definiciones autorizadas
  --    SOLO clasificaciones con productos SIIGO.
  -- --------------------------------------------------------------------------
  for v_def in
    select value
    from jsonb_array_elements(
      '[{"classification":"INS-PL-PG","category_code":"INS","group_code":"PL","group_name":"PLANTA Y MANTENIMIENTO","subgroup_code":"PG","subgroup_name":"ACEITES & PURGANTES","fields":[{"field_key":"referencia","field_label":"Referencia","field_type":"select","required":true,"display_order":1,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"101","name":"ACEITE"},{"code":"102","name":"PURGA"}]},{"field_key":"tipo","field_label":"Tipo","field_type":"select","required":true,"display_order":2,"code_length":4,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"0001","name":"NPT 451-45"}]},{"field_key":"medida","field_label":"Medida","field_type":"select","required":true,"display_order":3,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"001","name":"Bulto"},{"code":"002","name":"Garrafa"}]},{"field_key":"presentacion","field_label":"Presentación","field_type":"select","required":true,"display_order":4,"code_length":4,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"0001","name":"50 mL"},{"code":"0002","name":"100 mL"},{"code":"0003","name":"500 mL"},{"code":"0004","name":"1000 mL"},{"code":"0005","name":"50 g"},{"code":"0006","name":"100 g"},{"code":"0007","name":"454 g"},{"code":"0008","name":"500 g"},{"code":"0009","name":"1000 g"}]}]},{"classification":"MPC-AD-PG","category_code":"MPC","group_code":"AD","group_name":"ADITIVO","subgroup_code":"PG","subgroup_name":"PURGA","fields":[{"field_key":"tipo_purga","field_label":"Tipo de purga","field_type":"select","required":true,"display_order":1,"code_length":4,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"1001","name":"PURGA GRANULADA"}]},{"field_key":"referencia","field_label":"Referencia","field_type":"select","required":true,"display_order":2,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"001","name":"NPT NuPurge 451"}]},{"field_key":"presentacion","field_label":"Presentación","field_type":"select","required":true,"display_order":3,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"001","name":"LIBRAS"}]},{"field_key":"color","field_label":"Color","field_type":"select","required":true,"display_order":4,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":false,"shared_catalog":"COLORES","options":[]}]},{"classification":"MPC-AH-CN","category_code":"MPC","group_code":"AH","group_name":"ADHESIVO","subgroup_code":"CN","subgroup_name":"CINTA","fields":[{"field_key":"referencia","field_label":"Referencia","field_type":"select","required":true,"display_order":1,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"10","name":"CINTA DOBLE FAZ"}]},{"field_key":"codigo","field_label":"Código","field_type":"select","required":true,"display_order":2,"code_length":4,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"0001","name":"3M"},{"code":"0002","name":"ESPUMOSA"}]},{"field_key":"presentacion","field_label":"Presentación","field_type":"select","required":true,"display_order":3,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"01","name":"ROLLO *50 Mts"}]},{"field_key":"dimension","field_label":"Dimensión [mm]","field_type":"select","required":true,"display_order":4,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"001","name":"12 MM"}]},{"field_key":"color","field_label":"Color","field_type":"select","required":true,"display_order":5,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":false,"shared_catalog":"COLORES","options":[]}]},{"classification":"MPP-OR-PD","category_code":"MPP","group_code":"OR","group_name":"ORIGINAL","subgroup_code":"PD","subgroup_name":"POLIETILENO","fields":[{"field_key":"referencia","field_label":"Referencia","field_type":"select","required":true,"display_order":1,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"10","name":"PEAD"},{"code":"11","name":"PEBD"},{"code":"12","name":"PELBD"}]},{"field_key":"codigo","field_label":"Código","field_type":"select","required":true,"display_order":2,"code_length":4,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"0001","name":"MARLEX HHM 5502BN"},{"code":"0002","name":"BRASKEM IF 33"},{"code":"0003","name":"PAXON-AS55-003"},{"code":"0004","name":"DOW DMDA 8907 NT7"},{"code":"0005","name":"DOW DNDB 7147 NT7"}]},{"field_key":"presentacion","field_label":"Presentación","field_type":"select","required":true,"display_order":3,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"01","name":"BULTO"},{"code":"02","name":"CANECA"}]},{"field_key":"peso","field_label":"Peso [kg]","field_type":"select","required":true,"display_order":4,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"001","name":"1 KG"},{"code":"002","name":"2 KG"},{"code":"003","name":"3 KG"},{"code":"004","name":"4 KG"},{"code":"005","name":"5 KG"},{"code":"006","name":"6 KG"},{"code":"007","name":"7 KG"},{"code":"008","name":"8 KG"},{"code":"009","name":"9 KG"},{"code":"010","name":"10 KG"},{"code":"015","name":"15 KG"},{"code":"020","name":"20 KG"},{"code":"022","name":"22 KG"},{"code":"025","name":"25 KG"},{"code":"050","name":"50 KG"},{"code":"100","name":"100 KG"}]},{"field_key":"color","field_label":"Color","field_type":"select","required":true,"display_order":5,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":false,"shared_catalog":"COLORES","options":[]}]},{"classification":"PTC-RT-PO","category_code":"PTC","group_code":"RT","group_name":"RETAIL","subgroup_code":"PO","subgroup_name":"POP","fields":[{"field_key":"tipo","field_label":"Tipo de POP","field_type":"select","required":true,"display_order":1,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"101","name":"BOLSILLO"}]},{"field_key":"detalle","field_label":"Detalle","field_type":"select","required":true,"display_order":2,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"001","name":"1/4 CARTA VERTICAL PESTAÑA C. 510 mm"},{"code":"002","name":"1/4 CARTA VERTICAL COLLARIN C. 510 mm"}]},{"field_key":"dimension","field_label":"Dimensión","field_type":"select","required":true,"display_order":3,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"001","name":"14x10,5 cm / Pestaña 4,3x2 cm"},{"code":"002","name":"14x10 cm / Pestaña 16,5x4,3 cm"},{"code":"003","name":"3,7x 2,5 cm"}]},{"field_key":"color","field_label":"Color","field_type":"select","required":true,"display_order":4,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":false,"shared_catalog":"COLORES","options":[]},{"field_key":"material","field_label":"Material","field_type":"select","required":true,"display_order":5,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"01","name":"ABS"},{"code":"02","name":"PEAD"},{"code":"03","name":"PET"},{"code":"04","name":"PP"},{"code":"05","name":"PS"},{"code":"06","name":"PVC"}]}]},{"classification":"PTC-TT-CC","category_code":"PTC","group_code":"TT","group_name":"TALLER","subgroup_code":"CC","subgroup_name":"COLADAS CALIENTES","fields":[{"field_key":"categoria","field_label":"Categoría","field_type":"select","required":true,"display_order":1,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"101","name":"COLADA CALIENTE SENCILLA"},{"code":"102","name":"COLADA CALIENTE MULTIPLE"}]},{"field_key":"forma","field_label":"Forma","field_type":"select","required":true,"display_order":2,"code_length":4,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"0001","name":"CIRCULAR"}]},{"field_key":"punto_entrada","field_label":"Punto de entrada","field_type":"select","required":true,"display_order":3,"code_length":4,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"0001","name":"LATERAL"},{"code":"0002","name":"CAPILAR"}]},{"field_key":"cavidades","field_label":"Cavidades","field_type":"select","required":true,"display_order":4,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"01","name":"1 CAV"},{"code":"02","name":"2 CAV"},{"code":"03","name":"3 CAV"},{"code":"04","name":"4 CAV"}]}]},{"classification":"PTF-AL-CH","category_code":"PTF","group_code":"AL","group_name":"ALIMENTOS","subgroup_code":"CH","subgroup_name":"CUCHARAS","fields":[{"field_key":"tipo","field_label":"Tipo de cuchara","field_type":"select","required":true,"display_order":1,"code_length":4,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"1001","name":"CUCHARA DOSIFICADORA"}]},{"field_key":"acabado","field_label":"Acabado","field_type":"select","required":true,"display_order":2,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"01","name":"CIRCULAR"},{"code":"02","name":"CUADRADA"}]},{"field_key":"capacidad","field_label":"Capacidad [cc]","field_type":"select","required":true,"display_order":3,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"001","name":"0,6 cc"},{"code":"002","name":"1,25 cc"},{"code":"003","name":"2,5 cc"},{"code":"004","name":"5 cc"},{"code":"005","name":"7,5 cc"},{"code":"006","name":"10 cc"},{"code":"007","name":"15 cc"},{"code":"008","name":"20 cc"},{"code":"009","name":"29,6 cc"}]},{"field_key":"color","field_label":"Color","field_type":"select","required":true,"display_order":4,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":false,"shared_catalog":"COLORES","options":[]},{"field_key":"material","field_label":"Material","field_type":"select","required":true,"display_order":5,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"01","name":"ABS"},{"code":"02","name":"PEAD"},{"code":"03","name":"PET"},{"code":"04","name":"PP"},{"code":"05","name":"PS"},{"code":"06","name":"PVC"}]}]},{"classification":"PTF-AL-CJ","category_code":"PTF","group_code":"AL","group_name":"ALIMENTOS","subgroup_code":"CJ","subgroup_name":"CONJUNTOS","fields":[{"field_key":"tipo","field_label":"Tipo de conjunto","field_type":"select","required":true,"display_order":1,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"101","name":"CONJUNTO DE ENVASE CUADRADO  CON TAPA"}]},{"field_key":"boca","field_label":"Boca","field_type":"select","required":true,"display_order":2,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"001","name":"B. 20mm"},{"code":"002","name":"B. 20mm agrafe"},{"code":"003","name":"B. 24mm"},{"code":"004","name":"B. 24mm agrafe"},{"code":"005","name":"B. 26mm"},{"code":"006","name":"B. 26mm agrafe"},{"code":"007","name":"B. 28mm"},{"code":"008","name":"B. 28mm agrafe"},{"code":"009","name":"B. 33mm"},{"code":"010","name":"B. 33mm agrafe"},{"code":"011","name":"B. 38mm"},{"code":"012","name":"B. 38mm agrafe"},{"code":"013","name":"B. 50mm"},{"code":"014","name":"B. 50mm agrafe"},{"code":"015","name":"B. 53mm"},{"code":"016","name":"B. 53mm agrafe"},{"code":"017","name":"B. 57mm"},{"code":"018","name":"B. 57mm agrafe"},{"code":"019","name":"B. 75mm"},{"code":"020","name":"B. 75mm agrafe"},{"code":"021","name":"B. 120mm"},{"code":"022","name":"B. 120mm agrafe"},{"code":"023","name":"B. 90mm"},{"code":"024","name":"B. 90mm agrafe"},{"code":"025","name":"B. 100mm"},{"code":"026","name":"B. 100mm agrafe"}]},{"field_key":"capacidad","field_label":"Capacidad [mL]","field_type":"select","required":true,"display_order":3,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"001","name":"10 mL"},{"code":"002","name":"20 mL"},{"code":"003","name":"30 mL"},{"code":"004","name":"40 mL"},{"code":"005","name":"50 mL"},{"code":"006","name":"60 mL"},{"code":"007","name":"70 mL"},{"code":"008","name":"80 mL"},{"code":"009","name":"90 mL"},{"code":"010","name":"100 mL"},{"code":"011","name":"120 mL"},{"code":"012","name":"150 mL"},{"code":"013","name":"180 mL"},{"code":"014","name":"200 mL"},{"code":"015","name":"250 mL"},{"code":"016","name":"500 mL"},{"code":"017","name":"600 mL"},{"code":"018","name":"1000 mL"}]},{"field_key":"color","field_label":"Color","field_type":"select","required":true,"display_order":4,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":false,"shared_catalog":"COLORES","options":[]},{"field_key":"material","field_label":"Material","field_type":"select","required":true,"display_order":5,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"01","name":"ABS"},{"code":"02","name":"PEAD"},{"code":"03","name":"PET"},{"code":"04","name":"PP"},{"code":"05","name":"PS"},{"code":"06","name":"PVC"}]}]},{"classification":"PTF-ES-EN","category_code":"PTF","group_code":"ES","group_name":"ESPECIALES","subgroup_code":"EN","subgroup_name":"ENVASES","fields":[{"field_key":"tipo","field_label":"Tipo de envase","field_type":"select","required":true,"display_order":1,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"101","name":"CRISTO"}]},{"field_key":"boca","field_label":"Boca","field_type":"select","required":true,"display_order":2,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"001","name":"B. 20mm"},{"code":"002","name":"B. 20mm agrafe"},{"code":"003","name":"B. 24mm"},{"code":"004","name":"B. 24mm agrafe"},{"code":"005","name":"B. 26mm"},{"code":"006","name":"B. 26mm agrafe"},{"code":"007","name":"B. 28mm"},{"code":"008","name":"B. 28mm agrafe"},{"code":"009","name":"B. 33mm"},{"code":"010","name":"B. 33mm agrafe"},{"code":"011","name":"B. 38mm"},{"code":"012","name":"B. 38mm agrafe"},{"code":"013","name":"B. 50mm"},{"code":"014","name":"B. 50mm agrafe"},{"code":"015","name":"B. 53mm"},{"code":"016","name":"B. 53mm agrafe"},{"code":"017","name":"B. 57mm"},{"code":"018","name":"B. 57mm agrafe"},{"code":"019","name":"B. 75mm"},{"code":"020","name":"B. 75mm agrafe"},{"code":"021","name":"B. 90mm"},{"code":"022","name":"B. 90mm agrafe"}]},{"field_key":"capacidad","field_label":"Capacidad [mL]","field_type":"select","required":true,"display_order":3,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"001","name":"10 mL"},{"code":"002","name":"20 mL"},{"code":"003","name":"30 mL"},{"code":"004","name":"40 mL"},{"code":"005","name":"50 mL"},{"code":"006","name":"60 mL"},{"code":"007","name":"70 mL"},{"code":"008","name":"80 mL"},{"code":"009","name":"90 mL"},{"code":"010","name":"100 mL"},{"code":"011","name":"120 mL"},{"code":"012","name":"150 mL"},{"code":"013","name":"180 mL"},{"code":"014","name":"200 mL"},{"code":"015","name":"250 mL"},{"code":"016","name":"446 mL"},{"code":"017","name":"500 mL"},{"code":"018","name":"600 mL"},{"code":"019","name":"1000 mL"}]},{"field_key":"color","field_label":"Color","field_type":"select","required":true,"display_order":4,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":false,"shared_catalog":"COLORES","options":[]},{"field_key":"material","field_label":"Material","field_type":"select","required":true,"display_order":5,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"01","name":"ABS"},{"code":"02","name":"PEAD"},{"code":"03","name":"PET"},{"code":"04","name":"PP"},{"code":"05","name":"PS"},{"code":"06","name":"PVC"}]}]},{"classification":"PTF-FM-CJ","category_code":"PTF","group_code":"FM","group_name":"FARMA","subgroup_code":"CJ","subgroup_name":"COMPONENTES JERINGAS","fields":[{"field_key":"tipo","field_label":"Tipo de componente","field_type":"select","required":true,"display_order":1,"code_length":4,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"1001","name":"CILINDRO"},{"code":"1002","name":"ÉMBOLO"},{"code":"1003","name":"PISTÓN"},{"code":"1004","name":"TAPÓN"}]},{"field_key":"acabado","field_label":"Acabado","field_type":"select","required":true,"display_order":2,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"01","name":"MASTITIS CANULA CORTA"},{"code":"02","name":"PARA PISTÓN DOSIFICADOR"},{"code":"03","name":"CONO REGULAR"}]},{"field_key":"capacidad","field_label":"Capacidad [mL]","field_type":"select","required":true,"display_order":3,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"001","name":"1 mL"},{"code":"002","name":"2 mL"},{"code":"003","name":"5 mL"},{"code":"004","name":"10 mL"},{"code":"005","name":"15 mL"},{"code":"006","name":"20 mL"}]},{"field_key":"color","field_label":"Color","field_type":"select","required":true,"display_order":4,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":false,"shared_catalog":"COLORES","options":[]},{"field_key":"material","field_label":"Material","field_type":"select","required":true,"display_order":5,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"01","name":"ABS"},{"code":"02","name":"PEAD"},{"code":"03","name":"PET"},{"code":"04","name":"PP"},{"code":"05","name":"PS"},{"code":"06","name":"PVC"},{"code":"07","name":"PE"},{"code":"08","name":"TPE"}]}]},{"classification":"PTF-FM-JG","category_code":"PTF","group_code":"FM","group_name":"FARMA","subgroup_code":"JG","subgroup_name":"JERINGAS","fields":[{"field_key":"tipo","field_label":"Tipo de jeringa","field_type":"select","required":true,"display_order":1,"code_length":4,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"1001","name":"CONO CORRIENTE"},{"code":"1002","name":"CONO DOSIFICADOR"},{"code":"1003","name":"CORRIENTE"},{"code":"1004","name":"DOSIFICADORA"},{"code":"1005","name":"EQUINA"},{"code":"1006","name":"INTRAMAMARIA"}]},{"field_key":"acabado","field_label":"Acabado","field_type":"select","required":true,"display_order":2,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"01","name":"MASTITIS CANULA CORTA"}]},{"field_key":"capacidad","field_label":"Capacidad [mL]","field_type":"select","required":true,"display_order":3,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"001","name":"1 mL"},{"code":"002","name":"2 mL"},{"code":"003","name":"5 mL"},{"code":"004","name":"10 mL"},{"code":"005","name":"15 mL"},{"code":"006","name":"20 mL"}]},{"field_key":"color","field_label":"Color","field_type":"select","required":true,"display_order":4,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":false,"shared_catalog":"COLORES","options":[]},{"field_key":"material","field_label":"Material","field_type":"select","required":true,"display_order":5,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"01","name":"ABS"},{"code":"02","name":"PEAD"},{"code":"03","name":"PET"},{"code":"04","name":"PP"},{"code":"05","name":"PS"},{"code":"06","name":"PVC"},{"code":"07","name":"PE"}]}]},{"classification":"PTF-RT-PP","category_code":"PTF","group_code":"RT","group_name":"RETAIL","subgroup_code":"PP","subgroup_name":"PORTA PRECIOS","fields":[{"field_key":"tipo","field_label":"Tipo","field_type":"select","required":true,"display_order":1,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"101","name":"PERFIL REGLETA DESLIZANTE"},{"code":"102","name":"PORTA PRECIO DESLIZANTE"},{"code":"103","name":"COMBO PORTA PRECIO REGLETA DESLIZANTE"},{"code":"104","name":"PORTA PRECIO EN ANGULO DE 90°"},{"code":"105","name":"PORTA PRECIO EN ANGULO DE 135°"},{"code":"106","name":"PORTA PRECIO EN L ABATIBLE"},{"code":"107","name":"PORTA PRECIO MAXI BISAGRA"},{"code":"108","name":"PORTA PRECIO PLANO"},{"code":"109","name":"PORTA PRECIO PLANO SIN SELLE"},{"code":"110","name":"PORTA PRECIO 3 GUÍAS"},{"code":"111","name":"PORTA PRECIO BLISTER"},{"code":"112","name":"PORTA PRECIO CENTRAL"},{"code":"113","name":"PORTA PRECIO CLIP"},{"code":"114","name":"PORTA PRECIO E26 ABATIBLE"},{"code":"115","name":"PORTA PRECIO E32 ABATIBLE"},{"code":"116","name":"PORTA PRECIO ENGANCHE INTERNO"},{"code":"117","name":"PORTA PRECIO EN E ABATIBLE"},{"code":"118","name":"PORTA PRECIO DOBLE IB"},{"code":"119","name":"PORTA PRECIO INVERTIDO"},{"code":"120","name":"PORTA PRECIO EN C"},{"code":"121","name":"PORTA PRECIO PARA VIDRIO"},{"code":"122","name":"PORTA PRECIO REDONDO"},{"code":"123","name":"PORTA PRECIO SOLAPA PASO 37"}]},{"field_key":"altura","field_label":"Altura [cm]","field_type":"select","required":true,"display_order":2,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"001","name":"2.5 cm"},{"code":"002","name":"3.5 cm"},{"code":"003","name":"3.7 cm"},{"code":"004","name":"4 cm"},{"code":"005","name":"6.5 cm"},{"code":"006","name":"7.5 cm"},{"code":"007","name":"8 cm"},{"code":"008","name":"9 cm"},{"code":"009","name":"10 cm"},{"code":"010","name":"21 cm"}]},{"field_key":"acabado","field_label":"Acabado","field_type":"select","required":true,"display_order":3,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"001","name":"ADH SENCILLO DE 1/2\""},{"code":"002","name":"ADH SENCILLO DE 1\""},{"code":"003","name":"ADH DOBLE DE 1/2\""},{"code":"004","name":"ADH DOBLE DE 1\""},{"code":"005","name":"ADH ESPUMOSO SENCILLO DE 1/2\""},{"code":"006","name":"ADH ESPUMOSO SENCILLO DE 1\""},{"code":"007","name":"ADH ESPUMOSO DOBLE DE 1/2\""},{"code":"008","name":"ADH ESPUMOSO DOBLE DE 1\""},{"code":"009","name":"IMANTADO"},{"code":"010","name":"S.A"}]},{"field_key":"color","field_label":"Color","field_type":"select","required":true,"display_order":4,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":false,"shared_catalog":"COLORES","options":[]},{"field_key":"material","field_label":"Material","field_type":"select","required":true,"display_order":5,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"01","name":"ABS"},{"code":"02","name":"PEAD"},{"code":"03","name":"PET"},{"code":"04","name":"PP"},{"code":"05","name":"PS"},{"code":"06","name":"PVC"},{"code":"07","name":"HIPS"}]}]},{"classification":"SER-PP-TR","category_code":"SER","group_code":"PP","group_name":"PRODUCCIÓN Y TALLER","subgroup_code":"TR","subgroup_name":"TALLER","fields":[{"field_key":"tipo_servicio","field_label":"Tipo de servicio","field_type":"select","required":true,"display_order":1,"code_length":9,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"000000001","name":"INYECCION"},{"code":"000000002","name":"EXTRUSION"},{"code":"000000003","name":"SOPLADO"},{"code":"000000004","name":"MARCA"},{"code":"000000005","name":"ENSAMBLE"},{"code":"000000006","name":"CORTE"},{"code":"000000007","name":"EMPAQUE"},{"code":"000000008","name":"ACONDICIONAMIENTO"},{"code":"000000009","name":"RECTIFICADO"},{"code":"000000010","name":"DISENO"}]},{"field_key":"linea","field_label":"Línea","field_type":"select","required":true,"display_order":2,"code_length":4,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"1001","name":"ALIMENTOS"},{"code":"1002","name":"FARMACEUTICO"},{"code":"1003","name":"RETAIL"},{"code":"1004","name":"ESPECIALES"}]}]}]'::jsonb
    )
  loop
    -- ------------------------------------------------------------------------
    -- Categoría: debe existir. Esta migración no crea categorías.
    -- ------------------------------------------------------------------------
    select id, status
      into v_category_id, v_status
    from public.item_categories
    where code = v_def->>'category_code'
    limit 1;

    if v_category_id is null then
      raise exception
        'No existe la categoría % para %.',
        v_def->>'category_code',
        v_def->>'classification';
    end if;

    if v_status <> 'Activo' then
      raise exception
        'La categoría % está inactiva.',
        v_def->>'category_code';
    end if;

    -- ------------------------------------------------------------------------
    -- Grupo: crear solo si falta.
    -- ------------------------------------------------------------------------
    v_group_id := null;
    v_status := null;

    select id, status
      into v_group_id, v_status
    from public.item_groups
    where category_id = v_category_id
      and code = v_def->>'group_code'
    limit 1;

    if v_group_id is null then
      insert into public.item_groups (
        category_id,
        code,
        name,
        status
      )
      values (
        v_category_id,
        v_def->>'group_code',
        v_def->>'group_name',
        'Activo'
      )
      returning id
      into v_group_id;

      raise notice
        'Grupo creado: %-%',
        v_def->>'category_code',
        v_def->>'group_code';
    elsif v_status <> 'Activo' then
      raise exception
        'El grupo %-% existe pero está inactivo.',
        v_def->>'category_code',
        v_def->>'group_code';
    end if;

    -- ------------------------------------------------------------------------
    -- Subgrupo: crear solo si falta.
    -- ------------------------------------------------------------------------
    v_subgroup_id := null;
    v_status := null;

    select id, status
      into v_subgroup_id, v_status
    from public.item_subgroups
    where group_id = v_group_id
      and code = v_def->>'subgroup_code'
    limit 1;

    if v_subgroup_id is null then
      insert into public.item_subgroups (
        group_id,
        code,
        name,
        status
      )
      values (
        v_group_id,
        v_def->>'subgroup_code',
        v_def->>'subgroup_name',
        'Activo'
      )
      returning id
      into v_subgroup_id;

      raise notice
        'Subgrupo creado: %',
        v_def->>'classification';
    elsif v_status <> 'Activo' then
      raise exception
        'El subgrupo % existe pero está inactivo.',
        v_def->>'classification';
    end if;

    -- ------------------------------------------------------------------------
    -- Plantilla: usar el RPC oficial de CLAP si todavía no existe.
    -- ------------------------------------------------------------------------
    v_template_id := null;

    select id
      into v_template_id
    from public.item_classification_templates
    where category_code = v_def->>'category_code'
      and group_code = v_def->>'group_code'
      and subgroup_code = v_def->>'subgroup_code'
    limit 1;

    if v_template_id is null then
      select jsonb_agg(
        jsonb_build_object(
          'field_key', f.value->>'field_key',
          'field_label', f.value->>'field_label',
          'field_type', f.value->>'field_type',
          'required', (f.value->>'required')::boolean,
          'display_order', (f.value->>'display_order')::integer,
          'code_length', (f.value->>'code_length')::integer,
          'contributes_to_code',
            (f.value->>'contributes_to_code')::boolean,
          'contributes_to_name',
            (f.value->>'contributes_to_name')::boolean,
          'allow_new_options',
            (f.value->>'allow_new_options')::boolean
        )
        order by (f.value->>'display_order')::integer
      )
      into v_fields_for_rpc
      from jsonb_array_elements(v_def->'fields') as f(value);

      select public.config_create_classification_template(
        v_category_id,
        v_group_id,
        v_subgroup_id,
        v_fields_for_rpc
      )
      into v_created;

      v_template_id :=
        (v_created->>'id')::uuid;

      raise notice
        'Plantilla creada: %',
        v_def->>'classification';
    end if;

    -- ------------------------------------------------------------------------
    -- Validación estricta de estructura.
    -- Si ya existía una plantilla diferente, NO se modifica.
    -- ------------------------------------------------------------------------
    v_expected_fields :=
      jsonb_array_length(v_def->'fields');

    select count(*)
      into v_actual_fields
    from public.item_classification_template_fields
    where template_id = v_template_id
      and status = 'Activo';

    if v_actual_fields <> v_expected_fields then
      raise exception
        'La plantilla % tiene % campos activos; se esperaban %. No se modifica.',
        v_def->>'classification',
        v_actual_fields,
        v_expected_fields;
    end if;

    v_expected_length := 0;

    for v_field in
      select value
      from jsonb_array_elements(v_def->'fields')
      order by (value->>'display_order')::integer
    loop
      v_expected_length :=
        v_expected_length +
        (v_field->>'code_length')::integer;

      v_field_id := null;

      select
        id,
        field_label,
        field_type,
        display_order,
        code_length,
        required,
        contributes_to_code,
        contributes_to_name
      into
        v_field_id,
        v_current_label,
        v_current_type,
        v_current_order,
        v_current_code_length,
        v_current_required,
        v_current_code,
        v_current_name
      from public.item_classification_template_fields
      where template_id = v_template_id
        and field_key = v_field->>'field_key'
        and status = 'Activo'
      limit 1;

      if v_field_id is null then
        raise exception
          'Falta el campo "%" en la plantilla %.',
          v_field->>'field_key',
          v_def->>'classification';
      end if;

      if trim(v_current_label) <> trim(v_field->>'field_label')
         or v_current_type <> v_field->>'field_type'
         or v_current_order <> (v_field->>'display_order')::integer
         or v_current_code_length <> (v_field->>'code_length')::integer
         or v_current_required <> (v_field->>'required')::boolean
         or v_current_code <> (v_field->>'contributes_to_code')::boolean
         or v_current_name <> (v_field->>'contributes_to_name')::boolean then
        raise exception
          'La estructura existente de % / % no coincide con la definición aprobada. No se modifica.',
          v_def->>'classification',
          v_field->>'field_key';
      end if;

      -- Color: catálogo transversal único.
      if coalesce(v_field->>'shared_catalog', '') = 'COLORES' then
        update public.item_classification_template_fields
        set
          option_catalog_id = v_color_catalog_id,
          allow_new_options = false
        where id = v_field_id;
      end if;

      -- Opciones propias: agregar solo si no existen.
      if coalesce(v_field->>'shared_catalog', '') = '' then
        for v_option in
          select value
          from jsonb_array_elements(
            coalesce(v_field->'options', '[]'::jsonb)
          )
        loop
          v_code := trim(v_option->>'code');
          v_name := trim(v_option->>'name');

          if v_code !~ '^[0-9]+$' then
            raise exception
              'Código de opción no numérico en % / %: "%".',
              v_def->>'classification',
              v_field->>'field_key',
              v_code;
          end if;

          if length(v_code) >
             (v_field->>'code_length')::integer then
            raise exception
              'La opción % de % / % excede la longitud configurada.',
              v_code,
              v_def->>'classification',
              v_field->>'field_key';
          end if;

          v_existing_name := null;

          select name
            into v_existing_name
          from public.item_classification_field_options
          where template_id = v_template_id
            and field_key = v_field->>'field_key'
            and code = v_code
          limit 1;

          if v_existing_name is not null
             and upper(trim(v_existing_name)) <> upper(v_name) then
            raise exception
              'Conflicto en % / %: el código % ya significa "%", objetivo "%".',
              v_def->>'classification',
              v_field->>'field_key',
              v_code,
              v_existing_name,
              v_name;
          end if;

          if v_existing_name is null then
            if exists (
              select 1
              from public.item_classification_field_options
              where template_id = v_template_id
                and field_key = v_field->>'field_key'
                and lower(trim(name)) = lower(v_name)
                and code <> v_code
            ) then
              raise exception
                'Conflicto en % / %: la opción "%" ya existe con otro código.',
                v_def->>'classification',
                v_field->>'field_key',
                v_name;
            end if;

            insert into public.item_classification_field_options (
              template_id,
              field_key,
              code,
              name,
              status
            )
            values (
              v_template_id,
              v_field->>'field_key',
              v_code,
              v_name,
              'Activo'
            );
          end if;
        end loop;
      end if;
    end loop;

    select numeric_code_length
      into v_actual_length
    from public.item_classification_templates
    where id = v_template_id;

    if v_actual_length <> v_expected_length then
      raise exception
        'Longitud numérica inesperada en %: actual %, esperada %.',
        v_def->>'classification',
        v_actual_length,
        v_expected_length;
    end if;

    -- Activar solamente cuando toda la estructura propia está validada.
    update public.item_classification_templates
    set
      status = 'Activo',
      updated_at = now()
    where id = v_template_id;
  end loop;

  -- --------------------------------------------------------------------------
  -- 3. Sincronizar catálogo transversal → opciones legacy.
  --    El generador actual todavía consulta item_classification_field_options.
  -- --------------------------------------------------------------------------
  perform public.sync_shared_option_catalog_to_legacy(
    v_color_catalog_id
  );

  -- --------------------------------------------------------------------------
  -- 4. Validaciones finales de colores en las nuevas plantillas.
  -- --------------------------------------------------------------------------
  for v_def in
    select value
    from jsonb_array_elements(
      '[{"classification":"INS-PL-PG","category_code":"INS","group_code":"PL","group_name":"PLANTA Y MANTENIMIENTO","subgroup_code":"PG","subgroup_name":"ACEITES & PURGANTES","fields":[{"field_key":"referencia","field_label":"Referencia","field_type":"select","required":true,"display_order":1,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"101","name":"ACEITE"},{"code":"102","name":"PURGA"}]},{"field_key":"tipo","field_label":"Tipo","field_type":"select","required":true,"display_order":2,"code_length":4,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"0001","name":"NPT 451-45"}]},{"field_key":"medida","field_label":"Medida","field_type":"select","required":true,"display_order":3,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"001","name":"Bulto"},{"code":"002","name":"Garrafa"}]},{"field_key":"presentacion","field_label":"Presentación","field_type":"select","required":true,"display_order":4,"code_length":4,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"0001","name":"50 mL"},{"code":"0002","name":"100 mL"},{"code":"0003","name":"500 mL"},{"code":"0004","name":"1000 mL"},{"code":"0005","name":"50 g"},{"code":"0006","name":"100 g"},{"code":"0007","name":"454 g"},{"code":"0008","name":"500 g"},{"code":"0009","name":"1000 g"}]}]},{"classification":"MPC-AD-PG","category_code":"MPC","group_code":"AD","group_name":"ADITIVO","subgroup_code":"PG","subgroup_name":"PURGA","fields":[{"field_key":"tipo_purga","field_label":"Tipo de purga","field_type":"select","required":true,"display_order":1,"code_length":4,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"1001","name":"PURGA GRANULADA"}]},{"field_key":"referencia","field_label":"Referencia","field_type":"select","required":true,"display_order":2,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"001","name":"NPT NuPurge 451"}]},{"field_key":"presentacion","field_label":"Presentación","field_type":"select","required":true,"display_order":3,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"001","name":"LIBRAS"}]},{"field_key":"color","field_label":"Color","field_type":"select","required":true,"display_order":4,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":false,"shared_catalog":"COLORES","options":[]}]},{"classification":"MPC-AH-CN","category_code":"MPC","group_code":"AH","group_name":"ADHESIVO","subgroup_code":"CN","subgroup_name":"CINTA","fields":[{"field_key":"referencia","field_label":"Referencia","field_type":"select","required":true,"display_order":1,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"10","name":"CINTA DOBLE FAZ"}]},{"field_key":"codigo","field_label":"Código","field_type":"select","required":true,"display_order":2,"code_length":4,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"0001","name":"3M"},{"code":"0002","name":"ESPUMOSA"}]},{"field_key":"presentacion","field_label":"Presentación","field_type":"select","required":true,"display_order":3,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"01","name":"ROLLO *50 Mts"}]},{"field_key":"dimension","field_label":"Dimensión [mm]","field_type":"select","required":true,"display_order":4,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"001","name":"12 MM"}]},{"field_key":"color","field_label":"Color","field_type":"select","required":true,"display_order":5,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":false,"shared_catalog":"COLORES","options":[]}]},{"classification":"MPP-OR-PD","category_code":"MPP","group_code":"OR","group_name":"ORIGINAL","subgroup_code":"PD","subgroup_name":"POLIETILENO","fields":[{"field_key":"referencia","field_label":"Referencia","field_type":"select","required":true,"display_order":1,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"10","name":"PEAD"},{"code":"11","name":"PEBD"},{"code":"12","name":"PELBD"}]},{"field_key":"codigo","field_label":"Código","field_type":"select","required":true,"display_order":2,"code_length":4,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"0001","name":"MARLEX HHM 5502BN"},{"code":"0002","name":"BRASKEM IF 33"},{"code":"0003","name":"PAXON-AS55-003"},{"code":"0004","name":"DOW DMDA 8907 NT7"},{"code":"0005","name":"DOW DNDB 7147 NT7"}]},{"field_key":"presentacion","field_label":"Presentación","field_type":"select","required":true,"display_order":3,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"01","name":"BULTO"},{"code":"02","name":"CANECA"}]},{"field_key":"peso","field_label":"Peso [kg]","field_type":"select","required":true,"display_order":4,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"001","name":"1 KG"},{"code":"002","name":"2 KG"},{"code":"003","name":"3 KG"},{"code":"004","name":"4 KG"},{"code":"005","name":"5 KG"},{"code":"006","name":"6 KG"},{"code":"007","name":"7 KG"},{"code":"008","name":"8 KG"},{"code":"009","name":"9 KG"},{"code":"010","name":"10 KG"},{"code":"015","name":"15 KG"},{"code":"020","name":"20 KG"},{"code":"022","name":"22 KG"},{"code":"025","name":"25 KG"},{"code":"050","name":"50 KG"},{"code":"100","name":"100 KG"}]},{"field_key":"color","field_label":"Color","field_type":"select","required":true,"display_order":5,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":false,"shared_catalog":"COLORES","options":[]}]},{"classification":"PTC-RT-PO","category_code":"PTC","group_code":"RT","group_name":"RETAIL","subgroup_code":"PO","subgroup_name":"POP","fields":[{"field_key":"tipo","field_label":"Tipo de POP","field_type":"select","required":true,"display_order":1,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"101","name":"BOLSILLO"}]},{"field_key":"detalle","field_label":"Detalle","field_type":"select","required":true,"display_order":2,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"001","name":"1/4 CARTA VERTICAL PESTAÑA C. 510 mm"},{"code":"002","name":"1/4 CARTA VERTICAL COLLARIN C. 510 mm"}]},{"field_key":"dimension","field_label":"Dimensión","field_type":"select","required":true,"display_order":3,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"001","name":"14x10,5 cm / Pestaña 4,3x2 cm"},{"code":"002","name":"14x10 cm / Pestaña 16,5x4,3 cm"},{"code":"003","name":"3,7x 2,5 cm"}]},{"field_key":"color","field_label":"Color","field_type":"select","required":true,"display_order":4,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":false,"shared_catalog":"COLORES","options":[]},{"field_key":"material","field_label":"Material","field_type":"select","required":true,"display_order":5,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"01","name":"ABS"},{"code":"02","name":"PEAD"},{"code":"03","name":"PET"},{"code":"04","name":"PP"},{"code":"05","name":"PS"},{"code":"06","name":"PVC"}]}]},{"classification":"PTC-TT-CC","category_code":"PTC","group_code":"TT","group_name":"TALLER","subgroup_code":"CC","subgroup_name":"COLADAS CALIENTES","fields":[{"field_key":"categoria","field_label":"Categoría","field_type":"select","required":true,"display_order":1,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"101","name":"COLADA CALIENTE SENCILLA"},{"code":"102","name":"COLADA CALIENTE MULTIPLE"}]},{"field_key":"forma","field_label":"Forma","field_type":"select","required":true,"display_order":2,"code_length":4,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"0001","name":"CIRCULAR"}]},{"field_key":"punto_entrada","field_label":"Punto de entrada","field_type":"select","required":true,"display_order":3,"code_length":4,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"0001","name":"LATERAL"},{"code":"0002","name":"CAPILAR"}]},{"field_key":"cavidades","field_label":"Cavidades","field_type":"select","required":true,"display_order":4,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"01","name":"1 CAV"},{"code":"02","name":"2 CAV"},{"code":"03","name":"3 CAV"},{"code":"04","name":"4 CAV"}]}]},{"classification":"PTF-AL-CH","category_code":"PTF","group_code":"AL","group_name":"ALIMENTOS","subgroup_code":"CH","subgroup_name":"CUCHARAS","fields":[{"field_key":"tipo","field_label":"Tipo de cuchara","field_type":"select","required":true,"display_order":1,"code_length":4,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"1001","name":"CUCHARA DOSIFICADORA"}]},{"field_key":"acabado","field_label":"Acabado","field_type":"select","required":true,"display_order":2,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"01","name":"CIRCULAR"},{"code":"02","name":"CUADRADA"}]},{"field_key":"capacidad","field_label":"Capacidad [cc]","field_type":"select","required":true,"display_order":3,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"001","name":"0,6 cc"},{"code":"002","name":"1,25 cc"},{"code":"003","name":"2,5 cc"},{"code":"004","name":"5 cc"},{"code":"005","name":"7,5 cc"},{"code":"006","name":"10 cc"},{"code":"007","name":"15 cc"},{"code":"008","name":"20 cc"},{"code":"009","name":"29,6 cc"}]},{"field_key":"color","field_label":"Color","field_type":"select","required":true,"display_order":4,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":false,"shared_catalog":"COLORES","options":[]},{"field_key":"material","field_label":"Material","field_type":"select","required":true,"display_order":5,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"01","name":"ABS"},{"code":"02","name":"PEAD"},{"code":"03","name":"PET"},{"code":"04","name":"PP"},{"code":"05","name":"PS"},{"code":"06","name":"PVC"}]}]},{"classification":"PTF-AL-CJ","category_code":"PTF","group_code":"AL","group_name":"ALIMENTOS","subgroup_code":"CJ","subgroup_name":"CONJUNTOS","fields":[{"field_key":"tipo","field_label":"Tipo de conjunto","field_type":"select","required":true,"display_order":1,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"101","name":"CONJUNTO DE ENVASE CUADRADO  CON TAPA"}]},{"field_key":"boca","field_label":"Boca","field_type":"select","required":true,"display_order":2,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"001","name":"B. 20mm"},{"code":"002","name":"B. 20mm agrafe"},{"code":"003","name":"B. 24mm"},{"code":"004","name":"B. 24mm agrafe"},{"code":"005","name":"B. 26mm"},{"code":"006","name":"B. 26mm agrafe"},{"code":"007","name":"B. 28mm"},{"code":"008","name":"B. 28mm agrafe"},{"code":"009","name":"B. 33mm"},{"code":"010","name":"B. 33mm agrafe"},{"code":"011","name":"B. 38mm"},{"code":"012","name":"B. 38mm agrafe"},{"code":"013","name":"B. 50mm"},{"code":"014","name":"B. 50mm agrafe"},{"code":"015","name":"B. 53mm"},{"code":"016","name":"B. 53mm agrafe"},{"code":"017","name":"B. 57mm"},{"code":"018","name":"B. 57mm agrafe"},{"code":"019","name":"B. 75mm"},{"code":"020","name":"B. 75mm agrafe"},{"code":"021","name":"B. 120mm"},{"code":"022","name":"B. 120mm agrafe"},{"code":"023","name":"B. 90mm"},{"code":"024","name":"B. 90mm agrafe"},{"code":"025","name":"B. 100mm"},{"code":"026","name":"B. 100mm agrafe"}]},{"field_key":"capacidad","field_label":"Capacidad [mL]","field_type":"select","required":true,"display_order":3,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"001","name":"10 mL"},{"code":"002","name":"20 mL"},{"code":"003","name":"30 mL"},{"code":"004","name":"40 mL"},{"code":"005","name":"50 mL"},{"code":"006","name":"60 mL"},{"code":"007","name":"70 mL"},{"code":"008","name":"80 mL"},{"code":"009","name":"90 mL"},{"code":"010","name":"100 mL"},{"code":"011","name":"120 mL"},{"code":"012","name":"150 mL"},{"code":"013","name":"180 mL"},{"code":"014","name":"200 mL"},{"code":"015","name":"250 mL"},{"code":"016","name":"500 mL"},{"code":"017","name":"600 mL"},{"code":"018","name":"1000 mL"}]},{"field_key":"color","field_label":"Color","field_type":"select","required":true,"display_order":4,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":false,"shared_catalog":"COLORES","options":[]},{"field_key":"material","field_label":"Material","field_type":"select","required":true,"display_order":5,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"01","name":"ABS"},{"code":"02","name":"PEAD"},{"code":"03","name":"PET"},{"code":"04","name":"PP"},{"code":"05","name":"PS"},{"code":"06","name":"PVC"}]}]},{"classification":"PTF-ES-EN","category_code":"PTF","group_code":"ES","group_name":"ESPECIALES","subgroup_code":"EN","subgroup_name":"ENVASES","fields":[{"field_key":"tipo","field_label":"Tipo de envase","field_type":"select","required":true,"display_order":1,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"101","name":"CRISTO"}]},{"field_key":"boca","field_label":"Boca","field_type":"select","required":true,"display_order":2,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"001","name":"B. 20mm"},{"code":"002","name":"B. 20mm agrafe"},{"code":"003","name":"B. 24mm"},{"code":"004","name":"B. 24mm agrafe"},{"code":"005","name":"B. 26mm"},{"code":"006","name":"B. 26mm agrafe"},{"code":"007","name":"B. 28mm"},{"code":"008","name":"B. 28mm agrafe"},{"code":"009","name":"B. 33mm"},{"code":"010","name":"B. 33mm agrafe"},{"code":"011","name":"B. 38mm"},{"code":"012","name":"B. 38mm agrafe"},{"code":"013","name":"B. 50mm"},{"code":"014","name":"B. 50mm agrafe"},{"code":"015","name":"B. 53mm"},{"code":"016","name":"B. 53mm agrafe"},{"code":"017","name":"B. 57mm"},{"code":"018","name":"B. 57mm agrafe"},{"code":"019","name":"B. 75mm"},{"code":"020","name":"B. 75mm agrafe"},{"code":"021","name":"B. 90mm"},{"code":"022","name":"B. 90mm agrafe"}]},{"field_key":"capacidad","field_label":"Capacidad [mL]","field_type":"select","required":true,"display_order":3,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"001","name":"10 mL"},{"code":"002","name":"20 mL"},{"code":"003","name":"30 mL"},{"code":"004","name":"40 mL"},{"code":"005","name":"50 mL"},{"code":"006","name":"60 mL"},{"code":"007","name":"70 mL"},{"code":"008","name":"80 mL"},{"code":"009","name":"90 mL"},{"code":"010","name":"100 mL"},{"code":"011","name":"120 mL"},{"code":"012","name":"150 mL"},{"code":"013","name":"180 mL"},{"code":"014","name":"200 mL"},{"code":"015","name":"250 mL"},{"code":"016","name":"446 mL"},{"code":"017","name":"500 mL"},{"code":"018","name":"600 mL"},{"code":"019","name":"1000 mL"}]},{"field_key":"color","field_label":"Color","field_type":"select","required":true,"display_order":4,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":false,"shared_catalog":"COLORES","options":[]},{"field_key":"material","field_label":"Material","field_type":"select","required":true,"display_order":5,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"01","name":"ABS"},{"code":"02","name":"PEAD"},{"code":"03","name":"PET"},{"code":"04","name":"PP"},{"code":"05","name":"PS"},{"code":"06","name":"PVC"}]}]},{"classification":"PTF-FM-CJ","category_code":"PTF","group_code":"FM","group_name":"FARMA","subgroup_code":"CJ","subgroup_name":"COMPONENTES JERINGAS","fields":[{"field_key":"tipo","field_label":"Tipo de componente","field_type":"select","required":true,"display_order":1,"code_length":4,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"1001","name":"CILINDRO"},{"code":"1002","name":"ÉMBOLO"},{"code":"1003","name":"PISTÓN"},{"code":"1004","name":"TAPÓN"}]},{"field_key":"acabado","field_label":"Acabado","field_type":"select","required":true,"display_order":2,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"01","name":"MASTITIS CANULA CORTA"},{"code":"02","name":"PARA PISTÓN DOSIFICADOR"},{"code":"03","name":"CONO REGULAR"}]},{"field_key":"capacidad","field_label":"Capacidad [mL]","field_type":"select","required":true,"display_order":3,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"001","name":"1 mL"},{"code":"002","name":"2 mL"},{"code":"003","name":"5 mL"},{"code":"004","name":"10 mL"},{"code":"005","name":"15 mL"},{"code":"006","name":"20 mL"}]},{"field_key":"color","field_label":"Color","field_type":"select","required":true,"display_order":4,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":false,"shared_catalog":"COLORES","options":[]},{"field_key":"material","field_label":"Material","field_type":"select","required":true,"display_order":5,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"01","name":"ABS"},{"code":"02","name":"PEAD"},{"code":"03","name":"PET"},{"code":"04","name":"PP"},{"code":"05","name":"PS"},{"code":"06","name":"PVC"},{"code":"07","name":"PE"},{"code":"08","name":"TPE"}]}]},{"classification":"PTF-FM-JG","category_code":"PTF","group_code":"FM","group_name":"FARMA","subgroup_code":"JG","subgroup_name":"JERINGAS","fields":[{"field_key":"tipo","field_label":"Tipo de jeringa","field_type":"select","required":true,"display_order":1,"code_length":4,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"1001","name":"CONO CORRIENTE"},{"code":"1002","name":"CONO DOSIFICADOR"},{"code":"1003","name":"CORRIENTE"},{"code":"1004","name":"DOSIFICADORA"},{"code":"1005","name":"EQUINA"},{"code":"1006","name":"INTRAMAMARIA"}]},{"field_key":"acabado","field_label":"Acabado","field_type":"select","required":true,"display_order":2,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"01","name":"MASTITIS CANULA CORTA"}]},{"field_key":"capacidad","field_label":"Capacidad [mL]","field_type":"select","required":true,"display_order":3,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"001","name":"1 mL"},{"code":"002","name":"2 mL"},{"code":"003","name":"5 mL"},{"code":"004","name":"10 mL"},{"code":"005","name":"15 mL"},{"code":"006","name":"20 mL"}]},{"field_key":"color","field_label":"Color","field_type":"select","required":true,"display_order":4,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":false,"shared_catalog":"COLORES","options":[]},{"field_key":"material","field_label":"Material","field_type":"select","required":true,"display_order":5,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"01","name":"ABS"},{"code":"02","name":"PEAD"},{"code":"03","name":"PET"},{"code":"04","name":"PP"},{"code":"05","name":"PS"},{"code":"06","name":"PVC"},{"code":"07","name":"PE"}]}]},{"classification":"PTF-RT-PP","category_code":"PTF","group_code":"RT","group_name":"RETAIL","subgroup_code":"PP","subgroup_name":"PORTA PRECIOS","fields":[{"field_key":"tipo","field_label":"Tipo","field_type":"select","required":true,"display_order":1,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"101","name":"PERFIL REGLETA DESLIZANTE"},{"code":"102","name":"PORTA PRECIO DESLIZANTE"},{"code":"103","name":"COMBO PORTA PRECIO REGLETA DESLIZANTE"},{"code":"104","name":"PORTA PRECIO EN ANGULO DE 90°"},{"code":"105","name":"PORTA PRECIO EN ANGULO DE 135°"},{"code":"106","name":"PORTA PRECIO EN L ABATIBLE"},{"code":"107","name":"PORTA PRECIO MAXI BISAGRA"},{"code":"108","name":"PORTA PRECIO PLANO"},{"code":"109","name":"PORTA PRECIO PLANO SIN SELLE"},{"code":"110","name":"PORTA PRECIO 3 GUÍAS"},{"code":"111","name":"PORTA PRECIO BLISTER"},{"code":"112","name":"PORTA PRECIO CENTRAL"},{"code":"113","name":"PORTA PRECIO CLIP"},{"code":"114","name":"PORTA PRECIO E26 ABATIBLE"},{"code":"115","name":"PORTA PRECIO E32 ABATIBLE"},{"code":"116","name":"PORTA PRECIO ENGANCHE INTERNO"},{"code":"117","name":"PORTA PRECIO EN E ABATIBLE"},{"code":"118","name":"PORTA PRECIO DOBLE IB"},{"code":"119","name":"PORTA PRECIO INVERTIDO"},{"code":"120","name":"PORTA PRECIO EN C"},{"code":"121","name":"PORTA PRECIO PARA VIDRIO"},{"code":"122","name":"PORTA PRECIO REDONDO"},{"code":"123","name":"PORTA PRECIO SOLAPA PASO 37"}]},{"field_key":"altura","field_label":"Altura [cm]","field_type":"select","required":true,"display_order":2,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"001","name":"2.5 cm"},{"code":"002","name":"3.5 cm"},{"code":"003","name":"3.7 cm"},{"code":"004","name":"4 cm"},{"code":"005","name":"6.5 cm"},{"code":"006","name":"7.5 cm"},{"code":"007","name":"8 cm"},{"code":"008","name":"9 cm"},{"code":"009","name":"10 cm"},{"code":"010","name":"21 cm"}]},{"field_key":"acabado","field_label":"Acabado","field_type":"select","required":true,"display_order":3,"code_length":3,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"001","name":"ADH SENCILLO DE 1/2\""},{"code":"002","name":"ADH SENCILLO DE 1\""},{"code":"003","name":"ADH DOBLE DE 1/2\""},{"code":"004","name":"ADH DOBLE DE 1\""},{"code":"005","name":"ADH ESPUMOSO SENCILLO DE 1/2\""},{"code":"006","name":"ADH ESPUMOSO SENCILLO DE 1\""},{"code":"007","name":"ADH ESPUMOSO DOBLE DE 1/2\""},{"code":"008","name":"ADH ESPUMOSO DOBLE DE 1\""},{"code":"009","name":"IMANTADO"},{"code":"010","name":"S.A"}]},{"field_key":"color","field_label":"Color","field_type":"select","required":true,"display_order":4,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":false,"shared_catalog":"COLORES","options":[]},{"field_key":"material","field_label":"Material","field_type":"select","required":true,"display_order":5,"code_length":2,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"01","name":"ABS"},{"code":"02","name":"PEAD"},{"code":"03","name":"PET"},{"code":"04","name":"PP"},{"code":"05","name":"PS"},{"code":"06","name":"PVC"},{"code":"07","name":"HIPS"}]}]},{"classification":"SER-PP-TR","category_code":"SER","group_code":"PP","group_name":"PRODUCCIÓN Y TALLER","subgroup_code":"TR","subgroup_name":"TALLER","fields":[{"field_key":"tipo_servicio","field_label":"Tipo de servicio","field_type":"select","required":true,"display_order":1,"code_length":9,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"000000001","name":"INYECCION"},{"code":"000000002","name":"EXTRUSION"},{"code":"000000003","name":"SOPLADO"},{"code":"000000004","name":"MARCA"},{"code":"000000005","name":"ENSAMBLE"},{"code":"000000006","name":"CORTE"},{"code":"000000007","name":"EMPAQUE"},{"code":"000000008","name":"ACONDICIONAMIENTO"},{"code":"000000009","name":"RECTIFICADO"},{"code":"000000010","name":"DISENO"}]},{"field_key":"linea","field_label":"Línea","field_type":"select","required":true,"display_order":2,"code_length":4,"contributes_to_code":true,"contributes_to_name":true,"allow_new_options":true,"shared_catalog":null,"options":[{"code":"1001","name":"ALIMENTOS"},{"code":"1002","name":"FARMACEUTICO"},{"code":"1003","name":"RETAIL"},{"code":"1004","name":"ESPECIALES"}]}]}]'::jsonb
    )
  loop
    if exists (
      select 1
      from jsonb_array_elements(v_def->'fields') f(value)
      where f.value->>'shared_catalog' = 'COLORES'
    ) then
      select id
        into v_template_id
      from public.item_classification_templates
      where category_code = v_def->>'category_code'
        and group_code = v_def->>'group_code'
        and subgroup_code = v_def->>'subgroup_code'
      limit 1;

      if not exists (
        select 1
        from public.item_classification_template_fields
        where template_id = v_template_id
          and field_key = 'color'
          and option_catalog_id = v_color_catalog_id
          and status = 'Activo'
      ) then
        raise exception
          'El campo Color de % no quedó enlazado al catálogo transversal.',
          v_def->>'classification';
      end if;

      if not exists (
        select 1
        from public.item_classification_field_options
        where template_id = v_template_id
          and field_key = 'color'
          and code = '20'
          and upper(trim(name)) = 'TRANSPARENTE'
          and status = 'Activo'
      ) then
        raise exception
          'No se sincronizó 20=TRANSPARENTE en %.',
          v_def->>'classification';
      end if;

      if not exists (
        select 1
        from public.item_classification_field_options
        where template_id = v_template_id
          and field_key = 'color'
          and code = '21'
          and upper(trim(name)) = 'DORADO'
          and status = 'Activo'
      ) then
        raise exception
          'No se sincronizó 21=DORADO en %.',
          v_def->>'classification';
      end if;
    end if;
  end loop;

  raise notice
    'Fase 1 completada: 13 clasificaciones SIIGO configuradas; productos y SIIGO no fueron modificados.';
end
$clap$;

commit;
