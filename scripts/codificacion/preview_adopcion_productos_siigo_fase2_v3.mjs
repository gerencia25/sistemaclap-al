import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const previewPath =
  "scripts/codificacion/reports/preview-adopcion-productos-siigo-fase2.json";

if (!fs.existsSync(previewPath)) {
  throw new Error(`No existe ${previewPath}`);
}

const preview =
  JSON.parse(
    fs.readFileSync(previewPath, "utf8"),
  );

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

function norm(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function pad(value, length) {
  const raw = String(value ?? "").trim();
  return /^\d+$/.test(raw)
    ? raw.padStart(length, "0")
    : raw;
}

async function readAll(table, select = "*") {
  const pageSize = 1000;
  let from = 0;
  const all = [];

  while (true) {
    const { data, error } =
      await supabase
        .from(table)
        .select(select)
        .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }

    const page = data ?? [];
    all.push(...page);

    if (page.length < pageSize) break;
    from += pageSize;
  }

  return all;
}

const [
  templates,
  fields,
  legacyOptions,
  sharedValues,
] = await Promise.all([
  readAll("item_classification_templates"),
  readAll("item_classification_template_fields"),
  readAll("item_classification_field_options"),
  readAll("item_option_catalog_values"),
]);

const activeTemplates =
  templates.filter(
    t => norm(t.status) === "ACTIVO",
  );

const activeFields =
  fields.filter(
    f => norm(f.status) === "ACTIVO",
  );

function templateFor(classification) {
  const [category, group, subgroup] =
    classification.split("-");

  return activeTemplates.find(
    t =>
      norm(t.category_code) === category &&
      norm(t.group_code) === group &&
      norm(t.subgroup_code) === subgroup
  );
}

function fieldsFor(templateId) {
  return activeFields
    .filter(f => f.template_id === templateId)
    .sort(
      (a, b) =>
        Number(a.display_order ?? 0) -
        Number(b.display_order ?? 0),
    );
}

function optionsFor(field) {
  if (field.option_catalog_id) {
    return sharedValues
      .filter(
        o =>
          o.catalog_id === field.option_catalog_id &&
          norm(o.status) === "ACTIVO",
      )
      .map(o => ({
        code: pad(o.code, Number(field.code_length)),
        name: String(o.name ?? "").trim(),
      }));
  }

  return legacyOptions
    .filter(
      o =>
        o.template_id === field.template_id &&
        o.field_key === field.field_key &&
        norm(o.status) === "ACTIVO",
    )
    .map(o => ({
      code: pad(o.code, Number(field.code_length)),
      name: String(o.name ?? "").trim(),
    }));
}

function parseCanonicalCode(classification, code) {
  const template =
    templateFor(classification);

  if (!template) {
    return {
      ok: false,
      reason: "No existe plantilla activa.",
    };
  }

  const prefix =
    `${classification}-`;

  if (!String(code).startsWith(prefix)) {
    return {
      ok: false,
      reason:
        `El código propuesto no inicia con ${prefix}.`,
    };
  }

  const tail =
    String(code).slice(prefix.length);

  if (
    !/^\d+$/.test(tail) ||
    tail.length !==
      Number(template.numeric_code_length)
  ) {
    return {
      ok: false,
      reason:
        `Bloque numérico inválido (${tail.length}); esperado ${template.numeric_code_length}.`,
    };
  }

  const dynamic = {};
  const parsed = [];
  const unresolved = [];
  let cursor = 0;

  for (const field of fieldsFor(template.id)) {
    if (!field.contributes_to_code) {
      continue;
    }

    const length =
      Number(field.code_length);

    const segment =
      tail.slice(
        cursor,
        cursor + length,
      );

    cursor += length;

    const match =
      optionsFor(field).find(
        option =>
          option.code === segment,
      );

    if (!match) {
      unresolved.push({
        field_key: field.field_key,
        field_label: field.field_label,
        segment,
      });

      parsed.push({
        field_key: field.field_key,
        segment,
        resolved: false,
        value: null,
      });

      continue;
    }

    dynamic[field.field_key] =
      match.name;

    parsed.push({
      field_key: field.field_key,
      segment,
      resolved: true,
      value: match.name,
    });
  }

  return {
    ok: unresolved.length === 0,
    dynamic_code_data:
      unresolved.length === 0
        ? dynamic
        : null,
    parsed_fields: parsed,
    unresolved_fields: unresolved,
  };
}

