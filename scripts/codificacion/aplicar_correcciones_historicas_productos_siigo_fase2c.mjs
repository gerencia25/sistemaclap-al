import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const APPLY =
  process.argv.includes("--apply");

const REPORT_PATH =
  "scripts/codificacion/reports/preview-adopcion-productos-siigo-fase2-v3.json";

if (!fs.existsSync(REPORT_PATH)) {
  throw new Error(
    `No existe ${REPORT_PATH}. Ejecuta primero el preview V3.`,
  );
}

const report =
  JSON.parse(
    fs.readFileSync(REPORT_PATH, "utf8"),
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

function stable(value) {
  if (value === null || value === undefined) return null;
  const keys = Object.keys(value).sort();
  const result = {};
  for (const key of keys) result[key] = value[key];
  return JSON.stringify(result);
}

const targets =
  (report.results ?? []).filter(
    row =>
      row.status === "REQUIERE_CAMBIO_CODIGO" &&
      row.canonical_parse_ok === true,
  );

if (targets.length !== 4) {
  throw new Error(
    `Seguridad: se esperaban exactamente 4 REQUIERE_CAMBIO_CODIGO; hay ${targets.length}.`,
  );
}

const items =
  targets.map(
    row => ({
      product_id:
        row.product_id,
      siigo_product_id:
        row.siigo_product_id,
      old_code:
        row.current_code,
      new_code:
        row.canonical_code ??
        row.proposed_code,
      classification:
        row.classification,
      category_id:
        row.category_id,
      group_id:
        row.group_id,
      subgroup_id:
        row.subgroup_id,
      dynamic_code_data:
        row.canonical_dynamic_code_data,
      dynamic_name:
        row.name,
    }),
  );

console.log(
  "\n===================================================",
);
console.log(
  APPLY
    ? "FASE 2C · APLICACIÓN · 4 CORRECCIONES HISTÓRICAS"
    : "FASE 2C · DRY-RUN · 4 CORRECCIONES HISTÓRICAS",
);
console.log(
  "===================================================\n",
);

console.table(
  items.map(
    x => ({
      actual: x.old_code,
      nuevo: x.new_code,
      producto: x.dynamic_name,
      color: x.dynamic_code_data?.color ?? "",
      material: x.dynamic_code_data?.material ?? "",
    }),
  ),
);

const ids = items.map(x => x.product_id);

const { data: products, error: pe } =
  await supabase
    .from("products")
    .select([
      "id",
      "siigo_product_id",
      "name",
      "reference",
      "final_code",
      "generated_reference",
      "classification_code",
      "category_id",
      "group_id",
      "subgroup_id",
      "dynamic_code_data",
      "dynamic_name",
    ].join(","))
    .in("id", ids);

if (pe) throw pe;

const byId =
  new Map(
    (products ?? []).map(x => [x.id, x]),
  );

const errors = [];

for (const item of items) {
  const p = byId.get(item.product_id);

  if (!p) {
    errors.push(
      `${item.old_code}: producto no existe.`,
    );
    continue;
  }

  if (
    String(p.siigo_product_id ?? "") !==
    String(item.siigo_product_id ?? "")
  ) {
    errors.push(
      `${item.old_code}: siigo_product_id cambió.`,
    );
  }

  const alreadyDone =
    norm(p.final_code) === norm(item.new_code) &&
    norm(p.reference) === norm(item.new_code) &&
    norm(p.generated_reference) === norm(item.new_code) &&
    p.classification_code === item.classification &&
    p.category_id === item.category_id &&
    p.group_id === item.group_id &&
    p.subgroup_id === item.subgroup_id &&
    stable(p.dynamic_code_data) ===
      stable(item.dynamic_code_data) &&
    String(p.dynamic_name ?? "") ===
      String(item.dynamic_name ?? "");

  if (alreadyDone) continue;

  if (
    norm(p.final_code) !== norm(item.old_code) ||
    norm(p.reference) !== norm(item.old_code)
  ) {
    errors.push(
      `${item.old_code}: DB ya no está en el estado histórico esperado.`,
    );
  }

  if (
    p.generated_reference !== null &&
    String(p.generated_reference).trim() !== "" &&
    norm(p.generated_reference) !== norm(item.old_code)
  ) {
    errors.push(
      `${item.old_code}: generated_reference inesperado: ${p.generated_reference}.`,
    );
  }

  const { data: collisions, error: ce } =
    await supabase
      .from("products")
      .select("id,name,final_code,reference,generated_reference")
      .or(
        `final_code.ilike.${item.new_code},reference.ilike.${item.new_code},generated_reference.ilike.${item.new_code}`,
      )
      .neq("id", item.product_id)
      .limit(5);

  if (ce) throw ce;

  if ((collisions ?? []).length) {
    errors.push(
      `${item.old_code}: nuevo código ${item.new_code} colisiona con otro producto.`,
    );
  }
}

console.table({
  "Objetivo":
    items.length,
  "Productos encontrados":
    products?.length ?? 0,
  "Errores bloqueantes":
    errors.length,
});

if (errors.length) {
  for (const error of errors) {
    console.log(`- ${error}`);
  }
  throw new Error("Fase 2C bloqueada.");
}

if (!APPLY) {
  console.log(
    "\n✅ DRY-RUN FASE 2C APROBADO.",
  );
  console.log(
    "No se modificó Supabase ni SIIGO.",
  );
  console.log(
    "\nPara aplicar:",
  );
  console.log(
    "node --env-file=.env.local scripts/codificacion/aplicar_correcciones_historicas_productos_siigo_fase2c.mjs --apply",
  );
  process.exit(0);
}

const { data: result, error: rpcError } =
  await supabase.rpc(
    "apply_product_code_historical_corrections",
    { p_items: items },
  );

if (rpcError) {
  throw new Error(
    `RPC apply_product_code_historical_corrections: ${rpcError.message}`,
  );
}

console.log(
  "\n===== RESULTADO RPC =====",
);
console.dir(result, { depth: null });

const { data: after, error: afterError } =
  await supabase
    .from("products")
    .select([
      "id",
      "siigo_product_id",
      "reference",
      "final_code",
      "generated_reference",
      "classification_code",
      "category_id",
      "group_id",
      "subgroup_id",
      "dynamic_code_data",
      "dynamic_name",
    ].join(","))
    .in("id", ids);

if (afterError) throw afterError;

const { data: aliases, error: aliasError } =
  await supabase
    .from("product_code_aliases")
    .select(
      "product_id,alias_code,alias_type,status",
    )
    .in("product_id", ids);

if (aliasError) throw aliasError;

const afterById =
  new Map(
    (after ?? []).map(x => [x.id, x]),
  );

const verifyErrors = [];

for (const item of items) {
  const p = afterById.get(item.product_id);

  if (!p) {
    verifyErrors.push(
      `${item.old_code}: no apareció después de aplicar.`,
    );
    continue;
  }

  if (
    norm(p.final_code) !== norm(item.new_code) ||
    norm(p.reference) !== norm(item.new_code) ||
    norm(p.generated_reference) !== norm(item.new_code)
  ) {
    verifyErrors.push(
      `${item.old_code}: código canónico no quedó en los tres campos.`,
    );
  }

  if (
    p.classification_code !== item.classification ||
    p.category_id !== item.category_id ||
    p.group_id !== item.group_id ||
    p.subgroup_id !== item.subgroup_id ||
    stable(p.dynamic_code_data) !==
      stable(item.dynamic_code_data) ||
    String(p.dynamic_name ?? "") !==
      String(item.dynamic_name ?? "")
  ) {
    verifyErrors.push(
      `${item.old_code}: estructura canónica incompleta.`,
    );
  }

  const alias =
    (aliases ?? []).find(
      a =>
        a.product_id === item.product_id &&
        norm(a.alias_code) === norm(item.old_code) &&
        a.alias_type === "CORRECCION_HISTORICA" &&
        a.status === "Activo",
    );

  if (!alias) {
    verifyErrors.push(
      `${item.old_code}: falta alias histórico activo.`,
    );
  }
}

console.table({
  "Productos verificados":
    after?.length ?? 0,
  "Aliases históricos":
    aliases?.length ?? 0,
  "Errores de verificación":
    verifyErrors.length,
});

if (verifyErrors.length) {
  for (const error of verifyErrors) {
    console.log(`- ${error}`);
  }
  throw new Error(
    "La RPC terminó, pero la verificación final encontró inconsistencias.",
  );
}

console.log(
  "\n✅ FASE 2C COMPLETADA Y VERIFICADA.",
);
console.log(
  "✅ 4 códigos históricos corregidos al significado canónico.",
);
console.log(
  "✅ 4 códigos anteriores conservados como alias CORRECCION_HISTORICA.",
);
console.log(
  "✅ Clasificación y dynamic_code_data adoptados.",
);
console.log(
  "✅ No se tocó SIIGO.",
);
