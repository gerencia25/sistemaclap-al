import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

function key(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

const [
  productsResult,
  categoriesResult,
  groupsResult,
  subgroupsResult,
] = await Promise.all([
  supabase
    .from("products")
    .select(`
      id,
      final_code,
      name,
      category,
      category_id,
      group_id,
      subgroup_id,
      classification_code,
      siigo_product_id
    `)
    .order("final_code"),

  supabase
    .from("item_categories")
    .select("id, code, name, status"),

  supabase
    .from("item_groups")
    .select("id, category_id, code, name, status"),

  supabase
    .from("item_subgroups")
    .select("id, group_id, code, name, status"),
]);

for (const result of [
  productsResult,
  categoriesResult,
  groupsResult,
  subgroupsResult,
]) {
  if (result.error) {
    throw result.error;
  }
}

const products =
  productsResult.data ?? [];

const categories =
  categoriesResult.data ?? [];

const groups =
  groupsResult.data ?? [];

const subgroups =
  subgroupsResult.data ?? [];

function findCategory(code) {
  return categories.filter(
    (item) =>
      key(item.code) === key(code),
  );
}

function findGroup(
  categoryId,
  code,
) {
  return groups.filter(
    (item) =>
      item.category_id ===
        categoryId &&
      key(item.code) ===
        key(code),
  );
}

function findSubgroup(
  groupId,
  code,
) {
  return subgroups.filter(
    (item) =>
      item.group_id ===
        groupId &&
      key(item.code) ===
        key(code),
  );
}

const result = {
  alreadyClassified: [],
  autoClassifiable: [],
  malformed: [],
  noCategory: [],
  noGroup: [],
  noSubgroup: [],
  ambiguous: [],
};

for (const product of products) {
  const code =
    String(
      product.final_code ?? "",
    ).trim();

  if (
    product.category_id &&
    product.group_id &&
    product.subgroup_id &&
    product.classification_code
  ) {
    result.alreadyClassified.push({
      code,
      name: product.name,
      classification:
        product.classification_code,
    });

    continue;
  }

  const parts =
    code.split("-");

  if (parts.length < 4) {
    result.malformed.push({
      code,
      name: product.name,
      reason:
        "No tiene estructura CATEGORIA-GRUPO-SUBGRUPO-...",
    });

    continue;
  }

  const [
    categoryCode,
    groupCode,
    subgroupCode,
  ] = parts;

  const categoryMatches =
    findCategory(
      categoryCode,
    );

  if (
    categoryMatches.length === 0
  ) {
    result.noCategory.push({
      code,
      name: product.name,
      categoryCode,
    });

    continue;
  }

  if (
    categoryMatches.length !== 1
  ) {
    result.ambiguous.push({
      code,
      name: product.name,
      level: "Categoría",
      value: categoryCode,
      matches:
        categoryMatches.length,
    });

    continue;
  }

  const category =
    categoryMatches[0];

  const groupMatches =
    findGroup(
      category.id,
      groupCode,
    );

  if (
    groupMatches.length === 0
  ) {
    result.noGroup.push({
      code,
      name: product.name,
      classification:
        `${categoryCode}-${groupCode}`,
    });

    continue;
  }

  if (
    groupMatches.length !== 1
  ) {
    result.ambiguous.push({
      code,
      name: product.name,
      level: "Grupo",
      value: groupCode,
      matches:
        groupMatches.length,
    });

    continue;
  }

  const group =
    groupMatches[0];

  const subgroupMatches =
    findSubgroup(
      group.id,
      subgroupCode,
    );

  if (
    subgroupMatches.length === 0
  ) {
    result.noSubgroup.push({
      code,
      name: product.name,
      classification:
        `${categoryCode}-${groupCode}-${subgroupCode}`,
    });

    continue;
  }

  if (
    subgroupMatches.length !== 1
  ) {
    result.ambiguous.push({
      code,
      name: product.name,
      level: "Subgrupo",
      value: subgroupCode,
      matches:
        subgroupMatches.length,
    });

    continue;
  }

  const subgroup =
    subgroupMatches[0];

  result.autoClassifiable.push({
    product_id:
      product.id,

    code,

    name:
      product.name,

    imported_from_siigo:
      Boolean(
        product.siigo_product_id,
      ),

    classification:
      `${category.code}-${group.code}-${subgroup.code}`,

    category:
      `${category.code} · ${category.name}`,

    group:
      `${group.code} · ${group.name}`,

    subgroup:
      `${subgroup.code} · ${subgroup.name}`,
  });
}

console.log(
  "\n========================================",
);

console.log(
  "RECONCILIACIÓN HISTÓRICA · VISTA PREVIA",
);

console.log(
  "========================================\n",
);

console.table({
  "Total productos":
    products.length,

  "Ya clasificados":
    result
      .alreadyClassified
      .length,

  "Clasificables automáticamente":
    result
      .autoClassifiable
      .length,

  "Código sin estructura":
    result
      .malformed
      .length,

  "Categoría no encontrada":
    result
      .noCategory
      .length,

  "Grupo no encontrado":
    result
      .noGroup
      .length,

  "Subgrupo no encontrado":
    result
      .noSubgroup
      .length,

  "Ambiguos":
    result
      .ambiguous
      .length,
});

console.log(
  "\n✅ CLASIFICABLES AUTOMÁTICAMENTE",
);

console.table(
  result.autoClassifiable.map(
    (item) => ({
      code:
        item.code,

      classification:
        item.classification,

      category:
        item.category,

      group:
        item.group,

      subgroup:
        item.subgroup,
    }),
  ),
);

const review = [
  ...result.malformed.map(
    x => ({
      ...x,
      reason:
        x.reason,
    }),
  ),

  ...result.noCategory.map(
    x => ({
      ...x,
      reason:
        `Categoría ${x.categoryCode} no existe`,
    }),
  ),

  ...result.noGroup.map(
    x => ({
      ...x,
      reason:
        `Grupo no existe en ${x.classification}`,
    }),
  ),

  ...result.noSubgroup.map(
    x => ({
      ...x,
      reason:
        `Subgrupo no existe en ${x.classification}`,
    }),
  ),

  ...result.ambiguous.map(
    x => ({
      ...x,
      reason:
        `${x.level} ambiguo (${x.matches} coincidencias)`,
    }),
  ),
];

if (review.length) {
  console.log(
    "\n⚠️ REQUIEREN REVISIÓN",
  );

  console.table(
    review.map(
      (item) => ({
        code:
          item.code,

        name:
          item.name,

        reason:
          item.reason,
      }),
    ),
  );
}

console.log(
  "\n✅ Solo lectura. No se modificó ningún producto.",
);
