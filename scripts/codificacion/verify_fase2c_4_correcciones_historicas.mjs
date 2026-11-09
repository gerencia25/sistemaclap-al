import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const report =
  JSON.parse(
    fs.readFileSync(
      "scripts/codificacion/reports/preview-adopcion-productos-siigo-fase2-v3.json",
      "utf8",
    ),
  );

const targets =
  (report.results ?? []).filter(
    row =>
      row.status === "REQUIERE_CAMBIO_CODIGO" &&
      row.canonical_parse_ok === true,
  );

if (targets.length !== 4) {
  throw new Error(
    `Se esperaban 4 objetivos; hay ${targets.length}.`,
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
      "id,final_code,reference,generated_reference,classification_code,dynamic_code_data",
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
  const p = byId.get(t.product_id);
  const newCode =
    t.canonical_code ??
    t.proposed_code;

  const alias =
    (aliases ?? []).find(
      a =>
        a.product_id === t.product_id &&
        norm(a.alias_code) ===
          norm(t.current_code) &&
        a.alias_type ===
          "CORRECCION_HISTORICA" &&
        a.status === "Activo",
    );

  const ok =
    p &&
    norm(p.final_code) === norm(newCode) &&
    norm(p.reference) === norm(newCode) &&
    norm(p.generated_reference) === norm(newCode) &&
    p.classification_code === t.classification &&
    Boolean(alias);

  rows.push({
    anterior:
      t.current_code,
    vigente:
      p?.final_code ?? "(falta)",
    alias:
      alias?.alias_code ?? "(falta)",
    color:
      p?.dynamic_code_data?.color ?? "",
    material:
      p?.dynamic_code_data?.material ?? "",
    ok,
  });

  if (!ok) errors.push(t.current_code);
}

console.table(rows);

if (errors.length) {
  throw new Error(
    `Fase 2C incompleta: ${errors.join(", ")}`,
  );
}

const { count: totalAliases, error: countError } =
  await supabase
    .from("product_code_aliases")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("status", "Activo");

if (countError) throw countError;

console.log(
  `\nAliases históricos activos totales: ${totalAliases}`,
);

if ((totalAliases ?? 0) < 18) {
  throw new Error(
    `Se esperaban al menos 18 aliases activos después de Fase 2B + 2C; hay ${totalAliases}.`,
  );
}

console.log(
  "\n✅ Fase 2C verificada: 4 productos canónicos + 4 aliases CORRECCION_HISTORICA.",
);
console.log(
  "✅ Fase 2B + 2C conservan al menos 18 códigos históricos.",
);
console.log(
  "✅ Solo lectura. No se modificó Supabase ni SIIGO.",
);
