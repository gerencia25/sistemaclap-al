import fs from "node:fs";
import path from "node:path";

const targetPath =
  "scripts/codificacion/auditoria/codificacion_target_clap_v2.json";

const comparisonPath =
  "scripts/codificacion/reports/comparacion-target-vs-clap-v2.json";

if (!fs.existsSync(targetPath)) {
  throw new Error(
    `No existe ${targetPath}`,
  );
}

if (!fs.existsSync(comparisonPath)) {
  throw new Error(
    `No existe ${comparisonPath}`,
  );
}

const target =
  JSON.parse(
    fs.readFileSync(
      targetPath,
      "utf8",
    ),
  );

const comparison =
  JSON.parse(
    fs.readFileSync(
      comparisonPath,
      "utf8",
    ),
  );

const targetByCode =
  new Map(
    target.classifications.map(
      item => [
        item.classification,
        item,
      ],
    ),
  );

const plan = {
  generated_at:
    new Date().toISOString(),

  mode:
    "PLAN_ONLY",

  safeguards: [
    "No modificar productos todavía.",
    "No modificar SIIGO todavía.",
    "No eliminar opciones existentes.",
    "No reutilizar códigos históricos.",
    "No cambiar códigos de color existentes.",
    "Agregar únicamente colores faltantes.",
    "Conservar alias históricos en la fase de productos.",
  ],

  hierarchy: [],
  templates_create: [],
  templates_update: [],
  shared_catalogs: [],
  review_only: [],
};

for (
  const result
  of comparison.results
) {
  const definition =
    targetByCode.get(
      result.classification,
    );

  if (!definition) {
    plan.review_only.push({
      classification:
        result.classification,

      reason:
        "No existe definición en target v2.",
    });

    continue;
  }

  const [
    category,
    group,
    subgroup,
  ] =
    result.classification.split("-");

  if (
    result.status === "CREAR"
  ) {
    const level =
      result.create_level ?? "";

    if (
      level.includes("Categoría")
    ) {
      plan.hierarchy.push({
        action:
          "CREATE_CATEGORY",

        classification:
          result.classification,

        code:
          category,
      });
    }

    if (
      level.includes("Grupo")
    ) {
      plan.hierarchy.push({
        action:
          "CREATE_GROUP",

        classification:
          result.classification,

        category_code:
          category,

        code:
          group,
      });
    }

    if (
      level.includes("Subgrupo")
    ) {
      plan.hierarchy.push({
        action:
          "CREATE_SUBGROUP",

        classification:
          result.classification,

        category_code:
          category,

        group_code:
          group,

        code:
          subgroup,
      });
    }

    if (
      level.includes("Plantilla")
    ) {
      plan.templates_create.push({
        classification:
          result.classification,

        source_sheet:
          definition.source_sheet,

        numeric_code_length:
          definition.numeric_length,

        fields:
          definition.fields.map(
            (field, index) => ({
              order:
                index + 1,

              label:
                field.target_label,

              key:
                String(
                  field.target_label,
                )
                  .normalize("NFD")
                  .replace(
                    /[\u0300-\u036f]/g,
                    "",
                  )
                  .toLowerCase()
                  .replace(
                    /[^a-z0-9]+/g,
                    "_",
                  )
                  .replace(
                    /^_+|_+$/g,
                    "",
                  ),

              length:
                field.length,

              option_count:
                field.options?.length ??
                0,

              catalog:
                field.target_label
                  .toUpperCase() ===
                  "COLOR"
                  ? "GLOBAL_COLOR"
                  : "OWN",
            }),
          ),
      });
    }
  }

  if (
    result.status === "ACTUALIZAR"
  ) {
    const changes = [];

    for (
      const field
      of result.fields ?? []
    ) {
      if (
        field.status !==
        "COINCIDE"
      ) {
        changes.push({
          order:
            field.order,

          target_label:
            field.target_label,

          current_label:
            field.current_label,

          length_target:
            field.length_target,

          length_current:
            field.length_current,

          details:
            field.details,

          missing_options:
            field.missing_options ??
            [],

          mismatched_options:
            field.mismatched_options ??
            [],
        });
      }

      /*
       * Las opciones extra NO se eliminan.
       * Solo se reportan.
       */
      if (
        (
          field.extra_options ??
          []
        ).length > 0
      ) {
        plan.review_only.push({
          classification:
            result.classification,

          field:
            field.current_label ??
            field.target_label,

          reason:
            "CLAP tiene opciones adicionales que no están en el Excel histórico.",

          options:
            field.extra_options,
        });
      }
    }

    plan.templates_update.push({
      classification:
        result.classification,

      source_sheet:
        definition.source_sheet,

      numeric_code_length:
        definition.numeric_length,

      changes,
    });
  }
}

