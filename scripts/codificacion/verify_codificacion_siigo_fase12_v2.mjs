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
  {
    "classification": "PTF-RT-PP",
    "field_key": "material",
    "code": "06",
    "name": "PVC"
  },
  {
    "classification": "SER-PP-TR",
    "field_key": "tipo_servicio",
    "code": "000000003",
    "name": "SOPLADO"
  },
  {
    "classification": "SER-PP-TR",
    "field_key": "tipo_servicio",
    "code": "000000009",
    "name": "RECTIFICADO"
  },
  {
    "classification": "SER-PP-TR",
    "field_key": "linea",
    "code": "1004",
    "name": "ESPECIALES"
  }
];

function norm(value) {
  return String(value ?? "").trim().toUpperCase();
}

async function read(table) {
  const pageSize = 1000;
  let from = 0;
  const all = [];

  while (true) {
    const { data, error } =
      await supabase
        .from(table)
        .select("*")
        .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }

    const page = data ?? [];
    all.push(...page);

    if (page.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return all;
}

const [templates, fields, options] =
  await Promise.all([
    read("item_classification_templates"),
    read("item_classification_template_fields"),
    read("item_classification_field_options"),
  ]);

console.log(`Filas cargadas · plantillas: ${templates.length} · campos: ${fields.length} · opciones: ${options.length}`);

const rows = [];
const problems = [];

for (const item of expected) {
  const [category, group, subgroup] =
    item.classification.split("-");

  const template =
    templates.find(
      t =>
        norm(t.category_code) === category &&
        norm(t.group_code) === group &&
        norm(t.subgroup_code) === subgroup &&
        norm(t.status) === "ACTIVO"
    );

  const field =
    template
      ? fields.find(
          f =>
            f.template_id === template.id &&
            f.field_key === item.field_key &&
            norm(f.status) === "ACTIVO"
        )
      : null;

  const option =
    template
      ? options.find(
          o =>
            o.template_id === template.id &&
            o.field_key === item.field_key &&
            String(o.code) === item.code &&
            norm(o.status) === "ACTIVO"
        )
      : null;

  const ok =
    Boolean(
      template &&
      field &&
      option &&
      norm(option.name) === norm(item.name)
    );

  rows.push({
    clasificacion: item.classification,
    campo: item.field_key,
    codigo: item.code,
    esperado: item.name,
    actual: option?.name ?? "(falta)",
    ok,
  });

  if (!ok) {
    problems.push(
      `${item.classification} / ${item.field_key} / ${item.code}`
    );
  }
}

console.log("\n===== FASE 1.2 · 4 OPCIONES =====");
console.table(rows);

if (problems.length) {
  console.log("\n❌ PROBLEMAS");
  for (const problem of problems) console.log("-", problem);
  process.exitCode = 1;
} else {
  console.log("\n✅ Las 4 opciones quedaron verificadas.");
}

console.log("\n✅ Solo lectura. No se modificó Supabase.");