const results = [];
const changed = [];

for (const item of preview.results ?? []) {
  const output = {
    ...item,
    canonical_code:
      item.proposed_code ??
      item.current_code,
    canonical_dynamic_code_data:
      item.dynamic_code_data ?? null,
    canonical_parse_ok:
      item.status !== "REQUIERE_REVISION",
  };

  if (
    item.status ===
      "REQUIERE_CAMBIO_CODIGO" &&
    item.classification &&
    item.proposed_code
  ) {
    const parsed =
      parseCanonicalCode(
        item.classification,
        item.proposed_code,
      );

    output.canonical_parse_ok =
      parsed.ok;

    output.canonical_dynamic_code_data =
      parsed.dynamic_code_data ?? null;

    output.canonical_parsed_fields =
      parsed.parsed_fields ?? [];

    output.canonical_unresolved_fields =
      parsed.unresolved_fields ?? [];

    if (!parsed.ok) {
      output.status =
        "REQUIERE_REVISION_CANONICA";
      output.reason =
        "El código propuesto no puede resolverse completamente contra la plantilla vigente.";
    }

    changed.push({
      actual:
        item.current_code,
      propuesto:
        item.proposed_code,
      producto:
        item.name,
      parse_ok:
        parsed.ok,
      dynamic:
        parsed.dynamic_code_data,
      unresolved:
        parsed.unresolved_fields ?? [],
    });
  }

  results.push(output);
}

const safe =
  results.filter(
    item =>
      [
        "ADOPTAR",
        "NORMALIZAR_GUION",
        "REQUIERE_CAMBIO_CODIGO",
      ].includes(item.status) &&
      item.canonical_parse_ok === true,
  );

const review =
  results.filter(
    item =>
      item.status === "REQUIERE_REVISION" ||
      item.status === "REQUIERE_REVISION_CANONICA",
  );

const output = {
  generated_at:
    new Date().toISOString(),
  read_only: true,
  total_siigo_products:
    results.length,
  safe_for_phase2a:
    safe.length,
  review_count:
    review.length,
  change_code_cases:
    changed.length,
  change_code_validated:
    changed.filter(x => x.parse_ok).length,
  results,
};

const jsonPath =
  "scripts/codificacion/reports/preview-adopcion-productos-siigo-fase2-v3.json";

fs.writeFileSync(
  jsonPath,
  JSON.stringify(
    output,
    null,
    2,
  ),
  "utf8",
);

console.log(
  "\n===================================================",
);
console.log(
  "FASE 2 · PREVIEW CANÓNICO V3 · PRODUCTOS SIIGO",
);
console.log(
  "===================================================\n",
);

console.table({
  "Productos SIIGO":
    results.length,
  "Seguros para Fase 2A":
    safe.length,
  "Revisión manual":
    review.length,
  "Cambios reales de código":
    changed.length,
  "Cambios canónicos validados":
    changed.filter(x => x.parse_ok).length,
});

console.log(
  "\n===== 4 CAMBIOS REALES · REINTERPRETADOS DESDE CÓDIGO CANÓNICO =====",
);

console.table(
  changed.map(
    item => ({
      actual:
        item.actual,
      propuesto:
        item.propuesto,
      producto:
        item.producto,
      parse_ok:
        item.parse_ok,
      color:
        item.dynamic?.color ?? "",
      material:
        item.dynamic?.material ?? "",
    }),
  ),
);

if (
  changed.some(
    item => !item.parse_ok,
  )
) {
  console.log(
    "\n❌ Hay cambios de código que aún no pueden adoptarse.",
  );
  process.exitCode = 1;
} else {
  console.log(
    "\n✅ Los 4 cambios reales se resuelven correctamente desde su código canónico.",
  );
}

console.log(
  "\n✅ SOLO LECTURA. No se modificó CLAP ni SIIGO.",
);
console.log(
  `\nReporte:\n- ${jsonPath}`,
);