/*
 * Catálogo transversal de colores.
 */
for (
  const catalog
  of comparison.color_catalogs ??
  []
) {
  plan.shared_catalogs.push({
    catalog_id:
      catalog.catalog_id,

    catalog_name:
      catalog.catalog_name,

    action:
      "ADD_MISSING_ONLY",

    missing:
      catalog.missing,

    mismatched:
      catalog.mismatched,

    extras:
      catalog.extras,

    rule:
      "No cambiar ni borrar códigos existentes automáticamente.",
  });
}

/*
 * Códigos históricos con impacto conocido.
 *
 * Solo se documentan.
 * NO se modifican en esta fase.
 */
plan.historical_product_impacts =
  comparison.known_siigo_impacts ??
  [];

const reportsDir =
  "scripts/codificacion/reports";

fs.mkdirSync(
  reportsDir,
  {
    recursive: true,
  },
);

const jsonPath =
  path.join(
    reportsDir,
    "plan-migracion-codificacion-v2.json",
  );

fs.writeFileSync(
  jsonPath,
  JSON.stringify(
    plan,
    null,
    2,
  ),
  "utf8",
);

const md = [];

md.push(
  "# Plan de migración · Codificación CLAP",
);

md.push("");

md.push(
  `Generado: ${plan.generated_at}`,
);

md.push("");

md.push(
  "**Estado:** PLAN ÚNICAMENTE. No modifica Supabase ni SIIGO.",
);

md.push("");

md.push(
  "## Salvaguardas",
);

md.push("");

for (
  const item
  of plan.safeguards
) {
  md.push(
    `- ${item}`,
  );
}

md.push("");

md.push(
  "## Resumen",
);

md.push("");

md.push(
  `- Acciones de jerarquía: **${plan.hierarchy.length}**`,
);

md.push(
  `- Plantillas a crear: **${plan.templates_create.length}**`,
);

md.push(
  `- Plantillas a actualizar: **${plan.templates_update.length}**`,
);

md.push(
  `- Catálogos transversales: **${plan.shared_catalogs.length}**`,
);

md.push(
  `- Casos solo para revisión: **${plan.review_only.length}**`,
);

md.push("");

md.push(
  "## Jerarquía a completar",
);

md.push("");

md.push(
  "| Acción | Clasificación | Código |",
);

md.push(
  "|---|---|---|",
);

for (
  const item
  of plan.hierarchy
) {
  md.push(
    `| ${item.action} | ${item.classification} | ${
      item.code ??
      `${item.group_code}-${item.code ?? ""}`
    } |`,
  );
}

md.push("");

md.push(
  "## Plantillas a crear",
);

md.push("");

for (
  const item
  of plan.templates_create
) {
  md.push(
    `### ${item.classification}`,
  );

  md.push("");

  md.push(
    `Fuente: \`${item.source_sheet}\``,
  );

  md.push("");

  md.push(
    `Longitud numérica: **${item.numeric_code_length}**`,
  );

  md.push("");

  md.push(
    "| Orden | Campo | Longitud | Catálogo | Opciones fuente |",
  );

  md.push(
    "|---:|---|---:|---|---:|",
  );

  for (
    const field
    of item.fields
  ) {
    md.push(
      `| ${field.order} | ${field.label} | ${field.length} | ${field.catalog} | ${field.option_count} |`,
    );
  }

  md.push("");
}

