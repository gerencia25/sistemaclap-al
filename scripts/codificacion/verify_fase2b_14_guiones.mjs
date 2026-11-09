import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const REPORT_PATH =
  "scripts/codificacion/reports/preview-adopcion-productos-siigo-fase2-v3.json";

const report =
  JSON.parse(
    fs.readFileSync(REPORT_PATH, "utf8"),
  );

const targets =
  (report.results ?? []).filter(
    row =>
      row.status === "NORMALIZAR_GUION" &&
      row.canonical_parse_ok === true,
  );

if (targets.length !== 14) {
  throw new Error(
    `Se esperaban 14 objetivos; hay ${targets.length}.`,
  );
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

function norm(v) {
  return String(v ?? "")
    .trim()
    .toUpperCase();
}

const ids =
  targets.map(x => x.product_id);

const { data: products, error: pe } =
  await supabase
    .from("products")
    .select(
      "id,final_code,reference,generated_reference,classification_code",
    )
    .in("id", ids);

if (pe) throw pe;

const { data: aliases, error: ae } =
  await supabase
    .from("product_code_aliases")
    .select(
      "product_id,alias_code,alias_type,status",
    )
    .in("product_id", ids);

if (ae) throw ae;

const byId =
  new Map(
    (products ?? []).map(x => [x.id, x]),
  );

const rows = [];
const errors = [];

for (const t of targets) {
  const p =
    byId.get(t.product_id);

  const newCode =
    t.canonical_code ??
    t.proposed_code;

  const alias =
    (aliases ?? []).find(
      a =>
        a.product_id === t.product_id &&
        norm(a.alias_code) ===
          norm(t.current_code) &&
        a.status === "Activo",
    );

  const ok =
    p &&
    norm(p.final_code) ===
      norm(newCode) &&
    norm(p.reference) ===
      norm(newCode) &&
    norm(p.generated_reference) ===
      norm(newCode) &&
    p.classification_code ===
      t.classification &&
    Boolean(alias);

  rows.push({
    anterior:
      t.current_code,
    vigente:
      p?.final_code ?? "(falta)",
    alias:
      alias?.alias_code ?? "(falta)",
    ok,
  });

  if (!ok) {
    errors.push(t.current_code);
  }
}

console.table(rows);

if (errors.length) {
  throw new Error(
    `Fase 2B incompleta: ${errors.join(", ")}`,
  );
}

console.log(
  "\n✅ Fase 2B verificada: 14 productos canónicos + 14 aliases históricos.",
);
console.log(
  "✅ Solo lectura. No se modificó Supabase ni SIIGO.",
);
