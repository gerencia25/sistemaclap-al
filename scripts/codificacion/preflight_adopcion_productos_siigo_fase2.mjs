import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const reportPath =
  "scripts/codificacion/reports/preview-adopcion-productos-siigo-fase2-v3.json";

if (!fs.existsSync(reportPath)) {
  throw new Error(
    `No existe ${reportPath}. Ejecuta primero el preview V3.`,
  );
}

const report =
  JSON.parse(
    fs.readFileSync(reportPath, "utf8"),
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
    .trim()
    .toUpperCase();
}

function stableJson(value) {
  if (value === null || value === undefined) return null;
  const keys = Object.keys(value).sort();
  const obj = {};
  for (const k of keys) obj[k] = value[k];
  return JSON.stringify(obj);
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

const safeStatuses = new Set([
  "ADOPTAR",
  "NORMALIZAR_GUION",
  "REQUIERE_CAMBIO_CODIGO",
]);

const safe =
  (report.results ?? []).filter(
    row =>
      safeStatuses.has(row.status) &&
      row.canonical_parse_ok === true,
  );

const manual =
  (report.results ?? []).filter(
    row => !safeStatuses.has(row.status) ||
      row.canonical_parse_ok !== true,
  );

const products =
  await readAll(
    "products",
    [
      "id",
      "siigo_product_id",
      "reference",
      "final_code",
      "generated_reference",
      "name",
      "category_id",
      "group_id",
      "subgroup_id",
      "classification_code",
      "dynamic_code_data",
      "dynamic_name",
    ].join(","),
  );

const byId =
  new Map(
    products.map(p => [p.id, p]),
  );

const errors = [];
const warnings = [];
const details = [];

const proposedOwner = new Map();

for (const row of safe) {
  const product = byId.get(row.product_id);

  if (!product) {
    errors.push(
      `No existe products.id=${row.product_id} (${row.current_code}).`,
    );
    continue;
  }

  const currentCode =
    String(
      product.final_code ??
      product.reference ??
      "",
    ).trim();

  if (currentCode !== row.current_code) {
    errors.push(
      `Código cambió desde el preview: ${row.product_id} · reporte=${row.current_code} · DB=${currentCode}`,
    );
  }

  if (
    String(product.siigo_product_id ?? "") !==
    String(row.siigo_product_id ?? "")
  ) {
    errors.push(
      `SIIGO ID cambió: ${row.current_code}.`,
    );
  }

  const canonical =
    String(
      row.canonical_code ??
      row.proposed_code ??
      row.current_code,
    ).trim();

  if (!canonical) {
    errors.push(
      `Sin canonical_code: ${row.current_code}.`,
    );
  }

  const canonicalKey = norm(canonical);
  const prior = proposedOwner.get(canonicalKey);

  if (prior && prior !== row.product_id) {
    errors.push(
      `Dos productos seguros proponen el mismo código ${canonical}: ${prior} y ${row.product_id}.`,
    );
  } else {
    proposedOwner.set(canonicalKey, row.product_id);
  }

  const dynamic =
    row.canonical_dynamic_code_data;

  if (!dynamic || typeof dynamic !== "object") {
    errors.push(
      `Sin canonical_dynamic_code_data: ${row.current_code}.`,
    );
  }

  const structuralMatches =
    product.category_id === row.category_id &&
    product.group_id === row.group_id &&
    product.subgroup_id === row.subgroup_id &&
    product.classification_code === row.classification &&
    stableJson(product.dynamic_code_data) ===
      stableJson(dynamic) &&
    String(product.dynamic_name ?? "") ===
      String(product.name ?? "");

  details.push({
    estado: row.status,
    actual: row.current_code,
    canonico: canonical,
    producto: product.name,
    estructura_actual:
      structuralMatches
        ? "YA COINCIDE"
        : "ACTUALIZAR",
    cambia_codigo:
      norm(currentCode) !== norm(canonical)
        ? "SÍ"
        : "NO",
  });
}

// Colisiones contra cualquier otro producto.
// final_code tiene UNIQUE en DB, pero también miramos reference/generated_reference
// para no dejar identidades internas contradictorias.
for (const row of safe) {
  const canonical =
    String(
      row.canonical_code ??
      row.proposed_code ??
      row.current_code,
    ).trim();

  const key = norm(canonical);

  for (const p of products) {
    if (p.id === row.product_id) continue;

    const candidates = [
      ["final_code", p.final_code],
      ["reference", p.reference],
      ["generated_reference", p.generated_reference],
    ];

    for (const [field, value] of candidates) {
      if (value && norm(value) === key) {
        errors.push(
          `COLISIÓN: ${canonical} ya aparece en ${field} del producto ${p.id} (${p.name}).`,
        );
      }
    }
  }
}

// Los 18 códigos que cambian deben ser distintos del nuevo.
const codeChanges =
  safe.filter(
    row =>
      norm(row.current_code) !==
      norm(
        row.canonical_code ??
        row.proposed_code,
      ),
  );

for (const row of codeChanges) {
  if (!row.current_code) {
    errors.push(
      `Cambio sin código histórico: ${row.product_id}.`,
    );
  }
}

const statusCounts =
  safe.reduce((acc, row) => {
    acc[row.status] =
      (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});

const already =
  details.filter(
    d => d.estructura_actual === "YA COINCIDE",
  ).length;

const needsStructural =
  details.length - already;

console.log(
  "\n====================================================",
);
console.log(
  "FASE 2 · PREFLIGHT FINAL · ADOPCIÓN PRODUCTOS SIIGO",
);
console.log(
  "====================================================\n",
);

console.table({
  "Productos SIIGO reporte":
    report.total_siigo_products,
  "Seguros":
    safe.length,
  "ADOPTAR":
    statusCounts.ADOPTAR ?? 0,
  "NORMALIZAR_GUION":
    statusCounts.NORMALIZAR_GUION ?? 0,
  "REQUIERE_CAMBIO_CODIGO":
    statusCounts.REQUIERE_CAMBIO_CODIGO ?? 0,
  "Revisión manual":
    manual.length,
  "Códigos que cambiarían":
    codeChanges.length,
  "Estructura ya coincide":
    already,
  "Estructura a actualizar":
    needsStructural,
  "Errores":
    errors.length,
  "Advertencias":
    warnings.length,
});

console.log(
  "\n===== 18 CÓDIGOS QUE CAMBIARÍAN =====",
);

console.table(
  details.filter(
    d => d.cambia_codigo === "SÍ",
  ),
);

if (errors.length) {
  console.log(
    "\n===== ❌ ERRORES BLOQUEANTES =====",
  );

  for (const error of errors) {
    console.log(`- ${error}`);
  }
}

if (warnings.length) {
  console.log(
    "\n===== ⚠️ ADVERTENCIAS =====",
  );

  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

const output = {
  generated_at:
    new Date().toISOString(),
  read_only: true,
  summary: {
    report_siigo_products:
      report.total_siigo_products,
    safe:
      safe.length,
    manual:
      manual.length,
    code_changes:
      codeChanges.length,
    already_structurally_adopted:
      already,
    structural_updates_needed:
      needsStructural,
    errors:
      errors.length,
    warnings:
      warnings.length,
  },
  status_counts:
    statusCounts,
  errors,
  warnings,
  details,
};

const outPath =
  "scripts/codificacion/reports/preflight-fase2-final.json";

fs.writeFileSync(
  outPath,
  JSON.stringify(
    output,
    null,
    2,
  ),
  "utf8",
);

if (errors.length) {
  console.log(
    "\n❌ PREFLIGHT BLOQUEADO. No hagas ninguna migración de productos.",
  );
  process.exitCode = 1;
} else {
  console.log(
    "\n✅ PREFLIGHT APROBADO.",
  );
  console.log(
    "No se encontró ninguna colisión ni cambio de identidad desde el preview.",
  );
  console.log(
    "✅ SOLO LECTURA. No se modificó CLAP ni SIIGO.",
  );
}

console.log(
  `\nReporte:\n- ${outPath}`,
);
