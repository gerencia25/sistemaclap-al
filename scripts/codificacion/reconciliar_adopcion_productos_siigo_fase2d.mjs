import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const APPLY =
  process.argv.includes("--apply");

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

  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }

  if (typeof value === "object") {
    const result = {};
    for (const key of Object.keys(value).sort()) {
      result[key] = value[key];
    }
    return JSON.stringify(result);
  }

  return JSON.stringify(value);
}

const targets =
  (report.results ?? []).filter(
    row => row.status === "ADOPTAR",
  );

if (targets.length !== 80) {
  throw new Error(
    `Seguridad: se esperaban exactamente 80 productos ADOPTAR; hay ${targets.length}.`,
  );
}

const ids =
  targets.map(x => x.product_id);

const products = [];

for (let i = 0; i < ids.length; i += 100) {
  const batch = ids.slice(i, i + 100);

  const { data, error } =
    await supabase
      .from("products")
      .select([
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
      ].join(","))
      .in("id", batch);

  if (error) throw error;
  products.push(...(data ?? []));
}

const byId =
  new Map(
    products.map(p => [p.id, p]),
  );

const errors = [];
const changes = [];

for (const row of targets) {
  const p =
    byId.get(row.product_id);

  if (!p) {
    errors.push(
      `${row.current_code}: producto no existe.`,
    );
    continue;
  }

  if (
    String(p.siigo_product_id ?? "") !==
    String(row.siigo_product_id ?? "")
  ) {
    errors.push(
      `${row.current_code}: siigo_product_id cambió.`,
    );
  }

  if (
    norm(p.final_code) !==
    norm(row.current_code)
  ) {
    errors.push(
      `${row.current_code}: final_code actual=${p.final_code}.`,
    );
  }

  if (
    norm(row.proposed_code ?? row.current_code) !==
    norm(row.current_code)
  ) {
    errors.push(
      `${row.current_code}: ADOPTAR propone cambio de código; se cancela.`,
    );
  }

  if (
    !row.dynamic_code_data ||
    typeof row.dynamic_code_data !== "object"
  ) {
    errors.push(
      `${row.current_code}: dynamic_code_data canónico ausente.`,
    );
  }

  const desired = {
    category_id:
      row.category_id,
    group_id:
      row.group_id,
    subgroup_id:
      row.subgroup_id,
    classification_code:
      row.classification,
    dynamic_code_data:
      row.dynamic_code_data,
    dynamic_name:
      p.name,
  };

  const changedFields = [];

  for (const [key, value] of Object.entries(desired)) {
    const equal =
      key === "dynamic_code_data"
        ? stable(p[key]) === stable(value)
        : String(p[key] ?? "") ===
          String(value ?? "");

    if (!equal) {
      changedFields.push(key);
    }
  }

  changes.push({
    product_id:
      p.id,
    siigo_product_id:
      p.siigo_product_id,
    codigo:
      p.final_code,
    producto:
      p.name,
    before_dynamic:
      p.dynamic_code_data,
    desired,
    changedFields,
  });
}

console.log(
  "\n=====================================================",
);
console.log(
  APPLY
    ? "FASE 2D · APLICACIÓN · RECONCILIAR 80 ADOPTAR"
    : "FASE 2D · DRY-RUN · RECONCILIAR 80 ADOPTAR",
);
console.log(
  "=====================================================\n",
);

const toUpdate =
  changes.filter(
    x => x.changedFields.length > 0,
  );

console.table({
  "Objetivo ADOPTAR":
    targets.length,
  "Productos encontrados":
    changes.length,
  "Ya consistentes":
    changes.length - toUpdate.length,
  "Requieren reconciliación":
    toUpdate.length,
  "Errores bloqueantes":
    errors.length,
});

console.log(
  "\n===== PRODUCTOS DESFASADOS =====",
);

console.table(
  toUpdate.map(
    x => ({
      codigo:
        x.codigo,
      producto:
        x.producto,
      campos:
        x.changedFields.join(", "),
      material_antes:
        x.before_dynamic?.material ?? "",
      material_despues:
        x.desired.dynamic_code_data?.material ?? "",
    }),
  ),
);

if (errors.length) {
  console.log(
    "\n===== ❌ ERRORES =====",
  );

  for (const error of errors) {
    console.log(`- ${error}`);
  }

  throw new Error(
    "Fase 2D bloqueada. No se aplicó ningún cambio.",
  );
}

