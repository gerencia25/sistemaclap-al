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
    "classification": "MPC-CP-MB",
    "field_key": "codigo",
    "code": "0003",
    "name": "PL-YE0017"
  },
  {
    "classification": "PTF-AL-TP",
    "field_key": "acabado",
    "code": "09",
    "name": "RECTANGULAR LISA 3 DIVISIONES"
  },
  {
    "classification": "PTF-AL-TP",
    "field_key": "boca",
    "code": "026",
    "name": "B. 190 mm x 230 mm"
  },
  {
    "classification": "PTF-AL-TP",
    "field_key": "boca",
    "code": "027",
    "name": "B. 401-101 EM"
  },
  {
    "classification": "PTF-AL-TP",
    "field_key": "boca",
    "code": "028",
    "name": "B. 401-103 EC"
  },
  {
    "classification": "PTF-AL-TP",
    "field_key": "boca",
    "code": "029",
    "name": "B. 502-129 EM"
  },
  {
    "classification": "PTF-AL-TP",
    "field_key": "boca",
    "code": "030",
    "name": "B. 307 EC"
  },
  {
    "classification": "PTF-AL-TP",
    "field_key": "boca",
    "code": "031",
    "name": "B. 211 EC"
  },
  {
    "classification": "PTF-AL-TP",
    "field_key": "tipo",
    "code": "1006",
    "name": "SOBRE TAPA"
  },
  {
    "classification": "PTF-AL-TP",
    "field_key": "tipo",
    "code": "1007",
    "name": "TAPÓN A PRESIÓN"
  },
  {
    "classification": "PTF-ES-TP",
    "field_key": "boca",
    "code": "004",
    "name": "B. 30 mm"
  },
  {
    "classification": "PTF-ES-TP",
    "field_key": "boca",
    "code": "005",
    "name": "B. 90 mm"
  },
  {
    "classification": "PTF-ES-TP",
    "field_key": "tipo",
    "code": "1003",
    "name": "SUB MASTER"
  },
  {
    "classification": "PTF-FM-EN",
    "field_key": "boca",
    "code": "023",
    "name": "B. 59 mm"
  },
  {
    "classification": "PTF-FM-EN",
    "field_key": "capacidad",
    "code": "019",
    "name": "350 mL"
  },
  {
    "classification": "PTF-FM-TP",
    "field_key": "acabado",
    "code": "07",
    "name": "PERFORADO"
  },
  {
    "classification": "PTF-FM-TP",
    "field_key": "boca",
    "code": "025",
    "name": "B. 22 mm"
  },
  {
    "classification": "PTF-FM-TP",
    "field_key": "boca",
    "code": "026",
    "name": "B. 19 mm"
  },
  {
    "classification": "PTF-FM-TP",
    "field_key": "boca",
    "code": "027",
    "name": "B. 59 mm"
  },
  {
    "classification": "PTF-FM-TP",
    "field_key": "tipo",
    "code": "1006",
    "name": "TAPÓN A PRESIÓN"
  },
  {
    "classification": "PTF-RT-PO",
    "field_key": "dimensiones",
    "code": "002",
    "name": "3,7 x 2,5 cm"
  },
  {
    "classification": "PTF-RT-PO",
    "field_key": "dimensiones",
    "code": "003",
    "name": "2,5 cm"
  },
  {
    "classification": "PTF-RT-PO",
    "field_key": "dimensiones",
    "code": "004",
    "name": "30 x 4 cm"
  },
  {
    "classification": "PTF-RT-PO",
    "field_key": "tipo",
    "code": "003",
    "name": "RÍGIDO"
  },
  {
    "classification": "PTF-RT-PO",
    "field_key": "tipo",
    "code": "007",
    "name": "ROPETRÁFICO P-37"
  },
  {
    "classification": "PTF-RT-PO",
    "field_key": "tipo",
    "code": "012",
    "name": "PUNTO DE PAGO"
  }
];

function norm(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

async function read(table, select = "*") {
  const { data, error } =
    await supabase.from(table).select(select);

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }

  return data ?? [];
}

const [templates, fields, options] =
  await Promise.all([
    read("item_classification_templates"),
    read("item_classification_template_fields"),
    read("item_classification_field_options"),
  ]);

const rows = [];
const problems = [];

for (const item of expected) {
  const [category, group, subgroup] =
    item.classification.split("-");

  const matches =
    templates.filter(
      (template) =>
        norm(template.category_code) === category &&
        norm(template.group_code) === group &&
        norm(template.subgroup_code) === subgroup,
    );

  const template =
    matches.find(
      (template) =>
        norm(template.status) === "ACTIVO",
    );

  const field =
    template
      ? fields.find(
          (field) =>
            field.template_id === template.id &&
            field.field_key === item.field_key &&
            norm(field.status) === "ACTIVO",
        )
      : null;

  const option =
    template
      ? options.find(
          (option) =>
            option.template_id === template.id &&
            option.field_key === item.field_key &&
            String(option.code) === item.code &&
            norm(option.status) === "ACTIVO",
        )
      : null;

  const ok =
    Boolean(
      template &&
      field &&
      option &&
      norm(option.name) === norm(item.name),
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
      `${item.classification} / ${item.field_key} / ${item.code}`,
    );
  }
}

console.log(
  "\n===== FASE 1.1 · 26 OPCIONES =====",
);
console.table(rows);

if (problems.length) {
  console.log("\n❌ PROBLEMAS");
  for (const problem of problems) {
    console.log("-", problem);
  }
  process.exitCode = 1;
} else {
  console.log(
    "\n✅ Las 26 opciones históricas quedaron verificadas.",
  );
}

console.log(
  "\n✅ Solo lectura. No se modificó Supabase.",
);
