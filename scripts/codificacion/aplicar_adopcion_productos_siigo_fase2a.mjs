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

  if (Array.isArray(value)) {
    return JSON.stringify(
      value.map(stable),
    );
  }

  if (typeof value === "object") {
    const keys =
      Object.keys(value).sort();

    const result = {};
    for (const key of keys) {
      result[key] = value[key];
    }

    return JSON.stringify(result);
  }

  return JSON.stringify(value);
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
        .range(
          from,
          from + pageSize - 1,
        );

    if (error) {
      throw new Error(
        `${table}: ${error.message}`,
      );
    }

    const page = data ?? [];
    all.push(...page);

    if (page.length < pageSize) break;
    from += pageSize;
  }

  return all;
}

const targets =
  (report.results ?? []).filter(
    row =>
      row.status === "ADOPTAR" &&
      row.canonical_parse_ok === true &&
      norm(row.current_code) ===
        norm(
          row.canonical_code ??
          row.proposed_code ??
          row.current_code,
        ),
  );

if (targets.length !== 60) {
  throw new Error(
    `Seguridad: se esperaban exactamente 60 ADOPTAR sin cambio de código; hay ${targets.length}.`,
  );
}

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
const changes = [];

for (const row of targets) {
  const product =
    byId.get(row.product_id);

  if (!product) {
    errors.push(
      `${row.current_code}: no existe product_id=${row.product_id}.`,
    );
    continue;
  }

  if (
    String(product.siigo_product_id ?? "") !==
    String(row.siigo_product_id ?? "")
  ) {
    errors.push(
      `${row.current_code}: siigo_product_id cambió desde el preview.`,
    );
  }

  const currentCode =
    String(
      product.final_code ??
      product.reference ??
      "",
    ).trim();

  if (
    norm(currentCode) !==
    norm(row.current_code)
  ) {
    errors.push(
      `${row.current_code}: el código actual en DB es ${currentCode}.`,
    );
  }

  const canonicalCode =
    String(
      row.canonical_code ??
      row.proposed_code ??
      row.current_code,
    ).trim();

  if (
    norm(currentCode) !==
    norm(canonicalCode)
  ) {
    errors.push(
      `${row.current_code}: ADOPTAR no puede cambiar código. Propuesto=${canonicalCode}.`,
    );
  }

  const dynamic =
    row.canonical_dynamic_code_data;

  if (
    !dynamic ||
    typeof dynamic !== "object"
  ) {
    errors.push(
      `${row.current_code}: canonical_dynamic_code_data ausente.`,
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
      dynamic,
    dynamic_name:
      product.name,
  };

  const changedFields = [];

  for (const [key, value] of Object.entries(desired)) {
    const current = product[key];

    const equal =
      key === "dynamic_code_data"
        ? stable(current) === stable(value)
        : String(current ?? "") ===
          String(value ?? "");

    if (!equal) {
      changedFields.push(key);
    }
  }

  changes.push({
    product_id:
      product.id,
    siigo_product_id:
      product.siigo_product_id,
    codigo:
      currentCode,
    producto:
      product.name,
    changedFields,
    desired,
  });
}

console.log(
  "\n==============================================",
);
console.log(
  APPLY
    ? "FASE 2A · APLICACIÓN · 60 PRODUCTOS ADOPTAR"
    : "FASE 2A · DRY-RUN · 60 PRODUCTOS ADOPTAR",
);
console.log(
  "==============================================\n",
);

console.table({
  "Objetivo ADOPTAR":
    targets.length,
  "Productos encontrados":
    changes.length,
  "Sin cambios necesarios":
    changes.filter(
      x => x.changedFields.length === 0,
    ).length,
  "Con cambios estructurales":
    changes.filter(
      x => x.changedFields.length > 0,
    ).length,
  "Errores bloqueantes":
    errors.length,
});

if (errors.length) {
  console.log(
    "\n===== ❌ ERRORES =====",
  );

  for (const error of errors) {
    console.log(`- ${error}`);
  }

  throw new Error(
    "Preflight bloqueado. No se aplicó ningún cambio.",
  );
}

console.log(
  "\n===== MUESTRA DE CAMBIOS =====",
);

console.table(
  changes
    .filter(
      x => x.changedFields.length > 0,
    )
    .slice(0, 20)
    .map(
      x => ({
        codigo:
          x.codigo,
        producto:
          x.producto,
        campos:
          x.changedFields.join(", "),
      }),
    ),
);

if (!APPLY) {
  console.log(
    "\n✅ DRY-RUN APROBADO.",
  );
  console.log(
    "No se modificó Supabase ni SIIGO.",
  );
  console.log(
    "\nPara aplicar exactamente estos 60 productos:",
  );
  console.log(
    "node --env-file=.env.local scripts/codificacion/aplicar_adopcion_productos_siigo_fase2a.mjs --apply",
  );
  process.exit(0);
}

const toUpdate =
  changes.filter(
    x => x.changedFields.length > 0,
  );

let updated = 0;
const updateErrors = [];

for (const item of toUpdate) {
  const {
    data,
    error,
  } =
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
      .select(
        [
          "id",
          "siigo_product_id",
          "final_code",
          "reference",
          "generated_reference",
          "category_id",
          "group_id",
          "subgroup_id",
          "classification_code",
          "dynamic_code_data",
          "dynamic_name",
        ].join(","),
      );

  if (error) {
    updateErrors.push(
      `${item.codigo}: ${error.message}`,
    );
    continue;
  }

  if (!data || data.length !== 1) {
    updateErrors.push(
      `${item.codigo}: la actualización optimista afectó ${data?.length ?? 0} filas.`,
    );
    continue;
  }

  const row = data[0];

  if (
    norm(row.final_code) !==
      norm(item.codigo) ||
    String(row.reference ?? "") !==
      String(
        byId.get(item.product_id)
          ?.reference ?? "",
      ) ||
    String(row.generated_reference ?? "") !==
      String(
        byId.get(item.product_id)
          ?.generated_reference ?? "",
      ) ||
    row.category_id !==
      item.desired.category_id ||
    row.group_id !==
      item.desired.group_id ||
    row.subgroup_id !==
      item.desired.subgroup_id ||
    row.classification_code !==
      item.desired.classification_code ||
    stable(row.dynamic_code_data) !==
      stable(
        item.desired.dynamic_code_data,
      ) ||
    String(row.dynamic_name ?? "") !==
      String(item.desired.dynamic_name ?? "")
  ) {
    updateErrors.push(
      `${item.codigo}: la lectura posterior no coincide con el resultado esperado.`,
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
  console.log(
    "\n===== ❌ ERRORES DE ACTUALIZACIÓN =====",
  );

  for (const error of updateErrors) {
    console.log(`- ${error}`);
  }

  throw new Error(
    "La aplicación terminó con errores. No continúes a Fase 2B.",
  );
}

// Relectura final completa de los 60.
const ids =
  targets.map(
    x => x.product_id,
  );

const verified = [];

for (let i = 0; i < ids.length; i += 100) {
  const batch =
    ids.slice(i, i + 100);

  const {
    data,
    error,
  } =
    await supabase
      .from("products")
      .select(
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
      )
      .in("id", batch);

  if (error) throw error;

  verified.push(...(data ?? []));
}

const verifiedById =
  new Map(
    verified.map(x => [x.id, x]),
  );

const verifyErrors = [];

for (const row of targets) {
  const product =
    verifiedById.get(row.product_id);

  if (!product) {
    verifyErrors.push(
      `${row.current_code}: no apareció en verificación final.`,
    );
    continue;
  }

  if (
    norm(product.final_code) !==
      norm(row.current_code)
  ) {
    verifyErrors.push(
      `${row.current_code}: final_code cambió accidentalmente.`,
    );
  }

  if (
    product.category_id !==
      row.category_id ||
    product.group_id !==
      row.group_id ||
    product.subgroup_id !==
      row.subgroup_id ||
    product.classification_code !==
      row.classification ||
    stable(product.dynamic_code_data) !==
      stable(
        row.canonical_dynamic_code_data,
      ) ||
    String(product.dynamic_name ?? "") !==
      String(product.name ?? "")
  ) {
    verifyErrors.push(
      `${row.current_code}: estructura final incompleta.`,
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
    "Fase 2A no quedó completamente verificada.",
  );
}

console.log(
  "\n✅ FASE 2A COMPLETADA Y VERIFICADA.",
);
console.log(
  "✅ 60 productos ADOPTAR tienen clasificación y atributos canónicos.",
);
console.log(
  "✅ final_code, reference y generated_reference permanecieron intactos.",
);
console.log(
  "✅ No se tocó SIIGO.",
);
