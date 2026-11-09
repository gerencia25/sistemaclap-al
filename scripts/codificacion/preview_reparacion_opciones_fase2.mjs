import fs from "node:fs";

const previewPath =
  "scripts/codificacion/reports/preview-adopcion-productos-siigo-fase2.json";

const targetPath =
  "scripts/codificacion/auditoria/codificacion_target_clap_v2.json";

if (!fs.existsSync(previewPath)) {
  throw new Error(`No existe ${previewPath}`);
}

if (!fs.existsSync(targetPath)) {
  throw new Error(`No existe ${targetPath}`);
}

const preview =
  JSON.parse(
    fs.readFileSync(previewPath, "utf8"),
  );

const target =
  JSON.parse(
    fs.readFileSync(targetPath, "utf8"),
  );

function norm(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function pad(value, length) {
  const raw =
    String(value ?? "").trim();

  return /^\d+$/.test(raw)
    ? raw.padStart(length, "0")
    : raw;
}

const targetByClassification =
  new Map(
    target.classifications.map(
      (item) => [
        norm(item.classification),
        item,
      ],
    ),
  );

const knownChanges =
  new Map(
    (target.known_siigo_impacts ?? []).map(
      (item) => [
        norm(item.old),
        item.new,
      ],
    ),
  );

const rows = [];

for (
  const product
  of preview.results.filter(
    (item) =>
      item.status ===
      "REQUIERE_REVISION",
  )
) {
  const knownChange =
    knownChanges.get(
      norm(product.current_code),
    );

  if (!product.classification) {
    rows.push({
      current_code:
        product.current_code,
      name:
        product.name,
      classification:
        null,
      resolution:
        "REVISION_MANUAL_REAL",
      detail:
        "El código no pertenece a ninguna clasificación activa CLAP.",
      proposed_code:
        knownChange ?? null,
      proposals:
        [],
    });

    continue;
  }

  const definition =
    targetByClassification.get(
      norm(product.classification),
    );

  if (!definition) {
    rows.push({
      current_code:
        product.current_code,
      name:
        product.name,
      classification:
        product.classification,
      resolution:
        "REVISION_MANUAL_REAL",
      detail:
        "La clasificación no existe en el modelo objetivo histórico.",
      proposed_code:
        knownChange ?? null,
      proposals:
        [],
    });

    continue;
  }

  const proposals = [];
  const unresolvedStill = [];

  const parsed =
    product.parsed_fields ?? [];

  for (
    let index = 0;
    index < parsed.length;
    index += 1
  ) {
    const parsedField =
      parsed[index];

    if (parsedField.resolved) {
      continue;
    }

    const targetField =
      definition.fields?.[index];

    if (!targetField) {
      unresolvedStill.push({
        field_key:
          parsedField.field_key,
        segment:
          parsedField.segment,
        reason:
          "No existe campo equivalente por posición en la matriz objetivo.",
      });

      continue;
    }

    const length =
      Number(
        targetField.length ?? 0,
      );

    const segment =
      pad(
        parsedField.segment,
        length,
      );

    const candidates =
      (targetField.options ?? [])
        .map(
          (option) => ({
            code:
              pad(
                option.code,
                length,
              ),
            name:
              String(
                option.name ?? "",
              ).trim(),
          }),
        )
        .filter(
          (option) =>
            option.code === segment,
        );

    const uniqueNames =
      [
        ...new Set(
          candidates.map(
            (item) =>
              norm(item.name),
          ),
        ),
      ];

    if (
      candidates.length === 1 ||
      uniqueNames.length === 1
    ) {
      proposals.push({
        field_key:
          parsedField.field_key,
        field_label:
          parsedField.field_label,
        segment,
        option_name:
          candidates[0].name,
        source:
          definition.source_sheet,
        action:
          "ADD_OPTION_FROM_HISTORICAL_MATRIX",
      });
    } else if (
      candidates.length > 1
    ) {
      unresolvedStill.push({
        field_key:
          parsedField.field_key,
        segment,
        reason:
          `El Excel histórico asigna el mismo código a varias opciones: ${candidates.map((x) => x.name).join(" / ")}`,
      });
    } else {
      unresolvedStill.push({
        field_key:
          parsedField.field_key,
        segment,
        reason:
          "El código no aparece en las opciones de la matriz histórica.",
      });
    }
  }

  let resolution;

  if (
    knownChange &&
    unresolvedStill.length === 0
  ) {
    resolution =
      "OPCIONES_MATRIZ_Y_CAMBIO_CODIGO";
  } else if (
    knownChange
  ) {
    resolution =
      "CAMBIO_CODIGO_MAS_REVISION";
  } else if (
    unresolvedStill.length === 0 &&
    proposals.length > 0
  ) {
    resolution =
      "AGREGAR_OPCIONES_DESDE_MATRIZ";
  } else {
    resolution =
      "REVISION_MANUAL_REAL";
  }

  rows.push({
    current_code:
      product.current_code,
    name:
      product.name,
    classification:
      product.classification,
    resolution,
    detail:
      unresolvedStill.length
        ? unresolvedStill
            .map(
              (item) =>
                `${item.field_key}=${item.segment}: ${item.reason}`,
            )
            .join(" | ")
        : "Todos los segmentos faltantes están documentados en la matriz histórica.",
    proposed_code:
      knownChange ?? null,
    proposals,
    unresolved_still:
      unresolvedStill,
  });
}

const proposalKey =
  (item, proposal) =>
    [
      item.classification,
      proposal.field_key,
      proposal.segment,
      norm(proposal.option_name),
    ].join("|");

const uniqueProposals =
  new Map();

for (const item of rows) {
  for (
    const proposal
    of item.proposals ?? []
  ) {
    uniqueProposals.set(
      proposalKey(
        item,
        proposal,
      ),
      {
        classification:
          item.classification,
        field_key:
          proposal.field_key,
        field_label:
          proposal.field_label,
        code:
          proposal.segment,
        name:
          proposal.option_name,
        source:
          proposal.source,
      },
    );
  }
}

const summary =
  Object.fromEntries(
    [
      "AGREGAR_OPCIONES_DESDE_MATRIZ",
      "OPCIONES_MATRIZ_Y_CAMBIO_CODIGO",
      "CAMBIO_CODIGO_MAS_REVISION",
      "REVISION_MANUAL_REAL",
    ].map(
      (status) => [
        status,
        rows.filter(
          (item) =>
            item.resolution ===
            status,
        ).length,
      ],
    ),
  );

const output = {
  generated_at:
    new Date().toISOString(),
  read_only:
    true,
  unresolved_products:
    rows.length,
  summary,
  unique_option_proposals:
    [...uniqueProposals.values()]
      .sort(
        (a, b) =>
          `${a.classification}|${a.field_key}|${a.code}`
            .localeCompare(
              `${b.classification}|${b.field_key}|${b.code}`,
            ),
      ),
  rows,
};

const jsonPath =
  "scripts/codificacion/reports/preview-reparacion-opciones-fase2.json";

fs.writeFileSync(
  jsonPath,
  JSON.stringify(
    output,
    null,
    2,
  ),
  "utf8",
);

const md = [];

md.push(
  "# Fase 2 · Reparación de opciones faltantes",
);
md.push("");
md.push(
  "**Solo lectura. No modifica CLAP ni SIIGO.**",
);
md.push("");
md.push(
  `Productos inicialmente en revisión: **${rows.length}**`,
);
md.push("");
md.push(
  `Opciones únicas propuestas desde la matriz: **${uniqueProposals.size}**`,
);
md.push("");

for (
  const [
    key,
    value,
  ]
  of Object.entries(summary)
) {
  md.push(
    `- ${key}: **${value}**`,
  );
}

md.push("");
md.push(
  "## Opciones propuestas",
);
md.push("");
md.push(
  "| Clasificación | Campo | Código | Opción | Fuente |",
);
md.push(
  "|---|---|---|---|---|",
);

for (
  const item
  of output.unique_option_proposals
) {
  md.push(
    `| ${item.classification} | ${item.field_label} | ${item.code} | ${(item.name ?? "").replaceAll("|", "/")} | ${item.source} |`,
  );
}

md.push("");

for (
  const status
  of [
    "REVISION_MANUAL_REAL",
    "CAMBIO_CODIGO_MAS_REVISION",
    "OPCIONES_MATRIZ_Y_CAMBIO_CODIGO",
    "AGREGAR_OPCIONES_DESDE_MATRIZ",
  ]
) {
  md.push(
    `## ${status}`,
  );
  md.push("");
  md.push(
    "| Código | Clasificación | Producto | Propuesto | Detalle |",
  );
  md.push(
    "|---|---|---|---|---|",
  );

  for (
    const item
    of rows.filter(
      (row) =>
        row.resolution === status,
    )
  ) {
    md.push(
      `| ${item.current_code} | ${item.classification ?? ""} | ${(item.name ?? "").replaceAll("|", "/")} | ${item.proposed_code ?? ""} | ${(item.detail ?? "").replaceAll("|", "/")} |`,
    );
  }

  md.push("");
}

const mdPath =
  "scripts/codificacion/reports/preview-reparacion-opciones-fase2.md";

fs.writeFileSync(
  mdPath,
  md.join("\n"),
  "utf8",
);

console.log(
  "\n============================================",
);
console.log(
  "FASE 2 · REPARACIÓN DE OPCIONES · PREVIEW",
);
console.log(
  "============================================\n",
);

console.table({
  "Productos en revisión":
    rows.length,
  "Opciones únicas propuestas":
    uniqueProposals.size,
  "Resolver solo agregando opciones":
    summary.AGREGAR_OPCIONES_DESDE_MATRIZ,
  "Opciones + cambio de código":
    summary.OPCIONES_MATRIZ_Y_CAMBIO_CODIGO,
  "Cambio código + revisión":
    summary.CAMBIO_CODIGO_MAS_REVISION,
  "Revisión manual real":
    summary.REVISION_MANUAL_REAL,
});

console.log(
  "\n===== OPCIONES DOCUMENTADAS EN MATRIZ =====",
);
console.table(
  output.unique_option_proposals.map(
    (item) => ({
      clasificacion:
        item.classification,
      campo:
        item.field_key,
      codigo:
        item.code,
      opcion:
        item.name,
      fuente:
        item.source,
    }),
  ),
);

console.log(
  "\n===== REVISIÓN MANUAL REAL =====",
);
console.table(
  rows
    .filter(
      (item) =>
        item.resolution ===
          "REVISION_MANUAL_REAL" ||
        item.resolution ===
          "CAMBIO_CODIGO_MAS_REVISION",
    )
    .map(
      (item) => ({
        codigo:
          item.current_code,
        clasificacion:
          item.classification,
        producto:
          item.name,
        propuesto:
          item.proposed_code,
        detalle:
          item.detail,
      }),
    ),
);

console.log(
  "\n✅ SOLO LECTURA. No se modificó CLAP ni SIIGO.",
);
console.log(
  `\nReportes:\n- ${mdPath}\n- ${jsonPath}`,
);
