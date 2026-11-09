import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const expected = new Map([
  ["305-0002-0200-03", "LEGACY_NO_RECODIFICAR"],
  ["305-0002-0200-02", "LEGACY_NO_RECODIFICAR"],
  ["106-0001-0102-05", "LEGACY_NO_RECODIFICAR"],
  ["109-0300-1002-03", "LEGACY_NO_RECODIFICAR"],
  ["PRODUCTOGENERICONUBE", "TECNICA_SIIGO"],
  ["110111", "DUPLICADO_HISTORICO"],
]);

const { data: exceptions, error: ee } =
  await supabase
    .from("product_code_exceptions")
    .select(`
      id,
      product_id,
      exception_type,
      reason,
      canonical_product_id,
      exclude_from_canonical_audit,
      status,
      source
    `)
    .eq("status", "Activo");

if (ee) throw ee;

const productIds =
  [...new Set(
    (exceptions ?? [])
      .flatMap(
        x => [
          x.product_id,
          x.canonical_product_id,
        ],
      )
      .filter(Boolean),
  )];

const { data: products, error: pe } =
  await supabase
    .from("products")
    .select("id,final_code,name")
    .in("id", productIds);

if (pe) throw pe;

const byId =
  new Map(
    (products ?? []).map(p => [p.id, p]),
  );

const rows = [];
const errors = [];

for (const [code, type] of expected) {
  const product =
    (products ?? []).find(
      p =>
        String(p.final_code)
          .trim()
          .toUpperCase() ===
        code.toUpperCase(),
    );

  if (!product) {
    errors.push(`${code}: producto no existe.`);
    continue;
  }

  const exception =
    (exceptions ?? []).find(
      x => x.product_id === product.id,
    );

  if (!exception) {
    errors.push(`${code}: falta excepción activa.`);
    continue;
  }

  const canonical =
    exception.canonical_product_id
      ? byId.get(exception.canonical_product_id)
      : null;

  const ok =
    exception.exception_type === type &&
    exception.exclude_from_canonical_audit === true &&
    (
      type !== "DUPLICADO_HISTORICO" ||
      canonical?.final_code ===
        "ALQ-MC-PF-1010400100101"
    );

  rows.push({
    codigo: code,
    tipo: exception.exception_type,
    canonico:
      canonical?.final_code ?? "",
    excluir_auditoria:
      exception.exclude_from_canonical_audit,
    ok,
  });

  if (!ok) {
    errors.push(`${code}: configuración inesperada.`);
  }
}

console.table(rows);

const counts =
  rows.reduce(
    (acc, row) => {
      acc[row.tipo] =
        (acc[row.tipo] ?? 0) + 1;
      return acc;
    },
    {},
  );

console.log(
  "\n===== RESUMEN =====",
);

console.table({
  "LEGACY_NO_RECODIFICAR":
    counts.LEGACY_NO_RECODIFICAR ?? 0,
  "TECNICA_SIIGO":
    counts.TECNICA_SIIGO ?? 0,
  "DUPLICADO_HISTORICO":
    counts.DUPLICADO_HISTORICO ?? 0,
  "Errores":
    errors.length,
});

if (errors.length) {
  for (const error of errors) {
    console.log(`- ${error}`);
  }

  throw new Error(
    "Verificación Fase 2E fallida.",
  );
}

console.log(
  "\n✅ Fase 2E verificada: 6 excepciones activas.",
);
console.log(
  "✅ 4 legacy + 1 técnica SIIGO + 1 duplicado histórico.",
);
console.log(
  "✅ Solo lectura. No se modificó CLAP ni SIIGO.",
);
