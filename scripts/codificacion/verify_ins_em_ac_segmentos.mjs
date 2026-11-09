import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const { data: templates, error: te } =
  await supabase
    .from("item_classification_templates")
    .select("*")
    .eq("category_code", "INS")
    .eq("group_code", "EM")
    .eq("subgroup_code", "AC");

if (te) throw te;

const active =
  templates.filter(
    t => t.status === "Activo",
  );

if (templates.length !== 1 || active.length !== 1) {
  throw new Error(
    `Plantillas INS-EM-AC=${templates.length}; activas=${active.length}`,
  );
}

const template = active[0];

const { data: fields, error: fe } =
  await supabase
    .from("item_classification_template_fields")
    .select("*")
    .eq("template_id", template.id)
    .eq("status", "Activo")
    .order("display_order");

if (fe) throw fe;

const lengths =
  Object.fromEntries(
    fields.map(
      f => [f.field_key, Number(f.code_length)],
    ),
  );

const expectedLengths = {
  referencia: 3,
  tipo: 4,
  medida: 4,
  calibre: 2,
};

for (const [key, expected] of Object.entries(expectedLengths)) {
  if (lengths[key] !== expected) {
    throw new Error(
      `${key}: longitud=${lengths[key]}, esperado=${expected}`,
    );
  }
}

const { data: options, error: oe } =
  await supabase
    .from("item_classification_field_options")
    .select("field_key,code,name,status")
    .eq("template_id", template.id)
    .in("field_key", ["medida", "calibre"])
    .eq("status", "Activo");

if (oe) throw oe;

const wanted = [
  ["medida", "0001", "50 mt"],
  ["medida", "0002", "100 mt"],
  ["medida", "0003", "1,5 mt"],
  ["calibre", "01", "48 micras"],
  ["calibre", "02", "3,5 mm"],
];

for (const [field, code, name] of wanted) {
  const found =
    options.find(
      o =>
        o.field_key === field &&
        o.code === code &&
        o.name === name,
    );

  if (!found) {
    throw new Error(
      `Falta ${field} / ${code} / ${name}`,
    );
  }
}

console.log(
  "\n===== INS-EM-AC · LONGITUDES =====",
);

console.table(
  fields.map(
    f => ({
      field: f.field_key,
      length: f.code_length,
      order: f.display_order,
    }),
  ),
);

console.log(
  "\n===== INS-EM-AC · MEDIDA/CALIBRE =====",
);

console.table(
  options
    .sort(
      (a, b) =>
        `${a.field_key}${a.code}`.localeCompare(
          `${b.field_key}${b.code}`,
        ),
    ),
);

console.log(
  "\nDescomposición esperada:",
);
console.log(
  "INS-EM-AC-1010001000302 = 101 | 0001 | 0003 | 02",
);
console.log(
  "INS-EM-AC-1030001000201 = 103 | 0001 | 0002 | 01",
);

console.log(
  "\n✅ INS-EM-AC corregida y verificada.",
);
console.log(
  "✅ No se modificaron productos ni SIIGO.",
);
