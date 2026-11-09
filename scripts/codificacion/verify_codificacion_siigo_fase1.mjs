import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

const expected = [
  "INS-PL-PG",
  "MPC-AD-PG",
  "MPC-AH-CN",
  "MPP-OR-PD",
  "PTC-RT-PO",
  "PTC-TT-CC",
  "PTF-AL-CH",
  "PTF-AL-CJ",
  "PTF-ES-EN",
  "PTF-FM-CJ",
  "PTF-FM-JG",
  "PTF-RT-PP",
  "SER-PP-TR",
];

function norm(value) {
  return String(value ?? "").trim().toUpperCase();
}

async function read(table, select = "*") {
  const { data, error } =
    await supabase.from(table).select(select);

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }

  return data ?? [];
}

const [
  templates,
  fields,
  options,
  catalogs,
  catalogValues,
  products,
] = await Promise.all([
  read("item_classification_templates"),
  read("item_classification_template_fields"),
  read("item_classification_field_options"),
  read("item_option_catalogs"),
  read("item_option_catalog_values"),
  read(
    "products",
    "id, final_code, reference, name, classification_code, siigo_product_id",
  ),
]);

const colorCatalog =
  catalogs.find(
    (item) =>
      norm(item.code) === "COLORES" &&
      norm(item.status) === "ACTIVO",
  );

if (!colorCatalog) {
  throw new Error("No existe catálogo COLORES activo.");
}

const colorValues =
  catalogValues
    .filter(
      (item) =>
        item.catalog_id === colorCatalog.id &&
        norm(item.status) === "ACTIVO",
    )
    .map(
      (item) => ({
        code: String(item.code),
        name: norm(item.name),
      }),
    );

const color20 =
  colorValues.find((item) => item.code === "20");

const color21 =
  colorValues.find((item) => item.code === "21");

console.log("\n===== CATÁLOGO COLORES =====");
console.table([
  {
    code: "20",
    esperado: "TRANSPARENTE",
    actual: color20?.name ?? "(falta)",
  },
  {
    code: "21",
    esperado: "DORADO",
    actual: color21?.name ?? "(falta)",
  },
]);

const rows = [];

for (const classification of expected) {
  const [category, group, subgroup] =
    classification.split("-");

  const matches =
    templates.filter(
      (template) =>
        norm(template.category_code) === category &&
        norm(template.group_code) === group &&
        norm(template.subgroup_code) === subgroup,
    );

  const active =
    matches.filter(
      (template) =>
        norm(template.status) === "ACTIVO",
    );

  const template = active[0];

  const templateFields =
    template
      ? fields
          .filter(
            (field) =>
              field.template_id === template.id &&
              norm(field.status) === "ACTIVO",
          )
          .sort(
            (a, b) =>
              Number(a.display_order ?? 0) -
              Number(b.display_order ?? 0),
          )
      : [];

  const colorField =
    templateFields.find(
      (field) =>
        field.field_key === "color",
    );

  const siigoProducts =
    products.filter((product) => {
      if (!product.siigo_product_id) {
        return false;
      }

      const code =
        norm(
          product.final_code ??
            product.reference ??
            "",
        );

      return (
        norm(product.classification_code) ===
          classification ||
        code.startsWith(`${classification}-`) ||
        code.startsWith(classification)
      );
    });

  rows.push({
    clasificacion: classification,
    plantillas_total: matches.length,
    activas: active.length,
    campos: templateFields.length,
    longitud:
      template?.numeric_code_length ?? null,
    color_global:
      colorField
        ? colorField.option_catalog_id ===
          colorCatalog.id
        : "N/A",
    productos_siigo: siigoProducts.length,
  });
}

console.log("\n===== 13 CLASIFICACIONES =====");
console.table(rows);

const problems = [];

for (const row of rows) {
  if (row.plantillas_total !== 1) {
    problems.push(
      `${row.clasificacion}: ${row.plantillas_total} plantillas`,
    );
  }

  if (row.activas !== 1) {
    problems.push(
      `${row.clasificacion}: ${row.activas} plantillas activas`,
    );
  }

  if (row.productos_siigo < 1) {
    problems.push(
      `${row.clasificacion}: no tiene producto SIIGO; no debía entrar en esta fase`,
    );
  }

  if (row.color_global === false) {
    problems.push(
      `${row.clasificacion}: Color no usa catálogo global`,
    );
  }
}

if (color20?.name !== "TRANSPARENTE") {
  problems.push("Color 20 no es TRANSPARENTE.");
}

if (color21?.name !== "DORADO") {
  problems.push("Color 21 no es DORADO.");
}

if (problems.length) {
  console.log("\n❌ PROBLEMAS");
  for (const problem of problems) {
    console.log("-", problem);
  }
  process.exitCode = 1;
} else {
  console.log(
    "\n✅ Fase 1 verificada. Configuración consistente.",
  );
}

console.log(
  "\n✅ Solo lectura. Este verificador no modifica Supabase.",
);
