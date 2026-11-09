import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const REPORT_PATH =
  "scripts/codificacion/reports/preview-adopcion-productos-siigo-fase2.json";

if (!fs.existsSync(REPORT_PATH)) {
  throw new Error(
    `No existe ${REPORT_PATH}. Ejecuta primero preview_adopcion_productos_siigo_fase2_v2.mjs.`,
  );
}

const report =
  JSON.parse(
    fs.readFileSync(REPORT_PATH, "utf8"),
  );

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const { data: exceptions, error } =
  await supabase
    .from("product_code_exceptions")
    .select(`
      product_id,
      exception_type,
      reason,
      canonical_product_id,
      exclude_from_canonical_audit,
      status
    `)
    .eq("status", "Activo")
    .eq("exclude_from_canonical_audit", true);

if (error) throw error;

const exceptionByProduct =
  new Map(
    (exceptions ?? []).map(
      x => [x.product_id, x],
    ),
  );

const results =
  report.results ?? [];

const canonical = [];
const legacy = [];
const technical = [];
const duplicates = [];
const unresolved = [];

for (const row of results) {
  const exception =
    exceptionByProduct.get(row.product_id);

  if (exception) {
    const enriched = {
      ...row,
      exception_type:
        exception.exception_type,
      exception_reason:
        exception.reason,
      canonical_product_id:
        exception.canonical_product_id,
    };

    if (
      exception.exception_type ===
      "LEGACY_NO_RECODIFICAR"
    ) {
      legacy.push(enriched);
    } else if (
      exception.exception_type ===
      "TECNICA_SIIGO"
    ) {
      technical.push(enriched);
    } else if (
      exception.exception_type ===
      "DUPLICADO_HISTORICO"
    ) {
      duplicates.push(enriched);
    } else {
      unresolved.push(enriched);
    }

    continue;
  }

  if (row.status === "ADOPTAR") {
    canonical.push(row);
  } else {
    unresolved.push(row);
  }
}

console.log(
  "\n====================================================",
);
console.log(
  "FASE 2 · PREVIEW V4 · ESTADO FINAL CON EXCEPCIONES",
);
console.log(
  "====================================================\n",
);

console.table({
  "Productos SIIGO":
    results.length,
  "CANÓNICOS / ADOPTAR":
    canonical.length,
  "LEGACY NO RECODIFICAR":
    legacy.length,
  "EXCEPCIÓN TÉCNICA SIIGO":
    technical.length,
  "DUPLICADO HISTÓRICO":
    duplicates.length,
  "REQUIERE REVISIÓN":
    unresolved.length,
});

if (legacy.length) {
  console.log(
    "\n===== LEGACY NO RECODIFICAR =====",
  );
  console.table(
    legacy.map(
      x => ({
        codigo: x.current_code,
        producto: x.name,
        motivo: x.exception_reason,
      }),
    ),
  );
}

if (technical.length) {
  console.log(
    "\n===== EXCEPCIÓN TÉCNICA SIIGO =====",
  );
  console.table(
    technical.map(
      x => ({
        codigo: x.current_code,
        producto: x.name,
        motivo: x.exception_reason,
      }),
    ),
  );
}

if (duplicates.length) {
  console.log(
    "\n===== DUPLICADO HISTÓRICO =====",
  );
  console.table(
    duplicates.map(
      x => ({
        codigo: x.current_code,
        producto: x.name,
        canonico_id:
          x.canonical_product_id,
        motivo: x.exception_reason,
      }),
    ),
  );
}

if (unresolved.length) {
  console.log(
    "\n===== ❌ TODAVÍA REQUIERE REVISIÓN =====",
  );
  console.table(
    unresolved.map(
      x => ({
        codigo: x.current_code,
        producto: x.name,
        estado: x.status,
        motivo: x.reason,
      }),
    ),
  );
} else {
  console.log(
    "\n✅ REQUIERE_REVISION = 0.",
  );
  console.log(
    "✅ Todos los 86 productos SIIGO están clasificados como canónicos o excepción documentada.",
  );
}

console.log(
  "\n✅ SOLO LECTURA. No se modificó CLAP ni SIIGO.",
);
