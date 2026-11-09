import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

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

const targets =
  (report.results ?? []).filter(
    row =>
      row.status === "NORMALIZAR_GUION" &&
      row.canonical_parse_ok === true,
  );

if (targets.length !== 14) {
  throw new Error(
    `Seguridad: se esperaban exactamente 14 NORMALIZAR_GUION; hay ${targets.length}.`,
  );
}

const ids =
  targets.map(x => x.product_id);

const products = [];

for (let i = 0; i < ids.length; i += 100) {
  const batch =
    ids.slice(i, i + 100);

  const { data, error } =
    await supabase
      .from("products")
      .select([
        "id",
        "siigo_product_id",
        "name",
        "reference",
        "final_code",
        "generated_reference",
        "category_id",
        "group_id",
        "subgroup_id",
        "classification_code",
        "dynamic_code_data",
        "dynamic_name",
      ].join(","))
      .in("id", batch);

  if (error) throw error;

  products.push(...(data ?? []));
}

const byId =
  new Map(
    products.map(x => [x.id, x]),
  );

const { data: aliases, error: aliasError } =
  await supabase
    .from("product_code_aliases")
    .select("id,product_id,alias_code,status");

if (aliasError) throw aliasError;

const rows = [];
const errors = [];

for (const target of targets) {
  const product =
    byId.get(target.product_id);

  if (!product) {
    errors.push(
      `No existe producto ${target.product_id} (${target.current_code}).`,
    );
    continue;
  }

  const oldCode =
    String(target.current_code).trim();

  const newCode =
    String(
      target.canonical_code ??
      target.proposed_code ??
      "",
    ).trim();

  if (!oldCode || !newCode) {
    errors.push(
      `${target.product_id}: falta código actual o canónico.`,
    );
  }

  if (norm(oldCode) === norm(newCode)) {
    errors.push(
      `${oldCode}: NORMALIZAR_GUION no cambia realmente el código.`,
    );
  }

  const expectedWithHyphen =
    oldCode.replace(
      target.classification,
      `${target.classification}-`,
    );

  if (
    norm(expectedWithHyphen) !==
    norm(newCode)
  ) {
    errors.push(
      `${oldCode}: el cambio no es exclusivamente insertar el guion esperado. Nuevo=${newCode}`,
    );
  }

  if (
    String(product.siigo_product_id ?? "") !==
    String(target.siigo_product_id ?? "")
  ) {
    errors.push(
      `${oldCode}: siigo_product_id cambió desde el preview.`,
    );
  }

  const codeFields = {
    final_code:
      product.final_code,
    reference:
      product.reference,
    generated_reference:
      product.generated_reference,
  };

  for (const [field, value] of Object.entries(codeFields)) {
    if (norm(value) !== norm(oldCode)) {
      errors.push(
        `${oldCode}: ${field}="${value}" no coincide con el código histórico esperado.`,
      );
    }
  }

  const collision =
    products.find(
      p =>
        p.id !== product.id &&
        (
          norm(p.final_code) === norm(newCode) ||
          norm(p.reference) === norm(newCode) ||
          norm(p.generated_reference) === norm(newCode)
        ),
    );

  if (collision) {
    errors.push(
      `${oldCode}: el código nuevo ${newCode} colisiona con el producto ${collision.id}.`,
    );
  }

  const externalCollisionQuery =
    await supabase
      .from("products")
      .select("id,name,final_code,reference,generated_reference")
      .or(
        `final_code.ilike.${newCode},reference.ilike.${newCode},generated_reference.ilike.${newCode}`,
      )
      .neq("id", product.id)
      .limit(5);

  if (externalCollisionQuery.error) {
    throw externalCollisionQuery.error;
  }

  if ((externalCollisionQuery.data ?? []).length > 0) {
    errors.push(
      `${oldCode}: el nuevo código ${newCode} ya aparece en otro producto.`,
    );
  }

  const aliasSame =
    aliases.find(
      a =>
        norm(a.alias_code) === norm(oldCode),
    );

  if (
    aliasSame &&
    aliasSame.product_id !== product.id
  ) {
    errors.push(
      `${oldCode}: ya existe como alias de otro producto ${aliasSame.product_id}.`,
    );
  }

  const newAsAlias =
    aliases.find(
      a =>
        norm(a.alias_code) === norm(newCode) &&
        a.product_id !== product.id,
    );

  if (newAsAlias) {
    errors.push(
      `${oldCode}: el nuevo código ${newCode} ya existe como alias de otro producto.`,
    );
  }

  rows.push({
    product_id:
      product.id,
    actual:
      oldCode,
    nuevo:
      newCode,
    producto:
      product.name,
    alias_preexistente:
      aliasSame
        ? "SÍ"
        : "NO",
    estructura:
      product.classification_code ===
        target.classification
        ? "OK"
        : "REVISAR",
  });
}

console.log(
  "\n==============================================",
);
console.log(
  "FASE 2B · PREFLIGHT · 14 NORMALIZAR GUION",
);
console.log(
  "==============================================\n",
);

console.table({
  "Objetivo":
    targets.length,
  "Productos encontrados":
    products.length,
  "Aliases actuales":
    aliases.length,
  "Errores":
    errors.length,
});

console.log(
  "\n===== 14 CAMBIOS PROPUESTOS =====",
);

console.table(
  rows.map(
    r => ({
      actual:
        r.actual,
      nuevo:
        r.nuevo,
      producto:
        r.producto,
      alias_preexistente:
        r.alias_preexistente,
      estructura:
        r.estructura,
    }),
  ),
);

if (errors.length) {
  console.log(
    "\n===== ❌ ERRORES BLOQUEANTES =====",
  );

  for (const error of errors) {
    console.log(`- ${error}`);
  }

  throw new Error(
    "Fase 2B bloqueada. No se modificó Supabase.",
  );
}

const outPath =
  "scripts/codificacion/reports/preflight-fase2b-normalizar-guion.json";

fs.writeFileSync(
  outPath,
  JSON.stringify(
    {
      generated_at:
        new Date().toISOString(),
      read_only: true,
      total:
        rows.length,
      errors: [],
      rows,
    },
    null,
    2,
  ),
  "utf8",
);

console.log(
  "\n✅ PREFLIGHT FASE 2B APROBADO.",
);
console.log(
  "✅ Los 14 productos conservan el mismo código en final_code, reference y generated_reference.",
);
console.log(
  "✅ No se detectaron colisiones con códigos vigentes ni aliases.",
);
console.log(
  "✅ SOLO LECTURA. No se modificó CLAP ni SIIGO.",
);
console.log(
  `\nReporte:\n- ${outPath}`,
);