if (!APPLY) {
  console.log(
    "\n✅ DRY-RUN FASE 2D APROBADO.",
  );
  console.log(
    "No se modificó CLAP ni SIIGO.",
  );
  console.log(
    "\nPara aplicar:",
  );
  console.log(
    "node --env-file=.env.local scripts/codificacion/reconciliar_adopcion_productos_siigo_fase2d.mjs --apply",
  );
  process.exit(0);
}

let updated = 0;
const updateErrors = [];

for (const item of toUpdate) {
  const { data, error } =
    await supabase
      .from("products")
      .update(item.desired)
      .eq("id", item.product_id)
      .eq(
        "siigo_product_id",
        item.siigo_product_id,
      )
      .eq(
        "final_code",
        item.codigo,
      )
      .select([
        "id",
        "reference",
        "final_code",
        "generated_reference",
        "category_id",
        "group_id",
        "subgroup_id",
        "classification_code",
        "dynamic_code_data",
        "dynamic_name",
      ].join(","));

  if (error) {
    updateErrors.push(
      `${item.codigo}: ${error.message}`,
    );
    continue;
  }

  if (!data || data.length !== 1) {
    updateErrors.push(
      `${item.codigo}: actualización optimista afectó ${data?.length ?? 0} filas.`,
    );
    continue;
  }

  const after = data[0];

  if (
    norm(after.final_code) !== norm(item.codigo) ||
    after.category_id !== item.desired.category_id ||
    after.group_id !== item.desired.group_id ||
    after.subgroup_id !== item.desired.subgroup_id ||
    after.classification_code !== item.desired.classification_code ||
    stable(after.dynamic_code_data) !==
      stable(item.desired.dynamic_code_data) ||
    String(after.dynamic_name ?? "") !==
      String(item.desired.dynamic_name ?? "")
  ) {
    updateErrors.push(
      `${item.codigo}: lectura posterior no coincide con el estado deseado.`,
    );
    continue;
  }

  updated += 1;
}

console.log(
  "\n===== RESULTADO APLICACIÓN =====",
);

console.table({
  "Cambios requeridos":
    toUpdate.length,
  "Actualizados correctamente":
    updated,
  "Errores":
    updateErrors.length,
});

if (updateErrors.length) {
  for (const error of updateErrors) {
    console.log(`- ${error}`);
  }

  throw new Error(
    "Fase 2D terminó con errores.",
  );
}

// Verificación final.
const verified = [];

for (let i = 0; i < ids.length; i += 100) {
  const batch = ids.slice(i, i + 100);

  const { data, error } =
    await supabase
      .from("products")
      .select([
        "id",
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
  verified.push(...(data ?? []));
}

const verifiedById =
  new Map(
    verified.map(p => [p.id, p]),
  );

const verifyErrors = [];

for (const row of targets) {
  const p =
    verifiedById.get(row.product_id);

  if (!p) {
    verifyErrors.push(
      `${row.current_code}: no apareció en la verificación final.`,
    );
    continue;
  }

  if (
    norm(p.final_code) !== norm(row.current_code) ||
    p.category_id !== row.category_id ||
    p.group_id !== row.group_id ||
    p.subgroup_id !== row.subgroup_id ||
    p.classification_code !== row.classification ||
    stable(p.dynamic_code_data) !==
      stable(row.dynamic_code_data) ||
    String(p.dynamic_name ?? "") !==
      String(p.name ?? "")
  ) {
    verifyErrors.push(
      `${row.current_code}: estructura final no coincide con el preview canónico.`,
    );
  }
}

if (verifyErrors.length) {
  console.log(
    "\n===== ❌ VERIFICACIÓN FINAL =====",
  );

  for (const error of verifyErrors) {
    console.log(`- ${error}`);
  }

  throw new Error(
    "Fase 2D no quedó completamente verificada.",
  );
}

console.log(
  "\n✅ FASE 2D COMPLETADA Y VERIFICADA.",
);
console.log(
  "✅ Los 80 ADOPTAR coinciden con la plantilla y catálogos vigentes.",
);
console.log(
  "✅ No se modificaron códigos ni aliases.",
);
console.log(
  "✅ No se tocó SIIGO.",
);