md.push(
  "## Plantillas a actualizar",
);

md.push("");

for (
  const item
  of plan.templates_update
) {
  md.push(
    `### ${item.classification}`,
  );

  md.push("");

  if (
    item.changes.length === 0
  ) {
    md.push(
      "- Sin cambios estructurales; revisar opciones.",
    );

    md.push("");

    continue;
  }

  md.push(
    "| Orden | CLAP actual | Objetivo | Longitud actual | Objetivo | Detalle |",
  );

  md.push(
    "|---:|---|---|---:|---:|---|",
  );

  for (
    const change
    of item.changes
  ) {
    md.push(
      `| ${change.order ?? ""} | ${change.current_label ?? ""} | ${change.target_label ?? ""} | ${change.length_current ?? ""} | ${change.length_target ?? ""} | ${(change.details ?? "").replaceAll("|", "/")} |`,
    );
  }

  md.push("");
}

md.push(
  "## Colores",
);

md.push("");

for (
  const catalog
  of plan.shared_catalogs
) {
  md.push(
    `### ${catalog.catalog_name}`,
  );

  md.push("");

  md.push(
    `Opciones faltantes: **${catalog.missing.length}**`,
  );

  md.push("");

  if (
    catalog.missing.length
  ) {
    md.push(
      "| Código | Color |",
    );

    md.push(
      "|---|---|",
    );

    for (
      const color
      of catalog.missing
    ) {
      md.push(
        `| ${color.code} | ${color.name} |`,
      );
    }

    md.push("");
  }

  if (
    catalog.mismatched.length
  ) {
    md.push(
      `⚠️ Hay ${catalog.mismatched.length} códigos con significado diferente. Bloquear migración automática.`,
    );

    md.push("");
  }
}

md.push(
  "## Impactos históricos conocidos",
);

md.push("");

md.push(
  "> Esta fase NO modifica estos productos.",
);

md.push("");

md.push(
  "| Código actual | Código objetivo |",
);

md.push(
  "|---|---|",
);

for (
  const item
  of plan.historical_product_impacts
) {
  md.push(
    `| ${item.old} | ${item.new} |`,
  );
}

md.push("");

md.push(
  "## Casos de revisión",
);

md.push("");

for (
  const item
  of plan.review_only
) {
  md.push(
    `- **${item.classification}**${
      item.field
        ? ` · ${item.field}`
        : ""
    }: ${item.reason}`,
  );
}

const mdPath =
  path.join(
    reportsDir,
    "plan-migracion-codificacion-v2.md",
  );

fs.writeFileSync(
  mdPath,
  md.join("\n"),
  "utf8",
);

console.log(
  "\n========================================",
);

console.log(
  "PLAN DE MIGRACIÓN · CODIFICACIÓN CLAP",
);

console.log(
  "========================================\n",
);

console.table({
  "Acciones de jerarquía":
    plan.hierarchy.length,

  "Plantillas a crear":
    plan.templates_create.length,

  "Plantillas a actualizar":
    plan.templates_update.length,

  "Catálogos transversales":
    plan.shared_catalogs.length,

  "Casos para revisión":
    plan.review_only.length,
});

console.log(
  "\n===== COLORES A AGREGAR =====",
);

for (
  const catalog
  of plan.shared_catalogs
) {
  console.table(
    catalog.missing,
  );
}

console.log(
  "\n===== PRODUCTOS HISTÓRICOS =====",
);

console.table(
  plan.historical_product_impacts.map(
    item => ({
      actual:
        item.old,

      objetivo:
        item.new,
    }),
  ),
);

console.log(
  "\n✅ PLAN ÚNICAMENTE.",
);

console.log(
  "No se modificó Supabase ni SIIGO.",
);

console.log(
  `\nArchivos:\n- ${mdPath}\n- ${jsonPath}`,
);
